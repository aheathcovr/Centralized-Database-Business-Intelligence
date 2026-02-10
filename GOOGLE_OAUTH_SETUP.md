# Google OAuth Setup Guide

## Step 1: Go to Google Cloud Console

1. Open https://console.cloud.google.com/
2. Sign in with your Google account
3. Select your project (or create a new one)

## Step 2: Enable Google OAuth API

1. Go to **APIs & Services** > **Library**
2. Search for **"Google Identity Toolkit API"**
3. Click **Enable**

## Step 3: Create OAuth Credentials

1. Go to **APIs & Services** > **Credentials**
2. Click **+ Create Credentials** > **OAuth client ID**
3. If prompted, configure the **OAuth consent screen**:
   - Select **External** (for testing with any Google account)
   - Fill in app name: **"Cover Dashboard"**
   - User support email: your email
   - Developer contact: your email
   - Click **Save and Continue**
   - Scopes: Click **Save and Continue** (no additional scopes needed)
   - Test users: Add your @covr.care email
   - Click **Save and Continue**

4. Back on **Create OAuth client ID**:
   - Application type: **Web application**
   - Name: **"Cover Dashboard Local"**
   - **Authorized JavaScript origins**: Add `http://localhost:3000`
   - **Authorized redirect URIs**: Add `http://localhost:3000/api/auth/callback/google`
   - Click **Create**

5. Copy the **Client ID** and **Client Secret**

## Step 4: Update .env.local

Open `/dashboard/.env.local` and replace:

```bash
GOOGLE_CLIENT_ID=YOUR_GOOGLE_CLIENT_ID_HERE
GOOGLE_CLIENT_SECRET=YOUR_GOOGLE_CLIENT_SECRET_HERE
```

With your actual values from Google Cloud Console.

## Step 5: Restart the Server

Stop the current server (Ctrl+C) and restart:

```bash
cd dashboard
npm run dev
```

## Step 6: Test Login

1. Go to http://localhost:3000
2. Click **"Sign in with Google"**
3. You should see a Google consent screen
4. Sign in with your @covr.care email

---

## For Production (www.covrsales.care)

After local testing works, add production URLs:

1. Go back to **APIs & Services** > **Credentials**
2. Click on your OAuth client ID
3. Add to **Authorized JavaScript origins**:
   - `https://www.covrsales.care`
4. Add to **Authorized redirect URIs**:
   - `https://www.covrsales.care/api/auth/callback/google`
5. Click **Save**

---

## Troubleshooting

### "Error 400: redirect_uri_mismatch"
- Make sure the redirect URI in Google Cloud matches exactly
- Must include `http://localhost:3000/api/auth/callback/google`

### "This app isn't verified"
- This is normal for testing
- Click **Advanced** > **Go to Cover Dashboard (unsafe)**
- Or add your email as a test user in the OAuth consent screen

### "Access denied: authorizing the app will give access to"
- Make sure you added your email as a test user
- Go to **OAuth consent screen** > **Test users** > **Add users**
