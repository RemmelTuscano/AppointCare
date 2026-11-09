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

## Appointment notifications

The app sends appointment notifications from server-verified appointment and recipient data.
The old direct email and SMS endpoints return HTTP 410; they must not be used to send arbitrary
messages. The dispatch endpoint accepts only an appointment ID and event type and verifies the
signed-in patient or clinic owner and the appointment state.

To run reminders, set `REMINDER_CRON_SECRET` to a randomly generated secret of at least 32
characters in the server environment. Configure a trusted scheduler to send a POST request to
`/api/notifications/reminders` with `Authorization: Bearer <secret>`. The endpoint is disabled
when the secret is missing or too short. Protect the secret like a password and never put it in
client-side code. The response contains only aggregate counts, not patient details.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
