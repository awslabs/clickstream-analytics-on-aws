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

package software.aws.solution.clickstream.common;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.JsonNodeFactory;
import com.fasterxml.jackson.databind.node.ObjectNode;
import lombok.extern.slf4j.*;
import org.apache.logging.log4j.*;
import org.apache.logging.log4j.core.config.*;
import org.junit.jupiter.api.*;
import software.aws.solution.clickstream.*;
import software.aws.solution.clickstream.common.ingest.*;
import software.aws.solution.clickstream.common.model.*;

import java.io.*;
import java.util.HashMap;
import java.util.Map;

import static software.aws.solution.clickstream.common.Util.objectToJsonString;


@Slf4j
public class ClickstreamEventParserTest extends BaseTest {

    @BeforeAll
    public static void setup() {
        Configurator.setRootLevel(Level.WARN);
        Configurator.setLevel("software.aws.solution.clickstream", Level.DEBUG);
        setEnableEventTimeShift(true);
    }
    private static void setEnableEventTimeShift(boolean b) {
        System.setProperty(ClickstreamEventParser.ENABLE_EVENT_TIME_SHIFT_PROP, b + "");
    }

    @Test
    public void test_parse_line() throws IOException {
        // ./gradlew clean test --info --tests software.aws.solution.clickstream.common.ClickstreamEventParserTest.test_parse_line
        String line = resourceFileContent("/original_data_nozip.json");

        ClickstreamEventParser clickstreamEventParser = getClickstreamEventParser();
        ClickstreamIngestRow row = clickstreamEventParser.ingestLineToRow(line);

        String expectedJson = this.resourceFileAsString("/expected/test_parse_line.json");

        Assertions.assertEquals(expectedJson, prettyJson(objectToJsonString(row)));
    }

    private static ClickstreamEventParser getClickstreamEventParser() {
        TransformConfig transformConfig = new TransformConfig();
        ClickstreamEventParser clickstreamEventParser = ClickstreamEventParser.getInstance(transformConfig);
        return clickstreamEventParser;
    }

    @Test
    public void test_parse_line_client_time() throws IOException {
        // ./gradlew clean test --info --tests software.aws.solution.clickstream.common.ClickstreamEventParserTest.test_parse_line_client_time
        String lines = resourceFileContent("/original_data_nozip_client_time.json");
        String firstLine = lines.split("\n")[0];
        String secondLine = lines.split("\n")[1];
        String thirdLine = lines.split("\n")[2];

        ClickstreamEventParser clickstreamEventParser = getClickstreamEventParser();
        ClickstreamIngestRow row1 = clickstreamEventParser.ingestLineToRow(firstLine);
        Assertions.assertEquals(1682319109405L, row1.getUploadTimestamp());

        ClickstreamIngestRow row2 = clickstreamEventParser.ingestLineToRow(secondLine);
        Assertions.assertNull(row2.getUploadTimestamp());

        ClickstreamIngestRow row3 = clickstreamEventParser.ingestLineToRow(thirdLine);
        Assertions.assertEquals(1682319109406L, row3.getUploadTimestamp());
    }
    @Test
    void test_parse_data() throws IOException {
        // ./gradlew clean test --info --tests software.aws.solution.clickstream.common.ClickstreamEventParserTest.test_parse_data
        String line = resourceFileContent("/event_deser_input.json");
        ClickstreamEventParser clickstreamEventParser = getClickstreamEventParser();
        Event ingestEvent = clickstreamEventParser.ingestDataToEvent(line);

        String expectedJson = this.resourceFileAsString("/expected/test_parse_data.json");

        Assertions.assertEquals(expectedJson, prettyJson(objectToJsonString(ingestEvent)));
    }


    @Test
    void test_parse_line_to_db_row() throws IOException {
        // ./gradlew clean test --info --tests software.aws.solution.clickstream.common.ClickstreamEventParserTest.test_parse_line_to_db_row

        setEnableEventTimeShift(false);
        String line = resourceFileContent("/original_data_nozip_upload_time.json");
        log.info(line);
        ClickstreamEventParser clickstreamEventParser = getClickstreamEventParser();
        String projectId = "test_project_id";
        String fileName = "original_data_nozip_upload_time.json";

        ParseRowResult rowResult = clickstreamEventParser.parseLineToDBRow(line, projectId, fileName);

        ClickstreamEvent eventV2 = rowResult.getClickstreamEventList().stream().filter(e -> {
            return e.getEventTimeMsec() == 1682319109447L;
        }).findFirst().get();

        String expectedJson = this.resourceFileAsString("/expected/test_parse_line_to_db_row_event_v2.json");

        Assertions.assertEquals(expectedJson, prettyJson(eventV2.toJson()));
    }


    @Test
    void test_parse_line_to_db_row_time_shift() throws IOException {
        // ./gradlew clean test --info --tests software.aws.solution.clickstream.common.ClickstreamEventParserTest.test_parse_line_to_db_row_time_shift

        setEnableEventTimeShift(true);
        String line = resourceFileContent("/original_data_nozip_uri_upload.json");
        log.info(line);
        ClickstreamEventParser clickstreamEventParser = getClickstreamEventParser();
        String projectId = "test_project_id";
        String fileName = "original_data_nozip_uri_upload.json";

        ParseRowResult rowResult = clickstreamEventParser.parseLineToDBRow(line, projectId, fileName);

        ClickstreamEvent eventV2 = rowResult.getClickstreamEventList().get(0);

        String expectedJson = this.resourceFileAsString("/expected/test_parse_line_to_db_row_time_shift.json");

        Assertions.assertEquals(expectedJson, prettyJson(eventV2.toJson()));
    }

    @Test
    public void test_parse_line_to_db_row_disable_time_shift() throws IOException {
        // ./gradlew clean test --info --tests software.aws.solution.clickstream.common.ClickstreamEventParserTest.test_parse_line_to_db_row_disable_time_shift
        setEnableEventTimeShift(false);

        String line = resourceFileContent("/original_data_nozip_upload_time.json");
        log.info(line);
        ClickstreamEventParser clickstreamEventParser = getClickstreamEventParser();
        String projectId = "test_project_id";
        String fileName = "original_data_nozip_upload_time.json";

        ParseRowResult rowResult = clickstreamEventParser.parseLineToDBRow(line, projectId, fileName);

        ClickstreamEvent eventV2 = rowResult.getClickstreamEventList().get(0);

        String expectedJson = this.resourceFileAsString("/expected/test_parse_line_to_db_row_disable_time_shift.json");

        Assertions.assertEquals(expectedJson, prettyJson(eventV2.toJson()));

        setEnableEventTimeShift(true);
    }

    @Test
    void test_parse_line_to_db_row_single() throws IOException {
        // ./gradlew clean test --info --tests software.aws.solution.clickstream.common.ClickstreamEventParserTest.test_parse_line_to_db_row_single
        String line = resourceFileContent("/original_data_single.json");
        log.info(line);
        ClickstreamEventParser clickstreamEventParser = getClickstreamEventParser();
        String projectId = "test_project_id";
        String fileName = "original_data_single.json";

        ParseRowResult rowResult = clickstreamEventParser.parseLineToDBRow(line, projectId, fileName);

        ClickstreamEvent eventV2 = rowResult.getClickstreamEventList().get(0);

        Assertions.assertEquals("ClickMe", eventV2.getEventName());
    }


    @Test
    void test_parse_line_to_db_row_zip() throws IOException {
        // ./gradlew clean test --info --tests software.aws.solution.clickstream.common.ClickstreamEventParserTest.test_parse_line_to_db_row_zip
        String line = resourceFileContent("/original_data.json");
        log.info(line);
        ClickstreamEventParser clickstreamEventParser = getClickstreamEventParser();
        String projectId = "test_project_id";
        String fileName = "original_data.json";

        ParseRowResult rowResult = clickstreamEventParser.parseLineToDBRow(line, projectId, fileName);

        ClickstreamEvent eventV2 = rowResult.getClickstreamEventList().get(0);

        String expectedJson = this.resourceFileAsString("/expected/test_parse_line_to_db_row_zip_event_v2.json");

        Assertions.assertEquals(expectedJson, prettyJson(eventV2.toJson()));
    }

    @Test
    public void test_parse_line_to_db_row_event() throws IOException {
        // ./gradlew clean test --info --tests software.aws.solution.clickstream.common.ClickstreamEventParserTest.test_parse_line_to_db_row_event
        setEnableEventTimeShift(false);

        String line = resourceFileContent("/original_data_page_url.json");
        log.info(line);
        ClickstreamEventParser clickstreamEventParser = getClickstreamEventParser();
        String projectId = "test_project_id";
        String fileName = "original_data_page_url.json";

        ParseRowResult rowResult = clickstreamEventParser.parseLineToDBRow(line, projectId, fileName);

        ClickstreamEvent eventV2 = rowResult.getClickstreamEventList().get(0);

        String expectedJson = this.resourceFileAsString("/expected/test_parse_line_to_db_row_event.json");

        Assertions.assertEquals(expectedJson, prettyJson(eventV2.toJson()));

        setEnableEventTimeShift(true);
    }

    @Test
    public void test_parse_line_to_db_row_event_with_config() throws IOException {
        // ./gradlew clean test --info --tests software.aws.solution.clickstream.common.ClickstreamEventParserTest.test_parse_line_to_db_row_event_with_config
        setEnableEventTimeShift(false);

        String line = resourceFileContent("/original_data_page_url_web.json");
        log.info(line);
        Map<String, RuleConfig> ruleConfigMap = new HashMap<>();
        ruleConfigMap.put("uba-app", getRuleConfigV0());

        TransformConfig transformConfig = new TransformConfig();
        transformConfig.setAppRuleConfig(ruleConfigMap);

        ClickstreamEventParser clickstreamEventParser = ClickstreamEventParser.getInstance(transformConfig);
        String projectId = "test_project_id";
        String fileName = "original_data_page_url.json";

        ParseRowResult rowResult = clickstreamEventParser.parseLineToDBRow(line, projectId, fileName);

        ClickstreamEvent eventV2 = rowResult.getClickstreamEventList().get(0);

        String expectedJson = this.resourceFileAsString("/expected/test_parse_line_to_db_row_event_web.json");

        Assertions.assertEquals(expectedJson, prettyJson(eventV2.toJson()));

        setEnableEventTimeShift(true);
    }

    @Test
    public void test_parse_line_to_db_row_event_with_config2() throws IOException {
        // ./gradlew clean test --info --tests software.aws.solution.clickstream.common.ClickstreamEventParserTest.test_parse_line_to_db_row_event_with_config2
        setEnableEventTimeShift(false);

        String line = resourceFileContent("/original_data_page_url_web.json");
        log.info(line);
        Map<String, RuleConfig> ruleConfigMap = new HashMap<>();
        ruleConfigMap.put("uba-app", getRuleConfigV0());
        TransformConfig transformConfig = new TransformConfig();
        transformConfig.setAppRuleConfig(ruleConfigMap);
        transformConfig.setTrafficSourceEnrichmentDisabled(false);

        ClickstreamEventParser clickstreamEventParser = getClickstreamEventParser();

        String projectId = "test_project_id";
        String fileName = "original_data_page_url.json";

        ParseRowResult rowResult = clickstreamEventParser.parseLineToDBRow(line, projectId, fileName);

        ClickstreamEvent eventV2 = rowResult.getClickstreamEventList().get(0);

        String expectedJson = this.resourceFileAsString("/expected/test_parse_line_to_db_row_event_web.json");

        Assertions.assertEquals(expectedJson, prettyJson(eventV2.toJson()));

        setEnableEventTimeShift(true);
    }

    @Test
    public void test_parse_line_to_db_row_item() throws IOException {
        // ./gradlew clean test --info --tests software.aws.solution.clickstream.common.ClickstreamEventParserTest.test_parse_line_to_db_row_item
        setEnableEventTimeShift(false);

        String line = resourceFileContent("/original_data_with_items.json");
        log.info(line);
        ClickstreamEventParser clickstreamEventParser = getClickstreamEventParser();
        String projectId = "test_project_id";
        String fileName = "original_data_with_items.json";

        ParseRowResult rowResult = clickstreamEventParser.parseLineToDBRow(line, projectId, fileName);

        ClickstreamItem itemV2 = rowResult.getClickstreamItemList().get(0);

        String expectedJson = this.resourceFileAsString("/expected/test_parse_line_to_db_row_item.json");

        Assertions.assertEquals(expectedJson, prettyJson(itemV2.toJson()));

        setEnableEventTimeShift(true);
    }

    @Test
    public void test_parse_line_to_db_row_user() throws IOException {
        // ./gradlew clean test --info --tests software.aws.solution.clickstream.common.ClickstreamEventParserTest.test_parse_line_to_db_row_user
        setEnableEventTimeShift(false);

        String line = resourceFileContent("/original_data_page_url.json");
        log.info(line);
        ClickstreamEventParser clickstreamEventParser = getClickstreamEventParser();
        String projectId = "test_project_id";
        String fileName = "original_data_page_url.json";

        ParseRowResult rowResult = clickstreamEventParser.parseLineToDBRow(line, projectId, fileName);

        ClickstreamUser userV2 = rowResult.getClickstreamUserList().get(0);

        String expectedJson = this.resourceFileAsString("/expected/test_parse_line_to_db_row_user.json");

        Assertions.assertEquals(expectedJson, prettyJson(userV2.toJson()));

        setEnableEventTimeShift(true);
    }

    @Test
    void test_parse_empty_data() throws IOException {
        // ./gradlew clean test --info --tests software.aws.solution.clickstream.common.ClickstreamEventParserTest.test_parse_empty_data

        ClickstreamEventParser clickstreamEventParser = getClickstreamEventParser();
        ExtraParams extraParams = ExtraParams.builder().build();
        ParseDataResult r = clickstreamEventParser.parseData("", extraParams, 0);
        Assertions.assertEquals(0, r.getClickstreamEventList().size());
        Assertions.assertEquals(0, r.getClickstreamItemList().size());
        Assertions.assertNull(r.getClickstreamUser());

        r = clickstreamEventParser.parseData("", extraParams, 0);
        Assertions.assertEquals(0, r.getClickstreamEventList().size());
        Assertions.assertEquals(0, r.getClickstreamItemList().size());
        Assertions.assertNull(r.getClickstreamUser());

        r = clickstreamEventParser.parseData("{\"invalid_name\": \"Test\"}", extraParams, 0);
        Assertions.assertEquals(0, r.getClickstreamEventList().size());
        Assertions.assertEquals(0, r.getClickstreamItemList().size());
        Assertions.assertNull(r.getClickstreamUser());
    }


    @Test
    void testGetSetForTimeShiftInfo() {
        TimeShiftInfo timeShiftInfo = new TimeShiftInfo();

        timeShiftInfo.setTimeDiff(1000L);
        timeShiftInfo.setUploadTimestamp(2000L);
        timeShiftInfo.setEventTimestamp(3000L);
        timeShiftInfo.setAdjusted(false);
        timeShiftInfo.setUri("uri://test");
        timeShiftInfo.setIngestTimestamp(4000L);
        timeShiftInfo.setOriginEventTimestamp(5000L);

        Assertions.assertEquals(1000L, timeShiftInfo.getTimeDiff());
        Assertions.assertEquals(2000L, timeShiftInfo.getUploadTimestamp());
        Assertions.assertEquals(3000L, timeShiftInfo.getEventTimestamp());
        Assertions.assertFalse(timeShiftInfo.isAdjusted());
        Assertions.assertEquals("uri://test", timeShiftInfo.getUri());
        Assertions.assertEquals(4000L, timeShiftInfo.getIngestTimestamp());
        Assertions.assertEquals(5000L, timeShiftInfo.getOriginEventTimestamp());

    }


    @Test
    void test_adjustFutureEventTime() throws IOException {
        // ./gradlew clean test --info --tests software.aws.solution.clickstream.common.ClickstreamEventParserTest.test_adjustFutureEventTime

        setEnableEventTimeShift(false);
        String dataString = resourceFileContent("/data_future_event_time.json");

        ObjectMapper objectMapper = new ObjectMapper();
        long eventTime = System.currentTimeMillis() + 30 * 60* 1000;
        JsonNode data = objectMapper.readTree(dataString);

        ObjectNode dataNode = (ObjectNode) data;
        dataNode.put("timestamp", eventTime);
        ObjectNode user = (ObjectNode)dataNode.get("user");

        ObjectNode userFirstTouch =  JsonNodeFactory.instance.objectNode();
        userFirstTouch.set("value", dataNode.get("timestamp"));
        userFirstTouch.set("set_timestamp", dataNode.get("timestamp"));

        user.set("_user_first_touch_timestamp", userFirstTouch);
        dataNode.set("user", user);

        ObjectNode attributes = (ObjectNode) dataNode.get("attributes");
        attributes.put("_session_start_timestamp", eventTime + 10);

        ClickstreamEventParser clickstreamEventParser = getClickstreamEventParser();
        log.info(dataNode.toPrettyString());

        long ingestTimestamp = eventTime + 10;
        ParseDataResult rowResult = clickstreamEventParser.parseData(dataNode.toString(),
                ExtraParams.builder()
                        .appId("test")
                        .projectId("test_project_id")
                        .ingestTimestamp(ingestTimestamp)
                        .uploadTimestamp(eventTime + 20)
                        .ua("test")
                        .ip("9.9.9.9")
                        .rid("test_rid")
                        .uri("test_uri")
                        .inputFileName("test_file")
                .build(), 0);

        ClickstreamEvent eventV2 = rowResult.getClickstreamEventList().get(0);
        log.info(prettyJson(objectToJsonString(eventV2)));

        Assertions.assertEquals("true", eventV2.getProcessInfo().get("event_timestamp_adjusted"));
        Assertions.assertEquals("ingestTimestamp is -10 millis ahead of uploadTimestamp, isFutureEvent: true|eventTimestamp is in the future, set to ingestTimestamp", eventV2.getProcessInfo().get("event_timestamp_adjusted_reason"));
        Assertions.assertEquals(eventV2.getEventTimeMsec(),  ingestTimestamp); // ingestTimestamp
    }


    @Test
    void test_screen_view_engagement_time() throws IOException {
        // ./gradlew clean test --info --tests software.aws.solution.clickstream.common.ClickstreamEventParserTest.test_screen_view_engagement_time

        setEnableEventTimeShift(false);
        String dataString = resourceFileContent("/screen_view_engagement_time.json");

        ObjectMapper objectMapper = new ObjectMapper();
        long eventTime = 1715428120323L + 30 * 60 * 1000;
        JsonNode data = objectMapper.readTree(dataString);

        ClickstreamEventParser clickstreamEventParser = getClickstreamEventParser();
        log.info(data.toPrettyString());

        long ingestTimestamp = eventTime + 10;
        ParseDataResult rowResult = clickstreamEventParser.parseData(data.toString(),
                ExtraParams.builder()
                        .appId("test")
                        .projectId("test_project_id")
                        .ingestTimestamp(ingestTimestamp)
                        .uploadTimestamp(eventTime + 20)
                        .ua("test")
                        .ip("9.9.9.9")
                        .rid("test_rid")
                        .uri("test_uri")
                        .inputFileName("test_file")
                        .build(), 0);

        ClickstreamEvent eventV2 = rowResult.getClickstreamEventList().get(0);
        log.info(prettyJson(objectToJsonString(eventV2)));

        String expectedJson = this.resourceFileAsString("/expected/test_screen_view_engagement_time.json");

        Assertions.assertEquals(expectedJson, prettyJson(eventV2.toJson()));
    }


    @Test
    void test_DeviceOperatingSystem_set_as_platform() throws IOException {
        // ./gradlew clean test --info --tests software.aws.solution.clickstream.common.ClickstreamEventParserTest.test_DeviceOperatingSystem_set_as_platform
        String dataString = resourceFileContent("/one_line.json");
        ObjectMapper objectMapper = new ObjectMapper();
        JsonNode lineData = objectMapper.readTree(dataString);
        JsonNode data =  lineData.get("data");
        ClickstreamEventParser clickstreamEventParser = getClickstreamEventParser();

        JsonNode ingestionData = clickstreamEventParser.getData(data.asText());
        JsonNode firstElement = ingestionData;
        if (ingestionData.isArray()) {
             firstElement =   ingestionData.elements().next();
        }
       long eventTime = firstElement.get("timestamp").asLong();

        ExtraParams params = ExtraParams.builder()
                .appId("test")
                .projectId("test_project_id")
                .ingestTimestamp(eventTime + 20)
                .uploadTimestamp(eventTime + 10)
                .ua("test")
                .ip("9.9.9.9")
                .rid("test_rid")
                .uri("test_uri")
                .inputFileName("test_file")
                .build();

        ParseDataResult rowResult =  clickstreamEventParser.parseData(firstElement.toString(), params, 0);
        ClickstreamEvent event =  rowResult.getClickstreamEventList().get(0);
        Assertions.assertEquals("iOS", event.getDeviceOperatingSystem());
    }


    @Test
    void test_DeviceOperatingSystem_set_as_platform_web() throws IOException {
        // ./gradlew clean test --info --tests software.aws.solution.clickstream.common.ClickstreamEventParserTest.test_DeviceOperatingSystem_set_as_platform_web
        String dataString = resourceFileContent("/one_line.json");
        ObjectMapper objectMapper = new ObjectMapper();
        JsonNode lineData = objectMapper.readTree(dataString);

        JsonNode data =  lineData.get("data");

        ClickstreamEventParser clickstreamEventParser = getClickstreamEventParser();

        JsonNode ingestionData = clickstreamEventParser.getData(data.asText());
        JsonNode firstElement = ingestionData;
        if (ingestionData.isArray()) {
            firstElement =   ingestionData.elements().next();
        }
        ObjectNode firstElementObj = (ObjectNode) firstElement;
        firstElementObj.put("platform", "Web");

        long eventTime = firstElementObj.get("timestamp").asLong();

        ExtraParams params = ExtraParams.builder()
                .appId("test")
                .projectId("test_project_id")
                .ingestTimestamp(eventTime + 20)
                .uploadTimestamp(eventTime + 10)
                .ua("test")
                .ip("9.9.9.9")
                .rid("test_rid")
                .uri("test_uri")
                .inputFileName("test_file")
                .build();

        ParseDataResult rowResult =  clickstreamEventParser.parseData(firstElementObj.toString(), params, 0);
        ClickstreamEvent event =  rowResult.getClickstreamEventList().get(0);
        Assertions.assertNull(event.getDeviceOperatingSystem());
    }

    @Test
    void test_parse_line_with_empty_latest_referrer() throws IOException {
        // ./gradlew clean test --info --tests software.aws.solution.clickstream.common.ClickstreamEventParserTest.test_parse_line_with_empty_latest_referrer
        String line = resourceFileContent("/empty_latest_referrer.json");
        log.info(line);
        ClickstreamEventParser clickstreamEventParser = getClickstreamEventParser();
        String projectId = "test_project_id";
        String fileName = "empty_latest_referrer.json";

        ParseRowResult rowResult = clickstreamEventParser.parseLineToDBRow(line, projectId, fileName);

        Assertions.assertEquals(1, rowResult.getClickstreamEventList().size());
        Assertions.assertEquals(1, rowResult.getClickstreamUserList().size());
    }
}
