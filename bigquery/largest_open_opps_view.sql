-- Largest Open Opportunities View
-- Created: 2026-04-17
-- Dataset: revops_analytics.largest_open_opps_view
-- Source: HubSpot_Airbyte.deals, HubSpot_Airbyte.owners
--
-- Returns the largest open opportunities for current and next quarter.
-- Useful for exec dashboard to see top deals requiring attention.
--
-- Usage:
--   SELECT * FROM revops_analytics.largest_open_opps_view
--   WHERE closedate >= DATE_TRUNC(CURRENT_DATE(), QUARTER)

CREATE OR REPLACE VIEW `gen-lang-client-0844868008.revops_analytics.largest_open_opps_view` AS

WITH

-- ============================================================
-- SECTION 1: Deal Owner Lookup with Stage Info
-- ============================================================
-- Pull open deal data with owner names and stage info.

deal_base AS (
  SELECT
    d.id AS deal_id,
    COALESCE(d.properties_dealname, CONCAT('Deal ', d.id)) AS deal_name,
    d.properties_hubspot_owner_id AS owner_id,
    CONCAT(
      COALESCE(o.firstName, REGEXP_EXTRACT(o.email, r'^([^@]+)')),
      ' ',
      COALESCE(o.lastName, '')
    ) AS owner_name,
    SAFE_CAST(d.properties_amount AS FLOAT64) AS amount,
    SAFE_CAST(d.properties_closedate AS TIMESTAMP) AS closedate,
    COALESCE(d.properties_hs_is_closed_won, FALSE) AS is_closed_won,
    COALESCE(d.properties_hs_is_closed, FALSE) AS is_closed,
    LOWER(COALESCE(d.properties_forecast_category, '')) AS forecast_category,
    LOWER(COALESCE(d.properties_dealstage, '')) AS dealstage,
    COALESCE(d.properties_hs_deal_stage_probability, '') AS stage_probability,
    d.archived
  FROM `gen-lang-client-0844868008.HubSpot_Airbyte.deals` d
  LEFT JOIN `gen-lang-client-0844868008.HubSpot_Airbyte.owners` o
    ON SAFE_CAST(d.properties_hubspot_owner_id AS STRING) = SAFE_CAST(o.id AS STRING)
  WHERE d.archived = FALSE
    AND COALESCE(d.properties_hs_is_closed_won, FALSE) = FALSE
    AND COALESCE(d.properties_hs_is_closed, FALSE) = FALSE
),

-- ============================================================
-- SECTION 2: Normalize Forecast Category
-- ============================================================
-- Map forecast category to display labels.

normalized_deals AS (
  SELECT
    deal_id,
    deal_name,
    owner_id,
    owner_name,
    amount,
    closedate,
    CASE
      WHEN forecast_category LIKE '%1%pipeline%' OR forecast_category LIKE '%none%' OR forecast_category = '' THEN 'Pipeline'
      WHEN forecast_category LIKE '%2%best%' OR forecast_category LIKE '%best case%' THEN 'Best Case'
      WHEN forecast_category LIKE '%3%most%' OR forecast_category LIKE '%most likely%' THEN 'Most Likely'
      WHEN forecast_category LIKE '%4%commit%' OR forecast_category LIKE '%commit%' THEN 'Commit'
      ELSE 'Pipeline'
    END AS forecast_category,
    COALESCE(stage_probability, 'Unknown') AS stage_name
  FROM deal_base
),

-- ============================================================
-- SECTION 3: Filter to Current and Next Quarter
-- ============================================================
-- Only include deals closing in current or next quarter.

current_next_quarter AS (
  SELECT
    deal_id,
    deal_name,
    owner_name,
    amount,
    closedate,
    forecast_category,
    stage_name,
    CONCAT('Q', EXTRACT(QUARTER FROM closedate), '-', CAST(EXTRACT(YEAR FROM closedate) AS STRING)) AS quarter
  FROM normalized_deals
  WHERE closedate >= DATE_TRUNC(CURRENT_DATE(), QUARTER)
    AND closedate <= DATE_ADD(DATE_ADD(DATE_TRUNC(CURRENT_DATE(), QUARTER), INTERVAL 1 QUARTER), INTERVAL 1 QUARTER)
),

-- ============================================================
-- SECTION 4: Final Output
-- ============================================================
-- Top deals by amount.

final_output AS (
  SELECT
    deal_id,
    deal_name,
    owner_name,
    amount,
    closedate,
    forecast_category,
    stage_name,
    quarter,
    CURRENT_TIMESTAMP() AS _loaded_at
  FROM current_next_quarter
  WHERE amount IS NOT NULL AND amount > 0
)

SELECT * FROM final_output
ORDER BY amount DESC
LIMIT 50;
