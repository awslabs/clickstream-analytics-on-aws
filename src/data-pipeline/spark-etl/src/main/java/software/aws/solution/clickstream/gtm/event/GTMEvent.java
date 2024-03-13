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


package software.aws.solution.clickstream.gtm.event;

import com.fasterxml.jackson.annotation.*;
import com.fasterxml.jackson.databind.annotation.*;
import lombok.Getter;
import lombok.Setter;

import java.util.*;

@Getter
@Setter
public class GTMEvent {
    private final Map<String, Object> unknownProperties = new HashMap<>();

    @JsonProperty("client_hints")
    private ClientHints clientHints;

    @JsonProperty("client_id")
    private String clientId;

    @JsonProperty("currency")
    private String currency;

    @JsonProperty("engagement_time_msec")
    private Long engagementTimeMsec;

    @JsonProperty("event_location")
    private EventLocation eventLocation;

    @JsonProperty("event_name")
    private String eventName;

    @JsonProperty("ga_session_id")
    private String gaSessionId;

    @JsonProperty("ga_session_number")
    @JsonDeserialize(using = SafeLongDeserializer.class)
    private Long gaSessionNumber;

    @JsonProperty("ip_override")
    private String ipOverride;

    @JsonProperty("item_id")
    private String itemId;

    @JsonProperty("items")
    private List<Item> items;

    @JsonProperty("language")
    private String language;

    @JsonProperty("page_location")
    private String pageLocation;

    @JsonProperty("page_referrer")
    private String pageReferrer;

    @JsonProperty("page_title")
    private String pageTitle;

    @JsonProperty("screen_resolution")
    private String screenResolution;

    @JsonProperty("user_agent")
    private String userAgent;

    @JsonProperty("user_id")
    private String userId;

    @JsonProperty("x-ga-ur")
    private String xGaUr;

    @JsonProperty("value")
    private double value;

    @JsonProperty("x-ga-mp2-user_properties")
    private UserProperties xGaMp2UserProperties;

    @JsonProperty("x-ga-system_properties")
    private SystemProperties xGaSystemProperties;

    @JsonProperty("x-sst-system_properties")
    private SstSystemProperties xSstSystemProperties;

    @JsonAnySetter
    public void setUnknownProperty(final String name, final Object value) {
        unknownProperties.put(name, value);
    }

    @JsonAnyGetter
    public Map<String, Object> getUnknownProperties() {
        return unknownProperties;
    }

}
