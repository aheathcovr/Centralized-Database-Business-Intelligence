 # Quick Start Guide - Cover Penetration Dashboard

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

# From Google Cloud Console (see below)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# BigQuery project (already set)
GOOGLE_CLOUD_PROJECT_ID=gen-lang-client-0844868008

# SSO domain restriction
ALLOWED_DOMAIN=covr.care
```

### Step 2: Create BigQuery View

Run this in your BigQuery console:
```sql
-- Create the view that the dashboard queries
CREATE OR REPLACE VIEW `gen-lang-client-0844868008.clickup.corp_penetration_view` AS
-- (Copy the full SQL from bigquery/corp_penetration_view.sql)
```

### Step 3: Start the Development Server

```bash
cd dashboard
npm run dev
```

### Step 4: Open in Browser

Navigate to: **http://localhost:3000**

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
- [ ] Add authorized redirect URIs:
  - `http://localhost:3000/api/auth/callback/google` (for local dev)
  - `https://www.covrsales.care/api/auth/callback/google` (for production)
- [ ] Create BigQuery view with proper permissions
- [ ] Test with a @covr.care email account
- [ ] Deploy to Vercel and configure custom domain

---

## 🔧 Troubleshooting

### "Failed to fetch data" error
- Check that BigQuery view exists
- Verify GOOGLE_CLOUD_PROJECT_ID is correct
- Ensure service account has BigQuery read permissions

### "Unauthorized" error
- Check NEXTAUTH_SECRET is set
- Verify Google OAuth credentials are correct
- Ensure you're using a @covr.care email

### Build errors
```bash
cd dashboard
rm -rf .next
npm run build
```
