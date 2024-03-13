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

package software.aws.solution.clickstream.model;


import lombok.*;
import org.apache.spark.sql.catalyst.expressions.*;

import java.sql.*;
import java.util.*;

@Setter
@Getter
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
    private String deviceUaDevice;
    private String deviceUaDeviceCategory;
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
    private String appId;
    private String appVersion;
    private String appTitle;
    private String appInstallSource;
    private String platform;
    private String projectId;
    private String screenName;
    private String screenId;
    private String screenUniqueId;
    private String previousScreenName;
    private String previousScreenId;
    private String previousScreenUniqueId;
    private String pageReferrer;
    private String pageReferrerTitle;
    private String pageTitle;
    private String pageUrl;
    private String pageUrlPath;
    private Map<String, String> pageUrlQueryParameters;
    private String hostname;
    private String latestReferrer;
    private String latestReferrerHost;
    private Boolean appStartIsFirstTime;
    private Long previousViewTimeMsec;
    private Long previousViewEngagementTimeMsec;
    private Boolean entrances;
    private String previousAppVersion;
    private String previousOsVersion;
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
    private String sdkExceptionMessage;
    private String sdkExceptionStack;
    private String sdkVersion;
    private String sdkName;
    private String customParametersJsonStr;
    private Map<String, String> customParameters;
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
        newCsEvent.setDeviceUaDevice(csEvent.getDeviceUaDevice());
        newCsEvent.setDeviceUaDeviceCategory(csEvent.getDeviceUaDeviceCategory());
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
        newCsEvent.setScreenName(csEvent.getScreenName());
        newCsEvent.setScreenId(csEvent.getScreenId());
        newCsEvent.setScreenUniqueId(csEvent.getScreenUniqueId());
        newCsEvent.setPreviousScreenName(csEvent.getPreviousScreenName());
        newCsEvent.setPreviousScreenId(csEvent.getPreviousScreenId());
        newCsEvent.setPreviousScreenUniqueId(csEvent.getPreviousScreenUniqueId());
        newCsEvent.setPageReferrer(csEvent.getPageReferrer());
        newCsEvent.setPageReferrerTitle(csEvent.getPageReferrerTitle());
        newCsEvent.setPageTitle(csEvent.getPageTitle());
        newCsEvent.setPageUrl(csEvent.getPageUrl());
        newCsEvent.setPageUrlPath(csEvent.getPageUrlPath());
        if (csEvent.getPageUrlQueryParameters() != null) {
            newCsEvent.setPageUrlQueryParameters(new HashMap<>(csEvent.getPageUrlQueryParameters()));
        }
        newCsEvent.setHostname(csEvent.getHostname());
        newCsEvent.setLatestReferrer(csEvent.getLatestReferrer());
        newCsEvent.setLatestReferrerHost(csEvent.getLatestReferrerHost());
        newCsEvent.setAppStartIsFirstTime(csEvent.getAppStartIsFirstTime());
        newCsEvent.setPreviousViewTimeMsec(csEvent.getPreviousViewTimeMsec());
        newCsEvent.setPreviousViewEngagementTimeMsec(csEvent.getPreviousViewEngagementTimeMsec());
        newCsEvent.setEntrances(csEvent.getEntrances());
        newCsEvent.setPreviousAppVersion(csEvent.getPreviousAppVersion());
        newCsEvent.setPreviousOsVersion(csEvent.getPreviousOsVersion());
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
        newCsEvent.setSdkExceptionMessage(csEvent.getSdkExceptionMessage());
        newCsEvent.setSdkExceptionStack(csEvent.getSdkExceptionStack());
        newCsEvent.setSdkVersion(csEvent.getSdkVersion());
        newCsEvent.setSdkName(csEvent.getSdkName());
        newCsEvent.setCustomParametersJsonStr(csEvent.getCustomParametersJsonStr());
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

    public GenericRow toGenericRow() {
        return new GenericRow(new Object[] {
                eventTimestamp,
                eventId,
                eventTimeMsec,
                eventName,
                eventValue,
                eventValueCurrency,
                eventBundleSequenceId,
                ingestTimeMsec,
                deviceMobileBrandName,
                deviceMobileModelName,
                deviceManufacturer,
                deviceCarrier,
                deviceNetworkType,
                deviceOperatingSystem,
                deviceOperatingSystemVersion,
                deviceVendorId,
                deviceAdvertisingId,
                deviceSystemLanguage,
                deviceTimeZoneOffsetSeconds,
                deviceUaBrowser,
                deviceUaBrowserVersion,
                deviceUaDevice,
                deviceUaDeviceCategory,
                deviceScreenWidth,
                deviceScreenHeight,
                deviceViewportWidth,
                deviceViewportHeight,
                geoContinent,
                geoSubContinent,
                geoCountry,
                geoRegion,
                geoMetro,
                geoCity,
                geoLocale,
                trafficSourceSource,
                trafficSourceMedium,
                trafficSourceCampaign,
                trafficSourceContent,
                trafficSourceTerm,
                trafficSourceCampaignId,
                trafficSourceClidPlatform,
                trafficSourceClid,
                trafficSourceChannelGroup,
                trafficSourceCategory,
                userFirstTouchTimeMsec,
                appPackageId,
                appId,
                appVersion,
                appTitle,
                appInstallSource,
                platform,
                projectId,
                screenName,
                screenId,
                screenUniqueId,
                previousScreenName,
                previousScreenId,
                previousScreenUniqueId,
                pageReferrer,
                pageReferrerTitle,
                pageTitle,
                pageUrl,
                pageUrlPath,
                pageUrlQueryParameters,
                hostname,
                latestReferrer,
                latestReferrerHost,
                appStartIsFirstTime,
                previousViewTimeMsec,
                previousViewEngagementTimeMsec,
                entrances,
                previousAppVersion,
                previousOsVersion,
                searchKey,
                searchTerm,
                outboundLinkClasses,
                outboundLinkDomain,
                outboundLinkId,
                outboundLinkUrl,
                outboundLink,
                userEngagementTimeMsec,
                userId,
                userPseudoId,
                sessionId,
                sessionStartTimeMsec,
                sessionDuration,
                sessionNumber,
                scrollEngagementTimeMsec,
                sdkErrorCode,
                sdkErrorMessage,
                sdkExceptionMessage,
                sdkExceptionStack,
                sdkVersion,
                sdkName,
                customParametersJsonStr,
                customParameters,
                processInfo,
                ua,
                ip
        });
    }
}
