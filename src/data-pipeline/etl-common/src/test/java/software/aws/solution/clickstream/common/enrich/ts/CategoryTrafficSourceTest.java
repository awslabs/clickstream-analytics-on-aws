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


public class CategoryTrafficSourceTest {

    @Test
    void shouldReturnCorrectSource() {
        TrafficSourceUtm trafficSourceUtm = new TrafficSourceUtm();
        trafficSourceUtm.setSource("source1");
        CategoryTrafficSource categoryTrafficSource = new CategoryTrafficSource(trafficSourceUtm, "category1", "channel1");
        Assertions.assertEquals("source1", categoryTrafficSource.getSource());
        Assertions.assertTrue(categoryTrafficSource.toString().contains("source1"));
    }

    @Test
    void shouldReturnCorrectMedium() {
        TrafficSourceUtm trafficSourceUtm = new TrafficSourceUtm();
        trafficSourceUtm.setMedium("medium1");
        CategoryTrafficSource categoryTrafficSource = new CategoryTrafficSource(trafficSourceUtm, "category1", "channel1");
        Assertions.assertEquals("medium1", categoryTrafficSource.getMedium());
    }

    @Test
    void shouldReturnCorrectCampaign() {
        TrafficSourceUtm trafficSourceUtm = new TrafficSourceUtm();
        trafficSourceUtm.setCampaign("campaign1");
        CategoryTrafficSource categoryTrafficSource = new CategoryTrafficSource(trafficSourceUtm, "category1", "channel1");
        Assertions.assertEquals("campaign1", categoryTrafficSource.getCampaign());
    }

    @Test
    void shouldReturnCorrectContent() {
        TrafficSourceUtm trafficSourceUtm = new TrafficSourceUtm();
        trafficSourceUtm.setContent("content1");
        CategoryTrafficSource categoryTrafficSource = new CategoryTrafficSource(trafficSourceUtm, "category1", "channel1");
        Assertions.assertEquals("content1", categoryTrafficSource.getContent());
    }

    @Test
    void shouldReturnCorrectTerm() {
        TrafficSourceUtm trafficSourceUtm = new TrafficSourceUtm();
        trafficSourceUtm.setTerm("term1");
        CategoryTrafficSource categoryTrafficSource = new CategoryTrafficSource(trafficSourceUtm, "category1", "channel1");
        Assertions.assertEquals("term1", categoryTrafficSource.getTerm());
    }

    @Test
    void shouldReturnCorrectCampaignId() {
        TrafficSourceUtm trafficSourceUtm = new TrafficSourceUtm();
        trafficSourceUtm.setCampaignId("campaignId1");
        CategoryTrafficSource categoryTrafficSource = new CategoryTrafficSource(trafficSourceUtm, "category1", "channel1");
        Assertions.assertEquals("campaignId1", categoryTrafficSource.getCampaignId());
    }

    @Test
    void shouldReturnCorrectClidPlatform() {
        TrafficSourceUtm trafficSourceUtm = new TrafficSourceUtm();
        trafficSourceUtm.setClidPlatform("clidPlatform1");
        CategoryTrafficSource categoryTrafficSource = new CategoryTrafficSource(trafficSourceUtm, "category1", "channel1");
        Assertions.assertEquals("clidPlatform1", categoryTrafficSource.getClidPlatform());
    }

    @Test
    void shouldReturnCorrectClid() {
        TrafficSourceUtm trafficSourceUtm = new TrafficSourceUtm();
        trafficSourceUtm.setClid("clid1");
        CategoryTrafficSource categoryTrafficSource = new CategoryTrafficSource(trafficSourceUtm, "category1", "channel1");
        Assertions.assertEquals("clid1", categoryTrafficSource.getClid());
    }

    @Test
    void shouldReturnCorrectChannelGroup() {
        TrafficSourceUtm trafficSourceUtm = new TrafficSourceUtm();
        CategoryTrafficSource categoryTrafficSource = new CategoryTrafficSource(trafficSourceUtm, "category1", "channel1");
        Assertions.assertEquals("channel1", categoryTrafficSource.getChannelGroup());
    }

    @Test
    void shouldReturnCorrectCategory() {
        TrafficSourceUtm trafficSourceUtm = new TrafficSourceUtm();
        CategoryTrafficSource categoryTrafficSource = new CategoryTrafficSource(trafficSourceUtm, "category1", "channel1");
        Assertions.assertEquals("category1", categoryTrafficSource.getCategory());
    }
}