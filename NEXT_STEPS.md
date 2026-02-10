# Next Steps to Get the Dashboard Running

## ✅ Current Status
- Server is running at http://localhost:3000 ✅
- Environment file created (.env.local) ✅
- NEXTAUTH_SECRET is set ✅
- ❌ GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are NOT set (this is why login fails)

## 🔧 What You Need to Do NOW

### Step 1: Open Google Cloud Console
Go to: https://console.cloud.google.com/

### Step 2: Create OAuth Credentials (5 minutes)

1. **Enable the API:**
   - Go to APIs & Services > Library
   - Search "Google Identity Toolkit API"
   - Click Enable

2. **Create OAuth Client ID:**
   - Go to APIs & Services > Credentials
   - Click + Create Credentials > OAuth client ID
   - Application type: Web application
   - Name: Cover Dashboard Local
   - Authorized JavaScript origins: `http://localhost:3000`
   - Authorized redirect URIs: `http://localhost:3000/api/auth/callback/google`
   - Click Create

3. **Copy the credentials:**
   - Copy the Client ID (long string ending in .apps.googleusercontent.com)
   - Copy the Client Secret

### Step 3: Update .env.local

Open the file `/dashboard/.env.local` and replace:
```
GOOGLE_CLIENT_ID=YOUR_GOOGLE_CLIENT_ID_HERE
GOOGLE_CLIENT_SECRET=YOUR_GOOGLE_CLIENT_SECRET_HERE
```

With your actual values.

### Step 4: Test

1. Go to http://localhost:3000
2. Click "Sign in with Google"
3. Sign in with your @covr.care email

## 🆘 If You Get Stuck

Common issues:
- "Error 400: redirect_uri_mismatch" → Check the redirect URI is exactly `http://localhost:3000/api/auth/callback/google`
- "This app isn't verified" → Click "Advanced" > "Go to Cover Dashboard (unsafe)"
- "Access denied" → Add your email as a test user in OAuth consent screen

## 📋 After Login Works

You'll also need to:
1. Create the BigQuery view (run SQL from bigquery/corp_penetration_view.sql)
2. Set up BigQuery permissions

See GOOGLE_OAUTH_SETUP.md for detailed screenshots and troubleshooting.
