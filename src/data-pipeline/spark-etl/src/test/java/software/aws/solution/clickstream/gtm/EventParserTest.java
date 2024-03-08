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


package software.aws.solution.clickstream.gtm;

import com.fasterxml.jackson.core.*;
import com.fasterxml.jackson.databind.*;
import org.junit.jupiter.api.*;
import software.aws.solution.clickstream.gtm.event.*;

import java.util.*;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static software.aws.solution.clickstream.gtm.Utils.convertStringObjectMapToStringJsonMap;

public class EventParserTest {

    @Test
    void testParseJson() throws JsonProcessingException {
        // ./gradlew clean test --info --tests  software.aws.solution.clickstream.gtm.EventParserTest.testParseJson

        String jsonStr = "{\"test_by\":\"Mike\", \"event_name\":\"Optimizely\",\"optimizelyExp\":\"20230918_tg_checkoutpromoremoval.OG\"" +
                ",\"engagement_time_msec\":1,\"x-ga-protocol_version\":\"2\",\"x-ga-measurement_id\":\"G-000000002\"," +
                "\"x-ga-gtm_version\":\"45je39i0\",\"x-ga-page_id\":1049432985,\"client_id\":\"ZPO/+IzUVgQhDUCuBoG7RF6r1d70inLj6FxhhVhA5Dk=.1695261246\"," +
                "\"language\":\"en-us\",\"screen_resolution\":\"393x786\",\"x-ga-ur\":\"US\",\"client_hints\":{\"architecture\":\"\"," +
                "\"bitness\":\"\",\"full_version_list\":[],\"mobile\":false,\"model\":\"\",\"platform\":\"\",\"platform_version\":\"\",\"wow64\":false}," +
                "\"x-x-sst-system_properties\":{\"uc\":\"US\",\"gse\":\"1\",\"tft\":\"1695261241324\",\"request_start_time_ms\":1695261246955}," +
                "\"x-sst-system_properties\":{\"uc\":\"US\",\"gse\":\"1\",\"tft\":\"1695261241324\",\"request_start_time_ms\":1695261246955}," +
                "\"ga_session_id\":\"1695261245\",\"ga_session_number\":1,\"x-ga-mp2-seg\":\"0\"," +
                "\"page_location\":\"https://www.example.com/zh_HK/product/couch-duck-by-ssebong/iphone-15-pro-max/ultra-bounce-case-magsafe-compatible\"," +
                "\"page_title\":\"Couch duck – example\",\"x-ga-request_count\":2,\"x-ga-tfd\":7201,\"ip_override\":\"130.44.212.105\"," +
                "\"user_agent\":\"Mozilla/5.0 (Linux; U; Android 8.1.0; zh-cn; MI 6X Build/OPM1.171019.011; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/61.0.3163.128 Mobile Safari/537.36\"," +
                "\"x-ga-js_client_id\":\"1531615311.1695261246\"}";
        System.out.println(jsonStr);

        EventParser eventParser = new EventParser();
        GTMEvent gtmEvent = eventParser.parse(jsonStr);

        assertEquals("Optimizely", gtmEvent.getEventName());
        assertEquals(1, gtmEvent.getEngagementTimeMsec());
        assertEquals("Mike", gtmEvent.getUnknownProperties().get("test_by"));
        assertEquals("US", gtmEvent.getXSstSystemProperties().getUc());
        Map<String, String> customParameters = convertStringObjectMapToStringJsonMap(gtmEvent.getUnknownProperties());
        Assertions.assertEquals("{\"uc\":\"US\",\"gse\":\"1\",\"tft\":\"1695261241324\",\"request_start_time_ms\":1695261246955}",
                customParameters.get("x-x-sst-system_properties"));

        ObjectMapper objectMapper = new ObjectMapper();
        String jsonString = objectMapper.writeValueAsString(gtmEvent);

        Assertions.assertEquals("{\"client_hints\":{\"architecture\":\"\",\"bitness\":\"\",\"full_version_list\":[]," +
                        "\"mobile\":false,\"model\":\"\",\"platform\":\"\",\"platform_version\":\"\",\"wow64\":false,\"brands\":null}," +
                        "\"client_id\":\"ZPO/+IzUVgQhDUCuBoG7RF6r1d70inLj6FxhhVhA5Dk=.1695261246\"," +
                        "\"currency\":null,\"engagement_time_msec\":1,\"event_location\":null," +
                        "\"event_name\":\"Optimizely\",\"ga_session_id\":\"1695261245\"," +
                        "\"ga_session_number\":1,\"ip_override\":\"130.44.212.105\",\"item_id\":null," +
                        "\"items\":null,\"language\":\"en-us\"," +
                        "\"page_location\":\"https://www.example.com/zh_HK/product/couch-duck-by-ssebong/iphone-15-pro-max/ultra-bounce-case-magsafe-compatible\"," +
                        "\"page_referrer\":null,\"page_title\":\"Couch duck – example\",\"screen_resolution\":\"393x786\"," +
                        "\"user_agent\":\"Mozilla/5.0 (Linux; U; Android 8.1.0; zh-cn; MI 6X Build/OPM1.171019.011; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/61.0.3163.128 Mobile Safari/537.36\"," +
                        "\"user_id\":null,\"x-ga-ur\":\"US\",\"value\":0.0,\"x-ga-mp2-user_properties\":null,\"x-ga-system_properties\":null," +
                        "\"x-sst-system_properties\":{\"uc\":\"US\",\"ngs\":null,\"gse\":\"1\",\"gcd\":null,\"tft\":1695261241324,\"consent\":null," +
                        "\"request_start_time_ms\":1695261246955}," +
                        "\"x-x-sst-system_properties\":{\"uc\":\"US\",\"gse\":\"1\",\"tft\":\"1695261241324\",\"request_start_time_ms\":1695261246955}," +
                        "\"optimizelyExp\":\"20230918_tg_checkoutpromoremoval.OG\",\"x-ga-tfd\":7201,\"test_by\":\"Mike\"," +
                        "\"x-ga-protocol_version\":\"2\",\"x-ga-gtm_version\":\"45je39i0\",\"x-ga-mp2-seg\":\"0\",\"x-ga-js_client_id\":\"1531615311.1695261246\"," +
                        "\"x-ga-page_id\":1049432985,\"x-ga-measurement_id\":\"G-000000002\",\"x-ga-request_count\":2}",
                jsonString);
    }


    @Test
    void testParseJsonInvalidSessionNumber() throws JsonProcessingException {
        // ./gradlew clean test --info --tests  software.aws.solution.clickstream.gtm.EventParserTest.testParseJsonInvalidSessionNumber

        String jsonStr = "{\"test_by\":\"Mike\", \"event_name\":\"Optimizely\",\"optimizelyExp\":\"20230918_tg_checkoutpromoremoval.OG\",\"engagement_time_msec\":1,\"x-ga-protocol_version\":\"2\",\"x-ga-measurement_id\":\"G-000000002\",\"x-ga-gtm_version\":\"45je39i0\",\"x-ga-page_id\":1049432985,\"client_id\":\"ZPO/+IzUVgQhDUCuBoG7RF6r1d70inLj6FxhhVhA5Dk=.1695261246\",\"language\":\"en-us\",\"screen_resolution\":\"393x786\",\"x-ga-ur\":\"US\",\"client_hints\":{\"architecture\":\"\",\"bitness\":\"\",\"full_version_list\":[],\"mobile\":false,\"model\":\"\",\"platform\":\"\",\"platform_version\":\"\",\"wow64\":false},\"x-sst-system_properties\":{\"uc\":\"US\",\"gse\":\"1\",\"tft\":\"1695261241324\",\"request_start_time_ms\":1695261246955},\"ga_session_id\":\"1695261245\",\"ga_session_number\":\"ss\",\"x-ga-mp2-seg\":\"0\",\"page_location\":\"https://www.example.com/zh_HK/product/couch-duck-by-ssebong/iphone-15-pro-max/ultra-bounce-case-magsafe-compatible\",\"page_title\":\"Couch duck – example\",\"x-ga-request_count\":2,\"x-ga-tfd\":7201,\"ip_override\":\"130.44.212.105\",\"user_agent\":\"Mozilla/5.0 (Linux; U; Android 8.1.0; zh-cn; MI 6X Build/OPM1.171019.011; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/61.0.3163.128 Mobile Safari/537.36\",\"x-ga-js_client_id\":\"1531615311.1695261246\"}";
        System.out.println(jsonStr);

        EventParser eventParser = new EventParser();
        GTMEvent gtmEvent = eventParser.parse(jsonStr);

        assertEquals(1, gtmEvent.getEngagementTimeMsec());
        Assertions.assertNull(gtmEvent.getGaSessionNumber());
    }
}
