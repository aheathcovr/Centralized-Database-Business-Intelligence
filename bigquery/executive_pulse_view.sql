-- ============================================================
-- Executive Pulse View
-- Dataset: revops_analytics.executive_pulse_view
-- Source: HubSpot_Airbyte.deals, HubSpot_Airbyte.owners
--
-- Provides global KPI metrics for the Command Center header:
--   - global_asp_ytd: Average deal size for won deals YTD
--   - won_revenue_this_week: Total ARR closed won this week
--   - won_deals_this_week: Count of deals closed won this week
--   - opps_created_this_week: Count of opportunities created this week
--
-- Usage:
--   SELECT * FROM revops_analytics.executive_pulse_view
--   WHERE owner_id = '12345'  -- Filter to specific rep
-- ============================================================

CREATE OR REPLACE VIEW `gen-lang-client-0844868008.revops_analytics.executive_pulse_view` AS

WITH

-- ============================================================
-- SECTION 1: Deal Data with Owner Info
-- ============================================================
-- Pulls all deals with owner metadata for KPI calculations.

deal_data AS (
  SELECT
    d.id AS deal_id,
    d.properties_hubspot_owner_id AS owner_id,
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
    SAFE_CAST(d.properties_hs_arr AS FLOAT64) AS arr,
    LOWER(d.properties_dealstage) AS dealstage,
    COALESCE(d.properties_hs_is_closed_won, FALSE) AS is_closed_won,
    COALESCE(d.properties_hs_is_closed, FALSE) AS is_closed,
    SAFE_CAST(d.properties_createdate AS TIMESTAMP) AS createdate,
    SAFE_CAST(d.properties_closedate AS TIMESTAMP) AS closedate
  FROM `gen-lang-client-0844868008.HubSpot_Airbyte.deals` d
  LEFT JOIN `gen-lang-client-0844868008.HubSpot_Airbyte.owners` o
    ON SAFE_CAST(d.properties_hubspot_owner_id AS STRING) = SAFE_CAST(o.id AS STRING)
  WHERE d.archived = FALSE
),

-- ============================================================
-- SECTION 2: Week Calendar for Period Calculations
-- ============================================================
-- Generates week boundaries for "this week" calculations.

week_calendar AS (
  SELECT
    DATE_TRUNC(CURRENT_DATE(), WEEK) AS week_start,
    DATE_TRUNC(CURRENT_DATE(), YEAR) AS year_start,
    DATE_SUB(DATE_TRUNC(CURRENT_DATE(), WEEK), INTERVAL 1 WEEK) AS last_week_start
  FROM deal_data
  LIMIT 1
),

-- ============================================================
-- SECTION 3: YTD ASP Calculation
-- ============================================================
-- Average selling price for won deals in current calendar year.

ytd_asp_calc AS (
  SELECT
    COALESCE(wc.year_start, DATE_TRUNC(CURRENT_DATE(), YEAR)) AS ytd_start,
    AVG(COALESCE(d.amount, d.arr, 0)) AS global_asp_ytd,
    SUM(COALESCE(d.amount, d.arr, 0)) FILTER (WHERE d.is_closed_won AND DATE(d.closedate) >= DATE_TRUNC(CURRENT_DATE(), YEAR))) AS total_won_arr_ytd,
    COUNT(*) FILTER (WHERE d.is_closed_won AND DATE(d.closedate) >= DATE_TRUNC(CURRENT_DATE(), YEAR)) AS won_deals_ytd
  FROM deal_data d
  CROSS JOIN week_calendar wc
  WHERE d.is_closed_won = TRUE
    AND d.closedate IS NOT NULL
    AND DATE(d.closedate) >= wc.year_start
  GROUP BY wc.year_start
),

-- ============================================================
-- SECTION 4: This Week Metrics
-- ============================================================
-- Deals won and created in current week.

this_week_metrics AS (
  SELECT
    SUM(COALESCE(d.amount, d.arr, 0)) FILTER (
      WHERE d.is_closed_won = TRUE
        AND d.closedate IS NOT NULL
        AND DATE(d.closedate) >= wc.week_start
    ) AS won_revenue_this_week,
    COUNT(*) FILTER (
      WHERE d.is_closed_won = TRUE
        AND d.closedate IS NOT NULL
        AND DATE(d.closedate) >= wc.week_start
    ) AS won_deals_this_week,
    COUNT(*) FILTER (
      WHERE DATE(d.createdate) >= wc.week_start
    ) AS opps_created_this_week
  FROM deal_data d
  CROSS JOIN week_calendar wc
  GROUP BY wc.week_start
),

-- ============================================================
-- SECTION 5: Combine Executive Pulse Metrics
-- ============================================================
-- Union all rep-level metrics with global totals.

rep_metrics AS (
  SELECT
    d.owner_id,
    d.owner_full_name,
    AVG(COALESCE(d.amount, d.arr, 0)) FILTER (
      WHERE d.is_closed_won = TRUE
        AND DATE(d.closedate) >= DATE_TRUNC(CURRENT_DATE(), YEAR)
    ) AS rep_asp_ytd,
    SUM(COALESCE(d.amount, d.arr, 0)) FILTER (
      WHERE d.is_closed_won = TRUE
        AND d.closedate IS NOT NULL
        AND DATE(d.closedate) >= DATE_TRUNC(CURRENT_DATE(), WEEK)
    ) AS rep_won_revenue_this_week,
    COUNT(*) FILTER (
      WHERE d.is_closed_won = TRUE
        AND d.closedate IS NOT NULL
        AND DATE(d.closedate) >= DATE_TRUNC(CURRENT_DATE(), WEEK)
    ) AS rep_won_deals_this_week,
    COUNT(*) FILTER (
      WHERE DATE(d.createdate) >= DATE_TRUNC(CURRENT_DATE(), WEEK)
    ) AS rep_opps_created_this_week
  FROM deal_data d
  WHERE d.owner_id IS NOT NULL
  GROUP BY d.owner_id, d.owner_full_name
),

-- ============================================================
-- SECTION 6: Final Output
-- ============================================================
-- Combines global totals with rep-level detail.

final_output AS (
  SELECT
    'GLOBAL' AS owner_id,
    'All Reps' AS owner_full_name,
    COALESCE(ytd.global_asp_ytd, 0) AS global_asp_ytd,
    COALESCE(wk.won_revenue_this_week, 0) AS won_revenue_this_week,
    COALESCE(wk.won_deals_this_week, 0) AS won_deals_this_week,
    COALESCE(wk.opps_created_this_week, 0) AS opps_created_this_week,
    CURRENT_TIMESTAMP() AS _loaded_at
  FROM ytd_asp_calc ytd
  CROSS JOIN this_week_metrics wk

  UNION ALL

  SELECT
    owner_id,
    COALESCE(owner_full_name, 'Unknown') AS owner_full_name,
    COALESCE(rep_asp_ytd, 0) AS global_asp_ytd,
    COALESCE(rep_won_revenue_this_week, 0) AS won_revenue_this_week,
    COALESCE(rep_won_deals_this_week, 0) AS won_deals_this_week,
    COALESCE(rep_opps_created_this_week, 0) AS opps_created_this_week,
    CURRENT_TIMESTAMP() AS _loaded_at
  FROM rep_metrics
)

SELECT * FROM final_output
ORDER BY
  CASE WHEN owner_id = 'GLOBAL' THEN 0 ELSE 1 END,
  won_revenue_this_week DESC;