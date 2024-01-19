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
