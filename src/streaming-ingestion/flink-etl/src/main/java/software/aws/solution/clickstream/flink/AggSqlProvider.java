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

import lombok.AllArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

@Slf4j
@AllArgsConstructor
public class AggSqlProvider {
    public static final String EVENT_NAME_TOP_RANK = "eventNameTopRank";
    public static final String PAGE_TITLE_TOP_RANK = "pageTitleTopRank";
    public static final String EVENT_AND_USER_COUNT = "eventAndUserCount";
    public static final String TRAFFIC_SOURCE_SOURCE_TOP_RANK = "trafficSourceSourceTopRank";
    public static final String ALL = "ALL";
    private final String viewName;
    private final int windowSize;
    private final int windowSlide;
    private final List<String> aggTypes;

     public static class AggSqlProviderBuilder {
         private String viewName;
         private int windowSize = 60;
         private int windowSlide = 10;
         private List<String> aggTypes = new ArrayList<>();

         public AggSqlProviderBuilder viewName(final String viewName) {
             this.viewName = viewName;
             return this;
         }

         public AggSqlProviderBuilder windowSize(final int windowSize) {
             this.windowSize = windowSize;
             return this;
         }

         public AggSqlProviderBuilder windowSlide(final int windowSlide) {
             this.windowSlide = windowSlide;
             return this;
         }

         // add more aggregation types
         public AggSqlProviderBuilder addAggType(final String aggType) {
                aggTypes.add(aggType);
                return this;
            }

         public AggSqlProviderBuilder addAggTypes(final String[] aggTypes) {
             this.aggTypes.addAll(Arrays.asList(aggTypes));
             return this;
         }
         public AggSqlProvider build() {
             return new AggSqlProvider(viewName, windowSize, windowSlide, aggTypes);
         }
     }

     public static AggSqlProviderBuilder builder() {
         return new AggSqlProviderBuilder();
     }

     public String getSql() {
         List<String> sqlList = new ArrayList<>();

         String cumulateTable = String.format("TABLE(\n"
                 + "            CUMULATE(\n"
                 + "                TABLE %s, \n"
                 + "                DESCRIPTOR(event_time), \n"
                 + "                INTERVAL '%s' MINUTES, \n"
                 + "                INTERVAL '%s' MINUTES\n"
                 + "            )\n"
                 + "        )", viewName, windowSlide, windowSize);

         String selectWindow = "SELECT window_start, window_end, '%s' as data_type, \n";
         String sql1 = String.format(// NOSONAR
                 selectWindow
                         +      "JSON_OBJECT(KEY 'user_count' VALUE COUNT(distinct userPseudoId), KEY 'event_count' VALUE COUNT(eventId)) data \n"
                         + "FROM %s\n"
                         + "GROUP BY window_start, window_end\n",
                 EVENT_AND_USER_COUNT, cumulateTable);

         if (aggTypes.contains(ALL) || aggTypes.contains(EVENT_AND_USER_COUNT)) {
             sqlList.add(sql1);
         }

         String sql2 = getGroupBySql(PAGE_TITLE_TOP_RANK, selectWindow,  "pageViewPageTitle", cumulateTable);

         if (aggTypes.contains(ALL) || aggTypes.contains(PAGE_TITLE_TOP_RANK)) {
             sqlList.add(sql2);
         }

         String sql3 = getGroupBySql(EVENT_NAME_TOP_RANK, selectWindow,  "eventName", cumulateTable);

         if (aggTypes.contains(ALL) || aggTypes.contains(EVENT_NAME_TOP_RANK)) {
             sqlList.add(sql3);
         }

         String sql4 = getGroupBySql(TRAFFIC_SOURCE_SOURCE_TOP_RANK, selectWindow,  "trafficSourceSource", cumulateTable);

         if (aggTypes.contains(ALL) || aggTypes.contains(TRAFFIC_SOURCE_SOURCE_TOP_RANK)) {
             sqlList.add(sql4);
         }

         if (!sqlList.isEmpty()) {
             return String.join("\nUNION ALL\n", sqlList);
         } else {
             log.warn("No aggregation type is provided, aggTypes: {}", String.join(",", aggTypes));
             return "";
         }
     }

    private static String getGroupBySql(final String aggType, final String selectWindow, final String groupColumn, final String cumulateTable) {
        String sql2 = String.format(// NOSONAR
                selectWindow
                        +     "JSON_OBJECT(KEY '%s' VALUE %s, KEY 'event_count' VALUE event_count, KEY 'user_count' VALUE user_count, KEY 'rank' VALUE rownum) data \n"
                        + "FROM (\n"
                        + "    SELECT *, \n"
                        + "           ROW_NUMBER() OVER (\n"
                        + "               PARTITION BY window_start, window_end \n"
                        + "               ORDER BY event_count DESC\n"
                        + "           ) AS rownum\n"
                        + "    FROM (\n"
                        + "        SELECT window_start, \n"
                        + "               window_end, \n"
                        + "               %s, \n"
                        + "               COUNT(eventId) AS event_count, \n"
                        + "               COUNT(distinct userPseudoId) AS user_count\n"
                        + "        FROM %s\n"
                        + "        GROUP BY window_start, window_end, %s\n"
                        + "    )\n"
                        + ") \n"
                        + "WHERE rownum <= 10\n", aggType, groupColumn, groupColumn, groupColumn, cumulateTable, groupColumn);
        return sql2;
    }

}
