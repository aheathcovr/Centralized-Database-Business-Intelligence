-- NPS Monthly and Quarterly Aggregation View
-- Placeholder view for NPS data. Populate with your NPS source (Delighted, TypeForm, etc.)
-- Location: gen-lang-client-0844868008.revops_analytics.nps_monthly_quarterly
--
-- Expected input columns:
--   survey_date   DATE      Date the NPS survey was completed
--   nps_score     INT64     Score 0-10
--   domain        STRING    Customer domain URL (optional)
--   promoter_type STRING    'promoter' (9-10), 'passive' (7-8), 'detractor' (0-6)
--
-- To activate, create a source table and replace the CTE below with a SELECT from it.

CREATE OR REPLACE VIEW `gen-lang-client-0844868008.revops_analytics.nps_monthly_quarterly` AS

WITH nps_source AS (
  -- TODO: Replace this empty CTE with your NPS survey data source.
  -- Example:
  -- SELECT
  --   survey_date,
  --   nps_score,
  --   domain,
  --   CASE
  --     WHEN nps_score >= 9 THEN 'promoter'
  --     WHEN nps_score >= 7 THEN 'passive'
  --     ELSE 'detractor'
  --   END AS promoter_type
  -- FROM `your-project.your_dataset.your_nps_table`
  SELECT
    CAST(NULL AS DATE) AS survey_date,
    CAST(NULL AS INT64) AS nps_score,
    CAST(NULL AS STRING) AS domain,
    CAST(NULL AS STRING) AS promoter_type
  FROM (SELECT 1)  -- Dummy FROM clause to make the query valid
  WHERE FALSE
),

-- Monthly aggregation
monthly AS (
  SELECT
    DATE_TRUNC(survey_date, MONTH) AS period_start,
    'month' AS period_type,
    FORMAT_DATE('%Y-%m', DATE_TRUNC(survey_date, MONTH)) AS period_label,
    COUNT(*) AS total_responses,
    COUNTIF(promoter_type = 'promoter') AS promoters,
    COUNTIF(promoter_type = 'passive') AS passives,
    COUNTIF(promoter_type = 'detractor') AS detractors,
    CASE
      WHEN COUNT(*) > 0
      THEN ROUND((COUNTIF(promoter_type = 'promoter') - COUNTIF(promoter_type = 'detractor')) * 100.0 / COUNT(*), 2)
      ELSE NULL
    END AS nps_score
  FROM nps_source
  WHERE survey_date IS NOT NULL
  GROUP BY 1, 2, 3
),

-- Quarterly aggregation
quarterly_prep AS (
  SELECT
    DATE_TRUNC(survey_date, QUARTER) AS period_start,
    EXTRACT(QUARTER FROM DATE_TRUNC(survey_date, QUARTER)) AS quarter_num,
    EXTRACT(YEAR FROM DATE_TRUNC(survey_date, QUARTER)) AS year_num,
    promoter_type
  FROM nps_source
  WHERE survey_date IS NOT NULL
),

quarterly AS (
  SELECT
    period_start,
    'quarter' AS period_type,
    FORMAT('Q%d %d', quarter_num, year_num) AS period_label,
    COUNT(*) AS total_responses,
    COUNTIF(promoter_type = 'promoter') AS promoters,
    COUNTIF(promoter_type = 'passive') AS passives,
    COUNTIF(promoter_type = 'detractor') AS detractors,
    CASE
      WHEN COUNT(*) > 0
      THEN ROUND((COUNTIF(promoter_type = 'promoter') - COUNTIF(promoter_type = 'detractor')) * 100.0 / COUNT(*), 2)
      ELSE NULL
    END AS nps_score
  FROM quarterly_prep
  GROUP BY period_start, period_type, period_label
)

SELECT * FROM monthly
UNION ALL
SELECT * FROM quarterly
ORDER BY period_type, period_start DESC;