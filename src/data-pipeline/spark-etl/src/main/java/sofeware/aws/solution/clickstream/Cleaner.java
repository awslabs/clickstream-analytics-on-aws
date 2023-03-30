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

package sofeware.aws.solution.clickstream;

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

import static sofeware.aws.solution.clickstream.ETLRunner.DEBUG_LOCAL_PATH;
import static java.util.Objects.requireNonNull;
import static org.apache.spark.sql.functions.*;
import static org.apache.spark.sql.types.DataTypes.StringType;
import java.io.BufferedReader;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.List;
import java.util.Map;
import java.util.zip.GZIPInputStream;

@Slf4j
public class Cleaner {

    public Dataset<Row> clean(final Dataset<Row> dataset) {
        Dataset<Row> decodedDataset = decodeDataColumn(dataset);
        Dataset<Row> flattedDataset = flatDataColumn(decodedDataset);
        Dataset<Row> structuredDataset = processDataColumnSchema(flattedDataset);
        Dataset<Row> filteredDataSet = filter(structuredDataset);
        boolean debugLocal= Boolean.valueOf(System.getProperty("debug.local"));
        if (debugLocal) {
            decodedDataset.write().mode(SaveMode.Overwrite).json(DEBUG_LOCAL_PATH + "/clean-decodedDataset/");
            flattedDataset.write().mode(SaveMode.Overwrite).json(DEBUG_LOCAL_PATH + "/clean-flattedDataset/");
            structuredDataset.write().mode(SaveMode.Overwrite).json(DEBUG_LOCAL_PATH +  "/clean-structuredDataset/");
        }
        return filteredDataSet;
    }

    private static Dataset<Row> decodeDataColumn(final Dataset<Row> dataset) {
        UserDefinedFunction udfExtractData = udf(extractData(), StringType);
        return dataset.withColumn("data", udfExtractData.apply(col("data")));
    }

    @NotNull
    private static UDF1<String, String> extractData() {
        return data ->  {
            try {
                byte[] binGzipData = Base64.getDecoder().decode(data);
                return decompress(binGzipData);
            }catch (Exception e) {
                System.err.println(data);
                e.printStackTrace();
                return "";
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
            return "";
        }
    }

    private static Dataset<Row> flatDataColumn(final Dataset<Row> dataset) {
        ArrayType arrayType = new ArrayType(StringType, true);
        return dataset.withColumn("data", from_json(col("data"), arrayType).alias("data"))
                .withColumn("exploded_data", explode(col("data")))
                .drop("data").withColumnRenamed("exploded_data", "data");
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
        boolean debugLocal= Boolean.valueOf(System.getProperty("debug.local"));
        if (debugLocal) {
            rowDataset.write().mode(SaveMode.Overwrite)
                    .json(DEBUG_LOCAL_PATH + "/clean-schemaDataset/");
        }
        return processCorruptRecords(rowDataset);
    }

    private Dataset<Row> processCorruptRecords(final Dataset<Row> dataset) {
        Dataset<Row> corruptedDataset = dataset.filter(col("data").getItem("_corrupt_record").isNotNull());
        if (corruptedDataset.count() > 0) {
            String outputPath = System.getProperty("job.data.uri");
            corruptedDataset.select("data")
                    .write().mode(SaveMode.Append)
                    .json(outputPath + "/corrupted_records/");
        }
        return dataset.filter(col("data").getItem("_corrupt_record").isNull())
                .drop(col("data").getItem("_corrupt_record"));
    }

    private Dataset<Row> filter(final Dataset<Row> dataset) {
        Dataset<Row> freshDataset = filterByDataFreshness(dataset);
        Dataset<Row> filteredDataset= filterByAppIds(freshDataset);
        return filteredDataset;
    }

    private Dataset<Row> filterByDataFreshness(final Dataset<Row> dataset) {
        long dataFreshnessInHour = Long.parseLong(System.getProperty("data.freshness.hour", "72"));
        return dataset.filter((FilterFunction<Row>) row -> {
            long ingestTimestamp = row.getAs("ingest_time");
            long eventTimestamp = row.getStruct(row.fieldIndex("data")).getAs("timestamp");
            return ingestTimestamp - eventTimestamp <= dataFreshnessInHour * 60 * 60 * 1000L;
        });
    }

    private Dataset<Row> filterByAppIds(final Dataset<Row> dataset) {
        String appIds = System.getProperty("app.ids");

        Asserts.check(!Strings.isBlank(appIds), "valid appIds [app.ids] should not be blank");
        List<String> appIdList = Lists.newArrayList(appIds.split(","));
        return dataset.filter((FilterFunction<Row>) row -> {
            String appId = row.getStruct(row.fieldIndex("data")).getAs("app_id");
            return Strings.isNotBlank(appId) && appIdList.contains(appId);
        });
    }
}
