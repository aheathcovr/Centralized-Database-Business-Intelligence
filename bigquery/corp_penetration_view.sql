-- Corporation Penetration Dashboard Data Model
-- Shows parent corporation tasks with Definitive Healthcare penetration metrics
-- Penetration = facilities matched to Definitive Healthcare / total facilities
-- Location: gen-lang-client-0844868008.revops_analytics.corp_penetration_view

WITH corporations_only AS (
  -- Get only parent tasks from Corporations list (NOT subtasks)
  SELECT 
    t.*
  FROM `gen-lang-client-0844868008.ClickUp_AirbyteCustom.task` t
  WHERE JSON_EXTRACT_SCALAR(t.list, '$.id') = '901302721443'  -- 🏢 Corporations list
    AND t.archived = FALSE
),

clickup_corporations AS (
  SELECT
    id AS clickup_task_id,
    name AS corporation_name,
    JSON_EXTRACT_SCALAR(t.status, '$.status') AS task_status,
    t.date_created AS task_created_date,
    t.date_updated AS task_updated_date,
    
    -- Extract HubSpot URL
    (
      SELECT JSON_EXTRACT_SCALAR(field, '$.value')
      FROM UNNEST(JSON_EXTRACT_ARRAY(t.custom_fields)) AS field
      WHERE JSON_EXTRACT_SCALAR(field, '$.name') = 'Hubspot URL'
      LIMIT 1
    ) AS hubspot_url,
    
    -- Extract Customer Type (orderindex: 0=Flow+View, 1=Flow, 2=View, 3=Sync)
    -- Note: This field is actually about products, not customer status
    (
      SELECT JSON_EXTRACT_SCALAR(field, '$.value')
      FROM UNNEST(JSON_EXTRACT_ARRAY(t.custom_fields)) AS field
      WHERE JSON_EXTRACT_SCALAR(field, '$.name') = 'Customer Type'
      LIMIT 1
    ) AS customer_type_value,
    -- Extract Services (array of service IDs)
    (
      SELECT JSON_EXTRACT(field, '$.value')
      FROM UNNEST(JSON_EXTRACT_ARRAY(t.custom_fields)) AS field
      WHERE JSON_EXTRACT_SCALAR(field, '$.name') = 'Services'
      LIMIT 1
    ) AS services_json,
    
    -- Extract Total Facilities (manual override)
    SAFE_CAST((
      SELECT JSON_EXTRACT_SCALAR(field, '$.value')
      FROM UNNEST(JSON_EXTRACT_ARRAY(t.custom_fields)) AS field
      WHERE JSON_EXTRACT_SCALAR(field, '$.name') = 'Total Facilities'
      LIMIT 1
    ) AS INT64) AS total_facilities_override,
    
    -- Extract Org Code
    (
      SELECT JSON_EXTRACT(field, '$.value')
      FROM UNNEST(JSON_EXTRACT_ARRAY(t.custom_fields)) AS field
      WHERE JSON_EXTRACT_SCALAR(field, '$.name') = 'Org Code'
      LIMIT 1
    ) AS org_code_json,
    
    -- Extract "🏠 Companies" list relationship - this contains facility task IDs
    (
      SELECT JSON_EXTRACT(field, '$.value')
      FROM UNNEST(JSON_EXTRACT_ARRAY(t.custom_fields)) AS field
      WHERE JSON_EXTRACT_SCALAR(field, '$.name') = '🏠 Companies'
      LIMIT 1
    ) AS companies_list_json,
    
    -- Extract Billing Stop Date
    (
      SELECT JSON_EXTRACT_SCALAR(field, '$.value')
      FROM UNNEST(JSON_EXTRACT_ARRAY(t.custom_fields)) AS field
      WHERE JSON_EXTRACT_SCALAR(field, '$.name') = 'Billing Stop Date'
      LIMIT 1
    ) AS billing_stop_date_str,
    
    -- Extract Go-Live Date
    (
      SELECT JSON_EXTRACT_SCALAR(field, '$.value')
      FROM UNNEST(JSON_EXTRACT_ARRAY(t.custom_fields)) AS field
      WHERE JSON_EXTRACT_SCALAR(field, '$.name') = 'Go-Live Date'
      LIMIT 1
    ) AS go_live_date_str,
    
    -- Extract Dev Onboarding Start Date
    (
      SELECT JSON_EXTRACT_SCALAR(field, '$.value')
      FROM UNNEST(JSON_EXTRACT_ARRAY(t.custom_fields)) AS field
      WHERE JSON_EXTRACT_SCALAR(field, '$.name') = 'Dev Onboarding Start Date'
      LIMIT 1
    ) AS onboarding_start_date_str,
    
    t.custom_fields
    
  FROM corporations_only t
),

-- Customer Type field in ClickUp is actually about products (Flow, View, Sync)
-- We use task_status as the primary customer status indicator

-- Extract facility task IDs from the Companies JSON field
corp_facilities AS (
  SELECT
    cc.clickup_task_id,
    cc.corporation_name,
    JSON_EXTRACT_SCALAR(facility, '$.id') AS facility_task_id,
    JSON_EXTRACT_SCALAR(facility, '$.name') AS facility_name,
    JSON_EXTRACT_SCALAR(facility, '$.status') AS facility_status
  FROM clickup_corporations cc,
    UNNEST(JSON_EXTRACT_ARRAY(cc.companies_list_json)) AS facility
  WHERE cc.companies_list_json IS NOT NULL
),

-- Match facility task IDs to company_join_keys and get Definitive Healthcare matches
facilities_with_dh AS (
  SELECT 
    cf.*,
    cjk.definitive_hospital_id,
    cjk.definitive_hospital_name,
    cjk.matched_definitive_healthcare
  FROM corp_facilities cf
  LEFT JOIN `gen-lang-client-0844868008.revops_analytics.company_join_keys` cjk
    ON cf.facility_task_id = cjk.clickup_task_id
),

-- Aggregate penetration metrics by corporation
penetration_metrics AS (
  SELECT
    clickup_task_id,
    corporation_name,
    COUNT(*) AS total_facilities,
    SUM(CASE WHEN matched_definitive_healthcare = TRUE THEN 1 ELSE 0 END) AS facilities_in_dh,
    SUM(CASE WHEN matched_definitive_healthcare = TRUE THEN 1 ELSE 0 END) AS facilities_matched,
    SAFE_DIVIDE(
      SUM(CASE WHEN matched_definitive_healthcare = TRUE THEN 1 ELSE 0 END),
      COUNT(*)
    ) AS penetration_rate
  FROM facilities_with_dh
  GROUP BY clickup_task_id, corporation_name
),

-- Parse corporations with all dimensions
parsed_corporations AS (
  SELECT
    cc.*,
    COALESCE(pm.total_facilities, 0) AS total_facilities,
    COALESCE(pm.facilities_in_dh, 0) AS facilities_in_dh,
    COALESCE(pm.facilities_matched, 0) AS facilities_matched,
    COALESCE(pm.penetration_rate, 0) AS penetration_rate,
    
    -- Task Status is the primary customer status (active, churned, implementation, stalled, offboarding)
    CASE 
      WHEN cc.task_status = 'active' THEN 'Active'
      WHEN cc.task_status = 'churned' THEN 'Churned'
      WHEN cc.task_status = 'implementation' THEN 'Implementation'
      WHEN cc.task_status = 'stalled' THEN 'Stalled'
      WHEN cc.task_status = 'offboarding' THEN 'Offboarding'
      WHEN cc.task_status = 'closed (don\'t use)' THEN 'Closed'
      ELSE COALESCE(cc.task_status, 'Unknown')
    END AS task_status_label,
    
    -- Customer Type field in ClickUp is about products, not customer status
    -- Values are orderindex: 0=Flow+View, 1=Flow, 2=View, 3=Sync
    CASE 
      WHEN cc.customer_type_value = '0' THEN 'Flow + View'
      WHEN cc.customer_type_value = '1' THEN 'Flow'
      WHEN cc.customer_type_value = '2' THEN 'View'
      WHEN cc.customer_type_value = '3' THEN 'Sync'
      ELSE NULL
    END AS customer_type_label,
    
    -- Convert dates from milliseconds string to timestamps
    TIMESTAMP_MILLIS(SAFE_CAST(cc.billing_stop_date_str AS INT64)) AS billing_stop_date,
    TIMESTAMP_MILLIS(SAFE_CAST(cc.go_live_date_str AS INT64)) AS go_live_date,
    TIMESTAMP_MILLIS(SAFE_CAST(cc.onboarding_start_date_str AS INT64)) AS onboarding_start_date,
    -- task_created_date and task_updated_date are also millisecond timestamps stored as strings
    TIMESTAMP_MILLIS(SAFE_CAST(cc.task_created_date AS INT64)) AS task_created_timestamp,
    TIMESTAMP_MILLIS(SAFE_CAST(cc.task_updated_date AS INT64)) AS task_updated_timestamp
    
  FROM clickup_corporations cc
  LEFT JOIN penetration_metrics pm ON cc.clickup_task_id = pm.clickup_task_id
),

-- Extract HubSpot ID (handle trailing slashes)
hubspot_parsed AS (
  SELECT
    pc.*,
    REGEXP_EXTRACT(pc.hubspot_url, r'/0-2/(\d+)/?$') AS hubspot_company_id
  FROM parsed_corporations pc
),

-- Service ID to Product mapping (from ClickUp type_config.options labels)
-- Flow services (Blue #81B1FF): Scheduling, Employee Texting, Engagement, Resident Family Texting, Meal Break Tool
-- View services (Orange #ff7800): Admissions and Discharges, Census, AR and Collections, Revenue Rates, Clinical Report, Financials, Labor, QIPP Labor, MDS, Therapy
-- Sync services: QRM (Yellow), Tapestry (Teal)

-- Calculate product mix flags using full UUIDs (use TO_JSON_STRING for JSON conversion)
corporations_with_products AS (
  SELECT
    hp.*,
    -- Flow: Scheduling, Employee Texting, Engagement, Resident Family Texting, Meal Break Tool
    CASE 
      WHEN TO_JSON_STRING(hp.services_json) LIKE '%f3a593d5-a06a-4216-9332-eab13e041412%' THEN TRUE  -- Scheduling
      WHEN TO_JSON_STRING(hp.services_json) LIKE '%c8c4a939-cd7e-4a11-b051-ae5b779ba70a%' THEN TRUE  -- Employee Texting
      WHEN TO_JSON_STRING(hp.services_json) LIKE '%cc7acf27-3684-4f12-982f-8073b87ad247%' THEN TRUE  -- Engagement
      WHEN TO_JSON_STRING(hp.services_json) LIKE '%550059fb-25a0-466f-9707-091c52ad0c80%' THEN TRUE  -- Resident Family Texting
      WHEN TO_JSON_STRING(hp.services_json) LIKE '%237d1afc-9088-4806-9e0c-6b7427da3a67%' THEN TRUE  -- Meal Break Tool
      ELSE FALSE 
    END AS has_flow,
    -- View: Admissions and Discharges, Census, AR and Collections, Revenue Rates, Clinical Report, Financials, Labor, QIPP Labor, MDS, Therapy
    CASE 
      WHEN TO_JSON_STRING(hp.services_json) LIKE '%76b802ef-b89a-4159-bbc1-a34a494e2ec3%' THEN TRUE  -- Admissions and Discharges
      WHEN TO_JSON_STRING(hp.services_json) LIKE '%52161756-9575-4795-b536-030720139a1c%' THEN TRUE  -- Census
      WHEN TO_JSON_STRING(hp.services_json) LIKE '%d96da6c3-32b0-4ff8-bf2b-6bc7a691e848%' THEN TRUE  -- AR and Collections
      WHEN TO_JSON_STRING(hp.services_json) LIKE '%232a5033-727f-4a02-a1ff-43f02a84998f%' THEN TRUE  -- Revenue Rates
      WHEN TO_JSON_STRING(hp.services_json) LIKE '%dc6b5d63-f8bd-43bf-8d8b-b108e9117bc5%' THEN TRUE  -- Clinical Report
      WHEN TO_JSON_STRING(hp.services_json) LIKE '%8fcab807-0b0b-4c4b-8763-332a341e2c31%' THEN TRUE  -- Financials
      WHEN TO_JSON_STRING(hp.services_json) LIKE '%9faebdbf-c8f8-4cbb-897f-f852e173d831%' THEN TRUE  -- Labor
      WHEN TO_JSON_STRING(hp.services_json) LIKE '%01613933-3d42-430d-9bc5-fc8827de3c46%' THEN TRUE  -- QIPP Labor
      WHEN TO_JSON_STRING(hp.services_json) LIKE '%57ed5012-9241-4a88-94d9-9d40f45f31b8%' THEN TRUE  -- MDS
      WHEN TO_JSON_STRING(hp.services_json) LIKE '%e76eef4d-fa3b-4bf6-8bce-a96cd09f5b77%' THEN TRUE  -- Therapy
      ELSE FALSE 
    END AS has_view,
    -- Sync: QRM, Tapestry
    CASE 
      WHEN TO_JSON_STRING(hp.services_json) LIKE '%fd1f037f-7387-477e-afbd-d6262ba54768%' THEN TRUE  -- QRM
      WHEN TO_JSON_STRING(hp.services_json) LIKE '%3b09403a-9ed8-4060-b96a-89a14cad1666%' THEN TRUE  -- Tapestry
      ELSE FALSE 
    END AS has_sync
  FROM hubspot_parsed hp
)

-- Final output with all dimensions
SELECT
  cc.* EXCEPT(custom_fields, services_json, org_code_json, companies_list_json, 
              billing_stop_date_str, go_live_date_str, onboarding_start_date_str,
              task_created_date, task_updated_date),
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

ORDER BY penetration_rate DESC, corporation_name