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

## Private admin mailer

The private `/admin` login and `/admin/mail` composer use server-only environment
variables. Configure these locally in `.env.local` and in the Vercel project:

```text
ADMIN_USERNAME=
ADMIN_PIN_HASH=
ADMIN_SESSION_SECRET=
RESEND_API_KEY=
RESEND_ADMIN_API_KEY=
RESEND_WEBHOOK_SECRET=
```

Generate a bcrypt hash for the chosen six-digit PIN from the project directory
(the PIN is prompted for and is not placed in shell history):

```powershell
node -e "const b=require('bcryptjs'),r=require('readline').createInterface({input:process.stdin,output:process.stdout});r.question('Six-digit PIN: ',async p=>{if(!/^\d{6}$/.test(p)){console.error('PIN must be exactly six digits');process.exitCode=1}else console.log(await b.hash(p,12));r.close()})"
```

Generate a 48-byte random session secret:

```powershell
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

Never commit `.env.local` or real values. The login route combines an in-process
per-IP progressive cooldown with a signed HttpOnly cooldown cookie. This is a
best-effort fallback for the current database-free stack, not a distributed
Vercel-wide rate limiter: configure an additional Vercel Firewall or Cloudflare
rate-limit rule for `POST /api/admin/login` before production use.

`RESEND_API_KEY` remains the sending-only key. `RESEND_ADMIN_API_KEY` is a
separate full-access, server-only key used for private Control Room metrics and
retrieving inbound email. `RESEND_WEBHOOK_SECRET` is the server-only Resend
signing secret used to authenticate inbound webhook requests.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
