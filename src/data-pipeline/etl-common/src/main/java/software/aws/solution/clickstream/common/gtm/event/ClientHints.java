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
import lombok.*;

import java.util.*;

@Getter
@Setter
public class ClientHints {

    private final Map<String, Object> unknownProperties = new HashMap<>();

    @JsonProperty("architecture")
    private String architecture;

    @JsonProperty("bitness")
    private String bitness;

    @JsonProperty("full_version_list")
    private List<Version> fullVersionList;

    @JsonProperty("mobile")
    private boolean mobile;

    @JsonProperty("model")
    private String model;

    @JsonProperty("platform")
    private String platform;

    @JsonProperty("platform_version")
    private String platformVersion;

    @JsonProperty("wow64")
    private boolean wow64;

    @JsonProperty("brands")
    private List<Brand> brands;
    @JsonAnySetter
    public void setUnknownProperty(final String name, final Object value) {
        unknownProperties.put(name, value);
    }

    @JsonAnyGetter
    public Map<String, Object> getUnknownProperties() {
        return unknownProperties;
    }

}
