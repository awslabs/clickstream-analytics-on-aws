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
import software.aws.solution.clickstream.common.Constant;

import java.util.*;

public final class ModelV2 {
    public static final String VALUE = "value";
    public static final String TYPE = "type";
    public static final MapType USER_PROP_MAP_TYPE = DataTypes.createMapType(DataTypes.StringType, DataTypes.createStructType(new StructField[]{
            DataTypes.createStructField(VALUE, DataTypes.StringType, true),
            DataTypes.createStructField(TYPE, DataTypes.StringType, true),
            DataTypes.createStructField(Constant.SET_TIME_MSEC, DataTypes.LongType, true)
    }), true);

    public static final MapType EVENT_PROP_MAP_TYPE = DataTypes.createMapType(DataTypes.StringType, DataTypes.createStructType(new StructField[]{
            DataTypes.createStructField(VALUE, DataTypes.StringType, true),
            DataTypes.createStructField(TYPE, DataTypes.StringType, true),

    }), true);

    public static final MapType STR_TO_STR_MAP_TYPE = DataTypes.createMapType(DataTypes.StringType, DataTypes.StringType, true);

    public static final StructType ITEM_TYPE = DataTypes.createStructType(new StructField[]{
            DataTypes.createStructField(Constant.EVENT_TIMESTAMP, DataTypes.TimestampType, true),
            DataTypes.createStructField(Constant.EVENT_ID, DataTypes.StringType, true),
            DataTypes.createStructField(Constant.EVENT_NAME, DataTypes.StringType, true),
            DataTypes.createStructField(Constant.PLATFORM, DataTypes.StringType, true),
            DataTypes.createStructField(Constant.USER_PSEUDO_ID, DataTypes.StringType, true),
            DataTypes.createStructField(Constant.USER_ID, DataTypes.StringType, true),
            DataTypes.createStructField(Constant.ITEM_ID, DataTypes.StringType, true),
            DataTypes.createStructField(Constant.NAME, DataTypes.StringType, true),
            DataTypes.createStructField(Constant.BRAND, DataTypes.StringType, true),
            DataTypes.createStructField(Constant.CURRENCY, DataTypes.StringType, true),
            DataTypes.createStructField(Constant.PRICE, DataTypes.DoubleType, true),
            DataTypes.createStructField(Constant.QUANTITY, DataTypes.DoubleType, true),
            DataTypes.createStructField(Constant.CREATIVE_NAME, DataTypes.StringType, true),
            DataTypes.createStructField(Constant.CREATIVE_SLOT, DataTypes.StringType, true),
            DataTypes.createStructField(Constant.LOCATION_ID, DataTypes.StringType, true),
            DataTypes.createStructField(Constant.CATEGORY, DataTypes.StringType, true),
            DataTypes.createStructField(Constant.CATEGORY2, DataTypes.StringType, true),
            DataTypes.createStructField(Constant.CATEGORY3, DataTypes.StringType, true),
            DataTypes.createStructField(Constant.CATEGORY4, DataTypes.StringType, true),
            DataTypes.createStructField(Constant.CATEGORY5, DataTypes.StringType, true),
            DataTypes.createStructField(Constant.CUSTOM_PARAMETERS_JSON_STR, DataTypes.StringType, true),
            DataTypes.createStructField(Constant.CUSTOM_PARAMETERS, EVENT_PROP_MAP_TYPE, true),
            DataTypes.createStructField(Constant.PROCESS_INFO, STR_TO_STR_MAP_TYPE, true),

            DataTypes.createStructField(Constant.APP_ID, DataTypes.StringType, true),
    });

    public static final StructType EVENT_TYPE = DataTypes.createStructType(new StructField[]{
            DataTypes.createStructField(Constant.EVENT_TIMESTAMP, DataTypes.TimestampType, true),
            DataTypes.createStructField(Constant.EVENT_ID, DataTypes.StringType, true),
            DataTypes.createStructField(Constant.EVENT_TIME_MSEC, DataTypes.LongType, true),
            DataTypes.createStructField(Constant.EVENT_NAME, DataTypes.StringType, true),
            DataTypes.createStructField(Constant.EVENT_VALUE, DataTypes.DoubleType, true),
            DataTypes.createStructField(Constant.EVENT_VALUE_CURRENCY, DataTypes.StringType, true),
            DataTypes.createStructField(Constant.EVENT_BUNDLE_SEQUENCE_ID, DataTypes.LongType, true),
            DataTypes.createStructField(Constant.INGEST_TIME_MSEC, DataTypes.LongType, true),
            DataTypes.createStructField(Constant.DEVICE_MOBILE_BRAND_NAME, DataTypes.StringType, true),
            DataTypes.createStructField(Constant.DEVICE_MOBILE_MODEL_NAME, DataTypes.StringType, true),
            DataTypes.createStructField(Constant.DEVICE_MANUFACTURER, DataTypes.StringType, true),
            DataTypes.createStructField(Constant.DEVICE_CARRIER, DataTypes.StringType, true),
            DataTypes.createStructField(Constant.DEVICE_NETWORK_TYPE, DataTypes.StringType, true),
            DataTypes.createStructField(Constant.DEVICE_OPERATING_SYSTEM, DataTypes.StringType, true),
            DataTypes.createStructField(Constant.DEVICE_OPERATING_SYSTEM_VERSION, DataTypes.StringType, true),
            DataTypes.createStructField(Constant.DEVICE_VENDOR_ID, DataTypes.StringType, true),
            DataTypes.createStructField(Constant.DEVICE_ADVERTISING_ID, DataTypes.StringType, true),
            DataTypes.createStructField(Constant.DEVICE_SYSTEM_LANGUAGE, DataTypes.StringType, true),
            DataTypes.createStructField(Constant.DEVICE_TIME_ZONE_OFFSET_SECONDS, DataTypes.IntegerType, true),
            DataTypes.createStructField(Constant.DEVICE_UA_BROWSER, DataTypes.StringType, true),
            DataTypes.createStructField(Constant.DEVICE_UA_BROWSER_VERSION, DataTypes.StringType, true),
            DataTypes.createStructField(Constant.DEVICE_UA_OS, DataTypes.StringType, true),
            DataTypes.createStructField(Constant.DEVICE_UA_OS_VERSION, DataTypes.StringType, true),
            DataTypes.createStructField(Constant.DEVICE_UA_DEVICE, DataTypes.StringType, true),
            DataTypes.createStructField(Constant.DEVICE_UA_DEVICE_CATEGORY, DataTypes.StringType, true),
            DataTypes.createStructField(Constant.DEVICE_UA, STR_TO_STR_MAP_TYPE, true),
            DataTypes.createStructField(Constant.DEVICE_SCREEN_WIDTH, DataTypes.IntegerType, true),
            DataTypes.createStructField(Constant.DEVICE_SCREEN_HEIGHT, DataTypes.IntegerType, true),
            DataTypes.createStructField(Constant.DEVICE_VIEWPORT_WIDTH, DataTypes.IntegerType, true),
            DataTypes.createStructField(Constant.DEVICE_VIEWPORT_HEIGHT, DataTypes.IntegerType, true),
            DataTypes.createStructField(Constant.GEO_CONTINENT, DataTypes.StringType, true),
            DataTypes.createStructField(Constant.GEO_SUB_CONTINENT, DataTypes.StringType, true),
            DataTypes.createStructField(Constant.GEO_COUNTRY, DataTypes.StringType, true),
            DataTypes.createStructField(Constant.GEO_REGION, DataTypes.StringType, true),
            DataTypes.createStructField(Constant.GEO_METRO, DataTypes.StringType, true),
            DataTypes.createStructField(Constant.GEO_CITY, DataTypes.StringType, true),
            DataTypes.createStructField(Constant.GEO_LOCALE, DataTypes.StringType, true),
            DataTypes.createStructField(Constant.TRAFFIC_SOURCE_SOURCE, DataTypes.StringType, true),
            DataTypes.createStructField(Constant.TRAFFIC_SOURCE_MEDIUM, DataTypes.StringType, true),
            DataTypes.createStructField(Constant.TRAFFIC_SOURCE_CAMPAIGN, DataTypes.StringType, true),
            DataTypes.createStructField(Constant.TRAFFIC_SOURCE_CONTENT, DataTypes.StringType, true),
            DataTypes.createStructField(Constant.TRAFFIC_SOURCE_TERM, DataTypes.StringType, true),
            DataTypes.createStructField(Constant.TRAFFIC_SOURCE_CAMPAIGN_ID, DataTypes.StringType, true),
            DataTypes.createStructField(Constant.TRAFFIC_SOURCE_CLID_PLATFORM, DataTypes.StringType, true),
            DataTypes.createStructField(Constant.TRAFFIC_SOURCE_CLID, DataTypes.StringType, true),
            DataTypes.createStructField(Constant.TRAFFIC_SOURCE_CHANNEL_GROUP, DataTypes.StringType, true),
            DataTypes.createStructField(Constant.TRAFFIC_SOURCE_CATEGORY, DataTypes.StringType, true),
            DataTypes.createStructField(Constant.USER_FIRST_TOUCH_TIME_MSEC, DataTypes.LongType, true),
            DataTypes.createStructField(Constant.APP_PACKAGE_ID, DataTypes.StringType, true),
            DataTypes.createStructField(Constant.APP_VERSION, DataTypes.StringType, true),
            DataTypes.createStructField(Constant.APP_TITLE, DataTypes.StringType, true),
            DataTypes.createStructField(Constant.APP_INSTALL_SOURCE, DataTypes.StringType, true),
            DataTypes.createStructField(Constant.PLATFORM, DataTypes.StringType, true),
            DataTypes.createStructField(Constant.PROJECT_ID, DataTypes.StringType, true),
            DataTypes.createStructField(Constant.APP_ID, DataTypes.StringType, true),
            DataTypes.createStructField(Constant.SCREEN_VIEW_SCREEN_NAME, DataTypes.StringType, true),
            DataTypes.createStructField(Constant.SCREEN_VIEW_SCREEN_ID, DataTypes.StringType, true),
            DataTypes.createStructField(Constant.SCREEN_VIEW_SCREEN_UNIQUE_ID, DataTypes.StringType, true),
            DataTypes.createStructField(Constant.SCREEN_VIEW_PREVIOUS_SCREEN_NAME, DataTypes.StringType, true),
            DataTypes.createStructField(Constant.SCREEN_VIEW_PREVIOUS_SCREEN_ID, DataTypes.StringType, true),
            DataTypes.createStructField(Constant.SCREEN_VIEW_PREVIOUS_SCREEN_UNIQUE_ID, DataTypes.StringType, true),
            DataTypes.createStructField(Constant.SCREEN_VIEW_PREVIOUS_TIME_MSEC, DataTypes.LongType, true),
            DataTypes.createStructField(Constant.SCREEN_VIEW_ENGAGEMENT_TIME_MSEC, DataTypes.LongType, true),
            DataTypes.createStructField(Constant.SCREEN_VIEW_ENTRANCES, DataTypes.BooleanType, true),
            DataTypes.createStructField(Constant.PAGE_VIEW_PAGE_REFERRER, DataTypes.StringType, true),
            DataTypes.createStructField(Constant.PAGE_VIEW_PAGE_REFERRER_TITLE, DataTypes.StringType, true),
            DataTypes.createStructField(Constant.PAGE_VIEW_PREVIOUS_TIME_MSEC, DataTypes.LongType, true),
            DataTypes.createStructField(Constant.PAGE_VIEW_ENGAGEMENT_TIME_MSEC, DataTypes.LongType, true),
            DataTypes.createStructField(Constant.PAGE_VIEW_PAGE_TITLE, DataTypes.StringType, true),
            DataTypes.createStructField(Constant.PAGE_VIEW_PAGE_URL, DataTypes.StringType, true),
            DataTypes.createStructField(Constant.PAGE_VIEW_PAGE_URL_PATH, DataTypes.StringType, true),
            DataTypes.createStructField(Constant.PAGE_VIEW_PAGE_URL_QUERY_PARAMETERS, STR_TO_STR_MAP_TYPE, true),
            DataTypes.createStructField(Constant.PAGE_VIEW_HOSTNAME, DataTypes.StringType, true),
            DataTypes.createStructField(Constant.PAGE_VIEW_LATEST_REFERRER, DataTypes.StringType, true),
            DataTypes.createStructField(Constant.PAGE_VIEW_LATEST_REFERRER_HOST, DataTypes.StringType, true),
            DataTypes.createStructField(Constant.PAGE_VIEW_ENTRANCES, DataTypes.BooleanType, true),
            DataTypes.createStructField(Constant.APP_START_IS_FIRST_TIME, DataTypes.BooleanType, true),
            DataTypes.createStructField(Constant.UPGRADE_PREVIOUS_APP_VERSION, DataTypes.StringType, true),
            DataTypes.createStructField(Constant.UPGRADE_PREVIOUS_OS_VERSION, DataTypes.StringType, true),
            DataTypes.createStructField(Constant.SEARCH_KEY, DataTypes.StringType, true),
            DataTypes.createStructField(Constant.SEARCH_TERM, DataTypes.StringType, true),
            DataTypes.createStructField(Constant.OUTBOUND_LINK_CLASSES, DataTypes.StringType, true),
            DataTypes.createStructField(Constant.OUTBOUND_LINK_DOMAIN, DataTypes.StringType, true),
            DataTypes.createStructField(Constant.OUTBOUND_LINK_ID, DataTypes.StringType, true),
            DataTypes.createStructField(Constant.OUTBOUND_LINK_URL, DataTypes.StringType, true),
            DataTypes.createStructField(Constant.OUTBOUND_LINK, DataTypes.BooleanType, true),
            DataTypes.createStructField(Constant.USER_ENGAGEMENT_TIME_MSEC, DataTypes.LongType, true),
            DataTypes.createStructField(Constant.USER_ID, DataTypes.StringType, true),
            DataTypes.createStructField(Constant.USER_PSEUDO_ID, DataTypes.StringType, true),
            DataTypes.createStructField(Constant.SESSION_ID, DataTypes.StringType, true),
            DataTypes.createStructField(Constant.SESSION_START_TIME_MSEC, DataTypes.LongType, true),
            DataTypes.createStructField(Constant.SESSION_DURATION, DataTypes.LongType, true),
            DataTypes.createStructField(Constant.SESSION_NUMBER, DataTypes.LongType, true),
            DataTypes.createStructField(Constant.SCROLL_ENGAGEMENT_TIME_MSEC, DataTypes.LongType, true),
            DataTypes.createStructField(Constant.SDK_ERROR_CODE, DataTypes.StringType, true),
            DataTypes.createStructField(Constant.SDK_ERROR_MESSAGE, DataTypes.StringType, true),
            DataTypes.createStructField(Constant.SDK_VERSION, DataTypes.StringType, true),
            DataTypes.createStructField(Constant.SDK_NAME, DataTypes.StringType, true),
            DataTypes.createStructField(Constant.APP_EXCEPTION_MESSAGE, DataTypes.StringType, true),
            DataTypes.createStructField(Constant.APP_EXCEPTION_STACK, DataTypes.StringType, true),
            DataTypes.createStructField(Constant.CUSTOM_PARAMETERS_JSON_STR, DataTypes.StringType, true),
            DataTypes.createStructField(Constant.CUSTOM_PARAMETERS, EVENT_PROP_MAP_TYPE, true),
            DataTypes.createStructField(Constant.PROCESS_INFO, STR_TO_STR_MAP_TYPE, true),

            DataTypes.createStructField(Constant.UA, DataTypes.StringType, true),
            DataTypes.createStructField(Constant.IP, DataTypes.StringType, true),
    });
    public static final StructType USER_TYPE = DataTypes.createStructType(new StructField[]{
            DataTypes.createStructField(Constant.EVENT_TIMESTAMP, DataTypes.TimestampType, true),
            DataTypes.createStructField(Constant.USER_PSEUDO_ID, DataTypes.StringType, true),
            DataTypes.createStructField(Constant.USER_ID, DataTypes.StringType, true),
            DataTypes.createStructField(Constant.USER_PROPERTIES, USER_PROP_MAP_TYPE, true),
            DataTypes.createStructField(Constant.USER_PROPERTIES_JSON_STR, DataTypes.StringType, true),
            DataTypes.createStructField(Constant.FIRST_TOUCH_TIME_MSEC, DataTypes.LongType, true),
            DataTypes.createStructField(Constant.FIRST_VISIT_DATE, DataTypes.DateType, true),
            DataTypes.createStructField(Constant.FIRST_REFERRER, DataTypes.StringType, true),
            DataTypes.createStructField(Constant.FIRST_TRAFFIC_SOURCE, DataTypes.StringType, true),
            DataTypes.createStructField(Constant.FIRST_TRAFFIC_MEDIUM, DataTypes.StringType, true),
            DataTypes.createStructField(Constant.FIRST_TRAFFIC_CAMPAIGN, DataTypes.StringType, true),
            DataTypes.createStructField(Constant.FIRST_TRAFFIC_CONTENT, DataTypes.StringType, true),
            DataTypes.createStructField(Constant.FIRST_TRAFFIC_TERM, DataTypes.StringType, true),
            DataTypes.createStructField(Constant.FIRST_TRAFFIC_CAMPAIGN_ID, DataTypes.StringType, true),
            DataTypes.createStructField(Constant.FIRST_TRAFFIC_CLID_PLATFORM, DataTypes.StringType, true),
            DataTypes.createStructField(Constant.FIRST_TRAFFIC_CLID, DataTypes.StringType, true),
            DataTypes.createStructField(Constant.FIRST_TRAFFIC_CHANNEL_GROUP, DataTypes.StringType, true),
            DataTypes.createStructField(Constant.FIRST_TRAFFIC_CATEGORY, DataTypes.StringType, true),
            DataTypes.createStructField(Constant.FIRST_APP_INSTALL_SOURCE, DataTypes.StringType, true),
            DataTypes.createStructField(Constant.PROCESS_INFO, STR_TO_STR_MAP_TYPE, true),

            DataTypes.createStructField(Constant.APP_ID, DataTypes.StringType, true),
            DataTypes.createStructField(Constant.EVENT_NAME, DataTypes.StringType, true),
    });
    public static final StructType SESSION_TYPE = DataTypes.createStructType(new StructField[]{
            DataTypes.createStructField(Constant.EVENT_TIMESTAMP, DataTypes.TimestampType, true),
            DataTypes.createStructField(Constant.USER_PSEUDO_ID, DataTypes.StringType, true),
            DataTypes.createStructField(Constant.SESSION_ID, DataTypes.StringType, true),
            DataTypes.createStructField(Constant.USER_ID, DataTypes.StringType, true),
            DataTypes.createStructField(Constant.SESSION_NUMBER, DataTypes.LongType, true),
            DataTypes.createStructField(Constant.SESSION_START_TIME_MSEC, DataTypes.LongType, true),
            DataTypes.createStructField(Constant.SESSION_SOURCE, DataTypes.StringType, true),
            DataTypes.createStructField(Constant.SESSION_MEDIUM, DataTypes.StringType, true),
            DataTypes.createStructField(Constant.SESSION_CAMPAIGN, DataTypes.StringType, true),
            DataTypes.createStructField(Constant.SESSION_CONTENT, DataTypes.StringType, true),
            DataTypes.createStructField(Constant.SESSION_TERM, DataTypes.StringType, true),
            DataTypes.createStructField(Constant.SESSION_CAMPAIGN_ID, DataTypes.StringType, true),
            DataTypes.createStructField(Constant.SESSION_CLID_PLATFORM, DataTypes.StringType, true),
            DataTypes.createStructField(Constant.SESSION_CLID, DataTypes.StringType, true),
            DataTypes.createStructField(Constant.SESSION_CHANNEL_GROUP, DataTypes.StringType, true),
            DataTypes.createStructField(Constant.SESSION_SOURCE_CATEGORY, DataTypes.StringType, true),
            DataTypes.createStructField(Constant.PROCESS_INFO, STR_TO_STR_MAP_TYPE, true),

            DataTypes.createStructField(Constant.APP_ID, DataTypes.StringType, true),
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
