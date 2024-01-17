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
import org.apache.flink.shaded.jackson2.com.fasterxml.jackson.databind.node.JsonNodeFactory;
import org.apache.flink.shaded.jackson2.com.fasterxml.jackson.databind.node.ObjectNode;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

public class KvTransformer implements Transformer {
    public static final String PARAM_KEY_NAME = "key";
    public static final String PARAM_KEY_DOUBLE_VALUE = "double_value";
    public static final String PARAM_KEY_FLOAT_VALUE = "float_value";
    public static final String PARAM_KEY_INT_VALUE = "int_value";
    public static final String PARAM_KEY_STRING_VALUE = "string_value";

    public ArrayNode transformArrayNode(final List<KvObjectNode> paramList) {
        ObjectMapper jsonParser = new ObjectMapper();
        ArrayNode eventParams = jsonParser.createArrayNode();
        for (KvObjectNode kvObj : paramList) {
            Map<String, String> kvParamMap = new HashMap<>();
            kvParamMap.put(KvTransformer.PARAM_KEY_NAME, kvObj.getKey());
            if (kvObj.getValueFormat() != null && kvObj.getValue() != null) {
                kvParamMap.put(kvObj.getValueFormat(), kvObj.getValue());
            }
            eventParams.add(this.transform(kvParamMap));
        }
        return eventParams;
    }

    public ArrayNode transformUserArrayNode(final List<UserKvObjectNode> paramList) {
        ObjectMapper jsonParser = new ObjectMapper();
        ArrayNode userProps = jsonParser.createArrayNode();
        for (UserKvObjectNode kvObj : paramList) {
            Map<String, String> kvParamMap = new HashMap<>();
            kvParamMap.put(KvTransformer.PARAM_KEY_NAME, kvObj.getKey());
            if (kvObj.getValueFormat() != null && kvObj.getValue() != null) {
                kvParamMap.put(kvObj.getValueFormat(), kvObj.getValue());
            }
            ObjectNode kvNode = this.transform(kvParamMap);
            kvNode.set("set_timestamp", JsonNodeFactory.instance.numberNode(kvObj.getSetTimestamp()));
            userProps.add(kvNode);
        }
        return userProps;
    }

    @Override
    public ObjectNode transformObjectNode(final List<JsonObjectNode> paramList) {
        return null;
    }

    @Override
    public ObjectNode transform(final Map<String, String> paramMap) {
        ObjectMapper jsonParser = new ObjectMapper();
        ObjectNode eventParam = jsonParser.createObjectNode();
        eventParam.put("key", paramMap.get(PARAM_KEY_NAME));
        ObjectNode valueNode = jsonParser.createObjectNode();
        if (paramMap.containsKey(PARAM_KEY_DOUBLE_VALUE)) {
            valueNode.put(PARAM_KEY_DOUBLE_VALUE, Double.parseDouble(paramMap.get(PARAM_KEY_DOUBLE_VALUE)));
        } else {
            valueNode.set(PARAM_KEY_DOUBLE_VALUE, null);
        }
        if (paramMap.containsKey(PARAM_KEY_FLOAT_VALUE)) {
            valueNode.put(PARAM_KEY_FLOAT_VALUE, Float.parseFloat(paramMap.get(PARAM_KEY_FLOAT_VALUE)));
        } else {
            valueNode.set(PARAM_KEY_FLOAT_VALUE, null);
        }
        if (paramMap.containsKey(PARAM_KEY_INT_VALUE)) {
            valueNode.put(PARAM_KEY_INT_VALUE, Long.parseLong(paramMap.get(PARAM_KEY_INT_VALUE)));
        } else {
            valueNode.set(PARAM_KEY_INT_VALUE, null);
        }
        if (paramMap.containsKey(PARAM_KEY_STRING_VALUE)) {
            valueNode.put(PARAM_KEY_STRING_VALUE, paramMap.get(PARAM_KEY_STRING_VALUE));
        } else {
            valueNode.set(PARAM_KEY_STRING_VALUE, null);
        }
        eventParam.set("value", valueNode);

        return eventParam;
    }
}
