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

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;

public class ChannelRuleEvaluatorInputTest {

    @Test
    void shouldSetAndGetTrafficSourceCategory() {
        ChannelRuleEvaluatorInput input = new ChannelRuleEvaluatorInput();
        input.setTrafficSourceCategory("Search");
        Assertions.assertEquals("Search", input.getTrafficSourceCategory());
    }

    @Test
    void shouldSetAndGetTrafficSourceSource() {
        ChannelRuleEvaluatorInput input = new ChannelRuleEvaluatorInput();
        input.setTrafficSourceSource("Google");
        Assertions.assertEquals("Google", input.getTrafficSourceSource());
    }

    @Test
    void shouldSetAndGetTrafficSourceMedium() {
        ChannelRuleEvaluatorInput input = new ChannelRuleEvaluatorInput();
        input.setTrafficSourceMedium("web");
        Assertions.assertEquals("web", input.getTrafficSourceMedium());
    }

    @Test
    void shouldSetAndGetTrafficSourceCampaign() {
        ChannelRuleEvaluatorInput input = new ChannelRuleEvaluatorInput();
        input.setTrafficSourceCampaign("Campaign1");
        Assertions.assertEquals("Campaign1", input.getTrafficSourceCampaign());
    }

    @Test
    void shouldSetAndGetTrafficSourceContent() {
        ChannelRuleEvaluatorInput input = new ChannelRuleEvaluatorInput();
        input.setTrafficSourceContent("Content1");
        Assertions.assertEquals("Content1", input.getTrafficSourceContent());
    }

    @Test
    void shouldSetAndGetTrafficSourceTerm() {
        ChannelRuleEvaluatorInput input = new ChannelRuleEvaluatorInput();
        input.setTrafficSourceTerm("Term1");
        Assertions.assertEquals("Term1", input.getTrafficSourceTerm());
    }

    @Test
    void shouldSetAndGetTrafficSourceCampaignId() {
        ChannelRuleEvaluatorInput input = new ChannelRuleEvaluatorInput();
        input.setTrafficSourceCampaignId("CampaignId1");
        Assertions.assertEquals("CampaignId1", input.getTrafficSourceCampaignId());
    }

    @Test
    void shouldSetAndGetTrafficSourceClidPlatform() {
        ChannelRuleEvaluatorInput input = new ChannelRuleEvaluatorInput();
        input.setTrafficSourceClidPlatform("Platform1");
        Assertions.assertEquals("Platform1", input.getTrafficSourceClidPlatform());
    }

    @Test
    void shouldSetAndGetTrafficSourceClid() {
        ChannelRuleEvaluatorInput input = new ChannelRuleEvaluatorInput();
        input.setTrafficSourceClid("Clid1");
        Assertions.assertEquals("Clid1", input.getTrafficSourceClid());
    }

    @Test
    void shouldSetAndGetPageViewLatestReferrer() {
        ChannelRuleEvaluatorInput input = new ChannelRuleEvaluatorInput();
        input.setPageViewLatestReferrer("Referrer1");
        Assertions.assertEquals("Referrer1", input.getPageViewLatestReferrer());
    }

    @Test
    void shouldSetAndGetPageViewLatestReferrerHost() {
        ChannelRuleEvaluatorInput input = new ChannelRuleEvaluatorInput();
        input.setPageViewLatestReferrerHost("Host1");
        Assertions.assertEquals("Host1", input.getPageViewLatestReferrerHost());
    }
}