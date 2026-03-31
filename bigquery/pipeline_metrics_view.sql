-- Pipeline Management Metrics View
-- Created: 2026-03-30
-- Dataset: revops_analytics.pipeline_metrics_view
-- Source: HubSpot_Airbyte.deals, HubSpot_Airbyte.owners
--
-- Supports three grouping modes via query parameters:
--   1. by_rep: metrics grouped by sales rep (owner)
--   2. by_create_month: metrics grouped by deal create date month
--   3. by_create_quarter: metrics grouped by deal create date quarter
--
-- Supports trailing window filters: 30d, 90d, 180d
--
-- Metrics computed:
--   - close_rate_pct: deals won / deals entered pipeline
--   - asp: average selling price (total won amount / deals won)
--   - avg_sales_cycle_days: average days from create to close (won deals only)
--   - pipeline_velocity_30d: (won_amount / total_sales_cycle_days) * 30
--
-- Usage:
--   SELECT * FROM revops_analytics.pipeline_metrics_view
--   WHERE trailing_window = '90d' AND group_mode = 'by_rep'

CREATE OR REPLACE VIEW `gen-lang-client-0844868008.revops_analytics.pipeline_metrics_view` AS

WITH

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
    d.properties_dealstage AS dealstage,
    SAFE_CAST(d.properties_createdate AS TIMESTAMP) AS createdate,
    SAFE_CAST(d.properties_closedate AS TIMESTAMP) AS closedate,
    d.properties_pipeline AS pipeline,
    CASE
      WHEN d.properties_closedate IS NOT NULL AND d.properties_createdate IS NOT NULL
      THEN DATE_DIFF(DATE(d.properties_closedate), DATE(d.properties_createdate), DAY)
      ELSE NULL
    END AS sales_cycle_days
  FROM `gen-lang-client-0844868008.HubSpot_Airbyte.deals` d
  LEFT JOIN `gen-lang-client-0844868008.HubSpot_Airbyte.owners` o
    ON SAFE_CAST(d.properties_hubspot_owner_id AS STRING) = SAFE_CAST(o.id AS STRING)
  WHERE d.properties_hubspot_owner_id IS NOT NULL
    AND d.archived = FALSE
),

windowed_deals AS (
  SELECT
    *,
    DATE(createdate) >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY) AS in_window_30d,
    DATE(createdate) >= DATE_SUB(CURRENT_DATE(), INTERVAL 90 DAY) AS in_window_90d,
    DATE(createdate) >= DATE_SUB(CURRENT_DATE(), INTERVAL 180 DAY) AS in_window_180d,
    TRUE AS in_window_all
  FROM deal_data
),

by_rep AS (
  SELECT
    'by_rep' AS group_mode,
    owner_full_name AS group_label,
    owner_id AS group_key,
    owner_full_name AS display_name,
    trailing_window,
    COUNT(*) AS total_deals,
    COUNTIF(dealstage = 'closedwon') AS deals_won,
    COUNTIF(dealstage = 'closedlost') AS deals_lost,
    COUNTIF(dealstage NOT IN ('closedwon', 'closedlost')) AS deals_open,
    SUM(CASE WHEN dealstage = 'closedwon' THEN COALESCE(amount, 0) ELSE 0 END) AS total_won_amount,
    SUM(COALESCE(amount, 0)) AS total_pipeline_amount,
    SAFE_DIVIDE(
      COUNTIF(dealstage = 'closedwon'),
      COUNT(*)
    ) AS close_rate_pct,
    SAFE_DIVIDE(
      SUM(CASE WHEN dealstage = 'closedwon' THEN COALESCE(amount, 0) ELSE 0 END),
      COUNTIF(dealstage = 'closedwon')
    ) AS asp,
    AVG(
      CASE WHEN dealstage = 'closedwon' AND sales_cycle_days IS NOT NULL
      THEN sales_cycle_days
      ELSE NULL END
    ) AS avg_sales_cycle_days,
    SAFE_DIVIDE(
      SUM(CASE WHEN dealstage = 'closedwon' THEN COALESCE(amount, 0) ELSE 0 END),
      SUM(CASE WHEN dealstage = 'closedwon' AND sales_cycle_days IS NOT NULL
          THEN sales_cycle_days ELSE NULL END)
    ) * 30 AS pipeline_velocity_30d
  FROM (
    SELECT *, '30d' AS trailing_window FROM windowed_deals WHERE in_window_30d
    UNION ALL
    SELECT *, '90d' AS trailing_window FROM windowed_deals WHERE in_window_90d
    UNION ALL
    SELECT *, '180d' AS trailing_window FROM windowed_deals WHERE in_window_180d
    UNION ALL
    SELECT *, 'all' AS trailing_window FROM windowed_deals WHERE in_window_all
  )
  GROUP BY owner_full_name, owner_id, trailing_window
),

by_create_month AS (
  SELECT
    'by_create_month' AS group_mode,
    FORMAT_DATE('%b-%Y', create_month) AS group_label,
    CAST(create_month AS STRING) AS group_key,
    FORMAT_DATE('%b-%Y', create_month) AS display_name,
    trailing_window,
    COUNT(*) AS total_deals,
    COUNTIF(dealstage = 'closedwon') AS deals_won,
    COUNTIF(dealstage = 'closedlost') AS deals_lost,
    COUNTIF(dealstage NOT IN ('closedwon', 'closedlost')) AS deals_open,
    SUM(CASE WHEN dealstage = 'closedwon' THEN COALESCE(amount, 0) ELSE 0 END) AS total_won_amount,
    SUM(COALESCE(amount, 0)) AS total_pipeline_amount,
    SAFE_DIVIDE(COUNTIF(dealstage = 'closedwon'), COUNT(*)) AS close_rate_pct,
    SAFE_DIVIDE(
      SUM(CASE WHEN dealstage = 'closedwon' THEN COALESCE(amount, 0) ELSE 0 END),
      COUNTIF(dealstage = 'closedwon')
    ) AS asp,
    AVG(CASE WHEN dealstage = 'closedwon' AND sales_cycle_days IS NOT NULL THEN sales_cycle_days ELSE NULL END) AS avg_sales_cycle_days,
    SAFE_DIVIDE(
      SUM(CASE WHEN dealstage = 'closedwon' THEN COALESCE(amount, 0) ELSE 0 END),
      SUM(CASE WHEN dealstage = 'closedwon' AND sales_cycle_days IS NOT NULL THEN sales_cycle_days ELSE NULL END)
    ) * 30 AS pipeline_velocity_30d
  FROM (
    SELECT *, DATE_TRUNC(DATE(createdate), MONTH) AS create_month, '30d' AS trailing_window FROM windowed_deals WHERE in_window_30d
    UNION ALL
    SELECT *, DATE_TRUNC(DATE(createdate), MONTH) AS create_month, '90d' AS trailing_window FROM windowed_deals WHERE in_window_90d
    UNION ALL
    SELECT *, DATE_TRUNC(DATE(createdate), MONTH) AS create_month, '180d' AS trailing_window FROM windowed_deals WHERE in_window_180d
    UNION ALL
    SELECT *, DATE_TRUNC(DATE(createdate), MONTH) AS create_month, 'all' AS trailing_window FROM windowed_deals WHERE in_window_all
  )
  GROUP BY create_month, trailing_window
),

by_create_quarter AS (
  SELECT
    'by_create_quarter' AS group_mode,
    CONCAT('Q', CAST(EXTRACT(QUARTER FROM create_quarter) AS STRING), '-', CAST(EXTRACT(YEAR FROM create_quarter) AS STRING)) AS group_label,
    CAST(create_quarter AS STRING) AS group_key,
    CONCAT('Q', CAST(EXTRACT(QUARTER FROM create_quarter) AS STRING), '-', CAST(EXTRACT(YEAR FROM create_quarter) AS STRING)) AS display_name,
    trailing_window,
    COUNT(*) AS total_deals,
    COUNTIF(dealstage = 'closedwon') AS deals_won,
    COUNTIF(dealstage = 'closedlost') AS deals_lost,
    COUNTIF(dealstage NOT IN ('closedwon', 'closedlost')) AS deals_open,
    SUM(CASE WHEN dealstage = 'closedwon' THEN COALESCE(amount, 0) ELSE 0 END) AS total_won_amount,
    SUM(COALESCE(amount, 0)) AS total_pipeline_amount,
    SAFE_DIVIDE(COUNTIF(dealstage = 'closedwon'), COUNT(*)) AS close_rate_pct,
    SAFE_DIVIDE(
      SUM(CASE WHEN dealstage = 'closedwon' THEN COALESCE(amount, 0) ELSE 0 END),
      COUNTIF(dealstage = 'closedwon')
    ) AS asp,
    AVG(CASE WHEN dealstage = 'closedwon' AND sales_cycle_days IS NOT NULL THEN sales_cycle_days ELSE NULL END) AS avg_sales_cycle_days,
    SAFE_DIVIDE(
      SUM(CASE WHEN dealstage = 'closedwon' THEN COALESCE(amount, 0) ELSE 0 END),
      SUM(CASE WHEN dealstage = 'closedwon' AND sales_cycle_days IS NOT NULL THEN sales_cycle_days ELSE NULL END)
    ) * 30 AS pipeline_velocity_30d
  FROM (
    SELECT *, DATE_TRUNC(DATE(createdate), QUARTER) AS create_quarter, '30d' AS trailing_window FROM windowed_deals WHERE in_window_30d
    UNION ALL
    SELECT *, DATE_TRUNC(DATE(createdate), QUARTER) AS create_quarter, '90d' AS trailing_window FROM windowed_deals WHERE in_window_90d
    UNION ALL
    SELECT *, DATE_TRUNC(DATE(createdate), QUARTER) AS create_quarter, '180d' AS trailing_window FROM windowed_deals WHERE in_window_180d
    UNION ALL
    SELECT *, DATE_TRUNC(DATE(createdate), QUARTER) AS create_quarter, 'all' AS trailing_window FROM windowed_deals WHERE in_window_all
  )
  GROUP BY create_quarter, trailing_window
)

SELECT * FROM by_rep
UNION ALL
SELECT * FROM by_create_month
UNION ALL
SELECT * FROM by_create_quarter;
