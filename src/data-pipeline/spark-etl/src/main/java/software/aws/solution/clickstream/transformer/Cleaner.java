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

import com.google.common.collect.Lists;
import com.google.common.collect.Maps;
import com.google.common.io.Resources;
import lombok.extern.slf4j.Slf4j;
import org.apache.hadoop.shaded.org.apache.http.util.Asserts;
import org.apache.logging.log4j.util.Strings;
import org.apache.spark.api.java.function.FilterFunction;
import org.apache.spark.sql.Column;
import org.apache.spark.sql.Dataset;
import org.apache.spark.sql.Row;
import org.apache.spark.sql.SaveMode;
import org.apache.spark.sql.api.java.UDF1;
import org.apache.spark.sql.expressions.UserDefinedFunction;
import org.apache.spark.sql.types.ArrayType;
import org.apache.spark.sql.types.DataType;
import software.aws.solution.clickstream.common.exception.*;
import software.aws.solution.clickstream.util.*;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Base64;
import java.util.List;
import java.util.Map;

import static java.util.Objects.requireNonNull;
import static org.apache.spark.sql.functions.col;
import static org.apache.spark.sql.functions.udf;
import static org.apache.spark.sql.functions.from_json;
import static org.apache.spark.sql.functions.explode;
import static org.apache.spark.sql.functions.input_file_name;
import static org.apache.spark.sql.functions.lit;
import static org.apache.spark.sql.functions.not;

import static org.apache.spark.sql.types.DataTypes.StringType;
import static software.aws.solution.clickstream.TransformerV3.DATA_STR;
import static software.aws.solution.clickstream.TransformerV3.INPUT_FILE_NAME;
import static software.aws.solution.clickstream.util.ContextUtil.APP_IDS_PROP;
import static software.aws.solution.clickstream.util.ContextUtil.DATA_FRESHNESS_HOUR_PROP;
import static software.aws.solution.clickstream.util.ContextUtil.WAREHOUSE_DIR_PROP;
import static software.aws.solution.clickstream.util.ContextUtil.JOB_NAME_PROP;
import static software.aws.solution.clickstream.util.DatasetUtil.CORRUPT_RECORD;
import static software.aws.solution.clickstream.util.DatasetUtil.DATA;
import static software.aws.solution.clickstream.util.DatasetUtil.JOB_NAME_COL;
import static software.aws.solution.clickstream.ETLRunner.DEBUG_LOCAL_PATH;
import static software.aws.solution.clickstream.common.Util.decompress;


@Slf4j
public class Cleaner {
    private static Dataset<Row> decodeDataColumn(final Dataset<Row> dataset) {
        UserDefinedFunction udfExtractData = udf(extractData(), StringType);
        return dataset.withColumn("data", udfExtractData.apply(col("data")));
    }

    private static UDF1<String, String> extractData() {
        return data -> {
            if (data == null) {
                return "[\"error: data is null\"]";
            }
            // input data is not compress, is raw json array
            String dataTrim = data.trim();
            if (dataTrim.startsWith("[") && dataTrim.endsWith("]")) {
                return dataTrim;
            }
            try {
                byte[] binGzipData = Base64.getDecoder().decode(data);
                return decompress(binGzipData);
            } catch (Exception e) {
                log.error("extractData error:" + e.getMessage());
                return "[\"error: extractData error"
                        + ", message: " + e.getMessage()
                        + ", inputData: " + data
                        + "\"]";
            }
        };
    }


    private static Dataset<Row> flatDataColumn(final Dataset<Row> dataset) {
        ArrayType arrayType = new ArrayType(StringType, true);
        Dataset<Row> dataset1 = dataset.withColumn("data", from_json(col("data"), arrayType).alias("data"));
        Dataset<Row> explodedDataDateset = dataset1.withColumn("exploded_data", explode(col("data")))
                .drop("data").withColumnRenamed("exploded_data", "data");

        if (ContextUtil.isDebugLocal()) {
            dataset.write().mode(SaveMode.Overwrite).json(DEBUG_LOCAL_PATH + "/clean-1-0-flatDataColumn-input/");
            dataset1.write().mode(SaveMode.Overwrite).json(DEBUG_LOCAL_PATH + "/clean-1-1-jsonArray/");
            explodedDataDateset.write().mode(SaveMode.Overwrite).json(DEBUG_LOCAL_PATH + "/clean-1-2-explodedDataDateset/");
        }
        return explodedDataDateset;

    }

    public Dataset<Row> clean(final Dataset<Row> datasetInput, final String schemaFile) {
        log.info(new ETLMetric(datasetInput, "clean enter").toString());
        Dataset<Row> dataset = datasetInput.withColumn(INPUT_FILE_NAME, input_file_name());
        Dataset<Row> decodedDataset = decodeDataColumn(dataset);
        ContextUtil.cacheDataset(decodedDataset);

        log.info(new ETLMetric(decodedDataset, "after decodeDataColumn").toString());
        Dataset<Row> flattedDataset = flatDataColumn(decodedDataset);
        log.info(new ETLMetric(flattedDataset, "flatted source").toString());
        Dataset<Row> structuredDataset = processDataColumnSchema(flattedDataset, schemaFile);
        log.info(new ETLMetric(structuredDataset, "after processDataColumnSchema").toString());
        Dataset<Row> filteredDataSet = filter(structuredDataset);
        log.info(new ETLMetric(filteredDataSet, "after filter").toString());
        if (ContextUtil.isDebugLocal()) {
            decodedDataset.write().mode(SaveMode.Overwrite).json(DEBUG_LOCAL_PATH + "/clean-0-decodedDataset/");
            flattedDataset.write().mode(SaveMode.Overwrite).json(DEBUG_LOCAL_PATH + "/clean-1-flattedDataset/");
            structuredDataset.write().mode(SaveMode.Overwrite).json(DEBUG_LOCAL_PATH + "/clean-2-structuredDataset/");
        }
        return filteredDataSet;
    }

    private Dataset<Row> processDataColumnSchema(final Dataset<Row> dataset, final String schemaFile) {
        String schemaString;
        try {
            schemaString = Resources.toString(requireNonNull(getClass().getResource(schemaFile)), StandardCharsets.UTF_8);
        } catch (IOException e) {
            throw new ExtractDataException(e);
        }
        DataType dataType = DataType.fromJson(schemaString);

        Map<String, String> options = Maps.newHashMap();
        options.put("mode", "PERMISSIVE");
        options.put("columnNameOfCorruptRecord", CORRUPT_RECORD);
        Dataset<Row> rowDataset = dataset
                .withColumn(DATA_STR, col(DATA).cast(StringType))
                .withColumn(DATA, from_json(col(DATA), dataType, options));
        log.info(new ETLMetric(rowDataset, "after load data schema").toString());
        if (ContextUtil.isDebugLocal()) {
            rowDataset.write().mode(SaveMode.Overwrite)
                    .json(DEBUG_LOCAL_PATH + "/clean-schemaDataset/");
        }
        Dataset<Row> normalDataset = processCorruptRecords(rowDataset);
        log.info(new ETLMetric(normalDataset, "after processCorruptRecords").toString());

        return normalDataset;
    }

    private Dataset<Row> processCorruptRecords(final Dataset<Row> dataset) {
        Column corruptCondition = col("data").getItem(CORRUPT_RECORD).isNotNull()
                .or(col("data").getItem("event_id").isNull())
                .or(col("data").getItem("app_id").isNull())
                .or(col("data").getItem("timestamp").isNull());

        Dataset<Row> corruptedDataset = dataset.filter(corruptCondition);

        long corruptedDatasetCount = corruptedDataset.count();
        log.info(new ETLMetric(corruptedDatasetCount, "corrupted").toString());
        if (corruptedDatasetCount > 0) {
            String jobName = System.getProperty(JOB_NAME_PROP);
            corruptedDataset = corruptedDataset
                    .withColumn(JOB_NAME_COL, lit(jobName))
                    .withColumn("inputFileName", input_file_name());

            corruptedDataset = corruptedDataset.coalesce((int) (1 + corruptedDatasetCount/10000));

            String s3FilePath = System.getProperty(WAREHOUSE_DIR_PROP) + "/etl_corrupted_json_data";
            log.info("save corruptedDataset to " + s3FilePath);
            corruptedDataset.write().partitionBy(JOB_NAME_COL)
                        .option("compression", "gzip")
                        .mode(SaveMode.Append).json(s3FilePath);

            if (ContextUtil.isDebugLocal()) {
                corruptedDataset.write().mode(SaveMode.Overwrite)
                        .json(DEBUG_LOCAL_PATH + "/clean-corruptedDataset/");
            }
        }
        return dataset.filter(not(corruptCondition))
                .drop(col("data").getItem(CORRUPT_RECORD));
    }

    private Dataset<Row> filter(final Dataset<Row> dataset) {
        Dataset<Row> freshDataset = filterByDataFreshnessAndFuture(dataset);
        log.info(new ETLMetric(freshDataset, "after filterByDataFreshnessAndFuture").toString());

        Dataset<Row> filteredDataset = filterByAppIds(freshDataset);
        log.info(new ETLMetric(filteredDataset, "after filterByAppIds").toString());
        return filteredDataset;
    }

    private Dataset<Row> filterByDataFreshnessAndFuture(final Dataset<Row> dataset) {
        long dataFreshnessInHour = Long.parseLong(System.getProperty(DATA_FRESHNESS_HOUR_PROP, "72"));
        log.info("dataFreshnessInHour:" + dataFreshnessInHour);
        return dataset.filter((FilterFunction<Row>) row -> {
            long ingestTimestamp = row.getAs("ingest_time");
            long eventTimestamp = row.getStruct(row.fieldIndex("data")).getAs("timestamp");

            if (eventTimestamp > Instant.now().toEpochMilli()) {
                String eventId = row.getStruct(row.fieldIndex("data")).getAs("event_id");
                log.warn("eventTimestamp is in the future, eventTimestamp:" + eventTimestamp + ", eventId:" + eventId);
                return false;
            }

            return ingestTimestamp - eventTimestamp <= dataFreshnessInHour * 60 * 60 * 1000L;
        });
    }

    private Dataset<Row> filterByAppIds(final Dataset<Row> dataset) {
        String appIds = System.getProperty(APP_IDS_PROP);
        log.info("filterByAppIds[" + appIds + "]");
        Asserts.check(!Strings.isBlank(appIds), "valid appIds [app.ids] should not be blank");
        List<String> appIdList = Lists.newArrayList(appIds.split(","));
        return dataset.filter((FilterFunction<Row>) row -> {
            String appId = row.getStruct(row.fieldIndex("data")).getAs("app_id");
            return Strings.isNotBlank(appId) && appIdList.contains(appId);
        });
    }
}
