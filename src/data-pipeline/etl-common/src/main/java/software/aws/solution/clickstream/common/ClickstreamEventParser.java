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

package software.aws.solution.clickstream.common;

import com.fasterxml.jackson.core.*;
import lombok.Getter;
import lombok.Setter;
import lombok.extern.slf4j.*;
import software.aws.solution.clickstream.common.enrich.*;
import software.aws.solution.clickstream.common.enrich.ts.CategoryTrafficSource;
import software.aws.solution.clickstream.common.enrich.ts.TrafficSourceUtm;
import software.aws.solution.clickstream.common.ingest.*;
import software.aws.solution.clickstream.common.model.*;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;
import java.util.stream.Stream;

import static software.aws.solution.clickstream.common.Util.*;
import static software.aws.solution.clickstream.common.enrich.RuleBasedTrafficSourceHelper.GCLID;


@Slf4j
public final class ClickstreamEventParser extends BaseEventParser {
    private static ClickstreamEventParser instance;
    public static final String ENABLE_EVENT_TIME_SHIFT_PROP =  "enable.event.time.shift";
    public static final String EVENT_PROFILE_SET = "_profile_set";
    public static final String EVENT_PAGE_VIEW = "_page_view";
    public static final String EVENT_SCREEN_VIEW = "_screen_view";
    public static final String EVENT_FIRST_OPEN = "_first_open";
    public static final String EVENT_FIRST_VISIT = "_first_visit";
    public static final String EVENT_APP_END = "_app_end";
    public static final String EVENT_APP_START = "_app_start";
    public static final String EVENT_SESSION_START = "_session_start";
    public static final String EVENT_USER_ENGAGEMENT = "_user_engagement";
    public static final String EVENT_SCROLL = "_scroll";

    private TransformConfig transformConfig;

    private ClickstreamEventParser(final TransformConfig transformConfig) {
        this.transformConfig = transformConfig;
    }

    public static ClickstreamEventParser getInstance() {
        // use default config rule in java resource file
        return getInstance(null);
    }

    public static ClickstreamEventParser getInstance(final TransformConfig transformConfig) {
        if (instance == null) {
            instance = new ClickstreamEventParser(transformConfig);
        }
         return instance;
    }
    Event ingestDataToEvent(final String data) throws JsonProcessingException {
        return getObjectMapper().readValue(data, Event.class);
    }

    @Override
    public ParseDataResult parseData(final String dataString, final ExtraParams extraParams, final int index) throws JsonProcessingException {
        ParseDataResult parseDataResult = new ParseDataResult();
        List<ClickstreamEvent> clickstreamEventList = new ArrayList<>();
        parseDataResult.setClickstreamEventList(clickstreamEventList);
        parseDataResult.setClickstreamItemList(new ArrayList<>());

        log.debug("Parsing data: " + dataString);
        if (dataString == null || dataString.isEmpty()) {
            log.warn("Data field is empty, skipping the row");
            return parseDataResult;
        }
        Event ingestEvent = ingestDataToEvent(dataString);
        if (ingestEvent.getEventName() == null || ingestEvent.getEventName().isEmpty()) {
            log.warn("Event name is empty, skipping the row, dataString:" + dataString);
            return parseDataResult;
        }

        TimeShiftInfo timeShiftInfo = getEventTimeShiftInfo(ingestEvent, extraParams);

        ClickstreamEvent clickstreamEvent = getClickstreamEvent(ingestEvent, index, extraParams, timeShiftInfo);
        clickstreamEventList.add(clickstreamEvent);

        // User
        ClickstreamUser clickstreamUser = getClickstreamUser(ingestEvent, clickstreamEvent, timeShiftInfo);
        // Items
        List<ClickstreamItem> clickstreamItemList = getClickstreamItemList(ingestEvent, clickstreamEvent);

        parseDataResult.setClickstreamEventList(clickstreamEventList);
        parseDataResult.setClickstreamUser(clickstreamUser);
        parseDataResult.setClickstreamItemList(clickstreamItemList);
        return parseDataResult;
    }

    private List<ClickstreamItem> getClickstreamItemList(final Event ingestEvent, final ClickstreamEvent clickstreamEvent) {
        List<ClickstreamItem> clickstreamItemList = new ArrayList<>();
        List<Item> items = ingestEvent.getItems();
        if (items == null) {
            return clickstreamItemList;
        }
        for (Item item : items) {
            if (item.getItemId() == null || item.getItemId().isEmpty()) {
                continue;
            }

            ClickstreamItem clickstreamItem = new ClickstreamItem();
            clickstreamItemList.add(clickstreamItem);

            clickstreamItem.setEventId(clickstreamEvent.getEventId());
            clickstreamItem.setEventTimestamp(clickstreamEvent.getEventTimestamp());
            clickstreamItem.setItemId(item.getItemId());
            clickstreamItem.setEventName(clickstreamEvent.getEventName());
            clickstreamItem.setPlatform(clickstreamEvent.getPlatform());
            clickstreamItem.setUserPseudoId(clickstreamEvent.getUserPseudoId());
            clickstreamItem.setUserId(clickstreamEvent.getUserId());
            clickstreamItem.setName(item.getItemName());
            clickstreamItem.setBrand(item.getBrand());
            clickstreamItem.setCurrency(item.getCurrency());
            clickstreamItem.setPrice(item.getPrice());
            clickstreamItem.setQuantity(item.getQuantity());
            clickstreamItem.setCreativeName(item.getCreativeName());
            clickstreamItem.setCreativeSlot(item.getCreativeSlot());
            clickstreamItem.setLocationId(item.getLocationId());
            clickstreamItem.setCategory(item.getCategory());
            clickstreamItem.setCategory2(item.getCategory2());
            clickstreamItem.setCategory3(item.getCategory3());
            clickstreamItem.setCategory4(item.getCategory4());
            clickstreamItem.setCategory5(item.getCategory5());
            try {
                clickstreamItem.setCustomParameters(convertStringObjectMapToStringEventPropMap(item.getCustomProperties()));
            } catch (JsonProcessingException e) {
                log.error("cannot convert item.customProperties to Map<String, ClickstreamEventPropValue>"
                        + ERROR_LOG + e.getMessage()
                        + VALUE_LOG + item.getCustomProperties());
                log.error(getStackTrace(e));
            }

            clickstreamItem.setAppId(clickstreamEvent.getAppId());

        }

        return clickstreamItemList;
    }

    private ClickstreamUser getClickstreamUser(final Event ingestEvent, final ClickstreamEvent clickstreamEvent, final TimeShiftInfo timeShiftInfo) {
        ClickstreamUser clickstreamUser = new ClickstreamUser();

        clickstreamUser.setEventTimestamp(clickstreamEvent.getEventTimestamp());
        clickstreamUser.setUserPseudoId(clickstreamEvent.getUserPseudoId());
        clickstreamUser.setUserId(clickstreamEvent.getUserId());

        User user = ingestEvent.getUser();

        if (user != null) {
            Map<String, ClickstreamUserPropValue> userProperties = new HashMap<>();
            if (user.getUserId() != null) {
                userProperties.put("_user_id", user.getUserId().toClickstreamUserPropValue());
            }
            if (user.getUserName() != null) {
                userProperties.put("_user_name", user.getUserName().toClickstreamUserPropValue());
            }
            if (user.getUserAge() != null) {
                userProperties.put("_user_age", user.getUserAge().toClickstreamUserPropValue());
            }
            if (user.getUserFirstTouchTimestamp() != null) {
                userProperties.put("_user_first_touch_timestamp", user.getUserFirstTouchTimestamp().toClickstreamUserPropValue());
                clickstreamUser.setFirstVisitDate(new java.sql.Date(user.getUserFirstTouchTimestamp().getValue() + timeShiftInfo.getTimeDiff())); // NOSONAR
                clickstreamUser.setFirstTouchTimeMsec(user.getUserFirstTouchTimestamp().getValue() + timeShiftInfo.getTimeDiff());
            }

            try {
                Map<String, ClickstreamUserPropValue> customUserProperties = convertCustomerUserPropMapToStringUserPropMap(user.getCustomProperties());
                userProperties.putAll(customUserProperties);
            } catch (JsonProcessingException e) {
                log.error("cannot convert user.customProperties to Map<String, ClickstreamUserPropValue>"
                        + ERROR_LOG + e.getMessage()
                        + VALUE_LOG + user.getCustomProperties());
                log.error(getStackTrace(e));
            }
            clickstreamUser.setUserProperties(userProperties);
        }

        clickstreamUser.setFirstReferrer(clickstreamEvent.getPageViewPageReferrer());
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

        clickstreamUser.setAppId(clickstreamEvent.getAppId());
        clickstreamUser.setEventName(clickstreamEvent.getEventName());
        return clickstreamUser;
    }

    private ClickstreamEvent getClickstreamEvent(final Event ingestEvent, final int index, final ExtraParams extraParams, final TimeShiftInfo timeShiftInfo) {
        ClickstreamEvent clickstreamEvent = new ClickstreamEvent();
        Map<String, List<String>> uriParams = getUriParams(extraParams.getUri());

        clickstreamEvent.setEventTimeMsec(ingestEvent.getEventTimestamp() + timeShiftInfo.getTimeDiff());
        clickstreamEvent.setEventTimestamp(new Timestamp(clickstreamEvent.getEventTimeMsec()));
        clickstreamEvent.setEventId(ingestEvent.getEventId());
        clickstreamEvent.setIngestTimeMsec(extraParams.getIngestTimestamp());

        if (timeShiftInfo.isAdjusted()) {
            log.warn("eventTimestamp is adjusted from " + timeShiftInfo.getOriginEventTimestamp()
                    + " to " + timeShiftInfo.getEventTimestamp()
                    + " for event: " + ingestEvent.getEventId() + ", index: " + index);
        }

        if (ingestEvent.getEventName() == null) {
            ingestEvent.setEventName("unknown");
            log.warn("event name is null, set to unknown, event: " + ingestEvent.getEventId());
        }
        clickstreamEvent.setEventName(ingestEvent.getEventName());

        setEventValue(ingestEvent, clickstreamEvent);
        setEventBundleSeqId(uriParams, clickstreamEvent);
        setDeviceInfo(ingestEvent, clickstreamEvent);
        setUA(extraParams, clickstreamEvent);
        setAppInfo(ingestEvent, clickstreamEvent);

        if (ingestEvent.getPlatform() == null) {
            ingestEvent.setPlatform(PLATFORM_WEB);
            log.warn("platform is null, set to " + PLATFORM_WEB + ", event: " + ingestEvent.getEventId());
        }
        clickstreamEvent.setPlatform(ingestEvent.getPlatform());
        clickstreamEvent.setProjectId(extraParams.getProjectId());

        setScreenView(ingestEvent, clickstreamEvent, timeShiftInfo);
        setPageView(ingestEvent, clickstreamEvent, timeShiftInfo);

        setUserInfo(ingestEvent, clickstreamEvent, timeShiftInfo);

        clickstreamEvent.setSdkVersion(ingestEvent.getSdkVersion());
        clickstreamEvent.setSdkName(ingestEvent.getSdkName());

        setValueFromAttributes(ingestEvent, clickstreamEvent, timeShiftInfo);

        Map<String, ClickstreamEventPropValue> customProperties = new HashMap<>();

        setEventCustomParameters(ingestEvent, customProperties, clickstreamEvent);

        clickstreamEvent.setIp(extraParams.getIp());
        clickstreamEvent.setUa(extraParams.getUa());

        setTrafficSource(ingestEvent, clickstreamEvent);

        setProcessInfo(extraParams, clickstreamEvent, timeShiftInfo);

        return clickstreamEvent;
    }

    private void setEventCustomParameters(final Event ingestEvent, final Map<String, ClickstreamEventPropValue> customProperties, final ClickstreamEvent clickstreamEvent) {
        try {
            Map<String, ClickstreamEventPropValue> customPropertiesFromEvent = convertStringObjectMapToStringEventPropMap(ingestEvent.getCustomProperties());
            customProperties.putAll(customPropertiesFromEvent);
        } catch (JsonProcessingException e) {
            log.error("cannot convert Event.customProperties to Map<String, ClickstreamEventPropValue>,"
                    + ERROR_LOG + e.getMessage()
                    + VALUE_LOG + ingestEvent.getCustomProperties());
            log.error(getStackTrace(e));
        }

        try {
            Map<String, ClickstreamEventPropValue> customPropertiesFromAttributes = convertStringObjectMapToStringEventPropMap(ingestEvent.getAttributes().getCustomProperties());
            customProperties.putAll(customPropertiesFromAttributes);
        } catch (JsonProcessingException e) {
            log.error("cannot convert Event.Attributes.customPropertiesFromAttributes to Map<String, ClickstreamEventPropValue>, "
                    + ERROR_LOG + e.getMessage()
                    + VALUE_LOG + ingestEvent.getAttributes().getCustomProperties());
            log.error(getStackTrace(e));
        }

        clickstreamEvent.setCustomParameters(customProperties);
    }

    private void setDeviceInfo(final Event ingestEvent, final ClickstreamEvent clickstreamEvent) {
        clickstreamEvent.setDeviceMobileBrandName(ingestEvent.getBrand());
        clickstreamEvent.setDeviceMobileModelName(ingestEvent.getModel());
        clickstreamEvent.setDeviceManufacturer(ingestEvent.getMake());
        clickstreamEvent.setDeviceCarrier(ingestEvent.getCarrier());
        clickstreamEvent.setDeviceNetworkType(ingestEvent.getNetworkType());
        clickstreamEvent.setDeviceOperatingSystemVersion(ingestEvent.getOsVersion());
        clickstreamEvent.setDeviceVendorId(ingestEvent.getDeviceId());
        clickstreamEvent.setDeviceAdvertisingId(ingestEvent.getDeviceUniqueId());
        clickstreamEvent.setDeviceSystemLanguage(ingestEvent.getSystemLanguage());
        clickstreamEvent.setDeviceTimeZoneOffsetSeconds((int) (ingestEvent.getZoneOffset() / 1000));
        clickstreamEvent.setDeviceScreenWidth(ingestEvent.getScreenWidth());
        clickstreamEvent.setDeviceScreenHeight(ingestEvent.getScreenHeight());
        clickstreamEvent.setDeviceViewportWidth(ingestEvent.getViewportWidth());
        clickstreamEvent.setDeviceViewportHeight(ingestEvent.getViewportHeight());
        clickstreamEvent.setGeoLocale(ingestEvent.getLocale());

        List<String> platformOsList = Stream.of(
                PLATFORM_ANDROID, PLATFORM_IOS, PLATFORM_WECHATMP
        ).map(String::toLowerCase).collect(Collectors.toList());

        if (ingestEvent.getPlatform() != null && platformOsList.contains(ingestEvent.getPlatform().toLowerCase())) {
            clickstreamEvent.setDeviceOperatingSystem(ingestEvent.getPlatform());
        }

    }

    private void setValueFromAttributes(final Event ingestEvent, final ClickstreamEvent clickstreamEvent, final TimeShiftInfo timeShiftInfo) {
        if (ingestEvent.getAttributes() == null) {
            return;
        }
        String eventName = clickstreamEvent.getEventName();

        if (eventName.equals(EVENT_APP_START)) {
            clickstreamEvent.setAppStartIsFirstTime(ingestEvent.getAttributes().getIsFirstTime());
        }

        clickstreamEvent.setUpgradePreviousAppVersion(ingestEvent.getAttributes().getPreviousAppVersion());
        clickstreamEvent.setUpgradePreviousOsVersion(ingestEvent.getAttributes().getPreviousOsVersion());

        clickstreamEvent.setSearchKey(ingestEvent.getAttributes().getSearchKey());
        clickstreamEvent.setSearchTerm(ingestEvent.getAttributes().getSearchTerm());

        clickstreamEvent.setOutboundLinkClasses(ingestEvent.getAttributes().getLinkClasses());
        clickstreamEvent.setOutboundLinkDomain(ingestEvent.getAttributes().getLinkDomain());
        clickstreamEvent.setOutboundLinkId(ingestEvent.getAttributes().getLinkId());
        clickstreamEvent.setOutboundLinkUrl(ingestEvent.getAttributes().getLinkUrl());
        clickstreamEvent.setOutboundLink(ingestEvent.getAttributes().getOutbound());

        clickstreamEvent.setSessionId(ingestEvent.getAttributes().getSessionId());
        if (ingestEvent.getAttributes().getSessionStartTimeMsec() != null) {
            clickstreamEvent.setSessionStartTimeMsec(ingestEvent.getAttributes().getSessionStartTimeMsec() + timeShiftInfo.getTimeDiff());
        }
        clickstreamEvent.setSessionDuration(ingestEvent.getAttributes().getSessionDuration());
        clickstreamEvent.setSessionNumber(ingestEvent.getAttributes().getSessionNumber());

        if (eventName.equals(EVENT_SCROLL)) {
            clickstreamEvent.setScrollEngagementTimeMsec(ingestEvent.getAttributes().getEngagementTimeMsec());
        }

        clickstreamEvent.setSdkErrorCode(ingestEvent.getAttributes().getErrorCode());
        clickstreamEvent.setSdkErrorMessage(ingestEvent.getAttributes().getErrorMessage());

        clickstreamEvent.setAppExceptionMessage(ingestEvent.getAttributes().getExceptionMessage());
        clickstreamEvent.setAppExceptionStack(ingestEvent.getAttributes().getExceptionStack());
    }

    private void setUserInfo(final Event ingestEvent, final ClickstreamEvent clickstreamEvent, final TimeShiftInfo timeShiftInfo) {
        clickstreamEvent.setUserPseudoId(ingestEvent.getUniqueId());
        if (ingestEvent.getUser() != null && ingestEvent.getUser().getUserId() != null) {
            clickstreamEvent.setUserId(ingestEvent.getUser().getUserId().getValue());
        }
        if (ingestEvent.getUser() != null && ingestEvent.getUser().getUserFirstTouchTimestamp() != null) {
            clickstreamEvent.setUserFirstTouchTimeMsec(ingestEvent.getUser().getUserFirstTouchTimestamp().getValue() + timeShiftInfo.getTimeDiff());
        }
        if (clickstreamEvent.getEventName().equals(EVENT_USER_ENGAGEMENT)
                && ingestEvent.getAttributes() != null) {
            clickstreamEvent.setUserEngagementTimeMsec(ingestEvent.getAttributes().getEngagementTimeMsec());
        }
    }

    private void setPageView(final Event ingestEvent, final ClickstreamEvent clickstreamEvent, final TimeShiftInfo timeShiftInfo) {
        if (ingestEvent.getAttributes() == null) {
            return;
        }
        clickstreamEvent.setPageViewPageReferrer(deCodeUri(ingestEvent.getAttributes().getPageReferrer()));
        clickstreamEvent.setPageViewPageReferrerTitle(deCodeUri(ingestEvent.getAttributes().getPageReferrerTitle()));

        if (EVENT_PAGE_VIEW.equals(ingestEvent.getEventName())) {
            clickstreamEvent.setPageViewEngagementTimeMsec(ingestEvent.getAttributes().getEngagementTimeMsec());
            if (ingestEvent.getAttributes().getPreviousTimestamp() != null) {
                clickstreamEvent.setPageViewPreviousTimeMsec(ingestEvent.getAttributes().getPreviousTimestamp() + timeShiftInfo.getTimeDiff());
            }
        }
        clickstreamEvent.setPageViewPageTitle(deCodeUri(ingestEvent.getAttributes().getPageTitle()));
        clickstreamEvent.setPageViewPageUrl(deCodeUri(ingestEvent.getAttributes().getPageUrl()));

        setPageViewUrl(clickstreamEvent, ingestEvent.getAttributes().getPageUrl());

        if (ingestEvent.getHostName() != null) {
            clickstreamEvent.setPageViewHostname(ingestEvent.getHostName());
        }

        clickstreamEvent.setPageViewLatestReferrer(deCodeUri(ingestEvent.getAttributes().getLatestReferrer()));
        clickstreamEvent.setPageViewLatestReferrerHost(ingestEvent.getAttributes().getLatestReferrerHost());
        if (ingestEvent.getAttributes().getLatestReferrer() != null
                && clickstreamEvent.getPageViewLatestReferrerHost() == null) {

            Optional<UrlParseResult> r = parseUrl(ingestEvent.getAttributes().getLatestReferrer());
            if (r.isPresent()) {
                clickstreamEvent.setPageViewLatestReferrerHost(r.get().getHostName());
            }
        }
        clickstreamEvent.setPageViewEntrances(ingestEvent.getAttributes().getEntrances());
    }

    private void setScreenView(final Event ingestEvent, final ClickstreamEvent clickstreamEvent, final TimeShiftInfo timeShiftInfo) {
        if (ingestEvent.getAttributes() == null) {
            return;
        }
        clickstreamEvent.setScreenViewScreenName(ingestEvent.getAttributes().getScreenName());
        clickstreamEvent.setScreenViewScreenId(ingestEvent.getAttributes().getScreenId());
        clickstreamEvent.setScreenViewScreenUniqueId(ingestEvent.getAttributes().getScreenUniqueId());
        clickstreamEvent.setScreenViewPreviousScreenName(ingestEvent.getAttributes().getPreviousScreenName());
        clickstreamEvent.setScreenViewPreviousScreenId(ingestEvent.getAttributes().getPreviousScreenId());
        clickstreamEvent.setScreenViewPreviousScreenUniqueId(ingestEvent.getAttributes().getPreviousScreenUniqueId());

        if (EVENT_SCREEN_VIEW.equals(ingestEvent.getEventName())) {
            clickstreamEvent.setScreenViewEngagementTimeMsec(ingestEvent.getAttributes().getEngagementTimeMsec());
            if (ingestEvent.getAttributes().getPreviousTimestamp() != null) {
                clickstreamEvent.setScreenViewPreviousTimeMsec(ingestEvent.getAttributes().getPreviousTimestamp() + timeShiftInfo.getTimeDiff());
            }
        }
        clickstreamEvent.setScreenViewEntrances(ingestEvent.getAttributes().getEntrances());

    }

    private void setAppInfo(final Event ingestEvent, final ClickstreamEvent clickstreamEvent) {
        clickstreamEvent.setAppPackageId(ingestEvent.getAppPackageName());
        clickstreamEvent.setAppVersion(ingestEvent.getAppVersion());
        clickstreamEvent.setAppTitle(ingestEvent.getAppTitle());
        if (ingestEvent.getAttributes() != null) {
            clickstreamEvent.setAppInstallSource(ingestEvent.getAttributes().getAppInstallChannel());
        }
        clickstreamEvent.setAppId(ingestEvent.getAppId());
    }

    private void setUA(final ExtraParams extraParams, final ClickstreamEvent clickstreamEvent) {
        Map<String, Object> uaMap = new HashMap<>();
        uaMap.put("string", extraParams.getUa());
        clickstreamEvent.setDeviceUa(uaMap);
    }
    private void setTrafficSource(final Event ingestEvent, final ClickstreamEvent clickstreamEvent) {
        IngestTrafficSourceWrap clientTsInfo = getIngestTrafficSourceInfo(ingestEvent);

        clickstreamEvent.setTrafficSourceSource(clientTsInfo.getSource());
        clickstreamEvent.setTrafficSourceMedium(clientTsInfo.getMedium());
        clickstreamEvent.setTrafficSourceCampaign(clientTsInfo.getCampaign());
        clickstreamEvent.setTrafficSourceContent(clientTsInfo.getContent());
        clickstreamEvent.setTrafficSourceTerm(clientTsInfo.getTerm());
        clickstreamEvent.setTrafficSourceCampaignId(clientTsInfo.getCampaignId());
        clickstreamEvent.setTrafficSourceClidPlatform(clientTsInfo.getClidPlatform());
        clickstreamEvent.setTrafficSourceClid(clientTsInfo.getClid());
        clickstreamEvent.setTrafficSourceChannelGroup(clientTsInfo.getChannel());
        clickstreamEvent.setTrafficSourceCategory(clientTsInfo.getCategory());

        log.debug("setTrafficSource() platform: {}, source: {}", clickstreamEvent.getPlatform(), clientTsInfo.getSource());

        if (isDisableTrafficSourceEnrichment()) {
            log.info("disable.traffic.source.enrichment is set, skipping traffic source enrichment");
            return;
        }

        // TrafficSource is set by SDK, but category or channel not set
        if (clientTsInfo.getSource() != null && !clientTsInfo.getSource().isEmpty()
                && (clientTsInfo.getCategory() == null || clientTsInfo.getChannel() == null)) {
            String appId = clickstreamEvent.getAppId();
            RuleConfig ruleConfig = getAppRuleConfig().get(appId);
            if (ruleConfig == null) {
                log.warn("RuleConfig is not set for appId: " + appId);
            }

            RuleBasedTrafficSourceHelper rsHelper = RuleBasedTrafficSourceHelper.getInstance(appId, ruleConfig);

            TrafficSourceUtm trafficSourceUtm = new TrafficSourceUtm();
            trafficSourceUtm.setSource(clientTsInfo.getSource());
            trafficSourceUtm.setMedium(clientTsInfo.getMedium());
            trafficSourceUtm.setCampaign(clientTsInfo.getCampaign());
            trafficSourceUtm.setContent(clientTsInfo.getContent());
            trafficSourceUtm.setTerm(clientTsInfo.getTerm());
            trafficSourceUtm.setCampaignId(clientTsInfo.getCampaignId());
            trafficSourceUtm.setClidPlatform(clientTsInfo.getClidPlatform());
            trafficSourceUtm.setClid(clientTsInfo.getClid());

            CategoryTrafficSource ts = rsHelper.parse(trafficSourceUtm,
                    clickstreamEvent.getPageViewPageReferrer(),
                    clickstreamEvent.getPageViewHostname(),
                    clickstreamEvent.getPageViewLatestReferrer(),
                    clickstreamEvent.getPageViewLatestReferrerHost());

            clickstreamEvent.setTrafficSourceChannelGroup(ts.getChannelGroup());
            clickstreamEvent.setTrafficSourceCategory(ts.getCategory());
        }

        // not set by client SDK
        if (clientTsInfo.getSource() == null && ingestEvent.getAttributes() != null) {
            setTrafficSourceBySourceParser(
                    ingestEvent.getAttributes().getPageUrl(),
                    ingestEvent.getAttributes().getPageReferrer(),
                    ingestEvent.getAttributes().getLatestReferrer(),
                    ingestEvent.getAttributes().getLatestReferrerHost(),
                    clickstreamEvent
            );
        }
    }

    private IngestTrafficSourceWrap getIngestTrafficSourceInfo(final Event ingestEvent) {
        IngestTrafficSourceWrap ingestTrafficSourceInfo =  new IngestTrafficSourceWrap();
        String source = ingestEvent.getAttributes().getTrafficSourceSource() != null
                ? ingestEvent.getAttributes().getTrafficSourceSource(): ingestEvent.getAttributes().getUtmSource();
        ingestTrafficSourceInfo.setSource(source);

        String medium = ingestEvent.getAttributes().getTrafficSourceMedium() != null
                ? ingestEvent.getAttributes().getTrafficSourceMedium(): ingestEvent.getAttributes().getUtmMedium();
        ingestTrafficSourceInfo.setMedium(medium);


        String campaign = ingestEvent.getAttributes().getTrafficSourceCampaign() != null
                ? ingestEvent.getAttributes().getTrafficSourceCampaign(): ingestEvent.getAttributes().getUtmCampaign();
        ingestTrafficSourceInfo.setCampaign(campaign);


        String content = ingestEvent.getAttributes().getTrafficSourceContent() != null
                ? ingestEvent.getAttributes().getTrafficSourceContent(): ingestEvent.getAttributes().getUtmContent();
        ingestTrafficSourceInfo.setContent(content);

        String term = ingestEvent.getAttributes().getTrafficSourceTerm() != null
                ? ingestEvent.getAttributes().getTrafficSourceTerm(): ingestEvent.getAttributes().getUtmTerm();
        ingestTrafficSourceInfo.setTerm(term);

        String campaignId = ingestEvent.getAttributes().getTrafficSourceCampaignId() != null
                ? ingestEvent.getAttributes().getTrafficSourceCampaignId(): ingestEvent.getAttributes().getUtmId();
        ingestTrafficSourceInfo.setCampaignId(campaignId);

        String clidPlatform = ingestEvent.getAttributes().getTrafficSourceClidPlatform() != null
                ? ingestEvent.getAttributes().getTrafficSourceClidPlatform(): ingestEvent.getAttributes().getUtmSourcePlatform();
        ingestTrafficSourceInfo.setClidPlatform(clidPlatform);

        String gclid = null;
        if (ingestEvent.getAttributes().getGclid() != null) {
           gclid = buildTrafficSourceClidJson(GCLID, ingestEvent.getAttributes().getGclid());

        }
        String clid = ingestEvent.getAttributes().getTrafficSourceClid() != null
                ? ingestEvent.getAttributes().getTrafficSourceClid(): gclid;
        ingestTrafficSourceInfo.setClid(clid);

        String channel = ingestEvent.getAttributes().getTrafficSourceChannelGroup();
        ingestTrafficSourceInfo.setChannel(channel);

        String category = ingestEvent.getAttributes().getTrafficSourceCategory();
        ingestTrafficSourceInfo.setCategory(category);

        return ingestTrafficSourceInfo;
    }


    @Getter
    @Setter
    public static class IngestTrafficSourceWrap {
        String source;
        String medium;
        String campaign;
        String content;
        String term;
        String campaignId;
        String clidPlatform;
        String clid;
        String channel;
        String category;
    }

    @Override
    public TransformConfig getTransformConfig() {
        return this.transformConfig;
    }
    public void setTransformConfig(final TransformConfig transformConfig) {
        this.transformConfig = transformConfig;
    }

    private boolean isEnableEventTimeShift() {
        if (System.getProperty(ENABLE_EVENT_TIME_SHIFT_PROP) == null) {
            return false;
        }
        return Boolean.parseBoolean(System.getProperty(ENABLE_EVENT_TIME_SHIFT_PROP));
    }

    private TimeShiftInfo getEventTimeShiftInfo(final Event ingestEvent, final ExtraParams extraParams) {
        TimeShiftInfo timeShiftInfo = new TimeShiftInfo();
        long currentTime = System.currentTimeMillis();
        Long eventTimestamp = ingestEvent.getEventTimestamp();
        Long uploadTimestamp = extraParams.getUploadTimestamp();

        timeShiftInfo.setAdjustThreshold(ADJUST_THRESHOLD);
        timeShiftInfo.setOriginEventTimestamp(eventTimestamp);
        timeShiftInfo.setEventTimestamp(eventTimestamp);
        timeShiftInfo.setIngestTimestamp(extraParams.getIngestTimestamp());
        timeShiftInfo.setAdjusted(false);
        timeShiftInfo.setTimeDiff(0L);
        timeShiftInfo.setUploadTimestamp(uploadTimestamp);

        boolean isFutureEvent = eventTimestamp > currentTime;

        if (!isEnableEventTimeShift() && !isFutureEvent) {
            log.debug("event time shift is not enable and event is not future event, skip time shift adjustment.");
            return timeShiftInfo;
        }

        if (uploadTimestamp == null) {
            Map<String, List<String>> uriParams = getUriParams(extraParams.getUri());
            if (uriParams.containsKey(UPLOAD_TIMESTAMP)) {
                String uploadTimestampStr = uriParams.get(UPLOAD_TIMESTAMP).get(0);
                try {
                    uploadTimestamp = Long.parseLong(uploadTimestampStr);
                    extraParams.setUploadTimestamp(uploadTimestamp);
                } catch (Exception e) {
                    log.warn("cannot parse upload_timestamp: " + uploadTimestampStr + ERROR_LOG + e.getMessage());
                }
            }
            timeShiftInfo.setUri(extraParams.getUri());
        }

        timeShiftInfo.setUploadTimestamp(uploadTimestamp);

        if (uploadTimestamp != null) {
            Long ingestTimestamp = extraParams.getIngestTimestamp();
            long timeDiff = ingestTimestamp - uploadTimestamp;
            if (Math.abs(timeDiff) > timeShiftInfo.getAdjustThreshold() || isFutureEvent) {
                timeShiftInfo.setTimeDiff(timeDiff);
                eventTimestamp += timeDiff;
                log.warn("ingestTimestamp is " + timeDiff + " seconds ahead of uploadTimestamp");
                timeShiftInfo.setAdjusted(true);
                timeShiftInfo.setReason("ingestTimestamp is " + timeDiff + " millis ahead of uploadTimestamp, isFutureEvent: " + isFutureEvent);
            }
            timeShiftInfo.setEventTimestamp(eventTimestamp);
        }

        if (timeShiftInfo.getEventTimestamp() > currentTime) {
            timeShiftInfo.setEventTimestamp(timeShiftInfo.getIngestTimestamp());
            timeShiftInfo.setAdjusted(true);
            timeShiftInfo.setTimeDiff(timeShiftInfo.getIngestTimestamp() - timeShiftInfo.getOriginEventTimestamp());
            timeShiftInfo.setReason(String.join("|",
                    timeShiftInfo.getReason() == null ? "": timeShiftInfo.getReason(),
                    "eventTimestamp is in the future, set to ingestTimestamp"));
        }

        log.debug("timeShiftInfo: " + timeShiftInfo);

        return timeShiftInfo;
    }

    private void setProcessInfo(final ExtraParams extraParams, final ClickstreamEvent clickstreamEvent, final TimeShiftInfo timeShiftInfo) {
        Map<String, String> processInfo = new HashMap<>();
        processInfo.put("rid", extraParams.getRid());
        processInfo.put("ingest_time", Instant.ofEpochMilli(extraParams.getIngestTimestamp()).toString());
        processInfo.put(INPUT_FILE_NAME, extraParams.getInputFileName());
        processInfo.put("source_ip", extraParams.getIp());
        if (extraParams.getUploadTimestamp() != null) {
            processInfo.put("upload_time", Instant.ofEpochMilli(extraParams.getUploadTimestamp()).toString());
        }
        if (timeShiftInfo.isAdjusted()) {
            processInfo.put("event_timestamp_adjusted", true + "");
            processInfo.put("event_timestamp_adjusted_from", timeShiftInfo.getOriginEventTimestamp() + "");
            processInfo.put("event_timestamp_adjusted_to", timeShiftInfo.getEventTimestamp() + "");
            processInfo.put("event_timestamp_adjusted_reason", timeShiftInfo.getReason());
        }
        clickstreamEvent.setProcessInfo(processInfo);
    }


    private String buildTrafficSourceClidJson(final String type, final String value) {
        return "{\"type\":\"" + type + "\",\"value\":\"" + value + "\"}";
    }

    private void setEventBundleSeqId(final Map<String, List<String>> uriParams, final ClickstreamEvent clickstreamEvent) {
        String eventBundleId = uriParams.get("event_bundle_sequence_id") == null ? null : uriParams.get("event_bundle_sequence_id").get(0);
        try {
            Long eventBundleIdLong = eventBundleId == null ? null : Long.parseLong(eventBundleId);
            clickstreamEvent.setEventBundleSequenceId(eventBundleIdLong);
        } catch (Exception e) {
            log.warn("cannot parse event_bundle_sequence_id: " + eventBundleId + ERROR_LOG + e.getMessage());
        }
    }

    private void setEventValue(final Event ingestEvent, final ClickstreamEvent clickstreamEvent) {
        clickstreamEvent.setEventValue(ingestEvent.getEventValue());
        if (clickstreamEvent.getEventValue() != null) {
            clickstreamEvent.setEventValueCurrency(ingestEvent.getEventValueCurrency() == null ? "USD" : ingestEvent.getEventValueCurrency());
        }
    }

}
