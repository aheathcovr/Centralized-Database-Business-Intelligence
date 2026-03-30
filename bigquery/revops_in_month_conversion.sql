-- RevOps In-Month Conversion View
-- Created: 2026-03-30
-- Dataset: revops_analytics.revops_in_month_conversion
-- Source: hubspot.deal (Fivetran HubSpot connector)
--
-- Purpose: Compare forward-looking pipeline expectations (as of 1st of month)
-- against backward-looking realities (at end of month) for Deal Count and ARR.
--
-- Schema Assumptions (Fivetran HubSpot BigQuery connector):
--   hubspot.deal
--     - deal_id (INT64)
--     - property_dealstage (STRING) -- e.g., 'closedwon', 'closedlost', 'appointmentscheduled', etc.
--     - property_closedate (TIMESTAMP)
--     - property_amount (FLOAT64) -- The deal amount
--     - property_hs_arr (FLOAT64) -- HubSpot ARR field (if available)
--     - property_createdate (TIMESTAMP)
--     - _fivetran_deleted (BOOL)
--     - _fivetran_synced (TIMESTAMP)
--
--   hubspot.deal_property_history
--     - deal_id (INT64)
--     - name (STRING) -- property name: 'closedate', 'dealstage', 'amount', 'hs_arr'
--     - value (STRING) -- the new value
--     - timestamp (TIMESTAMP) -- when the change occurred
--     - source (STRING)
--
-- NOTE: If using Airbyte instead of Fivetran, adjust table names to:
--   hubspot_deal.deal -> HubSpot_Airbyte.deal
--   hubspot.deal_property_history -> HubSpot_Airbyte.deal_property_history
--   Column names may differ (e.g., 'id' vs 'deal_id', 'properties.*' nested struct)

CREATE OR REPLACE VIEW `gen-lang-client-0844868008.revops_analytics.revops_in_month_conversion` AS

-- ============================================================
-- 1. CALENDAR TABLE: Generate month boundaries for analysis
--    Covers last 24 months to current month + 6 months forward
-- ============================================================
WITH calendar AS (
  SELECT
    DATE_TRUNC(month_date, MONTH) AS month_start,
    LAST_DAY(month_date, MONTH) AS month_end,
    DATE_ADD(DATE_TRUNC(month_date, MONTH), INTERVAL -1 DAY) AS prior_month_end,
    FORMAT_DATE('%b-%y', DATE_TRUNC(month_date, MONTH)) AS month_label
  FROM UNNEST(
    GENERATE_DATE_ARRAY(
      DATE_ADD(DATE_TRUNC(CURRENT_DATE(), MONTH), INTERVAL -23 MONTH),
      DATE_ADD(DATE_TRUNC(CURRENT_DATE(), MONTH), INTERVAL 6 MONTH),
      INTERVAL 1 MONTH
    )
  ) AS month_date
),

-- ============================================================
-- 2. DEAL BASELINE: Current state of all deals (non-deleted)
-- ============================================================
deal_base AS (
  SELECT
    d.deal_id,
    LOWER(d.property_dealstage) AS current_dealstage,
    d.property_closedate AS current_closedate,
    COALESCE(d.property_hs_arr, d.property_amount, 0) AS current_arr,
    d.property_createdate AS createdate,
    d._fivetran_synced AS last_synced
  FROM `gen-lang-client-0844868008.hubspot.deal` d
  WHERE d._fivetran_deleted = FALSE
),

-- ============================================================
-- 3. DEAL PROPERTY HISTORY: Get the last known value of each
--    key property BEFORE the start of each month.
--    This reconstructs the deal state at 11:59:59 PM on the
--    last day of the prior month.
-- ============================================================

-- 3a. Close Date history per deal per month
--     Get the close_date that was set as of the end of each month
deal_closedate_history AS (
  SELECT
    dph.deal_id,
    cal.month_start,
    dph.value AS prior_close_date,
    ROW_NUMBER() OVER (
      PARTITION BY dph.deal_id, cal.month_start
      ORDER BY dph.timestamp DESC
    ) AS rn
  FROM `gen-lang-client-0844868008.hubspot.deal_property_history` dph
  INNER JOIN calendar cal
    ON dph.timestamp <= TIMESTAMP(cal.prior_month_end)
  WHERE LOWER(dph.name) = 'closedate'
),

-- 3b. Deal Stage history per deal per month
--     Get the stage that was set as of the end of each month
deal_stage_history AS (
  SELECT
    dph.deal_id,
    cal.month_start,
    LOWER(dph.value) AS prior_dealstage,
    ROW_NUMBER() OVER (
      PARTITION BY dph.deal_id, cal.month_start
      ORDER BY dph.timestamp DESC
    ) AS rn
  FROM `gen-lang-client-0844868008.hubspot.deal_property_history` dph
  INNER JOIN calendar cal
    ON dph.timestamp <= TIMESTAMP(cal.prior_month_end)
  WHERE LOWER(dph.name) = 'dealstage'
),

-- 3c. Amount/ARR history per deal per month
--     Get the ARR that was set as of the end of each month
deal_arr_history AS (
  SELECT
    dph.deal_id,
    cal.month_start,
    SAFE_CAST(dph.value AS FLOAT64) AS prior_arr,
    dph.name AS property_name,
    ROW_NUMBER() OVER (
      PARTITION BY dph.deal_id, cal.month_start, dph.name
      ORDER BY dph.timestamp DESC
    ) AS rn
  FROM `gen-lang-client-0844868008.hubspot.deal_property_history` dph
  INNER JOIN calendar cal
    ON dph.timestamp <= TIMESTAMP(cal.prior_month_end)
  WHERE LOWER(dph.name) IN ('amount', 'hs_arr')
),

-- 3d. Combine: Deal state as of the last day of the prior month
deal_prior_state AS (
  SELECT
    d.deal_id,
    d.createdate,
    cal.month_start,
    cal.month_end,
    cal.month_label,
    
    -- Prior stage (as of end of prior month)
    COALESCE(dsh.prior_dealstage, d.current_dealstage) AS prior_dealstage,
    
    -- Prior close date (as of end of prior month)
    COALESCE(
      SAFE.PARSE_TIMESTAMP('%Y-%m-%dT%H:%M:%E*S%Ez', dch.prior_close_date),
      SAFE.PARSE_TIMESTAMP('%Y-%m-%dT%H:%M:%E*SZ', dch.prior_close_date),
      d.current_closedate
    ) AS prior_closedate,
    
    -- Prior ARR (prefer hs_arr, fallback to amount)
    COALESCE(
      (SELECT dah.prior_arr FROM deal_arr_history dah 
       WHERE dah.deal_id = d.deal_id AND dah.month_start = cal.month_start 
         AND LOWER(dah.property_name) = 'hs_arr' AND dah.rn = 1),
      (SELECT dah.prior_arr FROM deal_arr_history dah 
       WHERE dah.deal_id = d.deal_id AND dah.month_start = cal.month_start 
         AND LOWER(dah.property_name) = 'amount' AND dah.rn = 1),
      d.current_arr
    ) AS prior_arr,
    
    -- Current state (for end-of-month actuals)
    d.current_dealstage,
    d.current_closedate,
    d.current_arr
  
  FROM deal_base d
  CROSS JOIN calendar cal
  LEFT JOIN deal_closedate_history dch
    ON d.deal_id = dch.deal_id AND cal.month_start = dch.month_start AND dch.rn = 1
  LEFT JOIN deal_stage_history dsh
    ON d.deal_id = dsh.deal_id AND cal.month_start = dsh.month_start AND dsh.rn = 1
  WHERE d.createdate <= TIMESTAMP(cal.month_end)  -- Deal existed before month end
),

-- ============================================================
-- 4. FINAL DEAL-LEVEL CLASSIFICATION per month
--    Classify each deal for each month based on its state
-- ============================================================
deal_month_classified AS (
  SELECT
    dps.*,
    
    -- Parse prior close date to DATE for comparisons
    DATE(dps.prior_closedate) AS prior_close_date,
    
    -- Is the deal open (not won or lost) as of start of month?
    CASE
      WHEN dps.prior_dealstage NOT IN ('closedwon', 'closedlost') 
      THEN TRUE
      ELSE FALSE
    END AS was_open_start_of_month,
    
    -- Did the prior close date fall in this target month?
    CASE
      WHEN DATE(dps.prior_closedate) BETWEEN dps.month_start AND dps.month_end
      THEN TRUE
      ELSE FALSE
    END AS prior_close_in_target_month,
    
    -- Did the deal close (win) during the target month?
    -- Must have current stage = closedwon AND close date in target month
    CASE
      WHEN dps.current_dealstage = 'closedwon'
        AND DATE(dps.current_closedate) BETWEEN dps.month_start AND dps.month_end
      THEN TRUE
      ELSE FALSE
    END AS won_in_target_month,
    
    -- Did the deal lose during the target month?
    -- Must have current stage = closedlost AND close date in target month
    -- AND was open at start of month
    CASE
      WHEN dps.current_dealstage = 'closedlost'
        AND DATE(dps.current_closedate) BETWEEN dps.month_start AND dps.month_end
        AND dps.prior_dealstage NOT IN ('closedwon', 'closedlost')
      THEN TRUE
      ELSE FALSE
    END AS lost_in_target_month,
    
    -- Was the deal created in the target month?
    CASE
      WHEN DATE(dps.createdate) >= dps.month_start
        AND DATE(dps.createdate) <= dps.month_end
      THEN TRUE
      ELSE FALSE
    END AS created_in_target_month,
    
    -- Was close date in a future month as of start of month? (for pulled-forward deals)
    CASE
      WHEN DATE(dps.prior_closedate) > dps.month_end
      THEN TRUE
      ELSE FALSE
    END AS prior_close_was_future_month,
    
    -- Was close date pushed to future or still open? (for pushed deals)
    CASE
      WHEN dps.current_dealstage NOT IN ('closedwon', 'closedlost')
        AND (
          DATE(dps.current_closedate) > dps.month_end
          OR DATE(dps.current_closedate) IS NULL
        )
      THEN TRUE
      ELSE FALSE
    END AS was_pushed_or_still_open
  
  FROM deal_prior_state dps
),

-- ============================================================
-- 5. SECTION 1 AGGREGATION: Start of Month, Looking Forward
--    Baseline: Deals OPEN at start of month with close date in target month
-- ============================================================
section1_start_of_month AS (
  SELECT
    month_start,
    month_label,
    
    -- Expected in Month (Baseline)
    COUNT(DISTINCT CASE
      WHEN was_open_start_of_month AND prior_close_in_target_month
      THEN deal_id END
    ) AS expected_count,
    SUM(CASE
      WHEN was_open_start_of_month AND prior_close_in_target_month
      THEN prior_arr ELSE 0 END
    ) AS expected_arr,
    
    -- Won in Month (of the expected cohort)
    COUNT(DISTINCT CASE
      WHEN was_open_start_of_month AND prior_close_in_target_month AND won_in_target_month
      THEN deal_id END
    ) AS won_count,
    SUM(CASE
      WHEN was_open_start_of_month AND prior_close_in_target_month AND won_in_target_month
      THEN current_arr ELSE 0 END
    ) AS won_arr,
    
    -- Lost (of the expected cohort)
    COUNT(DISTINCT CASE
      WHEN was_open_start_of_month AND prior_close_in_target_month AND lost_in_target_month
      THEN deal_id END
    ) AS lost_count,
    SUM(CASE
      WHEN was_open_start_of_month AND prior_close_in_target_month AND lost_in_target_month
      THEN current_arr ELSE 0 END
    ) AS lost_arr,
    
    -- Pushed = Expected - (Won + Lost)
    COUNT(DISTINCT CASE
      WHEN was_open_start_of_month AND prior_close_in_target_month
        AND NOT won_in_target_month AND NOT lost_in_target_month
      THEN deal_id END
    ) AS pushed_count,
    SUM(CASE
      WHEN was_open_start_of_month AND prior_close_in_target_month
        AND NOT won_in_target_month AND NOT lost_in_target_month
      THEN prior_arr ELSE 0 END
    ) AS pushed_arr
  
  FROM deal_month_classified
  GROUP BY month_start, month_label
),

-- ============================================================
-- 6. SECTION 2 AGGREGATION: End of Month, Looking Back
--    Baseline: All deals won in the target month (regardless of prior state)
-- ============================================================
section2_end_of_month AS (
  SELECT
    month_start,
    month_label,
    
    -- Total Won
    COUNT(DISTINCT CASE
      WHEN current_dealstage = 'closedwon'
        AND DATE(current_closedate) BETWEEN month_start AND month_end
      THEN deal_id END
    ) AS total_won_count,
    SUM(CASE
      WHEN current_dealstage = 'closedwon'
        AND DATE(current_closedate) BETWEEN month_start AND month_end
      THEN current_arr ELSE 0 END
    ) AS total_won_arr,
    
    -- Of Total Won: Was Expected in Month (prior close date was in target month)
    COUNT(DISTINCT CASE
      WHEN current_dealstage = 'closedwon'
        AND DATE(current_closedate) BETWEEN month_start AND month_end
        AND was_open_start_of_month
        AND prior_close_in_target_month
      THEN deal_id END
    ) AS won_was_expected_count,
    SUM(CASE
      WHEN current_dealstage = 'closedwon'
        AND DATE(current_closedate) BETWEEN month_start AND month_end
        AND was_open_start_of_month
        AND prior_close_in_target_month
      THEN current_arr ELSE 0 END
    ) AS won_was_expected_arr,
    
    -- Of Total Won: Was Expected in Later Month (pulled forward)
    -- Prior close date was in a future month, or deal was created in target month
    COUNT(DISTINCT CASE
      WHEN current_dealstage = 'closedwon'
        AND DATE(current_closedate) BETWEEN month_start AND month_end
        AND NOT created_in_target_month
        AND prior_close_was_future_month
      THEN deal_id END
    ) AS won_pulled_forward_count,
    SUM(CASE
      WHEN current_dealstage = 'closedwon'
        AND DATE(current_closedate) BETWEEN month_start AND month_end
        AND NOT created_in_target_month
        AND prior_close_was_future_month
      THEN current_arr ELSE 0 END
    ) AS won_pulled_forward_arr,
    
    -- Of Total Won: Created in Month (generated and closed within same month)
    COUNT(DISTINCT CASE
      WHEN current_dealstage = 'closedwon'
        AND DATE(current_closedate) BETWEEN month_start AND month_end
        AND created_in_target_month
      THEN deal_id END
    ) AS won_created_in_month_count,
    SUM(CASE
      WHEN current_dealstage = 'closedwon'
        AND DATE(current_closedate) BETWEEN month_start AND month_end
        AND created_in_target_month
      THEN current_arr ELSE 0 END
    ) AS won_created_in_month_arr
  
  FROM deal_month_classified
  GROUP BY month_start, month_label
),

-- ============================================================
-- 7. COMBINED METRICS: Join Section 1 and Section 2
-- ============================================================
combined_metrics AS (
  SELECT
    COALESCE(s1.month_start, s2.month_start) AS month_start,
    COALESCE(s1.month_label, s2.month_label) AS month_label,
    
    -- Section 1: Start of Month, Looking Forward (Count)
    COALESCE(s1.expected_count, 0) AS expected_in_month_count,
    COALESCE(s1.won_count, 0) AS start_won_in_month_count,
    COALESCE(s1.lost_count, 0) AS start_lost_count,
    COALESCE(s1.pushed_count, 0) AS start_pushed_count,
    
    -- Section 1: Start of Month, Looking Forward ($ ARR)
    ROUND(COALESCE(s1.expected_arr, 0), 2) AS expected_in_month_arr,
    ROUND(COALESCE(s1.won_arr, 0), 2) AS start_won_in_month_arr,
    ROUND(COALESCE(s1.lost_arr, 0), 2) AS start_lost_arr,
    ROUND(COALESCE(s1.pushed_arr, 0), 2) AS start_pushed_arr,
    
    -- Section 1: Percentages (% Won, % Lost, % Pushed)
    ROUND(SAFE_DIVIDE(COALESCE(s1.won_count, 0), NULLIF(s1.expected_count, 0)) * 100, 1) AS start_pct_won_count,
    ROUND(SAFE_DIVIDE(COALESCE(s1.lost_count, 0), NULLIF(s1.expected_count, 0)) * 100, 1) AS start_pct_lost_count,
    ROUND(SAFE_DIVIDE(COALESCE(s1.pushed_count, 0), NULLIF(s1.expected_count, 0)) * 100, 1) AS start_pct_pushed_count,
    ROUND(SAFE_DIVIDE(COALESCE(s1.won_arr, 0), NULLIF(s1.expected_arr, 0)) * 100, 1) AS start_pct_won_arr,
    ROUND(SAFE_DIVIDE(COALESCE(s1.lost_arr, 0), NULLIF(s1.expected_arr, 0)) * 100, 1) AS start_pct_lost_arr,
    ROUND(SAFE_DIVIDE(COALESCE(s1.pushed_arr, 0), NULLIF(s1.expected_arr, 0)) * 100, 1) AS start_pct_pushed_arr,
    
    -- Section 2: End of Month, Looking Back (Count)
    COALESCE(s2.total_won_count, 0) AS total_won_count,
    COALESCE(s2.won_was_expected_count, 0) AS won_was_expected_count,
    COALESCE(s2.won_pulled_forward_count, 0) AS won_pulled_forward_count,
    COALESCE(s2.won_created_in_month_count, 0) AS won_created_in_month_count,
    
    -- Section 2: End of Month, Looking Back ($ ARR)
    ROUND(COALESCE(s2.total_won_arr, 0), 2) AS total_won_arr,
    ROUND(COALESCE(s2.won_was_expected_arr, 0), 2) AS won_was_expected_arr,
    ROUND(COALESCE(s2.won_pulled_forward_arr, 0), 2) AS won_pulled_forward_arr,
    ROUND(COALESCE(s2.won_created_in_month_arr, 0), 2) AS won_created_in_month_arr,
    
    -- Section 2: Percentages (of Total Won)
    ROUND(SAFE_DIVIDE(COALESCE(s2.won_was_expected_count, 0), NULLIF(s2.total_won_count, 0)) * 100, 1) AS end_pct_expected_count,
    ROUND(SAFE_DIVIDE(COALESCE(s2.won_pulled_forward_count, 0), NULLIF(s2.total_won_count, 0)) * 100, 1) AS end_pct_pulled_forward_count,
    ROUND(SAFE_DIVIDE(COALESCE(s2.won_created_in_month_count, 0), NULLIF(s2.total_won_count, 0)) * 100, 1) AS end_pct_created_count,
    ROUND(SAFE_DIVIDE(COALESCE(s2.won_was_expected_arr, 0), NULLIF(s2.total_won_arr, 0)) * 100, 1) AS end_pct_expected_arr,
    ROUND(SAFE_DIVIDE(COALESCE(s2.won_pulled_forward_arr, 0), NULLIF(s2.total_won_arr, 0)) * 100, 1) AS end_pct_pulled_forward_arr,
    ROUND(SAFE_DIVIDE(COALESCE(s2.won_created_in_month_arr, 0), NULLIF(s2.total_won_arr, 0)) * 100, 1) AS end_pct_created_arr,
    
    -- Section 3: Final Summary Metric
    -- % Won vs Entering Expected = Total Won ($) / Expected in Month ($)
    ROUND(SAFE_DIVIDE(COALESCE(s2.total_won_arr, 0), NULLIF(s1.expected_arr, 0)) * 100, 1) AS pct_won_vs_expected_arr
  
  FROM section1_start_of_month s1
  FULL OUTER JOIN section2_end_of_month s2
    ON s1.month_start = s2.month_start
)

-- ============================================================
-- 8. FINAL OUTPUT: Pivot rows into columns (Total + months)
--    Output format: rows = metrics, columns = Total, Jun-25, Jul-25, etc.
-- ============================================================

-- Since BigQuery doesn't allow dynamic PIVOT easily, we generate
-- a UNION ALL structure for key months. For a dashboard, you'd typically
-- query combined_metrics directly and pivot in the visualization tool.

-- Alternative: Flat output with all months as rows (more flexible for BI tools)
SELECT
  month_start,
  month_label,
  
  -- SECTION 1: Start of Month, Looking Forward
  -- Deal Count
  expected_in_month_count,
  start_won_in_month_count,
  start_lost_count,
  start_pushed_count,
  
  -- ARR ($)
  expected_in_month_arr,
  start_won_in_month_arr,
  start_lost_arr,
  start_pushed_arr,
  
  -- Percentages (Count)
  start_pct_won_count,
  start_pct_lost_count,
  start_pct_pushed_count,
  
  -- Percentages (ARR)
  start_pct_won_arr,
  start_pct_lost_arr,
  start_pct_pushed_arr,
  
  -- SECTION 2: End of Month, Looking Back
  -- Deal Count
  total_won_count,
  won_was_expected_count,
  won_pulled_forward_count,
  won_created_in_month_count,
  
  -- ARR ($)
  total_won_arr,
  won_was_expected_arr,
  won_pulled_forward_arr,
  won_created_in_month_arr,
  
  -- Percentages (Count)
  end_pct_expected_count,
  end_pct_pulled_forward_count,
  end_pct_created_count,
  
  -- Percentages (ARR)
  end_pct_expected_arr,
  end_pct_pulled_forward_arr,
  end_pct_created_arr,
  
  -- SECTION 3: Final Summary
  pct_won_vs_expected_arr,
  
  -- Metadata
  CURRENT_TIMESTAMP() AS _generated_at

FROM combined_metrics
ORDER BY month_start DESC;
