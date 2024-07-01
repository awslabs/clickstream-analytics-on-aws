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
import org.apache.flink.table.catalog.ResolvedSchema;


import java.text.MessageFormat;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Objects;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import static software.aws.solution.clickstream.flink.Utils.readResourceAsString;

@Slf4j
@AllArgsConstructor
public class AggSqlProvider {
    public enum WindowTVF {
        TUMBLE, SESSION, HOP, CUMULATE
    }
    public static final String EVENT_NAME_TOP_RANK = "eventNameTopRank";
    public static final String PAGE_TITLE_TOP_RANK = "pageTitleTopRank";
    public static final String EVENT_AND_USER_COUNT = "eventAndUserCount";
    public static final String TRAFFIC_SOURCE_SOURCE_TOP_RANK = "trafficSourceSourceTopRank";
    public static final String ALL = "ALL";
    private final String viewName;
    private final int windowSize;
    private final int windowSlide;
    private final List<String> aggTypes;
    private final ResolvedSchema sourceTableSchema;
    private final WindowTVF windowTVF; // TUMBLE, SESSION, HOP, CUMULATE

     public static class AggSqlProviderBuilder {
         private String viewName;
         private int windowSize = 60;
         private int windowSlide = 10;
         private ResolvedSchema sourceTableSchema;
         private WindowTVF windowTVF;
         private final List<String> aggTypes = new ArrayList<>();

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

         public AggSqlProviderBuilder sourceTableSchema(final ResolvedSchema sourceTableSchema) {
             this.sourceTableSchema = sourceTableSchema;
             return this;
         }
         public AggSqlProviderBuilder windowTVF(final WindowTVF windowTVF) {
             this.windowTVF = windowTVF;
             return this;
         }
         public AggSqlProviderBuilder windowTVF(final String windowType) {
             this.windowTVF = WindowTVF.valueOf(windowType.toUpperCase());
             return this;
         }
         public AggSqlProvider build() {
                Objects.requireNonNull(viewName, "viewName must be provided");
                if (aggTypes.isEmpty()) {
                    log.warn("No aggregation type is provided, default to all");
                    aggTypes.add(ALL);
                }

                if (windowTVF == null) {
                    log.warn("windowType is not provided, default to CUMULATE");
                    windowTVF = WindowTVF.CUMULATE;
                }

             return new AggSqlProvider(viewName, windowSize, windowSlide, aggTypes, sourceTableSchema, windowTVF);
         }
     }

     public static AggSqlProviderBuilder builder() {
         return new AggSqlProviderBuilder();
     }

     public String getSql() {
         List<String> sqlList = new ArrayList<>();
         boolean hasWindowSlide = windowTVF == WindowTVF.CUMULATE || windowTVF == WindowTVF.HOP;
         String param6SqlComment = "--";
         if (hasWindowSlide) {
             param6SqlComment =  "";
         }

         String sql1Template = readResourceAsString("/sql/event_user_count.template.sql");
         String sql1 = MessageFormat.format(sql1Template, viewName, windowSlide, windowSize, windowTVF, param6SqlComment);

         if (aggTypes.contains(ALL) || aggTypes.contains(EVENT_AND_USER_COUNT)) {
             sqlList.add(sql1);
         }
         int topN = 10;
         String topNSqlTemplate = readResourceAsString("/sql/top_n_cumulate.template.sql");

         if (aggTypes.contains(ALL) || aggTypes.contains(PAGE_TITLE_TOP_RANK)) {
             String topNSql = MessageFormat.format(topNSqlTemplate,  viewName, windowSlide, windowSize, windowTVF, "pageViewPageTitle", topN, param6SqlComment);
             sqlList.add(topNSql);
         }

         if (aggTypes.contains(ALL) || aggTypes.contains(EVENT_NAME_TOP_RANK)) {
             String topNSql = MessageFormat.format(topNSqlTemplate,  viewName, windowSlide, windowSize, windowTVF, "eventName", topN, param6SqlComment);
             sqlList.add(topNSql);
         }

         if (aggTypes.contains(ALL) || aggTypes.contains(TRAFFIC_SOURCE_SOURCE_TOP_RANK)) {
             String topNSql = MessageFormat.format(topNSqlTemplate,  viewName, windowSlide, windowSize, windowTVF, "trafficSourceSource", topN, param6SqlComment);
             sqlList.add(topNSql);
         }

         sqlList.addAll(extractCustomAggSqlList(topNSqlTemplate, param6SqlComment));

         String retSql = "";
         if (!sqlList.isEmpty()) {
             retSql = String.join("\nUNION ALL\n", sqlList);
         } else {
             log.warn("No aggregation type is provided, aggTypes: {}", String.join(",", aggTypes));
         }
         log.info("AggSqlProvider.getSql: \n{}", retSql);
         return retSql;
     }

    private List<String> extractCustomAggSqlList(final String topNSqlTemplate, final String param6SqlComment) {
         List<String> sqlsList = new ArrayList<>();
         if (this.sourceTableSchema == null) {
             log.warn("sourceTableSchema is not provided, skip custom aggregation");
             return sqlsList;
         }
        for (String aggType: aggTypes) {
           Pattern pattern = Pattern.compile("^([a-zA-Z0-9]+)Top(\\d+)Rank$");
           Matcher m =  pattern.matcher(aggType);
           if (m.matches()) {
               String field = m.group(1);
               int n = Integer.parseInt(m.group(2));

               if (n > 0 && this.sourceTableSchema.getColumn(field).isPresent()) {
                   String topNSql = MessageFormat.format(topNSqlTemplate, viewName, windowSlide, windowSize, windowTVF, field, n, param6SqlComment);
                   sqlsList.add(topNSql);
               } else {
                     log.warn("Invalid aggType: {}, field: {}, n: {}", aggType, field, n);
               }
           }
        }
        return sqlsList;
    }

}
