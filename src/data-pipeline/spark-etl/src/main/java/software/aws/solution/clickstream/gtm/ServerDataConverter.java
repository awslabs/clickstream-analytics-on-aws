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

package software.aws.solution.clickstream.gtm;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.JsonNodeFactory;
import lombok.AllArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.spark.sql.Dataset;
import org.apache.spark.sql.Row;
import org.apache.spark.sql.SaveMode;
import org.apache.spark.sql.api.java.UDF1;
import org.apache.spark.sql.catalyst.expressions.GenericRow;
import org.apache.spark.sql.expressions.UserDefinedFunction;
import org.apache.spark.sql.types.ArrayType;
import org.apache.spark.sql.types.DataTypes;
import org.apache.spark.sql.types.StructField;
import org.apache.spark.sql.types.StructType;
import software.aws.solution.clickstream.ETLMetric;
import software.aws.solution.clickstream.KvConverter;
import software.aws.solution.clickstream.exception.ExecuteTransformerException;

import java.util.ArrayList;
import java.util.Date;
import java.util.HashMap;
import java.util.Iterator;
import java.util.List;
import java.util.Map;

import static org.apache.spark.sql.functions.col;
import static org.apache.spark.sql.functions.explode;
import static org.apache.spark.sql.functions.lit;
import static org.apache.spark.sql.functions.udf;
import static software.aws.solution.clickstream.ContextUtil.DEBUG_LOCAL_PROP;
import static software.aws.solution.clickstream.ContextUtil.JOB_NAME_PROP;
import static software.aws.solution.clickstream.ContextUtil.WAREHOUSE_DIR_PROP;
import static software.aws.solution.clickstream.DatasetUtil.CLIENT_ID;
import static software.aws.solution.clickstream.DatasetUtil.CORRUPT_RECORD;
import static software.aws.solution.clickstream.DatasetUtil.DATA;
import static software.aws.solution.clickstream.DatasetUtil.DATA_OUT;
import static software.aws.solution.clickstream.DatasetUtil.DOUBLE_VALUE;
import static software.aws.solution.clickstream.DatasetUtil.ENGAGEMENT_TIME_MSEC;
import static software.aws.solution.clickstream.DatasetUtil.EVENT_FIRST_OPEN;
import static software.aws.solution.clickstream.DatasetUtil.EVENT_ID;
import static software.aws.solution.clickstream.DatasetUtil.EVENT_ITEMS;
import static software.aws.solution.clickstream.DatasetUtil.EVENT_NAME;
import static software.aws.solution.clickstream.DatasetUtil.EVENT_PAGE_VIEW;
import static software.aws.solution.clickstream.DatasetUtil.EVENT_PARAMS;
import static software.aws.solution.clickstream.DatasetUtil.EVENT_PROFILE_SET;
import static software.aws.solution.clickstream.DatasetUtil.EVENT_SESSION_START;
import static software.aws.solution.clickstream.DatasetUtil.EVENT_USER_ENGAGEMENT;
import static software.aws.solution.clickstream.DatasetUtil.FLOAT_VALUE;
import static software.aws.solution.clickstream.DatasetUtil.GA_ENGAGEMENT_TIME_MSEC;
import static software.aws.solution.clickstream.DatasetUtil.GA_SESSION_ID;
import static software.aws.solution.clickstream.DatasetUtil.GA_SESSION_NUMBER;
import static software.aws.solution.clickstream.DatasetUtil.GTM_BRAND;
import static software.aws.solution.clickstream.DatasetUtil.GTM_BRANDS;
import static software.aws.solution.clickstream.DatasetUtil.GTM_CLIENT_BRAND;
import static software.aws.solution.clickstream.DatasetUtil.GTM_CLIENT_PLATFORM;
import static software.aws.solution.clickstream.DatasetUtil.GTM_CLIENT_PLATFORM_VERSION;
import static software.aws.solution.clickstream.DatasetUtil.GTM_ID;
import static software.aws.solution.clickstream.DatasetUtil.GTM_LANGUAGE;
import static software.aws.solution.clickstream.DatasetUtil.GTM_PAGE_LOCATION;
import static software.aws.solution.clickstream.DatasetUtil.GTM_PAGE_REFERRER;
import static software.aws.solution.clickstream.DatasetUtil.GTM_PAGE_TITLE;
import static software.aws.solution.clickstream.DatasetUtil.GTM_REQUEST_START_TIME_MS;
import static software.aws.solution.clickstream.DatasetUtil.GTM_SCREEN_HEIGHT;
import static software.aws.solution.clickstream.DatasetUtil.GTM_SCREEN_WIDTH;
import static software.aws.solution.clickstream.DatasetUtil.GTM_SESSION_ID;
import static software.aws.solution.clickstream.DatasetUtil.GTM_SESSION_NUM;
import static software.aws.solution.clickstream.DatasetUtil.GTM_UC;
import static software.aws.solution.clickstream.DatasetUtil.GTM_VERSION;
import static software.aws.solution.clickstream.DatasetUtil.ID;
import static software.aws.solution.clickstream.DatasetUtil.INT_VALUE;
import static software.aws.solution.clickstream.DatasetUtil.IP;
import static software.aws.solution.clickstream.DatasetUtil.ITEMS;
import static software.aws.solution.clickstream.DatasetUtil.ITEM_ID;
import static software.aws.solution.clickstream.DatasetUtil.JOB_NAME_COL;
import static software.aws.solution.clickstream.DatasetUtil.KEY;
import static software.aws.solution.clickstream.DatasetUtil.MAX_STRING_VALUE_LEN;
import static software.aws.solution.clickstream.DatasetUtil.MOBILE;
import static software.aws.solution.clickstream.DatasetUtil.MODEL;
import static software.aws.solution.clickstream.DatasetUtil.PAGE_REFERRER;
import static software.aws.solution.clickstream.DatasetUtil.PAGE_TITLE;
import static software.aws.solution.clickstream.DatasetUtil.PAGE_URL;
import static software.aws.solution.clickstream.DatasetUtil.PLATFORM;
import static software.aws.solution.clickstream.DatasetUtil.PLATFORM_VERSION;
import static software.aws.solution.clickstream.DatasetUtil.PRICE;
import static software.aws.solution.clickstream.DatasetUtil.PROPERTIES;
import static software.aws.solution.clickstream.DatasetUtil.PROP_PAGE_REFERRER;
import static software.aws.solution.clickstream.DatasetUtil.SESSION_DURATION;
import static software.aws.solution.clickstream.DatasetUtil.SESSION_ID;
import static software.aws.solution.clickstream.DatasetUtil.SESSION_NUMBER;
import static software.aws.solution.clickstream.DatasetUtil.STRING_VALUE;
import static software.aws.solution.clickstream.DatasetUtil.UA;
import static software.aws.solution.clickstream.DatasetUtil.USER;
import static software.aws.solution.clickstream.DatasetUtil.USER_ID;
import static software.aws.solution.clickstream.DatasetUtil.USER_PROPERTIES;
import static software.aws.solution.clickstream.DatasetUtil.VALUE;
import static software.aws.solution.clickstream.DatasetUtil.X_GA_JS_CLIENT_ID;
import static software.aws.solution.clickstream.ETLRunner.DEBUG_LOCAL_PATH;
import static software.aws.solution.clickstream.KvConverter.getValueTypeResult;

@Slf4j
public class ServerDataConverter {
    protected static final Map<String, String> PROPS_NAME_MAP = createPropNameMap();
    protected static final Map<String, String> EVENT_NAME_MAP = createEventNameMap();

    private static UDF1<String, Row[]> convertGTMServerData() {
        return (String value) -> {
            try {
                return getGenericRows(value);
            } catch (Exception e) {
                log.error("cannot convert data: " + value + ", error: " + e.getMessage());
                return getCorruptGenericRows(value, e);
            }
        };
    }

    private static GenericRow[] getCorruptGenericRows(final String value, final Exception e) {
        return new GenericRow[]{
                new GenericRow(new Object[]{
                        "error:" + e.getClass().getName() + ":" + e.getMessage() + ", data:" + value,
                        null,
                        null,
                        null,
                        null,
                        null,
                        null,
                        null,
                        null,
                        null,
                        null,
                        null,
                        null,
                        null,
                        null,
                        null,
                        null,
                        null,
                        null,
                        null,
                        null,
                        null,
                        null,
                        null,
                        null,
                        null,
                })
        };
    }

    private static Row[] getGenericRows(final String jsonString) throws JsonProcessingException {
        List<Row> rows = new ArrayList<>();

        ObjectMapper objectMapper = new ObjectMapper();
        JsonNode jsonNode = objectMapper.readTree(jsonString);
        int index = 0;
        if (jsonNode.isArray()) {
            for (Iterator<JsonNode> elementsIt = jsonNode.elements(); elementsIt.hasNext(); ) {
                rows.addAll(getGenericRow(elementsIt.next(), index));
                index++;
            }
        } else {
            rows.addAll(getGenericRow(jsonNode, index));
        }
        return rows.toArray(new Row[0]);

    }

    private static List<GenericRow> getGenericRow(final JsonNode jsonNode, final int index) {

        RowResult result = parseJsonNode(jsonNode);

        String clientId = result.eventInfo.clientId;
        if (result.attrMap.containsKey(X_GA_JS_CLIENT_ID)) {
            clientId = result.attrMap.get(X_GA_JS_CLIENT_ID).asText();
        }
        if (clientId == null) {
            throw new ExecuteTransformerException("client_id is empty");
        }

        String sessionId;
        if (result.attrMap.containsKey(SESSION_ID)) {
            sessionId = result.attrMap.get(SESSION_ID).asText();
        } else {
            sessionId = String.valueOf(new Date().getTime());
        }
        String sessionNum = "0";
        if (result.attrMap.containsKey(GA_SESSION_NUMBER)) {
            sessionNum = result.attrMap.get(GA_SESSION_NUMBER).asText();
        }

        Long sessionNumber;
        try {
            sessionNumber = Long.parseLong(sessionNum);
        } catch (Exception e) {
            sessionNumber = 0L;
        }

        String eventId = String.format("%s-%s-%s",
                index,
                sessionId,
                sessionNum
        );

        result.attrMap.put(SESSION_DURATION, JsonNodeFactory.instance.numberNode(0));

        eventId = checkStringValue(eventId, MAX_STRING_VALUE_LEN - 32);
        String gtmId = result.attrMap.get("x-ga-measurement_id").asText();
        String gtmVersion = result.attrMap.get("x-ga-gtm_version").asText();

        Long requestStartTimeMs = null;
        if (result.attrMap.containsKey("x-sst-system_properties.request_start_time_ms")) {
            requestStartTimeMs = result.attrMap.get("x-sst-system_properties.request_start_time_ms").asLong();
        }

        String uc = null;
        if (result.attrMap.containsKey("event_location.country")) {
            uc = result.attrMap.get("event_location.country").asText();
        } else if (result.attrMap.containsKey("x-sst-system_properties.uc")) {
            uc = result.attrMap.get("x-sst-system_properties.uc").asText();
        }

        boolean firstVisit = false;
        if (result.attrMap.containsKey("x-ga-system_properties.fv")) {
            firstVisit = true;
        }

        boolean seesionStart = false;
        if (result.attrMap.containsKey("x-ga-system_properties.ss")) {
            seesionStart = true;
        }

        List<GenericRow> eventParams = new ArrayList<>();
        for (Map.Entry<String, JsonNode> e : result.attrMap.entrySet()) {
            KvConverter.ValueTypeResult valueTypeResult = getValueTypeResult(e.getKey(), e.getValue());
            eventParams.add(new GenericRow(new Object[]{e.getKey(),
                    new GenericRow(new Object[]{
                            valueTypeResult.doubleValue,
                            null,
                            valueTypeResult.longValue,
                            valueTypeResult.stringValue})}
            ));
        }

        String clickstreamEventName = mapEventNameToClickstream(result.eventInfo.eventName);

        GenericRow originRow = createGenericRowFromResult(
                new EventParams(clickstreamEventName, gtmId, gtmVersion, eventId, uc),
                result,
                eventParams,
                new SessionParams(requestStartTimeMs, sessionId, sessionNumber));
        List<GenericRow> eventList = new ArrayList<>();
        eventList.add(originRow);

        int eventIndex = 0;
        if (firstVisit) {
            String eventId2 = String.format("%s-%s", eventId, ++eventIndex);
            GenericRow firstVisitEvent = createGenericRowFromResult(
                    new EventParams(EVENT_FIRST_OPEN, gtmId, gtmVersion, eventId2, uc),
                    result,
                    eventParams,
                    new SessionParams(requestStartTimeMs, sessionId, sessionNumber)
            );
            eventList.add(firstVisitEvent);
        }

        if (seesionStart) {
            String eventId3 = String.format("%s-%s", eventId, ++eventIndex);
            GenericRow sessionStartEvent = createGenericRowFromResult(
                    new EventParams(EVENT_SESSION_START, gtmId, gtmVersion, eventId3, uc),
                    result,
                    eventParams,
                    new SessionParams(requestStartTimeMs, sessionId, sessionNumber)
            );
            eventList.add(sessionStartEvent);
        }

        return eventList;
    }

    private static GenericRow createGenericRowFromResult(final EventParams ep,
                                                         final RowResult result,
                                                         final List<GenericRow> eventParams,
                                                         final SessionParams sessionParams) {
        return new GenericRow(new Object[]{
                null,
                ep.gtmId,
                ep.gtmVersion,
                ep.eventId,
                result.eventInfo.userId,
                ep.clickstreamEventName,
                result.eventInfo.ip,
                result.eventInfo.clientId,
                result.eventInfo.ua,
                result.eventInfo.language,
                result.screenResolution.screenWidth,
                result.screenResolution.screenHeight,
                result.eventInfo.pageReferrer,
                result.clientHint.isClientMobile,
                result.clientHint.clientModel,
                result.clientHint.clientPlatform,
                result.clientHint.clientPlatformVersion,
                result.clientHint.clientBrand,
                eventParams.toArray(new GenericRow[0]),
                result.items.toArray(new GenericRow[0]),
                result.eventItems.toArray(new GenericRow[0]),
                result.user,
                sessionParams.requestStartTimeMs,
                ep.uc,
                sessionParams.sessionId,
                sessionParams.sessionNumber,
        });
    }

    private static ServerDataConverter.RowResult parseJsonNode(final JsonNode jsonNode) {
        String userId = null;
        String eventName = null;
        String ip = null;
        String clientId = null;
        String ua = null;
        String language = null;
        String pageReferrer = null;

        ScreenResolution screenResolution = new ScreenResolution(null, null);
        ClientHint clientHint = new ClientHint(null, null, null, null, null);

        Map<String, JsonNode> attrMap = new HashMap<>();
        List<GenericRow> items = new ArrayList<>();
        List<GenericRow> eventItems = new ArrayList<>();
        GenericRow user = null;

        for (Iterator<String> it = jsonNode.fieldNames(); it.hasNext(); ) {
            String attrName = it.next();
            JsonNode attrValue = jsonNode.get(attrName);

            switch (attrName) {
                case "event_name": {
                    eventName = attrValue.asText();
                    break;
                }
                case "ip_override": {
                    ip = attrValue.asText();
                    break;
                }

                case CLIENT_ID: {
                    clientId = checkStringValue(attrValue.asText());
                    break;
                }

                case "user_agent": {
                    ua = attrValue.asText();
                    break;
                }

                case "language": {
                    language = checkStringValue(attrValue.asText());
                    break;
                }

                case "screen_resolution": {
                    screenResolution = getScreenResolution(attrValue);
                    addValueToParamsMap(attrMap, attrName, attrValue);
                    break;
                }

                case USER_ID: {
                    userId = attrValue.asText();
                    break;
                }

                case GTM_PAGE_REFERRER: {
                    pageReferrer = checkStringValue(attrValue.asText());
                    addValueToParamsMap(attrMap, attrName, attrValue);
                    break;
                }
                case "client_hints": {
                    clientHint = getClientHint(attrValue);
                    addValueToParamsMap(attrMap, attrName, attrValue);
                    break;
                }

                case "items": {
                    if (attrValue.isArray()) {
                        items = extractItems(attrValue);
                        eventItems = extractEventItems(attrValue);
                    } else {
                        log.warn("unknown items value: " + attrValue);
                    }
                    break;
                }
                case "x-ga-mp2-user_properties": {
                    user = extractUser(attrValue);
                    break;
                }
                default:
                    addValueToParamsMap(attrMap, attrName, attrValue);
            }
        }
        return new RowResult(
                new EventInfo(userId, eventName, ip, clientId, ua, language, pageReferrer),
                screenResolution, clientHint,
                attrMap, items, eventItems, user);
    }

    private static ClientHint getClientHint(final JsonNode attrValue) {

        Boolean isClientMobile = null;
        String clientModel = null;
        String clientPlatform = null;
        String clientPlatformVersion = null;
        String clientBrand = null;
        List<String> brands = new ArrayList<>();

        if (attrValue.hasNonNull(MOBILE)) {
            isClientMobile = attrValue.get(MOBILE).asBoolean(false);
        }
        if (attrValue.hasNonNull(MODEL)) {
            clientModel = attrValue.get(MODEL).asText();
        }
        if (attrValue.hasNonNull(PLATFORM)) {
            clientPlatform = attrValue.get(PLATFORM).asText();
            clientPlatform = checkStringValue(clientPlatform);
        }
        if (attrValue.hasNonNull(PLATFORM_VERSION)) {
            clientPlatformVersion = attrValue.get(PLATFORM_VERSION).asText();
        }
        if (attrValue.hasNonNull(GTM_BRANDS)) {
            JsonNode brandsArr = attrValue.get(GTM_BRANDS);
            if (brandsArr.isArray()) {
                for (Iterator<JsonNode> els = brandsArr.elements(); els.hasNext(); ) {
                    JsonNode brandObj = els.next();
                    if (brandObj.hasNonNull(GTM_BRAND)) {
                        brands.add(brandObj.get(GTM_BRAND).asText());
                    }
                }
            }
        }
        if (!brands.isEmpty()) {
            clientBrand = String.join("|", brands);
        }
        return new ClientHint(isClientMobile, clientModel, clientPlatform, clientPlatformVersion, clientBrand);
    }

    private static ScreenResolution getScreenResolution(final JsonNode attrValue) {
        Long screenHeight = null;
        Long screenWidth = null;
        String screenResolution = attrValue.asText();
        if (screenResolution.contains("x")) {
            String[] wXh = screenResolution.split("x");
            try {
                screenWidth = Long.parseLong(wXh[0]);
                screenHeight = Long.parseLong(wXh[1]);
            } catch (Exception ignore) {
                log.warn("cannot parse screenResolution: " + screenResolution);
            }
        }
        return new ScreenResolution(screenWidth, screenHeight);
    }

    private static String mapEventNameToClickstream(final String eventName) {
        if (eventName == null) {
            return null;
        }
        String eventName1 = checkStringValue(eventName);
        return EVENT_NAME_MAP.getOrDefault(eventName1, eventName1);
    }

    private static String mapPropNameToClickstream(final String gaPropName) {
        String gaPropName1 = checkStringValue(gaPropName);
        return PROPS_NAME_MAP.getOrDefault(gaPropName, gaPropName1);
    }

    private static Map<String, String> createEventNameMap() {
        Map<String, String> eventNameMap = new HashMap<>();
        eventNameMap.put("page_view", EVENT_PAGE_VIEW);
        eventNameMap.put("login", EVENT_PROFILE_SET);
        eventNameMap.put("user_engagement", EVENT_USER_ENGAGEMENT);
        return eventNameMap;
    }

    private static Map<String, String> createPropNameMap() {
        Map<String, String> propsNameMap = new HashMap<>();
        propsNameMap.put(GA_SESSION_ID, SESSION_ID);
        propsNameMap.put(GA_SESSION_NUMBER, SESSION_NUMBER);
        propsNameMap.put(GTM_PAGE_TITLE, PAGE_TITLE);
        propsNameMap.put(GTM_PAGE_LOCATION, PAGE_URL);
        propsNameMap.put(GTM_PAGE_REFERRER, PROP_PAGE_REFERRER); // _page_referrer
        propsNameMap.put(GA_ENGAGEMENT_TIME_MSEC, ENGAGEMENT_TIME_MSEC);
        return propsNameMap;
    }

    private static GenericRow extractUser(final JsonNode userItem) {
        String userId = null;
        if (userItem.hasNonNull("_user_id")) {
            userId = userItem.get("_user_id").asText();
        } else if (userItem.hasNonNull(USER_ID)) {
            userId = userItem.get(USER_ID).asText();
        }
        userId = checkStringValue(userId);
        List<GenericRow> userPropertiesList = new ArrayList<>();

        for (Iterator<String> attrNameIt = userItem.fieldNames(); attrNameIt.hasNext(); ) {
            String key = attrNameIt.next();
            JsonNode val = userItem.get(key);
            KvConverter.ValueTypeResult valueTypeResult = getValueTypeResult(key, val);

            userPropertiesList.add(new GenericRow(new Object[]{
                    key,
                    new GenericRow(new Object[]{
                            valueTypeResult.doubleValue,
                            null,
                            valueTypeResult.longValue,
                            valueTypeResult.stringValue,
                            null, // set_timestamp_micros
                    })
            }));
        }

        return new GenericRow(new Object[]{
                userId,
                userPropertiesList.toArray(new GenericRow[0])
        });
    }

    private static List<GenericRow> extractItems(final JsonNode itemsArr) {
        List<GenericRow> list = new ArrayList<>();
        for (Iterator<JsonNode> it = itemsArr.elements(); it.hasNext(); ) {
            JsonNode item = it.next();

            String itemId = null;

            if (item.hasNonNull(ITEM_ID)) {
                itemId = checkStringValue(item.get(ITEM_ID).asText());
            }

            List<GenericRow> propertiesList = new ArrayList<>();
            for (Iterator<String> attrNameIt = item.fieldNames(); attrNameIt.hasNext(); ) {

                String key = attrNameIt.next();
                JsonNode val = item.get(key);

                if (ITEM_ID.equals(key)) {
                    continue;
                }

                KvConverter.ValueTypeResult valueTypeResult = getValueTypeResult(key, val);

                propertiesList.add(new GenericRow(new Object[]{
                        key,
                        new GenericRow(new Object[]{
                                valueTypeResult.doubleValue,
                                null,
                                valueTypeResult.longValue,
                                valueTypeResult.stringValue})
                }));
            }

            list.add(new GenericRow(new Object[]{
                    itemId,
                    propertiesList.toArray(new GenericRow[0])
            }));
        }
        return list;
    }

    private static List<GenericRow> extractEventItems(final JsonNode itemsArr) {
        List<GenericRow> list = new ArrayList<>();
        for (Iterator<JsonNode> it = itemsArr.elements(); it.hasNext(); ) {
            JsonNode item = it.next();
            String id = null;
            Double price = null;

            if (item.hasNonNull(ITEM_ID)) {
                id = checkStringValue(item.get(ITEM_ID).asText());
            }
            if (item.hasNonNull(PRICE)) {
                price = item.get(PRICE).asDouble(0);
            }
            list.add(new GenericRow(new Object[]{
                    id,
                    null, // quantity
                    price,
                    null, // currency
                    null, //creative_name,
                    null, //creative_slot
            }));
        }
        return list;
    }

    private static String checkStringValue(final String sValue) {
        return checkStringValue(sValue, MAX_STRING_VALUE_LEN);
    }

    private static String checkStringValue(final String sValue, final int len) {
        String reString = sValue;
        if (reString != null && reString.length() > len) {
            reString = reString.substring(0, len);
        }
        return reString;
    }

    public static void addValueToParamsMap(final Map<String, JsonNode> attrMap, final String attrName, final JsonNode attrValue) {

        if (attrValue.isObject()) {
            for (Iterator<String> ait = attrValue.fieldNames(); ait.hasNext(); ) {
                String fieldName = ait.next();
                JsonNode fieldValue = attrValue.get(fieldName);
                attrMap.put(mapPropNameToClickstream(attrName + "." + fieldName), fieldValue);
            }
        } else if (attrValue.isArray()) {
            int index = 0;
            for (Iterator<JsonNode> eIt = attrValue.elements(); eIt.hasNext(); ) {
                JsonNode eleValue = eIt.next();
                attrMap.put(mapPropNameToClickstream(attrName + "." + index), eleValue);
            }
        } else {
            attrMap.put(mapPropNameToClickstream(attrName), attrValue);
        }
    }

    private static void saveCorruptDataset(final Dataset<Row> corruptDataset, final long corruptDatasetCount) {
        log.info(new ETLMetric(corruptDatasetCount, "GMTServerDataConverter corruptDataset").toString());
        String jobName = System.getProperty(JOB_NAME_PROP);
        String s3FilePath = System.getProperty(WAREHOUSE_DIR_PROP) + "/etl_gtm_corrupted_json_data";
        log.info("save corruptedDataset to " + s3FilePath);
        corruptDataset
                .withColumn(JOB_NAME_COL, lit(jobName))
                .write()
                .partitionBy(JOB_NAME_COL)
                .option("compression", "gzip")
                .mode(SaveMode.Append)
                .json(s3FilePath);
    }

    public Dataset<Row> transform(final Dataset<Row> dataset) {

        StructType valueType = DataTypes.createStructType(
                new StructField[]{
                        DataTypes.createStructField(DOUBLE_VALUE, DataTypes.DoubleType, true),
                        DataTypes.createStructField(FLOAT_VALUE, DataTypes.FloatType, true),
                        DataTypes.createStructField(INT_VALUE, DataTypes.LongType, true),
                        DataTypes.createStructField(STRING_VALUE, DataTypes.StringType, true)});

        StructType userValueType = DataTypes.createStructType(
                new StructField[]{
                        DataTypes.createStructField(DOUBLE_VALUE, DataTypes.DoubleType, true),
                        DataTypes.createStructField(FLOAT_VALUE, DataTypes.FloatType, true),
                        DataTypes.createStructField(INT_VALUE, DataTypes.LongType, true),
                        DataTypes.createStructField(STRING_VALUE, DataTypes.StringType, true),
                        DataTypes.createStructField("set_timestamp_micros", DataTypes.LongType, true)
                });

        ArrayType keyValueType = DataTypes.createArrayType(DataTypes.createStructType(
                new StructField[]{
                        DataTypes.createStructField(KEY, DataTypes.StringType, true),
                        DataTypes.createStructField(VALUE, valueType, true)}));

        ArrayType userKeyValueType = DataTypes.createArrayType(DataTypes.createStructType(
                new StructField[]{
                        DataTypes.createStructField(KEY, DataTypes.StringType, true),
                        DataTypes.createStructField(VALUE, userValueType, true)}));

        StructType userType = DataTypes.createStructType(new StructField[]{
                DataTypes.createStructField(USER_ID, DataTypes.StringType, true),
                DataTypes.createStructField(USER_PROPERTIES, userKeyValueType, true),
        });


        StructType itemType = DataTypes.createStructType(new StructField[]{
                DataTypes.createStructField(ID, DataTypes.StringType, true),
                DataTypes.createStructField(PROPERTIES, keyValueType, true)
        });


        StructType eventItemType = DataTypes.createStructType(new StructField[]{
                DataTypes.createStructField(ID, DataTypes.StringType, true),
                DataTypes.createStructField("quantity", DataTypes.LongType, true),
                DataTypes.createStructField(PRICE, DataTypes.DoubleType, true),
                DataTypes.createStructField("currency", DataTypes.StringType, true),
                DataTypes.createStructField("creative_name", DataTypes.StringType, true),
                DataTypes.createStructField("creative_slot", DataTypes.StringType, true)
        });

        ArrayType itemsType = DataTypes.createArrayType(itemType);
        ArrayType eventItemsType = DataTypes.createArrayType(eventItemType);

        StructType dataItemType = DataTypes.createStructType(new StructField[]{
                DataTypes.createStructField(CORRUPT_RECORD, DataTypes.StringType, true),
                DataTypes.createStructField(GTM_ID, DataTypes.StringType, true),
                DataTypes.createStructField(GTM_VERSION, DataTypes.StringType, true),
                DataTypes.createStructField(EVENT_ID, DataTypes.StringType, true),
                DataTypes.createStructField(USER_ID, DataTypes.StringType, true),
                DataTypes.createStructField(EVENT_NAME, DataTypes.StringType, true),
                DataTypes.createStructField(IP, DataTypes.StringType, true),
                DataTypes.createStructField(CLIENT_ID, DataTypes.StringType, true),
                DataTypes.createStructField(UA, DataTypes.StringType, true),
                DataTypes.createStructField(GTM_LANGUAGE, DataTypes.StringType, true),
                DataTypes.createStructField(GTM_SCREEN_WIDTH, DataTypes.LongType, true),
                DataTypes.createStructField(GTM_SCREEN_HEIGHT, DataTypes.LongType, true),
                DataTypes.createStructField(PAGE_REFERRER, DataTypes.StringType, true),
                DataTypes.createStructField("isClientMobile", DataTypes.BooleanType, true),
                DataTypes.createStructField("clientModel", DataTypes.StringType, true),
                DataTypes.createStructField(GTM_CLIENT_PLATFORM, DataTypes.StringType, true),
                DataTypes.createStructField(GTM_CLIENT_PLATFORM_VERSION, DataTypes.StringType, true),
                DataTypes.createStructField(GTM_CLIENT_BRAND, DataTypes.StringType, true),
                DataTypes.createStructField(EVENT_PARAMS, keyValueType, true),
                DataTypes.createStructField(ITEMS, itemsType, true),
                DataTypes.createStructField(EVENT_ITEMS, eventItemsType, true),
                DataTypes.createStructField(USER, userType, true),
                DataTypes.createStructField(GTM_REQUEST_START_TIME_MS, DataTypes.LongType, true),
                DataTypes.createStructField(GTM_UC, DataTypes.StringType, true),
                DataTypes.createStructField(GTM_SESSION_ID, DataTypes.StringType, true),
                DataTypes.createStructField(GTM_SESSION_NUM, DataTypes.LongType, true),
        });

        ArrayType dataItemArrayType = DataTypes.createArrayType(dataItemType);

        UserDefinedFunction convertStringToKeyValueUdf = udf(convertGTMServerData(), dataItemArrayType);
        Dataset<Row> convertedKeyValueDataset = dataset.withColumn(DATA_OUT, explode(convertStringToKeyValueUdf.apply(col(DATA))))
                .drop(DATA);

        boolean debugLocal = Boolean.parseBoolean(System.getProperty(DEBUG_LOCAL_PROP));
        if (debugLocal) {
            convertedKeyValueDataset.write().mode(SaveMode.Overwrite).json(DEBUG_LOCAL_PATH + "/ServerDataConverter/");
        }
        Dataset<Row> okDataset = convertedKeyValueDataset.filter(col(DATA_OUT).getField(CORRUPT_RECORD).isNull());
        Dataset<Row> corruptDataset = convertedKeyValueDataset.filter(col(DATA_OUT).getField(CORRUPT_RECORD).isNotNull());
        long corruptDatasetCount = corruptDataset.count();
        if (corruptDatasetCount > 0) {
            saveCorruptDataset(corruptDataset, corruptDatasetCount);
        }
        return okDataset;
    }

    @AllArgsConstructor
    static class EventParams {
        final String clickstreamEventName;
        final String gtmId;
        final String gtmVersion;
        final String eventId;
        final String uc;
    }

    @AllArgsConstructor
    static class SessionParams {
        final  Long requestStartTimeMs;
        final  String sessionId;
        final Long sessionNumber;
    }

    private static class EventInfo {
        public final String userId;
        public final String eventName;
        public final String ip;
        public final String clientId;
        public final String ua;
        public final String language;
        public final String pageReferrer;

        EventInfo(final String userId,
                  final String eventName,
                  final String ip,
                  final String clientId,
                  final String ua,
                  final String language,
                  final String pageReferrer) {
            this.userId = userId;
            this.eventName = eventName;
            this.ip = ip;
            this.clientId = clientId;
            this.ua = ua;
            this.language = language;
            this.pageReferrer = pageReferrer;
        }
    }

    private static class ClientHint {
        public final Boolean isClientMobile;
        public final String clientModel;
        public final String clientPlatform;
        public final String clientPlatformVersion;
        public final String clientBrand;

        ClientHint(final Boolean isClientMobile, final String clientModel, final String clientPlatform, final String clientPlatformVersion,
                   final String clientBrand) {
            this.isClientMobile = isClientMobile;
            this.clientModel = clientModel;
            this.clientPlatform = clientPlatform;
            this.clientPlatformVersion = clientPlatformVersion;
            this.clientBrand = clientBrand;
        }
    }

    private static class ScreenResolution {
        public final Long screenWidth;
        public final Long screenHeight;

        ScreenResolution(final Long screenWidth, final Long screenHeight) {
            this.screenWidth = screenWidth;
            this.screenHeight = screenHeight;
        }
    }

    private static class RowResult {
        public final EventInfo eventInfo;
        public final ScreenResolution screenResolution;
        public final Map<String, JsonNode> attrMap;
        public final List<GenericRow> items;
        public final List<GenericRow> eventItems;
        public final GenericRow user;

        public final ClientHint clientHint;

        RowResult(final EventInfo eventInfo,
                  final ScreenResolution screenResolution,
                  final ClientHint clientHint,
                  final Map<String, JsonNode> attrMap,
                  final List<GenericRow> items,
                  final List<GenericRow> eventItems,
                  final GenericRow user) {
            this.eventInfo = eventInfo;
            this.screenResolution = screenResolution;
            this.clientHint = clientHint;
            this.attrMap = attrMap;
            this.items = items;
            this.eventItems = eventItems;
            this.user = user;
        }
    }
}
