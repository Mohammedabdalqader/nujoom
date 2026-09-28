// Guardian approval without email delivery (S1-11 testing): for a tester youth who has named a
// guardian in the app, issues a fresh invite token and prints the approval link.
//
//   pnpm --filter @nujoom/tools-tester-code guardian-link youth1@nujoom.test
//
// Developer machines only; tester (@nujoom.test) youths only. Real invites go out by email from
// the guardian-invite Edge Function once the owner has set up the email sender.
import { adminClient, assertTesterEmail } from './lib.mjs';

try {
  const email = assertTesterEmail(process.argv[2]);
  const admin = adminClient();
  const { data: users, error: listError } = await admin.auth.admin.listUsers({ perPage: 1000 });
  if (listError) throw listError;
  const youth = users.users.find((u) => u.email === email);
  if (!youth) throw new Error(`No account for ${email}.`);
  const { data: link, error: linkError } = await admin
    .from('guardians')
    .select('id, contact_email')
    .eq('youth_user_id', youth.id)
    .eq('status', 'pending')
    .maybeSingle();
  if (linkError) throw linkError;
  if (!link) throw new Error(`${email} has no pending guardian. Name one in the app first.`);

  const { data: issued, error } = await admin
    .rpc('issue_guardian_invite', { p_link_id: link.id, p_youth: youth.id })
    .single();
  if (error) throw new Error(error.message);

  console.log(`\n  Guardian invite for ${email} → ${issued.contact_email}`);
  console.log(`  App link:  nujoom://guardian/accept?token=${issued.token}`);
  console.log(`  Expires:   ${issued.expires_at}\n`);
  console.log('  Sign in as the guardian address (pnpm tester-code <guardian>) and open the link.');
  console.log('  Not marked as "sent": no email was delivered.');
} catch (error) {
  console.error(`Could not create a guardian link: ${error.message}`);
  process.exit(1);
}
