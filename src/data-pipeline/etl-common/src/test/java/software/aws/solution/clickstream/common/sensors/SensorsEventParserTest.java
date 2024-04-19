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

package software.aws.solution.clickstream.common.sensors;

import org.apache.logging.log4j.Level;
import org.apache.logging.log4j.core.config.Configurator;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import software.aws.solution.clickstream.BaseTest;
import software.aws.solution.clickstream.common.ParseRowResult;
import software.aws.solution.clickstream.common.ingest.ClickstreamIngestRow;
import software.aws.solution.clickstream.common.model.ClickstreamEvent;
import software.aws.solution.clickstream.common.model.ClickstreamUser;
import software.aws.solution.clickstream.common.sensors.event.SensorsEvent;

import java.io.IOException;

import static software.aws.solution.clickstream.common.Util.objectToJsonString;


public class SensorsEventParserTest extends BaseTest {
    @BeforeAll
    public static void setup() {
        Configurator.setRootLevel(Level.WARN);
        Configurator.setLevel("software.aws.solution.clickstream", Level.DEBUG);
    }

    @Test
    void test_sensors_ingestLineToRow() throws IOException {

        String lines = resourceFileContent("/sensors-data/gzip-raw-data.json");

        String firstLine = lines.split("\n")[0];

        ClickstreamIngestRow row = SensorsEventParser.getInstance().ingestLineToRow(firstLine);
        String expectedJson = this.resourceFileAsString("/sensors-data/expected/test_sensors_ingestLineToRow.json");

        Assertions.assertEquals(expectedJson, prettyJson(objectToJsonString(row)));
    }

    @Test
    void test_sensors_ingestDataToEvent() throws IOException {
        // ./gradlew clean test --info --tests software.aws.solution.clickstream.common.gtm.GTMEventParserTest.test_gtm_ingestDataToEvent

        String lines = resourceFileContent("/sensors-data/track-signup-data.json");

        String firstLine = lines.split("\n")[0];

        SensorsEventParser sensorsEventParser = SensorsEventParser.getInstance();
        ClickstreamIngestRow row = sensorsEventParser.ingestLineToRow(firstLine);
        SensorsEvent event = sensorsEventParser.ingestDataToEvent(row.getData());
        String expectedJson = this.resourceFileAsString("/sensors-data/expected/test_sensors_data_ingestDataToEvent.json");

        Assertions.assertEquals(expectedJson, prettyJson(objectToJsonString(event)));
    }


    @Test
    void test_sensors_parseLineToDBRow_event() throws IOException {
        // ./gradlew clean test --info --tests software.aws.solution.clickstream.common.gtm.GTMEventParserTest.test_gtm_parseLineToDBRow_event

        String lines = resourceFileContent("/sensors-data/gzip-raw-data.json");

        String firstLine = lines.split("\n")[0];

        SensorsEventParser sensorsEventParser = SensorsEventParser.getInstance();
        ParseRowResult rowResult = sensorsEventParser.parseLineToDBRow(firstLine, "test_project_id", "server-session-start.json");

        ClickstreamEvent csEvent = rowResult.getClickstreamEventList().get(0);
        String expectedJson = this.resourceFileAsString("/sensors-data/expected/test_sensors_data_parseLineToDBRow_event.json");
        Assertions.assertEquals(expectedJson, prettyJson(csEvent.toJson()), "test_sensors_parseLineToDBRow_event");
    }

    @Test
    void test_sensors_parseLineToDBRow_web_event() throws IOException {
        // ./gradlew clean test --info --tests software.aws.solution.clickstream.common.gtm.GTMEventParserTest.test_gtm_parseLineToDBRow_event

        String lines = resourceFileContent("/sensors-data/web-sdk-data.json");

        String firstLine = lines.split("\n")[0];

        SensorsEventParser sensorsEventParser = SensorsEventParser.getInstance();
        ParseRowResult rowResult = sensorsEventParser.parseLineToDBRow(firstLine, "test_project_id", "server-session-start.json");

        ClickstreamEvent csEvent = rowResult.getClickstreamEventList().get(0);
        String expectedJson = this.resourceFileAsString("/sensors-data/expected/test_sensors_data_parseLineToDBRow_web_event.json");
        Assertions.assertEquals(expectedJson, prettyJson(csEvent.toJson()), "test_sensors_parseLineToDBRow_event");
    }

    @Test
    void test_sensors_parseLineToDBRow_user() throws IOException {
        // ./gradlew clean test --info --tests software.aws.solution.clickstream.common.gtm.GTMEventParserTest.test_gtm_parseLineToDBRow_user

        String lines = resourceFileContent("/sensors-data/unzip-data2.json");

        String firstLine = lines.split("\n")[0];

        SensorsEventParser sensorsEventParser = SensorsEventParser.getInstance();
        ParseRowResult rowResult = sensorsEventParser.parseLineToDBRow(firstLine, "test_project_id", "server-session-start.json");

        ClickstreamUser csUser = rowResult.getClickstreamUserList().get(0);
        String expectedJson = this.resourceFileAsString("/sensors-data/expected/test_sensors_parseLineToDBRow_user.json");
        Assertions.assertEquals(expectedJson, prettyJson(csUser.toJson()), "test_sensors_parseLineToDBRow_user");
    }

    @Test
    void test_sensors_parseLineToDBRow_item() throws IOException {
        // ./gradlew clean test --info --tests software.aws.solution.clickstream.common.gtm.GTMEventParserTest.test_gtm_parseLineToDBRow_item

        String lines = resourceFileContent("/sensors-data/track-signup-data.json");

        String firstLine = lines.split("\n")[0];

        SensorsEventParser sensorsEventParser = SensorsEventParser.getInstance();
        ParseRowResult rowResult = sensorsEventParser.parseLineToDBRow(firstLine, "test_project_id", "server-session-start.json");

        Assertions.assertEquals(0, rowResult.getClickstreamItemList().size(), "test_sensors_parseLineToDBRow_item");

    }

    @Test
    void test_sensors_parseLineToDBRow_item_data() throws IOException {
        // ./gradlew clean test --info --tests software.aws.solution.clickstream.common.gtm.GTMEventParserTest.test_gtm_parseLineToDBRow_item

        String lines = resourceFileContent("/sensors-data/unzip-item-data.json");

        String firstLine = lines.split("\n")[0];

        SensorsEventParser sensorsEventParser = SensorsEventParser.getInstance();
        ParseRowResult rowResult = sensorsEventParser.parseLineToDBRow(firstLine, "test_project_id", "server-session-start.json");

        Assertions.assertEquals(1, rowResult.getClickstreamItemList().size(), "test_sensors_parseLineToDBRow_item");

    }
}
