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

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.module.SimpleModule;
import lombok.*;
import lombok.extern.slf4j.Slf4j;
import software.aws.solution.clickstream.common.Constant;
import software.aws.solution.clickstream.common.Util;

import java.sql.*;
import java.util.Map;

@Slf4j
@Setter
@Getter
public class ClickstreamItem {
    @JsonProperty(Constant.EVENT_TIMESTAMP)
    private Timestamp eventTimestamp;
    @JsonProperty(Constant.EVENT_ID)
    private String eventId;
    @JsonProperty(Constant.EVENT_NAME)
    private String eventName;
    @JsonProperty(Constant.PLATFORM)
    private String platform;
    @JsonProperty(Constant.USER_PSEUDO_ID)
    private String userPseudoId;
    @JsonProperty(Constant.USER_ID)
    private String userId;
    @JsonProperty(Constant.ITEM_ID)
    private String itemId;
    @JsonProperty(Constant.NAME)
    private String name;
    @JsonProperty(Constant.BRAND)
    private String brand;
    @JsonProperty(Constant.CURRENCY)
    private String currency;
    @JsonProperty(Constant.PRICE)
    private Double price;
    @JsonProperty(Constant.QUANTITY)
    private Double quantity;
    @JsonProperty(Constant.CREATIVE_NAME)
    private String creativeName;
    @JsonProperty(Constant.CREATIVE_SLOT)
    private String creativeSlot;
    @JsonProperty(Constant.LOCATION_ID)
    private String locationId;
    @JsonProperty(Constant.CATEGORY)
    private String category;
    @JsonProperty(Constant.CATEGORY2)
    private String category2;
    @JsonProperty(Constant.CATEGORY3)
    private String category3;
    @JsonProperty(Constant.CATEGORY4)
    private String category4;
    @JsonProperty(Constant.CATEGORY5)
    private String category5;
    @JsonProperty(Constant.CUSTOM_PARAMETERS)
    private Map<String, ClickstreamEventPropValue> customParameters;
    @JsonProperty(Constant.PROCESS_INFO)
    private Map<String, String> processInfo;
    @JsonIgnore
    private String appId;

    public String toJson() {
        ObjectMapper objectMapper = new ObjectMapper();
        objectMapper.registerModule(new SimpleModule().addSerializer(ClickstreamEventPropValue.class, new ClickstreamEventPropValueSerializer()));
        try {
            return objectMapper.writeValueAsString(this);
        } catch (Exception e) {
            log.error("Failed to serialize ClickstreamItem to json", e);
            log.error(Util.getStackTrace(e));
            return null;
        }
    }
}
