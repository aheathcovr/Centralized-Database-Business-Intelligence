-- Forecast Category Pipeline View
-- Created: 2026-04-17
-- Dataset: revops_analytics.forecast_category_pipeline_view
-- Source: HubSpot_Airbyte.deals, HubSpot_Airbyte.owners
--
-- Shows open pipeline grouped by forecast category:
--   - 1 - Pipeline (earliest stages)
--   - 2 - Best Case
--   - 3 - Most Likely
--   - 4 - Commit
--
-- Supports grouping by owner or by quarter.
--
-- Usage:
--   SELECT * FROM revops_analytics.forecast_category_pipeline_view
--   WHERE quarter = 'Q2-2026'

CREATE OR REPLACE VIEW `gen-lang-client-0844868008.revops_analytics.forecast_category_pipeline_view` AS

WITH

-- ============================================================
-- SECTION 1: Deal Owner Lookup with Forecast Category
-- ============================================================
-- Pull open deal data with owner names and forecast categories.

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
    COALESCE(d.properties_hs_is_closed, FALSE) AS is_closed,
    LOWER(COALESCE(d.properties_forecast_category, '')) AS forecast_category,
    LOWER(COALESCE(d.properties_dealstage, '')) AS dealstage,
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
-- Map various forecast category values to standard labels.

normalized_forecast AS (
  SELECT
    deal_id,
    owner_id,
    owner_name,
    amount,
    closedate,
    CASE
      WHEN forecast_category LIKE '%1%pipeline%' OR forecast_category LIKE '%none%' OR forecast_category = '' THEN '1 - Pipeline'
      WHEN forecast_category LIKE '%2%best%' OR forecast_category LIKE '%best case%' THEN '2 - Best Case'
      WHEN forecast_category LIKE '%3%most%' OR forecast_category LIKE '%most likely%' THEN '3 - Most Likely'
      WHEN forecast_category LIKE '%4%commit%' OR forecast_category LIKE '%commit%' THEN '4 - Commit'
      ELSE '1 - Pipeline'
    END AS forecast_category_normalized
  FROM deal_base
),

-- ============================================================
-- SECTION 3: Group by Owner and Forecast Category
-- ============================================================
-- Open pipeline metrics by owner and forecast category.

by_owner AS (
  SELECT
    forecast_category_normalized AS forecast_category,
    owner_name,
    NULL AS quarter,
    COUNT(*) AS deals_count,
    SUM(COALESCE(amount, 0)) AS total_arr,
    MAX(closedate) AS closedate
  FROM normalized_forecast
  GROUP BY
    forecast_category_normalized,
    owner_name
),

-- ============================================================
-- SECTION 4: Group by Quarter and Forecast Category
-- ============================================================
-- Open pipeline metrics by quarter (company-wide).

by_quarter AS (
  SELECT
    forecast_category_normalized AS forecast_category,
    NULL AS owner_name,
    CONCAT('Q', EXTRACT(QUARTER FROM closedate), '-', CAST(EXTRACT(YEAR FROM closedate) AS STRING)) AS quarter,
    COUNT(*) AS deals_count,
    SUM(COALESCE(amount, 0)) AS total_arr,
    MAX(closedate) AS closedate
  FROM normalized_forecast
  WHERE closedate IS NOT NULL
  GROUP BY
    forecast_category_normalized,
    EXTRACT(QUARTER FROM closedate),
    EXTRACT(YEAR FROM closedate
  )
),

-- ============================================================
-- SECTION 5: Final Output
-- ============================================================
-- Combine owner-level and quarter-level groupings.

final_output AS (
  SELECT
    forecast_category,
    owner_name,
    quarter,
    deals_count,
    total_arr,
    closedate
  FROM by_owner

  UNION ALL

  SELECT
    forecast_category,
    owner_name,
    quarter,
    deals_count,
    total_arr,
    closedate
  FROM by_quarter
)

SELECT * FROM final_output
ORDER BY
  quarter DESC,
  owner_name,
  forecast_category;
