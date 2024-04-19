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

import com.fasterxml.jackson.annotation.*;
import lombok.*;

import java.util.*;

@Getter
@Setter
public class ClickstreamUA {
    @JsonProperty("device_ua_browser")
    private String uaBrowser;
    @JsonProperty("device_ua_browser_version")
    private String uaBrowserVersion;
    @JsonProperty("device_ua_os")
    private String uaOs;
    @JsonProperty("device_ua_os_version")
    private String uaOsVersion;
    @JsonProperty("device_ua_device")
    private String uaDevice;
    @JsonProperty("device_ua_device_category")
    private String uaDeviceCategory;
    @JsonProperty("device_ua")
    private Map<String, Object> uaMap;
}
