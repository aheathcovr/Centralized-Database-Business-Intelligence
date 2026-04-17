-- AE Outbound Pipeline View
-- Created: 2026-04-17
-- Dataset: revops_analytics.ae_outbound_pipeline_view
-- Source: HubSpot_Airbyte.deals, HubSpot_Airbyte.owners
--
-- Tracks outbound opportunities created per week.
-- Filters deals where lead_source or deal type indicates outbound.
--
-- Usage:
--   SELECT * FROM revops_analytics.ae_outbound_pipeline_view
--   WHERE week_start >= DATE_TRUNC(CURRENT_DATE(), YEAR)

CREATE OR REPLACE VIEW `gen-lang-client-0844868008.revops_analytics.ae_outbound_pipeline_view` AS

WITH

-- ============================================================
-- SECTION 1: Deal Owner Lookup with Lead Source
-- ============================================================
-- Pull deal data and identify outbound deals.

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
-- SECTION 2: Identify Outbound Deals
-- ============================================================
-- Mark deals as outbound based on deal type or other indicators.

outbound_deals AS (
  SELECT
    deal_id,
    owner_id,
    owner_name,
    amount,
    createdate,
    CASE
      WHEN deal_type LIKE '%outbound%' OR deal_type LIKE '%new%' THEN TRUE
      ELSE FALSE
    END AS is_outbound
  FROM deal_base
),

-- ============================================================
-- SECTION 3: Week Calendar
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
-- SECTION 4: Outbound Opps by Week and Owner
-- ============================================================
-- Aggregate outbound deals by week and owner.

outbound_by_week AS (
  SELECT
    wc.week_start,
    wc.week_label,
    COALESCE(od.owner_id, 'unknown') AS owner_id,
    COALESCE(od.owner_name, 'Unknown Owner') AS owner_name,
    COUNT(*) AS outbound_opps_count,
    SUM(COALESCE(od.amount, 0)) AS outbound_arr
  FROM week_calendar wc
  JOIN outbound_deals od
    ON DATE_TRUNC(od.createdate, WEEK(MONDAY)) = wc.week_start
    AND od.is_outbound = TRUE
  GROUP BY
    wc.week_start,
    wc.week_label,
    od.owner_id,
    od.owner_name
),

-- ============================================================
-- SECTION 5: Totals per Week
-- ============================================================
-- Aggregate totals across all owners per week.

outbound_totals AS (
  SELECT
    wc.week_start,
    wc.week_label,
    'Total' AS owner_id,
    'Total' AS owner_name,
    COUNT(*) AS outbound_opps_count,
    SUM(COALESCE(od.amount, 0)) AS outbound_arr
  FROM week_calendar wc
  JOIN outbound_deals od
    ON DATE_TRUNC(od.createdate, WEEK(MONDAY)) = wc.week_start
    AND od.is_outbound = TRUE
  GROUP BY
    wc.week_start,
    wc.week_label
),

-- ============================================================
-- SECTION 6: Final Output
-- ============================================================
-- Combine owner-level and total rows.

final_output AS (
  SELECT
    week_start,
    week_label,
    owner_name,
    outbound_opps_count,
    outbound_arr
  FROM outbound_by_week

  UNION ALL

  SELECT
    week_start,
    week_label,
    owner_name,
    outbound_opps_count,
    outbound_arr
  FROM outbound_totals
)

SELECT * FROM final_output
ORDER BY week_start DESC, owner_name;
