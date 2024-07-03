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
import org.apache.flink.table.api.DataTypes;
import org.apache.flink.table.catalog.Column;
import org.apache.flink.table.catalog.ResolvedSchema;

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
    private ResolvedSchema schema;
    @BeforeEach
    public void setup() {
        schema = ResolvedSchema.of(
               Column.physical("testField1", DataTypes.STRING())
        );
        aggSqlProvider = AggSqlProvider.builder()
                .viewName("testView")
                .windowSize(60)
                .windowSlide(10)
                .sourceTableSchema(schema)
                .addAggType("ALL")
                .build();
    }

    @Test
    public void returnsCorrectSqlForGivenParameters() throws IOException {
        String fileName = "/expected/agg-all.sql";
        String expectedSql = IOUtils.resourceToString(fileName, StandardCharsets.UTF_8).trim();

        String actualSql = aggSqlProvider.getSql().trim();
        //assertEquals("", actualSql);
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
        String expectedSql = "SELECT\n" +
                "    window_start,\n" +
                "    window_end,\n" +
                "    'eventAndUserCount' as data_type,\n" +
                "    COUNT(eventId) AS event_count,\n" +
                "    COUNT(distinct userPseudoId) AS user_count,\n" +
                "    CAST(NULL AS INTEGER) as top_rank,\n" +
                "    CAST(NULL AS VARCHAR) as property_name,\n" +
                "    CAST(NULL AS VARCHAR) as property_value\n" +
                "FROM TABLE(\n" +
                "            CUMULATE(\n" +
                "                TABLE testView\n" +
                "                ,DESCRIPTOR(event_time)\n" +
                "                ,INTERVAL '10' MINUTES\n" +
                "                ,INTERVAL '60' MINUTES\n" +
                "            )\n" +
                "        )\n" +
                "GROUP BY window_start, window_end\n" +
                "\n" +
                "UNION ALL\n" +
                "\n" +
                "SELECT\n" +
                "    window_start,\n" +
                "    window_end,\n" +
                "    'newUser' as data_type,\n" +
                "    CAST(NULL AS BIGINT) AS event_count,\n" +
                "    COUNT(distinct userPseudoId) AS user_count,\n" +
                "    CAST(NULL AS INTEGER) as top_rank,\n" +
                "    CAST(NULL AS VARCHAR) as property_name,\n" +
                "    CAST(NULL AS VARCHAR) as property_value\n" +
                "FROM TABLE(\n" +
                "            CUMULATE(\n" +
                "                TABLE testView\n" +
                "                ,DESCRIPTOR(event_time)\n" +
                "                ,INTERVAL '10' MINUTES\n" +
                "                ,INTERVAL '60' MINUTES\n" +
                "            )\n" +
                "        )\n" +
                "WHERE eventName IN ('_first_open', '_first_visit')\n" +
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
    }

    @Test
    public void returnsSqlForCustomField_testField1Top5Rank() {
        aggSqlProvider = AggSqlProvider.builder()
                .viewName("testView")
                .windowSize(60)
                .windowSlide(20)
                .sourceTableSchema(schema)
                .addAggType("testField1Top5Rank")
                .build();

        String actualSql = aggSqlProvider.getSql().trim();
        String expectedSql = "SELECT\n" +
                "    window_start,\n" +
                "    window_end,\n" +
                "    'testField1Top5Rank' as data_type,\n" +
                "    event_count,\n" +
                "    user_count,\n" +
                "    rownum as top_rank,\n" +
                "    'testField1' as property_name,\n" +
                "    testField1 as property_value\n" +
                "  FROM (\n" +
                "    SELECT *,\n" +
                "           ROW_NUMBER() OVER (\n" +
                "               PARTITION BY window_start, window_end\n" +
                "               ORDER BY event_count DESC\n" +
                "           ) AS rownum\n" +
                "    FROM (\n" +
                "        SELECT window_start,\n" +
                "               window_end,\n" +
                "               testField1,\n" +
                "               COUNT(eventId) AS event_count,\n" +
                "               COUNT(distinct userPseudoId) AS user_count\n" +
                "        FROM TABLE(\n" +
                "            CUMULATE(\n" +
                "                TABLE testView\n" +
                "                ,DESCRIPTOR(event_time)\n" +
                "                ,INTERVAL '20' MINUTES\n" +
                "                ,INTERVAL '60' MINUTES\n" +
                "            )\n" +
                "        )\n" +
                "        GROUP BY window_start, window_end, testField1\n" +
                "    )\n" +
                ")\n" +
                "WHERE rownum <= 5";
        assertEquals(expectedSql, actualSql);
    }

    @Test
    public void returnsSqlForCustomField_no_schema_testField1Top5Rank() {
        aggSqlProvider = AggSqlProvider.builder()
                .viewName("testView")
                .windowSize(60)
                .windowSlide(20)
                .addAggType("testField1Top5Rank")
                .build();
        String actualSql = aggSqlProvider.getSql().trim();
        assertEquals("", actualSql);
    }

    @Test
    public void returnsSqlForCustomField_testField2Top5Rank() {
        aggSqlProvider = AggSqlProvider.builder()
                .viewName("testView")
                .windowSize(60)
                .windowSlide(20)
                .sourceTableSchema(schema)
                .addAggType("testField2Top5Rank")
                .build();
        String actualSql = aggSqlProvider.getSql().trim();
        assertEquals("", actualSql);
    }

    @Test
    public void returnsSqlForCustomField_testField1Top5Rank_TUMBLE() {
        aggSqlProvider = AggSqlProvider.builder()
                .viewName("testView")
                .windowSize(60)
                .windowSlide(20)
                .sourceTableSchema(schema)
                .windowTVF(AggSqlProvider.WindowTVF.TUMBLE)
                .addAggType("testField1Top5Rank")
                .build();

        String actualSql = aggSqlProvider.getSql().trim();
        String expectedSql = "SELECT\n" +
                "    window_start,\n" +
                "    window_end,\n" +
                "    'testField1Top5Rank' as data_type,\n" +
                "    event_count,\n" +
                "    user_count,\n" +
                "    rownum as top_rank,\n" +
                "    'testField1' as property_name,\n" +
                "    testField1 as property_value\n" +
                "  FROM (\n" +
                "    SELECT *,\n" +
                "           ROW_NUMBER() OVER (\n" +
                "               PARTITION BY window_start, window_end\n" +
                "               ORDER BY event_count DESC\n" +
                "           ) AS rownum\n" +
                "    FROM (\n" +
                "        SELECT window_start,\n" +
                "               window_end,\n" +
                "               testField1,\n" +
                "               COUNT(eventId) AS event_count,\n" +
                "               COUNT(distinct userPseudoId) AS user_count\n" +
                "        FROM TABLE(\n" +
                "            TUMBLE(\n" +
                "                TABLE testView\n" +
                "                ,DESCRIPTOR(event_time)\n" +
                "                --,INTERVAL '20' MINUTES\n" +
                "                ,INTERVAL '60' MINUTES\n" +
                "            )\n" +
                "        )\n" +
                "        GROUP BY window_start, window_end, testField1\n" +
                "    )\n" +
                ")\n" +
                "WHERE rownum <= 5";
        assertEquals(expectedSql, actualSql);
    }

    @Test
    public void returnsSqlForCustomField_testField1Top5Rank_HOP() {
        aggSqlProvider = AggSqlProvider.builder()
                .viewName("testView")
                .windowSize(60)
                .windowSlide(20)
                .sourceTableSchema(schema)
                .windowTVF("hop")
                .addAggType("testField1Top5Rank")
                .build();

        String actualSql = aggSqlProvider.getSql().trim();
        String expectedSql = "SELECT\n" +
                "    window_start,\n" +
                "    window_end,\n" +
                "    'testField1Top5Rank' as data_type,\n" +
                "    event_count,\n" +
                "    user_count,\n" +
                "    rownum as top_rank,\n" +
                "    'testField1' as property_name,\n" +
                "    testField1 as property_value\n" +
                "  FROM (\n" +
                "    SELECT *,\n" +
                "           ROW_NUMBER() OVER (\n" +
                "               PARTITION BY window_start, window_end\n" +
                "               ORDER BY event_count DESC\n" +
                "           ) AS rownum\n" +
                "    FROM (\n" +
                "        SELECT window_start,\n" +
                "               window_end,\n" +
                "               testField1,\n" +
                "               COUNT(eventId) AS event_count,\n" +
                "               COUNT(distinct userPseudoId) AS user_count\n" +
                "        FROM TABLE(\n" +
                "            HOP(\n" +
                "                TABLE testView\n" +
                "                ,DESCRIPTOR(event_time)\n" +
                "                ,INTERVAL '20' MINUTES\n" +
                "                ,INTERVAL '60' MINUTES\n" +
                "            )\n" +
                "        )\n" +
                "        GROUP BY window_start, window_end, testField1\n" +
                "    )\n" +
                ")\n" +
                "WHERE rownum <= 5";
        assertEquals(expectedSql, actualSql);
    }

    @Test
    public void returnsSqlForCustomField_testField1Top5Rank_SESSION() {
        aggSqlProvider = AggSqlProvider.builder()
                .viewName("testView")
                .windowSize(60)
                .windowSlide(20)
                .sourceTableSchema(schema)
                .windowTVF(AggSqlProvider.WindowTVF.SESSION)
                .addAggType("testField1Top5Rank")
                .build();

        String actualSql = aggSqlProvider.getSql().trim();
        String expectedSql = "SELECT\n" +
                "    window_start,\n" +
                "    window_end,\n" +
                "    'testField1Top5Rank' as data_type,\n" +
                "    event_count,\n" +
                "    user_count,\n" +
                "    rownum as top_rank,\n" +
                "    'testField1' as property_name,\n" +
                "    testField1 as property_value\n" +
                "  FROM (\n" +
                "    SELECT *,\n" +
                "           ROW_NUMBER() OVER (\n" +
                "               PARTITION BY window_start, window_end\n" +
                "               ORDER BY event_count DESC\n" +
                "           ) AS rownum\n" +
                "    FROM (\n" +
                "        SELECT window_start,\n" +
                "               window_end,\n" +
                "               testField1,\n" +
                "               COUNT(eventId) AS event_count,\n" +
                "               COUNT(distinct userPseudoId) AS user_count\n" +
                "        FROM TABLE(\n" +
                "            SESSION(\n" +
                "                TABLE testView\n" +
                "                ,DESCRIPTOR(event_time)\n" +
                "                --,INTERVAL '20' MINUTES\n" +
                "                ,INTERVAL '60' MINUTES\n" +
                "            )\n" +
                "        )\n" +
                "        GROUP BY window_start, window_end, testField1\n" +
                "    )\n" +
                ")\n" +
                "WHERE rownum <= 5";
        assertEquals(expectedSql, actualSql);
    }

}