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

import java.sql.*;
import java.time.*;
import java.util.*;

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

    private Map<String, RuleConfig> appRuleConfig;

    private ClickstreamEventParser(final Map<String, RuleConfig> appRuleConfig) {
        this.appRuleConfig = appRuleConfig;
    }

    public static ClickstreamEventParser getInstance() {
        // use default config rule in java resource file
        return getInstance(null);
    }

    public static ClickstreamEventParser getInstance(final Map<String, RuleConfig> appRuleConfig) {
        if (instance == null) {
            instance = new ClickstreamEventParser(appRuleConfig);
        }
         return instance;
    }
    Event ingestDataToEvent(final String data) throws JsonProcessingException {
        return getObjectMapper().readValue(data, Event.class);
    }

    @Override
    public ParseDataResult parseData(final String dataString, final ExtraParams extraParams, final int index) throws JsonProcessingException {
        Event ingestEvent = ingestDataToEvent(dataString);

        TimeShiftInfo timeShiftInfo = getEventTimeShiftInfo(ingestEvent, extraParams);

        ClickstreamEvent clickstreamEvent = getClickstreamEvent(ingestEvent, index, extraParams, timeShiftInfo);
        List<ClickstreamEvent> clickstreamEventList = new ArrayList<>();
        clickstreamEventList.add(clickstreamEvent);

        // User
        ClickstreamUser clickstreamUser = getClickstreamUser(ingestEvent, clickstreamEvent, timeShiftInfo);
        // Items
        List<ClickstreamItem> clickstreamItemList = getClickstreamItemList(ingestEvent, clickstreamEvent);

        ParseDataResult parseDataResult = new ParseDataResult();
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
                clickstreamUser.setFirstVisitDate(new java.sql.Date(user.getUserFirstTouchTimestamp().getValue() + timeShiftInfo.getTimeDiff()));
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
        clickstreamEvent.setDeviceOperatingSystem(ingestEvent.getOsName());
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
        clickstreamEvent.setPageViewPageReferrer(ingestEvent.getAttributes().getPageReferrer());
        clickstreamEvent.setPageViewPageReferrerTitle(ingestEvent.getAttributes().getPageReferrerTitle());
        if (ingestEvent.getAttributes().getPreviousTimestamp() != null) {
            clickstreamEvent.setPageViewPreviousTimeMsec(ingestEvent.getAttributes().getPreviousTimestamp() + timeShiftInfo.getTimeDiff());
        }
        clickstreamEvent.setPageViewEngagementTimeMsec(ingestEvent.getAttributes().getEngagementTimeMsec());
        clickstreamEvent.setPageViewPageTitle(ingestEvent.getAttributes().getPageTitle());
        clickstreamEvent.setPageViewPageUrl(ingestEvent.getAttributes().getPageUrl());

        setPageViewUrl(clickstreamEvent, ingestEvent.getAttributes().getPageUrl());

        clickstreamEvent.setPageViewLatestReferrer(ingestEvent.getAttributes().getLatestReferrer());
        clickstreamEvent.setPageViewLatestReferrerHost(ingestEvent.getAttributes().getLatestReferrerHost());
        if (clickstreamEvent.getPageViewLatestReferrer() != null
                && clickstreamEvent.getPageViewLatestReferrerHost() == null) {
            UrlParseResult latestReferrerUrlParseResult = parseUrl(clickstreamEvent.getPageViewLatestReferrer());
            clickstreamEvent.setPageViewLatestReferrerHost(latestReferrerUrlParseResult.getHostName());
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

        if (ingestEvent.getAttributes().getPreviousTimestamp() != null) {
            clickstreamEvent.setScreenViewPreviousTimeMsec(ingestEvent.getAttributes().getPreviousTimestamp() + timeShiftInfo.getTimeDiff());
        }
        clickstreamEvent.setScreenViewEngagementTimeMsec(ingestEvent.getAttributes().getEngagementTimeMsec());
        clickstreamEvent.setScreenViewEntrances(ingestEvent.getAttributes().getEntrances());

    }

    private void setAppInfo(final Event ingestEvent, final ClickstreamEvent clickstreamEvent) {
        clickstreamEvent.setAppPackageId(ingestEvent.getAppPackageName());
        clickstreamEvent.setAppVersion(ingestEvent.getAppVersion());
        clickstreamEvent.setAppTitle(ingestEvent.getAppTitle());
        if (ingestEvent.getAttributes() != null) {
            clickstreamEvent.setAppInstallSource(ingestEvent.getAttributes().getChannel());
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

        log.info("setTrafficSource() platform: {}, source: {}", clickstreamEvent.getPlatform(), clientTsInfo.getSource());

        // TrafficSource is set by SDK, but category or channel not set
        if (clientTsInfo.getSource() != null && (clientTsInfo.getCategory() == null || clientTsInfo.getChannel() == null)) {
            String appId = clickstreamEvent.getAppId();
            RuleConfig ruleConfig = getAppRuleConfig() != null ? getAppRuleConfig().get(appId) : null;
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
                    clickstreamEvent.getPageViewLatestReferrer(),
                    clickstreamEvent.getPageViewLatestReferrerHost());

            clickstreamEvent.setTrafficSourceChannelGroup(ts.getChannelGroup());
            clickstreamEvent.setTrafficSourceCategory(ts.getCategory());
        }

        // not set by client SDK
        if (clientTsInfo.getSource() == null) {
            setTrafficSourceBySourceParser(clickstreamEvent);
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
    public Map<String, RuleConfig> getAppRuleConfig() {
        return this.appRuleConfig;
    }
    public void setAppRuleConfig(final Map<String, RuleConfig> appRuleConfig) {
        this.appRuleConfig = appRuleConfig;
    }

    private boolean isEnableEventTimeShift() {
        if (System.getProperty(ENABLE_EVENT_TIME_SHIFT_PROP) == null) {
            return false;
        }
        return Boolean.parseBoolean(System.getProperty(ENABLE_EVENT_TIME_SHIFT_PROP));
    }

    private TimeShiftInfo getEventTimeShiftInfo(final Event ingestEvent, final ExtraParams extraParams) {
        TimeShiftInfo timeShiftInfo = new TimeShiftInfo();

        Long eventTimestamp = ingestEvent.getEventTimestamp();
        Long uploadTimestamp = extraParams.getUploadTimestamp();

        timeShiftInfo.setAdjustThreshold(ADJUST_THRESHOLD);
        timeShiftInfo.setOriginEventTimestamp(eventTimestamp);
        timeShiftInfo.setEventTimestamp(eventTimestamp);
        timeShiftInfo.setIngestTimestamp(extraParams.getIngestTimestamp());
        timeShiftInfo.setAdjusted(false);
        timeShiftInfo.setTimeDiff(0L);
        timeShiftInfo.setUploadTimestamp(uploadTimestamp);

        if (!isEnableEventTimeShift()) {
            log.info("event time shift is disabled");
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
            if (Math.abs(timeDiff) > timeShiftInfo.getAdjustThreshold()) {
                timeShiftInfo.setTimeDiff(timeDiff);
                eventTimestamp += timeDiff;
                log.warn("ingestTimestamp is " + timeDiff + " seconds ahead of uploadTimestamp");
                timeShiftInfo.setAdjusted(true);
            }
            timeShiftInfo.setEventTimestamp(eventTimestamp);
        }

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
            processInfo.put("event_timestamp_adjusted_reason", "ingest_time is " + (timeShiftInfo.getTimeDiff() / 1000) + " seconds ahead of upload_time");
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
