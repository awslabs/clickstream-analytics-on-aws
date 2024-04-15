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
import software.aws.solution.clickstream.common.model.*;

@AllArgsConstructor
@Getter
public class UserPropIntegerValue {
    public UserPropIntegerValue(){
        // add non arg constructor
    }
    @JsonProperty("value")
    @JsonDeserialize(using = SafeIntegerDeserializer.class)
    private Integer value;
    @JsonProperty("set_timestamp")
    private Long setTimestamp;
    public ClickstreamUserPropValue toClickstreamUserPropValue() {
        return new ClickstreamUserPropValue(value.toString(), ValueType.NUMBER, setTimestamp);
    }
}
