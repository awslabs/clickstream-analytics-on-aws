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

package software.aws.solution.clickstream.common.gtm;

import com.fasterxml.jackson.core.*;
import org.apache.logging.log4j.*;
import org.apache.logging.log4j.core.config.*;
import org.junit.jupiter.api.*;
import software.aws.solution.clickstream.*;
import software.aws.solution.clickstream.common.*;
import software.aws.solution.clickstream.common.gtm.event.*;
import software.aws.solution.clickstream.common.ingest.*;
import software.aws.solution.clickstream.common.model.*;

import java.io.*;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static software.aws.solution.clickstream.common.Util.objectToJsonString;


public class GTMEventParserTest extends BaseTest {
    @BeforeAll
    public static void setup() {
        Configurator.setRootLevel(Level.WARN);
        Configurator.setLevel("software.aws.solution.clickstream", Level.DEBUG);
    }

    @Test
    void test_gtm_ingestLineToRow() throws IOException {
        // ./gradlew clean test --info --tests software.aws.solution.clickstream.common.gtm.GTMEventParserTest.test_gtm_ingestLineToRow

        String lines = resourceFileContent("/gtm-server/server-single.json");

        String firstLine = lines.split("\n")[0];

        ClickstreamIngestRow row = GTMEventParser.getInstance().ingestLineToRow(firstLine);

        String expectedJson = this.resourceFileAsString("/gtm-server/expected/test_gtm_ingestLineToRow.json");

        Assertions.assertEquals(expectedJson, prettyJson(objectToJsonString(row)));
    }

    @Test
    void test_gtm_ingestDataToEvent() throws IOException {
        // ./gradlew clean test --info --tests software.aws.solution.clickstream.common.gtm.GTMEventParserTest.test_gtm_ingestDataToEvent

        String lines = resourceFileContent("/gtm-server/server-single.json");

        String firstLine = lines.split("\n")[0];

        GTMEventParser gtmEventParser = GTMEventParser.getInstance();
        ClickstreamIngestRow row = gtmEventParser.ingestLineToRow(firstLine);
        GTMEvent event = gtmEventParser.ingestDataToEvent(row.getData());

        String expectedJson = this.resourceFileAsString("/gtm-server/expected/test_gtm_ingestDataToEvent.json");

        Assertions.assertEquals(expectedJson, prettyJson(objectToJsonString(event)));
    }


    @Test
    void test_gtm_parseLineToDBRow_event() throws IOException {
        // ./gradlew clean test --info --tests software.aws.solution.clickstream.common.gtm.GTMEventParserTest.test_gtm_parseLineToDBRow_event

        String lines = resourceFileContent("/gtm-server/server-session-start.json");

        String firstLine = lines.split("\n")[0];

        GTMEventParser gtmEventParser = GTMEventParser.getInstance();
        ParseRowResult rowResult = gtmEventParser.parseLineToDBRow(firstLine, "test_project_id", "server-session-start.json");

        ClickstreamEvent csEvent = rowResult.getClickstreamEventList().get(0);
        String expectedJson = this.resourceFileAsString("/gtm-server/expected/test_gtm_parseLineToDBRow_event.json");
        Assertions.assertEquals(expectedJson, prettyJson(csEvent.toJson()), "test_gtm_parseLineToDBRow_event");
    }

    @Test
    void test_gtm_parseLineToDBRow_user() throws IOException {
        // ./gradlew clean test --info --tests software.aws.solution.clickstream.common.gtm.GTMEventParserTest.test_gtm_parseLineToDBRow_user

        String lines = resourceFileContent("/gtm-server/server-session-start.json");

        String firstLine = lines.split("\n")[0];

        GTMEventParser gtmEventParser = GTMEventParser.getInstance();
        ParseRowResult rowResult = gtmEventParser.parseLineToDBRow(firstLine, "test_project_id", "server-session-start.json");

        ClickstreamUser csUser = rowResult.getClickstreamUserList().get(0);
        String expectedJson = this.resourceFileAsString("/gtm-server/expected/test_gtm_parseLineToDBRow_user.json");
        Assertions.assertEquals(expectedJson, prettyJson(csUser.toJson()), "test_gtm_parseLineToDBRow_user");
    }

    @Test
    void test_gtm_parseLineToDBRow_item() throws IOException {
        // ./gradlew clean test --info --tests software.aws.solution.clickstream.common.gtm.GTMEventParserTest.test_gtm_parseLineToDBRow_item

        String lines = resourceFileContent("/gtm-server/server-session-start.json");

        String firstLine = lines.split("\n")[0];

        GTMEventParser gtmEventParser = GTMEventParser.getInstance();
        ParseRowResult rowResult = gtmEventParser.parseLineToDBRow(firstLine, "test_project_id", "server-session-start.json");

        Assertions.assertEquals(0, rowResult.getClickstreamItemList().size(), "test_gtm_parseLineToDBRow_item");

    }

    @Test
    void test_gtm_parseLineToDBRow_item2() throws IOException {
        // ./gradlew clean test --info --tests software.aws.solution.clickstream.common.gtm.GTMEventParserTest.test_gtm_parseLineToDBRow_item2

        String lines = resourceFileContent("/gtm-server/server-items.json");

        String firstLine = lines.split("\n")[0];

        GTMEventParser gtmEventParser = GTMEventParser.getInstance();
        ParseRowResult rowResult = gtmEventParser.parseLineToDBRow(firstLine, "test_project_id", "server-items.json");

        ClickstreamItem csItem = rowResult.getClickstreamItemList().get(0);
        String expectedJson = this.resourceFileAsString("/gtm-server/expected/test_gtm_parseLineToDBRow_item.json");
        Assertions.assertEquals(expectedJson, prettyJson(csItem.toJson()), "test_gtm_parseLineToDBRow_item2");

    }

    @Test
    void testParseJsonInvalidSessionNumber() throws JsonProcessingException {
        // ./gradlew clean test --info --tests  software.aws.solution.clickstream.common.gtm.GTMEventParserTest.testParseJsonInvalidSessionNumber

        String jsonStr = "{\"test_by\":\"Mike\", \"event_name\":\"Optimizely\",\"optimizelyExp\":\"20230918_tg_checkoutpromoremoval.OG\",\"engagement_time_msec\":1,\"x-ga-protocol_version\":\"2\",\"x-ga-measurement_id\":\"G-000000002\",\"x-ga-gtm_version\":\"45je39i0\",\"x-ga-page_id\":1049432985,\"client_id\":\"ZPO/+IzUVgQhDUCuBoG7RF6r1d70inLj6FxhhVhA5Dk=.1695261246\",\"language\":\"en-us\",\"screen_resolution\":\"393x786\",\"x-ga-ur\":\"US\",\"client_hints\":{\"architecture\":\"\",\"bitness\":\"\",\"full_version_list\":[],\"mobile\":false,\"model\":\"\",\"platform\":\"\",\"platform_version\":\"\",\"wow64\":false},\"x-sst-system_properties\":{\"uc\":\"US\",\"gse\":\"1\",\"tft\":\"1695261241324\",\"request_start_time_ms\":1695261246955},\"ga_session_id\":\"1695261245\",\"ga_session_number\":\"ss\",\"x-ga-mp2-seg\":\"0\",\"page_location\":\"https://www.example.com/zh_HK/product/couch-duck-by-ssebong/iphone-15-pro-max/ultra-bounce-case-magsafe-compatible\",\"page_title\":\"Couch duck – example\",\"x-ga-request_count\":2,\"x-ga-tfd\":7201,\"ip_override\":\"130.44.212.105\",\"user_agent\":\"Mozilla/5.0 (Linux; U; Android 8.1.0; zh-cn; MI 6X Build/OPM1.171019.011; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/61.0.3163.128 Mobile Safari/537.36\",\"x-ga-js_client_id\":\"1531615311.1695261246\"}";
        System.out.println(jsonStr);

        GTMEventParser eventParser = GTMEventParser.getInstance();
        GTMEvent gtmEvent = eventParser.ingestDataToEvent(jsonStr);

        assertEquals(1, gtmEvent.getEngagementTimeMsec());
        Assertions.assertNull(gtmEvent.getGaSessionNumber());
    }


    @Test
    void test_gtm_parseLineToDBRow_user_login() throws IOException {
        // ./gradlew clean test --info --tests software.aws.solution.clickstream.common.gtm.GTMEventParserTest.test_gtm_parseLineToDBRow_user_login

        String lines = resourceFileContent("/gtm-server/server-user-props.json");

        String firstLine = lines.split("\n")[0];

        GTMEventParser gtmEventParser = GTMEventParser.getInstance();
        ParseRowResult rowResult = gtmEventParser.parseLineToDBRow(firstLine, "test_project_id", "server-items.json");

        ClickstreamUser csUser = rowResult.getClickstreamUserList().get(0);
        String expectedJson = this.resourceFileAsString("/gtm-server/expected/test_gtm_parseLineToDBRow_user_login.json");
        Assertions.assertEquals(expectedJson, prettyJson(csUser.toJson()), "test_gtm_parseLineToDBRow_user_login");

    }

}
