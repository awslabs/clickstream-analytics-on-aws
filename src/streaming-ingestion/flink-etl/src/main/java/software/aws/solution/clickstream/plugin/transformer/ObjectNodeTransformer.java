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

import org.apache.flink.shaded.jackson2.com.fasterxml.jackson.databind.ObjectMapper;
import org.apache.flink.shaded.jackson2.com.fasterxml.jackson.databind.node.ArrayNode;
import org.apache.flink.shaded.jackson2.com.fasterxml.jackson.databind.node.ObjectNode;

import java.util.List;
import java.util.Map;

public class ObjectNodeTransformer implements Transformer {
    public static final String PARAM_KEY_DOUBLE_VALUE = "double_value";
    public static final String PARAM_KEY_FLOAT_VALUE = "float_value";
    public static final String PARAM_KEY_INT_VALUE = "int_value";
    public static final String PARAM_KEY_STRING_VALUE = "string_value";
    public static final String PARAM_KEY_JSON_VALUE = "json_value";
    public static final String PARAM_KEY_NULL_VALUE = "null_value";
    private static final long serialVersionUID = 17054589439690001L;

    @Override
    public ObjectNode transform(final Map<String, String> paramMap) {
        return null;
    }

    @Override
    public ArrayNode transformArrayNode(final List<KvObjectNode> paramList) {
        return null;
    }

    @Override
    public ObjectNode transformObjectNode(final List<JsonObjectNode> paramList) {
        ObjectMapper jsonParser = new ObjectMapper();
        ObjectNode node = jsonParser.createObjectNode();
        for (JsonObjectNode jsonObj : paramList) {
            if (PARAM_KEY_JSON_VALUE.equals(jsonObj.getValueFormat())) {
                node.set(jsonObj.getKey(), jsonObj.getValue());
            } else if (PARAM_KEY_DOUBLE_VALUE.equals(jsonObj.getValueFormat())) {
                node.put(jsonObj.getKey(), jsonObj.getValue().asDouble());
            } else if (PARAM_KEY_FLOAT_VALUE.equals(jsonObj.getValueFormat())) {
                node.put(jsonObj.getKey(), jsonObj.getValue().asDouble());
            } else if (PARAM_KEY_INT_VALUE.equals(jsonObj.getValueFormat())) {
                node.put(jsonObj.getKey(), jsonObj.getValue().asLong());
            } else if (PARAM_KEY_STRING_VALUE.equals(jsonObj.getValueFormat())) {
                node.put(jsonObj.getKey(), jsonObj.getValue().asText());
            } else if (PARAM_KEY_NULL_VALUE.equals(jsonObj.getValueFormat())) {
                node.set(jsonObj.getKey(), null);
            } else {
                node.set(jsonObj.getKey(), null);
            }
        }
        return node;
    }

    @Override
    public ArrayNode transformUserArrayNode(final List<UserKvObjectNode> paramList) {
        return null;
    }
}
