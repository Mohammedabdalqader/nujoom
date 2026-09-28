// Tester sign-in without email delivery: creates (if needed) a confirmed account and prints a
// one-time 6-digit code to type after "I already have a code" in the app.
//
//   pnpm tester-code tester1@nujoom.test
//
// Developer machines only. Accounts are limited to @nujoom.test addresses.
import { adminClient, testerCode } from './lib.mjs';

const email = process.argv[2];
try {
  const { isNew, code } = await testerCode(adminClient(), email);
  console.log(`\n  ${isNew ? 'New' : 'Existing'} tester: ${email.trim().toLowerCase()}`);
  console.log(`  Sign-in code:  ${code}\n`);
  console.log('  One use, valid about an hour. Asking the app to "send" afterwards replaces it.');
} catch (error) {
  console.error(`Could not create a tester code: ${error.message}`);
  process.exit(1);
}
