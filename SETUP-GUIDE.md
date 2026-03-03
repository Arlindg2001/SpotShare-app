# SpotShare — Supabase Setup Guide

Follow these steps exactly. Total time: ~10 minutes.

---

## Step 1: Create Your Supabase Account (2 min)

1. Go to **https://supabase.com**
2. Click **"Start your project"** (top right)
3. Sign up with your **GitHub account** (easiest) or email
4. You're now in the Supabase Dashboard

---

## Step 2: Create a New Project (2 min)

1. Click **"New Project"**
2. Fill in:
   - **Name:** `spotshare` (or whatever you want)
   - **Database Password:** Pick something strong — **SAVE THIS PASSWORD** somewhere safe (you'll need it later)
   - **Region:** Choose `East US (Virginia)` — closest to NYC users
   - **Plan:** Free tier is perfect for now (500MB database, 50K monthly active users)
3. Click **"Create new project"**
4. Wait 1-2 minutes while it sets up

---

## Step 3: Get Your API Keys (1 min)

1. Once your project is ready, go to **Settings** (gear icon in left sidebar)
2. Click **"API"** in the left menu
3. You'll see two important values:
   - **Project URL** — looks like `https://abcdefg.supabase.co`
   - **anon/public key** — a long string starting with `eyJ...`
4. **Copy both of these** — you'll need them in Step 5

---

## Step 4: Run the Database Schema (3 min)

This creates all the tables your app needs (users, listings, bookings, etc.)

1. In the left sidebar, click **"SQL Editor"** (looks like a terminal icon)
2. Click **"New query"**
3. Open the file `supabase-schema.sql` from your project folder
4. **Copy the ENTIRE contents** of that file
5. **Paste it** into the SQL Editor
6. Click **"Run"** (or press Ctrl/Cmd + Enter)
7. You should see "Success. No rows returned" — that means it worked!

**To verify it worked:**
- Go to **"Table Editor"** in the left sidebar
- You should see 5 tables: `profiles`, `listings`, `availability`, `bookings`, `reviews`
- If you see them, you're good!

---

## Step 5: Update Your App's Environment File (1 min)

1. Open the file `.env.local` in your project root folder
2. Replace the placeholder values with your real keys:

```
NEXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT-ID.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...YOUR-REAL-KEY-HERE
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=placeholder-key
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_APP_NAME=SpotShare
```

Replace:
- `YOUR-PROJECT-ID` with your actual Supabase project URL from Step 3
- `YOUR-REAL-KEY-HERE` with your actual anon key from Step 3

---

## Step 6: Enable Google Auth (Optional but recommended) (2 min)

This lets users sign in with their Google account.

1. In Supabase Dashboard, go to **Authentication** (left sidebar)
2. Click **"Providers"**
3. Find **Google** and toggle it ON
4. You'll need a Google OAuth Client ID and Secret:
   - Go to https://console.cloud.google.com
   - Select your project (or create one)
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "OAuth client ID"
   - Choose "Web application"
   - Add authorized redirect URI: `https://YOUR-PROJECT-ID.supabase.co/auth/v1/callback`
   - Copy the Client ID and Client Secret
5. Paste them back in Supabase's Google provider settings
6. Click **Save**

**Note:** If you skip this, email/password login still works perfectly.

---

## Step 7: Test It! (1 min)

1. Open your terminal in the project folder
2. Run: `npm install` (first time only)
3. Run: `npm run dev`
4. Open http://localhost:3000
5. Try signing up with an email and password
6. Check Supabase Dashboard > Authentication > Users — your user should appear!

---

## Troubleshooting

**"Invalid API key" error:**
→ Double-check your `.env.local` values. Make sure there are no extra spaces.

**"relation does not exist" error:**
→ The SQL schema didn't run properly. Go back to Step 4 and re-run it.

**Google login doesn't work:**
→ Make sure the redirect URI in Google Cloud Console exactly matches your Supabase callback URL.

**"Email not confirmed" after signup:**
→ Check your email for a confirmation link. In development, you can disable email confirmation in Supabase: Authentication > Settings > toggle off "Enable email confirmations"

---

## What Each Table Does (for your reference)

| Table | Purpose |
|-------|---------|
| `profiles` | User accounts (name, email, role, Stripe info) |
| `listings` | Parking spots hosts put up for rent |
| `availability` | When each spot is available (day + time ranges) |
| `bookings` | Reservations drivers make |
| `reviews` | Ratings/comments after bookings |

Auto-created: When someone signs up, a `profiles` row is automatically created for them via a database trigger.
