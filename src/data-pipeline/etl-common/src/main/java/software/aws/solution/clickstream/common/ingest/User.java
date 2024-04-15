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
import lombok.*;

import java.util.*;

@Getter
@Setter
public class User {
    private final Map<String, UserPropObjectValue> customProperties = new HashMap<>();
    @JsonProperty("_user_id")
    private UserPropStringValue userId;
    @JsonProperty("_user_name")
    private UserPropStringValue userName;
    @JsonProperty("_user_age")
    private UserPropIntegerValue userAge;
    @JsonProperty("_user_first_touch_timestamp")
    private UserPropLongValue userFirstTouchTimestamp;

    @JsonAnySetter
    public void setCustomProperties(final String name, final Object value) {
        if (value instanceof Map<?, ?> valueMap) {
            Object valObj = valueMap.getOrDefault("value", null);
            Object setTimestampObj = valueMap.getOrDefault("set_timestamp", null);

            Long setTimestamp = null;
            if (setTimestampObj instanceof Number setTimestampNum) {
                setTimestamp = setTimestampNum.longValue();
            }
            if (valObj == null) {
                customProperties.put(name, new UserPropObjectValue(value, null));
            } else {
                customProperties.put(name, new UserPropObjectValue(valObj, setTimestamp));
            }
            return;
        }
        customProperties.put(name, new UserPropObjectValue(value, null));
    }

    @JsonAnyGetter
    public Map<String, UserPropObjectValue> getCustomProperties() {
        return customProperties;
    }
}
