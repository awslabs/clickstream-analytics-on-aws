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

package software.aws.solution.test.gtm;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.JsonNodeFactory;
import lombok.AllArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.spark.sql.Dataset;
import org.apache.spark.sql.Row;
import org.apache.spark.sql.SaveMode;
import org.apache.spark.sql.api.java.UDF2;
import org.apache.spark.sql.catalyst.expressions.GenericRow;
import org.apache.spark.sql.expressions.UserDefinedFunction;
import org.apache.spark.sql.types.ArrayType;
import org.apache.spark.sql.types.DataTypes;
import org.apache.spark.sql.types.StructField;
import org.apache.spark.sql.types.StructType;
import software.aws.solution.test.util.ETLMetric;
import software.aws.solution.test.transformer.KvConverter;
import software.aws.solution.test.exception.ExecuteTransformerException;
import software.aws.solution.test.transformer.MaxLengthTransformer;
import software.aws.solution.test.util.ContextUtil;
import software.aws.solution.test.util.DatasetUtil;

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
import static software.aws.solution.test.ETLRunner.DEBUG_LOCAL_PATH;
import static software.aws.solution.clickstream.common.Util.deCodeUri;

@Slf4j
public class ServerDataConverter {
    protected static final Map<String, String> PROPS_NAME_MAP = createPropNameMap();
    protected static final Map<String, String> EVENT_NAME_MAP = createEventNameMap();

    private static UDF2<String, Long, Row[]> convertGTMServerData() {
        return (String value, Long ingestTimestamp) -> {
            try {
                return getGenericRows(value, ingestTimestamp);
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

    private static Row[] getGenericRows(final String jsonString, final Long ingestTimestamp) throws JsonProcessingException {
        List<Row> rows = new ArrayList<>();

        ObjectMapper objectMapper = new ObjectMapper();
        JsonNode jsonNode = objectMapper.readTree(jsonString);
        int index = 0;
        if (jsonNode.isArray()) {
            for (Iterator<JsonNode> elementsIt = jsonNode.elements(); elementsIt.hasNext(); ) {
                rows.addAll(getGenericRow(elementsIt.next(), index, ingestTimestamp));
                index++;
            }
        } else {
            rows.addAll(getGenericRow(jsonNode, index, ingestTimestamp));
        }
        return rows.toArray(new Row[0]);

    }

    private static List<GenericRow> getGenericRow(final JsonNode jsonNode, final int index, final Long ingestTimestamp) {

        RowResult result = parseJsonNode(jsonNode);

        String clientId = result.eventInfo.clientId;
        if (result.attrMap.containsKey(DatasetUtil.X_GA_JS_CLIENT_ID)) {
            clientId = result.attrMap.get(DatasetUtil.X_GA_JS_CLIENT_ID).asText();
        }
        if (clientId == null) {
            throw new ExecuteTransformerException("client_id is empty");
        }

        String sessionId;
        if (result.attrMap.containsKey(DatasetUtil.SESSION_ID)) {
            sessionId = result.attrMap.get(DatasetUtil.SESSION_ID).asText();
        } else {
            sessionId = String.valueOf(new Date().getTime());
        }
        String sessionNum = "0";
        if (result.attrMap.containsKey(DatasetUtil.GA_SESSION_NUMBER)) {
            sessionNum = result.attrMap.get(DatasetUtil.GA_SESSION_NUMBER).asText();
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

        result.attrMap.put(DatasetUtil.SESSION_DURATION, JsonNodeFactory.instance.numberNode(0));

        eventId = checkStringValue(eventId, DatasetUtil.MAX_STRING_VALUE_LEN - 32);
        String gtmId = result.attrMap.get("x-ga-measurement_id").asText();
        String gtmVersion = result.attrMap.get("x-ga-gtm_version").asText();

        Long requestStartTimeMs = ingestTimestamp;
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
            result.attrMap.put(DatasetUtil.SESSION_START_TIMESTAMP, JsonNodeFactory.instance.numberNode(requestStartTimeMs));
        }

        if (result.attrMap.containsKey(DatasetUtil.PAGE_URL)) {
            String url = deCodeUri(result.attrMap.get(DatasetUtil.PAGE_URL).asText());
            result.attrMap.put(DatasetUtil.PAGE_URL, JsonNodeFactory.instance.textNode(url));
        }

        List<GenericRow> eventParams = new ArrayList<>();
        for (Map.Entry<String, JsonNode> e : result.attrMap.entrySet()) {
            KvConverter.ValueTypeResult valueTypeResult = KvConverter.getValueTypeResult(e.getKey(), e.getValue());
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
                    new EventParams(DatasetUtil.EVENT_FIRST_OPEN, gtmId, gtmVersion, eventId2, uc),
                    result,
                    eventParams,
                    new SessionParams(requestStartTimeMs, sessionId, sessionNumber)
            );
            eventList.add(firstVisitEvent);
        }

        if (seesionStart) {
            String eventId3 = String.format("%s-%s", eventId, ++eventIndex);
            GenericRow sessionStartEvent = createGenericRowFromResult(
                    new EventParams(DatasetUtil.EVENT_SESSION_START, gtmId, gtmVersion, eventId3, uc),
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

    public static ServerDataConverter.RowResult parseJsonNode(final JsonNode jsonNode) {
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

                case DatasetUtil.CLIENT_ID: {
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

                case DatasetUtil.USER_ID: {
                    userId = attrValue.asText();
                    break;
                }

                case DatasetUtil.GTM_PAGE_REFERRER: {
                    pageReferrer = attrValue.asText();
                    pageReferrer = checkStringValue(deCodeUri(pageReferrer));
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

        if (attrValue.hasNonNull(DatasetUtil.MOBILE)) {
            isClientMobile = attrValue.get(DatasetUtil.MOBILE).asBoolean(false);
        }
        if (attrValue.hasNonNull(DatasetUtil.MODEL)) {
            clientModel = attrValue.get(DatasetUtil.MODEL).asText();
        }
        if (attrValue.hasNonNull(DatasetUtil.PLATFORM)) {
            clientPlatform = attrValue.get(DatasetUtil.PLATFORM).asText();
            clientPlatform = checkStringValue(clientPlatform);
        }
        if (attrValue.hasNonNull(DatasetUtil.PLATFORM_VERSION)) {
            clientPlatformVersion = attrValue.get(DatasetUtil.PLATFORM_VERSION).asText();
        }
        if (attrValue.hasNonNull(DatasetUtil.GTM_BRANDS)) {
            JsonNode brandsArr = attrValue.get(DatasetUtil.GTM_BRANDS);
            if (brandsArr.isArray()) {
                for (Iterator<JsonNode> els = brandsArr.elements(); els.hasNext(); ) {
                    JsonNode brandObj = els.next();
                    if (brandObj.hasNonNull(DatasetUtil.GTM_BRAND)) {
                        brands.add(brandObj.get(DatasetUtil.GTM_BRAND).asText());
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

    public static String mapEventNameToClickstream(final String eventName) {
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

    public static Map<String, String> createEventNameMap() {
        Map<String, String> eventNameMap = new HashMap<>();
        eventNameMap.put("page_view", DatasetUtil.EVENT_PAGE_VIEW);
        eventNameMap.put("login", DatasetUtil.EVENT_PROFILE_SET);
        eventNameMap.put("user_engagement", DatasetUtil.EVENT_USER_ENGAGEMENT);
        eventNameMap.put("click", "_click");
        return eventNameMap;
    }

    private static Map<String, String> createPropNameMap() {
        Map<String, String> propsNameMap = new HashMap<>();
        propsNameMap.put(DatasetUtil.GA_SESSION_ID, DatasetUtil.SESSION_ID);
        propsNameMap.put(DatasetUtil.GA_SESSION_NUMBER, DatasetUtil.SESSION_NUMBER);
        propsNameMap.put(DatasetUtil.GTM_PAGE_TITLE, DatasetUtil.PAGE_TITLE);
        propsNameMap.put(DatasetUtil.GTM_PAGE_LOCATION, DatasetUtil.PAGE_URL);
        propsNameMap.put(DatasetUtil.GTM_PAGE_REFERRER, DatasetUtil.PROP_PAGE_REFERRER); // _page_referrer
        propsNameMap.put(DatasetUtil.GA_ENGAGEMENT_TIME_MSEC, DatasetUtil.ENGAGEMENT_TIME_MSEC);
        return propsNameMap;
    }

    private static GenericRow extractUser(final JsonNode userItem) {
        String userId = null;
        if (userItem.hasNonNull("_user_id")) {
            userId = userItem.get("_user_id").asText();
        } else if (userItem.hasNonNull(DatasetUtil.USER_ID)) {
            userId = userItem.get(DatasetUtil.USER_ID).asText();
        }
        userId = checkStringValue(userId);
        List<GenericRow> userPropertiesList = new ArrayList<>();

        for (Iterator<String> attrNameIt = userItem.fieldNames(); attrNameIt.hasNext(); ) {
            String key = attrNameIt.next();
            JsonNode val = userItem.get(key);
            KvConverter.ValueTypeResult valueTypeResult = KvConverter.getValueTypeResult(key, val);

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

            if (item.hasNonNull(DatasetUtil.ITEM_ID)) {
                itemId = checkStringValue(item.get(DatasetUtil.ITEM_ID).asText());
            }

            List<GenericRow> propertiesList = new ArrayList<>();
            for (Iterator<String> attrNameIt = item.fieldNames(); attrNameIt.hasNext(); ) {

                String key = attrNameIt.next();
                JsonNode val = item.get(key);

                if (DatasetUtil.ITEM_ID.equals(key)) {
                    continue;
                }

                KvConverter.ValueTypeResult valueTypeResult = KvConverter.getValueTypeResult(key, val);

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

            if (item.hasNonNull(DatasetUtil.ITEM_ID)) {
                id = checkStringValue(item.get(DatasetUtil.ITEM_ID).asText());
            }
            if (item.hasNonNull(DatasetUtil.PRICE)) {
                price = item.get(DatasetUtil.PRICE).asDouble(0);
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
        return  MaxLengthTransformer.checkStringValueLength(sValue, DatasetUtil.MAX_STRING_VALUE_LEN);
    }

    private static String checkStringValue(final String sValue, final int len) {
        return  MaxLengthTransformer.checkStringValueLength(sValue, len);
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
        String jobName = System.getProperty(ContextUtil.JOB_NAME_PROP);
        String s3FilePath = System.getProperty(ContextUtil.WAREHOUSE_DIR_PROP) + "/etl_gtm_corrupted_json_data";
        log.info("save corruptedDataset to " + s3FilePath);
        corruptDataset
                .withColumn(DatasetUtil.JOB_NAME_COL, lit(jobName))
                .write()
                .partitionBy(DatasetUtil.JOB_NAME_COL)
                .option("compression", "gzip")
                .mode(SaveMode.Append)
                .json(s3FilePath);
    }

    public Dataset<Row> transform(final Dataset<Row> dataset) {

        StructType valueType = DataTypes.createStructType(
                new StructField[]{
                        DataTypes.createStructField(DatasetUtil.DOUBLE_VALUE, DataTypes.DoubleType, true),
                        DataTypes.createStructField(DatasetUtil.FLOAT_VALUE, DataTypes.FloatType, true),
                        DataTypes.createStructField(DatasetUtil.INT_VALUE, DataTypes.LongType, true),
                        DataTypes.createStructField(DatasetUtil.STRING_VALUE, DataTypes.StringType, true)});

        StructType userValueType = DataTypes.createStructType(
                new StructField[]{
                        DataTypes.createStructField(DatasetUtil.DOUBLE_VALUE, DataTypes.DoubleType, true),
                        DataTypes.createStructField(DatasetUtil.FLOAT_VALUE, DataTypes.FloatType, true),
                        DataTypes.createStructField(DatasetUtil.INT_VALUE, DataTypes.LongType, true),
                        DataTypes.createStructField(DatasetUtil.STRING_VALUE, DataTypes.StringType, true),
                        DataTypes.createStructField("set_timestamp_micros", DataTypes.LongType, true)
                });

        ArrayType keyValueType = DataTypes.createArrayType(DataTypes.createStructType(
                new StructField[]{
                        DataTypes.createStructField(DatasetUtil.KEY, DataTypes.StringType, true),
                        DataTypes.createStructField(DatasetUtil.VALUE, valueType, true)}));

        ArrayType userKeyValueType = DataTypes.createArrayType(DataTypes.createStructType(
                new StructField[]{
                        DataTypes.createStructField(DatasetUtil.KEY, DataTypes.StringType, true),
                        DataTypes.createStructField(DatasetUtil.VALUE, userValueType, true)}));

        StructType userType = DataTypes.createStructType(new StructField[]{
                DataTypes.createStructField(DatasetUtil.USER_ID, DataTypes.StringType, true),
                DataTypes.createStructField(DatasetUtil.USER_PROPERTIES, userKeyValueType, true),
        });


        StructType itemType = DataTypes.createStructType(new StructField[]{
                DataTypes.createStructField(DatasetUtil.ID, DataTypes.StringType, true),
                DataTypes.createStructField(DatasetUtil.PROPERTIES, keyValueType, true)
        });


        StructType eventItemType = DataTypes.createStructType(new StructField[]{
                DataTypes.createStructField(DatasetUtil.ID, DataTypes.StringType, true),
                DataTypes.createStructField("quantity", DataTypes.LongType, true),
                DataTypes.createStructField(DatasetUtil.PRICE, DataTypes.DoubleType, true),
                DataTypes.createStructField("currency", DataTypes.StringType, true),
                DataTypes.createStructField("creative_name", DataTypes.StringType, true),
                DataTypes.createStructField("creative_slot", DataTypes.StringType, true)
        });

        ArrayType itemsType = DataTypes.createArrayType(itemType);
        ArrayType eventItemsType = DataTypes.createArrayType(eventItemType);

        StructType dataItemType = DataTypes.createStructType(new StructField[]{
                DataTypes.createStructField(DatasetUtil.CORRUPT_RECORD, DataTypes.StringType, true),
                DataTypes.createStructField(DatasetUtil.GTM_ID, DataTypes.StringType, true),
                DataTypes.createStructField(DatasetUtil.GTM_VERSION, DataTypes.StringType, true),
                DataTypes.createStructField(DatasetUtil.EVENT_ID, DataTypes.StringType, true),
                DataTypes.createStructField(DatasetUtil.USER_ID, DataTypes.StringType, true),
                DataTypes.createStructField(DatasetUtil.EVENT_NAME, DataTypes.StringType, true),
                DataTypes.createStructField(DatasetUtil.IP, DataTypes.StringType, true),
                DataTypes.createStructField(DatasetUtil.CLIENT_ID, DataTypes.StringType, true),
                DataTypes.createStructField(DatasetUtil.UA, DataTypes.StringType, true),
                DataTypes.createStructField(DatasetUtil.GTM_LANGUAGE, DataTypes.StringType, true),
                DataTypes.createStructField(DatasetUtil.GTM_SCREEN_WIDTH, DataTypes.LongType, true),
                DataTypes.createStructField(DatasetUtil.GTM_SCREEN_HEIGHT, DataTypes.LongType, true),
                DataTypes.createStructField(DatasetUtil.PAGE_REFERRER, DataTypes.StringType, true),
                DataTypes.createStructField("isClientMobile", DataTypes.BooleanType, true),
                DataTypes.createStructField("clientModel", DataTypes.StringType, true),
                DataTypes.createStructField(DatasetUtil.GTM_CLIENT_PLATFORM, DataTypes.StringType, true),
                DataTypes.createStructField(DatasetUtil.GTM_CLIENT_PLATFORM_VERSION, DataTypes.StringType, true),
                DataTypes.createStructField(DatasetUtil.GTM_CLIENT_BRAND, DataTypes.StringType, true),
                DataTypes.createStructField(DatasetUtil.EVENT_PARAMS, keyValueType, true),
                DataTypes.createStructField(DatasetUtil.ITEMS, itemsType, true),
                DataTypes.createStructField(DatasetUtil.EVENT_ITEMS, eventItemsType, true),
                DataTypes.createStructField(DatasetUtil.USER, userType, true),
                DataTypes.createStructField(DatasetUtil.GTM_REQUEST_START_TIME_MS, DataTypes.LongType, true),
                DataTypes.createStructField(DatasetUtil.GTM_UC, DataTypes.StringType, true),
                DataTypes.createStructField(DatasetUtil.GTM_SESSION_ID, DataTypes.StringType, true),
                DataTypes.createStructField(DatasetUtil.GTM_SESSION_NUM, DataTypes.LongType, true),
        });

        ArrayType dataItemArrayType = DataTypes.createArrayType(dataItemType);

        UserDefinedFunction convertStringToKeyValueUdf = udf(convertGTMServerData(), dataItemArrayType);
        Dataset<Row> convertedKeyValueDataset = dataset.withColumn(DatasetUtil.DATA_OUT, explode(convertStringToKeyValueUdf.apply(col(DatasetUtil.DATA), col("ingest_time"))))
                .drop(DatasetUtil.DATA);

        boolean debugLocal = Boolean.parseBoolean(System.getProperty(ContextUtil.DEBUG_LOCAL_PROP));
        if (debugLocal) {
            convertedKeyValueDataset.write().mode(SaveMode.Overwrite).json(DEBUG_LOCAL_PATH + "/ServerDataConverter/");
        }
        Dataset<Row> okDataset = convertedKeyValueDataset.filter(col(DatasetUtil.DATA_OUT).getField(DatasetUtil.CORRUPT_RECORD).isNull());
        Dataset<Row> corruptDataset = convertedKeyValueDataset.filter(col(DatasetUtil.DATA_OUT).getField(DatasetUtil.CORRUPT_RECORD).isNotNull());
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
