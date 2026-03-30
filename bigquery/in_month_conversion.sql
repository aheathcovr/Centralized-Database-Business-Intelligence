-- In-Month Conversion View
-- Created: 2026-03-30
-- Dataset: revops_analytics.in_month_conversion
-- Source: HubSpot_Airbyte (Fivetran connector) - deal, deal_property_history, deal_stage tables
--
-- Metric: % Won vs Entering Expected = Won / (Won + Lost + Pushed)
--
-- Measures what percentage of deals that entered a month in an expected-to-close
-- pipeline stage actually closed won by month-end, vs were lost or pushed out.
--
-- Three parts:
--   1. Start of Month Pipeline Snapshot (deal_property_history at 23:59:59 prior day)
--   2. End of Month Actuals (Won/Lost/Pushed with origin attribution: Expected, Later Month, Created)
--   3. Final Output Metric (% Won vs Entering Expected) pivotable by month columns
--
-- Usage:
--   SELECT * FROM revops_analytics.in_month_conversion
--   -- Pivot by month_label in BI tool: Jun-25, Jul-25, Aug-25, etc.
--   -- Drill by: expected_stage_label, month_number, deal_owner_id

CREATE OR REPLACE VIEW `gen-lang-client-0844868008.revops_analytics.in_month_conversion` AS

WITH

-- ============================================================
-- CONFIG: Deal Pipeline Stage Definitions
-- ============================================================
-- Adjust these to match your HubSpot pipeline configuration.
-- These represent "open" stages where a deal is expected to close
-- in the current month. Stages are ordered by progression.
--
-- Typical HubSpot default stages:
--   appointmentscheduled, qualifiedtobuy, presentationscheduled,
--   decisionmakerboughtin, contractsent, closedwon, closedlost

pipeline_stage_config AS (
  SELECT * FROM UNNEST([
    STRUCT('appointmentscheduled' AS stage_id, 'Appointment Scheduled' AS stage_label, 1 AS stage_order),
    STRUCT('qualifiedtobuy', 'Qualified to Buy', 2),
    STRUCT('presentationscheduled', 'Presentation Scheduled', 3),
    STRUCT('decisionmakerboughtin', 'Decision Maker Bought In', 4),
    STRUCT('contractsent', 'Contract Sent', 5),
    STRUCT('closedwon', 'Closed Won', 6),
    STRUCT('closedlost', 'Closed Lost', 7)
  ])
),

-- ============================================================
-- SECTION 1: Month Calendar
-- ============================================================
-- Generates one row per month from Jan 2024 through current month.
-- Each row has first/last day timestamps at 23:59:59 for snapshot queries.

month_calendar AS (
  SELECT
    month_start,
    LAST_DAY(month_start, MONTH) AS month_end,
    -- Snapshot timestamp: 23:59:59 on last day of prior month
    TIMESTAMP_SUB(month_start, INTERVAL 1 SECOND) AS snapshot_ts,
    FORMAT_DATE('%b-%y', month_start) AS month_label,
    EXTRACT(YEAR FROM month_start) AS year,
    EXTRACT(MONTH FROM month_start) AS month_number
  FROM UNNEST(
    GENERATE_DATE_ARRAY(
      DATE(2024, 1, 1),
      DATE_TRUNC(CURRENT_DATE(), MONTH),
      INTERVAL 1 MONTH
    )
  ) AS month_start
),

-- ============================================================
-- SECTION 2: Start of Month Pipeline Snapshot
-- ============================================================
-- For each month, identify ALL deals that were in an open pipeline
-- stage (not closedwon/closedlost) at 23:59:59 on the last day of
-- the prior month.
--
-- Uses deal_property_history to get the effective value of 'dealstage'
-- at that exact point in time by finding the most recent change
-- timestamp <= snapshot_ts.

som_snapshot_raw AS (
  SELECT
    mc.month_start,
    mc.month_end,
    mc.month_label,
    mc.snapshot_ts,
    dph.deal_id,
    dph.value AS stage_at_som,
    -- Most recent property change before or at snapshot
    dph.timestamp AS stage_set_timestamp,
    -- Close date: used to determine if deal was "expected" this month
    d.closedate,
    d.owner_id AS deal_owner_id,
    d.amount AS deal_amount,
    d.pipeline AS deal_pipeline_id
  FROM month_calendar mc
  CROSS JOIN (
    SELECT deal_id, value, timestamp
    FROM `gen-lang-client-0844868008.HubSpot_Airbyte.deal_property_history`
    WHERE property = 'dealstage'
  ) dph
  JOIN `gen-lang-client-0844868008.HubSpot_Airbyte.deal` d
    ON dph.deal_id = d.deal_id
  WHERE dph.timestamp <= mc.snapshot_ts
),

-- Deduplicate: keep only the latest stage change per deal per month
som_snapshot AS (
  SELECT
    deal_id,
    month_start,
    month_end,
    month_label,
    stage_at_som,
    stage_set_timestamp,
    closedate AS deal_close_date,
    deal_owner_id,
    deal_amount,
    deal_pipeline_id
  FROM (
    SELECT
      *,
      ROW_NUMBER() OVER (
        PARTITION BY deal_id, month_start
        ORDER BY stage_set_timestamp DESC
      ) AS rn
    FROM som_snapshot_raw
    WHERE stage_at_som NOT IN ('closedwon', 'closedlost')
  ) ranked
  WHERE rn = 1
),

-- Classify Expected vs Later-Month vs Won-Already
deals_entering AS (
  SELECT
    s.*,
    sc.stage_label AS som_stage_label,
    sc.stage_order AS som_stage_order,
    CASE
      -- Expected to close this month: close_date in this month
      WHEN DATE_TRUNC(s.deal_close_date, MONTH) = s.month_start
        THEN 'Expected'
      -- Later month: close_date is in a future month (pushed from earlier months)
      WHEN s.deal_close_date > s.month_end
        THEN 'Later Month'
      -- Won already: stage was open but close_date was in the past
      WHEN s.deal_close_date < s.month_start
        THEN 'Past Close Date'
      -- No close date set
      WHEN s.deal_close_date IS NULL
        THEN 'No Close Date'
      ELSE 'Unknown'
    END AS entering_origin
  FROM som_snapshot s
  LEFT JOIN pipeline_stage_config sc
    ON s.stage_at_som = sc.stage_id
),

-- ============================================================
-- SECTION 3: End of Month Actuals
-- ============================================================
-- For each month, determine what happened to each deal that entered
-- the month in any open stage.
--
-- End-of-month status is determined by the dealstage at 23:59:59
-- on the last day of the month.

eom_snapshot_raw AS (
  SELECT
    mc.month_start,
    dph.deal_id,
    dph.value AS stage_at_eom,
    dph.timestamp AS eom_stage_set_timestamp
  FROM month_calendar mc
  CROSS JOIN (
    SELECT deal_id, value, timestamp
    FROM `gen-lang-client-0844868008.HubSpot_Airbyte.deal_property_history`
    WHERE property = 'dealstage'
  ) dph
  WHERE dph.timestamp <= TIMESTAMP_ADD(
    TIMESTAMP(mc.month_end),
    INTERVAL 23 HOUR + INTERVAL 59 MINUTE + INTERVAL 59 SECOND
  )
),

eom_snapshot AS (
  SELECT
    deal_id,
    month_start,
    stage_at_eom,
    eom_stage_set_timestamp
  FROM (
    SELECT
      *,
      ROW_NUMBER() OVER (
        PARTITION BY deal_id, month_start
        ORDER BY eom_stage_set_timestamp DESC
      ) AS rn
    FROM eom_snapshot_raw
  ) ranked
  WHERE rn = 1
),

-- ============================================================
-- SECTION 4: Outcome Classification
-- ============================================================
-- Join entering deals with end-of-month status.
-- Classify each deal into: Won, Lost, or Pushed.
--
-- Won:  Deals that closedwon during the month (stage changed to
--       closedwon between start and end of month).
-- Lost: Deals that closedlost during the month.
-- Pushed: Deals that remained in an open stage at end of month.
--         Sub-categorize by origin: Expected (should close this month),
--         Later Month (close date is in future), or Created (created
--         during the month).

deal_outcomes AS (
  SELECT
    e.deal_id,
    e.month_start,
    e.month_end,
    e.month_label,
    e.stage_at_som,
    e.som_stage_label,
    e.som_stage_order,
    e.deal_close_date,
    e.deal_owner_id,
    e.deal_amount,
    e.deal_pipeline_id,
    e.entering_origin,
    COALESCE(eom.stage_at_eom, 'No End Data') AS stage_at_eom,
    -- Determine outcome
    CASE
      -- Won during the month: ended as closedwon and was NOT closedwon at start
      WHEN eom.stage_at_eom = 'closedwon'
        AND e.stage_at_som != 'closedwon'
        THEN 'Won'
      -- Lost during the month: ended as closedlost and was NOT closedlost at start
      WHEN eom.stage_at_eom = 'closedlost'
        AND e.stage_at_som != 'closedlost'
        THEN 'Lost'
      -- Pushed: still in open stage at end of month
      WHEN eom.stage_at_eom NOT IN ('closedwon', 'closedlost')
        THEN 'Pushed'
      -- Edge case: stage didn't change (was already in target state)
      ELSE 'No Change'
    END AS outcome,
    -- For Pushed deals, classify the origin sub-type
    CASE
      WHEN eom.stage_at_eom NOT IN ('closedwon', 'closedlost')
        THEN e.entering_origin
      ELSE NULL
    END AS pushed_origin,
    eom.eom_stage_set_timestamp
  FROM deals_entering e
  LEFT JOIN eom_snapshot eom
    ON e.deal_id = eom.deal_id
    AND e.month_start = eom.month_start
),

-- ============================================================
-- SECTION 5: Deals Won That Were NOT in Start-of-Month Snapshot
-- ============================================================
-- Deals that closed won this month but were either:
--   (a) Created during the month (never existed at start of month)
--   (b) Were in closedlost at start and reopened
-- These are important for total pipeline context but are NOT part
-- of the core "Expected" denominator.

newly_won_deals AS (
  SELECT
    mc.month_start,
    mc.month_label,
    d.deal_id,
    d.amount AS deal_amount,
    d.owner_id AS deal_owner_id,
    CASE
      WHEN d.createdate >= mc.month_start
        THEN 'Created'
      ELSE 'Reopened'
    END AS won_origin
  FROM month_calendar mc
  JOIN `gen-lang-client-0844868008.HubSpot_Airbyte.deal` d
    ON d.closedate BETWEEN mc.month_start AND mc.month_end
  WHERE d.dealstage = 'closedwon'
    -- Exclude deals already tracked in our entering snapshot
    AND d.deal_id NOT IN (
      SELECT deal_id FROM deals_entering
      WHERE month_start = mc.month_start
    )
),

-- ============================================================
-- SECTION 6: Monthly Aggregates
-- ============================================================
-- Aggregate outcomes by month, focusing on deals that were
-- in Expected closing status at start of month.

monthly_aggregates AS (
  SELECT
    month_start,
    month_label,
    -- Entering pipeline (Expected to close this month)
    COUNTIF(entering_origin = 'Expected') AS entering_expected,
    COUNTIF(entering_origin = 'Later Month') AS entering_later_month,
    COUNTIF(entering_origin = 'Past Close Date') AS entering_past_close,
    COUNT(*) AS entering_total,
    -- Outcomes for Expected deals
    COUNTIF(outcome = 'Won' AND entering_origin = 'Expected') AS won_from_expected,
    COUNTIF(outcome = 'Lost' AND entering_origin = 'Expected') AS lost_from_expected,
    COUNTIF(outcome = 'Pushed' AND entering_origin = 'Expected' AND pushed_origin = 'Expected') AS pushed_expected_to_expected,
    COUNTIF(outcome = 'Pushed' AND entering_origin = 'Expected' AND pushed_origin = 'Later Month') AS pushed_expected_to_later,
    COUNTIF(outcome = 'Pushed' AND entering_origin = 'Expected') AS pushed_from_expected,
    -- Outcomes for ALL entering deals
    COUNTIF(outcome = 'Won') AS won_total,
    COUNTIF(outcome = 'Lost') AS lost_total,
    COUNTIF(outcome = 'Pushed') AS pushed_total,
    COUNTIF(outcome = 'No Change') AS no_change_total,
    -- Dollar amounts
    SUM(CASE WHEN outcome = 'Won' AND entering_origin = 'Expected' THEN deal_amount ELSE 0 END) AS won_amount_expected,
    SUM(CASE WHEN entering_origin = 'Expected' THEN deal_amount ELSE 0 END) AS entering_amount_expected,
    SUM(CASE WHEN outcome = 'Lost' AND entering_origin = 'Expected' THEN deal_amount ELSE 0 END) AS lost_amount_expected,
    SUM(CASE WHEN outcome = 'Pushed' AND entering_origin = 'Expected' THEN deal_amount ELSE 0 END) AS pushed_amount_expected
  FROM deal_outcomes
  GROUP BY month_start, month_label
),

-- ============================================================
-- SECTION 7: Final Output
-- ============================================================
-- Computes the core In-Month Conversion metric and all supporting
-- ratios. Output is wide-format and pivotable by month_label.

final_output AS (
  SELECT
    ma.month_start,
    ma.month_label,
    EXTRACT(YEAR FROM ma.month_start) AS year,
    EXTRACT(MONTH FROM ma.month_start) AS month_number,

    -- ========== ENTERING PIPELINE ==========
    ma.entering_expected,
    ma.entering_later_month,
    ma.entering_total,

    -- ========== OUTCOMES (from Expected entering deals) ==========
    ma.won_from_expected,
    ma.lost_from_expected,
    ma.pushed_from_expected,

    -- ========== OUTCOMES (all entering deals) ==========
    ma.won_total,
    ma.lost_total,
    ma.pushed_total,
    ma.no_change_total,

    -- ========== CORE IN-MONTH CONVERSION METRIC ==========
    -- % Won vs Entering Expected
    -- Formula: Won from Expected / (Won + Lost + Pushed from Expected)
    -- Denominator = all expected deals that resolved this month
    SAFE_DIVIDE(
      ma.won_from_expected,
      ma.won_from_expected + ma.lost_from_expected + ma.pushed_from_expected
    ) AS in_month_conversion_pct,

    -- ========== SUPPORTING RATIOS ==========
    -- Win Rate: Won / Total Resolved (Won + Lost)
    SAFE_DIVIDE(
      ma.won_from_expected,
      ma.won_from_expected + ma.lost_from_expected
    ) AS win_rate_pct,

    -- Loss Rate: Lost / Total Resolved
    SAFE_DIVIDE(
      ma.lost_from_expected,
      ma.won_from_expected + ma.lost_from_expected
    ) AS loss_rate_pct,

    -- Push Rate: Pushed / Entering Expected
    SAFE_DIVIDE(
      ma.pushed_from_expected,
      ma.entering_expected
    ) AS push_rate_pct,

    -- Realized Rate: (Won + Lost) / Entering Expected
    -- How much of the entering pipeline was resolved (not pushed)
    SAFE_DIVIDE(
      ma.won_from_expected + ma.lost_from_expected,
      ma.entering_expected
    ) AS realized_rate_pct,

    -- ========== DOLLAR AMOUNTS ==========
    ma.won_amount_expected,
    ma.entering_amount_expected,
    ma.lost_amount_expected,
    ma.pushed_amount_expected,

    -- Dollar Conversion
    SAFE_DIVIDE(
      ma.won_amount_expected,
      ma.entering_amount_expected
    ) AS dollar_conversion_pct,

    -- ========== PIPELINE HEALTH INDICATORS ==========
    -- Deals pushed back to Expected (still in pipeline but same close date)
    ma.pushed_expected_to_expected,
    -- Deals pushed to Later Month (close date moved out)
    ma.pushed_expected_to_later,

    -- ========== METADATA ==========
    CURRENT_TIMESTAMP() AS _loaded_at

  FROM monthly_aggregates ma
)

SELECT * FROM final_output
ORDER BY month_start;
