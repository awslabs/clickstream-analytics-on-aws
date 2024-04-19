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

package software.aws.solution.clickstream.common.ingest;

import com.fasterxml.jackson.annotation.*;
import com.fasterxml.jackson.databind.annotation.*;
import lombok.*;
import software.aws.solution.clickstream.common.*;

import java.util.*;

@Getter
@Setter
public class Event {
    @JsonProperty("event_id")
    private String eventId;
    @JsonProperty("app_id")
    private String appId;
    @JsonProperty("unique_id")
    @JsonAlias("user_pseudo_id")
    private String uniqueId;
    @JsonProperty("device_id")
    private String deviceId;
    @JsonProperty("device_unique_id")
    @JsonAlias("advertising_id")
    private String deviceUniqueId;
    @JsonProperty("event_type")
    @JsonAlias("event_name")
    private String eventName;
    @JsonProperty("timestamp")
    private Long eventTimestamp;
    @JsonProperty("platform")
    private String platform;
    @JsonProperty("os_name")
    @JsonAlias("operating_system")
    private String osName;
    @JsonProperty("os_version")
    private String osVersion;
    @JsonProperty("make")
    private String make;
    @JsonProperty("brand")
    private String brand;
    @JsonProperty("model")
    private String model;
    @JsonProperty("carrier")
    private String carrier;
    @JsonProperty("network_type")
    private String networkType;
    @JsonProperty("screen_height")
    @JsonDeserialize(using = SafeIntegerDeserializer.class)
    private Integer screenHeight;
    @JsonProperty("screen_width")
    @JsonDeserialize(using = SafeIntegerDeserializer.class)
    private Integer screenWidth;
    @JsonProperty("zone_offset")
    @JsonDeserialize(using = SafeLongDeserializer.class)
    private Long zoneOffset;
    @JsonProperty("locale")
    private String locale;
    @JsonProperty("system_language")
    private String systemLanguage;
    @JsonProperty("host_name")
    private String hostName;
    @JsonProperty("app_version")
    private String appVersion;
    @JsonProperty("app_package_name")
    private String appPackageName;
    @JsonProperty("app_title")
    private String appTitle;
    @JsonProperty("user")
    private User user;
    @JsonProperty("attributes")
    private EventAttributes attributes;
    @JsonProperty("event_value")
    @JsonAlias("event_value_in_usd")
    private Double eventValue;
    @JsonProperty("event_value_currency")
    @JsonAlias({"currency"})
    private String eventValueCurrency;
    @JsonProperty("event_previous_timestamp")
    private Long eventPreviousTimestamp;
    @JsonProperty("viewport_width")
    @JsonDeserialize(using = SafeIntegerDeserializer.class)
    private Integer viewportWidth;
    @JsonProperty("viewport_height")
    @JsonDeserialize(using = SafeIntegerDeserializer.class)
    private Integer viewportHeight;
    @JsonProperty("items")
    private List<Item> items;
    @JsonProperty("sdk_version")
    private String sdkVersion;
    @JsonProperty("sdk_name")
    private String sdkName;

    private final Map<String, Object> customProperties = new HashMap<>();
    @JsonAnySetter
    public void setCustomProperty(final String name, final Object value) {
        customProperties.put(name, value);
    }
    @JsonAnyGetter
    public Map<String, Object> getCustomProperties() {
        return customProperties;
    }
}
