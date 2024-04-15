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
import lombok.extern.slf4j.*;
import software.aws.solution.clickstream.common.Constant;
import software.aws.solution.clickstream.common.Util;

import java.sql.Date;
import java.sql.*;
import java.util.*;

@Slf4j
@Setter
@Getter
public class ClickstreamUser {
    @JsonProperty(Constant.EVENT_TIMESTAMP)
    private Timestamp eventTimestamp;
    @JsonProperty(Constant.USER_PSEUDO_ID)
    private String userPseudoId;
    @JsonProperty(Constant.USER_ID)
    private String userId;
    @JsonProperty(Constant.USER_PROPERTIES)
    private Map<String, ClickstreamUserPropValue> userProperties;
    @JsonProperty(Constant.FIRST_TOUCH_TIME_MSEC)
    private Long firstTouchTimeMsec;
    @JsonProperty(Constant.FIRST_VISIT_DATE)
    private Date firstVisitDate;
    @JsonProperty(Constant.FIRST_REFERRER)
    private String firstReferrer;
    @JsonProperty(Constant.FIRST_TRAFFIC_SOURCE)
    private String firstTrafficSource;
    @JsonProperty(Constant.FIRST_TRAFFIC_MEDIUM)
    private String firstTrafficMedium;
    @JsonProperty(Constant.FIRST_TRAFFIC_CAMPAIGN)
    private String firstTrafficCampaign;
    @JsonProperty(Constant.FIRST_TRAFFIC_CONTENT)
    private String firstTrafficContent;
    @JsonProperty(Constant.FIRST_TRAFFIC_TERM)
    private String firstTrafficTerm;
    @JsonProperty(Constant.FIRST_TRAFFIC_CAMPAIGN_ID)
    private String firstTrafficCampaignId;
    @JsonProperty(Constant.FIRST_TRAFFIC_CLID_PLATFORM)
    private String firstTrafficClidPlatform;
    @JsonProperty(Constant.FIRST_TRAFFIC_CLID)
    private String firstTrafficClid;
    @JsonProperty(Constant.FIRST_TRAFFIC_CHANNEL_GROUP)
    private String firstTrafficChannelGroup;
    @JsonProperty(Constant.FIRST_TRAFFIC_CATEGORY)
    private String firstTrafficCategory;
    @JsonProperty(Constant.FIRST_APP_INSTALL_SOURCE)
    private String firstAppInstallSource;
    @JsonProperty(Constant.PROCESS_INFO)
    private Map<String, String> processInfo;
    @JsonIgnore
    private String appId;
    @JsonIgnore
    private String eventName;

    public String toJson() {
        ObjectMapper objectMapper = new ObjectMapper();
        objectMapper.registerModule(new SimpleModule().addSerializer(ClickstreamUserPropValue.class, new ClickstreamUserPropValueSerializer()));
        try {
            return objectMapper.writeValueAsString(this);
        } catch (Exception e) {
            log.error("Failed to serialize ClickstreamUser to json", e);
            log.error(Util.getStackTrace(e));
            return null;
        }
    }

}
