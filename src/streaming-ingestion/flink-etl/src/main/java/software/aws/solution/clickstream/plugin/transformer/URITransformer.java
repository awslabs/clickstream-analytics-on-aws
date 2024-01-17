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


package software.aws.solution.clickstream.plugin.transformer;

import lombok.extern.slf4j.Slf4j;
import org.apache.flink.shaded.jackson2.com.fasterxml.jackson.databind.ObjectMapper;
import org.apache.flink.shaded.jackson2.com.fasterxml.jackson.databind.node.ArrayNode;
import org.apache.flink.shaded.jackson2.com.fasterxml.jackson.databind.node.JsonNodeFactory;
import org.apache.flink.shaded.jackson2.com.fasterxml.jackson.databind.node.ObjectNode;

import java.net.URL;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static software.aws.solution.clickstream.function.TransformDataMapFunction.EVENT_BUNDLE_SEQUENCE_ID;

@Slf4j
public class URITransformer implements Transformer {
    public static final String PARAM_KEY_URI = "uri";
    private static final long serialVersionUID = 17054589439690001L;

    @Override
    public ObjectNode transform(final Map<String, String> paramMap) {

        ObjectMapper jsonParser = new ObjectMapper();
        ObjectNode node = jsonParser.createObjectNode();
        String uri = paramMap.get(PARAM_KEY_URI);

        try {
            String url = ("http:" + uri).replace("\"", "");
            String query = new URL(url).getQuery();
            Map<String, String> queryPairs = new HashMap<>();
            String[] pairs = query.split("&");
            for (String pair : pairs) {
                int idx = pair.indexOf("=");
                queryPairs.put(URLDecoder.decode(pair.substring(0, idx), StandardCharsets.UTF_8), URLDecoder.decode(pair.substring(idx + 1), StandardCharsets.UTF_8));
            }
            node.set(EVENT_BUNDLE_SEQUENCE_ID, JsonNodeFactory.instance.numberNode(Long.parseLong(queryPairs.get(EVENT_BUNDLE_SEQUENCE_ID))));
        } catch (Exception e) {
            log.error("Get event_bundle_sequence_id error:", e);
            node.set(EVENT_BUNDLE_SEQUENCE_ID, JsonNodeFactory.instance.numberNode(0));
        }
        return node;
    }

    @Override
    public ArrayNode transformArrayNode(final List<KvObjectNode> paramList) {
        return null;
    }

    @Override
    public ObjectNode transformObjectNode(final List<JsonObjectNode> paramList) {
        return null;
    }

    @Override
    public ArrayNode transformUserArrayNode(final List<UserKvObjectNode> paramList) {
        return null;
    }
}
