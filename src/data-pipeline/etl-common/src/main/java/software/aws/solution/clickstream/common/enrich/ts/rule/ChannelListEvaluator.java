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
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.Getter;
import lombok.extern.slf4j.Slf4j;

import java.io.File;
import java.io.FileNotFoundException;
import java.io.IOException;
import java.util.List;

import static software.aws.solution.clickstream.common.Util.readResourceFile;
import static software.aws.solution.clickstream.common.Util.readTextFile;

@Slf4j
public final class ChannelListEvaluator {
    public static final String UNASSIGNED = "Unassigned";
    @Getter
    private List<ChannelRule> channelRules;

    private ChannelListEvaluator() {

    }

    public static ChannelListEvaluator fromJson(final String jsonArray) throws JsonProcessingException {
        ObjectMapper objectMapper = new ObjectMapper();
        List<ChannelRule> ruleList = objectMapper.readValue(jsonArray, new TypeReference<List<ChannelRule>>() {
        });
        ChannelListEvaluator channelListEvaluator = new ChannelListEvaluator();
        channelListEvaluator.channelRules = ruleList;
        return channelListEvaluator;
    }

    public static ChannelListEvaluator fromJsonFile(final String fileName) throws IOException {
        File f = new File(fileName);
        if (f.exists() && !f.isDirectory()) {
            log.info("Reading channel rules from file: {}", fileName);
            return fromJson(readTextFile(fileName));
        }

        if (ChannelListEvaluator.class.getClassLoader().getResource(fileName) != null) {
            log.info("Reading channel rules from resource file: {}", fileName);
            return fromJson(readResourceFile(fileName));
        }

        log.error("Channel rules file not found: {}", fileName);
        throw new FileNotFoundException("Channel rules file not found: " + fileName);
    }

    public String evaluate(final ChannelRuleEvaluatorInput channelRuleEvaluatorInput) {
        log.info("Evaluating channel rule for: {}", channelRuleEvaluatorInput.toString());
        ChannelRuleEvaluator evaluator = ChannelRuleEvaluator.getInstance();

        for (ChannelRule rule : this.channelRules) {
            if (evaluator.evaluate(rule, channelRuleEvaluatorInput)) {
                return rule.getChannel();
            }
        }
        log.info("No channel rule matched for: {}", channelRuleEvaluatorInput.toString());
        return UNASSIGNED;
    }
}
