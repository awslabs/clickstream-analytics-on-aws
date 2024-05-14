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


package software.aws.solution.clickstream.common.enrich.ua;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import software.aws.solution.clickstream.BaseTest;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import static org.junit.jupiter.api.Assertions.*;

class UaDeviceParserTest extends BaseTest {

    UaDeviceParser getUaDeviceParser () {
        List<Map<String, String>> configList = new ArrayList<>();
        Map<String, String> configMap = new HashMap<>();
        configMap.put("regex", "Android Application[^\\-]{0,300} - (Sony) ?(Ericsson|) (.{1,200}) \\w{1,20} -");
        configMap.put("device_replacement", "$1 $2");
        configMap.put("brand_replacement", "$1$2");
        configMap.put("model_replacement", "$3");
        configList.add(configMap);
        return UaDeviceParser.fromList(configList);
    }

    @Test
    void shouldReturnUaDeviceWhenMatchFound() {
        // ./gradlew clean test --info --tests software.aws.solution.clickstream.common.enrich.ua.UaDeviceParserTest.shouldReturnUaDeviceWhenMatchFound
        UaDevice result = getUaDeviceParser().parseUADevice("Android Application - Sony Ericsson Xperia Z1 Compact D5503 -");
        assertEquals("Sony Ericsson", result.getFamily());
        assertEquals("SonyEricsson", result.getBrand());
        assertEquals("Xperia Z1 Compact", result.getModel());
    }

    @Test
    void shouldReturnNullWhenNoMatchFound() {
        UaDevice result = getUaDeviceParser().parseUADevice("test");
        assertNull(result);
    }


    @Test
    void shouldReturnDeviceParserConfigs() {
        // ./gradlew clean test --info --tests software.aws.solution.clickstream.common.enrich.ua.UaDeviceParserTest.shouldReturnDeviceParserConfigs
        List<Map<String, String>> configList = UaDeviceParser.getDeviceParserConfigs("/ua/test_cs_regexes.yaml");
        // Assert the result
        assertEquals(1, configList.size());
        assertEquals("Clickstream Android Application[^\\-]{0,300} - (Sony) ?(Ericsson|) (.{1,200}) \\w{1,20} -", configList.get(0).get("regex"));
        assertEquals("Clickstream $1 $2", configList.get(0).get("device_replacement"));
        assertEquals("Clickstream $1$2", configList.get(0).get("brand_replacement"));
        assertEquals("Clickstream $3", configList.get(0).get("model_replacement"));
    }

    @Test
    void testNewInstance() {
        // ./gradlew clean test --info --tests software.aws.solution.clickstream.common.enrich.ua.UaDeviceParserTest.testNewInstance
        UaDeviceParser instance = UaDeviceParser.newInstance("/ua/test_cs_regexes.yaml");
        assertNotNull(instance);
        assertEquals(621, instance.getPatterns().size());
        UaDevicePattern uaDevicePattern = instance.getPatterns().get(0);
        assertEquals("Clickstream Android Application[^\\-]{0,300} - (Sony) ?(Ericsson|) (.{1,200}) \\w{1,20} -",
                uaDevicePattern.getPattern().toString());
    }

    @Test
    void testParserFromNewInstance() {
        // ./gradlew clean test --info --tests software.aws.solution.clickstream.common.enrich.ua.UaDeviceParserTest.testParserFromNewInstance
        UaDeviceParser uaDeviceParser = UaDeviceParser.newInstance("/ua/test_cs_regexes.yaml");
        UaDevice result = uaDeviceParser.parseUADevice("Clickstream Android Application - Sony Ericsson Xperia Z1 Compact D5503 -");
        assertEquals("Clickstream Sony Ericsson", result.getFamily());
        assertEquals("Clickstream SonyEricsson", result.getBrand());
        assertEquals("Clickstream Xperia Z1 Compact", result.getModel());
    }
}
