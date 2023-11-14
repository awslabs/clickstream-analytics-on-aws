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

import com.fasterxml.jackson.databind.JsonNode;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.Setter;
import java.util.List;

@Getter
@Setter
public class User {
    private String appId;
    private Long eventTimestamp;
    private String userId;
    private String userPseudoId;
    private Long userFirstTouchTimestamp;
    private List<UserProperty> userProperties;
    private UserLtv userLtv;
    private String firstReferer;
    private String firstTrafficSourceType;
    private String firstTrafficMedium;
    private String firstTrafficSource;
    private List<String> deviceIdList;
    private String channel;

    @Getter
    @Setter
    public static class UserProperty {
        private String key;
        private UserPropertyValue value;
    }
    @AllArgsConstructor
    @Getter
    public static class UserLtv {
        private Double revenue;
        private String currency;
    }

    @Getter
    @Setter
    public static class UserPropertyValue extends AttributeTypeValue{
        private Long setTimestampMicros;

        public static UserPropertyValue fromUserValue(final JsonNode value) {
            UserPropertyValue attrValue = new UserPropertyValue();
            if (value.isInt() || value.isLong() || value.isIntegralNumber() || value.isBigInteger()) {
                attrValue.setIntValue(value.asLong());
            } else if (value.isDouble() || value.isFloat() || value.isBigDecimal() || value.isFloatingPointNumber()) {
                attrValue.setDoubleValue(value.asDouble());
            } else {
                attrValue.setStringValue(value.asText());
            }
            attrValue.setSetTimestampMicros(null);

            return attrValue;
        }
    }

}





