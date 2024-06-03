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

package software.aws.solution.clickstream.transformer;

import lombok.extern.slf4j.Slf4j;
import org.apache.spark.sql.Column;
import org.apache.spark.sql.Dataset;
import org.apache.spark.sql.Row;
import org.apache.spark.sql.SparkSession;
import org.apache.spark.sql.types.DataTypes;
import software.aws.solution.clickstream.TransformerInterfaceV3;
import software.aws.solution.clickstream.common.Constant;
import software.aws.solution.clickstream.udfconverter.DatasetConverter;
import software.aws.solution.clickstream.model.ModelV2;
import software.aws.solution.clickstream.util.ContextUtil;
import software.aws.solution.clickstream.util.DatasetUtil;
import software.aws.solution.clickstream.util.ETLMetric;
import software.aws.solution.clickstream.util.TableName;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;

import static org.apache.spark.sql.functions.col;
import static org.apache.spark.sql.functions.explode;
import static org.apache.spark.sql.functions.expr;
import static org.apache.spark.sql.functions.lit;
import static org.apache.spark.sql.functions.map;
import static org.apache.spark.sql.functions.map_concat;
import static org.apache.spark.sql.functions.min_by;
import static org.apache.spark.sql.functions.struct;
import static org.apache.spark.sql.functions.when;
import static software.aws.solution.clickstream.TransformerV3.CLIENT_TIMESTAMP;
import static software.aws.solution.clickstream.common.BaseEventParser.UPLOAD_TIMESTAMP;
import static software.aws.solution.clickstream.model.ModelV2.toColumnArray;
import static software.aws.solution.clickstream.transformer.MaxLengthTransformerV2.runMaxLengthTransformerForEventV2;
import static software.aws.solution.clickstream.transformer.MaxLengthTransformerV2.runMaxLengthTransformerForItemV2;
import static software.aws.solution.clickstream.transformer.MaxLengthTransformerV2.runMaxLengthTransformerForSession;
import static software.aws.solution.clickstream.util.DatasetUtil.EVENT_APP_END;
import static software.aws.solution.clickstream.util.DatasetUtil.EVENT_PAGE_VIEW;
import static software.aws.solution.clickstream.util.DatasetUtil.EVENT_SCREEN_VIEW;
import static software.aws.solution.clickstream.util.DatasetUtil.EVENT_SESSION_START;
import static software.aws.solution.clickstream.util.DatasetUtil.EVENT_USER_ENGAGEMENT;
import static software.aws.solution.clickstream.util.DatasetUtil.deDupDataset;

@Slf4j
public abstract class BaseTransformerV3 implements TransformerInterfaceV3 {
    public static final String PROCESS_JOB_ID = "process_job_id";
    public static final String PROCESS_TIME = "process_time";
    public static final String TABLE_VERSION_SUFFIX_V3 = "_v3" ;
    public static final String DIRECT = "Direct";

    public static Column mapConcatSafe(final Column map1, final Column map2) {
        return when(map1.isNull(), map2)
                .when(map2.isNull(), map1)
                .otherwise(map_concat(map1, map2));
    }

    public static Dataset<Row> addProcessInfo(final Dataset<Row> dataset) {
        String jobName = ContextUtil.getJobName();
        return dataset.withColumn(Constant.PROCESS_INFO,
                mapConcatSafe(
                        col(Constant.PROCESS_INFO),
                        map(
                                lit(PROCESS_JOB_ID), lit(jobName),
                                lit(PROCESS_TIME), lit(Instant.now().toString())
                        ))
        ).withColumn(Constant.CREATED_TIME, lit(new Timestamp(System.currentTimeMillis())).cast(DataTypes.TimestampType));
    }

    public Dataset<Row> extractEvent(final Dataset<Row> convertedDataset) {
        List<String> allFields = ModelV2.getEventFields();
        Dataset<Row> eventDataset = convertedDataset.select(explode(expr("dataOut.events")).alias("event"))
                .select("event.*")
                .select(toColumnArray(allFields));
        return addProcessInfo(runMaxLengthTransformerForEventV2(eventDataset));
    }

    public Dataset<Row> extractItem(final Dataset<Row> convertedDataset) {
        List<String> keyFields = Arrays.asList(Constant.EVENT_ID, Constant.USER_PSEUDO_ID, Constant.ITEM_ID);
        List<String> allFields = ModelV2.getItemFields();

        Dataset<Row> itemDataset = convertedDataset.select(explode(expr("dataOut.items")).alias("item"))
                .select("item.*")
                .select(toColumnArray(allFields));
        Dataset<Row> deDupitemDataset = deDupDataset(itemDataset, keyFields, allFields);
        return addProcessInfo(runMaxLengthTransformerForItemV2(deDupitemDataset));
    }

    @Override
    public Map<TableName, Dataset<Row>> transform(final Dataset<Row> dataset) {
        Dataset<Row> cleanedDataset = getCleanedDataset(dataset);
        ContextUtil.cacheDataset(cleanedDataset);
        log.info(new ETLMetric(cleanedDataset, "after clean").toString());

        log.debug(cleanedDataset.schema().prettyJson());

        if (Arrays.asList(dataset.columns()).contains(CLIENT_TIMESTAMP)) {
            cleanedDataset = cleanedDataset.withColumn(UPLOAD_TIMESTAMP, col(CLIENT_TIMESTAMP).cast(DataTypes.LongType));
        } else if (!Arrays.asList(dataset.columns()).contains(UPLOAD_TIMESTAMP)) {
            cleanedDataset = cleanedDataset.withColumn(UPLOAD_TIMESTAMP, lit(null).cast(DataTypes.LongType));
        }

        Dataset<Row> convertedDataset = getDatasetTransformer().transform(cleanedDataset);

        convertedDataset.cache();
        log.info("convertedDataset count:" + convertedDataset.count());

        Dataset<Row> eventDataset = extractEvent(convertedDataset);
        Dataset<Row> itemDataset = extractItem(convertedDataset);
        Dataset<Row> userDataset = extractUser(eventDataset, convertedDataset).filter(col(Constant.USER_PSEUDO_ID).isNotNull());
        Dataset<Row> sessionDataset = extractSessionFromEvent(eventDataset);

        log.info("eventDataset count:" + eventDataset.count());
        log.info("itemDataset count:" + itemDataset.count());
        log.info("userDataset count:" + userDataset.count());
        log.info("sessionDataset count:" + sessionDataset.count());

        Map<TableName, Dataset<Row>> result = new EnumMap<>(TableName.class);
        // table name -> dataset
        result.put(TableName.EVENT_V2, eventDataset);
        result.put(TableName.ITEM_V2, itemDataset);
        result.put(TableName.USER_V2, userDataset);
        result.put(TableName.SESSION, sessionDataset);
        return result;

    }

    public Dataset<Row> extractSessionFromEvent(final Dataset<Row> eventDataset) {
        Dataset<Row> sessionDataset = eventDataset.select(
                col(Constant.APP_ID),
                col(Constant.EVENT_TIMESTAMP),
                col(Constant.EVENT_NAME),
                col(Constant.PLATFORM),
                col(Constant.USER_PSEUDO_ID),
                col(Constant.SESSION_ID),
                col(Constant.USER_ID),
                col(Constant.SESSION_NUMBER),
                col(Constant.SESSION_START_TIME_MSEC),
                col(Constant.TRAFFIC_SOURCE_SOURCE).alias(Constant.SESSION_SOURCE),
                col(Constant.TRAFFIC_SOURCE_MEDIUM).alias(Constant.SESSION_MEDIUM),
                col(Constant.TRAFFIC_SOURCE_CAMPAIGN).alias(Constant.SESSION_CAMPAIGN),
                col(Constant.TRAFFIC_SOURCE_CONTENT).alias(Constant.SESSION_CONTENT),
                col(Constant.TRAFFIC_SOURCE_TERM).alias(Constant.SESSION_TERM),
                col(Constant.TRAFFIC_SOURCE_CAMPAIGN_ID).alias(Constant.SESSION_CAMPAIGN_ID),
                col(Constant.TRAFFIC_SOURCE_CLID_PLATFORM).alias(Constant.SESSION_CLID_PLATFORM),
                col(Constant.TRAFFIC_SOURCE_CLID).alias(Constant.SESSION_CLID),
                col(Constant.TRAFFIC_SOURCE_CHANNEL_GROUP).alias(Constant.SESSION_CHANNEL_GROUP),
                col(Constant.TRAFFIC_SOURCE_CATEGORY).alias(Constant.SESSION_SOURCE_CATEGORY),
                // add event name to process info
                mapConcatSafe(
                        col(Constant.PROCESS_INFO),
                        map(lit(Constant.EVENT_NAME), col(Constant.EVENT_NAME))
                ).alias(Constant.PROCESS_INFO)
        ).filter(col(Constant.SESSION_ID).isNotNull());

        Dataset<Row> sessionEventDataset = sessionDataset
                .filter(
                        col(Constant.EVENT_NAME)
                                .isin(EVENT_SESSION_START,
                                        EVENT_PAGE_VIEW,
                                        EVENT_USER_ENGAGEMENT,
                                        EVENT_SCREEN_VIEW,
                                        EVENT_APP_END)
                );

        sessionEventDataset.cache();
        log.info("sessionEventDataset count: {}", sessionEventDataset.count());

        Dataset<Row> sessionDatasetNonDirectAgg = getAggSessionDataset(
                sessionEventDataset.filter(
                        col(Constant.SESSION_SOURCE).isNotNull()
                        .and(col(Constant.SESSION_SOURCE).notEqual(DIRECT))
                )
        );
        Dataset<Row> sessionDatasetDirect = sessionEventDataset.join(sessionDatasetNonDirectAgg,
                new String[]{Constant.APP_ID, Constant.USER_PSEUDO_ID, Constant.SESSION_ID},
                "leftanti");


        Dataset<Row> sessionDatasetDirectAgg = getAggSessionDataset(sessionDatasetDirect);

        Dataset<Row> sessionDatasetAgg = sessionDatasetNonDirectAgg.union(sessionDatasetDirectAgg);

        log.info("sessionDatasetAgg count: {}", sessionDatasetAgg.count());
        return addProcessInfo(runMaxLengthTransformerForSession(sessionDatasetAgg));
    }

    private static Dataset<Row> getAggSessionDataset(final Dataset<Row> sessionDataset) {
        Dataset<Row> sessionDatasetAgg = sessionDataset
                .groupBy(Constant.APP_ID, Constant.USER_PSEUDO_ID, Constant.SESSION_ID)
                .agg(
                        min_by(
                                struct(
                                        col(Constant.EVENT_TIMESTAMP),
                                        col(Constant.USER_ID),
                                        col(Constant.SESSION_NUMBER),
                                        col(Constant.SESSION_START_TIME_MSEC),
                                        col(Constant.SESSION_SOURCE),
                                        col(Constant.SESSION_MEDIUM),
                                        col(Constant.SESSION_CAMPAIGN),
                                        col(Constant.SESSION_CONTENT),
                                        col(Constant.SESSION_TERM),
                                        col(Constant.SESSION_CAMPAIGN_ID),
                                        col(Constant.SESSION_CLID_PLATFORM),
                                        col(Constant.SESSION_CLID),
                                        col(Constant.SESSION_CHANNEL_GROUP),
                                        col(Constant.SESSION_SOURCE_CATEGORY),
                                        col(Constant.PROCESS_INFO)
                                ),
                                col(Constant.EVENT_TIMESTAMP)
                        ).alias("t")
                );
        return sessionDatasetAgg.select(col(Constant.APP_ID), col(Constant.USER_PSEUDO_ID), col(Constant.SESSION_ID), expr("t.*"));
    }


    public abstract Dataset<Row> getCleanedDataset(Dataset<Row> dataset);

    public abstract TransformerNameEnum getName();

    public abstract Dataset<Row> extractUser(Dataset<Row> eventDataset, Dataset<Row> convertedDataset) ;

    public abstract DatasetConverter getDatasetTransformer();

    public String getUserPropsTableName() {
        return ("etl_" + this.getName() + "_user_props").toLowerCase();
    }

    @Override
    public Dataset<Row> postTransform(final Dataset<Row> dataset) {
        SparkSession sparkSession = dataset.sparkSession();
        mergeIncrementalTables(sparkSession);
        return dataset.drop(Constant.UA, Constant.IP);
    }

    private void mergeIncrementalTables(final SparkSession sparkSession) {
        log.info("start merging incremental tables");
        int userKeepDays = ContextUtil.getUserKeepDays();

        List<DatasetUtil.TableInfo> l = new ArrayList<>();

        l.add(new DatasetUtil.TableInfo(
                getUserPropsTableName(), TABLE_VERSION_SUFFIX_V3, userKeepDays
        ));

        DatasetUtil.mergeIncrementalTables(sparkSession, l);
    }
}
