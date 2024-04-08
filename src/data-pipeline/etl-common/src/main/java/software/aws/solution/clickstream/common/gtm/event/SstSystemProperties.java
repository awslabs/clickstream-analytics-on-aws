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


package software.aws.solution.clickstream.common.gtm.event;

import com.fasterxml.jackson.annotation.*;
import lombok.Getter;
import lombok.Setter;

import java.util.*;

@Getter
@Setter
public class SstSystemProperties {
    private final Map<String, Object> unknownProperties = new HashMap<>();

    @JsonProperty("uc")
    private String uc;

    @JsonProperty("ngs")
    private String ngs;

    @JsonProperty("gse")
    private String gse;

    @JsonProperty("gcd")
    private String gcd;

    @JsonProperty("tft")
    private long tft;

    @JsonProperty("consent")
    private Consent consent;

    @JsonProperty("request_start_time_ms")
    private Long requestStartTimeMs;

    @JsonAnySetter
    public void setUnknownProperty(final String name, final Object value) {
        unknownProperties.put(name, value);
    }

    @JsonAnyGetter
    public Map<String, Object> getUnknownProperties() {
        return unknownProperties;
    }

    @Getter
    @Setter
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class Consent {
        @JsonProperty("consentGrantedState")
        private ConsentGrantedState consentGrantedState;

        @JsonProperty("isUpdate")
        private boolean isUpdate;

        @JsonProperty("updateType")
        private String updateType;
    }

    @Getter
    @Setter
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class ConsentGrantedState {
        @JsonProperty("ad_storage")
        private boolean adStorage;

        @JsonProperty("analytics_storage")
        private boolean analyticsStorage;

        @JsonProperty("ad_user_data")
        private boolean adUserData;

        @JsonProperty("ad_personalization")
        private boolean adPersonalization;
    }
}
