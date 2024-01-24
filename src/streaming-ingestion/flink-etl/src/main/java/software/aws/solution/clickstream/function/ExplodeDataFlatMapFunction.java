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

import lombok.extern.slf4j.Slf4j;
import org.apache.flink.api.common.functions.FlatMapFunction;
import org.apache.flink.api.java.tuple.Tuple2;
import org.apache.flink.shaded.jackson2.com.fasterxml.jackson.databind.JsonNode;
import org.apache.flink.shaded.jackson2.com.fasterxml.jackson.databind.ObjectMapper;
import org.apache.flink.shaded.jackson2.com.fasterxml.jackson.databind.node.ObjectNode;
import org.apache.flink.util.Collector;
import software.aws.solution.clickstream.flink.ClickstreamException;

import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.Iterator;

import static software.aws.solution.clickstream.flink.Utils.gzipBytesToString;

@Slf4j
public class ExplodeDataFlatMapFunction implements FlatMapFunction<JsonNode, Tuple2<JsonNode, JsonNode>> {
    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();
    private final String appId;

    public ExplodeDataFlatMapFunction(final String appId) {
        this.appId = appId;
    }
    private static JsonNode decodeData(final String dataText) {
        JsonNode dataNode;
        if (dataText.startsWith("[") || dataText.startsWith("{")) {
            try {
                dataNode = OBJECT_MAPPER.readTree(dataText);
            } catch (Exception e) {
                log.warn("decodeData json error, dataText: {}, error: {}", dataText, e.getMessage());
                return null;
            }
        } else {
            try {
                byte[] decodedBytes = Base64.getDecoder().decode(dataText.getBytes(StandardCharsets.UTF_8));
                StringBuilder output = gzipBytesToString(decodedBytes);
                return OBJECT_MAPPER.readValue(output.toString(), JsonNode.class);
            } catch (Exception e) {
                log.warn("decodeData gzip error, dataText: {}, error {}", dataText, e.getMessage());
                return null;
            }
        }
        return dataNode;
    }

    @Override
    public void flatMap(final JsonNode value, final Collector<Tuple2<JsonNode, JsonNode>> out) {
        try {
            JsonNode jsonNode = value;
            String dataText = jsonNode.get("data").asText();
            JsonNode dataNode = decodeData(dataText);

            if (dataNode == null) {
                log.warn("decodeData error, appId: {}, dataText: {}", this.appId, dataText);
                return;
            }

            ObjectNode ingestNode = OBJECT_MAPPER.createObjectNode();
            ingestNode.set("date", jsonNode.get("date"));
            ingestNode.put("ingest_time", jsonNode.get("ingest_time").asLong());
            ingestNode.set("ip", jsonNode.get("ip"));
            ingestNode.set("method", jsonNode.get("method"));
            ingestNode.set("path", jsonNode.get("path"));
            ingestNode.set("platform", jsonNode.get("platform"));
            ingestNode.set("rid", jsonNode.get("rid"));
            ingestNode.put("server_ingest_time", jsonNode.get("server_ingest_time").asLong());
            ingestNode.set("source_type", jsonNode.get("source_type"));
            ingestNode.set("timestamp", jsonNode.get("timestamp"));
            ingestNode.set("ua", jsonNode.get("ua"));
            ingestNode.set("uri", jsonNode.get("uri"));

            if (dataNode.isArray()) {
                Iterator<JsonNode> iterator = dataNode.elements();
                while (iterator.hasNext()) {
                    out.collect(new Tuple2<>(ingestNode, iterator.next()));
                }
            } else {
                out.collect(new Tuple2<>(ingestNode, dataNode));
            }
        } catch (Exception e) {
            throw new ClickstreamException(e);
        }
    }
}
