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
public class EventAttributes {
    @JsonProperty("_screen_name")
    private String screenName;
    @JsonProperty("_screen_id")
    private String screenId;
    @JsonProperty("_screen_unique_id")
    private String screenUniqueId;
    @JsonProperty("_previous_screen_name")
    private String previousScreenName;
    @JsonProperty("_previous_screen_id")
    private String previousScreenId;
    @JsonProperty("_previous_screen_unique_id")
    private String previousScreenUniqueId;
    @JsonProperty("_entrances")
    @JsonDeserialize(using = SafeBooleanDeserializer.class)
    private Boolean entrances;
    @JsonProperty("_previous_timestamp")
    private Long previousTimestamp;
    @JsonProperty("_engagement_time_msec")
    private Long engagementTimeMsec;
    @JsonProperty("_page_referrer")
    private String pageReferrer;
    @JsonProperty("_page_referrer_title")
    private String pageReferrerTitle;
    @JsonProperty("_page_title")
    private String pageTitle;
    @JsonProperty("_page_url")
    private String pageUrl;
    @JsonProperty("_latest_referrer")
    private String latestReferrer;
    @JsonProperty("_latest_referrer_host")
    private String latestReferrerHost;
    @JsonProperty("_is_first_time")
    @JsonDeserialize(using = SafeBooleanDeserializer.class)
    private Boolean isFirstTime;
    @JsonProperty("_exception_message")
    private String exceptionMessage;
    @JsonProperty("_exception_stack")
    private String exceptionStack;
    @JsonProperty("_previous_app_version")
    private String previousAppVersion;
    @JsonProperty("_previous_os_version")
    private String previousOsVersion;
    @JsonProperty("_error_code")
    private String errorCode;
    @JsonProperty("_error_message")
    private String errorMessage;
    @JsonProperty("_search_key")
    private String searchKey;
    @JsonProperty("_search_term")
    private String searchTerm;
    @JsonProperty("_link_classes")
    private String linkClasses;
    @JsonProperty("_link_domain")
    private String linkDomain;
    @JsonProperty("_link_id")
    private String linkId;
    @JsonProperty("_link_url")
    private String linkUrl;
    @JsonProperty("_outbound")
    @JsonDeserialize(using = SafeBooleanDeserializer.class)
    private Boolean outbound;
    @JsonProperty("_session_id")
    private String sessionId;
    @JsonProperty("_session_start_time_msec")
    @JsonAlias({"_session_start_timestamp"})
    @JsonDeserialize(using = SafeLongDeserializer.class)
    private Long sessionStartTimeMsec;
    @JsonProperty("_session_duration")
    @JsonDeserialize(using = SafeLongDeserializer.class)
    private Long sessionDuration;
    @JsonDeserialize(using = SafeLongDeserializer.class)
    @JsonProperty("_session_number")
    private Long sessionNumber;

    @JsonProperty("_channel")
    private String channel;
    @JsonProperty("_traffic_source_source")
    private String trafficSourceSource;
    @JsonProperty("_traffic_source_medium")
    private String trafficSourceMedium;
    @JsonProperty("_traffic_source_campaign")
    private String trafficSourceCampaign;
    @JsonProperty("_traffic_source_content")
    private String trafficSourceContent;
    @JsonProperty("_traffic_source_term")
    private String trafficSourceTerm;
    @JsonProperty("_traffic_source_campaign_id")
    private String trafficSourceCampaignId;
    @JsonProperty("_traffic_source_clid_platform")
    private String trafficSourceClidPlatform;
    @JsonProperty("_traffic_source_clid")
    private String trafficSourceClid;
    @JsonProperty("_traffic_source_channel_group")
    private String trafficSourceChannelGroup;
    @JsonProperty("_traffic_source_category")
    private String trafficSourceCategory;
    @JsonProperty("_utm_id")
    private String utmId;
    @JsonProperty("_utm_source")
    private String utmSource;
    @JsonProperty("_utm_medium")
    private String utmMedium;
    @JsonProperty("_utm_content")
    private String utmContent;
    @JsonProperty("_utm_term")
    private String utmTerm;
    @JsonProperty("_gclid")
    private String gclid;
    @JsonProperty("_utm_campaign")
    private String utmCampaign;
    @JsonProperty("_utm_source_platform")
    private String utmSourcePlatform;

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
