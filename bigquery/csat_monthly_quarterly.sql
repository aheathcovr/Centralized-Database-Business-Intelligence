-- CSAT Monthly and Quarterly Aggregation
-- Aggregates intercom_weekly_support_metrics into monthly and quarterly periods
-- Location: revops_analytics.csat_monthly_quarterly

CREATE OR REPLACE VIEW `gen-lang-client-0844868008.revops_analytics.csat_monthly_quarterly` AS

WITH weekly AS (
  SELECT
    week_start,
    csat_positive,
    csat_negative,
    csat_total,
    csat_score_pct
  FROM `gen-lang-client-0844868008.revops_analytics.intercom_weekly_support_metrics`
  WHERE csat_total > 0
),
monthly AS (
  SELECT
    DATE_TRUNC(week_start, MONTH) AS period_start,
    'month' AS period_type,
    FORMAT_DATE('%Y-%m', DATE_TRUNC(week_start, MONTH)) AS period_label,
    SUM(csat_positive) AS csat_positive,
    SUM(csat_negative) AS csat_negative,
    SUM(csat_total) AS csat_total,
    CASE WHEN SUM(csat_total) > 0 THEN ROUND(SUM(csat_positive) * 100.0 / SUM(csat_total), 2) ELSE NULL END AS csat_score_pct
  FROM weekly GROUP BY 1, 2, 3
),
quarterly_prep AS (
  SELECT
    DATE_TRUNC(week_start, QUARTER) AS period_start,
    EXTRACT(QUARTER FROM DATE_TRUNC(week_start, QUARTER)) AS quarter_num,
    EXTRACT(YEAR FROM DATE_TRUNC(week_start, QUARTER)) AS year_num,
    csat_positive,
    csat_negative,
    csat_total
  FROM weekly
),
quarterly AS (
  SELECT
    period_start,
    'quarter' AS period_type,
    FORMAT('Q%d %d', quarter_num, year_num) AS period_label,
    SUM(csat_positive) AS csat_positive,
    SUM(csat_negative) AS csat_negative,
    SUM(csat_total) AS csat_total,
    CASE WHEN SUM(csat_total) > 0 THEN ROUND(SUM(csat_positive) * 100.0 / SUM(csat_total), 2) ELSE NULL END AS csat_score_pct
  FROM quarterly_prep
  GROUP BY period_start, period_type, period_label
)
SELECT * FROM monthly UNION ALL SELECT * FROM quarterly ORDER BY period_type, period_start DESC;