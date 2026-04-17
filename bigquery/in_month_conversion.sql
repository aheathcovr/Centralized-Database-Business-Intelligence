-- ============================================================
-- In-Month Conversion View
-- Dataset: revops_analytics.in_month_conversion
-- Source: HubSpot_Airbyte (Airbyte connector) - deals, deals_property_history tables
--
-- This view provides two perspectives on deal conversion:
--   1. Start of Month, Looking Forward: Deals expected to close, with outcomes
--   2. End of Month, Looking Back: Won deals classified by origin at SOM
--
-- Supports monthly and quarterly period types via @period_type parameter.
--
-- Usage:
--   SELECT * FROM revops_analytics.in_month_conversion
--   WHERE period_type = 'monthly'  -- or 'quarterly'
--
-- Reconciliation Rules:
--   SOM Section: Won + Lost + Pushed = Expected (per period)
--   EOM Section: Was Expected + Later Month + Created = Total Won (per period)
-- ============================================================

CREATE OR REPLACE VIEW `gen-lang-client-0844868008.revops_analytics.in_month_conversion` AS

WITH

-- ============================================================
-- CONFIG: Period Type Parameter
-- ============================================================
-- Controls whether data is grouped by month or quarter.
-- SOM snapshot logic always uses monthly boundaries for accuracy.

period_config AS (
  SELECT
    CASE @period_type
      WHEN 'quarterly' THEN 'quarter'
      ELSE 'month'
    END AS grouping_type,
    CASE @period_type
      WHEN 'quarterly' THEN 3
      ELSE 1
    END AS months_per_period
),

-- ============================================================
-- SECTION 1: Month Calendar
-- ============================================================
-- Generates monthly periods from Jan 2024 through current month.
-- Each row has first/last day timestamps and snapshot times.

month_calendar AS (
  SELECT
    month_start,
    LAST_DAY(month_start, MONTH) AS month_end,
    -- Snapshot timestamp: 23:59:59 on last day of prior month
    TIMESTAMP_SUB(TIMESTAMP(month_start), INTERVAL 1 SECOND) AS som_snapshot_ts,
    -- EOM snapshot: 23:59:59 on last day of month
    TIMESTAMP_ADD(TIMESTAMP(LAST_DAY(month_start, MONTH)), INTERVAL 86399 SECOND) AS eom_snapshot_ts,
    FORMAT_DATE('%b-%y', month_start) AS month_label,
    EXTRACT(YEAR FROM month_start) AS year,
    EXTRACT(MONTH FROM month_start) AS month_number,
    EXTRACT(QUARTER FROM month_start) AS quarter_number,
    CONCAT('Q', EXTRACT(QUARTER FROM month_start), '-', FORMAT_DATE('%y', month_start)) AS quarter_label
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
-- Uses deals_property_history to get the effective value of 'dealstage'
-- at that exact point in time by finding the most recent change
-- timestamp <= som_snapshot_ts.

som_snapshot_raw AS (
  SELECT
    mc.month_start,
    mc.month_end,
    mc.month_label,
    mc.som_snapshot_ts,
    dph.dealId AS deal_id,
    dph.value AS stage_at_som,
    dph.timestamp AS stage_set_timestamp,
    DATE(d.properties_closedate) AS deal_close_date,
    d.properties_hubspot_owner_id AS deal_owner_id,
    COALESCE(d.properties_amount, 0) AS deal_arr,
    d.properties_pipeline AS deal_pipeline_id
  FROM month_calendar mc
  CROSS JOIN (
    SELECT dealId, value, timestamp
    FROM `gen-lang-client-0844868008.HubSpot_Airbyte.deals_property_history`
    WHERE property = 'dealstage'
  ) dph
  JOIN `gen-lang-client-0844868008.HubSpot_Airbyte.deals` d
    ON dph.dealId = d.id
  WHERE dph.timestamp <= mc.som_snapshot_ts
    -- Exclude deals already in closed states at SOM
    AND dph.value NOT IN ('closedwon', 'closedlost')
),

-- Deduplicate: keep only the latest stage change per deal per month
som_snapshot AS (
  SELECT
    deal_id,
    month_start,
    month_end,
    month_label,
    som_snapshot_ts,
    stage_at_som,
    stage_set_timestamp,
    deal_close_date,
    deal_owner_id,
    deal_arr,
    deal_pipeline_id
  FROM (
    SELECT
      *,
      ROW_NUMBER() OVER (
        PARTITION BY deal_id, month_start
        ORDER BY stage_set_timestamp DESC
      ) AS rn
    FROM som_snapshot_raw
  ) ranked
  WHERE rn = 1
),

-- ============================================================
-- SECTION 3: Classify Deals at Start of Month
-- ============================================================
-- For each deal entering a month, classify by expected close date:
--   Expected: close date falls within this month
--   Later Month: close date is in a future month
--   Past Close: close date was already passed

deals_entering AS (
  SELECT
    s.deal_id,
    s.month_start,
    s.month_end,
    s.month_label,
    s.deal_close_date,
    s.deal_owner_id,
    s.deal_arr,
    s.deal_pipeline_id,
    CASE
      WHEN DATE_TRUNC(s.deal_close_date, MONTH) = s.month_start THEN 'Expected'
      WHEN s.deal_close_date > s.month_end THEN 'Later Month'
      WHEN s.deal_close_date < s.month_start THEN 'Past Close'
      WHEN s.deal_close_date IS NULL THEN 'No Close Date'
      ELSE 'Unknown'
    END AS entering_origin
  FROM som_snapshot s
),

-- ============================================================
-- SECTION 4: End of Month Stage Snapshot
-- ============================================================
-- For each month, determine the stage each deal was in at EOM.
-- Used to determine final outcome (Won, Lost, or Pushed).

eom_snapshot_raw AS (
  SELECT
    mc.month_start,
    dph.dealId AS deal_id,
    dph.value AS stage_at_eom,
    dph.timestamp AS eom_stage_set_timestamp
  FROM month_calendar mc
  CROSS JOIN (
    SELECT dealId, value, timestamp
    FROM `gen-lang-client-0844868008.HubSpot_Airbyte.deals_property_history`
    WHERE property = 'dealstage'
  ) dph
  WHERE dph.timestamp <= mc.eom_snapshot_ts
),

-- Deduplicate: keep only the latest stage change per deal per month
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
-- SECTION 5: Deal Outcomes
-- ============================================================
-- Join entering deals with end-of-month status.
-- Classify each deal into: Won, Lost, or Pushed.

deal_outcomes AS (
  SELECT
    e.deal_id,
    e.month_start,
    e.month_end,
    e.month_label,
    e.deal_close_date,
    e.deal_owner_id,
    e.deal_arr,
    e.entering_origin,
    COALESCE(eom.stage_at_eom, 'No Data') AS stage_at_eom,
    -- Determine outcome based on EOM stage
    CASE
      WHEN eom.stage_at_eom = 'closedwon' THEN 'Won'
      WHEN eom.stage_at_eom = 'closedlost' THEN 'Lost'
      WHEN eom.stage_at_eom NOT IN ('closedwon', 'closedlost', 'No Data') THEN 'Pushed'
      ELSE 'No Change'
    END AS outcome,
    eom.eom_stage_set_timestamp
  FROM deals_entering e
  LEFT JOIN eom_snapshot eom
    ON e.deal_id = eom.deal_id
    AND e.month_start = eom.month_start
),

-- ============================================================
-- SECTION 6: Identify Bluebird Deals
-- ============================================================
-- Bluebirds are deals created AND won during the same period.
-- They are NOT in the SOM snapshot (didn't exist at start of month)
-- but were created, progressed, and closed won within the period.

bluebird_deals AS (
  SELECT
    mc.month_start,
    mc.month_label,
    d.id AS deal_id,
    COALESCE(d.properties_amount, 0) AS deal_arr,
    d.properties_hubspot_owner_id AS deal_owner_id
  FROM month_calendar mc
  JOIN `gen-lang-client-0844868008.HubSpot_Airbyte.deals` d
    ON DATE(d.properties_closedate) BETWEEN mc.month_start AND mc.month_end
    AND LOWER(d.properties_dealstage) = 'closedwon'
    AND DATE(d.properties_createdate) >= mc.month_start
    AND DATE(d.properties_createdate) <= mc.month_end
  WHERE d.id NOT IN (
    SELECT deal_id FROM som_snapshot WHERE month_start = mc.month_start
  )
),

-- ============================================================
-- SECTION 7: Won Deals from SOM Snapshot
-- ============================================================
-- Classify deals that WON during each month based on their origin at SOM:
--   Was Expected: deal was in Expected category at SOM
--   Was Later Month: deal was expected to close in future month

won_from_som AS (
  SELECT
    o.month_start,
    o.month_label,
    o.deal_id,
    o.deal_arr,
    o.deal_owner_id,
    CASE
      WHEN o.entering_origin = 'Expected' THEN 'Was Expected'
      WHEN o.entering_origin = 'Later Month' THEN 'Was Later Month'
      WHEN o.entering_origin = 'Past Close' THEN 'Was Past Close'
      WHEN o.entering_origin = 'No Close Date' THEN 'Was No Close Date'
      ELSE 'Unknown'
    END AS won_origin
  FROM deal_outcomes o
  WHERE o.outcome = 'Won'
),

-- ============================================================
-- SECTION 8: Combine Won Deals with Classifications
-- ============================================================
-- Union SOM wins with bluebird deals.

won_deals_final AS (
  SELECT
    month_start,
    month_label,
    deal_id,
    deal_arr,
    deal_owner_id,
    won_origin,
    'Created in Month' AS final_won_classification
  FROM bluebird_deals
  UNION ALL
  SELECT
    month_start,
    month_label,
    deal_id,
    deal_arr,
    deal_owner_id,
    won_origin,
    won_origin AS final_won_classification
  FROM won_from_som
),

-- ============================================================
-- SECTION 9: Monthly Aggregates - SOM Section
-- ============================================================
-- Aggregate outcomes for the Start of Month section.
-- For Expected deals, tracks Won, Lost, and Pushed counts and ARR.

monthly_som_aggregates AS (
  SELECT
    month_start,
    month_label,
    -- Expected deals at SOM
    COUNTIF(entering_origin = 'Expected') AS expected_count,
    SUM(CASE WHEN entering_origin = 'Expected' THEN deal_arr ELSE 0 END) AS expected_arr,
    -- Won from Expected
    COUNTIF(outcome = 'Won' AND entering_origin = 'Expected') AS won_count,
    SUM(CASE WHEN outcome = 'Won' AND entering_origin = 'Expected' THEN deal_arr ELSE 0 END) AS won_arr,
    -- Lost from Expected
    COUNTIF(outcome = 'Lost' AND entering_origin = 'Expected') AS lost_count,
    SUM(CASE WHEN outcome = 'Lost' AND entering_origin = 'Expected' THEN deal_arr ELSE 0 END) AS lost_arr,
    -- Pushed from Expected (still open at EOM)
    COUNTIF(outcome = 'Pushed' AND entering_origin = 'Expected') AS pushed_count,
    SUM(CASE WHEN outcome = 'Pushed' AND entering_origin = 'Expected' THEN deal_arr ELSE 0 END) AS pushed_arr
  FROM deal_outcomes
  GROUP BY month_start, month_label
),

-- ============================================================
-- SECTION 10: Monthly Aggregates - EOM Section
-- ============================================================
-- Aggregate won deals by their origin classification.

monthly_eom_aggregates AS (
  SELECT
    month_start,
    month_label,
    -- Total won this month
    COUNT(*) AS total_won_count,
    SUM(deal_arr) AS total_won_arr,
    -- Won deals classified by origin at SOM
    COUNTIF(final_won_classification = 'Was Expected') AS won_was_expected_count,
    SUM(CASE WHEN final_won_classification = 'Was Expected' THEN deal_arr ELSE 0 END) AS won_was_expected_arr,
    COUNTIF(final_won_classification = 'Was Later Month') AS won_was_later_month_count,
    SUM(CASE WHEN final_won_classification = 'Was Later Month' THEN deal_arr ELSE 0 END) AS won_was_later_month_arr,
    COUNTIF(final_won_classification = 'Created in Month') AS won_created_in_month_count,
    SUM(CASE WHEN final_won_classification = 'Created in Month' THEN deal_arr ELSE 0 END) AS won_created_in_month_arr
  FROM won_deals_final
  GROUP BY month_start, month_label
),

-- ============================================================
-- SECTION 11: Combine Monthly Data
-- ============================================================
-- Join SOM and EOM aggregates with percentages calculated.

monthly_combined AS (
  SELECT
    som.month_start,
    som.month_label,
    -- SOM Section - Counts
    som.expected_count,
    som.won_count,
    som.lost_count,
    som.pushed_count,
    -- SOM Section - Percentages
    ROUND(SAFE_DIVIDE(som.won_count, som.expected_count) * 100, 1) AS pct_won,
    ROUND(SAFE_DIVIDE(som.lost_count, som.expected_count) * 100, 1) AS pct_lost,
    ROUND(SAFE_DIVIDE(som.pushed_count, som.expected_count) * 100, 1) AS pct_pushed,
    -- SOM Section - ARR
    som.expected_arr,
    som.won_arr,
    som.lost_arr,
    som.pushed_arr,
    -- EOM Section - Counts
    COALESCE(eom.total_won_count, 0) AS total_won_count,
    COALESCE(eom.won_was_expected_count, 0) AS won_was_expected_count,
    COALESCE(eom.won_was_later_month_count, 0) AS won_was_later_month_count,
    COALESCE(eom.won_created_in_month_count, 0) AS won_created_in_month_count,
    -- EOM Section - Percentages (of total won)
    ROUND(SAFE_DIVIDE(eom.won_was_expected_count, eom.total_won_count) * 100, 1) AS pct_won_was_expected,
    ROUND(SAFE_DIVIDE(eom.won_was_later_month_count, eom.total_won_count) * 100, 1) AS pct_won_was_later_month,
    ROUND(SAFE_DIVIDE(eom.won_created_in_month_count, eom.total_won_count) * 100, 1) AS pct_won_created_in_month,
    -- EOM Section - ARR
    COALESCE(eom.total_won_arr, 0) AS total_won_arr,
    COALESCE(eom.won_was_expected_arr, 0) AS won_was_expected_arr,
    COALESCE(eom.won_was_later_month_arr, 0) AS won_was_later_month_arr,
    COALESCE(eom.won_created_in_month_arr, 0) AS won_created_in_month_arr,
    -- Final Metric: % Won vs Entering Expected = Total Won / Expected in Month
    ROUND(SAFE_DIVIDE(eom.total_won_count, som.expected_count) * 100, 1) AS pct_won_vs_entering_expected
  FROM monthly_som_aggregates som
  LEFT JOIN monthly_eom_aggregates eom
    ON som.month_start = eom.month_start
),

-- ============================================================
-- SECTION 12: Add Period Grouping
-- ============================================================
-- Add quarter labels and period type for aggregation.

monthly_with_period AS (
  SELECT
    mc.year,
    mc.quarter_number,
    mc.quarter_label,
    mc.month_number,
    comb.month_start,
    comb.month_label,
    comb.* EXCEPT (month_start, month_label)
  FROM monthly_combined comb
  JOIN month_calendar mc
    ON comb.month_start = mc.month_start
),

-- ============================================================
-- SECTION 13: Monthly Output
-- ============================================================
-- Output for monthly period_type.

monthly_output AS (
  SELECT
    'monthly' AS period_type,
    month_start,
    month_end,
    month_label,
    year,
    quarter_number,
    quarter_label,
    month_number,
    -- SOM counts
    expected_count,
    won_count,
    lost_count,
    pushed_count,
    -- SOM percentages
    pct_won,
    pct_lost,
    pct_pushed,
    -- SOM ARR
    expected_arr,
    won_arr,
    lost_arr,
    pushed_arr,
    -- EOM counts
    total_won_count,
    won_was_expected_count,
    won_was_later_month_count,
    won_created_in_month_count,
    -- EOM percentages
    pct_won_was_expected,
    pct_won_was_later_month,
    pct_won_created_in_month,
    -- EOM ARR
    total_won_arr,
    won_was_expected_arr,
    won_was_later_month_arr,
    won_created_in_month_arr,
    -- Final metric
    pct_won_vs_entering_expected,
    CURRENT_TIMESTAMP() AS _loaded_at
  FROM monthly_with_period
),

-- ============================================================
-- SECTION 14: Quarterly Aggregates
-- ============================================================
-- Aggregate monthly data into quarterly buckets.

quarterly_som_aggregates AS (
  SELECT
    year,
    quarter_number,
    quarter_label,
    SUM(expected_count) AS expected_count,
    SUM(won_count) AS won_count,
    SUM(lost_count) AS lost_count,
    SUM(pushed_count) AS pushed_count,
    SUM(expected_arr) AS expected_arr,
    SUM(won_arr) AS won_arr,
    SUM(lost_arr) AS lost_arr,
    SUM(pushed_arr) AS pushed_arr
  FROM monthly_with_period
  GROUP BY year, quarter_number, quarter_label
),

quarterly_eom_aggregates AS (
  SELECT
    year,
    quarter_number,
    quarter_label,
    SUM(total_won_count) AS total_won_count,
    SUM(won_was_expected_count) AS won_was_expected_count,
    SUM(won_was_later_month_count) AS won_was_later_month_count,
    SUM(won_created_in_month_count) AS won_created_in_month_count,
    SUM(total_won_arr) AS total_won_arr,
    SUM(won_was_expected_arr) AS won_was_expected_arr,
    SUM(won_was_later_month_arr) AS won_was_later_month_arr,
    SUM(won_created_in_month_arr) AS won_created_in_month_arr
  FROM monthly_with_period
  GROUP BY year, quarter_number, quarter_label
),

quarterly_combined AS (
  SELECT
    som.year,
    som.quarter_number,
    som.quarter_label,
    -- SOM counts
    som.expected_count,
    som.won_count,
    som.lost_count,
    som.pushed_count,
    -- SOM percentages
    ROUND(SAFE_DIVIDE(som.won_count, som.expected_count) * 100, 1) AS pct_won,
    ROUND(SAFE_DIVIDE(som.lost_count, som.expected_count) * 100, 1) AS pct_lost,
    ROUND(SAFE_DIVIDE(som.pushed_count, som.expected_count) * 100, 1) AS pct_pushed,
    -- SOM ARR
    som.expected_arr,
    som.won_arr,
    som.lost_arr,
    som.pushed_arr,
    -- EOM counts
    eom.total_won_count,
    eom.won_was_expected_count,
    eom.won_was_later_month_count,
    eom.won_created_in_month_count,
    -- EOM percentages
    ROUND(SAFE_DIVIDE(eom.won_was_expected_count, eom.total_won_count) * 100, 1) AS pct_won_was_expected,
    ROUND(SAFE_DIVIDE(eom.won_was_later_month_count, eom.total_won_count) * 100, 1) AS pct_won_was_later_month,
    ROUND(SAFE_DIVIDE(eom.won_created_in_month_count, eom.total_won_count) * 100, 1) AS pct_won_created_in_month,
    -- EOM ARR
    eom.total_won_arr,
    eom.won_was_expected_arr,
    eom.won_was_later_month_arr,
    eom.won_created_in_month_arr,
    -- Final metric
    ROUND(SAFE_DIVIDE(eom.total_won_count, som.expected_count) * 100, 1) AS pct_won_vs_entering_expected
  FROM quarterly_som_aggregates som
  JOIN quarterly_eom_aggregates eom
    ON som.year = eom.year
    AND som.quarter_number = eom.quarter_number
),

quarterly_output AS (
  SELECT
    'quarterly' AS period_type,
    DATE(CONCAT(CAST(year AS STRING), '-', CAST((quarter_number - 1) * 3 + 1 AS STRING), '-01')) AS month_start,
    LAST_DAY(DATE(CONCAT(CAST(year AS STRING), '-', CAST(quarter_number * 3 AS STRING), '-01')), MONTH) AS month_end,
    quarter_label AS month_label,
    year,
    quarter_number,
    quarter_label,
    0 AS month_number,
    -- SOM counts
    expected_count,
    won_count,
    lost_count,
    pushed_count,
    -- SOM percentages
    pct_won,
    pct_lost,
    pct_pushed,
    -- SOM ARR
    expected_arr,
    won_arr,
    lost_arr,
    pushed_arr,
    -- EOM counts
    total_won_count,
    won_was_expected_count,
    won_was_later_month_count,
    won_created_in_month_count,
    -- EOM percentages
    pct_won_was_expected,
    pct_won_was_later_month,
    pct_won_created_in_month,
    -- EOM ARR
    total_won_arr,
    won_was_expected_arr,
    won_was_later_month_arr,
    won_created_in_month_arr,
    -- Final metric
    pct_won_vs_entering_expected,
    CURRENT_TIMESTAMP() AS _loaded_at
  FROM quarterly_combined
),

-- ============================================================
-- SECTION 15: Combined Output
-- ============================================================
-- Union monthly and quarterly outputs.

combined_output AS (
  SELECT * FROM monthly_output
  UNION ALL
  SELECT * FROM quarterly_output
)

SELECT * FROM combined_output
ORDER BY period_type, month_start;