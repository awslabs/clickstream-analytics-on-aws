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

package software.aws.solution.clickstream.function;

import lombok.extern.slf4j.Slf4j;
import org.apache.flink.api.common.functions.MapFunction;
import org.apache.flink.api.java.tuple.Tuple2;
import org.apache.flink.shaded.jackson2.com.fasterxml.jackson.databind.JsonNode;
import org.apache.flink.shaded.jackson2.com.fasterxml.jackson.databind.ObjectMapper;
import org.apache.flink.shaded.jackson2.com.fasterxml.jackson.databind.node.ObjectNode;
import software.aws.solution.clickstream.flink.Utils;
import software.aws.solution.clickstream.plugin.enrich.Enrichment;
import software.aws.solution.clickstream.plugin.enrich.IPEnrichment;
import software.aws.solution.clickstream.plugin.transformer.DeviceTransformer;
import software.aws.solution.clickstream.plugin.transformer.JsonObjectNode;
import software.aws.solution.clickstream.plugin.transformer.KvObjectNode;
import software.aws.solution.clickstream.plugin.transformer.KvTransformer;
import software.aws.solution.clickstream.plugin.transformer.ObjectNodeTransformer;
import software.aws.solution.clickstream.plugin.transformer.Transformer;
import software.aws.solution.clickstream.plugin.transformer.URITransformer;
import software.aws.solution.clickstream.plugin.transformer.UserKvObjectNode;

import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.Iterator;
import java.util.List;
import java.util.Map;

import static software.aws.solution.clickstream.flink.Utils.getValueType;

@Slf4j
public class TransformDataMapFunction implements MapFunction<Tuple2<JsonNode, JsonNode>, String> {
    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();
    public static final String APP_ID = "app_id";
    public static final String TIMESTAMP = "timestamp";
    public static final String EVENT_BUNDLE_SEQUENCE_ID = "event_bundle_sequence_id";
    public static final String VALUE = "value";
    public static final String USER_LTV_CURRENCY = "_user_ltv_currency";
    public static final String PLATFORM = "platform";
    public static final String APP_PACKAGE_NAME = "app_package_name";
    public static final String USER_LTV_REVENUE = "_user_ltv_revenue";
    private final String appId;
    private final String projectId;
    private final Enrichment ipEnrich;
    private final Transformer deviceTransformer;
    private final Transformer uriTransformer;
    private final Transformer kvTransformer;
    private final Transformer objNodeTransformer;

    public TransformDataMapFunction(final String appId, final String projectId, final String bucketName, final String geoFileKey, final String region) {
        this.appId = appId;
        this.projectId = projectId;
        this.ipEnrich = new IPEnrichment(bucketName, geoFileKey, region);
        this.deviceTransformer = new DeviceTransformer();
        this.uriTransformer = new URITransformer();
        this.kvTransformer = new KvTransformer();
        this.objNodeTransformer = new ObjectNodeTransformer();
    }

    @Override
    public String map(final Tuple2<JsonNode, JsonNode> value) throws Exception {
        try {
            ObjectNode data = OBJECT_MAPPER.createObjectNode();
            JsonNode ingestNode = value.f0;
            JsonNode dataNode = value.f1;
            JsonNode attributesNode = dataNode.get("attributes");
            JsonNode userNode = dataNode.get("user");

            data.put("project_id", projectId);
            data.set("event_name", dataNode.get("event_type"));
            data.set("event_id", dataNode.get("event_id"));
            data.set(APP_ID, dataNode.get(APP_ID));
            data.set("user_pseudo_id", dataNode.get("unique_id"));
            data.set("event_timestamp", dataNode.get(TIMESTAMP));

            transformDevice(dataNode, ingestNode, data);
            transformAppInfo(dataNode, attributesNode, data);
            data.set("ecommerce", null);

            Map<String, String> uriTransformerParamsMap = new HashMap<>();
            uriTransformerParamsMap.put(URITransformer.PARAM_KEY_URI, ingestNode.get("uri").asText());
            data.put(EVENT_BUNDLE_SEQUENCE_ID, this.uriTransformer.transform(uriTransformerParamsMap).get(EVENT_BUNDLE_SEQUENCE_ID).asLong());

            LocalDateTime dateTime = LocalDateTime.ofInstant(Instant.ofEpochMilli(dataNode.get(TIMESTAMP).asLong()), ZoneId.of("UTC"));
            DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd");
            String formattedDateTime = dateTime.format(formatter);
            data.put("event_date", formattedDateTime);

            data.set("event_dimensions", null);

            transformEventParams(attributesNode, data);

            data.put("event_previous_timestamp", 0);
            data.put("event_server_timestamp_offset", ingestNode.get("ingest_time").asLong() - dataNode.get(TIMESTAMP).asLong());
            data.put("event_value_in_usd", 0);

            transformGeo(ingestNode, dataNode, data);

            data.put("ingest_timestamp", ingestNode.get("ingest_time").asLong());

            data.set("items", null);

            data.set(PLATFORM, ingestNode.get(PLATFORM));

            transformPrivacyInfo(attributesNode, data);

            transformTrafficSource(attributesNode, data);

            if (userNode.hasNonNull("_user_first_touch_timestamp")) {
                data.put("user_first_touch_timestamp", userNode.get("_user_first_touch_timestamp").get(VALUE).asLong());
            } else {
                data.set("user_first_touch_timestamp", null);
            }
            if (userNode.hasNonNull("_user_id")) {
                data.set("user_id", userNode.get("_user_id").get(VALUE));
            } else {
                data.set("user_id", null);
            }

            transformLtv(userNode, data);

            transformUser(userNode, data);

            String dataResult = OBJECT_MAPPER.writeValueAsString(data);
            log.debug("map.result: {}", dataResult);
            return dataResult;
        } catch (Exception e) {
            log.warn("Map ERROR: {}, appId: {} ignore data: {}", e.getMessage(), this.appId, value.f1);
            log.error(Utils.getStackError(e));
            return null;
        }
    }

    private void transformGeo(final JsonNode ingestNode, final JsonNode dataNode, final ObjectNode data) {
        Map<String, String> ipEnrichParamsMap = new HashMap<>();
        ipEnrichParamsMap.put(IPEnrichment.PARAM_KEY_IP, ingestNode.get("ip").asText());
        ipEnrichParamsMap.put(IPEnrichment.PARAM_KEY_LOCALE, dataNode.get("locale").asText());
        data.set("geo", this.ipEnrich.enrich(OBJECT_MAPPER.createObjectNode(), ipEnrichParamsMap));
    }

    private static void transformAppInfo(final JsonNode dataNode, final JsonNode attributesNode, final ObjectNode data) {
        ObjectNode appInfo = OBJECT_MAPPER.createObjectNode();
        appInfo.set(APP_ID, dataNode.get(APP_ID));
        appInfo.set("id", dataNode.get(APP_PACKAGE_NAME));
        appInfo.set("install_source", attributesNode.get("_channel"));
        appInfo.set("version", dataNode.get("app_version"));
        appInfo.set(APP_PACKAGE_NAME, dataNode.get(APP_PACKAGE_NAME));
        data.set("app_info", appInfo);
    }

    private void transformEventParams(final JsonNode attributesNode, final ObjectNode data) {
        List<KvObjectNode> eventParamList = new ArrayList<>();
        Iterator<String> attrIterator = attributesNode.fieldNames();
        while (attrIterator.hasNext()) {
            String attrName = attrIterator.next();
            JsonNode attrValue = attributesNode.get(attrName);
            if (attrName.startsWith("_traffic_source") || attrName.startsWith("_privacy_info")) {
                continue;
            }
            String valueType = getValueType(attrValue);
            eventParamList.add(new KvObjectNode(attrName, attrValue.asText(), valueType));
        }

        data.set("event_params", this.kvTransformer.transformArrayNode(eventParamList));
    }

    private void transformPrivacyInfo(final JsonNode attributesNode, final ObjectNode data) {
        List<JsonObjectNode> privacyInfoList = new ArrayList<>();
        Iterator<String> attrIterator = attributesNode.fieldNames();
        while (attrIterator.hasNext()) {
            String attrName = attrIterator.next();
            JsonNode attrValue = attributesNode.get(attrName);
            if (!attrName.startsWith("_privacy_info")) {
                continue;
            }
            String valueType = getValueType(attrValue);
            privacyInfoList.add(new JsonObjectNode(attrName, attrValue, valueType));
        }

        data.set("privacy_info", objNodeTransformer.transformObjectNode(privacyInfoList));
    }

    private void transformLtv(final JsonNode userNode, final ObjectNode data) {
        List<JsonObjectNode> userLtv = new ArrayList<>();
        if (userNode.hasNonNull(USER_LTV_REVENUE)
                && userNode.get(USER_LTV_REVENUE).hasNonNull(VALUE)) {
            userLtv.add(new JsonObjectNode(USER_LTV_REVENUE,
                    userNode.get(USER_LTV_REVENUE).get(VALUE),
                    ObjectNodeTransformer.PARAM_KEY_DOUBLE_VALUE));
        }
        if (userNode.hasNonNull(USER_LTV_CURRENCY)
                && userNode.get(USER_LTV_CURRENCY).hasNonNull(VALUE)) {
            userLtv.add(new JsonObjectNode(USER_LTV_CURRENCY,
                    userNode.get(USER_LTV_CURRENCY).get(VALUE),
                    ObjectNodeTransformer.PARAM_KEY_STRING_VALUE));
        }

        data.set("user_ltv", this.objNodeTransformer.transformObjectNode(userLtv));
    }

    private void transformTrafficSource(final JsonNode attributesNode, final ObjectNode data) {
        List<JsonObjectNode> trafficSourceParamList = new ArrayList<>();

        Iterator<String> attrIterator = attributesNode.fieldNames();
        while (attrIterator.hasNext()) {
            String attrName = attrIterator.next();
            JsonNode attrValue = attributesNode.get(attrName);
            if (!attrName.startsWith("_traffic_source_")) {
                continue;
            }
            String valueType = getValueType(attrValue);
            trafficSourceParamList.add(new JsonObjectNode(attrName, attrValue, valueType));
        }
        data.set("traffic_source", objNodeTransformer.transformObjectNode(trafficSourceParamList));
    }

    private void transformUser(final JsonNode userNode, final ObjectNode data) {
        List<UserKvObjectNode> userProperty = new ArrayList<>();
        Iterator<String> userIterator = userNode.fieldNames();
        while (userIterator.hasNext()) {
            String attrName = userIterator.next();
            JsonNode attrValue = userNode.get(attrName).get(VALUE);
            Long setTimestamp = null;
            if (userNode.get(attrName).hasNonNull("set_timestamp")) {
                setTimestamp = userNode.get(attrName).get("set_timestamp").asLong();
            }
            if (attrName.startsWith("_user_ltv")) {
                continue;
            }
            String valueType = getValueType(attrValue);
            userProperty.add(new UserKvObjectNode(
                    attrName,
                    attrValue.asText(),
                    setTimestamp,
                    valueType));
        }
        data.set("user_properties", this.kvTransformer.transformUserArrayNode(userProperty));
    }

    private void transformDevice(final JsonNode dataNode, final JsonNode ingestNode, final ObjectNode data) {
        Map<String, String> deviceParamMap = new HashMap<>();
        deviceParamMap.put(DeviceTransformer.PARAM_KEY_VENDOR_ID, dataNode.get("device_id").asText());
        deviceParamMap.put(DeviceTransformer.PARAM_KEY_BRAND, dataNode.get("brand").asText());
        deviceParamMap.put(DeviceTransformer.PARAM_KEY_MODEL, dataNode.get("model").asText());
        deviceParamMap.put(DeviceTransformer.PARAM_KEY_MAKE, dataNode.get("make").asText());
        deviceParamMap.put(DeviceTransformer.PARAM_KEY_SCREEN_WIDTH, dataNode.get("screen_width").asText());
        deviceParamMap.put(DeviceTransformer.PARAM_KEY_SCREEN_HEIGHT, dataNode.get("screen_height").asText());
        deviceParamMap.put(DeviceTransformer.PARAM_KEY_CARRIER, dataNode.get("carrier").asText());
        deviceParamMap.put(DeviceTransformer.PARAM_KEY_NETWORK_TYPE, dataNode.get("network_type").asText());
        deviceParamMap.put(DeviceTransformer.PARAM_KEY_OPERATING_SYSTEM, dataNode.get(PLATFORM).asText());
        deviceParamMap.put(DeviceTransformer.PARAM_KEY_OS_VERSION, dataNode.get("os_version").asText());
        if (ingestNode.hasNonNull("ua")) {
            deviceParamMap.put(DeviceTransformer.PARAM_KEY_UA, ingestNode.get("ua").asText());
        }
        deviceParamMap.put(DeviceTransformer.PARAM_KEY_SYSTEM_LANGUAGE, dataNode.get("system_language").asText());
        deviceParamMap.put(DeviceTransformer.PARAM_KEY_ZONE_OFFSET, dataNode.get("zone_offset").asText());
        data.set("device", this.deviceTransformer.transform(deviceParamMap));
    }
}
