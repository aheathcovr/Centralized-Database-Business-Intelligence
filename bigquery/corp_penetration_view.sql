-- Corporation Penetration & Walletshare Dashboard Data Model
-- Shows parent corporation tasks with Definitive Healthcare penetration metrics
-- Penetration = facilities matched to Definitive Healthcare / total facilities
-- Walletshare = % of child facilities actively using Flow and/or View products
-- Location: gen-lang-client-0844868008.revops_analytics.corp_penetration_view
--
-- Status Categories for Walletshare:
--   ACTIVE SHARE: active, onboarding, implementation
--   WIN-BACK: churned*, offboarding
--   NO-START OPPORTUNITY: no-start
--   UNTAPPED: DH-matched facilities not linked as child facilities in ClickUp
--
-- Product Mapping (customer_type_value from facility tasks):
--   0 = Flow + View, 1 = Flow, 2 = View, 3 = Sync

-- ============================================================
-- SECTION 1: Corporation Parent Tasks
-- ============================================================

WITH corporations_only AS (
  -- Get only parent tasks from Corporations list (NOT subtasks)
  SELECT
    t.*
  FROM `gen-lang-client-0844868008.ClickUp_AirbyteCustom.task` t
  WHERE JSON_EXTRACT_SCALAR(t.list, '$.id') = '901302721443'  -- Corporations list
    AND t.archived = FALSE
),

-- ============================================================
-- SECTION 2: Extract Corporation Dimensions
-- ============================================================

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

    -- Extract Customer Type (0=Flow+View, 1=Flow, 2=View, 3=Sync)
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

    -- Extract Companies list relationship - contains facility task IDs
    (
      SELECT JSON_EXTRACT(field, '$.value')
      FROM UNNEST(JSON_EXTRACT_ARRAY(t.custom_fields)) AS field
      WHERE JSON_EXTRACT_SCALAR(field, '$.name') = 'Companies'
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

-- ============================================================
-- SECTION 3: Extract Facility-Level Customer Type from Companies List
-- ============================================================

-- Get customer type directly from facility tasks in the Companies list
facility_customer_type AS (
  SELECT
    t.id AS facility_task_id,
    (
      SELECT JSON_EXTRACT_SCALAR(field, '$.value')
      FROM UNNEST(JSON_EXTRACT_ARRAY(t.custom_fields)) AS field
      WHERE JSON_EXTRACT_SCALAR(field, '$.name') = 'Customer Type'
      LIMIT 1
    ) AS customer_type_value,
    JSON_EXTRACT_SCALAR(t.status, '$.status') AS task_status
  FROM `gen-lang-client-0844868008.ClickUp_AirbyteCustom.task` t
  WHERE JSON_EXTRACT_SCALAR(t.list, '$.id') = '901302721435'  -- Companies list
    AND t.archived = FALSE
),

-- ============================================================
-- SECTION 4: Extract Corporation Child Facilities
-- ============================================================

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

-- ============================================================
-- SECTION 5: Enrich Facilities with Customer Type and Status
-- ============================================================

facilities_with_customer AS (
  SELECT
    cf.*,
    COALESCE(fct.customer_type_value, NULL) AS fac_customer_type_value,
    COALESCE(fct.task_status, cf.facility_status) AS fac_task_status
  FROM corp_facilities cf
  LEFT JOIN facility_customer_type fct
    ON cf.facility_task_id = fct.facility_task_id
),

-- ============================================================
-- SECTION 6: Join to Definitive Healthcare
-- ============================================================

facilities_with_dh AS (
  SELECT
    fwc.* EXCEPT(fac_customer_type_value, fac_task_status),
    fwc.fac_customer_type_value AS customer_type_value,
    fwc.fac_task_status AS fac_task_status,
    cjk.definitive_hospital_id,
    cjk.definitive_hospital_name,
    cjk.matched_definitive_healthcare
  FROM facilities_with_customer fwc
  LEFT JOIN `gen-lang-client-0844868008.revops_analytics.company_join_keys` cjk
    ON fwc.facility_task_id = cjk.clickup_task_id
),

-- ============================================================
-- SECTION 7: Walletshare Status Categorization
-- ============================================================

facilities_categorized AS (
  SELECT
    fc.*,
    -- Product classification
    CASE
      WHEN fc.customer_type_value = '0' THEN 'Flow + View'
      WHEN fc.customer_type_value = '1' THEN 'Flow'
      WHEN fc.customer_type_value = '2' THEN 'View'
      WHEN fc.customer_type_value = '3' THEN 'Sync'
      ELSE 'Unknown'
    END AS facility_product,
    -- Whether this facility counts toward Flow/View walletshare
    CASE
      WHEN fc.customer_type_value IN ('0', '1', '2')
        AND fc.fac_task_status IN ('active', 'onboarding', 'implementation') THEN TRUE
      ELSE FALSE
    END AS counts_toward_walletshare,
    -- Product flags for decomposition
    CASE WHEN fc.customer_type_value IN ('0', '1') THEN 1 ELSE 0 END AS is_flow,
    CASE WHEN fc.customer_type_value IN ('0', '2') THEN 1 ELSE 0 END AS is_view,
    CASE WHEN fc.customer_type_value = '3' THEN 1 ELSE 0 END AS is_sync
  FROM facilities_with_dh fc
),

-- ============================================================
-- SECTION 8: Aggregate Walletshare Metrics by Corporation
-- ============================================================

walletshare_metrics AS (
  SELECT
    clickup_task_id,
    -- Total child facilities in ClickUp
    COUNT(*) AS total_facilities,
    -- Total DH-matched facilities
    SUM(CASE WHEN matched_definitive_healthcare = TRUE THEN 1 ELSE 0 END) AS facilities_in_dh,
    -- Active Flow/View facilities (walletshare numerator)
    SUM(CASE WHEN counts_toward_walletshare THEN 1 ELSE 0 END) AS active_facilities,
    -- Walletshare percentage
    SAFE_DIVIDE(
      SUM(CASE WHEN counts_toward_walletshare THEN 1 ELSE 0 END),
      COUNT(*)
    ) AS walletshare_pct,
    -- Product decomposition (among active Flow/View)
    SUM(CASE WHEN counts_toward_walletshare AND is_flow = 1 AND is_view = 0 THEN 1 ELSE 0 END) AS active_flow_only,
    SUM(CASE WHEN counts_toward_walletshare AND is_view = 1 AND is_flow = 0 THEN 1 ELSE 0 END) AS active_view_only,
    SUM(CASE WHEN counts_toward_walletshare AND is_flow AND is_view THEN 1 ELSE 0 END) AS active_flow_and_view,
    -- Active Sync (separate from Flow/View walletshare)
    SUM(CASE WHEN fac_task_status IN ('active', 'onboarding', 'implementation') AND is_sync THEN 1 ELSE 0 END) AS active_sync,
    -- Opportunity: Win-back (churned + offboarding)
    SUM(CASE WHEN fac_task_status IN ('active', 'onboarding', 'implementation') AND is_sync THEN 0
      WHEN fac_task_status LIKE 'churned%' OR fac_task_status = 'offboarding' THEN 1 ELSE 0 END) AS win_back_facilities,
    -- Opportunity: No-start
    SUM(CASE WHEN fac_task_status = 'no-start' THEN 1 ELSE 0 END) AS no_start_facilities,
    -- Opportunity: Stalled
    SUM(CASE WHEN fac_task_status = 'stalled' THEN 1 ELSE 0 END) AS stalled_facilities,
    -- DH matched but no customer relationship (untapped)
    SUM(CASE WHEN matched_definitive_healthcare = TRUE
      AND customer_type_value IS NULL THEN 1 ELSE 0 END) AS untapped_dh_only,
    -- Total opportunity = win_back + no_start + stalled
    SUM(CASE WHEN (fac_task_status LIKE 'churned%' OR fac_task_status = 'offboarding'
      OR fac_task_status = 'no-start' OR fac_task_status = 'stalled') THEN 1 ELSE 0 END) AS total_opportunity_facilities
  FROM facilities_categorized
  GROUP BY clickup_task_id
),

-- ============================================================
-- SECTION 9: Penetration Rate Calculation
-- ============================================================

penetration_metrics AS (
  SELECT
    clickup_task_id,
    total_facilities,
    facilities_in_dh,
    active_facilities,
    walletshare_pct,
    active_flow_only,
    active_view_only,
    active_flow_and_view,
    active_sync,
    win_back_facilities,
    no_start_facilities,
    stalled_facilities,
    untapped_dh_only,
    total_opportunity_facilities,
    -- Original penetration rate = DH matched / total child facilities
    SAFE_DIVIDE(facilities_in_dh, total_facilities) AS penetration_rate
  FROM walletshare_metrics
),

-- ============================================================
-- SECTION 10: Parse Corporation Dimensions
-- ============================================================

-- Get corporation names for join
corporation_names AS (
  SELECT DISTINCT clickup_task_id, corporation_name
  FROM corp_facilities
),

parsed_corporations AS (
  SELECT
    cc.* EXCEPT(custom_fields, services_json, org_code_json, companies_list_json,
                billing_stop_date_str, go_live_date_str, onboarding_start_date_str,
                task_created_date, task_updated_date),

    -- Corporation-level status label
    CASE
      WHEN cc.task_status = 'active' THEN 'Active'
      WHEN cc.task_status LIKE 'churned%' THEN 'Churned'
      WHEN cc.task_status = 'implementation' THEN 'Implementation'
      WHEN cc.task_status = 'stalled' THEN 'Stalled'
      WHEN cc.task_status = 'offboarding' THEN 'Offboarding'
      WHEN cc.task_status = 'no-start' THEN 'No-Start'
      WHEN cc.task_status = 'onboarding' THEN 'Onboarding'
      WHEN cc.task_status LIKE 'closed%' THEN 'Closed'
      ELSE COALESCE(cc.task_status, 'Unknown')
    END AS task_status_label,

    -- Corporation-level product label
    CASE
      WHEN cc.customer_type_value = '0' THEN 'Flow + View'
      WHEN cc.customer_type_value = '1' THEN 'Flow'
      WHEN cc.customer_type_value = '2' THEN 'View'
      WHEN cc.customer_type_value = '3' THEN 'Sync'
      ELSE NULL
    END AS customer_type_label,

    -- Dates from millisecond strings to timestamps
    TIMESTAMP_MILLIS(SAFE_CAST(cc.billing_stop_date_str AS INT64)) AS billing_stop_date,
    TIMESTAMP_MILLIS(SAFE_CAST(cc.go_live_date_str AS INT64)) AS go_live_date,
    TIMESTAMP_MILLIS(SAFE_CAST(cc.onboarding_start_date_str AS INT64)) AS onboarding_start_date,
    TIMESTAMP_MILLIS(SAFE_CAST(cc.task_created_date AS INT64)) AS task_created_timestamp,
    TIMESTAMP_MILLIS(SAFE_CAST(cc.task_updated_date AS INT64)) AS task_updated_timestamp

  FROM clickup_corporations cc
),

-- ============================================================
-- SECTION 11: Extract HubSpot ID
-- ============================================================

hubspot_parsed AS (
  SELECT
    pc.*,
    REGEXP_EXTRACT(pc.hubspot_url, r'/0-2/(\d+)/?$') AS hubspot_company_id
  FROM parsed_corporations pc
),

-- ============================================================
-- SECTION 12: Product Mix from Services
-- ============================================================

corporations_with_products AS (
  SELECT
    hp.*,
    CASE
      WHEN TO_JSON_STRING(hp.services_json) LIKE '%f3a593d5-a06a-4216-9332-eab13e041412%'
        OR TO_JSON_STRING(hp.services_json) LIKE '%c8c4a939-cd7e-4a11-b051-ae5b779ba70a%'
        OR TO_JSON_STRING(hp.services_json) LIKE '%cc7acf27-3684-4f12-982f-8073b87ad247%'
        OR TO_JSON_STRING(hp.services_json) LIKE '%550059fb-25a0-466f-9707-091c52ad0c80%'
        OR TO_JSON_STRING(hp.services_json) LIKE '%237d1afc-9088-4806-9e0c-6b7427da3a67%'
      THEN TRUE ELSE FALSE
    END AS has_flow,
    CASE
      WHEN TO_JSON_STRING(hp.services_json) LIKE '%76b802ef-b89a-4159-bbc1-a34a494e2ec3%'
        OR TO_JSON_STRING(hp.services_json) LIKE '%52161756-9575-4795-b536-030720139a1c%'
        OR TO_JSON_STRING(hp.services_json) LIKE '%d96da6c3-32b0-4ff8-bf2b-6bc7a691e848%'
        OR TO_JSON_STRING(hp.services_json) LIKE '%232a5033-727f-4a02-a1ff-43f02a84998f%'
        OR TO_JSON_STRING(hp.services_json) LIKE '%dc6b5d63-f8bd-43bf-8d8b-b108e9117bc5%'
        OR TO_JSON_STRING(hp.services_json) LIKE '%8fcab807-0b0b-4c4b-8763-332a341e2c31%'
        OR TO_JSON_STRING(hp.services_json) LIKE '%9faebdbf-c8f8-4cbb-897f-f852e173d831%'
        OR TO_JSON_STRING(hp.services_json) LIKE '%01613933-3d42-430d-9bc5-fc8827de3c46%'
        OR TO_JSON_STRING(hp.services_json) LIKE '%57ed5012-9241-4a88-94d9-9d40f45f31b8%'
        OR TO_JSON_STRING(hp.services_json) LIKE '%e76eef4d-fa3b-4bf6-8bce-a96cd09f5b77%'
      THEN TRUE ELSE FALSE
    END AS has_view,
    CASE
      WHEN TO_JSON_STRING(hp.services_json) LIKE '%fd1f037f-7387-477e-afbd-d6262ba54768%'
        OR TO_JSON_STRING(hp.services_json) LIKE '%3b09403a-9ed8-4060-b96a-89a14cad1666%'
      THEN TRUE ELSE FALSE
    END AS has_sync
  FROM hubspot_parsed hp
),

-- ============================================================
-- SECTION 13: Final Output with Walletshare Columns
-- ============================================================

final_output AS (
  SELECT
    -- Corporation identifiers
    cp.clickup_task_id,
    cn.corporation_name,

    -- Corporation-level status and product
    cp.task_status_label,
    cp.customer_type_label,
    cp.task_status,

    -- HubSpot info
    cp.hubspot_url,
    cp.hubspot_company_id,

    -- Product mix at corporation level
    CASE
      WHEN cp.has_flow AND cp.has_view AND cp.has_sync THEN "Flow + View + Sync"
      WHEN cp.has_flow AND cp.has_view THEN "Flow + View"
      WHEN cp.has_flow AND cp.has_sync THEN "Flow + Sync"
      WHEN cp.has_view AND cp.has_sync THEN "View + Sync"
      WHEN cp.has_flow THEN "Flow"
      WHEN cp.has_view THEN "View"
      WHEN cp.has_sync THEN "Sync"
      ELSE "Unknown"
    END AS product_mix,

    -- Penetration metrics
    COALESCE(pm.total_facilities, 0) AS total_facilities,
    COALESCE(pm.facilities_in_dh, 0) AS facilities_in_dh,
    COALESCE(pm.penetration_rate, 0) AS penetration_rate,

    -- Walletshare metrics (facility-level)
    COALESCE(pm.active_facilities, 0) AS active_facilities,
    COALESCE(pm.walletshare_pct, 0) AS walletshare_pct,
    COALESCE(pm.active_flow_only, 0) AS active_flow_only_facilities,
    COALESCE(pm.active_view_only, 0) AS active_view_only_facilities,
    COALESCE(pm.active_flow_and_view, 0) AS active_flow_and_view_facilities,
    COALESCE(pm.active_sync, 0) AS active_sync_facilities,

    -- Opportunity metrics
    COALESCE(pm.win_back_facilities, 0) AS win_back_facilities,
    COALESCE(pm.no_start_facilities, 0) AS no_start_facilities,
    COALESCE(pm.stalled_facilities, 0) AS stalled_facilities,
    COALESCE(pm.untapped_dh_only, 0) AS untapped_dh_only_facilities,
    COALESCE(pm.total_opportunity_facilities, 0) AS total_opportunity_facilities,

    -- Dates
    cp.billing_stop_date,
    cp.go_live_date,
    cp.onboarding_start_date,
    cp.task_created_timestamp,
    cp.task_updated_timestamp,

    -- Metadata
    CURRENT_TIMESTAMP() AS _loaded_at

  FROM corporations_with_products cp
  LEFT JOIN corporation_names cn ON cp.clickup_task_id = cn.clickup_task_id
  LEFT JOIN penetration_metrics pm ON cp.clickup_task_id = pm.clickup_task_id
)

SELECT * FROM final_output
ORDER BY walletshare_pct DESC, corporation_name