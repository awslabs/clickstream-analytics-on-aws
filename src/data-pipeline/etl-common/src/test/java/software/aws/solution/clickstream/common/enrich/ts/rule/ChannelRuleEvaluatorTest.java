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

package software.aws.solution.clickstream.common.enrich.ts.rule;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;
import software.aws.solution.clickstream.BaseTest;

import java.util.Arrays;
import java.util.Collections;

import static software.aws.solution.clickstream.common.enrich.ts.rule.ChannelRuleEvaluator.EMPTY_VALUE_FLAG;

public class ChannelRuleEvaluatorTest extends BaseTest {

    @Test
    void shouldEvaluateAndConditionSuccessfully() {
        // ./gradlew clean test --info --tests software.aws.solution.clickstream.common.enrich.ts.rule.ChannelRuleEvaluatorTest.shouldEvaluateAndConditionSuccessfully
        ChannelRuleEvaluator evaluator = ChannelRuleEvaluator.getInstance();
        ChannelRuleConditionItem item1 = new ChannelRuleConditionItem();
        item1.setField("traffic_source_category");
        item1.setOp("eq");
        item1.setValue("Search");

        ChannelRuleConditionItem item2 = new ChannelRuleConditionItem();
        item2.setField("traffic_source_medium");
        item2.setOp("eq");
        item2.setValue("web");

        ChannelRuleCondition condition = new ChannelRuleCondition();
        condition.setOpAndList(Arrays.asList(item1, item2));

        ChannelRule rule = new ChannelRule();
        rule.setCondition(condition);

        ChannelRuleEvaluatorInput input = new ChannelRuleEvaluatorInput();
        input.setTrafficSourceCategory("Search");
        input.setTrafficSourceMedium("web");

        Assertions.assertTrue(evaluator.evaluate(rule, input));
    }


    @Test
    void shouldEvaluateConditionWithEmptyValueSuccessfully() {
        // ./gradlew clean test --info --tests software.aws.solution.clickstream.common.enrich.ts.rule.ChannelRuleEvaluatorTest.shouldEvaluateConditionWithEmptyValueSuccessfully
        ChannelRuleEvaluator evaluator = ChannelRuleEvaluator.getInstance();
        ChannelRuleConditionItem item1 = new ChannelRuleConditionItem();
        item1.setField("traffic_source_category");
        item1.setOp("eq");
        item1.setValue(EMPTY_VALUE_FLAG);

        ChannelRuleCondition condition = new ChannelRuleCondition();
        condition.setOpAndList(Collections.singletonList(item1));

        ChannelRule rule = new ChannelRule();
        rule.setCondition(condition);

        ChannelRuleEvaluatorInput input = new ChannelRuleEvaluatorInput();
        input.setTrafficSourceCategory(null);

        Assertions.assertTrue(evaluator.evaluate(rule, input));
    }

    @Test
    void shouldEvaluateOrConditionSuccessfully() {
        // ./gradlew clean test --info --tests software.aws.solution.clickstream.common.enrich.ts.rule.ChannelRuleEvaluatorTest.shouldEvaluateAndConditionSuccessfully
        ChannelRuleEvaluator evaluator = ChannelRuleEvaluator.getInstance();
        ChannelRuleConditionItem item1 = new ChannelRuleConditionItem();
        item1.setField("traffic_source_category");
        item1.setOp("eq");
        item1.setValue("Search");

        ChannelRuleConditionItem item2 = new ChannelRuleConditionItem();
        item2.setField("traffic_source_medium");
        item2.setOp("eq");
        item2.setValue("web");

        ChannelRuleCondition condition = new ChannelRuleCondition();
        condition.setOpOrList(Arrays.asList(item1, item2));

        ChannelRule rule = new ChannelRule();
        rule.setCondition(condition);

        ChannelRuleEvaluatorInput input = new ChannelRuleEvaluatorInput();
        input.setTrafficSourceCategory("Social");

        Assertions.assertFalse(evaluator.evaluate(rule, input));
    }

    @Test
    void shouldFailWhenBothAndOrConditionsArePresent() {
        //  ./gradlew clean test --info --tests software.aws.solution.clickstream.common.enrich.ts.rule.ChannelRuleEvaluatorTest.shouldFailWhenBothAndOrConditionsArePresent
        ChannelRuleEvaluator evaluator = ChannelRuleEvaluator.getInstance();
        ChannelRuleConditionItem item1 = new ChannelRuleConditionItem();
        item1.setField("traffic_source_category");
        item1.setOp("eq");
        item1.setValue("Search");

        ChannelRuleConditionItem item2 = new ChannelRuleConditionItem();
        item2.setField("traffic_source_medium");
        item2.setOp("eq");
        item2.setValue("web");

        ChannelRuleCondition condition = new ChannelRuleCondition();
        condition.setOpAndList(Collections.singletonList(item1));
        condition.setOpOrList(Collections.singletonList(item2));

        ChannelRule rule = new ChannelRule();
        rule.setCondition(condition);

        ChannelRuleEvaluatorInput input = new ChannelRuleEvaluatorInput();
        input.setTrafficSourceCategory("Search");

        Assertions.assertThrows(IllegalArgumentException.class, () -> evaluator.evaluate(rule, input));
    }

    @Test
    void shouldFailWhenBothAndFieldConditionsArePresent() {
        //  ./gradlew clean test --info --tests software.aws.solution.clickstream.common.enrich.ts.rule.ChannelRuleEvaluatorTest.shouldFailWhenBothAndFieldConditionsArePresent
        ChannelRuleEvaluator evaluator = ChannelRuleEvaluator.getInstance();
        ChannelRuleConditionItem item1 = new ChannelRuleConditionItem();
        item1.setField("traffic_source_category");
        item1.setOp("eq");
        item1.setValue("Search");

        ChannelRuleConditionItem item2 = new ChannelRuleConditionItem();
        item2.setField("traffic_source_medium");
        item2.setOp("eq");
        item2.setValue("web");

        item1.setOpAndList(Collections.singletonList(item2));

        ChannelRuleCondition condition = new ChannelRuleCondition();
        condition.setOpAndList(Collections.singletonList(item1));


        ChannelRule rule = new ChannelRule();
        rule.setCondition(condition);

        ChannelRuleEvaluatorInput input = new ChannelRuleEvaluatorInput();
        input.setTrafficSourceCategory("Search");

        Assertions.assertThrows(IllegalArgumentException.class, () -> evaluator.evaluate(rule, input));
    }

    @Test
    void shouldFailWhenOpOrFieldConditionsAreNotPresent() {
        //  ./gradlew clean test --info --tests software.aws.solution.clickstream.common.enrich.ts.rule.ChannelRuleEvaluatorTest.shouldFailWhenOpOrFieldConditionsAreNotPresent
        ChannelRuleEvaluator evaluator = ChannelRuleEvaluator.getInstance();
        ChannelRuleConditionItem item1 = new ChannelRuleConditionItem();
        item1.setValue("Search");

        ChannelRuleCondition condition = new ChannelRuleCondition();
        condition.setOpAndList(Collections.singletonList(item1));

        ChannelRule rule = new ChannelRule();
        rule.setCondition(condition);

        ChannelRuleEvaluatorInput input = new ChannelRuleEvaluatorInput();
        input.setTrafficSourceCategory("Search");

        Assertions.assertThrows(IllegalArgumentException.class, () -> evaluator.evaluate(rule, input));
    }


    @Test
    void shouldFailWhenBothOrFieldConditionsArePresent() {
        //  ./gradlew clean test --info --tests software.aws.solution.clickstream.common.enrich.ts.rule.ChannelRuleEvaluatorTest.shouldFailWhenBothOrFieldConditionsArePresent
        ChannelRuleEvaluator evaluator = ChannelRuleEvaluator.getInstance();
        ChannelRuleConditionItem item1 = new ChannelRuleConditionItem();
        item1.setField("traffic_source_category");
        item1.setOp("eq");
        item1.setValue("Search");

        ChannelRuleConditionItem item2 = new ChannelRuleConditionItem();
        item2.setField("traffic_source_medium");
        item2.setOp("eq");
        item2.setValue("web");

        item1.setOpOrList(Collections.singletonList(item2));

        ChannelRuleCondition condition = new ChannelRuleCondition();
        condition.setOpAndList(Collections.singletonList(item1));

        ChannelRule rule = new ChannelRule();
        rule.setCondition(condition);

        ChannelRuleEvaluatorInput input = new ChannelRuleEvaluatorInput();
        input.setTrafficSourceCategory("Search");

        Assertions.assertThrows(IllegalArgumentException.class, () -> evaluator.evaluate(rule, input));
    }


    @Test
    void shouldFailWhenFieldEqValuesConditionsArePresent() {
        //  ./gradlew clean test --info --tests software.aws.solution.clickstream.common.enrich.ts.rule.ChannelRuleEvaluatorTest.shouldFailWhenFieldEqValuesConditionsArePresent
        ChannelRuleEvaluator evaluator = ChannelRuleEvaluator.getInstance();
        ChannelRuleConditionItem item1 = new ChannelRuleConditionItem();
        item1.setField("traffic_source_category");
        item1.setOp("eq");
        item1.setValues(Collections.singletonList("Search"));


        ChannelRuleCondition condition = new ChannelRuleCondition();
        condition.setOpAndList(Collections.singletonList(item1));

        ChannelRule rule = new ChannelRule();
        rule.setCondition(condition);

        ChannelRuleEvaluatorInput input = new ChannelRuleEvaluatorInput();
        input.setTrafficSourceCategory("Search");

        Assertions.assertThrows(IllegalArgumentException.class, () -> evaluator.evaluate(rule, input));
    }

    @Test
    void shouldFailWhenFieldInValueConditionsArePresent() {
        //  ./gradlew clean test --info --tests software.aws.solution.clickstream.common.enrich.ts.rule.ChannelRuleEvaluatorTest.shouldFailWhenFieldInValueConditionsArePresent
        ChannelRuleEvaluator evaluator = ChannelRuleEvaluator.getInstance();
        ChannelRuleConditionItem item1 = new ChannelRuleConditionItem();
        item1.setField("traffic_source_category");
        item1.setOp("in");
        item1.setValue("Search");

        ChannelRuleCondition condition = new ChannelRuleCondition();
        condition.setOpAndList(Collections.singletonList(item1));

        ChannelRule rule = new ChannelRule();
        rule.setCondition(condition);

        ChannelRuleEvaluatorInput input = new ChannelRuleEvaluatorInput();
        input.setTrafficSourceCategory("Search");

        Assertions.assertThrows(IllegalArgumentException.class, () -> evaluator.evaluate(rule, input));
    }

    @Test
    void shouldEvaluateRuleFromJson1() throws JsonProcessingException {
        // ./gradlew clean test --info --tests software.aws.solution.clickstream.common.enrich.ts.rule.ChannelRuleEvaluatorTest.shouldEvaluateRuleFromJson1
        String ruleJson = "{\n" +
                "    \"id\": \"rule#3\",\n" +
                "    \"channel\": \"Organic Search\",\n" +
                "    \"condition\": {\n" +
                "      \"op::and\": [{\n" +
                "          \"field\": \"traffic_source_category\",\n" +
                "          \"op\": \"eq\",\n" +
                "          \"value\": \"Search\"\n" +
                "        },\n" +
                "        {\n" +
                "          \"op::or\": [{\n" +
                "              \"field\": \"traffic_source_medium\",\n" +
                "              \"op\": \"eq\",\n" +
                "              \"value\": \"__empty__\"\n" +
                "            },\n" +
                "            {\n" +
                "              \"field\": \"traffic_source_medium\",\n" +
                "              \"op\": \"eq\",\n" +
                "              \"value\": \"organic\"\n" +
                "            }\n" +
                "          ]\n" +
                "        }\n" +
                "      ]\n" +
                "    }\n" +
                "  }";

        ObjectMapper objectMapper = new ObjectMapper();
        ChannelRule channelRule = objectMapper.readValue(ruleJson, ChannelRule.class);

        ChannelRuleEvaluatorInput input = new ChannelRuleEvaluatorInput();
        input.setTrafficSourceCategory("Search");
        input.setTrafficSourceMedium("organic");

        ChannelRuleEvaluator evaluator = ChannelRuleEvaluator.getInstance();
        Assertions.assertTrue(evaluator.evaluate(channelRule, input));
    }

    @Test
    void shouldEvaluateRuleFromJson2() throws JsonProcessingException {
        // ./gradlew clean test --info --tests software.aws.solution.clickstream.common.enrich.ts.rule.ChannelRuleEvaluatorTest.shouldEvaluateRuleFromJson2
        String ruleJson = "{\n" +
                "    \"id\": \"rule#3\",\n" +
                "    \"channel\": \"Organic Search\",\n" +
                "    \"condition\": {\n" +
                "      \"op::and\": [{\n" +
                "          \"field\": \"traffic_source_category\",\n" +
                "          \"op\": \"eq\",\n" +
                "          \"value\": \"Search\"\n" +
                "        },\n" +
                "        {\n" +
                "          \"op::or\": [{\n" +
                "              \"field\": \"traffic_source_medium\",\n" +
                "              \"op\": \"eq\",\n" +
                "              \"value\": \"__empty__\"\n" +
                "            },\n" +
                "            {\n" +
                "              \"field\": \"traffic_source_medium\",\n" +
                "              \"op\": \"eq\",\n" +
                "              \"value\": \"organic\"\n" +
                "            }\n" +
                "          ]\n" +
                "        }\n" +
                "      ]\n" +
                "    }\n" +
                "  }";

        ObjectMapper objectMapper = new ObjectMapper();
        ChannelRule channelRule = objectMapper.readValue(ruleJson, ChannelRule.class);


        ChannelRuleEvaluatorInput input2 = new ChannelRuleEvaluatorInput();
        input2.setTrafficSourceCategory("Search");
        input2.setTrafficSourceMedium(null);

        ChannelRuleEvaluator evaluator = ChannelRuleEvaluator.getInstance();
        Assertions.assertTrue(evaluator.evaluate(channelRule, input2));

    }

    @Test
    void shouldEvaluateRuleFromJson3() throws JsonProcessingException {
        // ./gradlew clean test --info --tests software.aws.solution.clickstream.common.enrich.ts.rule.ChannelRuleEvaluatorTest.shouldEvaluateRuleFromJson3
        String ruleJson = "{\n" +
                "    \"id\": \"rule#1\",\n" +
                "    \"channel\": \"Direct\",\n" +
                "    \"condition\": {\n" +
                "      \"op::and\": [{\n" +
                "          \"field\": \"traffic_source_category\",\n" +
                "          \"op\": \"eq\",\n" +
                "          \"value\": \"__empty__\"\n" +
                "        },\n" +
                "        {\n" +
                "          \"field\": \"traffic_source_source\",\n" +
                "          \"op\": \"eq\",\n" +
                "          \"value\": \"__empty__\"\n" +
                "        },\n" +
                "        {\n" +
                "          \"field\": \"traffic_source_medium\",\n" +
                "          \"op\": \"eq\",\n" +
                "          \"value\": \"__empty__\"\n" +
                "        },\n" +
                "        {\n" +
                "          \"field\": \"traffic_source_campaign\",\n" +
                "          \"op\": \"eq\",\n" +
                "          \"value\": \"__empty__\"\n" +
                "        },\n" +
                "        {\n" +
                "          \"field\": \"traffic_source_content\",\n" +
                "          \"op\": \"eq\",\n" +
                "          \"value\": \"__empty__\"\n" +
                "        },\n" +
                "        {\n" +
                "          \"field\": \"traffic_source_term\",\n" +
                "          \"op\": \"eq\",\n" +
                "          \"value\": \"__empty__\"\n" +
                "        },\n" +
                "        {\n" +
                "          \"field\": \"traffic_source_campaign_id\",\n" +
                "          \"op\": \"eq\",\n" +
                "          \"value\": \"__empty__\"\n" +
                "        },\n" +
                "        {\n" +
                "          \"field\": \"traffic_source_clid_platform\",\n" +
                "          \"op\": \"eq\",\n" +
                "          \"value\": \"__empty__\"\n" +
                "        },\n" +
                "        {\n" +
                "          \"field\": \"traffic_source_clid\",\n" +
                "          \"op\": \"eq\",\n" +
                "          \"value\": \"__empty__\"\n" +
                "        }\n" +
                "      ]\n" +
                "    }\n" +
                "  }";

        ObjectMapper objectMapper = new ObjectMapper();
        ChannelRule channelRule = objectMapper.readValue(ruleJson, ChannelRule.class);

        ChannelRuleEvaluatorInput input2 = new ChannelRuleEvaluatorInput();

        ChannelRuleEvaluator evaluator = ChannelRuleEvaluator.getInstance();
        Assertions.assertTrue(evaluator.evaluate(channelRule, input2));

    }

    @Test
    void shouldEvaluateRuleFromJson4() throws JsonProcessingException {
        // ./gradlew clean test --info --tests software.aws.solution.clickstream.common.enrich.ts.rule.ChannelRuleEvaluatorTest.shouldEvaluateRuleFromJson4
        String ruleJson = "  {\n" +
                "    \"id\": \"rule#4\",\n" +
                "    \"channel\": \"Paid Social\",\n" +
                "    \"condition\": {\n" +
                "      \"op::and\": [{\n" +
                "          \"field\": \"traffic_source_category\",\n" +
                "          \"op\": \"eq\",\n" +
                "          \"value\": \"Social\"\n" +
                "        },\n" +
                "        {\n" +
                "          \"op::or\": [{\n" +
                "              \"field\": \"traffic_source_medium\",\n" +
                "              \"op\": \"match\",\n" +
                "              \"value\": \"^(.*cp.*|ppc|retargeting|paid.*)$\"\n" +
                "            },\n" +
                "            {\n" +
                "              \"field\": \"traffic_source_clid\",\n" +
                "              \"op\": \"not_eq\",\n" +
                "              \"value\": \"__empty__\"\n" +
                "            }\n" +
                "          ]\n" +
                "        }\n" +
                "      ]\n" +
                "    }\n" +
                "  }";

        ObjectMapper objectMapper = new ObjectMapper();
        ChannelRule channelRule = objectMapper.readValue(ruleJson, ChannelRule.class);


        ChannelRuleEvaluatorInput input2 = new ChannelRuleEvaluatorInput();
        input2.setTrafficSourceCategory("Social");
        input2.setTrafficSourceMedium("ppc");

        ChannelRuleEvaluator evaluator = ChannelRuleEvaluator.getInstance();
        Assertions.assertTrue(evaluator.evaluate(channelRule, input2));
    }

    @Test
    void shouldEvaluateRuleFromJson5() throws JsonProcessingException {
        // ./gradlew clean test --info --tests software.aws.solution.clickstream.common.enrich.ts.rule.ChannelRuleEvaluatorTest.shouldEvaluateRuleFromJson5
        String ruleJson = "  {\n" +
                "    \"id\": \"rule#4\",\n" +
                "    \"channel\": \"Paid Social\",\n" +
                "    \"condition\": {\n" +
                "      \"op::and\": [{\n" +
                "          \"field\": \"traffic_source_category\",\n" +
                "          \"op\": \"eq\",\n" +
                "          \"value\": \"Social\"\n" +
                "        },\n" +
                "        {\n" +
                "          \"op::or\": [{\n" +
                "              \"field\": \"traffic_source_medium\",\n" +
                "              \"op\": \"match\",\n" +
                "              \"value\": \"^(.*cp.*|ppc|retargeting|paid.*)$\"\n" +
                "            },\n" +
                "            {\n" +
                "              \"field\": \"traffic_source_clid\",\n" +
                "              \"op\": \"not_eq\",\n" +
                "              \"value\": \"__empty__\"\n" +
                "            }\n" +
                "          ]\n" +
                "        }\n" +
                "      ]\n" +
                "    }\n" +
                "  }";

        ObjectMapper objectMapper = new ObjectMapper();
        ChannelRule channelRule = objectMapper.readValue(ruleJson, ChannelRule.class);

        ChannelRuleEvaluatorInput input2 = new ChannelRuleEvaluatorInput();
        input2.setTrafficSourceCategory("Social");
        input2.setTrafficSourceMedium("abc");
        input2.setTrafficSourceClid("123");

        ChannelRuleEvaluator evaluator = ChannelRuleEvaluator.getInstance();
        Assertions.assertTrue(evaluator.evaluate(channelRule, input2));
    }
}