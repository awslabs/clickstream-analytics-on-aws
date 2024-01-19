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

package software.aws.solution.clickstream.flink.transformer;

import org.apache.flink.shaded.jackson2.com.fasterxml.jackson.databind.JsonNode;
import org.apache.flink.shaded.jackson2.com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;
import software.aws.solution.clickstream.plugin.transformer.JsonObjectNode;
import software.aws.solution.clickstream.plugin.transformer.ObjectNodeTransformer;

import java.util.Arrays;
import java.util.List;

public class ObjectNodeTransformerTest {

    @Test
    void testTransformObjectNode() {
        ObjectMapper jsonParser = new ObjectMapper();

        List<JsonObjectNode> paramList = Arrays.asList(
          new JsonObjectNode("kInt", jsonParser.convertValue(1, JsonNode.class), ObjectNodeTransformer.PARAM_KEY_INT_VALUE),
                new JsonObjectNode("kstr1", jsonParser.convertValue("stringV1", JsonNode.class), ObjectNodeTransformer.PARAM_KEY_STRING_VALUE),
                new JsonObjectNode("kdouble", jsonParser.convertValue(12.3, JsonNode.class), ObjectNodeTransformer.PARAM_KEY_DOUBLE_VALUE),
                new JsonObjectNode("kfloat", jsonParser.convertValue(0.1, JsonNode.class), ObjectNodeTransformer.PARAM_KEY_FLOAT_VALUE),
                new JsonObjectNode("kstr2", jsonParser.convertValue(0.1, JsonNode.class), "unknown")
        );

        ObjectNodeTransformer objectNodeTransformer = new ObjectNodeTransformer();
        JsonNode outNode = objectNodeTransformer.transformObjectNode(paramList);
        System.out.println(outNode);
        Assertions.assertEquals("{\"kInt\":1,\"kstr1\":\"stringV1\",\"kdouble\":12.3,\"kfloat\":0.1,\"kstr2\":\"0.1\"}", outNode.toString());
    }

    @Test
    void testOtherTransformer() {
        ObjectNodeTransformer objectNodeTransformer = new ObjectNodeTransformer();
        Assertions.assertNull(objectNodeTransformer.transformArrayNode(null));
        Assertions.assertNull(objectNodeTransformer.transformUserArrayNode(null));
        Assertions.assertNull(objectNodeTransformer.transform(null));
    }

}
