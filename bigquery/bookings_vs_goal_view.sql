-- Bookings vs Goal View
-- Created: 2026-04-17
-- Dataset: revops_analytics.bookings_vs_goal_view
-- Source: HubSpot_Airbyte.deals, HubSpot_Airbyte.owners
--
-- Compares actual bookings ARR against sales goals.
--
-- Annual Goals:
--   Charles Christy: $750,000
--   Bradi Kelley: $600,000
--   Logan Lee: $700,000
--   Company (total): $2,050,000
--
-- Quarterly goals are calculated as annual / 4.
--
-- Usage:
--   SELECT * FROM revops_analytics.bookings_vs_goal_view

CREATE OR REPLACE VIEW `gen-lang-client-0844868008.revops_analytics.bookings_vs_goal_view` AS

WITH

-- ============================================================
-- SECTION 1: Sales Rep Annual Goals
-- ============================================================
-- Hardcoded annual goals for each sales rep.

sales_goals AS (
  SELECT 'Charles Christy' AS owner_name, 750000 AS annual_goal_arr UNION ALL
  SELECT 'Bradi Kelley', 600000 UNION ALL
  SELECT 'Logan Lee', 700000
),

-- ============================================================
-- SECTION 2: Deal Owner Lookup
-- ============================================================
-- Pull deal data with owner names.

deal_base AS (
  SELECT
    d.id AS deal_id,
    d.properties_hubspot_owner_id AS owner_id,
    CONCAT(
      COALESCE(o.firstName, REGEXP_EXTRACT(o.email, r'^([^@]+)')),
      ' ',
      COALESCE(o.lastName, '')
    ) AS owner_name,
    SAFE_CAST(d.properties_amount AS FLOAT64) AS amount,
    SAFE_CAST(d.properties_closedate AS TIMESTAMP) AS closedate,
    COALESCE(d.properties_hs_is_closed_won, FALSE) AS is_closed_won,
    d.archived
  FROM `gen-lang-client-0844868008.HubSpot_Airbyte.deals` d
  LEFT JOIN `gen-lang-client-0844868008.HubSpot_Airbyte.owners` o
    ON SAFE_CAST(d.properties_hubspot_owner_id AS STRING) = SAFE_CAST(o.id AS STRING)
  WHERE d.archived = FALSE
),

-- ============================================================
-- SECTION 3: Annual Bookings (Current Year)
-- ============================================================
-- Calculate YTD and annual bookings by owner.

annual_bookings AS (
  SELECT
    'Company' AS owner_name,
    EXTRACT(YEAR FROM closedate) AS booking_year,
    SUM(COALESCE(amount, 0)) AS actual_arr
  FROM deal_base
  WHERE is_closed_won = TRUE
    AND closedate IS NOT NULL
    AND EXTRACT(YEAR FROM closedate) >= 2024
  GROUP BY EXTRACT(YEAR FROM closedate)

  UNION ALL

  SELECT
    COALESCE(owner_name, 'Unknown') AS owner_name,
    EXTRACT(YEAR FROM closedate) AS booking_year,
    SUM(COALESCE(amount, 0)) AS actual_arr
  FROM deal_base
  WHERE is_closed_won = TRUE
    AND closedate IS NOT NULL
    AND EXTRACT(YEAR FROM closedate) >= 2024
  GROUP BY owner_name, EXTRACT(YEAR FROM closedate)
),

-- ============================================================
-- SECTION 4: Quarterly Bookings
-- ============================================================
-- Calculate quarterly bookings by owner.

quarterly_bookings AS (
  SELECT
    'Company' AS owner_name,
    CONCAT('Q', EXTRACT(QUARTER FROM closedate), '-', CAST(EXTRACT(YEAR FROM closedate) AS STRING)) AS current_period,
    EXTRACT(YEAR FROM closedate) AS booking_year,
    EXTRACT(QUARTER FROM closedate) AS booking_quarter,
    SUM(COALESCE(amount, 0)) AS actual_arr
  FROM deal_base
  WHERE is_closed_won = TRUE
    AND closedate IS NOT NULL
  GROUP BY EXTRACT(QUARTER FROM closedate), EXTRACT(YEAR FROM closedate)

  UNION ALL

  SELECT
    COALESCE(owner_name, 'Unknown') AS owner_name,
    CONCAT('Q', EXTRACT(QUARTER FROM closedate), '-', CAST(EXTRACT(YEAR FROM closedate) AS STRING)) AS current_period,
    EXTRACT(YEAR FROM closedate) AS booking_year,
    EXTRACT(QUARTER FROM closedate) AS booking_quarter,
    SUM(COALESCE(amount, 0)) AS actual_arr
  FROM deal_base
  WHERE is_closed_won = TRUE
    AND closedate IS NOT NULL
  GROUP BY owner_name, EXTRACT(QUARTER FROM closedate), EXTRACT(YEAR FROM closedate)
),

-- ============================================================
-- SECTION 5: Build Annual View with Goals
-- ============================================================
-- Annual bookings with hardcoded goals.

annual_output AS (
  SELECT
    ab.owner_name,
    'annual' AS period_type,
    CAST(ab.booking_year AS STRING) AS current_period,
    COALESCE(
      sg.annual_goal_arr,
      (SELECT SUM(annual_goal_arr) FROM sales_goals)
    ) AS goal_arr,
    SUM(ab.actual_arr) AS actual_arr,
    SAFE_DIVIDE(SUM(ab.actual_arr), COALESCE(
      sg.annual_goal_arr,
      (SELECT SUM(annual_goal_arr) FROM sales_goals)
    )) * 100 AS attainment_pct
  FROM annual_bookings ab
  LEFT JOIN sales_goals sg ON ab.owner_name = sg.owner_name
  GROUP BY ab.owner_name, ab.booking_year, sg.annual_goal_arr
),

-- ============================================================
-- SECTION 6: Build Quarterly View with Goals
-- ============================================================
-- Quarterly bookings with goals (annual / 4).

quarterly_output AS (
  SELECT
    qb.owner_name,
    'quarterly' AS period_type,
    qb.current_period,
    COALESCE(
      sg.annual_goal_arr,
      (SELECT SUM(annual_goal_arr) FROM sales_goals)
    ) / 4 AS goal_arr,
    SUM(qb.actual_arr) AS actual_arr,
    SAFE_DIVIDE(SUM(qb.actual_arr), COALESCE(
      sg.annual_goal_arr,
      (SELECT SUM(annual_goal_arr) FROM sales_goals)
    ) / 4) * 100 AS attainment_pct
  FROM quarterly_bookings qb
  LEFT JOIN sales_goals sg ON qb.owner_name = sg.owner_name
  GROUP BY qb.owner_name, qb.current_period, qb.booking_year, qb.booking_quarter, sg.annual_goal_arr
),

-- ============================================================
-- SECTION 7: Final Output
-- ============================================================
-- Combine annual and quarterly with attainment calculation.

final_output AS (
  SELECT
    owner_name,
    period_type,
    current_period,
    goal_arr,
    actual_arr,
    SAFE_DIVIDE(actual_arr, NULLIF(goal_arr, 0)) * 100 AS attainment_pct
  FROM annual_output

  UNION ALL

  SELECT
    owner_name,
    period_type,
    current_period,
    goal_arr,
    actual_arr,
    SAFE_DIVIDE(actual_arr, NULLIF(goal_arr, 0)) * 100 AS attainment_pct
  FROM quarterly_output
)

SELECT * FROM final_output
ORDER BY current_period DESC, period_type, owner_name;
