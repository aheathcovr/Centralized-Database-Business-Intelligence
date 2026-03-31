-- Intercom Monthly Support Metrics View
-- Aggregates weekly support metrics into monthly periods
-- Dataset: revops_analytics.intercom_monthly_support_metrics
-- Source: revops_analytics.intercom_weekly_support_metrics

CREATE OR REPLACE VIEW `gen-lang-client-0844868008.revops_analytics.intercom_monthly_support_metrics` AS

WITH weekly AS (
  SELECT
    week_start,
    new_tickets,
    closed_tickets,
    csat_positive,
    csat_negative,
    csat_total,
    csat_score_pct,
    first_response_avg_seconds,
    first_response_median_seconds,
    first_response_avg_minutes,
    first_response_median_minutes,
    first_response_avg_hours,
    first_response_median_hours
  FROM `gen-lang-client-0844868008.revops_analytics.intercom_weekly_support_metrics`
)

SELECT
  DATE_TRUNC(week_start, MONTH) AS month_start,
  FORMAT_DATE('%b %Y', DATE_TRUNC(week_start, MONTH)) AS year_month,
  EXTRACT(YEAR FROM DATE_TRUNC(week_start, MONTH)) AS year,
  EXTRACT(MONTH FROM DATE_TRUNC(week_start, MONTH)) AS month_number,
  SUM(new_tickets) AS new_tickets,
  SUM(closed_tickets) AS closed_tickets,
  SUM(csat_positive) AS csat_positive,
  SUM(csat_negative) AS csat_negative,
  SUM(csat_total) AS csat_total,
  CASE
    WHEN SUM(csat_total) > 0
    THEN ROUND(SUM(csat_positive) * 100.0 / SUM(csat_total), 2)
    ELSE NULL
  END AS csat_score_pct,
  ROUND(SUM(first_response_avg_seconds * new_tickets) / NULLIF(SUM(new_tickets), 0), 2) AS first_response_avg_seconds,
  ROUND(SUM(first_response_median_seconds * new_tickets) / NULLIF(SUM(new_tickets), 0), 2) AS first_response_median_seconds,
  ROUND(SUM(first_response_avg_seconds * new_tickets) / NULLIF(SUM(new_tickets), 0) / 60, 2) AS first_response_avg_minutes,
  ROUND(SUM(first_response_median_seconds * new_tickets) / NULLIF(SUM(new_tickets), 0) / 60, 2) AS first_response_median_minutes,
  ROUND(SUM(first_response_avg_seconds * new_tickets) / NULLIF(SUM(new_tickets), 0) / 3600, 2) AS first_response_avg_hours,
  ROUND(SUM(first_response_median_seconds * new_tickets) / NULLIF(SUM(new_tickets), 0) / 3600, 2) AS first_response_median_hours
FROM weekly
GROUP BY month_start, year_month, year, month_number
ORDER BY month_start DESC;
