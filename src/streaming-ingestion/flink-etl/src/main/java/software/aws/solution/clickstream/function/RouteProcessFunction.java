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

package software.aws.solution.clickstream.function;

import lombok.Getter;
import lombok.extern.slf4j.Slf4j;
import org.apache.flink.shaded.jackson2.com.fasterxml.jackson.core.JsonParseException;
import org.apache.flink.shaded.jackson2.com.fasterxml.jackson.databind.JsonNode;
import org.apache.flink.shaded.jackson2.com.fasterxml.jackson.databind.ObjectMapper;
import org.apache.flink.streaming.api.functions.ProcessFunction;
import org.apache.flink.util.Collector;
import org.apache.flink.util.OutputTag;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Slf4j
public class RouteProcessFunction extends ProcessFunction<String, JsonNode> {
    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();
    private final List<String> appIds;
    @Getter
    private final Map<String, OutputTag<JsonNode>> sideAppOutputTagMap;

    public RouteProcessFunction(final List<String> appIds) {
        this.appIds = appIds;
        this.sideAppOutputTagMap = new HashMap<>();
        if (appIds.size() > 1) {
            for (int i = 1; i < appIds.size(); i++) {
                String appId = appIds.get(i);
                OutputTag<JsonNode> outputTag = new OutputTag<>("side-output-" + appId) {
                };
                sideAppOutputTagMap.put(appId, outputTag);
            }
        }
    }

    @Override
    public void processElement(final String value, final ProcessFunction<String, JsonNode>.Context ctx, final Collector<JsonNode> out) throws Exception {
        JsonNode jsonNode = null;
        try {
            jsonNode = OBJECT_MAPPER.readValue(value, JsonNode.class);
        } catch (JsonParseException e) {
            log.warn("JsonParseException: {}, value: {}", e.getMessage(), value);
            return;
        }

        if (!jsonNode.hasNonNull("appId")) {
            log.warn("appId is null in value: {}", value);
            return;
        }
        String appId = jsonNode.get("appId").asText();

        if (!appIds.contains(appId)) {
            log.warn("appId: {} is not in appIdList: {}", appId, appIds);
            return;
        }

        if (!jsonNode.hasNonNull("data")) {
            log.warn("data is null in value: {}", value);
            return;
        }

        if (jsonNode.get("data").asText().isEmpty()) {
            log.warn("appId: {}, data is empty", appId);
            return;
        }

        if (appIds.get(0).equals(appId)) {
            out.collect(jsonNode);
        } else {
            ctx.output(sideAppOutputTagMap.get(appId), jsonNode);
        }

    }
}
