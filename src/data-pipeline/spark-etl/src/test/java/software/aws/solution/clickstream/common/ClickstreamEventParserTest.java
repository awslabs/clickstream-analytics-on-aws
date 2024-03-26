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

import lombok.extern.slf4j.*;
import org.apache.logging.log4j.*;
import org.apache.logging.log4j.core.config.*;
import org.junit.jupiter.api.*;
import software.aws.solution.clickstream.*;
import software.aws.solution.clickstream.common.ingest.*;
import software.aws.solution.clickstream.common.model.*;

import java.io.*;

import static software.aws.solution.clickstream.util.Utils.objectToJsonString;

@Slf4j
public class ClickstreamEventParserTest extends BaseTest {

    @BeforeAll
    public static void setup() {
        Configurator.setRootLevel(Level.WARN);
        Configurator.setLevel("software.aws.solution.clickstream", Level.DEBUG);
    }
    @Test
    public void test_parse_line() throws IOException {
        // ./gradlew clean test --info --tests software.aws.solution.clickstream.common.ClickstreamEventParserTest.test_parse_line
        String line = resourceFileContent("/original_data_nozip.json");

        ClickstreamEventParser clickstreamEventParser = ClickstreamEventParser.getInstance();
        ClickstreamIngestRow row = clickstreamEventParser.ingestLineToRow(line);

        String expectedJson = this.resourceFileAsString("/expected/test_parse_line.json");

        Assertions.assertEquals(expectedJson, prettyJson(objectToJsonString(row)));
    }

    @Test
    public void test_parse_line_client_time() throws IOException {
        // ./gradlew clean test --info --tests software.aws.solution.clickstream.common.ClickstreamEventParserTest.test_parse_line_client_time
        String lines = resourceFileContent("/original_data_nozip_client_time.json");
        String firstLine = lines.split("\n")[0];
        String secondLine = lines.split("\n")[1];
        String thirdLine = lines.split("\n")[2];

        ClickstreamEventParser clickstreamEventParser = ClickstreamEventParser.getInstance();
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
        ClickstreamEventParser clickstreamEventParser = ClickstreamEventParser.getInstance();
        Event ingestEvent = clickstreamEventParser.ingestDataToEvent(line);

        String expectedJson = this.resourceFileAsString("/expected/test_parse_data.json");

        Assertions.assertEquals(expectedJson, prettyJson(objectToJsonString(ingestEvent)));
    }


    @Test
    void test_parse_line_to_db_row() throws IOException {
        // ./gradlew clean test --info --tests software.aws.solution.clickstream.common.ClickstreamEventParserTest.test_parse_line_to_db_row
        String line = resourceFileContent("/original_data_nozip_upload_time.json");
        log.info(line);
        ClickstreamEventParser clickstreamEventParser = ClickstreamEventParser.getInstance();
        String projectId = "test_project_id";
        String fileName = "original_data_nozip_upload_time.json";

        ParseRowResult rowResult = clickstreamEventParser.parseLineToDBRow(line, projectId, fileName);

        ClickstreamEvent eventV2 = rowResult.getClickstreamEventList().get(0);

        String expectedJson = this.resourceFileAsString("/expected/test_parse_line_to_db_row_event_v2.json");

        Assertions.assertEquals(expectedJson, prettyJson(objectToJsonString(eventV2)));
    }

    @Test
    void test_parse_line_to_db_row_single() throws IOException {
        // ./gradlew clean test --info --tests software.aws.solution.clickstream.common.ClickstreamEventParserTest.test_parse_line_to_db_row_single
        String line = resourceFileContent("/original_data_single.json");
        log.info(line);
        ClickstreamEventParser clickstreamEventParser = ClickstreamEventParser.getInstance();
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
        ClickstreamEventParser clickstreamEventParser = ClickstreamEventParser.getInstance();
        String projectId = "test_project_id";
        String fileName = "original_data.json";

        ParseRowResult rowResult = clickstreamEventParser.parseLineToDBRow(line, projectId, fileName);

        ClickstreamEvent eventV2 = rowResult.getClickstreamEventList().get(0);

        String expectedJson = this.resourceFileAsString("/expected/test_parse_line_to_db_row_zip_event_v2.json");

        Assertions.assertEquals(expectedJson, prettyJson(objectToJsonString(eventV2)));
    }
}
