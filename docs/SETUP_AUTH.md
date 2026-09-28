# Sign-in setup for the owner

Two things only the project owner can do, when ready. Development doesn't need them: testers sign in with codes from `pnpm tester-code <name>@nujoom.test`.

Until step 1 is done, **real users cannot receive sign-in codes**: Supabase's built-in sender only emails members of the Supabase project, a few per hour. This is a launch blocker, not a development blocker.

## 1. Email sender (Resend)

1. Create a Resend account and add your sending domain (the web domain once chosen). Add the DNS records Resend shows (SPF, DKIM), and wait until the domain shows **Verified**.
2. In Resend, create an API key with "sending access" only.
3. In the Supabase dashboard → project `lowqyfbmzeixnadamezx` → **Authentication → Emails → SMTP settings**, turn on custom SMTP:
   - host `smtp.resend.com`, port `465`, username `resend`, password = the API key
   - sender email e.g. `no-reply@<your-domain>`, sender name = the app name
4. **Authentication → Rate limits:** raise "emails sent" from the tiny default (e.g. to 100 per hour).
5. **Authentication → Emails → Templates → Magic link:** make sure the email shows the 6-digit code (`{{ .Token }}`) as well as the link, because the app asks for the code.

Tell Claude when it's done; the next smoke run then sends a real code to a real inbox.

## 2. Google sign-in

1. In Google Cloud Console, create an OAuth client of type **Web application**.
   - Authorized redirect URI: `https://lowqyfbmzeixnadamezx.supabase.co/auth/v1/callback`
   - The app uses the system browser, so no Android or iOS client is needed.
2. In the Supabase dashboard → **Authentication → Sign In / Providers → Google**, enable it and paste the client ID and secret.
3. **Authentication → URL Configuration → Redirect URLs:** add `nujoom://**` (the app) and, once it exists, `https://<your-domain>/**` (the web app).

Never paste the secret into chat, git or `agentic_system`.
