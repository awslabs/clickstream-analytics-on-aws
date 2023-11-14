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

package com.example.clickstream.transformer.v2;

import org.apache.spark.sql.types.ArrayType;
import org.apache.spark.sql.types.DataTypes;
import org.apache.spark.sql.types.StructField;
import org.apache.spark.sql.types.StructType;

public final class ClickStreamDataTypes {
    public static final String DOUBLE_VALUE = "double_value";
    public static final String FLOAT_VALUE = "float_value";
    public static final String INT_VALUE = "int_value";
    public static final String STRING_VALUE = "string_value";
    public static final String KEY = "key";
    public static final String VALUE = "value";
    public static final String APP_ID = "app_id";
    public static final String EVENT_TIMESTAMP = "event_timestamp";
    public static final StructType EVENT_PARAMETER_TYPE = DataTypes.createStructType(new StructField[]{
            DataTypes.createStructField(APP_ID, DataTypes.StringType, true),
            DataTypes.createStructField(EVENT_TIMESTAMP, DataTypes.LongType, true),
            DataTypes.createStructField("event_id", DataTypes.StringType, true),
            DataTypes.createStructField("event_name", DataTypes.StringType, true),
            DataTypes.createStructField("event_param_key", DataTypes.StringType, true),
            DataTypes.createStructField("event_param_double_value", DataTypes.StringType, true),
            DataTypes.createStructField("event_param_float_value", DataTypes.StringType, true),
            DataTypes.createStructField("event_param_int_value", DataTypes.LongType, true),
            DataTypes.createStructField("event_param_string_value", DataTypes.StringType, true),
    });
    private static final StructType VALUE_TYPE = DataTypes.createStructType(
            new StructField[]{
                    DataTypes.createStructField(DOUBLE_VALUE, DataTypes.DoubleType, true),
                    DataTypes.createStructField(FLOAT_VALUE, DataTypes.FloatType, true),
                    DataTypes.createStructField(INT_VALUE, DataTypes.LongType, true),
                    DataTypes.createStructField(STRING_VALUE, DataTypes.StringType, true)});
    private static final ArrayType ITEM_PROPERTIES_TYPE = DataTypes.createArrayType(DataTypes.createStructType(
            new StructField[]{
                    DataTypes.createStructField(KEY, DataTypes.StringType, true),
                    DataTypes.createStructField(VALUE, VALUE_TYPE, true)}));
    public static final StructType ITEM_TYPE = DataTypes.createStructType(new StructField[]{
            DataTypes.createStructField(APP_ID, DataTypes.StringType, true),
            DataTypes.createStructField(EVENT_TIMESTAMP, DataTypes.LongType, true),
            DataTypes.createStructField("id", DataTypes.StringType, true),
            DataTypes.createStructField("properties", ITEM_PROPERTIES_TYPE, true)
    });
    private static final StructType USER_VALUE_TYPE = DataTypes.createStructType(
            new StructField[]{
                    DataTypes.createStructField(DOUBLE_VALUE, DataTypes.DoubleType, true),
                    DataTypes.createStructField(FLOAT_VALUE, DataTypes.FloatType, true),
                    DataTypes.createStructField(INT_VALUE, DataTypes.LongType, true),
                    DataTypes.createStructField(STRING_VALUE, DataTypes.StringType, true),
                    DataTypes.createStructField("set_timestamp_micros", DataTypes.LongType, true)
            });
    private static final ArrayType USER_PROPERTIES_TYPE = DataTypes.createArrayType(DataTypes.createStructType(
            new StructField[]{
                    DataTypes.createStructField(KEY, DataTypes.StringType, true),
                    DataTypes.createStructField(VALUE, USER_VALUE_TYPE, true)}));
    private static final StructType USER_LTV_TYPE = DataTypes.createStructType(new StructField[]{
            DataTypes.createStructField("revenue", DataTypes.DoubleType, true),
            DataTypes.createStructField("currency", DataTypes.StringType, true),
    });
    public static final StructType USER_TYPE = DataTypes.createStructType(new StructField[]{
            DataTypes.createStructField(APP_ID, DataTypes.StringType, true),
            DataTypes.createStructField(EVENT_TIMESTAMP, DataTypes.LongType, true),
            DataTypes.createStructField("user_id", DataTypes.StringType, true),
            DataTypes.createStructField("user_pseudo_id", DataTypes.StringType, true),
            DataTypes.createStructField("user_first_touch_timestamp", DataTypes.LongType, true),
            DataTypes.createStructField("user_properties", USER_PROPERTIES_TYPE, true),
            DataTypes.createStructField("user_ltv", USER_LTV_TYPE, true),
            DataTypes.createStructField("_first_referer", DataTypes.StringType, true),
            DataTypes.createStructField("_first_traffic_source_type", DataTypes.StringType, true),
            DataTypes.createStructField("_first_traffic_medium", DataTypes.StringType, true),
            DataTypes.createStructField("_first_traffic_source", DataTypes.StringType, true),
            DataTypes.createStructField("device_id_list", DataTypes.createArrayType(DataTypes.StringType), true),
            DataTypes.createStructField("_channel", DataTypes.StringType, true),
    });
    private static final StructType EVENT_ITEM_TYPE = DataTypes.createStructType(new StructField[]{
            DataTypes.createStructField("id", DataTypes.StringType, true),
            DataTypes.createStructField("quantity", DataTypes.LongType, true),
            DataTypes.createStructField("price", DataTypes.DoubleType, true),
            DataTypes.createStructField("currency", DataTypes.StringType, true),
            DataTypes.createStructField("creative_name", DataTypes.StringType, true),
            DataTypes.createStructField("creative_slot", DataTypes.StringType, true)
    });
    private static final ArrayType EVENT_ITEMS_TYPE = DataTypes.createArrayType(EVENT_ITEM_TYPE);
    private static final StructType EVENT_DEVICE_TYPE = DataTypes.createStructType(new StructField[]{
            DataTypes.createStructField("mobile_brand_name", DataTypes.StringType, true),
            DataTypes.createStructField("mobile_model_name", DataTypes.StringType, true),
            DataTypes.createStructField("manufacturer", DataTypes.StringType, true),
            DataTypes.createStructField("screen_width", DataTypes.LongType, true),
            DataTypes.createStructField("screen_height", DataTypes.LongType, true),
            DataTypes.createStructField("carrier", DataTypes.StringType, true),
            DataTypes.createStructField("network_type", DataTypes.StringType, true),
            DataTypes.createStructField("operating_system_version", DataTypes.StringType, true),
            DataTypes.createStructField("operating_system", DataTypes.StringType, true),
            DataTypes.createStructField("ua_browser", DataTypes.StringType, true),
            DataTypes.createStructField("ua_browser_version", DataTypes.StringType, true),
            DataTypes.createStructField("ua_os", DataTypes.StringType, true),
            DataTypes.createStructField("ua_os_version", DataTypes.StringType, true),
            DataTypes.createStructField("ua_device", DataTypes.StringType, true),
            DataTypes.createStructField("ua_device_category", DataTypes.StringType, true),
            DataTypes.createStructField("system_language", DataTypes.StringType, true),
            DataTypes.createStructField("time_zone_offset_seconds", DataTypes.LongType, true),
            DataTypes.createStructField("vendor_id", DataTypes.StringType, true),
            DataTypes.createStructField("advertising_id", DataTypes.StringType, true),
            DataTypes.createStructField("host_name", DataTypes.StringType, true),
            DataTypes.createStructField("viewport_width", DataTypes.LongType, true),
            DataTypes.createStructField("viewport_height", DataTypes.LongType, true),
    });
    private static final StructType EVENT_GEO_TYPE = DataTypes.createStructType(new StructField[]{
            DataTypes.createStructField("country", DataTypes.StringType, true),
            DataTypes.createStructField("continent", DataTypes.StringType, true),
            DataTypes.createStructField("sub_continent", DataTypes.StringType, true),
            DataTypes.createStructField("locale", DataTypes.StringType, true),
            DataTypes.createStructField("region", DataTypes.StringType, true),
            DataTypes.createStructField("metro", DataTypes.StringType, true),
            DataTypes.createStructField("city", DataTypes.StringType, true),
    });
    private static final StructType EVENT_TRAFFIC_SOURCE_TYPE = DataTypes.createStructType(new StructField[]{
            DataTypes.createStructField("medium", DataTypes.StringType, true),
            DataTypes.createStructField("name", DataTypes.StringType, true),
            DataTypes.createStructField("source", DataTypes.StringType, true),
    });
    private static final StructType EVENT_APP_INFO_TYPE = DataTypes.createStructType(new StructField[]{
            DataTypes.createStructField(APP_ID, DataTypes.StringType, true),
            DataTypes.createStructField("id", DataTypes.StringType, true),
            DataTypes.createStructField("install_source", DataTypes.StringType, true),
            DataTypes.createStructField("version", DataTypes.StringType, true),
            DataTypes.createStructField("sdk_version", DataTypes.StringType, true),
            DataTypes.createStructField("sdk_name", DataTypes.StringType, true),
    });
    private static final StructType EVENT_GEO_FOR_ENRICH_TYPE = DataTypes.createStructType(new StructField[]{
            DataTypes.createStructField("ip", DataTypes.StringType, true),
            DataTypes.createStructField("locale", DataTypes.StringType, true),
    });
    public static final StructType EVENT_TYPE = DataTypes.createStructType(new StructField[]{
            DataTypes.createStructField("event_id", DataTypes.StringType, true),
            DataTypes.createStructField(EVENT_TIMESTAMP, DataTypes.LongType, true),
            DataTypes.createStructField("event_previous_timestamp", DataTypes.LongType, true),
            DataTypes.createStructField("event_name", DataTypes.StringType, true),
            DataTypes.createStructField("event_value_in_usd", DataTypes.DoubleType, true),
            DataTypes.createStructField("event_bundle_sequence_id", DataTypes.LongType, true),
            DataTypes.createStructField("ingest_timestamp", DataTypes.LongType, true),
            DataTypes.createStructField("device", EVENT_DEVICE_TYPE, true),
            DataTypes.createStructField("geo", EVENT_GEO_TYPE, true),
            DataTypes.createStructField("traffic_source", EVENT_TRAFFIC_SOURCE_TYPE, true),
            DataTypes.createStructField("app_info", EVENT_APP_INFO_TYPE, true),
            DataTypes.createStructField("platform", DataTypes.StringType, true),
            DataTypes.createStructField("project_id", DataTypes.StringType, true),
            DataTypes.createStructField("items", EVENT_ITEMS_TYPE, true),
            DataTypes.createStructField("user_pseudo_id", DataTypes.StringType, true),
            DataTypes.createStructField("user_id", DataTypes.StringType, true),
            DataTypes.createStructField("ua", DataTypes.StringType, true),
            DataTypes.createStructField("geo_for_enrich", EVENT_GEO_FOR_ENRICH_TYPE, true),
    });
    private ClickStreamDataTypes() {
    }
}
