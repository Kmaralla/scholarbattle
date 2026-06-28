# ScholarBattle — Setup Guide

## 1. Create a Supabase Project

1. Go to supabase.com → New Project
2. Copy your **Project URL** and **anon public key** from Settings → API

## 2. Set up the Database

In Supabase → SQL Editor, paste and run the contents of `supabase/schema.sql`

## 3. Configure Auth

In Supabase → Authentication → URL Configuration:
- **Site URL**: `http://localhost:3000` (dev) or your Vercel URL (prod)
- **Redirect URLs**: Add `http://localhost:3000/auth/callback` and your Vercel domain

## 4. Fill in .env.local

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## 5. Run Locally

```bash
nvm use 20       # requires Node 20+
npm install
npm run dev
```

Open http://localhost:3000 — you'll be redirected to /login

## 6. Deploy to Vercel

```bash
npx vercel        # follow prompts, links to your Vercel account
```

Then in Vercel Dashboard → your project → Settings → Environment Variables, add:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`  
- `NEXT_PUBLIC_APP_URL` = your Vercel URL (e.g. https://scholarbattle.vercel.app)

Redeploy after adding env vars.

## Flow After Setup

1. Visit app → redirected to /login
2. Enter email → get magic link → click link → land on /onboarding
3. Pick username + grade → land on /dashboard
4. Battle solo via /battle, challenge friends via /friends
