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

package software.aws.solution.clickstream.rowconv;

import com.fasterxml.jackson.core.*;
import com.fasterxml.jackson.databind.*;
import com.fasterxml.jackson.databind.module.*;
import lombok.extern.slf4j.*;
import org.apache.spark.sql.catalyst.expressions.*;
import software.aws.solution.clickstream.common.model.*;

import java.util.*;

import static software.aws.solution.clickstream.util.Utils.*;

@Slf4j
public class UserGenericRowConverter {

    public static Map<String, GenericRow> userPropertiesToGenericRowMap(final Map<String, ClickstreamUserPropValue> userProperties) {
        if (userProperties == null || userProperties.isEmpty()) {
            return null;
        }
        Map<String, GenericRow> rowsMap = new HashMap<>();
        for (Map.Entry<String, ClickstreamUserPropValue> entry : userProperties.entrySet()) {
            rowsMap.put(entry.getKey(), toGenericRow(entry.getValue()));
        }
        return rowsMap;
    }

    public static String userPropertiesToJsonString(final Map<String, ClickstreamUserPropValue> userProperties) {
        if (userProperties == null || userProperties.isEmpty()) {
            return null;
        }
        ObjectMapper objectMapper = new ObjectMapper();
        // ClickstreamUserPropValueSerializer is used to serialize ClickstreamUserPropValue to JSON
        objectMapper.registerModule(new SimpleModule().addSerializer(ClickstreamUserPropValue.class, new ClickstreamUserPropValueSerializer()));

        try {
            return objectMapper.writeValueAsString(userProperties);
        } catch (JsonProcessingException e) {
            log.error("Failed to serialize userProperties to JSON string {}", getStackTrace(e));
            throw new RuntimeException("Failed to serialize userProperties to JSON string", e);
        }
    }

    public static GenericRow toGenericRow(final ClickstreamUser user) {
        return new GenericRow(new Object[]{
                user.getEventTimestamp(),
                user.getUserPseudoId(),
                user.getUserId(),
                userPropertiesToGenericRowMap(user.getUserProperties()),
                userPropertiesToJsonString(user.getUserProperties()),
                user.getFirstTouchTimeMsec(),
                user.getFirstVisitDate(),
                user.getFirstReferrer(),
                user.getFirstTrafficSource(),
                user.getFirstTrafficMedium(),
                user.getFirstTrafficCampaign(),
                user.getFirstTrafficContent(),
                user.getFirstTrafficTerm(),
                user.getFirstTrafficCampaignId(),
                user.getFirstTrafficClidPlatform(),
                user.getFirstTrafficClid(),
                user.getFirstTrafficChannelGroup(),
                user.getFirstTrafficCategory(),
                user.getFirstAppInstallSource(),
                user.getProcessInfo(),
                user.getAppId(),
                user.getEventName(),
        });
    }

    public static GenericRow toGenericRow(final ClickstreamUserPropValue userPropValue) {
        return new GenericRow(new Object[]{
                userPropValue.getValue(),
                userPropValue.getType().getTypeName(),
                userPropValue.getSetTimemsec()
        });
    }
}
