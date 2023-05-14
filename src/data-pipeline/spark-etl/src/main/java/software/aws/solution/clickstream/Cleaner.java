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

import com.google.common.base.Charsets;
import com.google.common.collect.Lists;
import com.google.common.collect.Maps;
import com.google.common.io.Resources;
import lombok.extern.slf4j.Slf4j;
import org.apache.hadoop.shaded.org.apache.http.util.Asserts;
import org.apache.logging.log4j.util.Strings;
import org.apache.spark.api.java.function.FilterFunction;
import org.apache.spark.sql.Dataset;
import org.apache.spark.sql.Row;
import org.apache.spark.sql.SaveMode;
import org.apache.spark.sql.api.java.UDF1;
import org.apache.spark.sql.expressions.UserDefinedFunction;
import org.apache.spark.sql.types.ArrayType;
import org.apache.spark.sql.types.DataType;
import org.jetbrains.annotations.NotNull;

import java.io.BufferedReader;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.List;
import java.util.Map;
import java.util.zip.GZIPInputStream;

import static java.util.Objects.requireNonNull;
import static org.apache.spark.sql.functions.*;
import static org.apache.spark.sql.types.DataTypes.StringType;
import static software.aws.solution.clickstream.ETLRunner.DEBUG_LOCAL_PATH;

@Slf4j
public class Cleaner {

    private static Dataset<Row> decodeDataColumn(final Dataset<Row> dataset) {
        UserDefinedFunction udfExtractData = udf(extractData(), StringType);
        return dataset.withColumn("data", udfExtractData.apply(col("data")));
    }

    @NotNull
    private static UDF1<String, String> extractData() {
        return data -> {
            try {
                byte[] binGzipData = Base64.getDecoder().decode(data);
                return decompress(binGzipData);
            } catch (Exception e) {
                log.error("extractData error:" + e.getMessage());
                log.error(data);
                return "extractData error:" + e.getMessage();
            }
        };
    }

    private static String decompress(final byte[] str) {
        if (str == null) {
            return "";
        }
        GZIPInputStream gis;
        try {
            gis = new GZIPInputStream(new ByteArrayInputStream(str));
            BufferedReader bf = new BufferedReader(new InputStreamReader(gis, StandardCharsets.UTF_8));
            StringBuilder outStr = new StringBuilder();
            String line;
            while ((line = bf.readLine()) != null) {
                outStr.append(line);
            }
            return outStr.toString();
        } catch (IOException e) {
            log.error("decompress error:" + e.getMessage());
            return "decompress error: " + e.getMessage();
        }
    }

    private static Dataset<Row> flatDataColumn(final Dataset<Row> dataset) {
        ArrayType arrayType = new ArrayType(StringType, true);
        return dataset.withColumn("data", from_json(col("data"), arrayType).alias("data"))
                .withColumn("exploded_data", explode(col("data")))
                .drop("data").withColumnRenamed("exploded_data", "data");
    }

    public Dataset<Row> clean(final Dataset<Row> dataset) {
        log.info(new ETLMetric(dataset, "clean enter").toString());
        Dataset<Row> decodedDataset = decodeDataColumn(dataset);
        decodedDataset.cache();
        log.info(new ETLMetric(decodedDataset, "after decodeDataColumn").toString());
        Dataset<Row> flattedDataset = flatDataColumn(decodedDataset);
        log.info(new ETLMetric(flattedDataset, "flatted source").toString());
        Dataset<Row> structuredDataset = processDataColumnSchema(flattedDataset);
        log.info(new ETLMetric(structuredDataset, "after processDataColumnSchema").toString());
        Dataset<Row> filteredDataSet = filter(structuredDataset);
        log.info(new ETLMetric(filteredDataSet, "after filter").toString());
        boolean debugLocal = Boolean.valueOf(System.getProperty("debug.local"));
        if (debugLocal) {
            decodedDataset.write().mode(SaveMode.Overwrite).json(DEBUG_LOCAL_PATH + "/clean-0-decodedDataset/");
            flattedDataset.write().mode(SaveMode.Overwrite).json(DEBUG_LOCAL_PATH + "/clean-1-flattedDataset/");
            structuredDataset.write().mode(SaveMode.Overwrite).json(DEBUG_LOCAL_PATH + "/clean-2-structuredDataset/");
        }
        return filteredDataSet;
    }

    private Dataset<Row> processDataColumnSchema(final Dataset<Row> dataset) {
        String schemaString;
        try {
            schemaString = Resources.toString(requireNonNull(getClass().getResource("/schema.json")), Charsets.UTF_8);
        } catch (IOException e) {
            throw new RuntimeException(e);
        }
        DataType dataType = DataType.fromJson(schemaString);

        Map<String, String> options = Maps.newHashMap();
        options.put("mode", "PERMISSIVE");
        options.put("columnNameOfCorruptRecord", "_corrupt_record");
        Dataset<Row> rowDataset = dataset.withColumn("data", from_json(col("data"), dataType, options).alias("data"));
        log.info(new ETLMetric(rowDataset, "after load data schema").toString());
        boolean debugLocal = Boolean.parseBoolean(System.getProperty("debug.local"));
        if (debugLocal) {
            rowDataset.write().mode(SaveMode.Overwrite)
                    .json(DEBUG_LOCAL_PATH + "/clean-schemaDataset/");
        }
        Dataset<Row> normalDataset = processCorruptRecords(rowDataset);
        log.info(new ETLMetric(normalDataset, "after processCorruptRecords").toString());

        return normalDataset;
    }

    private Dataset<Row> processCorruptRecords(final Dataset<Row> dataset) {
        Dataset<Row> corruptedDataset = dataset.filter(col("data").getItem("_corrupt_record").isNotNull());
        long corruptedDatasetCount = corruptedDataset.count();
        if (corruptedDatasetCount > 0) {
            String outputPath = System.getProperty("job.data.uri");
            String corruptedOutPath = outputPath + "/corrupted_records/";
            log.info(new ETLMetric(corruptedDataset, "corrupted").toString());
            log.info("corruptedDataset corruptedOutPath:" + corruptedOutPath);
            corruptedDataset.select("data")
                    .write().mode(SaveMode.Append)
                    .json(corruptedOutPath);
            log.info("write corruptedDataset to " + outputPath);
        }
        Dataset<Row> normalDataset = dataset.filter(col("data").getItem("_corrupt_record").isNull())
                .drop(col("data").getItem("_corrupt_record"));
        return normalDataset;
    }

    private Dataset<Row> filter(final Dataset<Row> dataset) {
        Dataset<Row> freshDataset = filterByDataFreshness(dataset);
        log.info(new ETLMetric(freshDataset, "after filterByDataFreshness").toString());

        Dataset<Row> filteredDataset = filterByAppIds(freshDataset);
        log.info(new ETLMetric(filteredDataset, "after filterByAppIds").toString());
        return filteredDataset;
    }

    private Dataset<Row> filterByDataFreshness(final Dataset<Row> dataset) {
        long dataFreshnessInHour = Long.parseLong(System.getProperty("data.freshness.hour", "72"));
        log.info("dataFreshnessInHour:" + dataFreshnessInHour);
        Dataset<Row> filteredDataset = dataset.filter((FilterFunction<Row>) row -> {
            long ingestTimestamp = row.getAs("ingest_time");
            long eventTimestamp = row.getStruct(row.fieldIndex("data")).getAs("timestamp");
            return ingestTimestamp - eventTimestamp <= dataFreshnessInHour * 60 * 60 * 1000L;
        });
        return filteredDataset;
    }

    private Dataset<Row> filterByAppIds(final Dataset<Row> dataset) {
        String appIds = System.getProperty("app.ids");
        log.info("filterByAppIds[" + appIds + "]");
        Asserts.check(!Strings.isBlank(appIds), "valid appIds [app.ids] should not be blank");
        List<String> appIdList = Lists.newArrayList(appIds.split(","));
        Dataset<Row> filteredDataset = dataset.filter((FilterFunction<Row>) row -> {
            String appId = row.getStruct(row.fieldIndex("data")).getAs("app_id");
            return Strings.isNotBlank(appId) && appIdList.contains(appId);
        });
        return filteredDataset;
    }
}
