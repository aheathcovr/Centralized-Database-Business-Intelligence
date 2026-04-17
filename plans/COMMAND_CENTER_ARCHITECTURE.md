# Command Center Architecture Plan

## Overview

The Command Center is a unified Revenue Operations dashboard that consolidates 23 fragmented, isolated views into a single cohesive interface. This architecture plan maps existing BigQuery views and React components to the new Command Center sections, defines data contracts, and specifies the SQL, API, and React changes required.

**Target Project:** `gen-lang-client-0844868008.revops_analytics`
**Dashboard Location:** `dashboard/`

---

## Phase 1: SQL View Creation

### 1.1 New SQL Views Required

| View Name | Purpose | Source Tables |
|-----------|---------|---------------|
| `executive_pulse_view` | Global header KPI metrics | `HubSpot_Airbyte.deals`, `HubSpot_Airbyte.owners` |
| `rep_matrix_view` | Rep Matrix grid with historical metrics | `HubSpot_Airbyte.deals`, `HubSpot_Airbyte.owners` |
| `funnel_economics_view` | Facility/Corporate toggle economics | `HubSpot_Airbyte.deals` |
| `activity_matrix_view` | Rep engagement activity counts | `HubSpot_Airbyte.engagements_calls`, `engagements_emails`, `engagements_meetings`, `engagements_notes` |
| `pipeline_shed_view` | Lost pipeline ARR & deal counts | `HubSpot_Airbyte.deals`, `deals_property_history` |
| `account_penetration_view` | Deals won by parent company (last 6mo) | `HubSpot_Airbyte.deals`, `ClickUp_AirbyteCustom.task` |

### 1.2 Existing Views and Their Command Center Mapping

| Existing View | Target Section | Usage |
|--------------|----------------|-------|
| `corp_penetration_view` | Section 5: AccountPenetrationChart | Account penetration stacked bar |
| `in_month_conversion` | Section 4: EconomicsTabs | Funnel economics data |
| `rep_performance_view` | Section 2: RepMatrixGrid | Historical rep metrics |
| `pipeline_generation_view` | Section 3: PipelineGenerationChart | Pipeline ARR by period |
| `pipeline_metrics_view` | Section 2: RepMatrixGrid (ASP, days to close) | Derived metrics |
| `intercom_weekly_support_metrics` | (retained, not Command Center primary) | Support metrics |
| `csat_by_domain` | (retained) | CSAT breakdown |
| `csat_monthly_quarterly` | (retained) | Periodic CSAT |
| `nps_monthly_quarterly` | (retained) | Periodic NPS |

---

## Phase 2: Data Contracts

### 2.1 Executive Pulse (Global Header)

**Data Source:** `executive_pulse_view`

```sql
-- View: revops_analytics.executive_pulse_view
-- Output Schema:
owner_id: STRING
owner_full_name: STRING
global_asp_ytd: FLOAT64    -- AVG(amount) of won deals YTD
won_revenue_this_week: FLOAT64   -- SUM(amount) closed won this week
won_deals_this_week: INT64       -- COUNT of deals closed won this week
opps_created_this_week: INT64    -- COUNT of deals created this week
_loaded_at: TIMESTAMP
```

**SQL Logic:**
```sql
SUM(amount) FILTER (WHERE is_closed_won AND closedate >= Jan 1 of current year)
SUM(amount) FILTER (WHERE is_closed_won AND closedate >= DATE_TRUNC(CURRENT_DATE, WEEK))
COUNT(*) FILTER (WHERE is_closed_won AND closedate >= DATE_TRUNC(CURRENT_DATE, WEEK))
COUNT(*) FILTER (WHERE createdate >= DATE_TRUNC(CURRENT_DATE, WEEK))
```

---

### 2.2 Rep Matrix Grid

**Data Source:** `rep_matrix_view`

```sql
-- View: revops_analytics.rep_matrix_view
-- Output Schema:
owner_id: STRING
owner_full_name: STRING
total_revenue_365d: FLOAT64      -- SUM(amount) won in past 365 days
ytd_asp: FLOAT64                 -- AVG(amount) won in current calendar year
avg_days_to_close: FLOAT64       -- AVG(DATE_DIFF(closedate, createdate, DAY)) for won deals
win_rate_create_date: FLOAT64    -- Won count / (Won + Lost) using createdate month
win_rate_close_date: FLOAT64     -- Won count / (Won + Lost) using closedate month
deals_won_365d: INT64
deals_lost_365d: INT64
deals_entered_365d: INT64
_loaded_at: TIMESTAMP
```

**SQL Logic:**
```sql
-- Total Revenue (Past 365 days)
SUM(amount) FILTER (WHERE is_closed_won AND closedate >= DATE_SUB(CURRENT_DATE, INTERVAL 365 DAY))

-- YTD ASP
AVG(amount) FILTER (WHERE is_closed_won AND EXTRACT(YEAR FROM closedate) = EXTRACT(YEAR FROM CURRENT_DATE))

-- Avg Days to Close (won deals only)
AVG(DATE_DIFF(DATE(closedate), DATE(createdate), DAY)) FILTER (WHERE is_closed_won AND closedate IS NOT NULL)

-- Win Rate (Create Date) - partitions by creation month
SAFE_DIVIDE(
  COUNTIF(is_closed_won),
  COUNTIF(dealstage IN ('closedwon', 'closedlost'))
) * 100

-- Win Rate (Close Date) - partitions by close month
SAFE_DIVIDE(
  COUNTIF(is_closed_won AND closedate >= DATE_TRUNC(CURRENT_DATE, MONTH)),
  COUNTIF(dealstage IN ('closedwon', 'closedlost') AND closedate >= DATE_TRUNC(CURRENT_DATE, MONTH))
) * 100
```

---

### 2.3 Pipeline Generation Chart

**Data Source:** `pipeline_generation_view` (existing, enhanced)

```sql
-- Reuses: revops_analytics.pipeline_generation_view
-- Output Schema (enhanced):
period_start: DATE
period_label: STRING
total_arr: FLOAT64              -- SUM(pipeline_amount) all reps
outbound_arr: FLOAT64           -- SUM where lead_source = 'Outbound' (placeholder)
opps_count: INT64               -- COUNT(deals_created)
period_type: STRING             -- 'monthly' or 'quarterly'
_loaded_at: TIMESTAMP
```

**Note:** `outbound_arr` requires `properties_hubspot_deal_source` or equivalent field. Current views use `properties_pipeline` for grouping. Investigate HubSpot deal source property before implementation.

---

### 2.4 Lead Velocity Cards

**Data Source:** `lead_velocity_view`

```sql
-- View: revops_analytics.lead_velocity_view
-- Output Schema:
period_start: DATE
period_label: STRING
total_leads: INT64              -- COUNT of deals created
conversion_rate: FLOAT64        -- Won deals / Total leads created in period
time_to_first_touch_hours: FLOAT64  -- AVG hours from deal create to first engagement
_loaded_at: TIMESTAMP
```

**Implementation:** Uses `HubSpot_Airbyte.deals` for lead counts and `engagements_emails`/`engagements_calls` for first touch calculation.

**SQL Logic:**
```sql
-- First touch: MIN of earliest email/call engagement after deal creation
SELECT
  mc.month_start,
  mc.month_label,
  COUNT(DISTINCT d.id) AS total_leads,
  SAFE_DIVIDE(
    COUNTIF(d.is_closed_won),
    COUNT(DISTINCT d.id)
  ) * 100 AS conversion_rate,
  AVG(TIMESTAMP_DIFF(
    first_engagement.first_engagement_ts,
    d.createdate,
    HOUR
  )) AS time_to_first_touch_hours
FROM month_calendar mc
JOIN `HubSpot_Airbyte.deals` d ON DATE(d.createdate) = mc.month_start
LEFT JOIN (
  SELECT deal_id, MIN(created_at) AS first_engagement_ts
  FROM (
    SELECT id, owner_id, created_at FROM `HubSpot_Airbyte.engagements_emails`
    UNION ALL
    SELECT id, owner_id, created_at FROM `HubSpot_Airbyte.engagements_calls`
  ) eng
  JOIN `HubSpot_Airbyte.deals` d2 ON eng.owner_id = d2.properties_hubspot_owner_id
  WHERE eng.created_at > d2.createdate
  GROUP BY deal_id
) first_engagement ON d.id = first_engagement.deal_id
WHERE mc.month_start >= DATE_SUB(CURRENT_DATE, INTERVAL 12 MONTH)
GROUP BY mc.month_start, mc.month_label
```

**Status:** `[READY]` - Engagement tables available for first touch calculation

---

### 2.5 Funnel Economics (EconomicsTabs)

**Data Source:** `funnel_economics_view`

```sql
-- View: revops_analytics.funnel_economics_view
-- Output Schema:
period_start: DATE
period_label: STRING
group_mode: STRING              -- 'facility' or 'corporate'
lead_source: STRING             -- GROUP BY lead_source (if available)
deal_count: INT64                -- COUNT(deals)
win_rate_pct: FLOAT64           -- SAFE_DIVIDE(won_count, closed_count) * 100
avg_amount: FLOAT64             -- AVG(amount)
total_arr: FLOAT64              -- SUM(amount)
period_type: STRING              -- 'monthly' or 'quarterly'
_loaded_at: TIMESTAMP
```

**SQL Logic:**
```sql
-- Group by lead_source
SELECT
  lead_source,
  COUNT(*) AS deal_count,
  SAFE_DIVIDE(COUNTIF(is_closed_won), COUNTIF(is_closed)) * 100 AS win_rate_pct,
  AVG(amount) AS avg_amount,
  SUM(amount) AS total_arr
FROM deal_data
WHERE closedate BETWEEN @start_date AND @end_date
GROUP BY lead_source
```

**Gap:** `lead_source` property (`properties_hubspot_deal_source`) not confirmed in current schema. Implementation should check `HubSpot_Airbyte.deals` for `properties_hubspot_deal_source` or `properties_deals_next_action_date` as proxy. If unavailable, use `pipeline` as fallback grouping dimension.

---

### 2.6 Activity Matrix

**Data Source:** `activity_matrix_view`

```sql
-- View: revops_analytics.activity_matrix_view
-- Output Schema:
owner_id: STRING
owner_full_name: STRING
period_start: DATE
period_label: STRING
calls_count: INT64              -- COUNT from engagements_calls table
emails_count: INT64             -- COUNT from engagements_emails table
meetings_count: INT64           -- COUNT from engagements_meetings table
prospecting_count: INT64       -- COUNT of prospecting activities (notes with specific tags)
total_activities: INT64        -- SUM of all activity types
_loaded_at: TIMESTAMP
```

**Implementation:** Use `HubSpot_Airbyte.engagements_calls`, `engagements_emails`, `engagements_meetings`, `engagements_notes`

**SQL Logic:**
```sql
SELECT
  o.owner_id,
  o.owner_full_name,
  mc.month_start AS period_start,
  mc.month_label AS period_label,
  COUNT(DISTINCT ec.id) AS calls_count,
  COUNT(DISTINCT ee.id) AS emails_count,
  COUNT(DISTINCT em.id) AS meetings_count,
  COUNT(DISTINCT en.id) AS prospecting_count,
  (COUNT(DISTINCT ec.id) + COUNT(DISTINCT ee.id) + COUNT(DISTINCT em.id) + COUNT(DISTINCT en.id)) AS total_activities
FROM month_calendar mc
CROSS JOIN owners o
LEFT JOIN `HubSpot_Airbyte.engagements_calls` ec ON ec.owner_id = o.owner_id AND DATE(ec.created_at) BETWEEN mc.month_start AND mc.month_end
LEFT JOIN `HubSpot_Airbyte.engagements_emails` ee ON ee.owner_id = o.owner_id AND DATE(ee.created_at) BETWEEN mc.month_start AND mc.month_end
LEFT JOIN `HubSpot_Airbyte.engagements_meetings` em ON em.owner_id = o.owner_id AND DATE(em.created_at) BETWEEN mc.month_start AND mc.month_end
LEFT JOIN `HubSpot_Airbyte.engagements_notes` en ON en.owner_id = o.owner_id AND DATE(en.created_at) BETWEEN mc.month_start AND mc.month_end
WHERE mc.month_start >= DATE_SUB(CURRENT_DATE, INTERVAL 12 MONTH)
GROUP BY o.owner_id, o.owner_full_name, mc.month_start, mc.month_label
```

**Status:** `[READY]` - Engagement tables available: `engagements_calls`, `engagements_emails`, `engagements_meetings`, `engagements_notes` (confirmed from BigQuery schema)

---

### 2.7 Pipeline Shed

**Data Source:** `pipeline_shed_view`

```sql
-- View: revops_analytics.pipeline_shed_view
-- Output Schema:
period_type: STRING             -- 'last_week', 'mtd', 'qtd'
lost_arr: FLOAT64               -- SUM(amount) of deals closed lost
lost_deal_count: INT64          -- COUNT of deals closed lost
_loaded_at: TIMESTAMP
```

**SQL Logic:**
```sql
-- Last Week
SUM(amount) FILTER (WHERE is_closed AND NOT is_closed_won AND closedate >= DATE_SUB(CURRENT_DATE, INTERVAL 7 DAY))

-- MTD
SUM(amount) FILTER (WHERE is_closed AND NOT is_closed_won AND closedate >= DATE_TRUNC(CURRENT_DATE, MONTH))

-- QTD
SUM(amount) FILTER (WHERE is_closed AND NOT is_closed_won AND closedate >= DATE_TRUNC(CURRENT_DATE, QUARTER))
```

**Alternative Logic (using `closed_lost_reason`):**
```sql
-- Deals where closed_lost_reason is not null
SUM(amount) FILTER (WHERE closed_lost_reason IS NOT NULL AND closedate >= DATE_SUB(CURRENT_DATE, INTERVAL 7 DAY))
```

---

### 2.8 Account Penetration Chart

**Data Source:** `account_penetration_view` (new) + `corp_penetration_view` (existing)

```sql
-- View: revops_analytics.account_penetration_view
-- Output Schema:
month_start: DATE
month_label: STRING
parent_company_name: STRING
deals_won_count: INT64          -- COUNT of won deals for this parent
deals_won_arr: FLOAT64         -- SUM(amount) of won deals
_loaded_at: TIMESTAMP
```

**SQL Logic:**
```sql
-- Join deals to ClickUp corporations via hubspot_company_id or facility relationship
-- Group by parent company name and month
SELECT
  mc.month_start,
  mc.month_label,
  corp.corporation_name AS parent_company_name,
  COUNT(*) AS deals_won_count,
  SUM(d.amount) AS deals_won_arr
FROM month_calendar mc
JOIN `HubSpot_Airbyte.deals` d ON DATE(d.properties_closedate) BETWEEN mc.month_start AND mc.month_end
LEFT JOIN `corp_penetration_view` corp ON d.properties_hubspot_company_id = corp.hubspot_company_id
WHERE LOWER(d.properties_dealstage) = 'closedwon'
  AND mc.month_start >= DATE_SUB(CURRENT_DATE, INTERVAL 6 MONTH)
GROUP BY mc.month_start, mc.month_label, corp.corporation_name
```

---

## Phase 3: React Component Architecture

### 3.1 Component Hierarchy

```
CommandCenter/
├── CommandCenter.tsx              # Main orchestrator page
├── CommandCenterHeader.tsx        # Global header with Executive Pulse
├── sections/
│   ├── ExecutivePulse.tsx         # Unified banner (replaces KPI cards)
│   ├── RepMatrixGrid.tsx          # Team Performance grid
│   ├── PipelineGenerationSection.tsx
│   │   ├── PipelineGenerationChart.tsx    # Dual-axis chart
│   │   └── LeadVelocityCards.tsx          # Totals, conversion, time to touch
│   ├── FunnelEconomicsSection.tsx
│   │   └── EconomicsTabs.tsx              # Facility/Corporate toggle
│   ├── ActivityPipelineSection.tsx
│   │   ├── ActivityMatrix.tsx              # Rep x activity type grid
│   │   ├── PipelineShed.tsx               # Lost pipeline KPI row
│   │   └── AccountPenetrationChart.tsx    # Stacked bar
└── shared/
    ├── GlobalDatePicker.tsx       # Shared @start_date, @end_date
    ├── RepFilter.tsx              # Shared @owner_id filter
    └── KpiCard.tsx                # Standardized card component
```

### 3.2 Props Interface by Section

```typescript
// Section 1: Executive Pulse
interface ExecutivePulseProps {
  global_asp_ytd: number;
  won_revenue_this_week: number;
  won_deals_this_week: number;
  opps_created_this_week: number;
}

// Section 2: Rep Matrix Grid
interface RepMatrixGridProps {
  reps: RepRow[];
  sortColumn: SortableColumn;
  sortDirection: 'asc' | 'desc';
  onSort: (col: SortableColumn) => void;
}

interface RepRow {
  owner_id: string;
  owner_full_name: string;
  total_revenue_365d: number;
  ytd_asp: number;
  avg_days_to_close: number;
  win_rate_create_date: number;
  win_rate_close_date: number;
}

// Section 3: Pipeline Generation Chart
interface PipelineGenerationChartProps {
  data: PeriodData[];
  periodType: 'monthly' | 'quarterly';
}

interface PeriodData {
  period_label: string;
  total_arr: number;
  outbound_arr: number;
  opps_count: number;
}

// Section 4: Funnel Economics
interface FunnelEconomicsProps {
  data: FunnelRow[];
  groupMode: 'facility' | 'corporate';
  onGroupModeChange: (mode: 'facility' | 'corporate') => void;
}

interface FunnelRow {
  lead_source: string;
  deal_count: number;
  win_rate_pct: number;
  avg_amount: number;
}

// Section 5: Activity Matrix
interface ActivityMatrixProps {
  reps: ActivityRepRow[];
}

interface ActivityRepRow {
  owner_id: string;
  owner_full_name: string;
  calls_count: number;
  emails_count: number;
  meetings_count: number;
  prospecting_count: number;
}
```

### 3.3 Existing Component Mapping

| Existing Component | Target in Command Center | Notes |
|-------------------|-------------------------|-------|
| `Dashboard.tsx` | `Dashboard.tsx` (pipeline-overview page) | Retained as `/pipeline-overview` |
| `DashboardHeader.tsx` | `CommandCenterHeader.tsx` | Refactored for unified header |
| `KpiCard.tsx` | `shared/KpiCard.tsx` | Standardized |
| `PipelineGenerationDashboard.tsx` | `PipelineGenerationSection.tsx` | Refactored |
| `PipelineManagementDashboard.tsx` | `PipelineShed.tsx` | Extracted metrics |
| `WalletshareDashboard.tsx` | Merged into `AccountPenetrationChart` | Consolidated |
| `CustomerSuccessDashboard.tsx` | Retained as `/customer-success` page | Standalone |
| `SupportMetricsDashboard.tsx` | Retained as `/support-metrics` page | Standalone |
| `InMonthConversion.tsx` | `FunnelEconomicsSection.tsx` | Refactored |
| `FilterBar.tsx` | `GlobalDatePicker.tsx`, `RepFilter.tsx` | Extracted shared |
| `TimelineSelector.tsx` | `GlobalDatePicker.tsx` | Consolidate timeline |

---

## Phase 4: API Route Changes

### 4.1 New API Routes Required

| Route | Method | Purpose | Parameters |
|-------|--------|---------|------------|
| `/api/command-center/executive-pulse` | GET | Executive Pulse data | `@start_date`, `@end_date` |
| `/api/command-center/rep-matrix` | GET | Rep Matrix grid data | `@start_date`, `@end_date`, `@owner_id` |
| `/api/command-center/pipeline-generation` | GET | Pipeline generation chart data | `@start_date`, `@end_date`, `@period_type` |
| `/api/command-center/lead-velocity` | GET | Lead velocity cards | `@start_date`, `@end_date` |
| `/api/command-center/funnel-economics` | GET | Funnel economics by lead source | `@start_date`, `@end_date`, `@group_mode` |
| `/api/command-center/activity-matrix` | GET | Rep activity counts | `@start_date`, `@end_date`, `@owner_id` |
| `/api/command-center/pipeline-shed` | GET | Pipeline shed metrics | `@period` (last_week, mtd, qtd) |
| `/api/command-center/account-penetration` | GET | Account penetration chart | `@start_date`, `@end_date` |

### 4.2 Existing API Routes to Retain

| Route | Notes |
|-------|-------|
| `/api/corporations` | Used by Dashboard.tsx (pipeline-overview) |
| `/api/in-month-conversion` | Used by InMonthConversion.tsx |
| `/api/rep-performance` | Used by rep-performance page |
| `/api/pipeline-generation` | Used by PipelineGenerationDashboard.tsx |
| `/api/pipeline-metrics` | Used by PipelineManagementDashboard.tsx |
| `/api/customer-success` | Used by CustomerSuccessDashboard.tsx |
| `/api/support-metrics` | Used by SupportMetricsDashboard.tsx |
| `/api/walletshare` | Used by WalletshareDashboard.tsx |

### 4.3 API Route Pattern

All new Command Center routes follow this pattern:

```typescript
// Example: /api/command-center/executive-pulse/route.ts
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const startDate = searchParams.get('start_date') ?? '2024-01-01';
  const endDate = searchParams.get('end_date') ?? CURRENT_DATE();
  
  const data = await getExecutivePulse({ startDate, endDate });
  
  return NextResponse.json({ data }, {
    headers: { 'Cache-Control': 'private, max-age=300, stale-while-revalidate=900' }
  });
}
```

---

## Phase 5: Caching Strategy

### 5.1 View-Level Caching

BigQuery views are materialized on query execution. No explicit caching at the view level.

### 5.2 API Route Caching

```typescript
// Cache-Control headers for each route type
const CACHE_PROFILES = {
  // Real-time metrics - short cache
  executive_pulse: 'private, max-age=300, stale-while-revalidate=600',
  
  // Aggregated historical - longer cache
  rep_matrix: 'private, max-age=900, stale-while-revalidate=3600',
  
  // Slow-changing reference data - longest cache
  funnel_economics: 'public, max-age=1800, stale-while-revalidate=7200',
};
```

### 5.3 Client-Side Caching (React Query / SWR)

```typescript
// hooks/useCommandCenterData.ts
const { data, isLoading } = useQuery({
  queryKey: ['command-center', section, filters],
  queryFn: () => fetch(`/api/command-center/${section}?${params}`),
  staleTime: 15 * 60 * 1000,     // 15 minutes
  gcTime: 30 * 60 * 1000,        // 30 minutes (formerly cacheTime)
  refetchOnWindowFocus: false,
  retry: 2,
});
```

### 5.4 Global Filters (Date Picker, Rep Filter)

```typescript
interface GlobalFilters {
  start_date: string;   // @start_date parameter
  end_date: string;     // @end_date parameter
  owner_id?: string;    // @owner_id parameter (optional filter)
  period_type?: 'monthly' | 'quarterly';
}

// Shared via React Context
<CommandCenterFiltersContext.Provider value={filters}>
  {children}
</CommandCenterFiltersContext.Provider>
```

---

## Phase 6: Gaps and Future Work

### 6.1 Critical Gaps

| Gap | Impact | Resolution |
|-----|--------|------------|
| `lead_source` not confirmed in deals schema | EconomicsTabs cannot group by lead source | Use `pipeline` as fallback grouping dimension; verify `properties_hubspot_deal_source` availability |
| `closed_lost_reason` property not confirmed | PipelineShed uses closedate-based logic | Confirm property availability; add property-based filter if available |

### 6.2 Future Enhancements

| Item | Description | Priority |
|------|-------------|----------|
| Real-time Deal Updates | WebSocket or polling for live pipeline changes | Medium |
| Quota vs Attainment | Rep quota targets vs actual performance | Medium |
| Forecast Accuracy | Predicted vs actual deal outcomes | Low |
| Territory Analysis | Geographic grouping of accounts | Low |

---

## Phase 7: Implementation Order

### Week 1-2: Foundation
- [ ] Create `executive_pulse_view.sql`
- [ ] Create `/api/command-center/executive-pulse/route.ts`
- [ ] Create `ExecutivePulse.tsx` component
- [ ] Create `GlobalDatePicker.tsx`, `RepFilter.tsx` shared components
- [ ] Verify `lead_source` availability in `HubSpot_Airbyte.deals`

### Week 3-4: Rep Matrix & Pipeline
- [ ] Create `rep_matrix_view.sql`
- [ ] Create `/api/command-center/rep-matrix/route.ts`
- [ ] Create `RepMatrixGrid.tsx` component
- [ ] Enhance `pipeline_generation_view.sql` with `outbound_arr` if lead_source available
- [ ] Create `PipelineGenerationChart.tsx` (dual-axis)

### Week 5-6: Funnel & Activity
- [ ] Create `funnel_economics_view.sql` (with pipeline fallback if lead_source unavailable)
- [ ] Create `/api/command-center/funnel-economics/route.ts`
- [ ] Create `EconomicsTabs.tsx` with Facility/Corporate toggle
- [ ] Create `pipeline_shed_view.sql` and `PipelineShed.tsx`
- [ ] Create `activity_matrix_view.sql` (placeholder until engagements available)

### Week 7-8: Consolidation & Polish
- [ ] Create `account_penetration_view.sql`
- [ ] Create `AccountPenetrationChart.tsx`
- [ ] Create `CommandCenter.tsx` orchestrator page
- [ ] Create `CommandCenterHeader.tsx`
- [ ] Wire all sections with GlobalDatePicker and RepFilter
- [ ] Performance testing and optimization

### Week 9+: Deprecation & Cleanup
- [ ] Archive/move old standalone pages to `app/(legacy)/` route group
- [ ] Update `lib/bigquery.ts` to include new view accessors
- [ ] Update `QUICKSTART.md` documentation
- [ ] Deprecate unused API routes

---

## Summary

### Files to Create (SQL)

1. `bigquery/executive_pulse_view.sql`
2. `bigquery/rep_matrix_view.sql`
3. `bigquery/funnel_economics_view.sql`
4. `bigquery/lead_velocity_view.sql`
5. `bigquery/activity_matrix_view.sql`
6. `bigquery/pipeline_shed_view.sql`
7. `bigquery/account_penetration_view.sql`

### Files to Create (React)

1. `dashboard/app/(dashboard)/command-center/page.tsx`
2. `dashboard/components/command-center/CommandCenter.tsx`
3. `dashboard/components/command-center/CommandCenterHeader.tsx`
4. `dashboard/components/command-center/ExecutivePulse.tsx`
5. `dashboard/components/command-center/RepMatrixGrid.tsx`
6. `dashboard/components/command-center/PipelineGenerationSection.tsx`
7. `dashboard/components/command-center/PipelineGenerationChart.tsx`
8. `dashboard/components/command-center/LeadVelocityCards.tsx`
9. `dashboard/components/command-center/FunnelEconomicsSection.tsx`
10. `dashboard/components/command-center/EconomicsTabs.tsx`
11. `dashboard/components/command-center/ActivityMatrix.tsx`
12. `dashboard/components/command-center/PipelineShed.tsx`
13. `dashboard/components/command-center/AccountPenetrationChart.tsx`
14. `dashboard/components/shared/GlobalDatePicker.tsx`
15. `dashboard/components/shared/RepFilter.tsx`

### API Routes to Create

1. `dashboard/app/api/command-center/executive-pulse/route.ts`
2. `dashboard/app/api/command-center/rep-matrix/route.ts`
3. `dashboard/app/api/command-center/pipeline-generation/route.ts`
4. `dashboard/app/api/command-center/lead-velocity/route.ts`
5. `dashboard/app/api/command-center/funnel-economics/route.ts`
6. `dashboard/app/api/command-center/activity-matrix/route.ts`
7. `dashboard/app/api/command-center/pipeline-shed/route.ts`
8. `dashboard/app/api/command-center/account-penetration/route.ts`

### Existing Files to Modify

1. `dashboard/lib/bigquery.ts` - Add new view accessors
2. `dashboard/lib/hooks.ts` - Add `useCommandCenterData` hook
3. `dashboard/app/(dashboard)/layout.tsx` - Add CommandCenter route