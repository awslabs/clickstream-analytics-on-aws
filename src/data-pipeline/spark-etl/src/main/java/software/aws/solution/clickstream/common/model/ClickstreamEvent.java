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
    private Timestamp eventTimestamp;  //NOSONAR
    private String eventId;  //NOSONAR
    private Long eventTimeMsec;  //NOSONAR
    private String eventName;  //NOSONAR
    private Double eventValue;  //NOSONAR
    private String eventValueCurrency;  //NOSONAR
    private Long eventBundleSequenceId;  //NOSONAR
    private Long ingestTimeMsec;  //NOSONAR
    private String deviceMobileBrandName;  //NOSONAR
    private String deviceMobileModelName;  //NOSONAR
    private String deviceManufacturer;  //NOSONAR
    private String deviceCarrier;  //NOSONAR
    private String deviceNetworkType;  //NOSONAR
    private String deviceOperatingSystem;  //NOSONAR
    private String deviceOperatingSystemVersion;  //NOSONAR
    private String deviceVendorId;  //NOSONAR
    private String deviceAdvertisingId;  //NOSONAR
    private String deviceSystemLanguage;  //NOSONAR
    private Integer deviceTimeZoneOffsetSeconds;  //NOSONAR
    private String deviceUaBrowser;  //NOSONAR
    private String deviceUaBrowserVersion;  //NOSONAR
    private String deviceUaOs;  //NOSONAR
    private String deviceUaOsVersion;  //NOSONAR
    private String deviceUaDevice;  //NOSONAR
    private String deviceUaDeviceCategory;  //NOSONAR
    private Map<String, Object> deviceUa;  //NOSONAR
    private Integer deviceScreenWidth;  //NOSONAR
    private Integer deviceScreenHeight;  //NOSONAR
    private Integer deviceViewportWidth;  //NOSONAR
    private Integer deviceViewportHeight;  //NOSONAR
    private String geoContinent;  //NOSONAR
    private String geoSubContinent;  //NOSONAR
    private String geoCountry;  //NOSONAR
    private String geoRegion;  //NOSONAR
    private String geoMetro;  //NOSONAR
    private String geoCity;  //NOSONAR
    private String geoLocale;  //NOSONAR
    private String trafficSourceSource;  //NOSONAR
    private String trafficSourceMedium;  //NOSONAR
    private String trafficSourceCampaign;  //NOSONAR
    private String trafficSourceContent;  //NOSONAR
    private String trafficSourceTerm;  //NOSONAR
    private String trafficSourceCampaignId;  //NOSONAR
    private String trafficSourceClidPlatform;  //NOSONAR
    private String trafficSourceClid;  //NOSONAR
    private String trafficSourceChannelGroup;  //NOSONAR
    private String trafficSourceCategory;  //NOSONAR
    private Long userFirstTouchTimeMsec;  //NOSONAR
    private String appPackageId;  //NOSONAR
    private String appVersion;  //NOSONAR
    private String appTitle;  //NOSONAR
    private String appInstallSource;  //NOSONAR
    private String platform;  //NOSONAR
    private String projectId;  //NOSONAR
    private String appId;  //NOSONAR
    private String screenViewScreenName;  //NOSONAR
    private String screenViewScreenId;  //NOSONAR
    private String screenViewScreenUniqueId;  //NOSONAR
    private String screenViewPreviousScreenName;  //NOSONAR
    private String screenViewPreviousScreenId;  //NOSONAR
    private String screenViewPreviousScreenUniqueId;  //NOSONAR
    private Long screenViewPreviousTimeMsec;  //NOSONAR
    private Long screenViewEngagementTimeMsec;  //NOSONAR
    private Boolean screenViewEntrances;  //NOSONAR
    private String pageViewPageReferrer;  //NOSONAR
    private String pageViewPageReferrerTitle;  //NOSONAR
    private Long pageViewPreviousTimeMsec;  //NOSONAR
    private Long pageViewEngagementTimeMsec;  //NOSONAR
    private String pageViewPageTitle;  //NOSONAR
    private String pageViewPageUrl;  //NOSONAR
    private String pageViewPageUrlPath;  //NOSONAR
    private Map<String, String> pageViewPageUrlQueryParameters;  //NOSONAR
    private String pageViewHostname;  //NOSONAR
    private String pageViewLatestReferrer;  //NOSONAR
    private String pageViewLatestReferrerHost;  //NOSONAR
    private Boolean pageViewEntrances;  //NOSONAR
    private Boolean appStartIsFirstTime;  //NOSONAR
    private String upgradePreviousAppVersion;  //NOSONAR
    private String upgradePreviousOsVersion;  //NOSONAR
    private String searchKey;  //NOSONAR
    private String searchTerm;  //NOSONAR
    private String outboundLinkClasses;  //NOSONAR
    private String outboundLinkDomain;  //NOSONAR
    private String outboundLinkId;  //NOSONAR
    private String outboundLinkUrl;  //NOSONAR
    private Boolean outboundLink;  //NOSONAR
    private Long userEngagementTimeMsec;  //NOSONAR
    private String userId;  //NOSONAR
    private String userPseudoId;  //NOSONAR
    private String sessionId;  //NOSONAR
    private Long sessionStartTimeMsec;  //NOSONAR
    private Long sessionDuration;  //NOSONAR
    private Long sessionNumber;  //NOSONAR
    private Long scrollEngagementTimeMsec;  //NOSONAR
    private String sdkErrorCode;  //NOSONAR
    private String sdkErrorMessage;  //NOSONAR
    private String sdkVersion;  //NOSONAR
    private String sdkName;  //NOSONAR
    private String appExceptionMessage;  //NOSONAR
    private String appExceptionStack;  //NOSONAR
    private Map<String, ClickstreamEventPropValue> customParameters;  //NOSONAR
    private Map<String, String> processInfo;  //NOSONAR
    private String ua;  //NOSONAR
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

}
