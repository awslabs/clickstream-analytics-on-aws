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

package com.example.clickstream.transformer.v2.model;


import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
@NoArgsConstructor
public class Event {
    private String eventId;
    private Long eventTimestamp;
    private Long eventPreviousTimestamp;
    private String eventName;
    private Double eventValueInUsd;
    private Long eventBundleSequenceId;
    private Long ingestTimestamp;
    private Device device;
    private Geo geo;
    private TrafficSource trafficSource;
    private AppInfo appInfo;
    private String platform;
    private String projectId;
    private List<EventItem> eventItems;
    private String userPseudoId;
    private String userId;
    private String ua;
    private GeoForEnrich geoForEnrich;

    @Getter
    @Setter
    @NoArgsConstructor
     public static class Device {
        private String mobileBrandName;
        private String mobileModelName;
        private String manufacturer;
        private Long screenWidth;
        private Long screenHeight;
        private String carrier;
        private String networkType;
        private String operatingSystemVersion;
        private String operatingSystem;
        private String uaBrowser;
        private String uaBrowserVersion;
        private String uaOs;
        private String uaOsVersion;
        private String uaDevice;
        private String uaDeviceCategory;
        private String systemLanguage;
        private Long timeZoneOffsetSeconds;
        private String vendorId;
        private String advertisingId;
        private String hostName;
        private Long viewportWidth;
        private Long viewportHeight;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    public static class Geo {
        private String country;
        private String continent;
        private String subContinent;
        private String locale;
        private String region;
        private String metro;
        private String city;
    }

    @AllArgsConstructor
    @Getter
    @Setter
    @NoArgsConstructor
    public static class TrafficSource {
        private String medium;
        private String name;
        private String source;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    public static class AppInfo {
        private String appId;
        private String id;
        private String installSource;
        private String version;
        private String sdkVersion;
        private String sdkName;
    }

    @AllArgsConstructor
    @NoArgsConstructor
    @Getter
    @Setter
    public static class GeoForEnrich {
        private String ip;
        private String locale;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    public static class EventItem {
        private String id;
        private Long quantity;
        private Double price;
        private String currency;
        private String creativeName;
        private String creativeSlot;
    }
}
