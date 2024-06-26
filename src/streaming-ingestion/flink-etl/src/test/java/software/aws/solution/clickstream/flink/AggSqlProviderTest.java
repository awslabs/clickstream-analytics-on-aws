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

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;


//  ./gradlew clean test --tests  software.aws.solution.clickstream.flink.AggSqlProviderTest
public class AggSqlProviderTest {

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
    public void returnsCorrectSqlForGivenParameters() {
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
                "GROUP BY window_start, window_end\n" +
                "\n" +
                "UNION ALL\n" +
                "SELECT window_start, window_end, 'pageTitleTopRank' as data_type, \n" +
                "JSON_OBJECT(KEY 'page_title' VALUE page_title, KEY 'event_count' VALUE event_count, KEY 'user_count' VALUE user_count, KEY 'rank' VALUE rownum) data \n" +
                "FROM (\n" +
                "    SELECT *, \n" +
                "           ROW_NUMBER() OVER (\n" +
                "               PARTITION BY window_start, window_end \n" +
                "               ORDER BY event_count DESC\n" +
                "           ) AS rownum\n" +
                "    FROM (\n" +
                "        SELECT window_start, \n" +
                "               window_end, \n" +
                "               pageViewPageTitle page_title, \n" +
                "               COUNT(eventId) AS event_count, \n" +
                "               COUNT(distinct userPseudoId) AS user_count\n" +
                "        FROM TABLE(\n" +
                "            CUMULATE(\n" +
                "                TABLE testView, \n" +
                "                DESCRIPTOR(event_time), \n" +
                "                INTERVAL '10' MINUTES, \n" +
                "                INTERVAL '60' MINUTES\n" +
                "            )\n" +
                "        )\n" +
                "        GROUP BY window_start, window_end, pageViewPageTitle\n" +
                "    )\n" +
                ") \n" +
                "WHERE rownum <= 10\n" +
                "\n" +
                "UNION ALL\n" +
                "SELECT window_start, window_end, 'eventNameTopRank' as data_type, \n" +
                "JSON_OBJECT(KEY 'event_name' VALUE event_name, KEY 'event_count' VALUE event_count, KEY 'user_count' VALUE user_count, KEY 'rank' VALUE rownum) data \n" +
                "FROM (\n" +
                "    SELECT *, \n" +
                "           ROW_NUMBER() OVER (\n" +
                "               PARTITION BY window_start, window_end \n" +
                "               ORDER BY event_count DESC\n" +
                "           ) AS rownum\n" +
                "    FROM (\n" +
                "        SELECT window_start, \n" +
                "               window_end, \n" +
                "               eventName event_name, \n" +
                "               COUNT(eventId) AS event_count, \n" +
                "               COUNT(distinct userPseudoId) AS user_count\n" +
                "        FROM TABLE(\n" +
                "            CUMULATE(\n" +
                "                TABLE testView, \n" +
                "                DESCRIPTOR(event_time), \n" +
                "                INTERVAL '10' MINUTES, \n" +
                "                INTERVAL '60' MINUTES\n" +
                "            )\n" +
                "        )\n" +
                "        GROUP BY window_start, window_end, eventName\n" +
                "    )\n" +
                ") \n" +
                "WHERE rownum <= 10";
        String actualSql = aggSqlProvider.getSql();
        assertEquals(expectedSql.trim(), actualSql.trim());
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