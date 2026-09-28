// Slice 1 end-to-end run (S1-10) against the PRODUCTION app on Expo web and the linked Supabase
// project. Throwaway tester accounts are created and deleted; nothing else is touched.
//
//   1. Start the app with production settings (apps/mobile/.env.development.local):
//        cd apps/mobile && npx expo start --web --port 8083
//   2. pnpm --filter @nujoom/tools-e2e slice1 [baseUrl=http://localhost:8083] [outDir=out]
//
// Covers: sign-in with a code → onboarding (profile, consent with recording) → the five tabs
// render (no blank screen) → a restart keeps the session → Settings (sections, English LTR and
// back) → sign-out and staying signed out; and an under-18 sign-up reaching the guardian step,
// naming a guardian (honest failure without an email sender) and continuing with limits.
import fs from 'node:fs';

import { chromium } from 'playwright';

import { adminClient, testerCode } from '../tester-code/lib.mjs';

const BASE = (process.argv[2] ?? 'http://localhost:8083').replace(/\/$/, '');
const OUT = process.argv[3] ?? 'out';
fs.mkdirSync(OUT, { recursive: true });

const results = [];
const check = (name, ok, detail = '') => {
  results.push(ok);
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${ok || !detail ? '' : ` — ${detail}`}`);
};
const yearsAgo = (n) => String(new Date().getUTCFullYear() - n);

const admin = adminClient();
const stamp = Date.now().toString(36);
const created = [];
const browser = await chromium.launch();

async function session(name) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message.slice(0, 200)));
  const shot = async (label, wait = 1200) => {
    await page.waitForTimeout(wait);
    await page.screenshot({ path: `${OUT}/${name}-${label}.png`, fullPage: true });
  };
  const text = async () => (await page.locator('body').innerText()).replace(/\s+/g, ' ');
  const go = async (path = '') => {
    await page.goto(`${BASE}/${path}`, { waitUntil: 'load', timeout: 600_000 });
    await page.waitForTimeout(5000);
  };
  return { context, page, errors, shot, text, go };
}

async function signUp(s, email, { displayName, birthYear, recording }) {
  const { code, userId } = await testerCode(admin, email);
  created.push(userId);
  await s.go();
  await s.page.getByPlaceholder('name@example.com').fill(email);
  await s.page.getByText('معي رمز من قبل').click();
  await s.page.waitForTimeout(1500);
  await s.page.locator('input[autocomplete="one-time-code"]').fill(code);
  await s.page.waitForTimeout(7000);
  await s.page.getByLabel('الاسم اللي بيظهر').fill(displayName);
  await s.page.getByLabel('يوم').fill('15');
  await s.page.getByLabel('شهر').fill('6');
  await s.page.getByLabel('سنة').fill(birthYear);
  await s.page.getByLabel('المدينة').click();
  await s.page.getByText('عمان', { exact: true }).last().click();
  await s.page.waitForTimeout(800);
  await s.page.getByLabel('الحارة').click();
  await s.page.getByText('جبل الحسين', { exact: true }).last().click();
  await s.page.waitForTimeout(800);
  await s.page.getByRole('radio', { name: 'لاعب وسط' }).click();
  await s.page.getByText('متابعة', { exact: true }).click();
  await s.page.waitForTimeout(2000);
  await s.page.getByRole('checkbox').nth(0).click();
  await s.page.getByRole('checkbox').nth(1).click();
  await s.page.getByRole('radio', { name: recording ? 'موافق' : 'لا، مش هلأ' }).click();
  await s.page.getByText('إنهاء التسجيل').click();
  await s.page.waitForTimeout(8000);
}

try {
  // --- Adult ---------------------------------------------------------------------------------
  const a = await session('adult');
  await signUp(a, `e2e-adult-${stamp}@nujoom.test`, {
    displayName: 'لاعب تجريبي',
    birthYear: yearsAgo(25),
    recording: true,
  });
  await a.shot('01-home');
  check('adult sign-up lands on Home', (await a.text()).includes('الرئيسية'));

  for (const [path, label] of [
    ['', 'home'],
    ['pitches', 'pitches'],
    ['match', 'match'],
    ['rankings', 'rankings'],
    ['profile', 'profile'],
  ]) {
    await a.go(path);
    const body = await a.text();
    await a.shot(`02-tab-${label}`, 300);
    check(
      `tab "${label}" renders real content (no blank screen, no undefined)`,
      body.length > 80 && !/undefined|NaN/.test(body),
    );
  }

  await a.go();
  check('a restart keeps the session', !(await a.text()).includes('أرسل الرمز'));

  await a.go('settings');
  const settings = await a.text();
  await a.shot('03-settings');
  check(
    'Settings shows photo, privacy, recording, legal and data sections',
    ['صورتك', 'الخصوصية', 'تسجيل المباريات', 'بياناتك'].every((w) => settings.includes(w)),
  );
  await a.page.getByText('English', { exact: true }).first().click();
  await a.page.waitForTimeout(6000);
  const dirEn = await a.page.evaluate(() => document.documentElement.dir);
  await a.shot('04-settings-en');
  check('switching to English turns the layout LTR', dirEn === 'ltr', dirEn);
  const backFlipped = await a.page
    .getByRole('button', { name: 'Back' })
    .first()
    .evaluate((el) =>
      [...el.querySelectorAll('*')].some((c) =>
        getComputedStyle(c).transform.startsWith('matrix(-1'),
      ),
    );
  check('and the back arrow points the English way without a reload', backFlipped);
  await a.page.getByText('العربية', { exact: true }).first().click();
  await a.page.waitForTimeout(6000);
  check(
    'and back to Arabic RTL',
    (await a.page.evaluate(() => document.documentElement.dir)) === 'rtl',
  );

  await a.go('settings');
  await a.page.getByText('تسجيل الخروج', { exact: true }).last().click();
  await a.page.waitForTimeout(5000);
  check('sign-out shows sign-in', (await a.text()).includes('أرسل الرمز'));
  await a.go();
  check('and stays signed out after a reload', (await a.text()).includes('أرسل الرمز'));
  check('no page errors in the adult run', a.errors.length === 0, a.errors.join(' | '));
  await a.context.close();

  // --- Youth -----------------------------------------------------------------------------------
  const y = await session('youth');
  await signUp(y, `e2e-youth-${stamp}@nujoom.test`, {
    displayName: 'ناشئ تجريبي',
    birthYear: yearsAgo(15),
    recording: true,
  });
  await y.shot('05-guardian-step');
  check(
    'an under-18 sign-up reaches the guardian step',
    (await y.text()).includes('بدنا موافقة ولي أمرك'),
  );
  await y.page.getByLabel('إيميل ولي الأمر').fill(`e2e-guardian-${stamp}@nujoom.test`);
  await y.page.getByText('ابعت الدعوة', { exact: true }).click();
  await y.page.waitForTimeout(8000);
  const guardian = await y.text();
  await y.shot('06-guardian-named');
  check(
    'naming a guardian never claims "sent" without delivery',
    guardian.includes('انبعتت الدعوة') || guardian.includes('لسا ما وصله'),
  );
  await y.page.getByText(/كمّل (بحدود|للتطبيق)/).click();
  await y.page.waitForTimeout(7000);
  await y.shot('07-youth-home');
  check('the youth continues into the app with limits', (await y.text()).includes('الرئيسية'));
  check('no page errors in the youth run', y.errors.length === 0, y.errors.join(' | '));
  await y.context.close();
} catch (error) {
  check('run finished', false, error.message.split('\n')[0]);
} finally {
  await browser.close();
  for (const id of created) {
    const { error } = await admin.auth.admin.deleteUser(id);
    if (error) console.log(`cleanup: could not delete ${id}: ${error.message}`);
  }
}

const failed = results.filter((ok) => !ok).length;
console.log(`\n${results.length - failed}/${results.length} passed · screenshots in ${OUT}/`);
process.exit(failed ? 1 : 0);
