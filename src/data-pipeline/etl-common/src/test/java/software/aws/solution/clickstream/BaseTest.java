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

package software.aws.solution.clickstream;

import com.fasterxml.jackson.databind.*;
import com.google.common.io.*;
import org.apache.logging.log4j.*;
import org.apache.logging.log4j.core.config.*;
import org.junit.jupiter.api.*;
import software.aws.solution.clickstream.common.RuleConfig;
import software.aws.solution.clickstream.common.Util;

import java.io.*;
import java.nio.charset.*;
import java.nio.file.Files;
import java.nio.file.Paths;

public class BaseTest {
    @BeforeAll
    public static void setup() {
        Configurator.setRootLevel(Level.WARN);
        Configurator.setLevel("software.aws.solution.clickstream", Level.DEBUG);
    }
    public String resourceFileAsString(final String fileName) throws IOException {
        String jsonStr = Resources.toString(getClass().getResource(fileName), StandardCharsets.UTF_8).trim();
        ObjectMapper om = new ObjectMapper();
        JsonNode node = om.readTree(jsonStr);
        return node.toPrettyString();
    }

    public String resourceFileContent(final String fileName) throws IOException {
        return Resources.toString(getClass().getResource(fileName), StandardCharsets.UTF_8).trim();
    }

    public String prettyJson(String jsonStr) throws IOException {
        ObjectMapper om = new ObjectMapper();
        JsonNode node = om.readTree(jsonStr);
        return node.toPrettyString();
    }

    public void writeStringToFile(String fileName, String content) {
        // write string to file
        try (OutputStream outputStream = Files.newOutputStream(Paths.get(fileName))) {
            outputStream.write(content.getBytes(StandardCharsets.UTF_8));
        } catch (Exception e) {
            throw new RuntimeException("Failed to write to file: " + fileName, e);
        }
    }

    public RuleConfig getRuleConfigV0() throws IOException {
        RuleConfig ruleConfig = new RuleConfig();
        String channelRuleFile = "ts/traffic_source_channel_rule_v0.json";
        String categoryRuleFile = "ts/traffic_source_category_rule_v0.json";
        ruleConfig.setOptCategoryRuleJson(Util.readResourceFile(categoryRuleFile));
        ruleConfig.setOptChannelRuleJson(Util.readResourceFile(channelRuleFile));
        return ruleConfig;
    }

}
