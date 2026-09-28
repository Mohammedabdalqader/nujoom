// Admin access for the web admin (D-057): grant, revoke or list, on the linked project.
//
//   pnpm --filter @nujoom/tools-admin grant  you@example.com [--note "owner"]
//   pnpm --filter @nujoom/tools-admin revoke you@example.com
//   pnpm --filter @nujoom/tools-admin list
//
// The person must have signed in once (the account must exist). Developer machines only: it uses
// the service role through the Supabase CLI login, like the other operator tools. Every change
// is written to the audit log.
import { adminClient } from '../tester-code/lib.mjs';

const [command, rawEmail, ...rest] = process.argv.slice(2);
const noteAt = rest.indexOf('--note');
const note = noteAt >= 0 ? String(rest[noteAt + 1] ?? '').slice(0, 200) : null;
const admin = adminClient();

async function findUser(email) {
  const wanted = String(email ?? '')
    .trim()
    .toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(wanted))
    throw new Error('Give the email address the person signs in with.');
  for (let page = 1; page < 50; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const hit = data.users.find((u) => u.email?.toLowerCase() === wanted);
    if (hit) return hit;
    if (data.users.length < 200) break;
  }
  throw new Error(`No account for ${wanted}. They need to sign in once (app or website) first.`);
}

async function audit(action, userId) {
  const { error } = await admin.from('audit_log').insert({
    action,
    target_type: 'user',
    target_id: userId,
    details: { via: 'tools/admin', note },
  });
  if (error) throw error;
}

try {
  if (command === 'grant') {
    const user = await findUser(rawEmail);
    const { error } = await admin
      .from('app_admins')
      .upsert({ user_id: user.id, note }, { onConflict: 'user_id', ignoreDuplicates: true });
    if (error) throw error;
    await audit('admin.granted', user.id);
    console.log(`${user.email} is an admin. Web admin: /ar/admin (sign in with this email).`);
  } else if (command === 'revoke') {
    const user = await findUser(rawEmail);
    const { error } = await admin.from('app_admins').delete().eq('user_id', user.id);
    if (error) throw error;
    await audit('admin.revoked', user.id);
    console.log(`${user.email} is no longer an admin.`);
  } else if (command === 'list') {
    const { data, error } = await admin.from('app_admins').select('user_id, note, created_at');
    if (error) throw error;
    if (!data.length) console.log('No admins yet.');
    for (const row of data) {
      const { data: u } = await admin.auth.admin.getUserById(row.user_id);
      console.log(
        `${u?.user?.email ?? row.user_id}  since ${row.created_at.slice(0, 10)}${row.note ? `  (${row.note})` : ''}`,
      );
    }
  } else {
    console.error('Usage: grant <email> [--note "…"] | revoke <email> | list');
    process.exit(2);
  }
} catch (error) {
  console.error(error.message ?? error);
  // exitCode, not exit(): exiting while network handles close crashes Node on Windows (libuv).
  process.exitCode = 1;
}
