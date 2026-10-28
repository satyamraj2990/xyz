# oppology-shoudbeloud ✦

A dreamy friendship scrapbook and birthday website built with React, Vite, Tailwind CSS, Supabase, and Vercel. Includes a public timeline/gallery, an apology letter, a November 7, 2026 birthday countdown, and an admin-only media uploader backed by Supabase Auth, RLS, and Storage policies.

**Start here:** read [`SETUP.md`](./SETUP.md) for the complete local setup, Supabase SQL/security configuration, admin account setup, and Vercel deployment steps.

Quick start: `npm install`, copy `.env.example` to `.env.local`, configure Supabase, then `npm run dev`.

Privacy note: the website and published media are public to anyone who has the link. Admin uploads and edits are restricted by Supabase RLS; never expose a Supabase service-role key in frontend code.
