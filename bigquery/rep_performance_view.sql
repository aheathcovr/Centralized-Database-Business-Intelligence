-- Rep Performance View
-- Created: 2026-03-30
-- Dataset: revops_analytics.rep_performance_view
-- Source: HubSpot_Airbyte.deals, HubSpot_Airbyte.owners
--
-- Aggregates deal outcomes by owner and month so the dashboard
-- Rep Performance page can show live data instead of sample data.
--
-- Metrics per rep per month:
--   - deals_won, deals_lost, pipeline_entered, pipeline_won
--   - win_rate_pct, avg_deal_size, activity_proxy
--
-- Usage:
--   SELECT * FROM revops_analytics.rep_performance_view
--   WHERE month_start >= '2025-01-01'

CREATE OR REPLACE VIEW `gen-lang-client-0844868008.revops_analytics.rep_performance_view` AS

WITH

-- ============================================================
-- SECTION 1: Deal Owner Lookup
-- ============================================================
-- Pull distinct owner_id values from deals and join to HubSpot
-- owner metadata for display names.

deal_owners AS (
  SELECT
    d.id AS deal_id,
    d.properties_hubspot_owner_id AS owner_id,
    COALESCE(o.email, CONCAT('owner_', CAST(d.properties_hubspot_owner_id AS STRING))) AS owner_email,
    COALESCE(
      o.firstName,
      REGEXP_EXTRACT(o.email, r'^([^@]+)')
    ) AS owner_first_name,
    COALESCE(o.lastName, '') AS owner_last_name,
    CONCAT(
      COALESCE(o.firstName, REGEXP_EXTRACT(o.email, r'^([^@]+)')),
      ' ',
      COALESCE(o.lastName, '')
    ) AS owner_full_name,
    SAFE_CAST(d.properties_amount AS FLOAT64) AS amount,
    d.properties_dealstage AS dealstage,
    SAFE_CAST(d.properties_createdate AS TIMESTAMP) AS createdate,
    SAFE_CAST(d.properties_closedate AS TIMESTAMP) AS closedate,
    d.properties_pipeline AS pipeline
  FROM `gen-lang-client-0844868008.HubSpot_Airbyte.deals` d
  LEFT JOIN `gen-lang-client-0844868008.HubSpot_Airbyte.owners` o
    ON SAFE_CAST(d.properties_hubspot_owner_id AS STRING) = SAFE_CAST(o.id AS STRING)
  WHERE d.properties_hubspot_owner_id IS NOT NULL
    AND d.archived = FALSE
),

-- ============================================================
-- SECTION 2: Month Calendar
-- ============================================================
-- One row per month from Jan 2024 through current month.

month_calendar AS (
  SELECT
    month_start,
    LAST_DAY(month_start, MONTH) AS month_end,
    FORMAT_DATE('%b-%y', month_start) AS month_label
  FROM UNNEST(
    GENERATE_DATE_ARRAY(
      DATE(2024, 1, 1),
      DATE_TRUNC(CURRENT_DATE(), MONTH),
      INTERVAL 1 MONTH
    )
  ) AS month_start
),

-- ============================================================
-- SECTION 3: Deals Won per Rep per Month
-- ============================================================
-- Count deals that closed won in each month, grouped by owner.

deals_won AS (
  SELECT
    mc.month_start,
    mc.month_label,
    do.owner_id,
    do.owner_full_name,
    COUNT(*) AS deals_won,
    SUM(COALESCE(do.amount, 0)) AS pipeline_won_amount,
    AVG(COALESCE(do.amount, 0)) AS avg_deal_size
  FROM deal_owners do
  JOIN month_calendar mc
    ON DATE(DATE_TRUNC(do.closedate, MONTH)) = mc.month_start
  WHERE do.dealstage = 'closedwon'
    AND do.closedate IS NOT NULL
  GROUP BY mc.month_start, mc.month_label, do.owner_id, do.owner_full_name
),

-- ============================================================
-- SECTION 4: Deals Lost per Rep per Month
-- ============================================================

deals_lost AS (
  SELECT
    mc.month_start,
    do.owner_id,
    COUNT(*) AS deals_lost
  FROM deal_owners do
  JOIN month_calendar mc
    ON DATE(DATE_TRUNC(do.closedate, MONTH)) = mc.month_start
  WHERE do.dealstage = 'closedlost'
    AND do.closedate IS NOT NULL
  GROUP BY mc.month_start, do.owner_id
),

-- ============================================================
-- SECTION 5: Pipeline Entered per Rep per Month
-- ============================================================
-- Deals created in each month (proxy for rep activity).

pipeline_entered AS (
  SELECT
    mc.month_start,
    do.owner_id,
    COUNT(*) AS deals_entered,
    SUM(COALESCE(do.amount, 0)) AS pipeline_entered_amount
  FROM deal_owners do
  JOIN month_calendar mc
    ON DATE(DATE_TRUNC(do.createdate, MONTH)) = mc.month_start
  WHERE do.createdate IS NOT NULL
  GROUP BY mc.month_start, do.owner_id
),

-- ============================================================
-- SECTION 6: Combined per Rep per Month
-- ============================================================

combined AS (
  SELECT
    COALESCE(w.month_start, l.month_start, p.month_start) AS month_start,
    COALESCE(w.month_label, '') AS month_label,
    COALESCE(w.owner_id, l.owner_id, p.owner_id) AS owner_id,
    COALESCE(w.owner_full_name, '') AS owner_full_name,
    COALESCE(w.deals_won, 0) AS deals_won,
    COALESCE(l.deals_lost, 0) AS deals_lost,
    COALESCE(p.deals_entered, 0) AS deals_entered,
    COALESCE(w.pipeline_won_amount, 0) AS pipeline_won_amount,
    COALESCE(p.pipeline_entered_amount, 0) AS pipeline_entered_amount,
    COALESCE(w.avg_deal_size, 0) AS avg_deal_size
  FROM deals_won w
  FULL OUTER JOIN deals_lost l
    ON w.month_start = l.month_start AND w.owner_id = l.owner_id
  FULL OUTER JOIN pipeline_entered p
    ON COALESCE(w.month_start, l.month_start) = p.month_start
    AND COALESCE(w.owner_id, l.owner_id) = p.owner_id
),

-- ============================================================
-- SECTION 7: Final Output with Calculated Metrics
-- ============================================================

final_output AS (
  SELECT
    c.month_start,
    c.month_label,
    c.owner_id,
    c.owner_full_name,
    c.deals_won,
    c.deals_lost,
    c.deals_entered,
    c.pipeline_won_amount,
    c.pipeline_entered_amount,
    c.avg_deal_size,
    -- Win rate: won / (won + lost)
    SAFE_DIVIDE(
      c.deals_won,
      c.deals_won + c.deals_lost
    ) AS win_rate_pct,
    -- Close rate: won / entered pipeline
    SAFE_DIVIDE(
      c.deals_won,
      c.deals_entered
    ) AS close_rate_pct,
    CURRENT_TIMESTAMP() AS _loaded_at
  FROM combined c
  WHERE c.owner_id IS NOT NULL
)

SELECT * FROM final_output
ORDER BY month_start DESC, deals_won DESC;
