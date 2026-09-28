// Bundle guard (contract §7, C-005): builds a production Android bundle and fails if any demo
// fixture made it in. Complements the unit test of selectSource(): that proves the rule, this
// proves the bundler dropped the demo module.
//
//   pnpm --filter @nujoom/mobile check:bundle
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const out = fs.mkdtempSync(path.join(os.tmpdir(), 'nujoom-bundle-'));
const FORBIDDEN = [
  'nujoom-demo-fixtures:not-for-production', // DEMO_FIXTURE_MARKER
  'lh3.googleusercontent.com/aida-public', // the prototype's generated images
  'أحمد المالكي', // a demo player's name
];

try {
  execSync(`npx expo export --platform android --no-bytecode --clear --output-dir "${out}"`, {
    stdio: 'inherit',
    env: {
      ...process.env,
      NODE_ENV: 'production',
      EXPO_PUBLIC_APP_VARIANT: 'production',
      // Placeholders: the guard only inspects the bundle, it never runs it.
      EXPO_PUBLIC_SUPABASE_URL: 'https://bundleguard00000000000.supabase.co',
      EXPO_PUBLIC_SUPABASE_ANON_KEY: 'bundle-guard-placeholder',
    },
  });
  const files = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (/\.(js|hbc)$/.test(entry.name)) files.push(full);
    }
  };
  walk(out);
  if (!files.length) throw new Error('export produced no bundle');
  let found = 0;
  for (const file of files) {
    const text = fs.readFileSync(file, 'utf8');
    for (const needle of FORBIDDEN) {
      if (text.includes(needle)) {
        console.error(`FAIL ${path.basename(file)} contains demo content: ${needle}`);
        found += 1;
      }
    }
  }
  if (found) process.exit(1);
  console.log(`ok   production bundle is free of demo fixtures (${files.length} file(s) checked)`);
} finally {
  fs.rmSync(out, { recursive: true, force: true });
}
