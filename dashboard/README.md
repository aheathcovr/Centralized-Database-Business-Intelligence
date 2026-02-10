# Cover Penetration Dashboard

A Business Intelligence dashboard for Cover leadership to track penetration rates across customer corporations.

## Features

- **Google SSO Authentication**: Restricted to @covr.care domain users
- **Penetration Metrics**: Track facility penetration by corporation
- **Product Mix Analysis**: View adoption of Flow, View, and Sync products
- **Interactive Filters**: Filter by status, product, and search
- **Data Visualization**: Charts for status distribution, product mix, and penetration rates
- **Real-time Data**: Connected to BigQuery for live data

## Data Sources

- **ClickUp**: Corporation list (ID: 901302721443), customer status, product mix
- **HubSpot**: Child facility counts via parent_company_id relationships

## Getting Started

### Prerequisites

- Node.js 18+
- Google Cloud credentials with BigQuery access
- Google OAuth credentials

### Installation

```bash
npm install
```

### Environment Setup

Copy `.env.local.example` to `.env.local` and fill in your values:

```bash
cp .env.local.example .env.local
```

Required environment variables:
- `GOOGLE_CLIENT_ID` - Google OAuth client ID
- `GOOGLE_CLIENT_SECRET` - Google OAuth client secret
- `NEXTAUTH_SECRET` - Random secret for NextAuth
- `NEXTAUTH_URL` - Your app URL (http://localhost:3000 for development)
- `GOOGLE_CLOUD_PROJECT_ID` - BigQuery project ID
- `ALLOWED_DOMAIN` - Email domain restriction (covr.care)

### BigQuery Setup

1. Create the `corp_penetration_view` view in BigQuery using the SQL in `/bigquery/corp_penetration_view.sql`
2. Ensure your service account has read access to:
   - `gen-lang-client-0844868008.clickup.task`
   - `gen-lang-client-0844868008.HubSpot_Airbyte.companies`

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### Deployment

#### Vercel (Recommended)

1. Push code to GitHub
2. Import project in Vercel
3. Add environment variables in Vercel dashboard
4. Deploy

5. Configure custom domain `www.covrsales.care` in Vercel project settings

#### Google Cloud Run

```bash
gcloud builds submit --tag gcr.io/PROJECT_ID/cover-dashboard
gcloud run deploy cover-dashboard --image gcr.io/PROJECT_ID/cover-dashboard --platform managed
```

### Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create OAuth 2.0 credentials
3. Add authorized redirect URIs:
   - `http://localhost:3000/api/auth/callback/google` (development)
   - `https://www.covrsales.care/api/auth/callback/google` (production)
4. Add authorized JavaScript origins:
   - `http://localhost:3000`
   - `https://www.covrsales.care`

## Architecture

```
┌─────────────────┐     ┌─────────────┐     ┌─────────────────┐
│   Next.js App   │────▶│   BigQuery  │────▶│   ClickUp       │
│   (React/TS)    │     │             │     │   (Corporations)│
└─────────────────┘     └─────────────┘     └─────────────────┘
         │                       │
         ▼                       ▼
   Google OAuth           HubSpot
   (SSO)                 (Facilities)
```

## License

Internal use only - Cover Healthcare Solutions
