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
import org.apache.spark.sql.types.DataTypes;
import software.aws.solution.clickstream.TransformerInterfaceV3;
import software.aws.solution.clickstream.common.Constant;
import software.aws.solution.clickstream.model.ModelV2;
import software.aws.solution.clickstream.util.ContextUtil;
import software.aws.solution.clickstream.util.ETLMetric;
import software.aws.solution.clickstream.util.TableName;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.Arrays;
import java.util.EnumMap;
import java.util.Map;

import static org.apache.spark.sql.functions.col;
import static org.apache.spark.sql.functions.explode;
import static org.apache.spark.sql.functions.expr;
import static org.apache.spark.sql.functions.lit;
import static org.apache.spark.sql.functions.map;
import static org.apache.spark.sql.functions.map_concat;
import static org.apache.spark.sql.functions.when;
import static software.aws.solution.clickstream.TransformerV3.CLIENT_TIMESTAMP;
import static software.aws.solution.clickstream.common.BaseEventParser.UPLOAD_TIMESTAMP;
import static software.aws.solution.clickstream.model.ModelV2.toColumnArray;
import static software.aws.solution.clickstream.transformer.MaxLengthTransformerV2.runMaxLengthTransformerForEventV2;
import static software.aws.solution.clickstream.transformer.MaxLengthTransformerV2.runMaxLengthTransformerForItemV2;

@Slf4j
public abstract class BaseTransformerV3 implements TransformerInterfaceV3 {
    public static final String PROCESS_JOB_ID = "process_job_id";
    public static final String PROCESS_TIME = "process_time";
    public static final String TABLE_VERSION_SUFFIX_V3 = "_v3" ;

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
        Dataset<Row> eventDataset = convertedDataset.select(explode(expr("dataOut.events")).alias("event"))
                .select("event.*")
                .select(toColumnArray(ModelV2.getEventFields()));
        return addProcessInfo(runMaxLengthTransformerForEventV2(eventDataset));
    }

    public Dataset<Row> extractItem(final Dataset<Row> convertedDataset) {
        Dataset<Row> itemDataset = convertedDataset.select(explode(expr("dataOut.items")).alias("item"))
                .select("item.*")
                .select(toColumnArray(ModelV2.getItemFields()));
        return addProcessInfo(runMaxLengthTransformerForItemV2(itemDataset));
    }


    @Override
    public Map<TableName, Dataset<Row>> transform(final Dataset<Row> dataset) {
        Dataset<Row> cleanedDataset = getCleanedDataset(dataset);
        ContextUtil.cacheDataset(cleanedDataset);
        log.info(new ETLMetric(cleanedDataset, "after clean").toString());

        log.info(cleanedDataset.schema().prettyJson());

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
        Dataset<Row> userDataset = extractUser(eventDataset, convertedDataset);
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

    public abstract Dataset<Row> getCleanedDataset(Dataset<Row> dataset);

    public abstract String getName();
    public abstract Dataset<Row> extractSessionFromEvent(Dataset<Row> eventDataset) ;

    public abstract Dataset<Row> extractUser(Dataset<Row> eventDataset, Dataset<Row> convertedDataset) ;

    public abstract DatasetTransformer getDatasetTransformer();

    public String getUserPropsTableName() {
        return ("etl_" + this.getName() + "_user_props").toLowerCase();
    }
}
