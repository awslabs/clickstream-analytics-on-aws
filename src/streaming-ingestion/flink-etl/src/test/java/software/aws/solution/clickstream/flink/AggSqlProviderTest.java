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

package software.aws.solution.clickstream.flink;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.testcontainers.shaded.org.apache.commons.io.IOUtils;

import java.io.IOException;
import java.nio.charset.StandardCharsets;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;


//  ./gradlew clean test --tests  software.aws.solution.clickstream.flink.AggSqlProviderTest
public class AggSqlProviderTest extends BaseFlinkTest {

    private AggSqlProvider aggSqlProvider;

    @BeforeEach
    public void setup() {
        aggSqlProvider = AggSqlProvider.builder()
                .viewName("testView")
                .windowSize(60)
                .windowSlide(10)
                .addAggType("ALL")
                .build();
    }

    @Test
    public void returnsCorrectSqlForGivenParameters() throws IOException {
        String fileName = "/expected/agg-all.sql";
        String expectedSql = IOUtils.resourceToString(fileName, StandardCharsets.UTF_8).trim();

        String actualSql = aggSqlProvider.getSql().trim();
        assertEquals(expectedSql.replaceAll("\\s+", ""),
                actualSql.replaceAll("\\s+", ""));
    }

    @Test
    public void returnsDifferentSqlForDifferentAggType() {
        aggSqlProvider = AggSqlProvider.builder()
                .viewName("testView")
                .windowSize(60)
                .windowSlide(10)
                .addAggType(AggSqlProvider.EVENT_AND_USER_COUNT)
                .build();
        String expectedSql = "SELECT window_start, window_end, 'eventAndUserCount' as data_type, \n" +
                "JSON_OBJECT(KEY 'user_count' VALUE COUNT(distinct userPseudoId), KEY 'event_count' VALUE COUNT(eventId)) data \n" +
                "FROM TABLE(\n" +
                "            CUMULATE(\n" +
                "                TABLE testView, \n" +
                "                DESCRIPTOR(event_time), \n" +
                "                INTERVAL '10' MINUTES, \n" +
                "                INTERVAL '60' MINUTES\n" +
                "            )\n" +
                "        )\n" +
                "GROUP BY window_start, window_end";
        String actualSql = aggSqlProvider.getSql();
        assertEquals(expectedSql.trim(), actualSql.trim());
    }

    @Test
    public void returnsDifferentSqlForDifferentWindowSize() {
        aggSqlProvider = AggSqlProvider.builder()
                .viewName("testView")
                .windowSize(120)
                .windowSlide(10)
                .addAggType(AggSqlProvider.EVENT_NAME_TOP_RANK)
                .build();

        String actualSql = aggSqlProvider.getSql();
        assertTrue(actualSql.contains("INTERVAL '10' MINUTES"));
        assertTrue(actualSql.contains("INTERVAL '120' MINUTES"));
        assertTrue(actualSql.contains("'" + AggSqlProvider.EVENT_NAME_TOP_RANK + "' as data_type"));
    }

    @Test
    public void returnsDifferentSqlForDifferentWindowSlide() {
        aggSqlProvider = AggSqlProvider.builder()
                .viewName("testView")
                .windowSize(60)
                .windowSlide(20)
                .addAggType(AggSqlProvider.PAGE_TITLE_TOP_RANK)
                .build();

        String actualSql = aggSqlProvider.getSql();
        assertTrue(actualSql.contains("INTERVAL '20' MINUTES"));
        assertTrue(actualSql.contains("INTERVAL '60' MINUTES"));
        assertTrue(actualSql.contains("'" + AggSqlProvider.PAGE_TITLE_TOP_RANK + "' as data_type"));
    }

    @Test
    public void returnsDifferentSqlForDifferentAggType2() {
        aggSqlProvider = AggSqlProvider.builder()
                .viewName("testView")
                .windowSize(60)
                .windowSlide(20)
                .addAggType(AggSqlProvider.EVENT_AND_USER_COUNT)
                .build();

        String actualSql = aggSqlProvider.getSql();
        assertTrue(actualSql.contains("INTERVAL '20' MINUTES"));
        assertTrue(actualSql.contains("INTERVAL '60' MINUTES"));
        assertTrue(actualSql.contains("'" + AggSqlProvider.EVENT_AND_USER_COUNT + "' as data_type"));
    }
}