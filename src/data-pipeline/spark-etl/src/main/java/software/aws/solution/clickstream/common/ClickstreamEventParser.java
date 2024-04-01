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
import lombok.extern.slf4j.*;
import software.aws.solution.clickstream.common.enrich.*;
import software.aws.solution.clickstream.common.ingest.*;
import software.aws.solution.clickstream.common.model.*;

import java.net.*;
import java.sql.*;
import java.time.*;
import java.util.*;

import static software.aws.solution.clickstream.util.DatasetUtil.*;
import static software.aws.solution.clickstream.common.enrich.DefaultTrafficSourceHelper.*;
import static software.aws.solution.clickstream.TransformerV3.*;
import static software.aws.solution.clickstream.util.Utils.*;
import static software.aws.solution.clickstream.common.Util.*;


@Slf4j
public final class ClickstreamEventParser extends BaseEventParser {
    private static final ClickstreamEventParser INSTANCE = new ClickstreamEventParser();
    public static final String ENABLE_EVENT_TIME_SHIFT_PROP =  "enable.event.time.shift";

    private ClickstreamEventParser() {
    }

    public static ClickstreamEventParser getInstance() {
        return INSTANCE;
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
        setTrafficSource(ingestEvent, clickstreamEvent);
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

        UrlParseResult urlParseResult = parseUrl(ingestEvent.getAttributes().getPageUrl());
        if (urlParseResult != null) {
            clickstreamEvent.setPageViewPageUrlPath(urlParseResult.getPath());
            clickstreamEvent.setPageViewPageUrlQueryParameters(convertUriParamsToStrMap(urlParseResult.getQueryParameters()));
            clickstreamEvent.setPageViewHostname(urlParseResult.getHostName());
        }

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
        clickstreamEvent.setTrafficSourceSource(ingestEvent.getAttributes().getTrafficSourceSource());
        clickstreamEvent.setTrafficSourceMedium(ingestEvent.getAttributes().getTrafficSourceMedium());
        clickstreamEvent.setTrafficSourceCampaign(ingestEvent.getAttributes().getTrafficSourceCampaign());
        clickstreamEvent.setTrafficSourceContent(ingestEvent.getAttributes().getTrafficSourceContent());
        clickstreamEvent.setTrafficSourceTerm(ingestEvent.getAttributes().getTrafficSourceTerm());
        clickstreamEvent.setTrafficSourceCampaignId(ingestEvent.getAttributes().getTrafficSourceCampaignId());
        clickstreamEvent.setTrafficSourceClidPlatform(ingestEvent.getAttributes().getTrafficSourceClidPlatform());
        clickstreamEvent.setTrafficSourceClid(ingestEvent.getAttributes().getTrafficSourceClid());
        clickstreamEvent.setTrafficSourceChannelGroup(ingestEvent.getAttributes().getTrafficSourceChannelGroup());
        clickstreamEvent.setTrafficSourceCategory(ingestEvent.getAttributes().getTrafficSourceCategory());

        if (clickstreamEvent.getTrafficSourceSource() == null) {
            clickstreamEvent.setTrafficSourceSource(ingestEvent.getAttributes().getUtmSource());
            clickstreamEvent.setTrafficSourceMedium(ingestEvent.getAttributes().getUtmMedium());
            clickstreamEvent.setTrafficSourceCampaign(ingestEvent.getAttributes().getUtmCampaign());
            clickstreamEvent.setTrafficSourceContent(ingestEvent.getAttributes().getUtmContent());
            clickstreamEvent.setTrafficSourceTerm(ingestEvent.getAttributes().getUtmTerm());
            clickstreamEvent.setTrafficSourceCampaignId(ingestEvent.getAttributes().getUtmId());
            clickstreamEvent.setTrafficSourceClidPlatform(ingestEvent.getAttributes().getUtmSourcePlatform());
        }

        if (ingestEvent.getAttributes().getGclid() != null && clickstreamEvent.getTrafficSourceClid() == null) {
            clickstreamEvent.setTrafficSourceClid(buildTrafficSourceClidJson(GCLID, ingestEvent.getAttributes().getGclid()));
            if (clickstreamEvent.getTrafficSourceSource() == null) {
                clickstreamEvent.setTrafficSourceSource(GOOGLE);
            }
        }

        if (clickstreamEvent.getTrafficSourceSource() != null) {
            setTrafficChannelAndCategory(clickstreamEvent);
        } else {
            setTrafficSourceBySourceParser(clickstreamEvent);
        }
    }

    private void setTrafficChannelAndCategory(final ClickstreamEvent clickstreamEvent) {
        if (clickstreamEvent.getTrafficSourceCategory() == null) {
            clickstreamEvent.setTrafficSourceCategory(
                    DefaultTrafficSourceHelper.getCategory(clickstreamEvent.getTrafficSourceSource())
            );
        }
        if (clickstreamEvent.getTrafficSourceChannelGroup() == null) {
            clickstreamEvent.setTrafficSourceChannelGroup(
                    DefaultTrafficSourceHelper.getChannelGroup(
                            clickstreamEvent.getTrafficSourceSource(),
                            clickstreamEvent.getTrafficSourceMedium(),
                            clickstreamEvent.getTrafficSourceCampaign())
            );
        }
    }

    private void setTrafficSourceBySourceParser(final ClickstreamEvent clickstreamEvent) {
        DefaultTrafficSourceHelper trafficSourceParser = DefaultTrafficSourceHelper.getInstance();
        DefaultTrafficSourceHelper.ParserResult parserResult = null;
        try {
            if (clickstreamEvent.getPageViewPageUrl() != null) {
                String refferr = clickstreamEvent.getPageViewPageReferrer();
                if (refferr == null) {
                    refferr = clickstreamEvent.getPageViewLatestReferrer();
                }
                parserResult = trafficSourceParser.parse(clickstreamEvent.getPageViewPageUrl(), refferr);
            } else if (clickstreamEvent.getPageViewLatestReferrer() != null) {
                parserResult = trafficSourceParser.parse(clickstreamEvent.getPageViewLatestReferrer(), null);
            }
        } catch (URISyntaxException | JsonProcessingException e) {
            log.error("cannot parse pageViewPageUrl or pageViewPageReferrer"
                    + ERROR_LOG + e.getMessage()
                    + VALUE_LOG
                    + " url: " + clickstreamEvent.getPageViewPageUrl()
                    + ", referrer:" + clickstreamEvent.getPageViewPageReferrer()
                    + ", latestReferrer: " + clickstreamEvent.getPageViewLatestReferrer());
            log.error(getStackTrace(e));
        }

        if (parserResult != null && parserResult.getTrafficSource() != null) {
            clickstreamEvent.setTrafficSourceSource(parserResult.getTrafficSource().getSource());
            clickstreamEvent.setTrafficSourceMedium(parserResult.getTrafficSource().getMedium());
            clickstreamEvent.setTrafficSourceCampaign(parserResult.getTrafficSource().getCampaign());
            clickstreamEvent.setTrafficSourceContent(parserResult.getTrafficSource().getContent());
            clickstreamEvent.setTrafficSourceTerm(parserResult.getTrafficSource().getTerm());
            clickstreamEvent.setTrafficSourceCampaignId(parserResult.getTrafficSource().getCampaignId());
            clickstreamEvent.setTrafficSourceClidPlatform(parserResult.getTrafficSource().getClidPlatform());
            clickstreamEvent.setTrafficSourceClid(parserResult.getTrafficSource().getClid());
            clickstreamEvent.setTrafficSourceChannelGroup(parserResult.getTrafficSource().getChannelGroup());
            clickstreamEvent.setTrafficSourceCategory(parserResult.getTrafficSource().getCategory());
        }
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
