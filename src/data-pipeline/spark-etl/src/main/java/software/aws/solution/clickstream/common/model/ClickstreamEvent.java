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


import lombok.*;
import lombok.extern.slf4j.*;

import java.sql.*;
import java.util.*;


@Setter
@Getter
@Slf4j
public class ClickstreamEvent {
    private Timestamp eventTimestamp;
    private String eventId;
    private Long eventTimeMsec;
    private String eventName;
    private Double eventValue;
    private String eventValueCurrency;
    private Long eventBundleSequenceId;
    private Long ingestTimeMsec;
    private String deviceMobileBrandName;
    private String deviceMobileModelName;
    private String deviceManufacturer;
    private String deviceCarrier;
    private String deviceNetworkType;
    private String deviceOperatingSystem;
    private String deviceOperatingSystemVersion;
    private String deviceVendorId;
    private String deviceAdvertisingId;
    private String deviceSystemLanguage;
    private Integer deviceTimeZoneOffsetSeconds;
    private String deviceUaBrowser;
    private String deviceUaBrowserVersion;
    private String deviceUaOs;
    private String deviceUaOsVersion;
    private String deviceUaDevice;
    private String deviceUaDeviceCategory;
    private Map<String, Object> deviceUa;
    private Integer deviceScreenWidth;
    private Integer deviceScreenHeight;
    private Integer deviceViewportWidth;
    private Integer deviceViewportHeight;
    private String geoContinent;
    private String geoSubContinent;
    private String geoCountry;
    private String geoRegion;
    private String geoMetro;
    private String geoCity;
    private String geoLocale;
    private String trafficSourceSource;
    private String trafficSourceMedium;
    private String trafficSourceCampaign;
    private String trafficSourceContent;
    private String trafficSourceTerm;
    private String trafficSourceCampaignId;
    private String trafficSourceClidPlatform;
    private String trafficSourceClid;
    private String trafficSourceChannelGroup;
    private String trafficSourceCategory;
    private Long userFirstTouchTimeMsec;
    private String appPackageId;
    private String appVersion;
    private String appTitle;
    private String appInstallSource;
    private String platform;
    private String projectId;
    private String appId;
    private String screenViewScreenName;
    private String screenViewScreenId;
    private String screenViewScreenUniqueId;
    private String screenViewPreviousScreenName;
    private String screenViewPreviousScreenId;
    private String screenViewPreviousScreenUniqueId;
    private Long screenViewPreviousTimeMsec;
    private Long screenViewEngagementTimeMsec;
    private Boolean screenViewEntrances;
    private String pageViewPageReferrer;
    private String pageViewPageReferrerTitle;
    private Long pageViewPreviousTimeMsec;
    private Long pageViewEngagementTimeMsec;
    private String pageViewPageTitle;
    private String pageViewPageUrl;
    private String pageViewPageUrlPath;
    private Map<String, String> pageViewPageUrlQueryParameters;
    private String pageViewHostname;
    private String pageViewLatestReferrer;
    private String pageViewLatestReferrerHost;
    private Boolean pageViewEntrances;
    private Boolean appStartIsFirstTime;
    private String upgradePreviousAppVersion;
    private String upgradePreviousOsVersion;
    private String searchKey;
    private String searchTerm;
    private String outboundLinkClasses;
    private String outboundLinkDomain;
    private String outboundLinkId;
    private String outboundLinkUrl;
    private Boolean outboundLink;
    private Long userEngagementTimeMsec;
    private String userId;
    private String userPseudoId;
    private String sessionId;
    private Long sessionStartTimeMsec;
    private Long sessionDuration;
    private Long sessionNumber;
    private Long scrollEngagementTimeMsec;
    private String sdkErrorCode;
    private String sdkErrorMessage;
    private String sdkVersion;
    private String sdkName;
    private String appExceptionMessage;
    private String appExceptionStack;
    private Map<String, ClickstreamEventPropValue> customParameters;
    private Map<String, String> processInfo;
    private String ua;
    private String ip;

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

}
