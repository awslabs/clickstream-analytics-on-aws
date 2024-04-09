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

import lombok.Getter;
import lombok.Setter;
import lombok.ToString;

@Getter
@Setter
@ToString
public class CategoryTrafficSource  {
    private String source; // NOSONAR
    private String medium;  // NOSONAR
    private String campaign; // NOSONAR
    private String content; // NOSONAR
    private String term; // NOSONAR
    private String campaignId; // NOSONAR
    private String clidPlatform; // NOSONAR
    private String clid; // NOSONAR
    private String channelGroup; // NOSONAR
    private String category;// NOSONAR

    public CategoryTrafficSource(final TrafficSourceUtm trafficSource, final String category, final String channel) {
        this.source = trafficSource.getSource();
        this.medium = trafficSource.getMedium();
        this.campaign = trafficSource.getCampaign();
        this.content = trafficSource.getContent();
        this.term = trafficSource.getTerm();
        this.campaignId = trafficSource.getCampaignId();
        this.clidPlatform = trafficSource.getClidPlatform();
        this.clid = trafficSource.getClid();
        this.category = category;
        this.channelGroup = channel;
    }
}
