This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Gemini AI

Add a Gemini API key to your environment before using the in-app assistant:

```
GEMINI_API_KEY=your-gemini-api-key
```

## Supabase OAuth

Google sign-in returns to the origin currently open in the browser. In Supabase Dashboard, go to **Authentication > URL Configuration** and allow each development callback you use:

```
http://localhost:3000/auth/callback
http://192.168.118.192:3000/auth/callback
```

When testing from another device on this network, set the **Site URL** to `http://192.168.118.192:3000`. Do not use `http://0.0.0.0:3000` as a Site URL; it is a server bind address and browsers cannot navigate to it. The Google provider redirect URI remains the Supabase callback URL shown in the provider configuration.

## Administrator access

Administrator pages, clinic verification, and backups require the authenticated user's
Supabase Auth **app metadata** to contain `"role": "admin"`. The profile role and user
metadata are not sufficient because users can modify them. Existing administrators must
be explicitly provisioned by a trusted operator using the Supabase Auth Admin API; merge
`role: 'admin'` into their existing `app_metadata` with `updateUserById`. Never grant this
role using a browser client. The development `scripts/seed-admin.js` script provisions its
demo administrator accordingly.

For an existing administrator, a trusted operator can run the following in the Supabase SQL
Editor after verifying the account's UUID. Preserve the existing metadata and replace the
placeholder with that UUID:

```sql
update auth.users
set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role":"admin"}'::jsonb
where id = 'REPLACE-WITH-VERIFIED-USER-UUID'::uuid;
```

Do not grant administrator access automatically based on `profiles.role` or user metadata.

## Required Supabase security migrations

Before deploying the application changes, run `scripts/activity-log.sql` and
`scripts/clinic-permits.sql` in the Supabase SQL Editor for each environment. These
migrations restrict profile role changes and activity-log access, and make the permit bucket
private with clinic-scoped access. Existing public permit links will stop working; the app
uses short-lived signed links instead. Review the deployed database's other policies and grants
as well, since these scripts cannot remove unrelated policies created outside this repository.
Never apply the demo repair script to production.

To restrict the administrator activity log to administrator actions, run
`scripts/migrations/20261119010000_admin_only_activity.sql` in the Supabase SQL Editor
before deploying the updated app. Existing entries are retained, but only entries attributable
to current administrators at migration time are displayed; historical roles cannot be
reconstructed. New entries are classified using trusted Auth app metadata at the time of
the action. Changes made through service-role database operations without an administrator
actor are not recorded as administrator actions.

## Clinic follow-up appointments

Clinics can select **Follow-up** for a completed appointment in the Done tab. This reopens the
same appointment as confirmed at a future date and time; it does not create a separate record,
and its previous completed date is no longer shown in appointment history.

## Appointment cancellation requests

Before deploying cancellation requests, apply
`scripts/migrations/20261119030000_appointment_cancellation_requests.sql` in the Supabase SQL
Editor for each environment. Patients can submit a required reason for pending or confirmed
appointments; the clinic must approve the request to cancel the appointment, or decline it
to leave the appointment active. Both parties can see the decision on the appointments page.
When the clinic approves a cancellation, the patient receives an in-app notification and
email and SMS, subject to their preferences and provider availability.

## Appointment notifications

The app sends appointment notifications from server-verified appointment and recipient data.
The old direct email and SMS endpoints return HTTP 410; they must not be used to send arbitrary
messages. The dispatch endpoint accepts only an appointment ID and event type and verifies the
signed-in patient or clinic owner and the appointment state.
Booking requests produce in-app notifications only; confirmation sends an in-app notification
and email and SMS, subject to the patient's preferences and provider availability.

Configure these server-only environment variables (never use the `NEXT_PUBLIC_` prefix):

- `RESEND_API_KEY`: a Resend API key.
- `RESEND_FROM_EMAIL`: a sender address on a verified Resend domain, optionally formatted
  as `AppointCare <appointments@example.com>`. Resend's test sender has recipient restrictions.
- `TEXTBEE_API_KEY`: a TextBee API key.
- `TEXTBEE_DEVICE_ID` (optional): a registered TextBee device ID. If omitted, TextBee selects
  the default or most recently active enabled device.

TextBee needs a registered Android phone with the app online and a working SIM. Save patient
phone numbers with a country code when needed (for example `+15551234567`); local numbers are
interpreted by the sending SIM's carrier. Patients can enable or disable email and SMS in
account preferences. Missing credentials and provider failures are reported rather than
simulated. A provider accepting a request does not guarantee delivery.

When an administrator confirms a clinic verification, the app sends a verification email to
the clinic owner's Supabase account email using the same Resend configuration. If the email
fails, the clinic remains verified and the administrator is warned to notify the clinic
manually. Revoking verification does not send an email.

Patient and clinic signup accept Philippine mobile numbers in `09XXXXXXXXX` or
`+639XXXXXXXXX` format and store them as `+639XXXXXXXXX`. Existing account numbers are not
changed automatically. If your Supabase project uses the signup trigger from
`scripts/separate-patient-clinic-accounts.sql`, the signup trigger also creates the
role-specific account records.

Run `scripts/migrations/20261119000000_fix_signup_profile_details.sql` in the Supabase SQL
Editor after setting up the schema. It updates the signup trigger to copy addresses and phone
numbers into profiles and clinics, and restores missing contact details from signup metadata
for existing accounts. Existing non-null profile values and clinic addresses other than
`Address pending` are preserved; review the backfill before running it if a cleared field
should remain empty. Run it again after any older script that replaces `handle_new_user`.

Run `scripts/migrations/20261119020000_add_appointment_service.sql` before deploying the
appointment service display. New bookings retain the selected service; older bookings show
`Not recorded` because the selection was not previously saved.

For an end-to-end check, use a test patient with contact details you control, enable the desired
notification channels, and create or update an appointment in the app. Check the displayed
channel status and the provider dashboards; this sends real messages and may incur charges.
Run `node --test scripts/test-notifications.mjs` for offline mocked provider tests.

To run reminders, set `REMINDER_CRON_SECRET` to a randomly generated secret of at least 32
characters in the server environment. Configure a trusted scheduler to send a POST request to
`/api/notifications/reminders` with `Authorization: Bearer <secret>`. The endpoint is disabled
when the secret is missing or too short. Protect the secret like a password and never put it in
client-side code. The response contains only aggregate counts, not patient details.

## Automated administrator backups

Apply `scripts/migrations/20261120131500_automated_admin_backups.sql` in the Supabase SQL
Editor for each environment. On Vercel, set `CRON_SECRET` to a random secret of at least 32
characters; Vercel sends it as the authorization header for the weekly GET job configured in
`vercel.json` (Sunday at 04:00 UTC). The protected endpoint is `/api/admin/backup/automated`.
For an external scheduler, set `BACKUP_CRON_SECRET` and send a POST request to
`/api/admin/backup` with `Authorization: Bearer <secret>`. Backups are XLSX exports of
application data, stored in the private `admin_backups` bucket; each weekly run removes files
older than 30 days. Admins can browse and download the latest backups from the Backup Center.
Protect the scheduler secret and backup files as sensitive patient data; do not expose the
secret in client-side code.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
