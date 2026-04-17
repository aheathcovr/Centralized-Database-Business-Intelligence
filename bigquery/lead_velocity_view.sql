-- ============================================================
-- Lead Velocity View
-- Dataset: revops_analytics.lead_velocity_view
-- Source: HubSpot_Airbyte.deals, HubSpot_Airbyte.contacts
--
-- Provides lead conversion metrics for the Command Center
-- Generation & Top of Funnel section.
--
-- Metrics:
--   - total_leads: COUNT of leads/contacts created in period
--   - conversion_rate: Leads with won deals / total_leads * 100
--   - avg_time_to_first_touch_days: AVG days from lead creation to first engagement
--   - period_label: MTD, QTD, YTD
--
-- Usage:
--   SELECT * FROM revops_analytics.lead_velocity_view
--   ORDER BY period_label
-- ============================================================

CREATE OR REPLACE VIEW `gen-lang-client-0844868008.revops_analytics.lead_velocity_view` AS

WITH

-- ============================================================
-- SECTION 1: Contact/Lead Data
-- ============================================================
-- Pulls contacts with creation dates for lead metrics.

contacts_data AS (
  SELECT
    c.id AS contact_id,
    SAFE_CAST(c.properties_createdate AS TIMESTAMP) AS createdate,
    c.properties_email AS email
  FROM `gen-lang-client-0844868008.HubSpot_Airbyte.contacts` c
  WHERE c.archived = FALSE
    AND c.properties_createdate IS NOT NULL
),

-- ============================================================
-- SECTION 2: Deal Data for Conversion Tracking
-- ============================================================
-- Links deals to contacts via associations for conversion calc.

deals_with_contacts AS (
  SELECT
    d.id AS deal_id,
    d.properties_hubspot_owner_id AS owner_id,
    COALESCE(d.properties_hs_is_closed_won, FALSE) AS is_closed_won,
    COALESCE(d.properties_hs_arr, SAFE_CAST(d.properties_amount AS FLOAT64), 0) AS deal_arr,
    SAFE_CAST(d.properties_createdate AS TIMESTAMP) AS deal_createdate,
    SAFE_CAST(d.properties_closedate AS TIMESTAMP) AS deal_closedate,
    assoc.email AS contact_email
  FROM `gen-lang-client-0844868008.HubSpot_Airbyte.deals` d
  LEFT JOIN `gen-lang-client-0844868008.HubSpot_Airbyte.deal_associations` assoc
    ON d.id = assoc.deal_id
  WHERE d.archived = FALSE
),

-- ============================================================
-- SECTION 3: Date Boundaries
-- ============================================================
-- Calculates MTD, QTD, YTD start dates.

date_boundaries AS (
  SELECT
    DATE_TRUNC(CURRENT_DATE(), DAY) AS today,
    DATE_TRUNC(CURRENT_DATE(), MONTH) AS mtd_start,
    DATE_TRUNC(CURRENT_DATE(), QUARTER) AS qtd_start,
    DATE_TRUNC(CURRENT_DATE(), YEAR) AS ytd_start
  FROM contacts_data
  LIMIT 1
),

-- ============================================================
-- SECTION 4: Leads by Period
-- ============================================================
-- Counts total leads created in each period.

leads_by_period AS (
  SELECT
    db.mtd_start AS period_start,
    'MTD' AS period_label,
    COUNT(*) AS total_leads
  FROM contacts_data c
  CROSS JOIN date_boundaries db
  WHERE DATE(c.createdate) >= db.mtd_start

  UNION ALL

  SELECT
    db.qtd_start AS period_start,
    'QTD' AS period_label,
    COUNT(*) AS total_leads
  FROM contacts_data c
  CROSS JOIN date_boundaries db
  WHERE DATE(c.createdate) >= db.qtd_start

  UNION ALL

  SELECT
    db.ytd_start AS period_start,
    'YTD' AS period_label,
    COUNT(*) AS total_leads
  FROM contacts_data c
  CROSS JOIN date_boundaries db
  WHERE DATE(c.createdate) >= db.ytd_start
),

-- ============================================================
-- SECTION 5: Converted Leads (with Won Deals)
-- ============================================================
-- Counts leads that have at least one won deal.

converted_leads AS (
  SELECT
    CASE
      WHEN DATE(d.deal_closedate) >= db.mtd_start THEN 'MTD'
      WHEN DATE(d.deal_closedate) >= db.qtd_start THEN 'QTD'
      WHEN DATE(d.deal_closedate) >= db.ytd_start THEN 'YTD'
    END AS period_label,
    COUNT(DISTINCT assoc.contact_id) AS converted_leads
  FROM deals_with_contacts d
  CROSS JOIN date_boundaries db
  LEFT JOIN `gen-lang-client-0844868008.HubSpot_Airbyte.deal_associations` assoc
    ON d.deal_id = assoc.deal_id
  WHERE d.is_closed_won = TRUE
    AND assoc.contact_id IS NOT NULL
    AND (
      DATE(d.deal_closedate) >= db.mtd_start
      OR DATE(d.deal_closedate) >= db.qtd_start
      OR DATE(d.deal_closedate) >= db.ytd_start
    )
  GROUP BY period_label
),

-- ============================================================
-- SECTION 6: First Touch Days (Engagement Tracking)
-- ============================================================
-- Placeholder for engagement data. Requires HubSpot engagements sync.
-- AVG days from contact creation to first call/email/meeting.

first_touch_placeholder AS (
  SELECT
    'MTD' AS period_label,
    NULL AS avg_time_to_first_touch_days
  UNION ALL
  SELECT
    'QTD' AS period_label,
    NULL AS avg_time_to_first_touch_days
  UNION ALL
  SELECT
    'YTD' AS period_label,
    NULL AS avg_time_to_first_touch_days
),

-- ============================================================
-- SECTION 7: Combine Metrics by Period
-- ============================================================

combined AS (
  SELECT
    l.period_start,
    l.period_label,
    l.total_leads,
    COALESCE(c.converted_leads, 0) AS converted_leads,
    ROUND(SAFE_DIVIDE(c.converted_leads, l.total_leads) * 100, 1) AS conversion_rate,
    COALESCE(f.avg_time_to_first_touch_days, 0) AS avg_time_to_first_touch_days
  FROM leads_by_period l
  LEFT JOIN converted_leads c ON l.period_label = c.period_label
  LEFT JOIN first_touch_placeholder f ON l.period_label = f.period_label
)

-- ============================================================
-- SECTION 8: Final Output
-- ============================================================

SELECT
  period_start,
  period_label,
  total_leads,
  converted_leads,
  conversion_rate,
  avg_time_to_first_touch_days,
  CURRENT_TIMESTAMP() AS _loaded_at
FROM combined
ORDER BY
  CASE period_label
    WHEN 'MTD' THEN 1
    WHEN 'QTD' THEN 2
    WHEN 'YTD' THEN 3
  END;
