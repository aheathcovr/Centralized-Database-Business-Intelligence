-- CSAT by Domain URL
-- Extracts domain from Intercom conversation source.url and aggregates CSAT
-- Location: gen-lang-client-0844868008.revops_analytics.csat_by_domain

CREATE OR REPLACE VIEW `gen-lang-client-0844868008.revops_analytics.csat_by_domain` AS

WITH rated_conversations AS (
  SELECT
    JSON_EXTRACT_SCALAR(source, '$.url') AS source_url,
    REGEXP_EXTRACT(JSON_EXTRACT_SCALAR(source, '$.url'), r'https?://([^/]+)') AS domain,
    CAST(JSON_EXTRACT_SCALAR(conversation_rating, '$.rating') AS INT64) AS rating,
    TIMESTAMP_SECONDS(CAST(JSON_EXTRACT_SCALAR(conversation_rating, '$.created_at') AS INT64)) AS rated_at
  FROM `gen-lang-client-0844868008.Intercom_Airbyte.conversations`
  WHERE conversation_rating IS NOT NULL
    AND JSON_EXTRACT_SCALAR(conversation_rating, '$.rating') IS NOT NULL
    AND JSON_EXTRACT_SCALAR(source, '$.url') IS NOT NULL
)

SELECT
  domain,
  COUNT(*) AS total_ratings,
  COUNTIF(rating >= 4) AS csat_positive,
  COUNTIF(rating BETWEEN 1 AND 3) AS csat_negative,
  CASE
    WHEN COUNT(*) > 0
    THEN ROUND(COUNTIF(rating >= 4) * 100.0 / COUNT(*), 2)
    ELSE NULL
  END AS csat_score_pct
FROM rated_conversations
WHERE domain IS NOT NULL
  AND domain != ''
GROUP BY domain
ORDER BY total_ratings DESC;
