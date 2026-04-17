-- ============================================================
-- Activity Matrix View
-- Dataset: revops_analytics.activity_matrix_view
-- Source: HubSpot_Airbyte.engagements, HubSpot_Airbyte.owners
--
-- Provides activity counts per rep for the Command Center
-- Activity Matrix & Pipeline Defense section.
--
-- Metrics per rep:
--   - calls_count: COUNT of call engagements
--   - emails_count: COUNT of email engagements
--   - meetings_count: COUNT of meeting engagements
--   - prospecting_count: COUNT of prospecting activities
--
-- Usage:
--   SELECT * FROM revops_analytics.activity_matrix_view
--   ORDER BY owner_name, calls_count DESC
-- ============================================================

CREATE OR REPLACE VIEW `gen-lang-client-0844868008.revops_analytics.activity_matrix_view` AS

WITH

-- ============================================================
-- SECTION 1: Owner Lookup
-- ============================================================
-- Pulls distinct owners for activity attribution.

owners_data AS (
  SELECT
    SAFE_CAST(o.id AS STRING) AS owner_id,
    COALESCE(
      o.firstName,
      REGEXP_EXTRACT(o.email, r'^([^@]+)')
    ) AS owner_first_name,
    COALESCE(o.lastName, '') AS owner_last_name,
    CONCAT(
      COALESCE(o.firstName, REGEXP_EXTRACT(o.email, r'^([^@]+)')),
      ' ',
      COALESCE(o.lastName, '')
    ) AS owner_name,
    o.email AS owner_email
  FROM `gen-lang-client-0844868008.HubSpot_Airbyte.owners` o
  WHERE o.archived = FALSE
),

-- ============================================================
-- SECTION 2: Engagement Data (Placeholder)
-- ============================================================
-- Placeholder for HubSpot engagements data. Requires Airbyte sync.
-- Once synced, engagements will have owner_id and type fields.
--
-- Future query structure:
--   SELECT
--     SAFE_CAST(e.properties_hubspot_owner_id AS STRING) AS owner_id,
--     LOWER(e.properties_engagement_type) AS engagement_type,
--     COUNT(*) AS engagement_count
--   FROM HubSpot_Airbyte.engagements e
--   WHERE e.archived = FALSE
--   GROUP BY 1, 2

engagements_placeholder AS (
  SELECT
    o.owner_id,
    o.owner_name,
    'calls' AS engagement_type,
    0 AS engagement_count
  FROM owners_data o
  WHERE FALSE  -- Returns no rows; replace with real engagements query

  UNION ALL

  SELECT
    o.owner_id,
    o.owner_name,
    'emails' AS engagement_type,
    0 AS engagement_count
  FROM owners_data o
  WHERE FALSE

  UNION ALL

  SELECT
    o.owner_id,
    o.owner_name,
    'meetings' AS engagement_type,
    0 AS engagement_count
  FROM owners_data o
  WHERE FALSE

  UNION ALL

  SELECT
    o.owner_id,
    o.owner_name,
    'prospecting' AS engagement_type,
    0 AS engagement_count
  FROM owners_data o
  WHERE FALSE
),

-- ============================================================
-- SECTION 3: Calls Count per Owner
-- ============================================================

calls_count AS (
  SELECT
    owner_id,
    owner_name,
    SUM(engagement_count) AS calls_count
  FROM engagements_placeholder
  WHERE engagement_type = 'calls'
  GROUP BY owner_id, owner_name
),

-- ============================================================
-- SECTION 4: Emails Count per Owner
-- ============================================================

emails_count AS (
  SELECT
    owner_id,
    owner_name,
    SUM(engagement_count) AS emails_count
  FROM engagements_placeholder
  WHERE engagement_type = 'emails'
  GROUP BY owner_id, owner_name
),

-- ============================================================
-- SECTION 5: Meetings Count per Owner
-- ============================================================

meetings_count AS (
  SELECT
    owner_id,
    owner_name,
    SUM(engagement_count) AS meetings_count
  FROM engagements_placeholder
  WHERE engagement_type = 'meetings'
  GROUP BY owner_id, owner_name
),

-- ============================================================
-- SECTION 6: Prospecting Count per Owner
-- ============================================================

prospecting_count AS (
  SELECT
    owner_id,
    owner_name,
    SUM(engagement_count) AS prospecting_count
  FROM engagements_placeholder
  WHERE engagement_type = 'prospecting'
  GROUP BY owner_id, owner_name
),

-- ============================================================
-- SECTION 7: Combine All Activity Metrics
-- ============================================================

combined AS (
  SELECT
    o.owner_id,
    o.owner_name,
    COALESCE(c.calls_count, 0) AS calls_count,
    COALESCE(e.emails_count, 0) AS emails_count,
    COALESCE(m.meetings_count, 0) AS meetings_count,
    COALESCE(p.prospecting_count, 0) AS prospecting_count
  FROM owners_data o
  LEFT JOIN calls_count c ON o.owner_id = c.owner_id
  LEFT JOIN emails_count e ON o.owner_id = e.owner_id
  LEFT JOIN meetings_count m ON o.owner_id = m.owner_id
  LEFT JOIN prospecting_count p ON o.owner_id = p.owner_id
)

-- ============================================================
-- SECTION 8: Final Output
-- ============================================================

SELECT
  owner_id,
  COALESCE(owner_name, 'Unknown') AS owner_name,
  calls_count,
  emails_count,
  meetings_count,
  prospecting_count,
  (calls_count + emails_count + meetings_count + prospecting_count) AS total_activities,
  CURRENT_TIMESTAMP() AS _loaded_at
FROM combined
WHERE owner_id IS NOT NULL
ORDER BY owner_name, total_activities DESC;
