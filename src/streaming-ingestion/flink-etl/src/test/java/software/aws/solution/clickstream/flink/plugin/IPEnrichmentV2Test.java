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

package software.aws.solution.clickstream.flink.plugin;

import org.junit.jupiter.api.Assertions;
import software.aws.solution.clickstream.flink.BaseFlinkTest;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import software.aws.solution.clickstream.common.model.ClickstreamEvent;
import software.aws.solution.clickstream.plugin.enrich.IPEnrichmentV2;

import java.io.IOException;

public class IPEnrichmentV2Test extends BaseFlinkTest {


    private IPEnrichmentV2 ipEnrichment;

    @BeforeEach
    public void setup() throws IOException {
        ipEnrichment = new IPEnrichmentV2(new java.io.File(TMP_GEO_LITE_2_CITY_MMDB));
    }

    @Test
    public void enrichesEventWhenIpIsNotInCache() {
         // ./gradlew clean test --tests software.aws.solution.clickstream.flink.plugin.IPEnrichmentV2Test.enrichesEventWhenIpIsNotInCache
        ClickstreamEvent event = new ClickstreamEvent();
        event.setIp("18.233.165.3");
        ipEnrichment.enrich(event);
        Assertions.assertEquals("Ashburn", event.getGeoCity());
        Assertions.assertEquals("North America", event.getGeoContinent());
        Assertions.assertEquals("United States", event.getGeoCountry());

        ipEnrichment.enrich(event);

        Assertions.assertEquals("Ashburn", event.getGeoCity());
        Assertions.assertEquals("North America", event.getGeoContinent());
        Assertions.assertEquals("United States", event.getGeoCountry());
    }

    @Test
    public void enrichesEventWhenMultiIps() {
        // ./gradlew clean test --tests software.aws.solution.clickstream.flink.plugin.IPEnrichmentV2Test.enrichesEventWhenMultiIps
        ClickstreamEvent event = new ClickstreamEvent();
        event.setIp("18.233.165.3,127.1.1.1");
        ipEnrichment.enrich(event);
        Assertions.assertEquals("Ashburn", event.getGeoCity());
        Assertions.assertEquals("North America", event.getGeoContinent());
        Assertions.assertEquals("United States", event.getGeoCountry());
    }


    @Test
    public void enrichesEventWhenIpIsNull() {
        // ./gradlew clean test --tests software.aws.solution.clickstream.flink.plugin.IPEnrichmentV2Test.enrichesEventWhenIpIsNull
        ClickstreamEvent event = new ClickstreamEvent();
        ipEnrichment.enrich(event);
        Assertions.assertNull(event.getGeoCity());
        Assertions.assertNull(event.getGeoContinent());
        Assertions.assertNull(event.getGeoCountry());
    }

    @Test
    public void enrichesEventWhenIpIsInvalid() {
        // ./gradlew clean test --tests software.aws.solution.clickstream.flink.plugin.IPEnrichmentV2Test.enrichesEventWhenIpIsInvalid
        ClickstreamEvent event = new ClickstreamEvent();
        event.setIp("invalid");
        ipEnrichment.enrich(event);
        Assertions.assertNull(event.getGeoCity());
        Assertions.assertNull(event.getGeoContinent());
        Assertions.assertNull(event.getGeoCountry());
    }
}
