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

import com.fasterxml.jackson.core.*;
import com.fasterxml.jackson.databind.*;
import lombok.*;
import lombok.extern.slf4j.*;
import org.apache.spark.sql.*;
import org.apache.spark.sql.api.java.*;
import org.apache.spark.sql.catalyst.expressions.*;
import org.apache.spark.sql.expressions.*;
import org.apache.spark.sql.types.*;
import software.aws.solution.clickstream.*;
import software.aws.solution.clickstream.gtm.event.*;
import software.aws.solution.clickstream.model.*;

import java.net.*;
import java.sql.*;
import java.time.*;
import java.util.*;

import static org.apache.spark.sql.functions.*;
import static software.aws.solution.clickstream.ContextUtil.*;
import static software.aws.solution.clickstream.DatasetUtil.*;
import static software.aws.solution.clickstream.ETLRunner.*;
import static software.aws.solution.clickstream.gtm.GTMServerDataTransformerV2.INPUT_FILE_NAME;
import static software.aws.solution.clickstream.gtm.ServerDataConverter.createEventNameMap;
import static software.aws.solution.clickstream.gtm.Utils.convertStringObjectMapToStringJsonMap;
import static software.aws.solution.clickstream.gtm.Utils.getStackTrace;
import static software.aws.solution.clickstream.gtm.Utils.objectToJsonString;
import static software.aws.solution.clickstream.model.ModelV2.EVENT_TYPE;
import static software.aws.solution.clickstream.model.ModelV2.ITEM_TYPE;
import static software.aws.solution.clickstream.model.ModelV2.USER_TYPE;


@Slf4j
public class ServerDataConverterV2 {

    private static final Map<String, String> EVENT_NAME_MAP = createEventNameMap();

    private static UDF6<String, Long, String, String, String, String, List<GenericRow>> convertGTMServerData() {
        return (String value, Long ingestTimestamp,
                String rid, String appId,
                String projectId, String inputFileName) -> {
            try {
                return getGenericRow(value, new ExtraParams(ingestTimestamp, rid, appId, projectId, inputFileName));
            } catch (Exception e) {
                log.error("cannot convert data: " + value + ", error: " + e.getMessage());
                log.error(getStackTrace(e));
                return getCorruptGenericRows(value, e);
            }
        };
    }

    private static List<GenericRow> getCorruptGenericRows(final String value, final Exception e) {

        return Arrays.asList(new GenericRow(new Object[]{
                "data:" + value + ", error:" + e.getMessage() + ", stackTrace:" + getStackTrace(e),
                null,
                null,
                null,
        }));
    }

    private static List<GenericRow> getGenericRow(final String jsonString, final ExtraParams extraParams) throws JsonProcessingException {
        List<GenericRow> rows = new ArrayList<>();

        ObjectMapper objectMapper = new ObjectMapper();
        JsonNode jsonNode = objectMapper.readTree(jsonString);
        int index = 0;
        if (jsonNode.isArray()) {
            for (Iterator<JsonNode> elementsIt = jsonNode.elements(); elementsIt.hasNext(); ) {
                rows.add(getGenericRow(elementsIt.next(), index, extraParams));
                index++;
            }
        } else {
            rows.add(getGenericRow(jsonNode, index, extraParams));
        }
        return rows;

    }

    private static GenericRow getGenericRow(final JsonNode jsonNode, final int index, final ExtraParams extraParams) throws JsonProcessingException {
        GTMEvent gtmEvent = EventParser.getInstance().parse(jsonNode.toString());

        ClickstreamEvent clickstreamEvent = getClickstreamEvent(gtmEvent, index, extraParams);
        List<ClickstreamEvent> clickstreamEventList = new ArrayList<>();
        clickstreamEventList.add(clickstreamEvent);

        String eventId = clickstreamEvent.getEventId();

        boolean isFirstVisit = false;
        if (gtmEvent.getXGaSystemProperties() != null) {
            String fv = gtmEvent.getXGaSystemProperties().getFv();
            isFirstVisit = fv != null && !"0".equals(fv) && !"false".equalsIgnoreCase(fv);
        }
        log.info("isFirstVisit: " + isFirstVisit);

        boolean isSessionStart = false;
        if (gtmEvent.getXGaSystemProperties() != null) {
            isSessionStart = "1".equals(gtmEvent.getXGaSystemProperties().getSs());
        }
        log.info("isSessionStart: " + isSessionStart);

        if (isFirstVisit) {
            ClickstreamEvent firstVisitEvent = ClickstreamEvent.deepCopy(clickstreamEvent);
            firstVisitEvent.setEventName("_first_open");
            firstVisitEvent.setEventId(eventId + "-first-open");
            clickstreamEventList.add(firstVisitEvent);
        }

        if (isSessionStart) {
            ClickstreamEvent sessionStartEvent = ClickstreamEvent.deepCopy(clickstreamEvent);
            sessionStartEvent.setEventName("_session_start");
            sessionStartEvent.setEventId(eventId + "-session-start");
            clickstreamEventList.add(sessionStartEvent);
        }
        List<GenericRow> eventRows = new ArrayList<>();
        for (ClickstreamEvent event : clickstreamEventList) {
            eventRows.add(event.toGenericRow());
        }

        // User
        ClickstreamUser clickstreamUser = getClickstreamUser(gtmEvent, clickstreamEvent);

        // Items
        List<ClickstreamItem> clickstreamItemList = getClickstreamItemList(gtmEvent, clickstreamEvent);
        List<GenericRow> itemRows = new ArrayList<>();
        for (ClickstreamItem item : clickstreamItemList) {
            itemRows.add(item.toGenericRow());
        }

        return new GenericRow(new Object[]{null, eventRows, clickstreamUser.toGenericRow(), itemRows});
    }


    public static ClickstreamEvent getClickstreamEvent(final GTMEvent gtmEvent, final int index, final ExtraParams extraParams) throws JsonProcessingException {

        ClickstreamEvent clickstreamEvent = new ClickstreamEvent();

        clickstreamEvent.setEventTimestamp(new Timestamp(extraParams.ingestTimestamp));

        String eventId = String.format("%s-%s-%s-%s",
                extraParams.rid,
                index,
                gtmEvent.getGaSessionId(),
                gtmEvent.getGaSessionNumber() == null? "x" : gtmEvent.getGaSessionNumber());

        clickstreamEvent.setEventId(eventId);
        clickstreamEvent.setEventTimeMsec(clickstreamEvent.getEventTimestamp().getTime());
        String eventName = mapEventName(gtmEvent);
        clickstreamEvent.setEventName(eventName);
        clickstreamEvent.setEventValue(gtmEvent.getValue());
        clickstreamEvent.setEventValueCurrency(gtmEvent.getCurrency());
        clickstreamEvent.setIngestTimeMsec(extraParams.ingestTimestamp);

        setDeviceInfo(gtmEvent, clickstreamEvent);

        setGeoInfo(gtmEvent, clickstreamEvent);

        clickstreamEvent.setAppId(extraParams.appId);

        String platform = "Web";
        if (gtmEvent.getClientHints() != null) {
            platform = gtmEvent.getClientHints().isMobile() ? "Mobile" : "Web";
        }
        clickstreamEvent.setPlatform(platform);

        clickstreamEvent.setProjectId(extraParams.projectId);

        clickstreamEvent.setPageReferrer(deCodeUri(gtmEvent.getPageReferrer()));
        clickstreamEvent.setPageTitle(deCodeUri(gtmEvent.getPageTitle()));
        clickstreamEvent.setPageUrl(deCodeUri(gtmEvent.getPageLocation()));

        clickstreamEvent.setUserEngagementTimeMsec(gtmEvent.getEngagementTimeMsec());
        clickstreamEvent.setUserId(gtmEvent.getUserId());
        clickstreamEvent.setUserPseudoId(gtmEvent.getClientId());
        clickstreamEvent.setSessionId(gtmEvent.getGaSessionId());
        if (gtmEvent.getXSstSystemProperties() != null) {
            clickstreamEvent.setSessionStartTimeMsec(gtmEvent.getXSstSystemProperties().getRequestStartTimeMs());
        }

        clickstreamEvent.setSessionNumber(gtmEvent.getGaSessionNumber());
        clickstreamEvent.setIp(gtmEvent.getIpOverride());
        clickstreamEvent.setUa(gtmEvent.getUserAgent());

        // set traffic source
        setTrafficSource(clickstreamEvent);

        // customParameters
        Map<String, String> customParameters = getEventCustomParameters(gtmEvent, clickstreamEvent);
        clickstreamEvent.setCustomParameters(customParameters);
        clickstreamEvent.setCustomParametersJsonStr(objectToJsonString(clickstreamEvent.getCustomParameters()));

        Map<String, String> processInfo = new HashMap<>();
        processInfo.put("rid", extraParams.rid);
        processInfo.put("ingest_time", Instant.ofEpochMilli(extraParams.ingestTimestamp).toString());
        processInfo.put(INPUT_FILE_NAME, extraParams.inputFileName);
        clickstreamEvent.setProcessInfo(processInfo);

        return clickstreamEvent;
    }

    private static void setDeviceInfo(final GTMEvent gtmEvent, final ClickstreamEvent clickstreamEvent) {
        if (gtmEvent.getClientHints() != null && gtmEvent.getClientHints().getBrands() != null && !gtmEvent.getClientHints().getBrands().isEmpty()) {
            clickstreamEvent.setDeviceMobileBrandName(gtmEvent.getClientHints().getBrands().get(0).getBrand());
            clickstreamEvent.setDeviceMobileModelName(gtmEvent.getClientHints().getModel());
        }

        if (gtmEvent.getClientHints() != null) {
            clickstreamEvent.setDeviceOperatingSystem(gtmEvent.getClientHints().getPlatform());
            clickstreamEvent.setDeviceOperatingSystemVersion(gtmEvent.getClientHints().getPlatformVersion());
        }

        clickstreamEvent.setDeviceSystemLanguage(gtmEvent.getLanguage());

        if (gtmEvent.getClientHints() != null && gtmEvent.getClientHints().getFullVersionList() != null && !gtmEvent.getClientHints().getFullVersionList().isEmpty()) {

            int size = gtmEvent.getClientHints().getFullVersionList().size();
            clickstreamEvent.setDeviceUaBrowser(gtmEvent.getClientHints().getFullVersionList().get(size - 1).getBrand());
            clickstreamEvent.setDeviceUaBrowserVersion(gtmEvent.getClientHints().getFullVersionList().get(size - 1).getVersion());
        }

        String screenResolution = gtmEvent.getScreenResolution(); // "1024x768"
        if (screenResolution != null) {
            String[] parts = screenResolution.split("x");
            if (parts.length == 2) {
                clickstreamEvent.setDeviceScreenWidth(Integer.parseInt(parts[0]));
                clickstreamEvent.setDeviceScreenHeight(Integer.parseInt(parts[1]));
            }
        }
    }

    private static void setGeoInfo(final GTMEvent gtmEvent, final ClickstreamEvent clickstreamEvent) {
        if (gtmEvent.getEventLocation() != null) {
            clickstreamEvent.setGeoCountry(gtmEvent.getEventLocation().getCountry());
            clickstreamEvent.setGeoRegion(gtmEvent.getEventLocation().getRegion());
        } else if (gtmEvent.getXSstSystemProperties() != null) {
            clickstreamEvent.setGeoCountry(gtmEvent.getXSstSystemProperties().getUc());
        }

        if (clickstreamEvent.getGeoRegion() == null) {
            clickstreamEvent.setGeoRegion(gtmEvent.getXGaUr());
        }
    }

    private static void setTrafficSource(final ClickstreamEvent clickstreamEvent) {
        TrafficSourceParser trafficSourceParser = new TrafficSourceParser();
        TrafficSourceParser.ParserResult parserResult = null;
        try {
            if (clickstreamEvent.getPageUrl() != null) {
                parserResult = trafficSourceParser.parse(clickstreamEvent.getPageUrl(), clickstreamEvent.getPageReferrer());
            } else if (clickstreamEvent.getLatestReferrer() != null) {
                parserResult = trafficSourceParser.parse(clickstreamEvent.getLatestReferrer(), null);
            }
        } catch (Exception e) {
            log.error("cannot parse traffic source: " + clickstreamEvent.getPageUrl() + ", error: " + e.getMessage());
            log.error(getStackTrace(e));
            return;
        }

        if (parserResult != null) {
            TrafficSource trafficSource = parserResult.getTrafficSource();
            clickstreamEvent.setTrafficSourceCampaign(trafficSource.getCampaign());
            clickstreamEvent.setTrafficSourceContent(trafficSource.getContent());
            clickstreamEvent.setTrafficSourceMedium(trafficSource.getMedium());
            clickstreamEvent.setTrafficSourceSource(trafficSource.getSource());
            clickstreamEvent.setTrafficSourceTerm(trafficSource.getTerm());
            clickstreamEvent.setTrafficSourceClid(trafficSource.getClid());
            clickstreamEvent.setTrafficSourceClidPlatform(trafficSource.getClidPlatform());
            clickstreamEvent.setTrafficSourceCampaignId(trafficSource.getCampaignId());
            clickstreamEvent.setTrafficSourceChannelGroup(trafficSource.getChannelGroup());
            clickstreamEvent.setTrafficSourceCategory(trafficSource.getCategory());

            UriInfo uriInfo = parserResult.getUriInfo();
            clickstreamEvent.setHostname(uriInfo.getHost());
            clickstreamEvent.setPageUrlPath(uriInfo.getPath());
            clickstreamEvent.setPageUrlQueryParameters(uriInfo.getParameters());

        }
    }

    private static Map<String, String> getEventCustomParameters(final GTMEvent gtmEvent, final ClickstreamEvent clickstreamEvent) throws JsonProcessingException {
        Map<String, String> customParameters = new HashMap<>();
        if (gtmEvent.getUnknownProperties() != null) {
            customParameters = convertStringObjectMapToStringJsonMap(gtmEvent.getUnknownProperties());
            clickstreamEvent.setCustomParameters(customParameters);
        }
        customParameters.put("client_id", gtmEvent.getClientId());
        customParameters.put("ip_override", gtmEvent.getIpOverride());
        customParameters.put("screen_resolution", gtmEvent.getScreenResolution());
        customParameters.put("user_agent", gtmEvent.getUserAgent());

        if (gtmEvent.getXGaUr() != null) {
            customParameters.put("x-ga-ur", gtmEvent.getXGaUr());
        }
        if (gtmEvent.getClientHints() != null) {
            customParameters.put("client_hints", objectToJsonString(gtmEvent.getClientHints()));
        }
        if (gtmEvent.getEventLocation() != null) {
            customParameters.put("event_location", objectToJsonString(gtmEvent.getEventLocation()));
        }
        if (gtmEvent.getXGaSystemProperties() != null) {
            customParameters.put("x-ga-system_properties", objectToJsonString(gtmEvent.getXGaSystemProperties()));
        }
        if (gtmEvent.getXSstSystemProperties() != null) {
            customParameters.put("x-sst-system_properties", objectToJsonString(gtmEvent.getXSstSystemProperties()));
        }
        if (gtmEvent.getXGaMp2UserProperties() != null){
            customParameters.put("x-ga-mp2-user_properties", objectToJsonString(gtmEvent.getXGaMp2UserProperties()));
        }
        return customParameters;
    }

    private static String mapEventName(final GTMEvent gtmEvent) {
        return EVENT_NAME_MAP.getOrDefault(gtmEvent.getEventName(), gtmEvent.getEventName());
    }

    public static ClickstreamUser getClickstreamUser(final GTMEvent gtmEvent, final ClickstreamEvent clickstreamEvent) throws JsonProcessingException {
        ClickstreamUser clickstreamUser = new ClickstreamUser();
        clickstreamUser.setAppId(clickstreamEvent.getAppId());
        clickstreamUser.setEventTimestamp(clickstreamEvent.getEventTimestamp());
        clickstreamUser.setUserId(gtmEvent.getUserId());
        clickstreamUser.setUserPseudoId(clickstreamEvent.getUserPseudoId());

        if (gtmEvent.getXSstSystemProperties() != null
                && gtmEvent.getXSstSystemProperties().getRequestStartTimeMs() != null
                && gtmEvent.getXSstSystemProperties().getRequestStartTimeMs() > 0) {
            clickstreamUser.setFirstTouchTimeMsec(gtmEvent.getXSstSystemProperties().getRequestStartTimeMs());
        }

        if (clickstreamUser.getFirstTouchTimeMsec() == null) {
            clickstreamUser.setFirstTouchTimeMsec(clickstreamEvent.getEventTimestamp().getTime());
        }

        clickstreamUser.setFirstVisitDate(new java.sql.Date(clickstreamUser.getFirstTouchTimeMsec()));

        String pageReferrer = clickstreamEvent.getPageReferrer();
        String lateReferrer = clickstreamEvent.getLatestReferrer();
        if (pageReferrer != null) {
            clickstreamUser.setFirstReferrer(pageReferrer);
        } else if (lateReferrer != null) {
            clickstreamUser.setFirstReferrer(lateReferrer);
        }

        clickstreamUser.setFirstTrafficSource(clickstreamEvent.getTrafficSourceSource());
        clickstreamUser.setFirstTrafficMedium(clickstreamEvent.getTrafficSourceMedium());
        clickstreamUser.setFirstTrafficCampaign(clickstreamEvent.getTrafficSourceCampaign());
        clickstreamUser.setFirstTrafficContent(clickstreamEvent.getTrafficSourceContent());
        clickstreamUser.setFirstTrafficTerm(clickstreamEvent.getTrafficSourceTerm());
        clickstreamUser.setFirstTrafficCampaignId(clickstreamEvent.getTrafficSourceCampaignId());
        clickstreamUser.setFirstTrafficClidPlatform(clickstreamEvent.getTrafficSourceClidPlatform());
        clickstreamUser.setFirstTrafficClid(clickstreamEvent.getTrafficSourceClid());
        clickstreamUser.setFirstTrafficChannelGroup(clickstreamEvent.getTrafficSourceChannelGroup());
        clickstreamUser.setFirstTrafficCategory(clickstreamEvent.getTrafficSourceCategory());
        clickstreamUser.setFirstAppInstallSource(clickstreamEvent.getAppInstallSource());


        UserProperties gtmUser = gtmEvent.getXGaMp2UserProperties();

        if (gtmUser != null) {
            String userId = gtmUser.getUserId();
            String userName = gtmUser.getUsername();
            String userEmail = gtmUser.getEmail();
            String userFirstName = gtmUser.getFirstName();
            String userLastName = gtmUser.getLastName();
            String gender = gtmUser.getGender();
            int age = gtmUser.getAge();
            String persona = gtmUser.getPersona();

            Map<String, ClickstreamUser.UserPropValue> csUserProps = new HashMap<>();
            csUserProps.put("user_id", new ClickstreamUser.UserPropValue(userId, null));
            csUserProps.put("username", new ClickstreamUser.UserPropValue(userName, null));
            csUserProps.put("email", new ClickstreamUser.UserPropValue(userEmail, null));
            csUserProps.put("firstName", new ClickstreamUser.UserPropValue(userFirstName, null));
            csUserProps.put("lastName", new ClickstreamUser.UserPropValue(userLastName, null));
            csUserProps.put("gender", new ClickstreamUser.UserPropValue(gender, null));
            csUserProps.put("age", new ClickstreamUser.UserPropValue(age + "", null));
            csUserProps.put("persona", new ClickstreamUser.UserPropValue(persona, null));

            Map<String, Object> extraUserProps = gtmUser.getUnknownProperties();
            if (extraUserProps != null) {
                Map<String, String> extraUserPropsJsonMap = convertStringObjectMapToStringJsonMap(extraUserProps);
                for (Map.Entry<String, String> entry : extraUserPropsJsonMap.entrySet()) {
                    csUserProps.put(entry.getKey(), new ClickstreamUser.UserPropValue(entry.getValue(), null));
                }
            }
            clickstreamUser.setUserProperties(csUserProps);
            clickstreamUser.setUserPropertiesJsonStr(objectToJsonString(clickstreamUser.getUserProperties()));
        }

        return clickstreamUser;
    }

    public static List<ClickstreamItem> getClickstreamItemList(final GTMEvent gtmEvent, final ClickstreamEvent clickstreamEvent) throws JsonProcessingException {
        List<Item> items = gtmEvent.getItems();
        List<ClickstreamItem>  clickstreamItems = new ArrayList<>();

        if (items !=null && !items.isEmpty()) {
            for (Item item : items) {
                ClickstreamItem clickstreamItem = new ClickstreamItem();
                clickstreamItems.add(clickstreamItem);

                clickstreamItem.setAppId(clickstreamEvent.getAppId());
                clickstreamItem.setEventTimestamp(clickstreamEvent.getEventTimestamp());
                clickstreamItem.setEventId(clickstreamEvent.getEventId());
                clickstreamItem.setEventName(clickstreamEvent.getEventName());
                clickstreamItem.setPlatform(clickstreamEvent.getPlatform());
                clickstreamItem.setUserPseudoId(clickstreamEvent.getUserPseudoId());
                clickstreamItem.setUserId(clickstreamEvent.getUserId());
                clickstreamItem.setItemId(item.getItemId());
                clickstreamItem.setName(item.getItemName());

                clickstreamItem.setCurrency(gtmEvent.getCurrency());
                clickstreamItem.setPrice(item.getPrice());

                Map<String, Object> itemExtraProps = item.getUnknownProperties();
                if (!itemExtraProps.isEmpty()) {
                    clickstreamItem.setCustomParameters(convertStringObjectMapToStringJsonMap(itemExtraProps));
                    clickstreamItem.setCustomParametersJsonStr(objectToJsonString(clickstreamItem.getCustomParameters()));
                }
            }
        }
        return clickstreamItems;
    }
    private static void saveCorruptDataset(final Dataset<Row> corruptDataset, final long corruptDatasetCount) {
        log.info(new ETLMetric(corruptDatasetCount, "GMTServerDataConverterV2 corruptDataset").toString());
        String jobName = System.getProperty(JOB_NAME_PROP);
        String s3FilePath = System.getProperty(WAREHOUSE_DIR_PROP) + "/etl_gtm_corrupted_json_data_v2";
        log.info("save corruptedDataset to " + s3FilePath);
        corruptDataset.withColumn(JOB_NAME_COL, lit(jobName)).write().partitionBy(JOB_NAME_COL).option("compression", "gzip").mode(SaveMode.Append).json(s3FilePath);
    }

    public static String deCodeUri(final String uri) {
        if (uri == null) {
            return null;
        }
        try {
            return URLDecoder.decode(uri, "utf-8");
        } catch (Exception e) {
            log.warn(e.getMessage() + ", uri:" + uri);
            return uri;
        }
    }

    public Dataset<Row> transform(final Dataset<Row> dataset) {
        String projectId = System.getProperty(PROJECT_ID_PROP);
        ArrayType eventListType = DataTypes.createArrayType(EVENT_TYPE, true);
        ArrayType itemListType = DataTypes.createArrayType(ITEM_TYPE, true);

        ArrayType udfOutType = DataTypes.createArrayType(DataTypes.createStructType(new StructField[]{
                DataTypes.createStructField(CORRUPT_RECORD, DataTypes.StringType, true),
                DataTypes.createStructField("events", eventListType, true),
                DataTypes.createStructField("user", USER_TYPE, true),
                DataTypes.createStructField("items", itemListType, true),
        }));

        UserDefinedFunction convertGTMServerDataUdf = udf(convertGTMServerData(), udfOutType);
        String appId = "appId";
        Dataset<Row> convertedKeyValueDataset = dataset
                .filter(col(appId).isNotNull().and(col(appId).notEqual("")))
                .withColumn(DATA_OUT, explode(convertGTMServerDataUdf.apply(
                        col(DATA),
                        col("ingest_time"),
                        col("rid"),
                        col(appId),
                        lit(projectId),
                        col(INPUT_FILE_NAME)
                        )
                ));

        boolean debugLocal = Boolean.parseBoolean(System.getProperty(DEBUG_LOCAL_PROP));
        if (debugLocal) {
            convertedKeyValueDataset.write().mode(SaveMode.Overwrite).json(DEBUG_LOCAL_PATH + "/ServerDataConverterV2/");
        }
        Dataset<Row> okDataset = convertedKeyValueDataset.filter(col(DATA_OUT).getField(CORRUPT_RECORD).isNull());
        Dataset<Row> corruptDataset = convertedKeyValueDataset.filter(col(DATA_OUT).getField(CORRUPT_RECORD).isNotNull());
        long corruptDatasetCount = corruptDataset.count();
        if (corruptDatasetCount > 0) {
            saveCorruptDataset(corruptDataset, corruptDatasetCount);
        }
        return okDataset;
    }

    @Getter
    @AllArgsConstructor
    static class ExtraParams {
        final Long ingestTimestamp;
        final String rid;
        final String appId;
        final String projectId;
        final String inputFileName;
    }

}
