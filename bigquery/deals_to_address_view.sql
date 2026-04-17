-- Deals to Address View
-- Created: 2026-04-17
-- Dataset: revops_analytics.deals_to_address_view
-- Source: HubSpot_Airbyte.deals, HubSpot_Airbyte.owners
--
-- Shows open deals with close dates in the past that need attention.
-- Helps identify deals that may need to be pushed, lost, or have updated close dates.
--
-- Usage:
--   SELECT * FROM revops_analytics.deals_to_address_view
--   ORDER BY days_past_close DESC

CREATE OR REPLACE VIEW `gen-lang-client-0844868008.revops_analytics.deals_to_address_view` AS

WITH

-- ============================================================
-- SECTION 1: Deal Owner Lookup
-- ============================================================
-- Pull open deal data with owner names and notes.

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
    LOWER(COALESCE(d.properties_dealstage, '')) AS dealstage,
    COALESCE(d.properties_closed_lost_reason, '') AS closed_lost_reason,
    COALESCE(d.properties_hs_note_body, '') AS notes,
    d.archived
  FROM `gen-lang-client-0844868008.HubSpot_Airbyte.deals` d
  LEFT JOIN `gen-lang-client-0844868008.HubSpot_Airbyte.owners` o
    ON SAFE_CAST(d.properties_hubspot_owner_id AS STRING) = SAFE_CAST(o.id AS STRING)
  WHERE d.archived = FALSE
    AND COALESCE(d.properties_hs_is_closed_won, FALSE) = FALSE
    AND COALESCE(d.properties_hs_is_closed, FALSE) = FALSE
),

-- ============================================================
-- SECTION 2: Filter to Past Close Dates
-- ============================================================
-- Only include deals where close date is before today.

past_close_deals AS (
  SELECT
    deal_id,
    deal_name,
    owner_name,
    amount,
    closedate,
    dealstage AS stage_name,
    CASE
      WHEN closed_lost_reason IS NOT NULL AND closed_lost_reason != '' THEN closed_lost_reason
      WHEN notes IS NOT NULL AND notes != '' THEN notes
      ELSE NULL
    END AS notes,
    DATE_DIFF(CURRENT_DATE(), DATE(closedate), DAY) AS days_past_close
  FROM deal_base
  WHERE closedate IS NOT NULL
    AND DATE(closedate) < CURRENT_DATE()
),

-- ============================================================
-- SECTION 3: Final Output
-- ============================================================
-- Add metadata and sort by days past close.

final_output AS (
  SELECT
    deal_id,
    deal_name,
    owner_name,
    amount,
    closedate,
    days_past_close,
    stage_name,
    notes,
    CURRENT_TIMESTAMP() AS _loaded_at
  FROM past_close_deals
  WHERE days_past_close > 0
)

SELECT * FROM final_output
ORDER BY days_past_close DESC, amount DESC;
