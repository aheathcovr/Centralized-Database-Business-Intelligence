-- Corporation Penetration Dashboard Data Model
-- Shows ONLY parent corporation tasks (excludes subtasks)
-- Rolls up associated companies from the Companies list
-- Location: gen-lang-client-0844868008.revops_analytics.corp_penetration_view

WITH corporations_only AS (
  -- Get only parent tasks from Corporations list (NOT subtasks)
  SELECT 
    t.*
  FROM `gen-lang-client-0844868008.clickup.task` t
  LEFT JOIN `gen-lang-client-0844868008.clickup.sub_task` st 
    ON t.id = st.id
  WHERE t.list_id = 901302721443  -- 🏢 Corporations list
    AND t.archived = FALSE
    AND st.parent IS NULL  -- Exclude subtasks
),

clickup_corporations AS (
  SELECT
    id AS clickup_task_id,
    name AS corporation_name,
    status_status AS task_status,
    date_created AS task_created_date,
    date_updated AS task_updated_date,
    
    -- Extract HubSpot URL
    (
      SELECT JSON_EXTRACT_SCALAR(field, '$.value')
      FROM UNNEST(JSON_EXTRACT_ARRAY(custom_fields)) AS field
      WHERE JSON_EXTRACT_SCALAR(field, '$.name') = 'Hubspot URL'
      LIMIT 1
    ) AS hubspot_url,
    
    -- Extract Customer Type (0=Churned, 1=Active, 2=No Start, 3=Paused, 4=Prospect)
    (
      SELECT JSON_EXTRACT_SCALAR(field, '$.value')
      FROM UNNEST(JSON_EXTRACT_ARRAY(custom_fields)) AS field
      WHERE JSON_EXTRACT_SCALAR(field, '$.name') = 'Customer Type'
      LIMIT 1
    ) AS customer_type_value,
    
    -- Extract Services (array of service IDs)
    (
      SELECT JSON_EXTRACT(field, '$.value')
      FROM UNNEST(JSON_EXTRACT_ARRAY(custom_fields)) AS field
      WHERE JSON_EXTRACT_SCALAR(field, '$.name') = 'Services'
      LIMIT 1
    ) AS services_json,
    
    -- Extract Total Facilities
    SAFE_CAST((
      SELECT JSON_EXTRACT_SCALAR(field, '$.value')
      FROM UNNEST(JSON_EXTRACT_ARRAY(custom_fields)) AS field
      WHERE JSON_EXTRACT_SCALAR(field, '$.name') = 'Total Facilities'
      LIMIT 1
    ) AS INT64) AS total_facilities_override,
    
    -- Extract Org Code
    (
      SELECT JSON_EXTRACT(field, '$.value')
      FROM UNNEST(JSON_EXTRACT_ARRAY(custom_fields)) AS field
      WHERE JSON_EXTRACT_SCALAR(field, '$.name') = 'Org Code'
      LIMIT 1
    ) AS org_code_json,
    
    -- Extract "🏠 Companies" list relationship to count associated companies
    (
      SELECT JSON_EXTRACT(field, '$.value')
      FROM UNNEST(JSON_EXTRACT_ARRAY(custom_fields)) AS field
      WHERE JSON_EXTRACT_SCALAR(field, '$.name') = '🏠 Companies'
      LIMIT 1
    ) AS companies_list_json,
    
    -- Extract Billing Stop Date
    SAFE_CAST((
      SELECT JSON_EXTRACT_SCALAR(field, '$.value')
      FROM UNNEST(JSON_EXTRACT_ARRAY(custom_fields)) AS field
      WHERE JSON_EXTRACT_SCALAR(field, '$.name') = 'Billing Stop Date'
      LIMIT 1
    ) AS INT64) AS billing_stop_date_ms,
    
    -- Extract Go-Live Date
    SAFE_CAST((
      SELECT JSON_EXTRACT_SCALAR(field, '$.value')
      FROM UNNEST(JSON_EXTRACT_ARRAY(custom_fields)) AS field
      WHERE JSON_EXTRACT_SCALAR(field, '$.name') = 'Go-Live Date'
      LIMIT 1
    ) AS INT64) AS go_live_date_ms,
    
    -- Extract Dev Onboarding Start Date
    SAFE_CAST((
      SELECT JSON_EXTRACT_SCALAR(field, '$.value')
      FROM UNNEST(JSON_EXTRACT_ARRAY(custom_fields)) AS field
      WHERE JSON_EXTRACT_SCALAR(field, '$.name') = 'Dev Onboarding Start Date'
      LIMIT 1
    ) AS INT64) AS onboarding_start_date_ms,
    
    custom_fields
    
  FROM corporations_only
),

-- Map Customer Type values to labels
customer_type_mapping AS (
  SELECT 0 AS value, "Churned" AS label UNION ALL
  SELECT 1, "Active" UNION ALL
  SELECT 2, "No Start" UNION ALL
  SELECT 3, "Paused" UNION ALL
  SELECT 4, "Prospect"
),

-- Count associated companies from the Companies list relationship
companies_count AS (
  SELECT
    cc.clickup_task_id,
    ARRAY_LENGTH(JSON_EXTRACT_ARRAY(cc.companies_list_json)) AS associated_companies_count
  FROM clickup_corporations cc
),

-- Parse corporations with all dimensions
parsed_corporations AS (
  SELECT
    cc.*,
    COALESCE(ac.associated_companies_count, 0) AS associated_companies_count,
    
    -- Task Status derived fields
    CASE 
      WHEN cc.task_status = 'active' THEN 'Active'
      WHEN cc.task_status = 'churned' THEN 'Churned'
      WHEN cc.task_status = 'implementation' THEN 'Implementation'
      WHEN cc.task_status = 'stalled' THEN 'Stalled'
      WHEN cc.task_status = 'offboarding' THEN 'Offboarding'
      WHEN cc.task_status = 'closed (don\'t use)' THEN 'Closed'
      ELSE cc.task_status
    END AS task_status_label,
    
    -- Customer Type label
    ctm.label AS customer_type_label,
    
    -- Convert dates from milliseconds to timestamps
    TIMESTAMP_MILLIS(cc.billing_stop_date_ms) AS billing_stop_date,
    TIMESTAMP_MILLIS(cc.go_live_date_ms) AS go_live_date,
    TIMESTAMP_MILLIS(cc.onboarding_start_date_ms) AS onboarding_start_date,
    TIMESTAMP_MILLIS(cc.task_created_date) AS task_created_timestamp,
    TIMESTAMP_MILLIS(cc.task_updated_date) AS task_updated_timestamp
    
  FROM clickup_corporations cc
  LEFT JOIN companies_count ac ON cc.clickup_task_id = ac.clickup_task_id
  LEFT JOIN customer_type_mapping ctm 
    ON SAFE_CAST(cc.customer_type_value AS INT64) = ctm.value
),

-- Extract HubSpot ID
hubspot_parsed AS (
  SELECT
    pc.*,
    REGEXP_EXTRACT(pc.hubspot_url, r'/0-2/(\d+)$') AS hubspot_company_id
  FROM parsed_corporations pc
),

-- Get HubSpot parent companies
hubspot_parents AS (
  SELECT
    id AS hs_company_id,
    properties_name AS hs_company_name,
    properties_hs_parent_company_id AS hs_parent_id,
    CASE WHEN properties_hs_parent_company_id IS NULL THEN TRUE ELSE FALSE END AS is_parent_company
  FROM `gen-lang-client-0844868008.HubSpot_Airbyte.companies`
  WHERE archived = FALSE
),

-- Count child facilities per parent company in HubSpot
hubspot_child_counts AS (
  SELECT
    p.hs_company_id AS parent_company_id,
    COUNT(c.id) AS total_child_facilities,
    COUNTIF(c.properties_clickup_task_id IS NOT NULL) AS facilities_with_clickup
  FROM hubspot_parents p
  LEFT JOIN `gen-lang-client-0844868008.HubSpot_Airbyte.companies` c
    ON SAFE_CAST(c.properties_hs_parent_company_id AS STRING) = p.hs_company_id
  WHERE c.archived = FALSE
    AND p.is_parent_company = TRUE
  GROUP BY p.hs_company_id
),

-- Calculate product mix flags
corporations_with_products AS (
  SELECT
    hp.*,
    CASE 
      WHEN TO_JSON_STRING(hp.services_json) LIKE '%f3a593d5%' THEN TRUE 
      WHEN TO_JSON_STRING(hp.services_json) LIKE '%c8c4a939%' THEN TRUE
      WHEN TO_JSON_STRING(hp.services_json) LIKE '%cc7acf27%' THEN TRUE
      WHEN TO_JSON_STRING(hp.services_json) LIKE '%550059fb%' THEN TRUE
      ELSE FALSE 
    END AS has_flow,
    CASE 
      WHEN TO_JSON_STRING(hp.services_json) LIKE '%76b802ef%' THEN TRUE
      WHEN TO_JSON_STRING(hp.services_json) LIKE '%52161756%' THEN TRUE
      WHEN TO_JSON_STRING(hp.services_json) LIKE '%d96da6c3%' THEN TRUE
      WHEN TO_JSON_STRING(hp.services_json) LIKE '%232a5033%' THEN TRUE
      WHEN TO_JSON_STRING(hp.services_json) LIKE '%dc6b5d63%' THEN TRUE
      ELSE FALSE 
    END AS has_view,
    CASE 
      WHEN TO_JSON_STRING(hp.services_json) LIKE '%fd1f037f%' THEN TRUE
      WHEN TO_JSON_STRING(hp.services_json) LIKE '%3b09403a%' THEN TRUE
      ELSE FALSE 
    END AS has_sync
  FROM hubspot_parsed hp
)

-- Final output with all dimensions
SELECT
  cc.*,
  hcc.total_child_facilities,
  hcc.facilities_with_clickup,
  CASE 
    WHEN hcc.total_child_facilities > 0 
    THEN SAFE_DIVIDE(hcc.facilities_with_clickup, hcc.total_child_facilities)
    ELSE 0 
  END AS penetration_rate,
  CASE
    WHEN cc.has_flow AND cc.has_view AND cc.has_sync THEN "Flow + View + Sync"
    WHEN cc.has_flow AND cc.has_view THEN "Flow + View"
    WHEN cc.has_flow AND cc.has_sync THEN "Flow + Sync"
    WHEN cc.has_view AND cc.has_sync THEN "View + Sync"
    WHEN cc.has_flow THEN "Flow"
    WHEN cc.has_view THEN "View"
    WHEN cc.has_sync THEN "Sync"
    ELSE "Unknown"
  END AS product_mix,
  CURRENT_TIMESTAMP() AS _loaded_at

FROM corporations_with_products cc
LEFT JOIN hubspot_child_counts hcc 
  ON cc.hubspot_company_id = hcc.parent_company_id

ORDER BY penetration_rate DESC, corporation_name
