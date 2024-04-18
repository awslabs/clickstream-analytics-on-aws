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

public class ChannelRuleTest extends BaseTest {

    @Test
    void test_channel_rule_from_json1() throws JsonProcessingException {
        //./gradlew clean test --info --tests software.aws.solution.clickstream.common.enrich.ts.rule.ChannelRuleTest.test_channel_rule_from_json1

        ObjectMapper objectMapper = new ObjectMapper();
        String json = "{\n" +
                "  \"id\": \"rule1\",\n" +
                "  \"channel\": \"channel1\",\n" +
                "  \"condition\": {\n" +
                "    \"op::and\": [\n" +
                "      {\n" +
                "        \"field\": \"event_type\",\n" +
                "        \"op\": \"eq\",\n" +
                "        \"value\": \"page_view\"\n" +
                "      },\n" +
                "      {\n" +
                "        \"field\": \"platform\",\n" +
                "        \"op\": \"eq\",\n" +
                "        \"value\": \"web\"\n" +
                "      }\n" +
                "    ]\n" +
                "  }\n" +
                "}";

        ChannelRule channelRule = objectMapper.readValue(json, ChannelRule.class);
        Assertions.assertEquals("rule1", channelRule.getId());
        Assertions.assertEquals("channel1", channelRule.getChannel());
        Assertions.assertEquals("page_view", channelRule.getCondition().getOpAndList().get(0).getValue());
        Assertions.assertNull(channelRule.getCondition().getOpOrList());
    }

    @Test
    void test_channel_rule_from_json2() throws JsonProcessingException {
        //./gradlew clean test --info --tests software.aws.solution.clickstream.common.enrich.ts.rule.ChannelRuleTest.test_channel_rule_from_json2

        ObjectMapper objectMapper = new ObjectMapper();
        String json = " {\n" +
                "    \"id\": \"rule#2\",\n" +
                "    \"channel\": \"Paid Search\",\n" +
                "    \"displayName\": {\n" +
                "      \"en-US\": \"Paid Search\",\n" +
                "      \"zh-CN\": \"付费搜索\"\n" +
                "    },\n" +
                "    \"description\": {\n" +
                "      \"en-US\": \"Paid search is a form of digital marketing where search engines such as Google and Bing allow advertisers to show ads on their search engine results pages (SERPs). Paid search works on a pay-per-click model, meaning you do exactly that – until someone clicks on your ad, you don’t pay.\",\n" +
                "      \"zh-CN\": \"付费搜索是数字营销的一种形式，搜索引擎（如 Google 和必应）允许广告商在其搜索引擎结果页面（SERP）上显示广告。付费搜索采用按点击付费的模式运作，这意味着您确实如此 - 直到有人点击您的广告，您才需要支付费用。\"\n" +
                "    },\n" +
                "    \"condition\": {\n" +
                "      \"op::and\": [{\n" +
                "          \"field\": \"traffic_source_category\",\n" +
                "          \"op\": \"eq\",\n" +
                "          \"value\": \"Search\"\n" +
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

        ChannelRule channelRule = objectMapper.readValue(json, ChannelRule.class);
        Assertions.assertEquals("rule#2", channelRule.getId());
        Assertions.assertEquals("Paid Search", channelRule.getChannel());
        Assertions.assertEquals("traffic_source_category", channelRule.getCondition().getOpAndList().get(0).getField());
        Assertions.assertEquals("__empty__", channelRule.getCondition().getOpAndList().get(1).getOpOrList().get(1).getValue());
    }


}
