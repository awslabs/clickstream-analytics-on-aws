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

package software.aws.solution.clickstream;

import lombok.extern.slf4j.Slf4j;
import org.apache.spark.sql.Dataset;
import org.apache.spark.sql.Row;
import org.apache.spark.sql.SaveMode;
import org.apache.spark.sql.api.java.UDF2;
import org.apache.spark.sql.catalyst.expressions.GenericRow;
import org.apache.spark.sql.expressions.UserDefinedFunction;
import org.apache.spark.sql.types.DataTypes;
import org.apache.spark.sql.types.StructField;

import java.nio.charset.StandardCharsets;

import java.util.Arrays;
import java.util.List;

import static org.apache.spark.sql.functions.col;
import static org.apache.spark.sql.functions.expr;
import static org.apache.spark.sql.functions.lit;
import static org.apache.spark.sql.functions.udf;
import static software.aws.solution.clickstream.ContextUtil.WAREHOUSE_DIR_PROP;
import static software.aws.solution.clickstream.ContextUtil.getJobName;
import static software.aws.solution.clickstream.DatasetUtil.APP_ID;
import static software.aws.solution.clickstream.DatasetUtil.APP_INFO;
import static software.aws.solution.clickstream.DatasetUtil.CHANNEL;
import static software.aws.solution.clickstream.DatasetUtil.EVENT_DATE;
import static software.aws.solution.clickstream.DatasetUtil.EVENT_ID;
import static software.aws.solution.clickstream.DatasetUtil.EVENT_NAME;
import static software.aws.solution.clickstream.DatasetUtil.EVENT_PARAM_KEY;
import static software.aws.solution.clickstream.DatasetUtil.EVENT_PARAM_STRING_VALUE;
import static software.aws.solution.clickstream.DatasetUtil.EVENT_TIMESTAMP;
import static software.aws.solution.clickstream.DatasetUtil.FIRST_REFERER;
import static software.aws.solution.clickstream.DatasetUtil.FIRST_TRAFFIC_MEDIUM;
import static software.aws.solution.clickstream.DatasetUtil.FIRST_TRAFFIC_SOURCE;
import static software.aws.solution.clickstream.DatasetUtil.FIRST_TRAFFIC_SOURCE_TYPE;
import static software.aws.solution.clickstream.DatasetUtil.ID;
import static software.aws.solution.clickstream.DatasetUtil.JOB_NAME_COL;
import static software.aws.solution.clickstream.DatasetUtil.MAX_PARAM_STRING_VALUE_LEN;
import static software.aws.solution.clickstream.DatasetUtil.MAX_STRING_VALUE_LEN;
import static software.aws.solution.clickstream.DatasetUtil.PLATFORM;
import static software.aws.solution.clickstream.DatasetUtil.PROPERTIES;
import static software.aws.solution.clickstream.DatasetUtil.TRUNCATED;
import static software.aws.solution.clickstream.DatasetUtil.USER_ID;
import static software.aws.solution.clickstream.DatasetUtil.USER_PSEUDO_ID;

@Slf4j
public class MaxLengthTransformer {

    private static UDF2<String, Integer, Row> truncateWithMaxByteLength() {
        return (value, maxByteLen) -> {
            if (value != null && value.getBytes(StandardCharsets.UTF_8).length > maxByteLen) {
                return new GenericRow(new Object[]{checkStringValueLength(value, maxByteLen), Boolean.TRUE});
            } else {
                return new GenericRow(new Object[]{value, Boolean.FALSE});
            }
        };
    }

    public static String checkStringValueLength(final String sValue, final int len) {
        if (sValue == null) {
            return null;
        }
        String reString = sValue;
        if (reString.length() > len) {
            reString = reString.substring(0, len);
        }
        while (reString.getBytes(StandardCharsets.UTF_8).length > len) {
            reString = reString.substring(0, reString.length() - 1);
        }
        return reString;
    }

    public Dataset<Row> transform(final Dataset<Row> dataset, final List<String> colNameList, final int maxLength) {

        UserDefinedFunction truncateWithMaxByteLengthUdf = udf(truncateWithMaxByteLength(), DataTypes.createStructType(
                        new StructField[]{
                                DataTypes.createStructField("value", DataTypes.StringType, true),
                                DataTypes.createStructField(TRUNCATED, DataTypes.BooleanType, true),
                        }
                ));

        Dataset<Row> datasetOut = dataset;
        for (String colName : colNameList) {
            datasetOut = datasetOut.withColumn(colName + "_new", truncateWithMaxByteLengthUdf.apply(col(colName), lit(maxLength)))
                    .withColumn(colName + TRUNCATED, expr(colName + "_new." + TRUNCATED))
                    .withColumn(colName, expr(colName + "_new.value"))
                    .drop(colName + "_new");
        }
        return datasetOut;
    }


    private static void saveTruncatedDataset(final Dataset<Row> truncatedDataset, final String displayInfo, final String path) {
        long itemTruncatedDatasetCount = truncatedDataset.count();
        if (itemTruncatedDatasetCount > 0) {
            log.info(new ETLMetric(itemTruncatedDatasetCount, displayInfo).toString());
            String s3FilePath = System.getProperty(WAREHOUSE_DIR_PROP) + path;
            truncatedDataset
                    .withColumn(JOB_NAME_COL, lit(getJobName()))
                    .coalesce(1)
                    .write()
                    .partitionBy(JOB_NAME_COL)
                    .option("compression", "gzip")
                    .mode(SaveMode.Append)
                    .json(s3FilePath);
        }
    }

    public static Dataset<Row> runMaxLengthTransformerForItem(final Dataset<Row> newItemsDataset1) {
        Dataset<Row> newItemsDataset2 = new MaxLengthTransformer().transform(newItemsDataset1, Arrays.asList(ID), MAX_STRING_VALUE_LEN);
        Dataset<Row> newItemsDataset3 = newItemsDataset2.select(
                APP_ID,
                EVENT_DATE,
                EVENT_TIMESTAMP,
                ID,
                PROPERTIES
        );

        Dataset<Row> itemTruncatedDataset = newItemsDataset2.filter(
                        col(ID + TRUNCATED).equalTo(true)
                )
                .select(col(APP_ID), col(EVENT_TIMESTAMP), col(ID), col(ID + TRUNCATED));

        saveTruncatedDataset(itemTruncatedDataset,
                "item truncatedDataset",
                "/etl_truncated_item_json_data");
        return newItemsDataset3;
    }

    public static Dataset<Row> runMaxLengthTransformerForUser(final Dataset<Row> joinedPossibleUpdateUserDatasetRt1) {
        Dataset<Row> joinedPossibleUpdateUserDatasetRt2 = new MaxLengthTransformer().transform(
                joinedPossibleUpdateUserDatasetRt1,
                Arrays.asList(USER_PSEUDO_ID, USER_ID, FIRST_REFERER,
                        FIRST_TRAFFIC_SOURCE_TYPE, FIRST_TRAFFIC_MEDIUM, FIRST_TRAFFIC_SOURCE,
                        CHANNEL),
                MAX_STRING_VALUE_LEN);


        Dataset<Row> userTruncatedDataset = joinedPossibleUpdateUserDatasetRt2.filter(
                        col(USER_PSEUDO_ID + TRUNCATED).equalTo(true)
                                .or(col(USER_ID + TRUNCATED).equalTo(true))
                                .or(col(FIRST_REFERER + TRUNCATED).equalTo(true))
                                .or(col(FIRST_TRAFFIC_SOURCE_TYPE + TRUNCATED).equalTo(true))
                                .or(col(FIRST_TRAFFIC_MEDIUM + TRUNCATED).equalTo(true))
                                .or(col(FIRST_TRAFFIC_SOURCE + TRUNCATED).equalTo(true))
                                .or(col(CHANNEL + TRUNCATED).equalTo(true))
                )
                .select(col(APP_ID), col(EVENT_TIMESTAMP),
                        col(USER_PSEUDO_ID), col(USER_PSEUDO_ID + TRUNCATED),
                        col(USER_ID), col(USER_ID + TRUNCATED),
                        col(FIRST_REFERER), col(FIRST_REFERER + TRUNCATED),
                        col(FIRST_TRAFFIC_SOURCE_TYPE), col(FIRST_TRAFFIC_SOURCE_TYPE + TRUNCATED),
                        col(FIRST_TRAFFIC_MEDIUM), col(FIRST_TRAFFIC_MEDIUM + TRUNCATED),
                        col(FIRST_TRAFFIC_SOURCE), col(FIRST_TRAFFIC_SOURCE + TRUNCATED),
                        col(CHANNEL), col(CHANNEL + TRUNCATED)
                );

        saveTruncatedDataset(userTruncatedDataset,
                "user truncatedDataset",
                "/etl_truncated_user_json_data");
        return joinedPossibleUpdateUserDatasetRt2;
    }



    public static Dataset<Row> runMaxLengthTransformerForEventParameter(final Dataset<Row> dataset3) {
        MaxLengthTransformer maxLengthTransformer = new MaxLengthTransformer();
        Dataset<Row> dataset4 = maxLengthTransformer.transform(dataset3, Arrays.asList(EVENT_ID, EVENT_NAME, EVENT_PARAM_KEY), MAX_STRING_VALUE_LEN);
        Dataset<Row> dataset5 = maxLengthTransformer.transform(dataset4, Arrays.asList(EVENT_PARAM_STRING_VALUE), MAX_PARAM_STRING_VALUE_LEN);

        Dataset<Row> eventPrameterTruncatedDataset = dataset5.filter(
                        col(EVENT_PARAM_KEY + TRUNCATED).equalTo(true)
                                .or(col(EVENT_PARAM_STRING_VALUE + TRUNCATED).equalTo(true))
                )
                .select(col(APP_ID), col(EVENT_TIMESTAMP),
                        col(EVENT_ID), col(EVENT_ID + TRUNCATED),
                        col(EVENT_NAME), col(EVENT_NAME + TRUNCATED),
                        col(EVENT_PARAM_KEY), col(EVENT_PARAM_KEY + TRUNCATED),
                        col(EVENT_PARAM_STRING_VALUE),  col(EVENT_PARAM_STRING_VALUE + TRUNCATED)
                );

        saveTruncatedDataset(eventPrameterTruncatedDataset,
                "event_parameter truncatedDataset",
                "/etl_truncated_event_parameter_json_data");
        return dataset5;
    }


    public static Dataset<Row> runMaxLengthTransformerForEvent(final Dataset<Row> datasetFinal2) {
        MaxLengthTransformer maxLengthTransformer = new MaxLengthTransformer();
        Dataset<Row> datasetFinal3 = maxLengthTransformer.transform(datasetFinal2,
                Arrays.asList(EVENT_ID, EVENT_NAME, USER_PSEUDO_ID, USER_ID, PLATFORM),
                MAX_STRING_VALUE_LEN);

        Dataset<Row> eventTruncatedDataset = datasetFinal3.filter(
                        col(EVENT_ID + TRUNCATED).equalTo(true)
                                .or(col(EVENT_NAME + TRUNCATED).equalTo(true))
                                .or(col(USER_PSEUDO_ID + TRUNCATED).equalTo(true))
                                .or(col(USER_ID + TRUNCATED).equalTo(true))
                                .or(col(PLATFORM + TRUNCATED).equalTo(true))
                )
                .select(expr(APP_INFO + "." + APP_ID).alias(APP_ID), col(EVENT_TIMESTAMP),
                        col(EVENT_ID), col(EVENT_ID + TRUNCATED),
                        col(EVENT_NAME), col(EVENT_NAME + TRUNCATED),
                        col(USER_PSEUDO_ID), col(USER_PSEUDO_ID + TRUNCATED),
                        col(USER_ID), col(USER_ID + TRUNCATED),
                        col(PLATFORM), col(PLATFORM + TRUNCATED)
                );

        saveTruncatedDataset(eventTruncatedDataset,
                "event truncatedDataset",
                "/etl_truncated_event_json_data");
        return datasetFinal3;
    }

}
