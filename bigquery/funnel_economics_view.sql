-- ============================================================
-- Funnel Economics View
-- Dataset: revops_analytics.funnel_economics_view
-- Source: HubSpot_Airbyte.deals, HubSpot_Airbyte.contacts
--
-- Provides funnel economics broken down by lead source and customer type
-- (facility vs corporate) for the Command Center EconomicsTabs component.
--
-- Metrics per lead_source:
--   - facility_deal_count: COUNT of deals for facility type
--   - facility_win_rate_pct: Win rate for facility deals
--   - facility_avg_arr: AVG amount for facility deals
--   - corporate_deal_count: COUNT of deals for corporate type
--   - corporate_win_rate_pct: Win rate for corporate deals
--   - corporate_avg_arr: AVG amount for corporate deals
--
-- Usage:
--   SELECT * FROM revops_analytics.funnel_economics_view
--   ORDER BY lead_source, corporate_deal_count DESC
-- ============================================================

CREATE OR REPLACE VIEW `gen-lang-client-0844868008.revops_analytics.funnel_economics_view` AS

WITH

-- ============================================================
-- SECTION 1: Deal Data with Type Classification
-- ============================================================
-- Pulls deals with customer type (facility/corporate) from company associations.

deal_data AS (
  SELECT
    d.id AS deal_id,
    LOWER(COALESCE(d.properties_lead_source, 'unknown')) AS lead_source,
    SAFE_CAST(d.properties_amount AS FLOAT64) AS amount,
    SAFE_CAST(d.properties_hs_arr AS FLOAT64) AS arr,
    COALESCE(d.properties_hs_is_closed_won, FALSE) AS is_closed_won,
    COALESCE(d.properties_hs_is_closed, FALSE) AS is_closed,
    -- Determine customer type from associated company properties
    LOWER(COALESCE(
      comp.properties_company_type,
      comp.properties_customer_type,
      'facility'
    )) AS customer_type
  FROM `gen-lang-client-0844868008.HubSpot_Airbyte.deals` d
  LEFT JOIN `gen-lang-client-0844868008.HubSpot_Airbyte.deal_associations` assoc
    ON d.id = assoc.deal_id
  LEFT JOIN `gen-lang-client-0844868008.HubSpot_Airbyte.companies` comp
    ON assoc.company_id = comp.id
  WHERE d.archived = FALSE
),

-- ============================================================
-- SECTION 2: Facility Metrics by Lead Source
-- ============================================================
-- Aggregates deal counts, win rates, and AVG ARR for facility deals.

facility_metrics AS (
  SELECT
    deal_data.lead_source,
    COUNT(*) AS facility_deal_count,
    ROUND(SAFE_DIVIDE(
      COUNTIF(deal_data.is_closed_won = TRUE),
      COUNTIF(deal_data.is_closed = TRUE)
    ) * 100, 1) AS facility_win_rate_pct,
    ROUND(AVG(COALESCE(deal_data.amount, deal_data.arr, 0)), 2) AS facility_avg_arr
  FROM deal_data
  WHERE deal_data.customer_type = 'facility'
    OR deal_data.customer_type LIKE '%facility%'
    OR deal_data.customer_type NOT IN ('corporate', 'account', 'company')
  GROUP BY deal_data.lead_source
),

-- ============================================================
-- SECTION 3: Corporate Metrics by Lead Source
-- ============================================================
-- Aggregates deal counts, win rates, and AVG ARR for corporate deals.

corporate_metrics AS (
  SELECT
    deal_data.lead_source,
    COUNT(*) AS corporate_deal_count,
    ROUND(SAFE_DIVIDE(
      COUNTIF(deal_data.is_closed_won = TRUE),
      COUNTIF(deal_data.is_closed = TRUE)
    ) * 100, 1) AS corporate_win_rate_pct,
    ROUND(AVG(COALESCE(deal_data.amount, deal_data.arr, 0)), 2) AS corporate_avg_arr
  FROM deal_data
  WHERE deal_data.customer_type IN ('corporate', 'account', 'company')
    OR deal_data.customer_type LIKE '%corporate%'
    OR deal_data.customer_type LIKE '%account%'
  GROUP BY deal_data.lead_source
),

-- ============================================================
-- SECTION 4: Combine Facility and Corporate Metrics
-- ============================================================

combined AS (
  SELECT
    COALESCE(f.lead_source, c.lead_source) AS lead_source,
    COALESCE(f.facility_deal_count, 0) AS facility_deal_count,
    COALESCE(f.facility_win_rate_pct, 0) AS facility_win_rate_pct,
    COALESCE(f.facility_avg_arr, 0) AS facility_avg_arr,
    COALESCE(c.corporate_deal_count, 0) AS corporate_deal_count,
    COALESCE(c.corporate_win_rate_pct, 0) AS corporate_win_rate_pct,
    COALESCE(c.corporate_avg_arr, 0) AS corporate_avg_arr
  FROM facility_metrics f
  FULL OUTER JOIN corporate_metrics c ON f.lead_source = c.lead_source
)

-- ============================================================
-- SECTION 5: Final Output
-- ============================================================

SELECT
  COALESCE(lead_source, 'unknown') AS lead_source,
  facility_deal_count,
  facility_win_rate_pct,
  facility_avg_arr,
  corporate_deal_count,
  corporate_win_rate_pct,
  corporate_avg_arr,
  (facility_deal_count + corporate_deal_count) AS total_deal_count,
  CURRENT_TIMESTAMP() AS _loaded_at
FROM combined
ORDER BY total_deal_count DESC, lead_source;
