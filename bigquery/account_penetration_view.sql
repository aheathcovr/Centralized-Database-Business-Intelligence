-- ============================================================
-- Account Penetration View (Covr Singles)
-- Dataset: revops_analytics.account_penetration_view
-- Source: HubSpot_Airbyte.deals, HubSpot_Airbyte.companies
--
-- Provides account penetration metrics for the Command Center
-- "Covr Singles" section. Shows deals won by parent company per month.
--
-- Metrics per month per parent company:
--   - month_start: First day of month
--   - month_label: FORMAT_DATE('%b-%y', month_start)
--   - parent_company_name: Corporation/parent company name
--   - deals_won_count: COUNT of won deals for this parent
--
-- Usage:
--   SELECT * FROM revops_analytics.account_penetration_view
--   ORDER BY month_start DESC, deals_won_count DESC
-- ============================================================

CREATE OR REPLACE VIEW `gen-lang-client-0844868008.revops_analytics.account_penetration_view` AS

WITH

-- ============================================================
-- SECTION 1: Deal Data with Company Info
-- ============================================================
-- Pulls deals with associated company names for account grouping.

deal_data AS (
  SELECT
    d.id AS deal_id,
    COALESCE(d.properties_hs_is_closed_won, FALSE) AS is_closed_won,
    SAFE_CAST(d.properties_amount AS FLOAT64) AS amount,
    SAFE_CAST(d.properties_hs_arr AS FLOAT64) AS arr,
    SAFE_CAST(d.properties_createdate AS TIMESTAMP) AS createdate,
    SAFE_CAST(d.properties_closedate AS TIMESTAMP) AS closedate,
    -- Get parent company name from associated company
    COALESCE(
      comp.properties_name,
      comp.properties_company_name,
      'Unknown'
    ) AS parent_company_name,
    -- Get corporation/facility hierarchy info
    comp.properties_company_type AS company_type
  FROM `gen-lang-client-0844868008.HubSpot_Airbyte.deals` d
  LEFT JOIN `gen-lang-client-0844868008.HubSpot_Airbyte.deal_associations` assoc
    ON d.id = assoc.deal_id
  LEFT JOIN `gen-lang-client-0844868008.HubSpot_Airbyte.companies` comp
    ON assoc.company_id = comp.id
  WHERE d.archived = FALSE
),

-- ============================================================
-- SECTION 2: Month Calendar
-- ============================================================
-- One row per month from Jan 2024 through current month.

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
-- SECTION 3: Deals Won by Account and Month
-- ============================================================
-- Counts won deals per parent company per month.

deals_won_by_account AS (
  SELECT
    mc.month_start,
    mc.month_label,
    d.parent_company_name,
    COUNT(*) AS deals_won_count
  FROM deal_data d
  JOIN month_calendar mc
    ON DATE(DATE_TRUNC(d.closedate, MONTH)) = mc.month_start
  WHERE d.is_closed_won = TRUE
    AND d.closedate IS NOT NULL
  GROUP BY mc.month_start, mc.month_label, d.parent_company_name
),

-- ============================================================
-- SECTION 4: Rank Deals by Volume within Month
-- ============================================================
-- Adds ranking to identify top accounts per month.

ranked_accounts AS (
  SELECT
    month_start,
    month_label,
    parent_company_name,
    deals_won_count,
    ROW_NUMBER() OVER (
      PARTITION BY month_start
      ORDER BY deals_won_count DESC, parent_company_name
    ) AS account_rank
  FROM deals_won_by_account
)

-- ============================================================
-- SECTION 5: Final Output
-- ============================================================

SELECT
  month_start,
  COALESCE(month_label, '') AS month_label,
  COALESCE(parent_company_name, 'Unknown') AS parent_company_name,
  COALESCE(deals_won_count, 0) AS deals_won_count,
  CURRENT_TIMESTAMP() AS _loaded_at
FROM ranked_accounts
WHERE account_rank <= 20  -- Top 20 accounts per month
ORDER BY month_start DESC, deals_won_count DESC;
