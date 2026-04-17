-- Deals Won, Lost, Nurtured, and Added by Month
-- Created: 2026-04-17
-- Dataset: revops_analytics.deals_won_lost_added_view
-- Source: HubSpot_Airbyte.deals, HubSpot_Airbyte.owners
--
-- Aggregates deal outcomes by month:
--   - Won: closedwon deals
--   - Lost: closedlost deals
--   - Nurtured: closedlost deals with nurture status
--   - Added: all deals created in month
--
-- Usage:
--   SELECT * FROM revops_analytics.deals_won_lost_added_view
--   WHERE month_start >= '2025-01-01'

CREATE OR REPLACE VIEW `gen-lang-client-0844868008.revops_analytics.deals_won_lost_added_view` AS

WITH

-- ============================================================
-- SECTION 1: Deal Owner Lookup
-- ============================================================
-- Pull deal data with owner names and stage information.

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
    SAFE_CAST(d.properties_createdate AS TIMESTAMP) AS createdate,
    SAFE_CAST(d.properties_closedate AS TIMESTAMP) AS closedate,
    COALESCE(d.properties_hs_is_closed_won, FALSE) AS is_closed_won,
    COALESCE(d.properties_hs_is_closed, FALSE) AS is_closed,
    LOWER(COALESCE(d.properties_dealstage, '')) AS dealstage,
    LOWER(COALESCE(d.properties_hs_deal_stage_probability, '')) AS stage_probability,
    COALESCE(d.properties_closed_lost_reason, '') AS closed_lost_reason,
    d.archived
  FROM `gen-lang-client-0844868008.HubSpot_Airbyte.deals` d
  LEFT JOIN `gen-lang-client-0844868008.HubSpot_Airbyte.owners` o
    ON SAFE_CAST(d.properties_hubspot_owner_id AS STRING) = SAFE_CAST(o.id AS STRING)
  WHERE d.archived = FALSE
),

-- ============================================================
-- SECTION 2: Month Calendar
-- ============================================================
-- One row per month for date range.

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
-- SECTION 3: Deals Won per Month
-- ============================================================
-- Count and sum of closedwon deals by close month.

deals_won AS (
  SELECT
    mc.month_start,
    mc.month_label,
    COUNT(*) AS deals_won_count,
    SUM(COALESCE(db.amount, 0)) AS arr_won
  FROM month_calendar mc
  JOIN deal_base db
    ON DATE(DATE_TRUNC(db.closedate, MONTH)) = mc.month_start
  WHERE db.is_closed_won = TRUE
    AND db.closedate IS NOT NULL
  GROUP BY mc.month_start, mc.month_label
),

-- ============================================================
-- SECTION 4: Deals Lost per Month
-- ============================================================
-- Count and sum of closedlost deals by close month.

deals_lost AS (
  SELECT
    mc.month_start,
    mc.month_label,
    COUNT(*) AS deals_lost_count,
    SUM(COALESCE(db.amount, 0)) AS arr_lost
  FROM month_calendar mc
  JOIN deal_base db
    ON DATE(DATE_TRUNC(db.closedate, MONTH)) = mc.month_start
  WHERE db.is_closed = TRUE
    AND db.is_closed_won = FALSE
    AND db.closedate IS NOT NULL
  GROUP BY mc.month_start, mc.month_label
),

-- ============================================================
-- SECTION 5: Deals Nurtured per Month
-- ============================================================
-- Count of closedlost deals marked as nurture by close month.
-- Nurture deals typically have specific close_lost_reason or stage probability.

deals_nurtured AS (
  SELECT
    mc.month_start,
    COUNT(*) AS deals_nurtured_count
  FROM month_calendar mc
  JOIN deal_base db
    ON DATE(DATE_TRUNC(db.closedate, MONTH)) = mc.month_start
  WHERE db.is_closed = TRUE
    AND db.is_closed_won = FALSE
    AND db.closedate IS NOT NULL
    AND (
      LOWER(db.closed_lost_reason) LIKE '%nurture%'
      OR LOWER(db.stage_probability) LIKE '%nurture%'
      OR LOWER(db.dealstage) LIKE '%nurture%'
    )
  GROUP BY mc.month_start
),

-- ============================================================
-- SECTION 6: Deals Added per Month
-- ============================================================
-- Count and sum of all deals created in each month.

deals_added AS (
  SELECT
    mc.month_start,
    mc.month_label,
    COUNT(*) AS deals_added_count,
    SUM(COALESCE(db.amount, 0)) AS arr_added
  FROM month_calendar mc
  JOIN deal_base db
    ON DATE(DATE_TRUNC(db.createdate, MONTH)) = mc.month_start
  WHERE db.createdate IS NOT NULL
  GROUP BY mc.month_start, mc.month_label
),

-- ============================================================
-- SECTION 7: Combined Output
-- ============================================================
-- Join all metrics by month.

combined AS (
  SELECT
    COALESCE(w.month_start, l.month_start, n.month_start, a.month_start) AS month_start,
    COALESCE(w.month_label, a.month_label, '') AS month_label,
    COALESCE(w.deals_won_count, 0) AS deals_won_count,
    COALESCE(l.deals_lost_count, 0) AS deals_lost_count,
    COALESCE(n.deals_nurtured_count, 0) AS deals_nurtured_count,
    COALESCE(a.deals_added_count, 0) AS deals_added_count,
    COALESCE(w.arr_won, 0) AS arr_won,
    COALESCE(l.arr_lost, 0) AS arr_lost,
    COALESCE(a.arr_added, 0) AS arr_added
  FROM deals_won w
  FULL OUTER JOIN deals_lost l ON w.month_start = l.month_start
  FULL OUTER JOIN deals_nurtured n ON COALESCE(w.month_start, l.month_start) = n.month_start
  FULL OUTER JOIN deals_added a ON COALESCE(w.month_start, l.month_start, n.month_start) = a.month_start
),

-- ============================================================
-- SECTION 8: Final Output
-- ============================================================
-- Add metadata column.

final_output AS (
  SELECT
    month_start,
    month_label,
    deals_won_count,
    deals_lost_count,
    deals_nurtured_count,
    deals_added_count,
    arr_won,
    arr_lost,
    arr_added,
    CURRENT_TIMESTAMP() AS _loaded_at
  FROM combined
)

SELECT * FROM final_output
ORDER BY month_start DESC;
