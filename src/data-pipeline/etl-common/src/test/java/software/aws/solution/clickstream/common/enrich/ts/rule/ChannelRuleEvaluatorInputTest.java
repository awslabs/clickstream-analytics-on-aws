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
        ChannelRuleEvaluatorInput input2 = new ChannelRuleEvaluatorInput();
        input2.setTrafficSourceCategory("Search");
        Assertions.assertEquals("Search", input.getTrafficSourceCategory());
        Assertions.assertEquals(input, input2);
    }

    @Test
    void shouldSetAndGetTrafficSourceSource() {
        ChannelRuleEvaluatorInput input = new ChannelRuleEvaluatorInput();
        input.setTrafficSourceSource("Google");
        ChannelRuleEvaluatorInput input2 = new ChannelRuleEvaluatorInput();
        input2.setTrafficSourceSource("Google");
        Assertions.assertEquals("Google", input.getTrafficSourceSource());
        Assertions.assertEquals(input, input2);
    }

    @Test
    void shouldSetAndGetTrafficSourceMedium() {
        ChannelRuleEvaluatorInput input = new ChannelRuleEvaluatorInput();
        input.setTrafficSourceMedium("web");
        ChannelRuleEvaluatorInput input2 = new ChannelRuleEvaluatorInput();
        input2.setTrafficSourceMedium("web");
        Assertions.assertEquals("web", input.getTrafficSourceMedium());
        Assertions.assertEquals(input, input2);
    }

    @Test
    void shouldSetAndGetTrafficSourceCampaign() {
        ChannelRuleEvaluatorInput input = new ChannelRuleEvaluatorInput();
        input.setTrafficSourceCampaign("Campaign1");
        ChannelRuleEvaluatorInput input2 = new ChannelRuleEvaluatorInput();
        input2.setTrafficSourceCampaign("Campaign1");
        Assertions.assertEquals("Campaign1", input.getTrafficSourceCampaign());
        Assertions.assertEquals(input, input2);
    }

    @Test
    void shouldSetAndGetTrafficSourceContent() {
        ChannelRuleEvaluatorInput input = new ChannelRuleEvaluatorInput();
        input.setTrafficSourceContent("Content1");
        ChannelRuleEvaluatorInput input2 = new ChannelRuleEvaluatorInput();
        input2.setTrafficSourceContent("Content1");
        Assertions.assertEquals("Content1", input.getTrafficSourceContent());
        Assertions.assertEquals(input, input2);
    }

    @Test
    void shouldSetAndGetTrafficSourceTerm() {
        ChannelRuleEvaluatorInput input = new ChannelRuleEvaluatorInput();
        input.setTrafficSourceTerm("Term1");
        ChannelRuleEvaluatorInput input2 = new ChannelRuleEvaluatorInput();
        input2.setTrafficSourceTerm("Term1");
        Assertions.assertEquals("Term1", input.getTrafficSourceTerm());
        Assertions.assertEquals(input, input2);
    }

    @Test
    void shouldSetAndGetTrafficSourceCampaignId() {
        ChannelRuleEvaluatorInput input = new ChannelRuleEvaluatorInput();
        input.setTrafficSourceCampaignId("CampaignId1");
        ChannelRuleEvaluatorInput input2 = new ChannelRuleEvaluatorInput();
        input2.setTrafficSourceCampaignId("CampaignId1");
        Assertions.assertEquals("CampaignId1", input.getTrafficSourceCampaignId());
        Assertions.assertEquals(input, input2);
    }

    @Test
    void shouldSetAndGetTrafficSourceClidPlatform() {
        ChannelRuleEvaluatorInput input = new ChannelRuleEvaluatorInput();
        input.setTrafficSourceClidPlatform("Platform1");
        ChannelRuleEvaluatorInput input2 = new ChannelRuleEvaluatorInput();
        input2.setTrafficSourceClidPlatform("Platform1");
        Assertions.assertEquals("Platform1", input.getTrafficSourceClidPlatform());
        Assertions.assertEquals(input, input2);
    }

    @Test
    void shouldSetAndGetTrafficSourceClid() {
        ChannelRuleEvaluatorInput input = new ChannelRuleEvaluatorInput();
        input.setTrafficSourceClid("Clid1");
        ChannelRuleEvaluatorInput input2 = new ChannelRuleEvaluatorInput();
        input2.setTrafficSourceClid("Clid1");
        Assertions.assertEquals("Clid1", input.getTrafficSourceClid());
        Assertions.assertEquals(input, input2);
    }

    @Test
    void shouldSetAndGetPageViewLatestReferrer() {
        ChannelRuleEvaluatorInput input = new ChannelRuleEvaluatorInput();
        input.setPageViewLatestReferrer("Referrer1");
        ChannelRuleEvaluatorInput input2 = new ChannelRuleEvaluatorInput();
        input2.setPageViewLatestReferrer("Referrer1");
        Assertions.assertEquals("Referrer1", input.getPageViewLatestReferrer());
        Assertions.assertEquals(input, input2);
    }

    @Test
    void shouldSetAndGetPageViewLatestReferrerHost() {
        ChannelRuleEvaluatorInput input = new ChannelRuleEvaluatorInput();
        input.setPageViewLatestReferrerHost("Host1");
        ChannelRuleEvaluatorInput input2 = new ChannelRuleEvaluatorInput();
        input2.setPageViewLatestReferrerHost("Host1");
        Assertions.assertEquals("Host1", input.getPageViewLatestReferrerHost());
        Assertions.assertEquals(input, input2);
    }

    @Test
    void shouldHasHashCodeAndEq1() {
        ChannelRuleEvaluatorInput input1 = new ChannelRuleEvaluatorInput();
        input1.setTrafficSourceSource("Google");
        input1.setTrafficSourceTerm("Term1");
        input1.setPageViewLatestReferrer("Referrer1");
        input1.setTrafficSourceMedium("web");
        input1.setPageViewLatestReferrerHost("Host1");
        input1.setTrafficSourceCategory("Search");
        input1.setTrafficSourceCampaign("Campaign1");
        input1.setTrafficSourceCampaignId("CampaignId1");
        input1.setTrafficSourceContent("Content1");
        input1.setTrafficSourceClid("Clid1");
        input1.setTrafficSourceClidPlatform("Platform1");

        ChannelRuleEvaluatorInput input2 = new ChannelRuleEvaluatorInput();
        input2.setTrafficSourceSource("Google");
        input2.setTrafficSourceTerm("Term1");
        input2.setPageViewLatestReferrer("Referrer1");
        input2.setTrafficSourceMedium("web");
        input2.setPageViewLatestReferrerHost("Host1");
        input2.setTrafficSourceCategory("Search");
        input2.setTrafficSourceCampaign("Campaign1");
        input2.setTrafficSourceCampaignId("CampaignId1");
        input2.setTrafficSourceContent("Content1");
        input2.setTrafficSourceClid("Clid1");
        input2.setTrafficSourceClidPlatform("Platform1");

        Assertions.assertEquals(input1, input2);
        Assertions.assertEquals(input1.hashCode(), input2.hashCode());
        Assertions.assertEquals(input1.toString(), input2.toString());
    }

    @Test
    void shouldHasHashCodeAndEq2() {
        ChannelRuleEvaluatorInput input1 = new ChannelRuleEvaluatorInput();
        ChannelRuleEvaluatorInput input2 = new ChannelRuleEvaluatorInput();
        Assertions.assertEquals(input1, input2);
        Assertions.assertEquals(input1.hashCode(), input2.hashCode());
        Assertions.assertEquals(input1.toString(), input2.toString());
    }
}