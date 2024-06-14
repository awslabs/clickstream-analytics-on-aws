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


package software.aws.solution.clickstream.common.sensors.event;

import com.fasterxml.jackson.annotation.JsonAnyGetter;
import com.fasterxml.jackson.annotation.JsonAnySetter;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Getter;
import lombok.Setter;

import java.util.HashMap;
import java.util.Map;

@Getter
@Setter
public class Properties {

    private final Map<String, Object> unknownProperties = new HashMap<>();

    @JsonProperty("$city")
    private String city;

    @JsonProperty("$url")
    private String url;

    @JsonProperty("$title")
    private String title;

    @JsonProperty("$os")
    private String os;

    @JsonProperty("$os_version")
    private String osVersion;

    @JsonProperty("$manufacturer")
    private String manufacturer;

    @JsonProperty("$model")
    private String model;

    @JsonProperty("$brand")
    private String brand;

    @JsonProperty("$screen_width")
    private int screenWidth;

    @JsonProperty("$screen_height")
    private int screenHeight;

    @JsonProperty("$carrier")
    private String carrier;

    @JsonProperty("$timezone_offset")
    private int timezoneOffset;

    @JsonProperty("$app_name")
    private String appName;

    @JsonProperty("$wifi")
    private boolean wifi;

    @JsonProperty("$network_type")
    private String networkType;

    @JsonProperty("$device_id")
    private String deviceId;

    @JsonProperty("$event_duration")
    private long eventDuration;

    @JsonProperty("$referrer")
    private String referrer;

    @JsonProperty("$referrer_title")
    private String referrerTitle;

    @JsonProperty("$is_first_time")
    private boolean isFirstTime;

    @JsonProperty("$user_id")
    private String userId;

    @JsonProperty("$browser_language")
    private String browserLanguage;


    @JsonAnySetter
    public void setUnknownProperty(final String name, final Object value) {
        unknownProperties.put(name, value);
    }

    @JsonAnyGetter
    public Map<String, Object> getUnknownProperties() {
        return unknownProperties;
    }
}
