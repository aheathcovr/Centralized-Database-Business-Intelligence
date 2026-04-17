-- ============================================================
-- Pipeline Shed View (Leakage)
-- Dataset: revops_analytics.pipeline_shed_view
-- Source: HubSpot_Airbyte.deals
--
-- Provides pipeline leakage metrics for the Command Center
-- Activity Matrix & Pipeline Defense section.
--
-- Metrics per period:
--   - lost_arr: SUM of amount for deals closed lost in period
--   - lost_deal_count: COUNT of deals closed lost in period
--
-- Periods: Last Week, MTD, QTD
--
-- Usage:
--   SELECT * FROM revops_analytics.pipeline_shed_view
--   ORDER BY
--     CASE period
--       WHEN 'Last Week' THEN 1
--       WHEN 'MTD' THEN 2
--       WHEN 'QTD' THEN 3
--     END
-- ============================================================

CREATE OR REPLACE VIEW `gen-lang-client-0844868008.revops_analytics.pipeline_shed_view` AS

WITH

-- ============================================================
-- SECTION 1: Deal Data
-- ============================================================
-- Pulls closed lost deals for pipeline leakage analysis.

deal_data AS (
  SELECT
    d.id AS deal_id,
    SAFE_CAST(d.properties_amount AS FLOAT64) AS amount,
    SAFE_CAST(d.properties_hs_arr AS FLOAT64) AS arr,
    COALESCE(d.properties_hs_is_closed_won, FALSE) AS is_closed_won,
    COALESCE(d.properties_hs_is_closed, FALSE) AS is_closed,
    SAFE_CAST(d.properties_createdate AS TIMESTAMP) AS createdate,
    SAFE_CAST(d.properties_closedate AS TIMESTAMP) AS closedate
  FROM `gen-lang-client-0844868008.HubSpot_Airbyte.deals` d
  WHERE d.archived = FALSE
),

-- ============================================================
-- SECTION 2: Date Boundaries
-- ============================================================
-- Calculates period start dates for Last Week, MTD, QTD.

date_boundaries AS (
  SELECT
    DATE_TRUNC(CURRENT_DATE(), WEEK) AS last_week_start,
    DATE_TRUNC(CURRENT_DATE(), MONTH) AS mtd_start,
    DATE_TRUNC(CURRENT_DATE(), QUARTER) AS qtd_start
  FROM deal_data
  LIMIT 1
),

-- ============================================================
-- SECTION 3: Last Week Metrics
-- ============================================================
-- SUM and COUNT of closed lost deals in the past week.

last_week_metrics AS (
  SELECT
    'Last Week' AS period,
    SUM(COALESCE(d.amount, d.arr, 0)) AS lost_arr,
    COUNT(*) AS lost_deal_count
  FROM deal_data d
  CROSS JOIN date_boundaries db
  WHERE d.is_closed = TRUE
    AND d.is_closed_won = FALSE
    AND d.closedate IS NOT NULL
    AND DATE(d.closedate) >= db.last_week_start
),

-- ============================================================
-- SECTION 4: MTD Metrics
-- ============================================================
-- SUM and COUNT of closed lost deals this month.

mtd_metrics AS (
  SELECT
    'MTD' AS period,
    SUM(COALESCE(d.amount, d.arr, 0)) AS lost_arr,
    COUNT(*) AS lost_deal_count
  FROM deal_data d
  CROSS JOIN date_boundaries db
  WHERE d.is_closed = TRUE
    AND d.is_closed_won = FALSE
    AND d.closedate IS NOT NULL
    AND DATE(d.closedate) >= db.mtd_start
),

-- ============================================================
-- SECTION 5: QTD Metrics
-- ============================================================
-- SUM and COUNT of closed lost deals this quarter.

qtd_metrics AS (
  SELECT
    'QTD' AS period,
    SUM(COALESCE(d.amount, d.arr, 0)) AS lost_arr,
    COUNT(*) AS lost_deal_count
  FROM deal_data d
  CROSS JOIN date_boundaries db
  WHERE d.is_closed = TRUE
    AND d.is_closed_won = FALSE
    AND d.closedate IS NOT NULL
    AND DATE(d.closedate) >= db.qtd_start
),

-- ============================================================
-- SECTION 6: Combine All Periods
-- ============================================================

combined AS (
  SELECT * FROM last_week_metrics
  UNION ALL
  SELECT * FROM mtd_metrics
  UNION ALL
  SELECT * FROM qtd_metrics
)

-- ============================================================
-- SECTION 7: Final Output
-- ============================================================

SELECT
  period,
  ROUND(COALESCE(lost_arr, 0), 2) AS lost_arr,
  COALESCE(lost_deal_count, 0) AS lost_deal_count,
  CURRENT_TIMESTAMP() AS _loaded_at
FROM combined
ORDER BY
  CASE period
    WHEN 'Last Week' THEN 1
    WHEN 'MTD' THEN 2
    WHEN 'QTD' THEN 3
  END;
