-- ============================================================
-- Rep Matrix View
-- Dataset: revops_analytics.rep_matrix_view
-- Source: HubSpot_Airbyte.deals, HubSpot_Airbyte.owners
--
-- Provides rep-level performance metrics for the Command Center
-- Team Performance section. Grouped by hubspot_owner_id.
--
-- Metrics per rep:
--   - total_revenue_past_365: SUM of amount for closedwon deals in last 365 days
--   - ytd_asp: Average deal size for closedwon deals YTD
--   - avg_days_to_close: AVG of DATE_DIFF(closedate, createdate, DAY) for closedwon
--   - win_rate_by_create_date: Won deals created in range / All closed deals created in range
--   - win_rate_by_close_date: Won deals closed in range / All closed deals closed in range
--
-- Usage:
--   SELECT * FROM revops_analytics.rep_matrix_view
--   ORDER BY total_revenue_past_365 DESC
-- ============================================================

CREATE OR REPLACE VIEW `gen-lang-client-0844868008.revops_analytics.rep_matrix_view` AS

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
-- SECTION 2: Date Boundaries for Period Calculations
-- ============================================================
-- Calculates YTD start and 365-day lookback window.

date_boundaries AS (
  SELECT
    DATE_TRUNC(CURRENT_DATE(), YEAR) AS ytd_start,
    DATE_SUB(CURRENT_DATE(), INTERVAL 365 DAY) AS days_365_start
  FROM deal_data
  LIMIT 1
),

-- ============================================================
-- SECTION 3: Revenue Past 365 Days
-- ============================================================
-- Total ARR from closed won deals in the past 365 days per rep.

revenue_past_365 AS (
  SELECT
    d.owner_id,
    d.owner_full_name,
    SUM(COALESCE(d.amount, d.arr, 0)) AS total_revenue_past_365
  FROM deal_data d
  CROSS JOIN date_boundaries db
  WHERE d.is_closed_won = TRUE
    AND d.closedate IS NOT NULL
    AND DATE(d.closedate) >= db.days_365_start
  GROUP BY d.owner_id, d.owner_full_name
),

-- ============================================================
-- SECTION 4: YTD Average Selling Price
-- ============================================================
-- Average deal size for won deals closed YTD per rep.

ytd_asp AS (
  SELECT
    d.owner_id,
    d.owner_full_name,
    AVG(COALESCE(d.amount, d.arr, 0)) AS ytd_asp
  FROM deal_data d
  CROSS JOIN date_boundaries db
  WHERE d.is_closed_won = TRUE
    AND d.closedate IS NOT NULL
    AND DATE(d.closedate) >= db.ytd_start
  GROUP BY d.owner_id, d.owner_full_name
),

-- ============================================================
-- SECTION 5: Average Days to Close
-- ============================================================
-- Average cycle time from create to close for won deals.

avg_days_to_close AS (
  SELECT
    d.owner_id,
    d.owner_full_name,
    AVG(DATE_DIFF(DATE(d.closedate), DATE(d.createdate), DAY)) AS avg_days_to_close
  FROM deal_data d
  WHERE d.is_closed_won = TRUE
    AND d.closedate IS NOT NULL
    AND d.createdate IS NOT NULL
  GROUP BY d.owner_id, d.owner_full_name
),

-- ============================================================
-- SECTION 6: Win Rate by Create Date
-- ============================================================
-- Percentage of closedwon deals (by create date) vs all closed deals in range.

win_rate_by_create AS (
  SELECT
    d.owner_id,
    d.owner_full_name,
    db.ytd_start,
    COUNT(*) FILTER (WHERE d.is_closed_won = TRUE AND DATE(d.createdate) >= db.ytd_start) AS won_created_ytd,
    COUNT(*) FILTER (
      WHERE d.is_closed = TRUE
        AND d.createdate IS NOT NULL
        AND DATE(d.createdate) >= db.ytd_start
    ) AS closed_created_ytd,
    SAFE_DIVIDE(
      COUNT(*) FILTER (WHERE d.is_closed_won = TRUE AND DATE(d.createdate) >= db.ytd_start),
      COUNT(*) FILTER (
        WHERE d.is_closed = TRUE
          AND d.createdate IS NOT NULL
          AND DATE(d.createdate) >= db.ytd_start
      )
    ) * 100 AS win_rate_by_create_date
  FROM deal_data d
  CROSS JOIN date_boundaries db
  GROUP BY d.owner_id, d.owner_full_name, db.ytd_start
),

-- ============================================================
-- SECTION 7: Win Rate by Close Date
-- ============================================================
-- Percentage of closedwon deals (by close date) vs all closed deals in range.

win_rate_by_close AS (
  SELECT
    d.owner_id,
    d.owner_full_name,
    db.ytd_start,
    COUNT(*) FILTER (WHERE d.is_closed_won = TRUE AND DATE(d.closedate) >= db.ytd_start) AS won_closed_ytd,
    COUNT(*) FILTER (
      WHERE d.is_closed = TRUE
        AND d.closedate IS NOT NULL
        AND DATE(d.closedate) >= db.ytd_start
    ) AS closed_closed_ytd,
    SAFE_DIVIDE(
      COUNT(*) FILTER (WHERE d.is_closed_won = TRUE AND DATE(d.closedate) >= db.ytd_start),
      COUNT(*) FILTER (
        WHERE d.is_closed = TRUE
          AND d.closedate IS NOT NULL
          AND DATE(d.closedate) >= db.ytd_start
      )
    ) * 100 AS win_rate_by_close_date
  FROM deal_data d
  CROSS JOIN date_boundaries db
  GROUP BY d.owner_id, d.owner_full_name, db.ytd_start
),

-- ============================================================
-- SECTION 8: Combine All Metrics
-- ============================================================
-- Joins all CTE results on owner_id.

combined AS (
  SELECT
    COALESCE(r.owner_id, a.owner_id, t.owner_id, wc.owner_id, wcl.owner_id) AS owner_id,
    COALESCE(r.owner_full_name, a.owner_full_name, t.owner_full_name, wc.owner_full_name, wcl.owner_full_name) AS owner_name,
    COALESCE(r.total_revenue_past_365, 0) AS total_revenue_past_365,
    COALESCE(a.ytd_asp, 0) AS ytd_asp,
    COALESCE(t.avg_days_to_close, 0) AS avg_days_to_close,
    COALESCE(wc.win_rate_by_create_date, 0) AS win_rate_by_create_date,
    COALESCE(wcl.win_rate_by_close_date, 0) AS win_rate_by_close_date
  FROM revenue_past_365 r
  FULL OUTER JOIN ytd_asp a ON r.owner_id = a.owner_id
  FULL OUTER JOIN avg_days_to_close t ON COALESCE(r.owner_id, a.owner_id) = t.owner_id
  FULL OUTER JOIN win_rate_by_create wc ON COALESCE(r.owner_id, a.owner_id, t.owner_id) = wc.owner_id
  FULL OUTER JOIN win_rate_by_close wcl ON COALESCE(r.owner_id, a.owner_id, t.owner_id, wc.owner_id) = wcl.owner_id
)

-- ============================================================
-- SECTION 9: Final Output
-- ============================================================

SELECT
  owner_id,
  COALESCE(owner_name, 'Unknown') AS owner_name,
  ROUND(total_revenue_past_365, 2) AS total_revenue_past_365,
  ROUND(ytd_asp, 2) AS ytd_asp,
  ROUND(avg_days_to_close, 1) AS avg_days_to_close,
  ROUND(win_rate_by_create_date, 1) AS win_rate_by_create_date,
  ROUND(win_rate_by_close_date, 1) AS win_rate_by_close_date,
  CURRENT_TIMESTAMP() AS _loaded_at
FROM combined
WHERE owner_id IS NOT NULL
ORDER BY total_revenue_past_365 DESC;
