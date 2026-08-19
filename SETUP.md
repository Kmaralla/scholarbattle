# ScholarBattle — Setup Guide

## 1. Create a Supabase Project

1. Go to supabase.com → New Project
2. Copy your **Project URL** and **anon public key** from Settings → API

## 2. Set up the Database

In Supabase → SQL Editor, paste and run the contents of `supabase/schema.sql`

## 3. Configure Auth

The app signs in with **Google OAuth** (no magic link / password). In Supabase → Authentication → Providers, enable Google and fill in your OAuth client ID/secret.

In Supabase → Authentication → URL Configuration:
- **Site URL**: `http://localhost:3000` (dev) or your Vercel URL (prod)
- **Redirect URLs**: Add `http://localhost:3000/auth/callback` and your Vercel domain's `/auth/callback`

## 4. Fill in .env.local

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Required for battle rewards (ELO/coins/badges) — Project Settings → API →
# service_role (secret, NOT the anon key). Server-only, never exposed to
# the browser.
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Optional — powers the AI post-battle report card. Set one of these two;
# OpenAI is tried first, falls back to Anthropic if unset.
OPENAI_API_KEY=
ANTHROPIC_API_KEY=

# Optional — protects the season-rollover cron endpoint from being called
# by anyone who finds the URL. Any random string; Vercel Cron sends it
# automatically as a Bearer token once set in your Vercel project's env vars.
CRON_SECRET=
```

See `.env.example` for a copy-pasteable template.

## 5. Run Locally

```bash
npm install
npm run dev
```

Open http://localhost:3000 — you'll be redirected to /login

## 6. Deploy to Vercel

```bash
npx vercel        # follow prompts, links to your Vercel account
```

Then in Vercel Dashboard → your project → Settings → Environment Variables, add the same variables listed above (`NEXT_PUBLIC_APP_URL` should be your Vercel domain, e.g. `https://your-app.vercel.app`).

Redeploy after adding env vars. The `vercel.json` cron schedule (daily season-rollover check) is picked up automatically on deploy — no extra setup needed beyond optionally setting `CRON_SECRET`.

## Flow After Setup

1. Visit app → redirected to /login
2. Continue with Google → land on /onboarding
3. Pick username + grade → land on /dashboard
4. Battle solo via /battle, challenge friends via /friends
