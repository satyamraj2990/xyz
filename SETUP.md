# oppology-shoudbeloud — setup and deployment

A React + Vite + Tailwind + Supabase scrapbook for a friendship, apology, and birthday on **November 7, 2026**. The website is public to anyone who has its URL. The upload dashboard requires a Supabase Auth account with an admin role.

## 1. Requirements

- Node.js 20.19+ or 22.12+ (current supported LTS recommended)
- A Supabase account/project
- A Vercel account (or another static Vite host)

## 2. Install and preview locally

1. Extract this project folder.
2. Open a terminal in the project folder.
3. Run:

   ```bash
   npm install
   cp .env.example .env.local
   npm run dev
   ```

   On Windows PowerShell, use `Copy-Item .env.example .env.local` instead of `cp` if needed.
4. Open the local URL printed by Vite, usually `http://localhost:5173`.

Without Supabase environment variables, the visual demo works with sample placeholder memories. Uploads and cloud persistence are disabled until Supabase is configured.

## 3. Create Supabase project and database

1. Create a new project at https://supabase.com.
2. Open **SQL Editor → New query**.
3. Paste the entire contents of `supabase/schema.sql` and run it.
4. This creates the `public.memories` table, enables Row Level Security (RLS), adds public read/admin-only write policies, creates the public `memories` Storage bucket (50 MB per file), and adds Storage policies.
5. In Supabase, open **Project Settings → API** (or **Connect**) and copy the Project URL and the publishable/anon key.
6. Put them in `.env.local`:

   ```dotenv
   VITE_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
   VITE_SUPABASE_ANON_KEY=YOUR_PUBLISHABLE_OR_ANON_KEY
   ```

   The publishable/anon key is designed for browser use with RLS enabled. **Never put the `service_role` key or a secret key in a `VITE_` variable or in frontend code.**
7. Stop and restart the Vite server after changing environment variables.

## 4. Create your admin login securely

1. In Supabase, go to **Authentication → Users → Add user** and create your own email/password user. Use an email you control. Do not make public sign-up available for this small private admin dashboard.
2. Open **SQL Editor** and run the following, replacing the email with the exact admin email you just created:

   ```sql
   update auth.users
   set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role":"admin"}'::jsonb
   where email = 'YOUR_ADMIN_EMAIL@example.com';
   ```

3. Confirm exactly one row was updated. If it updated zero rows, check the email. `raw_app_meta_data` is server-managed; do not use `user_metadata` for this role.
4. In the app, open the lock icon, sign in with this user, and upload a test image. If you had already signed in before setting the role, sign out and sign in again so the JWT contains the updated `app_metadata` claim.
5. Test that a non-admin authenticated account cannot upload or edit. RLS and Storage policies are the real security boundary; hiding the dashboard button is not security.

## 5. Add memories

- Open the lock icon → sign in → choose multiple photos/videos/voice notes → add a date/category/caption → upload.
- Accepted media types are configured in `supabase/schema.sql`. Current per-file limit is 50 MB. For smoother mobile loading, resize photos and compress videos before uploading.
- Multiple files selected in one upload share the title and caption entered in the form; the filename is used as the title if the title field is blank.
- The gallery loads published records from Supabase. `is_published` defaults to true for admin uploads.
- Deleting a memory removes its database row and then attempts to delete the Storage object.

## 6. Deploy to Vercel

1. Push the project to a GitHub repository (do not commit `.env.local`).
2. In Vercel, choose **Add New → Project**, import the repository, and keep the Vite defaults (`npm run build`, output directory `dist`).
3. In **Project Settings → Environment Variables**, add:
   - `VITE_SUPABASE_URL` = your Supabase Project URL
   - `VITE_SUPABASE_ANON_KEY` = your publishable/anon key
4. Deploy. If you change environment variables later, redeploy.
5. Open the deployed site on your phone and test gallery, video playback, admin login, upload, and deletion.
6. If you later add custom-domain redirects or OAuth, add the deployed site URL in Supabase **Authentication → URL Configuration**. Email/password sign-in itself does not require an OAuth redirect.

## 7. Privacy — read before uploading

This version is intentionally **public to anyone who has the website link**. It is not confidential or truly unlisted: the public Storage bucket makes media URLs accessible to anyone who obtains those URLs, and public website visitors can view published memories. Do not upload intimate, sensitive, or third-party photos/videos unless everyone pictured is comfortable with that. Do not put private secrets in captions.

If you need genuine privacy, switch the bucket to private and serve media through authenticated access or short-lived signed URLs, and add a real visitor password/login layer. A password gate implemented only in React is not enough to protect public media.

## 8. Troubleshooting

- **“Supabase is connected, but the memories table…”** — run `supabase/schema.sql` and check the Supabase project URL/key.
- **Upload says permission denied / RLS** — verify the admin user's `raw_app_meta_data` contains `{"role":"admin"}`, then sign out/in again. Do not remove RLS to fix it.
- **Unsupported MIME type** — check the bucket allow-list in the SQL and use a supported image/video/audio type.
- **Large upload fails or takes too long** — compress media. The current bucket limit is 50 MB per object; consider resumable uploads for larger video files.
- **Changes to code don't appear on Vercel** — confirm the latest commit deployed and redeploy after changing environment variables.

## What's included

- `src/App.jsx` — full single-page experience, gallery, birthday countdown, admin sign-in and uploader
- `src/styles.css` — responsive scrapbook design
- `src/lib/supabase.js` — Supabase client and public media URLs
- `supabase/schema.sql` — table, bucket and RLS/Storage policies
- `.env.example` — environment variable template
