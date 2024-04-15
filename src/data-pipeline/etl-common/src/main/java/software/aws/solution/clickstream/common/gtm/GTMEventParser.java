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

package software.aws.solution.clickstream.common.gtm;

import com.fasterxml.jackson.core.*;
import lombok.extern.slf4j.*;
import software.aws.solution.clickstream.common.*;
import software.aws.solution.clickstream.common.gtm.event.*;
import software.aws.solution.clickstream.common.model.*;

import java.sql.*;
import java.time.*;
import java.util.*;


import static software.aws.solution.clickstream.common.ClickstreamEventParser.EVENT_PAGE_VIEW;
import static software.aws.solution.clickstream.common.ClickstreamEventParser.EVENT_PROFILE_SET;
import static software.aws.solution.clickstream.common.ClickstreamEventParser.EVENT_USER_ENGAGEMENT;
import static software.aws.solution.clickstream.common.Util.convertStringObjectMapToStringEventPropMap;
import static software.aws.solution.clickstream.common.Util.convertStringObjectMapToStringUserPropMap;
import static software.aws.solution.clickstream.common.Util.objectToJsonString;
import static software.aws.solution.clickstream.common.enrich.UAEnrichHelper.UA_STRING;
import static software.aws.solution.clickstream.common.Util.deCodeUri;


@Slf4j
public final class GTMEventParser extends BaseEventParser {
    private static final Map<String, String> EVENT_NAME_MAP = createEventNameMap();
    private static final GTMEventParser INSTANCE = new GTMEventParser();
    private GTMEventParser() {
    }

    public static GTMEventParser getInstance() {
        return INSTANCE;
    }


    public static Map<String, String> createEventNameMap() {
        Map<String, String> eventNameMap = new HashMap<>();
        eventNameMap.put("page_view", EVENT_PAGE_VIEW);
        eventNameMap.put("login", EVENT_PROFILE_SET);
        eventNameMap.put("user_engagement", EVENT_USER_ENGAGEMENT);
        eventNameMap.put("click", "_click");
        return eventNameMap;
    }
    public GTMEvent ingestDataToEvent(final String inputJson) throws JsonProcessingException {
        return getObjectMapper().readValue(inputJson, GTMEvent.class);
    }
    @Override
    public ParseDataResult parseData(final String dataString, final ExtraParams extraParams, final int index) throws JsonProcessingException {
        GTMEvent gtmEvent = ingestDataToEvent(dataString);

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

        ClickstreamUser clickstreamUser = getClickstreamUser(gtmEvent, clickstreamEvent);

        List<ClickstreamItem> clickstreamItemList = getClickstreamItemList(gtmEvent, clickstreamEvent);

        ParseDataResult parseDataResult = new ParseDataResult();
        parseDataResult.setClickstreamEventList(clickstreamEventList);
        parseDataResult.setClickstreamUser(clickstreamUser);
        parseDataResult.setClickstreamItemList(clickstreamItemList);
        return parseDataResult;
    }

    private ClickstreamEvent getClickstreamEvent(final GTMEvent gtmEvent, final int index, final ExtraParams extraParams) throws JsonProcessingException {
        ClickstreamEvent clickstreamEvent = new ClickstreamEvent();

        clickstreamEvent.setEventTimestamp(new Timestamp(extraParams.getIngestTimestamp()));

        String eventId = String.format("%s-%s-%s-%s",
                extraParams.getRid(),
                index,
                gtmEvent.getGaSessionId(),
                gtmEvent.getGaSessionNumber() == null ? "x" : gtmEvent.getGaSessionNumber());

        clickstreamEvent.setEventId(eventId);
        clickstreamEvent.setEventTimeMsec(clickstreamEvent.getEventTimestamp().getTime());
        String eventName = mapEventName(gtmEvent);
        clickstreamEvent.setEventName(eventName);
        clickstreamEvent.setEventValue(gtmEvent.getValue());
        clickstreamEvent.setEventValueCurrency(gtmEvent.getCurrency());
        clickstreamEvent.setIngestTimeMsec(extraParams.getIngestTimestamp());

        setDeviceInfo(gtmEvent, clickstreamEvent);

        setGeoInfo(gtmEvent, clickstreamEvent);

        clickstreamEvent.setAppId(extraParams.getAppId());

        String platform = "Web";
        if (gtmEvent.getClientHints() != null) {
            platform = gtmEvent.getClientHints().isMobile() ? "Mobile" : "Web";
        }
        clickstreamEvent.setPlatform(platform);

        clickstreamEvent.setProjectId(extraParams.getProjectId());

        clickstreamEvent.setPageViewPageReferrer(deCodeUri(gtmEvent.getPageReferrer()));
        clickstreamEvent.setPageViewPageTitle(deCodeUri(gtmEvent.getPageTitle()));
        clickstreamEvent.setPageViewPageUrl(deCodeUri(gtmEvent.getPageLocation()));

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

        // customParameters
        Map<String, ClickstreamEventPropValue> customParameters = getEventCustomParameters(gtmEvent, clickstreamEvent);
        clickstreamEvent.setCustomParameters(customParameters);

        // set traffic source
        setTrafficSourceBySourceParser(clickstreamEvent);

        Map<String, String> processInfo = new HashMap<>();
        processInfo.put("rid", extraParams.getRid());
        processInfo.put("ingest_time", Instant.ofEpochMilli(extraParams.getIngestTimestamp()).toString());
        processInfo.put(INPUT_FILE_NAME, extraParams.getInputFileName());
        clickstreamEvent.setProcessInfo(processInfo);

        return clickstreamEvent;
    }

    private void setDeviceInfo(final GTMEvent gtmEvent, final ClickstreamEvent clickstreamEvent) {
        if (gtmEvent.getClientHints() != null && gtmEvent.getClientHints().getBrands() != null && !gtmEvent.getClientHints().getBrands().isEmpty()) {
            clickstreamEvent.setDeviceMobileBrandName(gtmEvent.getClientHints().getBrands().get(0).getBrand());
            clickstreamEvent.setDeviceMobileModelName(gtmEvent.getClientHints().getModel());
        }

        if (gtmEvent.getClientHints() != null) {
            clickstreamEvent.setDeviceOperatingSystem(gtmEvent.getClientHints().getPlatform());
            clickstreamEvent.setDeviceOperatingSystemVersion(gtmEvent.getClientHints().getPlatformVersion());
        }

        clickstreamEvent.setDeviceSystemLanguage(gtmEvent.getLanguage());

        if (gtmEvent.getClientHints() != null && gtmEvent.getClientHints().getFullVersionList() != null
                && !gtmEvent.getClientHints().getFullVersionList().isEmpty()) {

            int size = gtmEvent.getClientHints().getFullVersionList().size();
            clickstreamEvent.setDeviceUaBrowser(gtmEvent.getClientHints().getFullVersionList().get(size - 1).getBrand());
            clickstreamEvent.setDeviceUaBrowserVersion(gtmEvent.getClientHints().getFullVersionList().get(size - 1).getVersion());
            clickstreamEvent.setDeviceUaOs(gtmEvent.getClientHints().getPlatform());
            clickstreamEvent.setDeviceUaOsVersion(gtmEvent.getClientHints().getPlatformVersion());
        }

        if (gtmEvent.getUserAgent() != null) {
            Map<String, Object> deviceUaMap = new HashMap<>();
            deviceUaMap.put(UA_STRING, gtmEvent.getUserAgent());
            clickstreamEvent.setDeviceUa(deviceUaMap);
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

    private void setGeoInfo(final GTMEvent gtmEvent, final ClickstreamEvent clickstreamEvent) {
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

    private Map<String, ClickstreamEventPropValue> getEventCustomParameters(final GTMEvent gtmEvent, final ClickstreamEvent clickstreamEvent) throws JsonProcessingException {
        Map<String, ClickstreamEventPropValue> customParameters = new HashMap<>();
        if (gtmEvent.getUnknownProperties() != null) {
            customParameters = convertStringObjectMapToStringEventPropMap(gtmEvent.getUnknownProperties());
            clickstreamEvent.setCustomParameters(customParameters);
        }
        customParameters.put("client_id", new ClickstreamEventPropValue(gtmEvent.getClientId(), ValueType.STRING));
        customParameters.put("ip_override", new ClickstreamEventPropValue(gtmEvent.getIpOverride(), ValueType.STRING));
        customParameters.put("screen_resolution", new ClickstreamEventPropValue(gtmEvent.getScreenResolution(), ValueType.STRING));
        customParameters.put("user_agent", new ClickstreamEventPropValue(gtmEvent.getUserAgent(), ValueType.STRING));

        if (gtmEvent.getXGaUr() != null) {
            customParameters.put("x-ga-ur",
                    new ClickstreamEventPropValue(gtmEvent.getXGaUr(), ValueType.STRING));
        }
        if (gtmEvent.getClientHints() != null) {
            customParameters.put("client_hints",
                    new ClickstreamEventPropValue(objectToJsonString(gtmEvent.getClientHints()), ValueType.OBJECT));
        }
        if (gtmEvent.getEventLocation() != null) {
            customParameters.put("event_location",
                    new ClickstreamEventPropValue(objectToJsonString(gtmEvent.getEventLocation()), ValueType.OBJECT));
        }
        if (gtmEvent.getXGaSystemProperties() != null) {
            customParameters.put("x-ga-system_properties",
                    new ClickstreamEventPropValue(objectToJsonString(gtmEvent.getXGaSystemProperties()), ValueType.OBJECT));
        }
        if (gtmEvent.getXSstSystemProperties() != null) {
            customParameters.put("x-sst-system_properties",
                    new ClickstreamEventPropValue(objectToJsonString(gtmEvent.getXSstSystemProperties()), ValueType.OBJECT));
        }
        if (gtmEvent.getXGaMp2UserProperties() != null) {
            customParameters.put("x-ga-mp2-user_properties",
                    new ClickstreamEventPropValue(objectToJsonString(gtmEvent.getXGaMp2UserProperties()), ValueType.OBJECT));
        }
        return customParameters;
    }

    private static String mapEventName(final GTMEvent gtmEvent) {
        return EVENT_NAME_MAP.getOrDefault(gtmEvent.getEventName(), gtmEvent.getEventName());
    }

    private  ClickstreamUser getClickstreamUser(final GTMEvent gtmEvent, final ClickstreamEvent clickstreamEvent) throws JsonProcessingException {
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

        String pageReferrer = clickstreamEvent.getPageViewPageReferrer();
        String lateReferrer = clickstreamEvent.getPageViewLatestReferrer();
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

            Map<String, ClickstreamUserPropValue> csUserProps = new HashMap<>();
            csUserProps.put("user_id", new ClickstreamUserPropValue(userId, ValueType.STRING, null));
            csUserProps.put("username", new ClickstreamUserPropValue(userName, ValueType.STRING, null));
            csUserProps.put("email", new ClickstreamUserPropValue(userEmail, ValueType.STRING, null));
            csUserProps.put("firstName", new ClickstreamUserPropValue(userFirstName, ValueType.STRING, null));
            csUserProps.put("lastName", new ClickstreamUserPropValue(userLastName, ValueType.STRING, null));
            csUserProps.put("gender", new ClickstreamUserPropValue(gender, ValueType.STRING, null));
            csUserProps.put("age", new ClickstreamUserPropValue(age + "", ValueType.NUMBER, null));
            csUserProps.put("persona", new ClickstreamUserPropValue(persona, ValueType.STRING, null));

            Map<String, Object> extraUserProps = gtmUser.getUnknownProperties();
            if (extraUserProps != null) {
                Map<String, ClickstreamUserPropValue> extraUserPropsJsonMap = convertStringObjectMapToStringUserPropMap(extraUserProps);
                csUserProps.putAll(extraUserPropsJsonMap);
            }
            clickstreamUser.setUserProperties(csUserProps);
        }

        clickstreamUser.setEventName(clickstreamEvent.getEventName());

        return clickstreamUser;
    }

    private List<ClickstreamItem> getClickstreamItemList(final GTMEvent gtmEvent, final ClickstreamEvent clickstreamEvent) throws JsonProcessingException {
        List<Item> items = gtmEvent.getItems();
        List<ClickstreamItem> clickstreamItems = new ArrayList<>();

        if (items != null && !items.isEmpty()) {
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
                    clickstreamItem.setCustomParameters(convertStringObjectMapToStringEventPropMap(itemExtraProps));
                }
            }
        }
        return clickstreamItems;
    }
}
