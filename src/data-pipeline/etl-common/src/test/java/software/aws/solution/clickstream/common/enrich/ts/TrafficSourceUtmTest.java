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

package software.aws.solution.clickstream.common.enrich.ts;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;

public class TrafficSourceUtmTest {

    @Test
    void shouldReturnCorrectSource() {
        TrafficSourceUtm trafficSourceUtm = new TrafficSourceUtm();
        trafficSourceUtm.setSource("source1");
        TrafficSourceUtm trafficSourceUtm2 = new TrafficSourceUtm();
        trafficSourceUtm2.setSource("source1");

        Assertions.assertEquals("source1", trafficSourceUtm.getSource());
        Assertions.assertEquals(trafficSourceUtm, trafficSourceUtm2);
    }

    @Test
    void shouldReturnCorrectMedium() {
        TrafficSourceUtm trafficSourceUtm = new TrafficSourceUtm();
        trafficSourceUtm.setMedium("medium1");
        TrafficSourceUtm trafficSourceUtm2 = new TrafficSourceUtm();
        trafficSourceUtm2.setMedium("medium1");

        Assertions.assertEquals("medium1", trafficSourceUtm.getMedium());
        Assertions.assertEquals(trafficSourceUtm, trafficSourceUtm2);
    }

    @Test
    void shouldReturnCorrectCampaign() {
        TrafficSourceUtm trafficSourceUtm = new TrafficSourceUtm();
        trafficSourceUtm.setCampaign("campaign1");

        TrafficSourceUtm trafficSourceUtm2 = new TrafficSourceUtm();
        trafficSourceUtm2.setCampaign("campaign1");

        Assertions.assertEquals("campaign1", trafficSourceUtm.getCampaign());
        Assertions.assertEquals(trafficSourceUtm, trafficSourceUtm2);
    }

    @Test
    void shouldReturnCorrectContent() {
        TrafficSourceUtm trafficSourceUtm = new TrafficSourceUtm();
        trafficSourceUtm.setContent("content1");
        TrafficSourceUtm trafficSourceUtm2 = new TrafficSourceUtm();
        trafficSourceUtm2.setContent("content1");

        Assertions.assertEquals("content1", trafficSourceUtm.getContent());
        Assertions.assertEquals(trafficSourceUtm, trafficSourceUtm2);
    }

    @Test
    void shouldReturnCorrectTerm() {
        TrafficSourceUtm trafficSourceUtm = new TrafficSourceUtm();
        trafficSourceUtm.setTerm("term1");
        TrafficSourceUtm trafficSourceUtm2 = new TrafficSourceUtm();
        trafficSourceUtm2.setTerm("term1");
        Assertions.assertEquals("term1", trafficSourceUtm.getTerm());
        Assertions.assertEquals(trafficSourceUtm, trafficSourceUtm2);
    }

    @Test
    void shouldReturnCorrectCampaignId() {
        TrafficSourceUtm trafficSourceUtm = new TrafficSourceUtm();
        trafficSourceUtm.setCampaignId("campaignId1");
        TrafficSourceUtm trafficSourceUtm2 = new TrafficSourceUtm();
        trafficSourceUtm2.setCampaignId("campaignId1");

        Assertions.assertEquals("campaignId1", trafficSourceUtm.getCampaignId());
        Assertions.assertEquals(trafficSourceUtm, trafficSourceUtm2);
    }

    @Test
    void shouldReturnCorrectClidPlatform() {
        TrafficSourceUtm trafficSourceUtm = new TrafficSourceUtm();
        trafficSourceUtm.setClidPlatform("clidPlatform1");

        TrafficSourceUtm trafficSourceUtm2 = new TrafficSourceUtm();
        trafficSourceUtm2.setClidPlatform("clidPlatform1");

        Assertions.assertEquals("clidPlatform1", trafficSourceUtm.getClidPlatform());
        Assertions.assertEquals(trafficSourceUtm, trafficSourceUtm2);
    }

    @Test
    void shouldReturnCorrectClid() {
        TrafficSourceUtm trafficSourceUtm = new TrafficSourceUtm();
        trafficSourceUtm.setClid("clid1");
        TrafficSourceUtm trafficSourceUtm2 = new TrafficSourceUtm();
        trafficSourceUtm2.setClid("clid1");

        Assertions.assertEquals("clid1", trafficSourceUtm.getClid());
        Assertions.assertEquals(trafficSourceUtm, trafficSourceUtm2);
    }

    @Test
    void shouldHasHashCodeAndEq() {
        TrafficSourceUtm trafficSourceUtm1 = new TrafficSourceUtm();
        trafficSourceUtm1.setSource("source1");
        trafficSourceUtm1.setMedium("medium1");
        trafficSourceUtm1.setCampaign("campaign1");
        trafficSourceUtm1.setContent("content1");
        trafficSourceUtm1.setTerm("term1");
        trafficSourceUtm1.setCampaignId("campaignId1");
        trafficSourceUtm1.setClidPlatform("clidPlatform1");
        trafficSourceUtm1.setClid("clid1");

        TrafficSourceUtm trafficSourceUtm2 = new TrafficSourceUtm();
        trafficSourceUtm2.setSource("source1");
        trafficSourceUtm2.setMedium("medium1");
        trafficSourceUtm2.setCampaign("campaign1");
        trafficSourceUtm2.setContent("content1");
        trafficSourceUtm2.setTerm("term1");
        trafficSourceUtm2.setCampaignId("campaignId1");
        trafficSourceUtm2.setClidPlatform("clidPlatform1");
        trafficSourceUtm2.setClid("clid1");

        Assertions.assertEquals(trafficSourceUtm1, trafficSourceUtm2);
        Assertions.assertEquals(trafficSourceUtm1.hashCode(), trafficSourceUtm2.hashCode());
        Assertions.assertEquals(trafficSourceUtm1.toString(), trafficSourceUtm2.toString());
    }

    @Test
    void shouldHasHashCodeAndEq2() {
        TrafficSourceUtm trafficSourceUtm1 = new TrafficSourceUtm();
        TrafficSourceUtm trafficSourceUtm2 = new TrafficSourceUtm();

        Assertions.assertEquals(trafficSourceUtm1, trafficSourceUtm2);
        Assertions.assertEquals(trafficSourceUtm1.hashCode(), trafficSourceUtm2.hashCode());
        Assertions.assertEquals(trafficSourceUtm1.toString(), trafficSourceUtm2.toString());
    }
}