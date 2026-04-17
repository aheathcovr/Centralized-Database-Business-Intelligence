-- Weekly Opportunities Added View
-- Created: 2026-04-17
-- Dataset: revops_analytics.weekly_opps_view
-- Source: HubSpot_Airbyte.deals, HubSpot_Airbyte.owners
--
-- Tracks opportunities created per week, overall and by rep.
-- Shows deal type (opps_type) when available via lead_source.
--
-- Usage:
--   SELECT * FROM revops_analytics.weekly_opps_view
--   WHERE week_start >= DATE_TRUNC(CURRENT_DATE(), YEAR)

CREATE OR REPLACE VIEW `gen-lang-client-0844868008.revops_analytics.weekly_opps_view` AS

WITH

-- ============================================================
-- SECTION 1: Deal Owner Lookup with Lead Source
-- ============================================================
-- Pull deal data with owner names and deal type (lead_source).

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
    LOWER(COALESCE(d.properties_hs_deal_stage_probability, '')) AS deal_type,
    d.archived
  FROM `gen-lang-client-0844868008.HubSpot_Airbyte.deals` d
  LEFT JOIN `gen-lang-client-0844868008.HubSpot_Airbyte.owners` o
    ON SAFE_CAST(d.properties_hubspot_owner_id AS STRING) = SAFE_CAST(o.id AS STRING)
  WHERE d.archived = FALSE
    AND d.properties_createdate IS NOT NULL
),

-- ============================================================
-- SECTION 2: Week Calendar
-- ============================================================
-- Generate calendar of weeks from 2024 to current week.

week_calendar AS (
  SELECT
    week_start,
    FORMAT_DATE('%b %d', week_start) AS week_label
  FROM UNNEST(
    GENERATE_DATE_ARRAY(
      DATE(2024, 1, 1),
      DATE_TRUNC(CURRENT_DATE(), WEEK(MONDAY)),
      INTERVAL 1 WEEK
    )
  ) AS week_start
),

-- ============================================================
-- SECTION 3: Deals Created per Week by Owner
-- ============================================================
-- Aggregate new deals by week and owner.

weekly_by_owner AS (
  SELECT
    wc.week_start,
    wc.week_label,
    COALESCE(db.owner_id, 'unknown') AS owner_id,
    COALESCE(db.owner_name, 'Unknown Owner') AS owner_name,
    CASE
      WHEN db.deal_type LIKE '%new%' OR db.deal_type LIKE '%outbound%' THEN 'Outbound'
      WHEN db.deal_type LIKE '%inbound%' THEN 'Inbound'
      WHEN db.deal_type LIKE '%renewal%' THEN 'Renewal'
      WHEN db.deal_type LIKE '%expansion%' THEN 'Expansion'
      ELSE 'New Pipeline'
    END AS opps_type,
    COUNT(*) AS opps_added_count,
    SUM(COALESCE(db.amount, 0)) AS arr_added
  FROM week_calendar wc
  JOIN deal_base db
    ON DATE_TRUNC(db.createdate, WEEK(MONDAY)) = wc.week_start
  GROUP BY
    wc.week_start,
    wc.week_label,
    db.owner_id,
    db.owner_name,
    db.deal_type
),

-- ============================================================
-- SECTION 4: Totals per Week
-- ============================================================
-- Aggregate totals across all owners per week.

weekly_totals AS (
  SELECT
    wc.week_start,
    wc.week_label,
    'Total' AS owner_name,
    'Total' AS opps_type,
    COUNT(*) AS opps_added_count,
    SUM(COALESCE(db.amount, 0)) AS arr_added
  FROM week_calendar wc
  JOIN deal_base db
    ON DATE_TRUNC(db.createdate, WEEK(MONDAY)) = wc.week_start
  GROUP BY
    wc.week_start,
    wc.week_label
),

-- ============================================================
-- SECTION 5: Final Output
-- ============================================================
-- Combine owner-level and total rows.

final_output AS (
  SELECT
    week_start,
    week_label,
    owner_name,
    opps_type,
    opps_added_count,
    arr_added
  FROM weekly_by_owner

  UNION ALL

  SELECT
    week_start,
    week_label,
    owner_name,
    opps_type,
    opps_added_count,
    arr_added
  FROM weekly_totals
)

SELECT * FROM final_output
ORDER BY week_start DESC, owner_name, opps_type;
