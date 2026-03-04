-- Intercom Weekly Support Metrics View
-- Created: 2026-03-02
-- Dataset: revops_analytics.intercom_weekly_support_metrics
-- Source: Intercom_Airbyte.conversations
-- Timezone: America/Denver (US/Mountain)
-- 
-- Metrics by week:
--   - New tickets (created)
--   - Closed tickets (first_close_at)
--   - CSAT positive (4-5 ratings) vs negative (1-3 ratings)
--   - First response time (average and median)

CREATE OR REPLACE VIEW `gen-lang-client-0844868008.revops_analytics.intercom_weekly_support_metrics` AS

WITH
-- New tickets: created during each week
new_tickets AS (
  SELECT
    DATE_TRUNC(DATE(TIMESTAMP_SECONDS(created_at), 'America/Denver'), WEEK(MONDAY)) AS week_start,
    COUNT(*) AS new_tickets_count
  FROM `gen-lang-client-0844868008.Intercom_Airbyte.conversations`
  GROUP BY 1
),

-- Closed tickets: first closed during each week
closed_tickets AS (
  SELECT
    DATE_TRUNC(DATE(TIMESTAMP_SECONDS(CAST(JSON_EXTRACT_SCALAR(statistics, '$.first_close_at') AS INT64)), 'America/Denver'), WEEK(MONDAY)) AS week_start,
    COUNT(*) AS closed_tickets_count
  FROM `gen-lang-client-0844868008.Intercom_Airbyte.conversations`
  WHERE state = 'closed'
    AND JSON_EXTRACT_SCALAR(statistics, '$.first_close_at') IS NOT NULL
  GROUP BY 1
),

-- CSAT ratings: positive (4-5) vs negative (1-3)
csat_ratings AS (
  SELECT
    DATE_TRUNC(DATE(TIMESTAMP_SECONDS(CAST(JSON_EXTRACT_SCALAR(conversation_rating, '$.created_at') AS INT64)), 'America/Denver'), WEEK(MONDAY)) AS week_start,
    COUNTIF(CAST(JSON_EXTRACT_SCALAR(conversation_rating, '$.rating') AS INT64) >= 4) AS csat_positive,
    COUNTIF(CAST(JSON_EXTRACT_SCALAR(conversation_rating, '$.rating') AS INT64) BETWEEN 1 AND 3) AS csat_negative,
    COUNT(*) AS csat_total
  FROM `gen-lang-client-0844868008.Intercom_Airbyte.conversations`
  WHERE conversation_rating IS NOT NULL
    AND JSON_EXTRACT_SCALAR(conversation_rating, '$.rating') IS NOT NULL
  GROUP BY 1
),

-- First response time: average and median (in seconds)
first_response_base AS (
  SELECT
    DATE_TRUNC(DATE(TIMESTAMP_SECONDS(created_at), 'America/Denver'), WEEK(MONDAY)) AS week_start,
    CAST(JSON_EXTRACT_SCALAR(statistics, '$.time_to_admin_reply') AS FLOAT64) AS response_time
  FROM `gen-lang-client-0844868008.Intercom_Airbyte.conversations`
  WHERE statistics IS NOT NULL
    AND JSON_EXTRACT_SCALAR(statistics, '$.time_to_admin_reply') IS NOT NULL
),

first_response_agg AS (
  SELECT
    week_start,
    AVG(response_time) AS first_response_avg_seconds,
    PERCENTILE_CONT(response_time, 0.5) OVER (PARTITION BY week_start) AS first_response_median_seconds
  FROM first_response_base
  GROUP BY week_start, response_time
),

first_response_final AS (
  SELECT
    week_start,
    AVG(first_response_avg_seconds) AS first_response_avg_seconds,
    AVG(first_response_median_seconds) AS first_response_median_seconds
  FROM first_response_agg
  GROUP BY week_start
)

-- Combine all metrics
SELECT
  COALESCE(n.week_start, c.week_start, cs.week_start, fr.week_start) AS week_start,
  FORMAT_DATE('%Y-W%V', COALESCE(n.week_start, c.week_start, cs.week_start, fr.week_start)) AS year_week,
  IFNULL(n.new_tickets_count, 0) AS new_tickets,
  IFNULL(c.closed_tickets_count, 0) AS closed_tickets,
  IFNULL(cs.csat_positive, 0) AS csat_positive,
  IFNULL(cs.csat_negative, 0) AS csat_negative,
  IFNULL(cs.csat_total, 0) AS csat_total,
  CASE 
    WHEN IFNULL(cs.csat_total, 0) > 0 
    THEN ROUND(cs.csat_positive * 100.0 / cs.csat_total, 2)
    ELSE NULL 
  END AS csat_score_pct,
  ROUND(fr.first_response_avg_seconds, 2) AS first_response_avg_seconds,
  ROUND(fr.first_response_median_seconds, 2) AS first_response_median_seconds,
  ROUND(fr.first_response_avg_seconds / 60, 2) AS first_response_avg_minutes,
  ROUND(fr.first_response_median_seconds / 60, 2) AS first_response_median_minutes,
  ROUND(fr.first_response_avg_seconds / 3600, 2) AS first_response_avg_hours,
  ROUND(fr.first_response_median_seconds / 3600, 2) AS first_response_median_hours
FROM new_tickets n
FULL OUTER JOIN closed_tickets c ON n.week_start = c.week_start
FULL OUTER JOIN csat_ratings cs ON COALESCE(n.week_start, c.week_start) = cs.week_start
FULL OUTER JOIN first_response_final fr ON COALESCE(n.week_start, c.week_start, cs.week_start) = fr.week_start
ORDER BY week_start DESC;