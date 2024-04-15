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
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import software.aws.solution.clickstream.BaseTest;

import java.io.File;
import java.io.FileNotFoundException;
import java.io.IOException;

public class ChannelListEvaluatorTest extends BaseTest {

    @Test
    void shouldParseJsonArraySuccessfully() throws JsonProcessingException {
        //  ./gradlew clean test --info --tests software.aws.solution.clickstream.common.enrich.ts.rule.ChannelListEvaluatorTest.shouldParseJsonArraySuccessfully
        String jsonArray = "[{ \"id\": \"id1\", \"channel\": \"channel_test\", \"condition\": {\"op::and\": [{\"field\": \"traffic_source_category\", \"op\": \"eq\", \"value\": \"Search\"}]}}]";
        ChannelListEvaluator channelListEvaluator = ChannelListEvaluator.fromJson(jsonArray);
        Assertions.assertNotNull(channelListEvaluator);
        Assertions.assertEquals(1, channelListEvaluator.getChannelRules().size());
        Assertions.assertEquals("channel_test", channelListEvaluator.getChannelRules().get(0).getChannel());
    }

    @Test
    void shouldThrowExceptionWhenJsonArrayIsInvalid1() {
        //  ./gradlew clean test --info --tests software.aws.solution.clickstream.common.enrich.ts.rule.ChannelListEvaluatorTest.shouldThrowExceptionWhenJsonArrayIsInvalid1
        String jsonArray = "[{\"condition\": {\"op_and\": [{\"field\": \"traffic_source_category\", \"op\": \"eq\"}]}}]";
        Assertions.assertThrows(JsonProcessingException.class, () -> ChannelListEvaluator.fromJson(jsonArray));
    }

    @Test
    void shouldThrowExceptionWhenFileNotExists() {
        //  ./gradlew clean test --info --tests software.aws.solution.clickstream.common.enrich.ts.rule.ChannelListEvaluatorTest.shouldThrowExceptionWhenFileNotExists
        File file = Mockito.mock(File.class);
        Mockito.when(file.exists()).thenReturn(true);
        Mockito.when(file.isDirectory()).thenReturn(false);
        String fileName = "_rules_not_exists.json";
        Assertions.assertThrows(FileNotFoundException.class, () -> ChannelListEvaluator.fromJsonFile(fileName));
    }

    @Test
    void shouldReadFromFile() throws IOException {
        //  ./gradlew clean test --info --tests software.aws.solution.clickstream.common.enrich.ts.rule.ChannelListEvaluatorTest.shouldReadFromFile
        String jsonArray = "[{ \"id\": \"id1\", \"channel\": \"channel_test\", \"condition\": {\"op::and\": [{\"field\": \"traffic_source_category\", \"op\": \"eq\", \"value\": \"Search\"}]}}]";
        String fileName = "/tmp/_test_rules.json";
        writeStringToFile(fileName, jsonArray);

        ChannelListEvaluator channelListEvaluator = ChannelListEvaluator.fromJsonFile(fileName);
        Assertions.assertNotNull(channelListEvaluator);
        Assertions.assertEquals(1, channelListEvaluator.getChannelRules().size());
        Assertions.assertEquals("channel_test", channelListEvaluator.getChannelRules().get(0).getChannel());
    }

    @Test
    void shouldReadFromResourceFile() throws IOException {
        //  ./gradlew clean test --info --tests software.aws.solution.clickstream.common.enrich.ts.rule.ChannelListEvaluatorTest.shouldReadFromResourceFile
        String fileName = "ts/traffic_source_channel_rule_test.json";
        ChannelListEvaluator channelListEvaluator = ChannelListEvaluator.fromJsonFile(fileName);
        Assertions.assertNotNull(channelListEvaluator);
        Assertions.assertEquals(2, channelListEvaluator.getChannelRules().size());
        Assertions.assertEquals("Direct", channelListEvaluator.getChannelRules().get(0).getChannel());
    }

    @Test
    void shouldEvaluateChannel() throws IOException {
        //  ./gradlew clean test --info --tests software.aws.solution.clickstream.common.enrich.ts.rule.ChannelListEvaluatorTest.shouldEvaluateChannel
        String fileName = "ts/traffic_source_channel_rule_test.json";
        ChannelListEvaluator channelListEvaluator = ChannelListEvaluator.fromJsonFile(fileName);
        ChannelRuleEvaluatorInput input = new ChannelRuleEvaluatorInput();
        input.setTrafficSourceCategory("Search");
        input.setTrafficSourceClid("cid");
        Assertions.assertEquals( "Paid Search", channelListEvaluator.evaluate(input));
    }

    @Test
    void shouldEvaluateChannel2() throws IOException {
        //  ./gradlew clean test --info --tests software.aws.solution.clickstream.common.enrich.ts.rule.ChannelListEvaluatorTest.shouldEvaluateChannel2
        String fileName = "ts/traffic_source_channel_rule_test.json";
        ChannelListEvaluator channelListEvaluator = ChannelListEvaluator.fromJsonFile(fileName);
        ChannelRuleEvaluatorInput input = new ChannelRuleEvaluatorInput();
        input.setTrafficSourceCategory("SearchX");
        input.setTrafficSourceClid("cid");
        Assertions.assertEquals(ChannelListEvaluator.UNASSIGNED, channelListEvaluator.evaluate(input));
    }

    @Test
    void shouldEvaluateChannel3() throws IOException {
        // ./gradlew clean test --info --tests software.aws.solution.clickstream.common.enrich.ts.rule.ChannelListEvaluatorTest.shouldEvaluateChannel3
        String fileName = "ts/traffic_source_channel_rule_test.json";
        ChannelListEvaluator channelListEvaluator = ChannelListEvaluator.fromJsonFile(fileName);
        ChannelRuleEvaluatorInput input = new ChannelRuleEvaluatorInput();
        Assertions.assertEquals("Direct", channelListEvaluator.evaluate(input));
    }

    @Test
    void shouldReadFromResourceFile2() throws IOException {
        //  ./gradlew clean test --info --tests software.aws.solution.clickstream.common.enrich.ts.rule.ChannelListEvaluatorTest.shouldReadFromResourceFile2
        String fileName = "ts/traffic_source_channel_rule_v0.json";
        ChannelListEvaluator channelListEvaluator = ChannelListEvaluator.fromJsonFile(fileName);
        Assertions.assertNotNull(channelListEvaluator);
        Assertions.assertEquals(16, channelListEvaluator.getChannelRules().size());
        Assertions.assertEquals("Direct", channelListEvaluator.getChannelRules().get(0).getChannel());
    }

}

