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

package software.aws.solution.clickstream.model;

import com.fasterxml.jackson.annotation.*;
import lombok.*;
import org.apache.spark.sql.catalyst.expressions.*;

import java.sql.*;
import java.sql.Date;
import java.util.*;

@Setter
public class ClickstreamUser {
    private Timestamp eventTimestamp;
    private String userPseudoId;
    private String userId;
    @Getter
    private Map<String, UserPropValue> userProperties;
    private String userPropertiesJsonStr;
    @Getter
    private Long firstTouchTimeMsec;
    private Date firstVisitDate;
    private String firstReferrer;
    private String firstTrafficSource;
    private String firstTrafficMedium;
    private String firstTrafficCampaign;
    private String firstTrafficContent;
    private String firstTrafficTerm;
    private String firstTrafficCampaignId;
    private String firstTrafficClidPlatform;
    private String firstTrafficClid;
    private String firstTrafficChannelGroup;
    private String firstTrafficCategory;
    private String firstAppInstallSource;
    private Map<String, String> processInfo;
    private String appId;


    private Map<String, GenericRow> userPropertiesToGenericRowMap(final Map<String, UserPropValue> userProperties) {
        if (userProperties == null) {
            return null;
        }
        Map<String, GenericRow> rowsMap = new HashMap<>();
        for (Map.Entry<String, UserPropValue> entry : userProperties.entrySet()) {
            rowsMap.put(entry.getKey(), entry.getValue().toGenericRow());
        }
        return rowsMap;
    }

    public GenericRow toGenericRow() {
        return new GenericRow(new Object[]{
                eventTimestamp,
                userPseudoId,
                userId,
                userPropertiesToGenericRowMap(userProperties),
                userPropertiesJsonStr,
                firstTouchTimeMsec,
                firstVisitDate,
                firstReferrer,
                firstTrafficSource,
                firstTrafficMedium,
                firstTrafficCampaign,
                firstTrafficContent,
                firstTrafficTerm,
                firstTrafficCampaignId,
                firstTrafficClidPlatform,
                firstTrafficClid,
                firstTrafficChannelGroup,
                firstTrafficCategory,
                firstAppInstallSource,
                processInfo,
                appId
        });
    }

    @Setter
    @Getter
    @AllArgsConstructor
    public static class UserPropValue {
        @JsonProperty("value")
        private String value;
        @JsonProperty("set_timestamp_micros")
        private Long setTimestampMicros;

        public GenericRow toGenericRow() {
            return new GenericRow(new Object[]{
                    value,
                    setTimestampMicros
            });
        }
    }
}
