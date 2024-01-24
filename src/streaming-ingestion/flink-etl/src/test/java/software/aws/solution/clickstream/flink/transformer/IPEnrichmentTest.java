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

package software.aws.solution.clickstream.flink.transformer;

import org.apache.flink.shaded.jackson2.com.fasterxml.jackson.databind.ObjectMapper;
import org.apache.flink.shaded.jackson2.com.fasterxml.jackson.databind.node.ObjectNode;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;
import software.aws.solution.clickstream.plugin.enrich.IPEnrichment;
import software.aws.solution.clickstream.plugin.enrich.IPEnrichmentJson;

class IPEnrichmentTest {
    @Test
    void testEnrichIP() {
        // ./gradlew clean test --tests software.aws.solution.clickstream.flink.transformer.IPEnrichmentTest.testEnrichIP

        IPEnrichment ipEnrichment = new IPEnrichment("_", "/tmp/GeoLite2-City.mmdb", "us-east-1");

        ObjectNode geoNode = new ObjectMapper().createObjectNode();

        var paramMap = new java.util.HashMap<String, String>();
        paramMap.put(IPEnrichment.PARAM_KEY_IP, "18.233.165.3");
        paramMap.put(IPEnrichment.PARAM_KEY_LOCALE, "US");

        ipEnrichment.enrich(geoNode, paramMap);

        Assertions.assertEquals("{\"city\":\"Ashburn\",\"continent\":\"North America\",\"country\":\"United States\"," +
                "\"metro\":null,\"region\":null,\"sub_continent\":null,\"locale\":\"US\"}", geoNode.toString());

    }

    @Test
    void testEnrichIP_err() {
        // ./gradlew clean test --tests software.aws.solution.clickstream.flink.transformer.IPEnrichmentTest.testEnrichIP_err

        IPEnrichment ipEnrichment = new IPEnrichment("_", "/tmp/err-db.mmdb", "us-east-1");

        ObjectNode geoNode = new ObjectMapper().createObjectNode();

        var paramMap = new java.util.HashMap<String, String>();
        paramMap.put(IPEnrichment.PARAM_KEY_IP, "18.233.165.3");
        paramMap.put(IPEnrichment.PARAM_KEY_LOCALE, "US");

        ipEnrichment.enrich(geoNode, paramMap);

        Assertions.assertEquals("{\"city\":null,\"continent\":null,\"country\":null," +
                "\"metro\":null,\"region\":null,\"sub_continent\":null,\"locale\":\"US\"}", geoNode.toString());

    }


    @Test
    void testEnrichIP_json() {
        // ./gradlew clean test --tests software.aws.solution.clickstream.flink.transformer.IPEnrichmentTest.testEnrichIP_json

        IPEnrichmentJson ipEnrichment = new IPEnrichmentJson("_", "/tmp/GeoLite2-City.mmdb", "us-east-1");

        ObjectNode geoNode = new ObjectMapper().createObjectNode();

        var paramMap = new java.util.HashMap<String, String>();
        paramMap.put(IPEnrichment.PARAM_KEY_IP, "18.233.165.3");
        paramMap.put(IPEnrichment.PARAM_KEY_LOCALE, "US");

        ipEnrichment.enrich(geoNode, paramMap);


    }
}
