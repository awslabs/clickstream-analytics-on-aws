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

import java.util.HashMap;
import java.util.List;
import java.util.Map;

public class KvTransformer implements Transformer{
    public static final String PARAM_KEY_NAME = "key";
    public static final String PARAM_KEY_DOUBLE_VALUE = "double_value";
    public static final String PARAM_KEY_FLOAT_VALUE = "float_value";
    public static final String PARAM_KEY_INT_VALUE = "int_value";
    public static final String PARAM_KEY_STRING_VALUE = "string_value";

    public ArrayNode transformArrayNode(List<KvObjectNode> paramList) {
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

    @Override
    public ObjectNode transformObjectNode(List<JsonObjectNode> paramList) {
        return null;
    }

    @Override
    public ObjectNode transform(Map<String, String> paramMap) {
        ObjectMapper jsonParser = new ObjectMapper();
        ObjectNode eventParam = jsonParser.createObjectNode();
        eventParam.put("key", paramMap.get(PARAM_KEY_NAME));
        ObjectNode valueNode = jsonParser.createObjectNode();
        if (paramMap.containsKey(PARAM_KEY_DOUBLE_VALUE)) {
            valueNode.put("double_value", Double.parseDouble(paramMap.get(PARAM_KEY_DOUBLE_VALUE)));
        } else {
            valueNode.set("double_value", null);
        }
        if (paramMap.containsKey(PARAM_KEY_FLOAT_VALUE)) {
            valueNode.put("float_value", Float.parseFloat(paramMap.get(PARAM_KEY_FLOAT_VALUE)));
        } else {
            valueNode.set("float_value", null);
        }
        if (paramMap.containsKey(PARAM_KEY_INT_VALUE)) {
            valueNode.put("int_value", Long.parseLong(paramMap.get(PARAM_KEY_INT_VALUE)));
        } else {
            valueNode.set("int_value", null);
        }
        if (paramMap.containsKey(PARAM_KEY_STRING_VALUE)) {
            valueNode.put("string_value", paramMap.get(PARAM_KEY_STRING_VALUE));
        } else {
            valueNode.set("string_value", null);
        }
        eventParam.set("value", valueNode);

        return eventParam;
    }
}
