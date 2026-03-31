# Quick Start Guide — Cover Penetration Dashboard

## 🚀 Run the Web App Locally

### Step 1: Set up Environment Variables

```bash
cd dashboard
cp .env.local.example .env.local
```

Edit `.env.local` and fill in these required values:

```bash
# Generate a secret: openssl rand -base64 32
NEXTAUTH_SECRET=your-generated-secret-here

# From Google Cloud Console (see OAuth Setup below)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# BigQuery project (already set)
GOOGLE_CLOUD_PROJECT_ID=gen-lang-client-0844868008

# SSO domain restriction
ALLOWED_DOMAIN=covr.care
```

### Step 2: Create BigQuery Views

Run each SQL file in the BigQuery Console:

```sql
-- Run the contents of each file:
-- bigquery/corp_penetration_view.sql
-- bigquery/in_month_conversion.sql
-- bigquery/rep_performance_view.sql
-- bigquery/intercom_weekly_support_metrics.sql
```

### Step 3: Start the Development Server

```bash
cd dashboard
npm run dev
```

### Step 4: Open in Browser

Navigate to: **http://localhost:3000**

---

## 🔑 Google OAuth Setup

### Create OAuth Credentials

1. Go to https://console.cloud.google.com/
2. Click **☰ APIs & Services > Library**
3. Search for **"Google Identity Toolkit API"** and click **Enable**
4. Go to **APIs & Services > Credentials**
5. Click **+ Create Credentials > OAuth client ID**
6. If prompted, configure the **OAuth consent screen**:
   - Select **External**
   - App name: **"Cover Dashboard"**
   - User support email: your email
   - Developer contact: your email
   - Click **Save and Continue** (twice)
   - Test users: Add your @covr.care email
   - Click **Save and Continue**
7. Back on **Create OAuth client ID**:
   - Application type: **Web application**
   - Name: **"Cover Dashboard Local"**
   - **Authorized JavaScript origins**: `http://localhost:3000`
   - **Authorized redirect URIs**: `http://localhost:3000/api/auth/callback/google`
   - Click **Create**
8. Copy the **Client ID** and **Client Secret**

### Update .env.local

Replace the placeholder values in `/dashboard/.env.local`:

```bash
GOOGLE_CLIENT_ID=123456789-abcdefghijklmnopqrstuvwxyz.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-your-secret-here
```

The Client ID ends with `.apps.googleusercontent.com` and the Client Secret starts with `GOCSPX-`.

### Restart the Server

```bash
cd dashboard
npm run dev
```

### For Production (www.covrsales.care)

After local testing works, add production URLs to your OAuth client:

1. Go to **APIs & Services > Credentials**
2. Click on your OAuth client ID
3. Add to **Authorized JavaScript origins**: `https://www.covrsales.care`
4. Add to **Authorized redirect URIs**: `https://www.covrsales.care/api/auth/callback/google`
5. Click **Save**

---

## 🖱️ How to Interact with the Dashboard

### Login
1. Click **"Sign in with Google"**
2. Use your **@covr.care** email address
3. Other domains are blocked

### Dashboard Overview

| Feature | What It Shows | How to Use |
|---------|---------------|------------|
| **Summary Cards** | Total corps, active customers, avg penetration, total facilities | Quick KPIs at a glance |
| **Status Chart** | Bar chart of Active/Churned/No Start corps | Visual distribution |
| **Product Mix** | Pie chart of Flow/View/Sync adoption | See product penetration |
| **Top 10 Penetration** | Horizontal bar chart of best-performing corps | Identify top accounts |
| **Filters** | Status dropdown, Product dropdown, Search box | Filter the table below |
| **Corporation Table** | Full list with penetration progress bars | Scroll, click HubSpot links |

### Interactions
- **Search**: Type in the search box to filter corporations by name
- **Filter by Status**: Select "Active", "Churned", or "No Start"
- **Filter by Product**: Select "Flow", "View", or "Sync"
- **View in HubSpot**: Click the link under any corporation name
- **Sign Out**: Click the button in the top-right corner

---

## 📋 Pre-Deployment Checklist

Before deploying to production:

- [ ] Set up Google OAuth credentials in Google Cloud Console
- [ ] Add authorized redirect URIs for both local and production
- [ ] Create BigQuery views with proper permissions
- [ ] Test with a @covr.care email account
- [ ] Deploy to Vercel and configure custom domain

---

## 🔧 Troubleshooting

### "Error 400: redirect_uri_mismatch"
- Make sure the redirect URI in Google Cloud matches exactly
- Must include `http://localhost:3000/api/auth/callback/google`

### "This app isn't verified"
- This is normal for testing
- Click **Advanced** > **Go to Cover Dashboard (unsafe)**
- Or add your email as a test user in the OAuth consent screen

### "invalid_client" error
- Your `.env.local` still has placeholder values
- Make sure `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are set to real values from Google Cloud Console

### "Failed to fetch data" error
- Check that BigQuery views exist
- Verify `GOOGLE_CLOUD_PROJECT_ID` is correct
- Ensure service account has BigQuery read permissions

### "Unauthorized" error
- Check `NEXTAUTH_SECRET` is set
- Verify Google OAuth credentials are correct
- Ensure you're using a @covr.care email

### Build errors
```bash
cd dashboard
rm -rf .next
npm run build
```
