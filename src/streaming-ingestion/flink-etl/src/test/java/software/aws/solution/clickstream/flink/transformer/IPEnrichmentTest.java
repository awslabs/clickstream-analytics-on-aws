package software.aws.solution.clickstream.flink.transformer;

import org.apache.flink.shaded.jackson2.com.fasterxml.jackson.databind.ObjectMapper;
import org.apache.flink.shaded.jackson2.com.fasterxml.jackson.databind.node.ObjectNode;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;
import software.aws.solution.clickstream.plugin.enrich.IPEnrichment;

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
}
