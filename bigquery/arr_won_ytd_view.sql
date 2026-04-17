-- ARR Won YTD View
-- Created: 2026-04-17
-- Dataset: revops_analytics.arr_won_ytd_view
-- Source: HubSpot_Airbyte.deals, HubSpot_Airbyte.owners
--
-- Aggregates ARR won by owner and period (monthly/quarterly) for YTD analysis.
-- Shows closedwon deals grouped by close month/quarter and deal owner.
--
-- Usage:
--   SELECT * FROM revops_analytics.arr_won_ytd_view
--   WHERE period_start >= '2026-01-01'

CREATE OR REPLACE VIEW `gen-lang-client-0844868008.revops_analytics.arr_won_ytd_view` AS

WITH

-- ============================================================
-- SECTION 1: Deal Owner Lookup
-- ============================================================
-- Pull deal data with owner names and closed-won flag.

deal_base AS (
  SELECT
    d.id AS deal_id,
    d.properties_hubspot_owner_id AS owner_id,
    COALESCE(o.email, CONCAT('owner_', CAST(d.properties_hubspot_owner_id AS STRING))) AS owner_email,
    CONCAT(
      COALESCE(o.firstName, REGEXP_EXTRACT(o.email, r'^([^@]+)')),
      ' ',
      COALESCE(o.lastName, '')
    ) AS deal_owner_name,
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
-- SECTION 2: Filter to Closed Won Deals
-- ============================================================
-- Only include deals that were actually closed won.

closed_won_deals AS (
  SELECT
    deal_id,
    owner_id,
    deal_owner_name,
    amount,
    closedate,
    DATE_TRUNC(closedate, MONTH) AS close_month,
    DATE_TRUNC(closedate, QUARTER) AS close_quarter
  FROM deal_base
  WHERE is_closed_won = TRUE
    AND closedate IS NOT NULL
    AND closedate >= TIMESTAMP('2024-01-01')
),

-- ============================================================
-- SECTION 3: Monthly Aggregation
-- ============================================================
-- ARR and deal counts by owner and month.

monthly_agg AS (
  SELECT
    DATE_TRUNC(close_month, MONTH) AS period_start,
    FORMAT_DATE('%b-%Y', DATE_TRUNC(close_month, MONTH)) AS period_label,
    'monthly' AS period_type,
    COALESCE(owner_id, 'unknown') AS owner_id,
    COALESCE(deal_owner_name, 'Unknown Owner') AS deal_owner_name,
    SUM(COALESCE(amount, 0)) AS arr_won,
    COUNT(*) AS deals_won_count
  FROM closed_won_deals
  GROUP BY
    DATE_TRUNC(close_month, MONTH),
    owner_id,
    deal_owner_name
),

-- ============================================================
-- SECTION 4: Quarterly Aggregation
-- ============================================================
-- ARR and deal counts by owner and quarter.

quarterly_agg AS (
  SELECT
    DATE_TRUNC(close_quarter, QUARTER) AS period_start,
    CONCAT('Q', EXTRACT(QUARTER FROM close_quarter), '-', CAST(EXTRACT(YEAR FROM close_quarter) AS STRING)) AS period_label,
    'quarterly' AS period_type,
    COALESCE(owner_id, 'unknown') AS owner_id,
    COALESCE(deal_owner_name, 'Unknown Owner') AS deal_owner_name,
    SUM(COALESCE(amount, 0)) AS arr_won,
    COUNT(*) AS deals_won_count
  FROM closed_won_deals
  GROUP BY
    DATE_TRUNC(close_quarter, QUARTER),
    owner_id,
    deal_owner_name
),

-- ============================================================
-- SECTION 5: Combine Monthly and Quarterly
-- ============================================================
-- Stack monthly and quarterly results into single output.

combined AS (
  SELECT
    period_start,
    period_label,
    period_type,
    deal_owner_name,
    arr_won,
    deals_won_count
  FROM monthly_agg

  UNION ALL

  SELECT
    period_start,
    period_label,
    period_type,
    deal_owner_name,
    arr_won,
    deals_won_count
  FROM quarterly_agg
),

-- ============================================================
-- SECTION 6: Final Output
-- ============================================================
-- Add totals and metadata.

final_output AS (
  SELECT
    period_start,
    period_label,
    period_type,
    deal_owner_name,
    arr_won,
    deals_won_count,
    CURRENT_TIMESTAMP() AS _loaded_at
  FROM combined

  UNION ALL

  -- Monthly totals
  SELECT
    period_start,
    period_label,
    period_type,
    'Total' AS deal_owner_name,
    SUM(arr_won) AS arr_won,
    SUM(deals_won_count) AS deals_won_count,
    CURRENT_TIMESTAMP() AS _loaded_at
  FROM monthly_agg
  GROUP BY period_start, period_label, period_type

  UNION ALL

  -- Quarterly totals
  SELECT
    period_start,
    period_label,
    period_type,
    'Total' AS deal_owner_name,
    SUM(arr_won) AS arr_won,
    SUM(deals_won_count) AS deals_won_count,
    CURRENT_TIMESTAMP() AS _loaded_at
  FROM quarterly_agg
  GROUP BY period_start, period_label, period_type
)

SELECT * FROM final_output
ORDER BY period_start DESC, period_type, deal_owner_name;
