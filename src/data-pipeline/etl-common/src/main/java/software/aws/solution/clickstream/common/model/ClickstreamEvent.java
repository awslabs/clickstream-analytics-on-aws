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

package software.aws.solution.clickstream.common.model;


import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.module.SimpleModule;
import lombok.*;
import lombok.extern.slf4j.*;
import software.aws.solution.clickstream.common.Constant;
import software.aws.solution.clickstream.common.Util;

import java.sql.*;
import java.util.*;


@Setter
@Getter
@Slf4j
public class ClickstreamEvent {
    @JsonProperty(Constant.EVENT_TIMESTAMP)
    private Timestamp eventTimestamp;  //NOSONAR
    @JsonProperty(Constant.EVENT_ID)
    private String eventId;  //NOSONAR
    @JsonProperty(Constant.EVENT_TIME_MSEC)
    private Long eventTimeMsec;  //NOSONAR
    @JsonProperty(Constant.EVENT_NAME)
    private String eventName;  //NOSONAR
    @JsonProperty(Constant.EVENT_VALUE)
    private Double eventValue;  //NOSONAR
    @JsonProperty(Constant.EVENT_VALUE_CURRENCY)
    private String eventValueCurrency;  //NOSONAR
    @JsonProperty(Constant.EVENT_BUNDLE_SEQUENCE_ID)
    private Long eventBundleSequenceId;  //NOSONAR
    @JsonProperty(Constant.INGEST_TIME_MSEC)
    private Long ingestTimeMsec;  //NOSONAR
    @JsonProperty(Constant.DEVICE_MOBILE_BRAND_NAME)
    private String deviceMobileBrandName;  //NOSONAR
    @JsonProperty(Constant.DEVICE_MOBILE_MODEL_NAME)
    private String deviceMobileModelName;  //NOSONAR
    @JsonProperty(Constant.DEVICE_MANUFACTURER)
    private String deviceManufacturer;  //NOSONAR
    @JsonProperty(Constant.DEVICE_CARRIER)
    private String deviceCarrier;  //NOSONAR
    @JsonProperty(Constant.DEVICE_NETWORK_TYPE)
    private String deviceNetworkType;  //NOSONAR
    @JsonProperty(Constant.DEVICE_OPERATING_SYSTEM)
    private String deviceOperatingSystem;  //NOSONAR
    @JsonProperty(Constant.DEVICE_OPERATING_SYSTEM_VERSION)
    private String deviceOperatingSystemVersion;  //NOSONAR
    @JsonProperty(Constant.DEVICE_VENDOR_ID)
    private String deviceVendorId;  //NOSONAR
    @JsonProperty(Constant.DEVICE_ADVERTISING_ID)
    private String deviceAdvertisingId;  //NOSONAR
    @JsonProperty(Constant.DEVICE_SYSTEM_LANGUAGE)
    private String deviceSystemLanguage;  //NOSONAR
    @JsonProperty(Constant.DEVICE_TIME_ZONE_OFFSET_SECONDS)
    private Integer deviceTimeZoneOffsetSeconds;  //NOSONAR
    @JsonProperty(Constant.DEVICE_UA_BROWSER)
    private String deviceUaBrowser;  //NOSONAR
    @JsonProperty(Constant.DEVICE_UA_BROWSER_VERSION)
    private String deviceUaBrowserVersion;  //NOSONAR
    @JsonProperty(Constant.DEVICE_UA_OS)
    private String deviceUaOs;  //NOSONAR
    @JsonProperty(Constant.DEVICE_UA_OS_VERSION)
    private String deviceUaOsVersion;  //NOSONAR
    @JsonProperty(Constant.DEVICE_UA_DEVICE)
    private String deviceUaDevice;  //NOSONAR
    @JsonProperty(Constant.DEVICE_UA_DEVICE_CATEGORY)
    private String deviceUaDeviceCategory;  //NOSONAR
    @JsonProperty(Constant.DEVICE_UA)
    private Map<String, Object> deviceUa;  //NOSONAR
    @JsonProperty(Constant.DEVICE_SCREEN_WIDTH)
    private Integer deviceScreenWidth;  //NOSONAR
    @JsonProperty(Constant.DEVICE_SCREEN_HEIGHT)
    private Integer deviceScreenHeight;  //NOSONAR
    @JsonProperty(Constant.DEVICE_VIEWPORT_WIDTH)
    private Integer deviceViewportWidth;  //NOSONAR
    @JsonProperty(Constant.DEVICE_VIEWPORT_HEIGHT)
    private Integer deviceViewportHeight;  //NOSONAR
    @JsonProperty(Constant.GEO_CONTINENT)
    private String geoContinent;  //NOSONAR
    @JsonProperty(Constant.GEO_SUB_CONTINENT)
    private String geoSubContinent;  //NOSONAR
    @JsonProperty(Constant.GEO_COUNTRY)
    private String geoCountry;  //NOSONAR
    @JsonProperty(Constant.GEO_REGION)
    private String geoRegion;  //NOSONAR
    @JsonProperty(Constant.GEO_METRO)
    private String geoMetro;  //NOSONAR
    @JsonProperty(Constant.GEO_CITY)
    private String geoCity;  //NOSONAR
    @JsonProperty(Constant.GEO_LOCALE)
    private String geoLocale;  //NOSONAR
    @JsonProperty(Constant.TRAFFIC_SOURCE_SOURCE)
    private String trafficSourceSource;  //NOSONAR
    @JsonProperty(Constant.TRAFFIC_SOURCE_MEDIUM)
    private String trafficSourceMedium;  //NOSONAR
    @JsonProperty(Constant.TRAFFIC_SOURCE_CAMPAIGN)
    private String trafficSourceCampaign;  //NOSONAR
    @JsonProperty(Constant.TRAFFIC_SOURCE_CONTENT)
    private String trafficSourceContent;  //NOSONAR
    @JsonProperty(Constant.TRAFFIC_SOURCE_TERM)
    private String trafficSourceTerm;  //NOSONAR
    @JsonProperty(Constant.TRAFFIC_SOURCE_CAMPAIGN_ID)
    private String trafficSourceCampaignId;  //NOSONAR
    @JsonProperty(Constant.TRAFFIC_SOURCE_CLID_PLATFORM)
    private String trafficSourceClidPlatform;  //NOSONAR
    @JsonProperty(Constant.TRAFFIC_SOURCE_CLID)
    private String trafficSourceClid;  //NOSONAR
    @JsonProperty(Constant.TRAFFIC_SOURCE_CHANNEL_GROUP)
    private String trafficSourceChannelGroup;  //NOSONAR
    @JsonProperty(Constant.TRAFFIC_SOURCE_CATEGORY)
    private String trafficSourceCategory;  //NOSONAR
    @JsonProperty(Constant.USER_FIRST_TOUCH_TIME_MSEC)
    private Long userFirstTouchTimeMsec;  //NOSONAR
    @JsonProperty(Constant.APP_PACKAGE_ID)
    private String appPackageId;  //NOSONAR
    @JsonProperty(Constant.APP_VERSION)
    private String appVersion;  //NOSONAR
    @JsonProperty(Constant.APP_TITLE)
    private String appTitle;  //NOSONAR
    @JsonProperty(Constant.APP_INSTALL_SOURCE)
    private String appInstallSource;  //NOSONAR
    @JsonProperty(Constant.PLATFORM)
    private String platform;  //NOSONAR
    @JsonProperty(Constant.PROJECT_ID)
    private String projectId;  //NOSONAR
    @JsonProperty(Constant.APP_ID)
    private String appId;  //NOSONAR
    @JsonProperty(Constant.SCREEN_VIEW_SCREEN_NAME)
    private String screenViewScreenName;  //NOSONAR
    @JsonProperty(Constant.SCREEN_VIEW_SCREEN_ID)
    private String screenViewScreenId;  //NOSONAR
    @JsonProperty(Constant.SCREEN_VIEW_SCREEN_UNIQUE_ID)
    private String screenViewScreenUniqueId;  //NOSONAR
    @JsonProperty(Constant.SCREEN_VIEW_PREVIOUS_SCREEN_NAME)
    private String screenViewPreviousScreenName;  //NOSONAR
    @JsonProperty(Constant.SCREEN_VIEW_PREVIOUS_SCREEN_ID)
    private String screenViewPreviousScreenId;  //NOSONAR
    @JsonProperty(Constant.SCREEN_VIEW_PREVIOUS_SCREEN_UNIQUE_ID)
    private String screenViewPreviousScreenUniqueId;  //NOSONAR
    @JsonProperty(Constant.SCREEN_VIEW_PREVIOUS_TIME_MSEC)
    private Long screenViewPreviousTimeMsec;  //NOSONAR
    @JsonProperty(Constant.SCREEN_VIEW_ENGAGEMENT_TIME_MSEC)
    private Long screenViewEngagementTimeMsec;  //NOSONAR
    @JsonProperty(Constant.SCREEN_VIEW_ENTRANCES)
    private Boolean screenViewEntrances;  //NOSONAR
    @JsonProperty(Constant.PAGE_VIEW_PAGE_REFERRER)
    private String pageViewPageReferrer;  //NOSONAR
    @JsonProperty(Constant.PAGE_VIEW_PAGE_REFERRER_TITLE)
    private String pageViewPageReferrerTitle;  //NOSONAR
    @JsonProperty(Constant.PAGE_VIEW_PREVIOUS_TIME_MSEC)
    private Long pageViewPreviousTimeMsec;  //NOSONAR
    @JsonProperty(Constant.PAGE_VIEW_ENGAGEMENT_TIME_MSEC)
    private Long pageViewEngagementTimeMsec;  //NOSONAR
    @JsonProperty(Constant.PAGE_VIEW_PAGE_TITLE)
    private String pageViewPageTitle;  //NOSONAR
    @JsonProperty(Constant.PAGE_VIEW_PAGE_URL)
    private String pageViewPageUrl;  //NOSONAR
    @JsonProperty(Constant.PAGE_VIEW_PAGE_URL_PATH)
    private String pageViewPageUrlPath;  //NOSONAR
    @JsonProperty(Constant.PAGE_VIEW_PAGE_URL_QUERY_PARAMETERS)
    private Map<String, String> pageViewPageUrlQueryParameters;  //NOSONAR
    @JsonProperty(Constant.PAGE_VIEW_HOSTNAME)
    private String pageViewHostname;  //NOSONAR
    @JsonProperty(Constant.PAGE_VIEW_LATEST_REFERRER)
    private String pageViewLatestReferrer;  //NOSONAR
    @JsonProperty(Constant.PAGE_VIEW_LATEST_REFERRER_HOST)
    private String pageViewLatestReferrerHost;  //NOSONAR
    @JsonProperty(Constant.PAGE_VIEW_ENTRANCES)
    private Boolean pageViewEntrances;  //NOSONAR
    @JsonProperty(Constant.APP_START_IS_FIRST_TIME)
    private Boolean appStartIsFirstTime;  //NOSONAR
    @JsonProperty(Constant.UPGRADE_PREVIOUS_APP_VERSION)
    private String upgradePreviousAppVersion;  //NOSONAR
    @JsonProperty(Constant.UPGRADE_PREVIOUS_OS_VERSION)
    private String upgradePreviousOsVersion;  //NOSONAR
    @JsonProperty(Constant.SEARCH_KEY)
    private String searchKey;  //NOSONAR
    @JsonProperty(Constant.SEARCH_TERM)
    private String searchTerm;  //NOSONAR
    @JsonProperty(Constant.OUTBOUND_LINK_CLASSES)
    private String outboundLinkClasses;  //NOSONAR
    @JsonProperty(Constant.OUTBOUND_LINK_DOMAIN)
    private String outboundLinkDomain;  //NOSONAR
    @JsonProperty(Constant.OUTBOUND_LINK_ID)
    private String outboundLinkId;  //NOSONAR
    @JsonProperty(Constant.OUTBOUND_LINK_URL)
    private String outboundLinkUrl;  //NOSONAR
    @JsonProperty(Constant.OUTBOUND_LINK)
    private Boolean outboundLink;  //NOSONAR
    @JsonProperty(Constant.USER_ENGAGEMENT_TIME_MSEC)
    private Long userEngagementTimeMsec;  //NOSONAR
    @JsonProperty(Constant.USER_ID)
    private String userId;  //NOSONAR
    @JsonProperty(Constant.USER_PSEUDO_ID)
    private String userPseudoId;  //NOSONAR
    @JsonProperty(Constant.SESSION_ID)
    private String sessionId;  //NOSONAR
    @JsonProperty(Constant.SESSION_START_TIME_MSEC)
    private Long sessionStartTimeMsec;  //NOSONAR
    @JsonProperty(Constant.SESSION_DURATION)
    private Long sessionDuration;  //NOSONAR
    @JsonProperty(Constant.SESSION_NUMBER)
    private Long sessionNumber;  //NOSONAR
    @JsonProperty(Constant.SCROLL_ENGAGEMENT_TIME_MSEC)
    private Long scrollEngagementTimeMsec;  //NOSONAR
    @JsonProperty(Constant.SDK_ERROR_CODE)
    private String sdkErrorCode;  //NOSONAR
    @JsonProperty(Constant.SDK_ERROR_MESSAGE)
    private String sdkErrorMessage;  //NOSONAR
    @JsonProperty(Constant.SDK_VERSION)
    private String sdkVersion;  //NOSONAR
    @JsonProperty(Constant.SDK_NAME)
    private String sdkName;  //NOSONAR
    @JsonProperty(Constant.APP_EXCEPTION_MESSAGE)
    private String appExceptionMessage;  //NOSONAR
    @JsonProperty(Constant.APP_EXCEPTION_STACK)
    private String appExceptionStack;  //NOSONAR
    @JsonProperty(Constant.CUSTOM_PARAMETERS)
    private Map<String, ClickstreamEventPropValue> customParameters;  //NOSONAR
    @JsonProperty(Constant.PROCESS_INFO)
    private Map<String, String> processInfo;  //NOSONAR

    // ignore the following fields when deserialize to json
    @JsonIgnore()
    private String ua;  //NOSONAR
    @JsonIgnore()
    private String ip;  //NOSONAR

    public static ClickstreamEvent deepCopy(final ClickstreamEvent csEvent) {
        ClickstreamEvent newCsEvent = new ClickstreamEvent();
        newCsEvent.setEventTimestamp(csEvent.getEventTimestamp());
        newCsEvent.setEventId(csEvent.getEventId());
        newCsEvent.setEventTimeMsec(csEvent.getEventTimeMsec());
        newCsEvent.setEventName(csEvent.getEventName());
        newCsEvent.setEventValue(csEvent.getEventValue());
        newCsEvent.setEventValueCurrency(csEvent.getEventValueCurrency());
        newCsEvent.setEventBundleSequenceId(csEvent.getEventBundleSequenceId());
        newCsEvent.setIngestTimeMsec(csEvent.getIngestTimeMsec());
        newCsEvent.setDeviceMobileBrandName(csEvent.getDeviceMobileBrandName());
        newCsEvent.setDeviceMobileModelName(csEvent.getDeviceMobileModelName());
        newCsEvent.setDeviceManufacturer(csEvent.getDeviceManufacturer());
        newCsEvent.setDeviceCarrier(csEvent.getDeviceCarrier());
        newCsEvent.setDeviceNetworkType(csEvent.getDeviceNetworkType());
        newCsEvent.setDeviceOperatingSystem(csEvent.getDeviceOperatingSystem());
        newCsEvent.setDeviceOperatingSystemVersion(csEvent.getDeviceOperatingSystemVersion());
        newCsEvent.setDeviceVendorId(csEvent.getDeviceVendorId());
        newCsEvent.setDeviceAdvertisingId(csEvent.getDeviceAdvertisingId());
        newCsEvent.setDeviceSystemLanguage(csEvent.getDeviceSystemLanguage());
        newCsEvent.setDeviceTimeZoneOffsetSeconds(csEvent.getDeviceTimeZoneOffsetSeconds());
        newCsEvent.setDeviceUaBrowser(csEvent.getDeviceUaBrowser());
        newCsEvent.setDeviceUaBrowserVersion(csEvent.getDeviceUaBrowserVersion());
        newCsEvent.setDeviceUaOs(csEvent.getDeviceUaOs());
        newCsEvent.setDeviceUaOsVersion(csEvent.getDeviceUaOsVersion());
        newCsEvent.setDeviceUaDevice(csEvent.getDeviceUaDevice());
        newCsEvent.setDeviceUaDeviceCategory(csEvent.getDeviceUaDeviceCategory());
        if (csEvent.getDeviceUa() != null) {
            newCsEvent.setDeviceUa(new HashMap<>(csEvent.getDeviceUa()));
        }
        newCsEvent.setGeoContinent(csEvent.getGeoContinent());
        newCsEvent.setGeoSubContinent(csEvent.getGeoSubContinent());
        newCsEvent.setGeoCountry(csEvent.getGeoCountry());
        newCsEvent.setGeoRegion(csEvent.getGeoRegion());
        newCsEvent.setGeoMetro(csEvent.getGeoMetro());
        newCsEvent.setGeoCity(csEvent.getGeoCity());
        newCsEvent.setGeoLocale(csEvent.getGeoLocale());
        newCsEvent.setTrafficSourceSource(csEvent.getTrafficSourceSource());
        newCsEvent.setTrafficSourceMedium(csEvent.getTrafficSourceMedium());
        newCsEvent.setTrafficSourceCampaign(csEvent.getTrafficSourceCampaign());
        newCsEvent.setTrafficSourceContent(csEvent.getTrafficSourceContent());
        newCsEvent.setTrafficSourceTerm(csEvent.getTrafficSourceTerm());
        newCsEvent.setTrafficSourceCampaignId(csEvent.getTrafficSourceCampaignId());
        newCsEvent.setTrafficSourceClidPlatform(csEvent.getTrafficSourceClidPlatform());
        newCsEvent.setTrafficSourceClid(csEvent.getTrafficSourceClid());
        newCsEvent.setTrafficSourceChannelGroup(csEvent.getTrafficSourceChannelGroup());
        newCsEvent.setTrafficSourceCategory(csEvent.getTrafficSourceCategory());
        newCsEvent.setUserFirstTouchTimeMsec(csEvent.getUserFirstTouchTimeMsec());
        newCsEvent.setAppPackageId(csEvent.getAppPackageId());
        newCsEvent.setAppId(csEvent.getAppId());
        newCsEvent.setAppVersion(csEvent.getAppVersion());
        newCsEvent.setAppTitle(csEvent.getAppTitle());
        newCsEvent.setAppInstallSource(csEvent.getAppInstallSource());
        newCsEvent.setPlatform(csEvent.getPlatform());
        newCsEvent.setProjectId(csEvent.getProjectId());
        newCsEvent.setScreenViewScreenName(csEvent.getScreenViewScreenName());
        newCsEvent.setScreenViewScreenId(csEvent.getScreenViewScreenId());
        newCsEvent.setScreenViewScreenUniqueId(csEvent.getScreenViewScreenUniqueId());
        newCsEvent.setScreenViewPreviousScreenName(csEvent.getScreenViewPreviousScreenName());
        newCsEvent.setScreenViewPreviousScreenId(csEvent.getScreenViewPreviousScreenId());
        newCsEvent.setScreenViewPreviousScreenUniqueId(csEvent.getScreenViewPreviousScreenUniqueId());
        newCsEvent.setScreenViewPreviousTimeMsec(csEvent.getScreenViewPreviousTimeMsec());
        newCsEvent.setScreenViewEngagementTimeMsec(csEvent.getScreenViewEngagementTimeMsec());
        newCsEvent.setScreenViewEntrances(csEvent.getScreenViewEntrances());
        newCsEvent.setPageViewPageReferrer(csEvent.getPageViewPageReferrer());
        newCsEvent.setPageViewPageReferrerTitle(csEvent.getPageViewPageReferrerTitle());
        newCsEvent.setPageViewPreviousTimeMsec(csEvent.getPageViewPreviousTimeMsec());
        newCsEvent.setPageViewEngagementTimeMsec(csEvent.getPageViewEngagementTimeMsec());
        newCsEvent.setPageViewPageTitle(csEvent.getPageViewPageTitle());
        newCsEvent.setPageViewPageUrl(csEvent.getPageViewPageUrl());
        newCsEvent.setPageViewPageUrlPath(csEvent.getPageViewPageUrlPath());
        if (csEvent.getPageViewPageUrlQueryParameters() != null) {
            newCsEvent.setPageViewPageUrlQueryParameters(new HashMap<>(csEvent.getPageViewPageUrlQueryParameters()));
        }
        newCsEvent.setPageViewHostname(csEvent.getPageViewHostname());
        newCsEvent.setPageViewLatestReferrer(csEvent.getPageViewLatestReferrer());
        newCsEvent.setPageViewLatestReferrerHost(csEvent.getPageViewLatestReferrerHost());
        newCsEvent.setPageViewEntrances(csEvent.getPageViewEntrances());
        newCsEvent.setAppStartIsFirstTime(csEvent.getAppStartIsFirstTime());
        newCsEvent.setUpgradePreviousAppVersion(csEvent.getUpgradePreviousAppVersion());
        newCsEvent.setUpgradePreviousOsVersion(csEvent.getUpgradePreviousOsVersion());
        newCsEvent.setSearchKey(csEvent.getSearchKey());
        newCsEvent.setSearchTerm(csEvent.getSearchTerm());
        newCsEvent.setOutboundLinkClasses(csEvent.getOutboundLinkClasses());
        newCsEvent.setOutboundLinkDomain(csEvent.getOutboundLinkDomain());
        newCsEvent.setOutboundLinkId(csEvent.getOutboundLinkId());
        newCsEvent.setOutboundLinkUrl(csEvent.getOutboundLinkUrl());
        newCsEvent.setOutboundLink(csEvent.getOutboundLink());
        newCsEvent.setUserEngagementTimeMsec(csEvent.getUserEngagementTimeMsec());
        newCsEvent.setUserId(csEvent.getUserId());
        newCsEvent.setUserPseudoId(csEvent.getUserPseudoId());
        newCsEvent.setSessionId(csEvent.getSessionId());
        newCsEvent.setSessionStartTimeMsec(csEvent.getSessionStartTimeMsec());
        newCsEvent.setSessionDuration(csEvent.getSessionDuration());
        newCsEvent.setSessionNumber(csEvent.getSessionNumber());
        newCsEvent.setScrollEngagementTimeMsec(csEvent.getScrollEngagementTimeMsec());
        newCsEvent.setSdkErrorCode(csEvent.getSdkErrorCode());
        newCsEvent.setSdkErrorMessage(csEvent.getSdkErrorMessage());
        newCsEvent.setSdkVersion(csEvent.getSdkVersion());
        newCsEvent.setSdkName(csEvent.getSdkName());
        newCsEvent.setAppExceptionMessage(csEvent.getAppExceptionMessage());
        newCsEvent.setAppExceptionStack(csEvent.getAppExceptionStack());
        if (csEvent.getCustomParameters() != null) {
            newCsEvent.setCustomParameters(new HashMap<>(csEvent.getCustomParameters()));
        }
        if (csEvent.getProcessInfo() != null) {
            newCsEvent.setProcessInfo(new HashMap<>(csEvent.getProcessInfo()));
        }
        newCsEvent.setUa(csEvent.getUa());
        newCsEvent.setIp(csEvent.getIp());
        return newCsEvent;
    }

    public String toJson() {
        ObjectMapper objectMapper = new ObjectMapper();
        objectMapper.registerModule(new SimpleModule().addSerializer(ClickstreamEventPropValue.class, new ClickstreamEventPropValueSerializer()));
        try {
            return objectMapper.writeValueAsString(this);
        } catch (Exception e) {
            log.error("Failed to serialize ClickstreamEvent to json", e);
            log.error(Util.getStackTrace(e));
            return null;
        }
    }

}
