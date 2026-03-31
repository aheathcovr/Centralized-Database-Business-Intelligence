-- Pipeline Generation Dashboard Data Model
-- Created: 2026-03-30
-- Dataset: revops_analytics.pipeline_generation_view
-- Source: HubSpot_Airbyte.deal, HubSpot_Airbyte.owner
--
-- Aggregates pipeline generation metrics by rep and period (month/quarter).
-- Shows deals created (new pipeline entered), deal amounts, and meetings booked.
--
-- Metrics per rep per period:
--   - deals_created (count of new deals entered into pipeline)
--   - pipeline_amount (sum of deal amounts created)
--   - avg_deal_amount (average deal size for created deals)
--   - meetings_booked (placeholder — requires HubSpot engagements sync)
--
-- Usage:
--   SELECT * FROM revops_analytics.pipeline_generation_view
--   ORDER BY period_start DESC, pipeline_amount DESC

CREATE OR REPLACE VIEW `gen-lang-client-0844868008.revops_analytics.pipeline_generation_view` AS

WITH

-- ============================================================
-- SECTION 1: Deal Owner Lookup
-- ============================================================
-- Pull distinct deals with owner metadata from HubSpot.

deal_owners AS (
  SELECT
    d.id AS deal_id,
    d.owner_id,
    COALESCE(o.email, CONCAT('owner_', CAST(d.owner_id AS STRING))) AS owner_email,
    COALESCE(
      o.firstname,
      REGEXP_EXTRACT(o.email, r'^([^@]+)')
    ) AS owner_first_name,
    COALESCE(o.lastname, '') AS owner_last_name,
    CONCAT(
      COALESCE(o.firstname, REGEXP_EXTRACT(o.email, r'^([^@]+)')),
      ' ',
      COALESCE(o.lastname, '')
    ) AS owner_full_name,
    d.amount,
    d.dealstage,
    d.createdate,
    d.closedate,
    d.pipeline
  FROM `gen-lang-client-0844868008.HubSpot_Airbyte.deal` d
  LEFT JOIN `gen-lang-client-0844868008.HubSpot_Airbyte.owner` o
    ON d.owner_id = o.owner_id
  WHERE d.owner_id IS NOT NULL
    AND d.archived = FALSE
    AND d.createdate IS NOT NULL
),

-- ============================================================
-- SECTION 2: Month Calendar
-- ============================================================
-- One row per month from Jan 2024 through current month.

month_calendar AS (
  SELECT
    month_start,
    LAST_DAY(month_start, MONTH) AS month_end,
    FORMAT_DATE('%b-%y', month_start) AS month_label,
    -- Quarter info for grouping
    DATE_TRUNC(month_start, QUARTER) AS quarter_start,
    FORMAT('Q%d %d', EXTRACT(QUARTER FROM month_start), EXTRACT(YEAR FROM month_start)) AS quarter_label
  FROM UNNEST(
    GENERATE_DATE_ARRAY(
      DATE(2024, 1, 1),
      DATE_TRUNC(CURRENT_DATE(), MONTH),
      INTERVAL 1 MONTH
    )
  ) AS month_start
),

-- ============================================================
-- SECTION 3: Deals Created per Rep per Month
-- ============================================================
-- Count deals that were created (entered pipeline) in each month.

deals_created_monthly AS (
  SELECT
    mc.month_start AS period_start,
    mc.month_label AS period_label,
    mc.quarter_start,
    mc.quarter_label,
    do.owner_id,
    do.owner_full_name,
    'monthly' AS period_type,
    COUNT(*) AS deals_created,
    SUM(COALESCE(do.amount, 0)) AS pipeline_amount,
    AVG(COALESCE(do.amount, 0)) AS avg_deal_amount
  FROM deal_owners do
  JOIN month_calendar mc
    ON DATE_TRUNC(do.createdate, MONTH) = mc.month_start
  GROUP BY mc.month_start, mc.month_label, mc.quarter_start, mc.quarter_label,
           do.owner_id, do.owner_full_name
),

-- ============================================================
-- SECTION 4: Deals Created per Rep per Quarter
-- ============================================================
-- Aggregate monthly data to quarterly for the quarterly view.

deals_created_quarterly AS (
  SELECT
    mc.quarter_start AS period_start,
    mc.quarter_label AS period_label,
    mc.quarter_start,
    mc.quarter_label,
    do.owner_id,
    do.owner_full_name,
    'quarterly' AS period_type,
    COUNT(*) AS deals_created,
    SUM(COALESCE(do.amount, 0)) AS pipeline_amount,
    AVG(COALESCE(do.amount, 0)) AS avg_deal_amount
  FROM deal_owners do
  JOIN month_calendar mc
    ON DATE_TRUNC(do.createdate, MONTH) = mc.month_start
  GROUP BY mc.quarter_start, mc.quarter_label, do.owner_id, do.owner_full_name
),

-- ============================================================
-- SECTION 5: Meetings Booked (Placeholder)
-- ============================================================
-- Once HubSpot engagements/calls data is synced via Airbyte,
-- replace this CTE with a real query against the engagements table.
-- Example future query:
--   SELECT owner_id, DATE_TRUNC(createdate, MONTH) AS month_start,
--     COUNT(*) AS meetings_booked
--   FROM HubSpot_Airbyte.engagements
--   WHERE type = 'MEETING' AND archived = FALSE
--   GROUP BY 1, 2

meetings_monthly AS (
  SELECT
    owner_id,
    DATE_TRUNC(createdate, MONTH) AS month_start,
    0 AS meetings_booked  -- Placeholder until HubSpot engagements are synced
  FROM deal_owners
  WHERE FALSE  -- Returns no rows; will be replaced with real meetings query
  GROUP BY owner_id, DATE_TRUNC(createdate, MONTH)
),

meetings_quarterly AS (
  SELECT
    owner_id,
    quarter_start,
    0 AS meetings_booked  -- Placeholder
  FROM (
    SELECT
      owner_id,
      DATE_TRUNC(createdate, QUARTER) AS quarter_start
    FROM deal_owners
    WHERE FALSE
  )
  GROUP BY owner_id, quarter_start
),

-- ============================================================
-- SECTION 6: Final Monthly Output
-- ============================================================

monthly_output AS (
  SELECT
    d.period_start,
    d.period_label,
    d.quarter_start,
    d.quarter_label,
    d.owner_id,
    d.owner_full_name,
    d.period_type,
    d.deals_created,
    d.pipeline_amount,
    d.avg_deal_amount,
    COALESCE(m.meetings_booked, 0) AS meetings_booked,
    CURRENT_TIMESTAMP() AS _loaded_at
  FROM deals_created_monthly d
  LEFT JOIN meetings_monthly m
    ON d.owner_id = m.owner_id AND d.period_start = m.month_start
),

-- ============================================================
-- SECTION 7: Final Quarterly Output
-- ============================================================

quarterly_output AS (
  SELECT
    d.period_start,
    d.period_label,
    d.quarter_start,
    d.quarter_label,
    d.owner_id,
    d.owner_full_name,
    d.period_type,
    d.deals_created,
    d.pipeline_amount,
    d.avg_deal_amount,
    COALESCE(m.meetings_booked, 0) AS meetings_booked,
    CURRENT_TIMESTAMP() AS _loaded_at
  FROM deals_created_quarterly d
  LEFT JOIN meetings_quarterly m
    ON d.owner_id = m.owner_id AND d.quarter_start = m.quarter_start
)

-- ============================================================
-- SECTION 8: Union Monthly + Quarterly
-- ============================================================
-- The API can filter by period_type to show one or the other.

SELECT * FROM monthly_output
UNION ALL
SELECT * FROM quarterly_output
ORDER BY period_type, period_start DESC, pipeline_amount DESC;
