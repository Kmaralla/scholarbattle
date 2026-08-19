# ScholarBattle

Battle your friends in quiz questions, climb the ranks. A Next.js + Supabase web app: real-time 1v1 battles, matchmaking, a global/seasonal leaderboard, friends + chat, solo practice modes, and coin-unlockable cosmetics.

## Quick start

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Requires a Supabase project with the schema applied and `.env.local` filled in first — see **[SETUP.md](SETUP.md)** for the full walkthrough, or `.env.example` for the required environment variables.

## Stack

- **Next.js 16** (App Router, Turbopack) + React 19 + TypeScript + Tailwind
- **Supabase** — Postgres, Auth (Google OAuth), Realtime (battles/matchmaking/chat), Row Level Security
- **OpenAI / Anthropic** — optional, powers the AI-generated post-battle report card
- Deployed on **Vercel**, with a daily Vercel Cron job for seasonal leaderboard resets

## Project structure

- `src/app/(app)/` — the authenticated app: dashboard, battle, matchmaking, leaderboard, friends, training, games, tutorial, profile
- `src/app/(auth)/`, `src/app/auth/` — login + OAuth callback
- `src/app/api/` — API routes (AI report card generation, the season-rollover cron endpoint)
- `src/components/` — shared UI, grouped by feature area
- `src/lib/` — question bank, badges, frames, games, seasons, ELO/domain logic
- `supabase/schema.sql` — the full database schema (tables, RLS policies, functions) — run this once against a fresh Supabase project

## Learn more

- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Documentation](https://supabase.com/docs)
