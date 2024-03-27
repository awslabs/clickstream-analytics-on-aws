/**
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *
 *  Licensed under the Apache License, Version 2.0 (the "License"). You may not use this file except in compliance
 *  with the License. A copy of the License is located at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 *  or in the 'license' file accompanying this file. This file is distributed on an 'AS IS' BASIS, WITHOUT WARRANTIES
 *  OR CONDITIONS OF ANY KIND, express or implied. See the License for the specific language governing permissions
 *  and limitations under the License.
 */


package software.aws.solution.clickstream.model;

import org.apache.spark.sql.*;
import org.apache.spark.sql.types.*;

import java.util.*;

public final class ModelV2 {
    public static final String DEVICE_UA_OS = "device_ua_os";
    public static final String DEVICE_UA_OS_VERSION = "device_ua_os_version";
    public static final String EVENT_TIMESTAMP = "event_timestamp";
    public static final String EVENT_ID = "event_id";
    public static final String EVENT_NAME = "event_name";
    public static final String PLATFORM = "platform";
    public static final String USER_PSEUDO_ID = "user_pseudo_id";
    public static final String USER_ID = "user_id";
    public static final String ITEM_ID = "item_id";
    public static final String EVENT_TIME_MSEC = "event_time_msec";
    public static final String NAME = "name";
    public static final String BRAND = "brand";
    public static final String CURRENCY = "currency";
    public static final String PRICE = "price";
    public static final String QUANTITY = "quantity";
    public static final String CREATIVE_NAME = "creative_name";
    public static final String CREATIVE_SLOT = "creative_slot";
    public static final String LOCATION_ID = "location_id";
    public static final String CATEGORY = "category";
    public static final String CATEGORY2 = "category2";
    public static final String CATEGORY3 = "category3";
    public static final String CATEGORY4 = "category4";
    public static final String CATEGORY5 = "category5";
    public static final String CUSTOM_PARAMETERS_JSON_STR = "custom_parameters_json_str";
    public static final String CUSTOM_PARAMETERS = "custom_parameters";
    public static final String APP_ID = "app_id";
    public static final String EVENT_VALUE = "event_value";
    public static final String EVENT_VALUE_CURRENCY = "event_value_currency";
    public static final String EVENT_BUNDLE_SEQUENCE_ID = "event_bundle_sequence_id";
    public static final String INGEST_TIME_MSEC = "ingest_time_msec";
    public static final String DEVICE_MOBILE_BRAND_NAME = "device_mobile_brand_name";
    public static final String DEVICE_MOBILE_MODEL_NAME = "device_mobile_model_name";
    public static final String DEVICE_MANUFACTURER = "device_manufacturer";
    public static final String DEVICE_CARRIER = "device_carrier";
    public static final String DEVICE_NETWORK_TYPE = "device_network_type";
    public static final String DEVICE_OPERATING_SYSTEM = "device_operating_system";
    public static final String DEVICE_OPERATING_SYSTEM_VERSION = "device_operating_system_version";
    public static final String DEVICE_VENDOR_ID = "device_vendor_id";
    public static final String DEVICE_ADVERTISING_ID = "device_advertising_id";
    public static final String DEVICE_SYSTEM_LANGUAGE = "device_system_language";
    public static final String DEVICE_TIME_ZONE_OFFSET_SECONDS = "device_time_zone_offset_seconds";
    public static final String DEVICE_UA_BROWSER = "device_ua_browser";
    public static final String DEVICE_UA_BROWSER_VERSION = "device_ua_browser_version";
    public static final String DEVICE_UA_DEVICE = "device_ua_device";
    public static final String DEVICE_UA_DEVICE_CATEGORY = "device_ua_device_category";
    public static final String DEVICE_UA = "device_ua";
    public static final String DEVICE_SCREEN_WIDTH = "device_screen_width";
    public static final String DEVICE_SCREEN_HEIGHT = "device_screen_height";
    public static final String DEVICE_VIEWPORT_WIDTH = "device_viewport_width";
    public static final String DEVICE_VIEWPORT_HEIGHT = "device_viewport_height";
    public static final String GEO_CONTINENT = "geo_continent";
    public static final String GEO_SUB_CONTINENT = "geo_sub_continent";
    public static final String GEO_COUNTRY = "geo_country";
    public static final String GEO_REGION = "geo_region";
    public static final String GEO_METRO = "geo_metro";
    public static final String GEO_CITY = "geo_city";
    public static final String GEO_LOCALE = "geo_locale";
    public static final String TRAFFIC_SOURCE_SOURCE = "traffic_source_source";
    public static final String TRAFFIC_SOURCE_MEDIUM = "traffic_source_medium";
    public static final String TRAFFIC_SOURCE_CAMPAIGN = "traffic_source_campaign";
    public static final String TRAFFIC_SOURCE_CONTENT = "traffic_source_content";
    public static final String TRAFFIC_SOURCE_TERM = "traffic_source_term";
    public static final String TRAFFIC_SOURCE_CAMPAIGN_ID = "traffic_source_campaign_id";
    public static final String TRAFFIC_SOURCE_CLID_PLATFORM = "traffic_source_clid_platform";
    public static final String TRAFFIC_SOURCE_CLID = "traffic_source_clid";
    public static final String TRAFFIC_SOURCE_CHANNEL_GROUP = "traffic_source_channel_group";
    public static final String TRAFFIC_SOURCE_CATEGORY = "traffic_source_category";
    public static final String USER_FIRST_TOUCH_TIME_MSEC = "user_first_touch_time_msec";
    public static final String APP_PACKAGE_ID = "app_package_id";
    public static final String APP_VERSION = "app_version";
    public static final String APP_TITLE = "app_title";
    public static final String APP_INSTALL_SOURCE = "app_install_source";
    public static final String PROJECT_ID = "project_id";
    public static final String APP_START_IS_FIRST_TIME = "app_start_is_first_time";
    public static final String SEARCH_KEY = "search_key";
    public static final String SEARCH_TERM = "search_term";
    public static final String OUTBOUND_LINK_CLASSES = "outbound_link_classes";
    public static final String OUTBOUND_LINK_DOMAIN = "outbound_link_domain";
    public static final String OUTBOUND_LINK_ID = "outbound_link_id";
    public static final String OUTBOUND_LINK_URL = "outbound_link_url";
    public static final String OUTBOUND_LINK = "outbound_link";
    public static final String USER_ENGAGEMENT_TIME_MSEC = "user_engagement_time_msec";
    public static final String SESSION_ID = "session_id";
    public static final String SESSION_START_TIME_MSEC = "session_start_time_msec";
    public static final String SESSION_DURATION = "session_duration";
    public static final String SESSION_NUMBER = "session_number";
    public static final String SCROLL_ENGAGEMENT_TIME_MSEC = "scroll_engagement_time_msec";
    public static final String SDK_ERROR_CODE = "sdk_error_code";
    public static final String SDK_ERROR_MESSAGE = "sdk_error_message";
    public static final String SDK_VERSION = "sdk_version";
    public static final String SDK_NAME = "sdk_name";
    public static final String UA = "ua";
    public static final String IP = "ip";
    public static final String USER_PROPERTIES = "user_properties";
    public static final String USER_PROPERTIES_JSON_STR = "user_properties_json_str";
    public static final String FIRST_TOUCH_TIME_MSEC = "first_touch_time_msec";
    public static final String FIRST_VISIT_DATE = "first_visit_date";
    public static final String FIRST_REFERRER = "first_referrer";
    public static final String FIRST_TRAFFIC_SOURCE = "first_traffic_source";
    public static final String FIRST_TRAFFIC_MEDIUM = "first_traffic_medium";
    public static final String FIRST_TRAFFIC_CAMPAIGN = "first_traffic_campaign";
    public static final String FIRST_TRAFFIC_CONTENT = "first_traffic_content";
    public static final String FIRST_TRAFFIC_TERM = "first_traffic_term";
    public static final String FIRST_TRAFFIC_CAMPAIGN_ID = "first_traffic_campaign_id";
    public static final String FIRST_TRAFFIC_CLID_PLATFORM = "first_traffic_clid_platform";
    public static final String FIRST_TRAFFIC_CLID = "first_traffic_clid";
    public static final String FIRST_TRAFFIC_CHANNEL_GROUP = "first_traffic_channel_group";
    public static final String FIRST_TRAFFIC_CATEGORY = "first_traffic_category";
    public static final String FIRST_APP_INSTALL_SOURCE = "first_app_install_source";
    public static final String SESSION_SOURCE = "session_source";
    public static final String SESSION_MEDIUM = "session_medium";
    public static final String SESSION_CAMPAIGN = "session_campaign";
    public static final String SESSION_CONTENT = "session_content";
    public static final String SESSION_TERM = "session_term";
    public static final String SESSION_CAMPAIGN_ID = "session_campaign_id";
    public static final String SESSION_CLID_PLATFORM = "session_clid_platform";
    public static final String SESSION_CLID = "session_clid";
    public static final String SESSION_CHANNEL_GROUP = "session_channel_group";
    public static final String SESSION_SOURCE_CATEGORY = "session_source_category";
    public static final String PROCESS_INFO = "process_info";
    public static final String CREATED_TIME = "created_time";
    public static final String SCREEN_VIEW_SCREEN_NAME = "screen_view_screen_name";
    public static final String SCREEN_VIEW_SCREEN_ID = "screen_view_screen_id";
    public static final String UPGRADE_PREVIOUS_APP_VERSION = "upgrade_previous_app_version";
    public static final String UPGRADE_PREVIOUS_OS_VERSION = "upgrade_previous_os_version";
    public static final String SCREEN_VIEW_SCREEN_UNIQUE_ID = "screen_view_screen_unique_id";
    public static final String SCREEN_VIEW_PREVIOUS_SCREEN_NAME = "screen_view_previous_screen_name";
    public static final String SCREEN_VIEW_PREVIOUS_SCREEN_ID = "screen_view_previous_screen_id";
    public static final String SCREEN_VIEW_PREVIOUS_SCREEN_UNIQUE_ID = "screen_view_previous_screen_unique_id";
    public static final String SCREEN_VIEW_PREVIOUS_TIME_MSEC = "screen_view_previous_time_msec";
    public static final String SCREEN_VIEW_ENGAGEMENT_TIME_MSEC = "screen_view_engagement_time_msec";
    public static final String SCREEN_VIEW_ENTRANCES = "screen_view_entrances";
    public static final String PAGE_VIEW_PAGE_REFERRER = "page_view_page_referrer";
    public static final String PAGE_VIEW_PAGE_REFERRER_TITLE = "page_view_page_referrer_title";
    public static final String PAGE_VIEW_PREVIOUS_TIME_MSEC = "page_view_previous_time_msec";
    public static final String PAGE_VIEW_ENGAGEMENT_TIME_MSEC = "page_view_engagement_time_msec";
    public static final String PAGE_VIEW_PAGE_TITLE = "page_view_page_title";
    public static final String PAGE_VIEW_PAGE_URL = "page_view_page_url";
    public static final String PAGE_VIEW_PAGE_URL_PATH = "page_view_page_url_path";
    public static final String PAGE_VIEW_PAGE_URL_QUERY_PARAMETERS = "page_view_page_url_query_parameters";
    public static final String PAGE_VIEW_HOSTNAME = "page_view_hostname";
    public static final String PAGE_VIEW_LATEST_REFERRER = "page_view_latest_referrer";
    public static final String PAGE_VIEW_LATEST_REFERRER_HOST = "page_view_latest_referrer_host";
    public static final String PAGE_VIEW_ENTRANCES = "page_view_entrances";
    public static final String APP_EXCEPTION_MESSAGE = "app_exception_message";
    public static final String APP_EXCEPTION_STACK = "app_exception_stack";
    public static final String SET_TIME_MSEC = "set_time_msec";
    public static final String VALUE = "value";
    public static final String TYPE = "type";
    public static final MapType USER_PROP_MAP_TYPE = DataTypes.createMapType(DataTypes.StringType, DataTypes.createStructType(new StructField[]{
            DataTypes.createStructField(VALUE, DataTypes.StringType, true),
            DataTypes.createStructField(TYPE, DataTypes.StringType, true),
            DataTypes.createStructField(SET_TIME_MSEC, DataTypes.LongType, true)
    }), true);

    public static final MapType EVENT_PROP_MAP_TYPE = DataTypes.createMapType(DataTypes.StringType, DataTypes.createStructType(new StructField[]{
            DataTypes.createStructField(VALUE, DataTypes.StringType, true),
            DataTypes.createStructField(TYPE, DataTypes.StringType, true),

    }), true);

    public static final MapType STR_TO_STR_MAP_TYPE = DataTypes.createMapType(DataTypes.StringType, DataTypes.StringType, true);

    public static final StructType ITEM_TYPE = DataTypes.createStructType(new StructField[]{
            DataTypes.createStructField(EVENT_TIMESTAMP, DataTypes.TimestampType, true),
            DataTypes.createStructField(EVENT_ID, DataTypes.StringType, true),
            DataTypes.createStructField(EVENT_NAME, DataTypes.StringType, true),
            DataTypes.createStructField(PLATFORM, DataTypes.StringType, true),
            DataTypes.createStructField(USER_PSEUDO_ID, DataTypes.StringType, true),
            DataTypes.createStructField(USER_ID, DataTypes.StringType, true),
            DataTypes.createStructField(ITEM_ID, DataTypes.StringType, true),
            DataTypes.createStructField(NAME, DataTypes.StringType, true),
            DataTypes.createStructField(BRAND, DataTypes.StringType, true),
            DataTypes.createStructField(CURRENCY, DataTypes.StringType, true),
            DataTypes.createStructField(PRICE, DataTypes.DoubleType, true),
            DataTypes.createStructField(QUANTITY, DataTypes.DoubleType, true),
            DataTypes.createStructField(CREATIVE_NAME, DataTypes.StringType, true),
            DataTypes.createStructField(CREATIVE_SLOT, DataTypes.StringType, true),
            DataTypes.createStructField(LOCATION_ID, DataTypes.StringType, true),
            DataTypes.createStructField(CATEGORY, DataTypes.StringType, true),
            DataTypes.createStructField(CATEGORY2, DataTypes.StringType, true),
            DataTypes.createStructField(CATEGORY3, DataTypes.StringType, true),
            DataTypes.createStructField(CATEGORY4, DataTypes.StringType, true),
            DataTypes.createStructField(CATEGORY5, DataTypes.StringType, true),
            DataTypes.createStructField(CUSTOM_PARAMETERS_JSON_STR, DataTypes.StringType, true),
            DataTypes.createStructField(CUSTOM_PARAMETERS, EVENT_PROP_MAP_TYPE, true),
            DataTypes.createStructField(PROCESS_INFO, STR_TO_STR_MAP_TYPE, true),

            DataTypes.createStructField(APP_ID, DataTypes.StringType, true),
    });

    public static final StructType EVENT_TYPE = DataTypes.createStructType(new StructField[]{
            DataTypes.createStructField(EVENT_TIMESTAMP, DataTypes.TimestampType, true),
            DataTypes.createStructField(EVENT_ID, DataTypes.StringType, true),
            DataTypes.createStructField(EVENT_TIME_MSEC, DataTypes.LongType, true),
            DataTypes.createStructField(EVENT_NAME, DataTypes.StringType, true),
            DataTypes.createStructField(EVENT_VALUE, DataTypes.DoubleType, true),
            DataTypes.createStructField(EVENT_VALUE_CURRENCY, DataTypes.StringType, true),
            DataTypes.createStructField(EVENT_BUNDLE_SEQUENCE_ID, DataTypes.LongType, true),
            DataTypes.createStructField(INGEST_TIME_MSEC, DataTypes.LongType, true),
            DataTypes.createStructField(DEVICE_MOBILE_BRAND_NAME, DataTypes.StringType, true),
            DataTypes.createStructField(DEVICE_MOBILE_MODEL_NAME, DataTypes.StringType, true),
            DataTypes.createStructField(DEVICE_MANUFACTURER, DataTypes.StringType, true),
            DataTypes.createStructField(DEVICE_CARRIER, DataTypes.StringType, true),
            DataTypes.createStructField(DEVICE_NETWORK_TYPE, DataTypes.StringType, true),
            DataTypes.createStructField(DEVICE_OPERATING_SYSTEM, DataTypes.StringType, true),
            DataTypes.createStructField(DEVICE_OPERATING_SYSTEM_VERSION, DataTypes.StringType, true),
            DataTypes.createStructField(DEVICE_VENDOR_ID, DataTypes.StringType, true),
            DataTypes.createStructField(DEVICE_ADVERTISING_ID, DataTypes.StringType, true),
            DataTypes.createStructField(DEVICE_SYSTEM_LANGUAGE, DataTypes.StringType, true),
            DataTypes.createStructField(DEVICE_TIME_ZONE_OFFSET_SECONDS, DataTypes.IntegerType, true),
            DataTypes.createStructField(DEVICE_UA_BROWSER, DataTypes.StringType, true),
            DataTypes.createStructField(DEVICE_UA_BROWSER_VERSION, DataTypes.StringType, true),
            DataTypes.createStructField(DEVICE_UA_OS, DataTypes.StringType, true),
            DataTypes.createStructField(DEVICE_UA_OS_VERSION, DataTypes.StringType, true),
            DataTypes.createStructField(DEVICE_UA_DEVICE, DataTypes.StringType, true),
            DataTypes.createStructField(DEVICE_UA_DEVICE_CATEGORY, DataTypes.StringType, true),
            DataTypes.createStructField(DEVICE_UA, STR_TO_STR_MAP_TYPE, true),
            DataTypes.createStructField(DEVICE_SCREEN_WIDTH, DataTypes.IntegerType, true),
            DataTypes.createStructField(DEVICE_SCREEN_HEIGHT, DataTypes.IntegerType, true),
            DataTypes.createStructField(DEVICE_VIEWPORT_WIDTH, DataTypes.IntegerType, true),
            DataTypes.createStructField(DEVICE_VIEWPORT_HEIGHT, DataTypes.IntegerType, true),
            DataTypes.createStructField(GEO_CONTINENT, DataTypes.StringType, true),
            DataTypes.createStructField(GEO_SUB_CONTINENT, DataTypes.StringType, true),
            DataTypes.createStructField(GEO_COUNTRY, DataTypes.StringType, true),
            DataTypes.createStructField(GEO_REGION, DataTypes.StringType, true),
            DataTypes.createStructField(GEO_METRO, DataTypes.StringType, true),
            DataTypes.createStructField(GEO_CITY, DataTypes.StringType, true),
            DataTypes.createStructField(GEO_LOCALE, DataTypes.StringType, true),
            DataTypes.createStructField(TRAFFIC_SOURCE_SOURCE, DataTypes.StringType, true),
            DataTypes.createStructField(TRAFFIC_SOURCE_MEDIUM, DataTypes.StringType, true),
            DataTypes.createStructField(TRAFFIC_SOURCE_CAMPAIGN, DataTypes.StringType, true),
            DataTypes.createStructField(TRAFFIC_SOURCE_CONTENT, DataTypes.StringType, true),
            DataTypes.createStructField(TRAFFIC_SOURCE_TERM, DataTypes.StringType, true),
            DataTypes.createStructField(TRAFFIC_SOURCE_CAMPAIGN_ID, DataTypes.StringType, true),
            DataTypes.createStructField(TRAFFIC_SOURCE_CLID_PLATFORM, DataTypes.StringType, true),
            DataTypes.createStructField(TRAFFIC_SOURCE_CLID, DataTypes.StringType, true),
            DataTypes.createStructField(TRAFFIC_SOURCE_CHANNEL_GROUP, DataTypes.StringType, true),
            DataTypes.createStructField(TRAFFIC_SOURCE_CATEGORY, DataTypes.StringType, true),
            DataTypes.createStructField(USER_FIRST_TOUCH_TIME_MSEC, DataTypes.LongType, true),
            DataTypes.createStructField(APP_PACKAGE_ID, DataTypes.StringType, true),
            DataTypes.createStructField(APP_VERSION, DataTypes.StringType, true),
            DataTypes.createStructField(APP_TITLE, DataTypes.StringType, true),
            DataTypes.createStructField(APP_INSTALL_SOURCE, DataTypes.StringType, true),
            DataTypes.createStructField(PLATFORM, DataTypes.StringType, true),
            DataTypes.createStructField(PROJECT_ID, DataTypes.StringType, true),
            DataTypes.createStructField(APP_ID, DataTypes.StringType, true),
            DataTypes.createStructField(SCREEN_VIEW_SCREEN_NAME, DataTypes.StringType, true),
            DataTypes.createStructField(SCREEN_VIEW_SCREEN_ID, DataTypes.StringType, true),
            DataTypes.createStructField(SCREEN_VIEW_SCREEN_UNIQUE_ID, DataTypes.StringType, true),
            DataTypes.createStructField(SCREEN_VIEW_PREVIOUS_SCREEN_NAME, DataTypes.StringType, true),
            DataTypes.createStructField(SCREEN_VIEW_PREVIOUS_SCREEN_ID, DataTypes.StringType, true),
            DataTypes.createStructField(SCREEN_VIEW_PREVIOUS_SCREEN_UNIQUE_ID, DataTypes.StringType, true),
            DataTypes.createStructField(SCREEN_VIEW_PREVIOUS_TIME_MSEC, DataTypes.LongType, true),
            DataTypes.createStructField(SCREEN_VIEW_ENGAGEMENT_TIME_MSEC, DataTypes.LongType, true),
            DataTypes.createStructField(SCREEN_VIEW_ENTRANCES, DataTypes.BooleanType, true),
            DataTypes.createStructField(PAGE_VIEW_PAGE_REFERRER, DataTypes.StringType, true),
            DataTypes.createStructField(PAGE_VIEW_PAGE_REFERRER_TITLE, DataTypes.StringType, true),
            DataTypes.createStructField(PAGE_VIEW_PREVIOUS_TIME_MSEC, DataTypes.LongType, true),
            DataTypes.createStructField(PAGE_VIEW_ENGAGEMENT_TIME_MSEC, DataTypes.LongType, true),
            DataTypes.createStructField(PAGE_VIEW_PAGE_TITLE, DataTypes.StringType, true),
            DataTypes.createStructField(PAGE_VIEW_PAGE_URL, DataTypes.StringType, true),
            DataTypes.createStructField(PAGE_VIEW_PAGE_URL_PATH, DataTypes.StringType, true),
            DataTypes.createStructField(PAGE_VIEW_PAGE_URL_QUERY_PARAMETERS, STR_TO_STR_MAP_TYPE, true),
            DataTypes.createStructField(PAGE_VIEW_HOSTNAME, DataTypes.StringType, true),
            DataTypes.createStructField(PAGE_VIEW_LATEST_REFERRER, DataTypes.StringType, true),
            DataTypes.createStructField(PAGE_VIEW_LATEST_REFERRER_HOST, DataTypes.StringType, true),
            DataTypes.createStructField(PAGE_VIEW_ENTRANCES, DataTypes.BooleanType, true),
            DataTypes.createStructField(APP_START_IS_FIRST_TIME, DataTypes.BooleanType, true),
            DataTypes.createStructField(UPGRADE_PREVIOUS_APP_VERSION, DataTypes.StringType, true),
            DataTypes.createStructField(UPGRADE_PREVIOUS_OS_VERSION, DataTypes.StringType, true),
            DataTypes.createStructField(SEARCH_KEY, DataTypes.StringType, true),
            DataTypes.createStructField(SEARCH_TERM, DataTypes.StringType, true),
            DataTypes.createStructField(OUTBOUND_LINK_CLASSES, DataTypes.StringType, true),
            DataTypes.createStructField(OUTBOUND_LINK_DOMAIN, DataTypes.StringType, true),
            DataTypes.createStructField(OUTBOUND_LINK_ID, DataTypes.StringType, true),
            DataTypes.createStructField(OUTBOUND_LINK_URL, DataTypes.StringType, true),
            DataTypes.createStructField(OUTBOUND_LINK, DataTypes.BooleanType, true),
            DataTypes.createStructField(USER_ENGAGEMENT_TIME_MSEC, DataTypes.LongType, true),
            DataTypes.createStructField(USER_ID, DataTypes.StringType, true),
            DataTypes.createStructField(USER_PSEUDO_ID, DataTypes.StringType, true),
            DataTypes.createStructField(SESSION_ID, DataTypes.StringType, true),
            DataTypes.createStructField(SESSION_START_TIME_MSEC, DataTypes.LongType, true),
            DataTypes.createStructField(SESSION_DURATION, DataTypes.LongType, true),
            DataTypes.createStructField(SESSION_NUMBER, DataTypes.LongType, true),
            DataTypes.createStructField(SCROLL_ENGAGEMENT_TIME_MSEC, DataTypes.LongType, true),
            DataTypes.createStructField(SDK_ERROR_CODE, DataTypes.StringType, true),
            DataTypes.createStructField(SDK_ERROR_MESSAGE, DataTypes.StringType, true),
            DataTypes.createStructField(SDK_VERSION, DataTypes.StringType, true),
            DataTypes.createStructField(SDK_NAME, DataTypes.StringType, true),
            DataTypes.createStructField(APP_EXCEPTION_MESSAGE, DataTypes.StringType, true),
            DataTypes.createStructField(APP_EXCEPTION_STACK, DataTypes.StringType, true),
            DataTypes.createStructField(CUSTOM_PARAMETERS_JSON_STR, DataTypes.StringType, true),
            DataTypes.createStructField(CUSTOM_PARAMETERS, EVENT_PROP_MAP_TYPE, true),
            DataTypes.createStructField(PROCESS_INFO, STR_TO_STR_MAP_TYPE, true),

            DataTypes.createStructField(UA, DataTypes.StringType, true),
            DataTypes.createStructField(IP, DataTypes.StringType, true),
    });
    public static final StructType USER_TYPE = DataTypes.createStructType(new StructField[]{
            DataTypes.createStructField(EVENT_TIMESTAMP, DataTypes.TimestampType, true),
            DataTypes.createStructField(USER_PSEUDO_ID, DataTypes.StringType, true),
            DataTypes.createStructField(USER_ID, DataTypes.StringType, true),
            DataTypes.createStructField(USER_PROPERTIES, USER_PROP_MAP_TYPE, true),
            DataTypes.createStructField(USER_PROPERTIES_JSON_STR, DataTypes.StringType, true),
            DataTypes.createStructField(FIRST_TOUCH_TIME_MSEC, DataTypes.LongType, true),
            DataTypes.createStructField(FIRST_VISIT_DATE, DataTypes.DateType, true),
            DataTypes.createStructField(FIRST_REFERRER, DataTypes.StringType, true),
            DataTypes.createStructField(FIRST_TRAFFIC_SOURCE, DataTypes.StringType, true),
            DataTypes.createStructField(FIRST_TRAFFIC_MEDIUM, DataTypes.StringType, true),
            DataTypes.createStructField(FIRST_TRAFFIC_CAMPAIGN, DataTypes.StringType, true),
            DataTypes.createStructField(FIRST_TRAFFIC_CONTENT, DataTypes.StringType, true),
            DataTypes.createStructField(FIRST_TRAFFIC_TERM, DataTypes.StringType, true),
            DataTypes.createStructField(FIRST_TRAFFIC_CAMPAIGN_ID, DataTypes.StringType, true),
            DataTypes.createStructField(FIRST_TRAFFIC_CLID_PLATFORM, DataTypes.StringType, true),
            DataTypes.createStructField(FIRST_TRAFFIC_CLID, DataTypes.StringType, true),
            DataTypes.createStructField(FIRST_TRAFFIC_CHANNEL_GROUP, DataTypes.StringType, true),
            DataTypes.createStructField(FIRST_TRAFFIC_CATEGORY, DataTypes.StringType, true),
            DataTypes.createStructField(FIRST_APP_INSTALL_SOURCE, DataTypes.StringType, true),
            DataTypes.createStructField(PROCESS_INFO, STR_TO_STR_MAP_TYPE, true),

            DataTypes.createStructField(APP_ID, DataTypes.StringType, true),
            DataTypes.createStructField(EVENT_NAME, DataTypes.StringType, true),
    });
    public static final StructType SESSION_TYPE = DataTypes.createStructType(new StructField[]{
            DataTypes.createStructField(USER_PSEUDO_ID, DataTypes.StringType, true),
            DataTypes.createStructField(SESSION_ID, DataTypes.StringType, true),
            DataTypes.createStructField(USER_ID, DataTypes.StringType, true),
            DataTypes.createStructField(SESSION_NUMBER, DataTypes.LongType, true),
            DataTypes.createStructField(SESSION_START_TIME_MSEC, DataTypes.LongType, true),
            DataTypes.createStructField(SESSION_SOURCE, DataTypes.StringType, true),
            DataTypes.createStructField(SESSION_MEDIUM, DataTypes.StringType, true),
            DataTypes.createStructField(SESSION_CAMPAIGN, DataTypes.StringType, true),
            DataTypes.createStructField(SESSION_CONTENT, DataTypes.StringType, true),
            DataTypes.createStructField(SESSION_TERM, DataTypes.StringType, true),
            DataTypes.createStructField(SESSION_CAMPAIGN_ID, DataTypes.StringType, true),
            DataTypes.createStructField(SESSION_CLID_PLATFORM, DataTypes.StringType, true),
            DataTypes.createStructField(SESSION_CLID, DataTypes.StringType, true),
            DataTypes.createStructField(SESSION_CHANNEL_GROUP, DataTypes.StringType, true),
            DataTypes.createStructField(SESSION_SOURCE_CATEGORY, DataTypes.StringType, true),
            DataTypes.createStructField(PROCESS_INFO, STR_TO_STR_MAP_TYPE, true),

            DataTypes.createStructField(APP_ID, DataTypes.StringType, true),
            DataTypes.createStructField(EVENT_TIMESTAMP, DataTypes.TimestampType, true),
    });

    private ModelV2() {
    }

    public static List<String> getUserFields() {
        List<String> fields = new ArrayList<>();
        for (StructField f : USER_TYPE.fields()) {
            fields.add(f.name());
        }
        return fields;
    }

    public static List<String> getEventFields() {
        List<String> fields = new ArrayList<>();
        for (StructField f : EVENT_TYPE.fields()) {
            fields.add(f.name());
        }
        return fields;
    }

    public static List<String> getSessionFields() {
        List<String> fields = new ArrayList<>();
        for (StructField f : SESSION_TYPE.fields()) {
            fields.add(f.name());
        }
        return fields;
    }

    public static List<String> getItemFields() {
        List<String> fields = new ArrayList<>();
        for (StructField f : ITEM_TYPE.fields()) {
            fields.add(f.name());
        }
        return fields;
    }

    public static Column[] toColumnArray(final List<String> fields) {
        List<Column> columns = new ArrayList<>();
        for (String f : fields) {
            columns.add(new Column(f));
        }
        return columns.toArray(new Column[0]);
    }
}
