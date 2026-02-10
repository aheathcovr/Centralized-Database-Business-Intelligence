# Fix "invalid_client" OAuth Error

## ❌ Problem
Your .env.local still has placeholder values:
```
GOOGLE_CLIENT_ID=YOUR_GOOGLE_CLIENT_ID_HERE
GOOGLE_CLIENT_SECRET=YOUR_GOOGLE_CLIENT_SECRET_HERE
```

## ✅ Solution

### Step 1: Get Real Credentials from Google Cloud

1. Go to https://console.cloud.google.com/
2. Click **☰ APIs & Services > Credentials**
3. Click **+ Create Credentials > OAuth client ID**
4. If asked to configure consent screen:
   - Click **Configure Consent Screen**
   - Select **External**
   - App name: **Cover Dashboard**
   - Your email for support & developer contact
   - Click **Save and Continue** (twice)
   - Click **Back to Dashboard**

5. Create OAuth client ID:
   - Application type: **Web application**
   - Name: **Cover Dashboard**
   - Authorized JavaScript origins: `http://localhost:3001`
   - Authorized redirect URIs: `http://localhost:3001/api/auth/callback/google`
   - Click **Create**

6. **Copy the Client ID and Client Secret shown**

### Step 2: Update .env.local

Replace these lines in `/dashboard/.env.local`:
```
GOOGLE_CLIENT_ID=YOUR_GOOGLE_CLIENT_ID_HERE
GOOGLE_CLIENT_SECRET=YOUR_GOOGLE_CLIENT_SECRET_HERE
```

With your actual values (example):
```
GOOGLE_CLIENT_ID=123456789-abcdefghijklmnopqrstuvwxyz.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-your-secret-here
```

### Step 3: Restart Server

Press **Ctrl+C** to stop the server, then run:
```bash
cd dashboard
npm run dev
```

### Step 4: Test

Go to http://localhost:3001 and click "Sign in with Google"

## ⚠️ Important Notes

- Server is now on **port 3001** (not 3000)
- Use `http://localhost:3001` in Google Cloud Console
- The Client ID ends with `.apps.googleusercontent.com`
- The Client Secret starts with `GOCSPX-`
