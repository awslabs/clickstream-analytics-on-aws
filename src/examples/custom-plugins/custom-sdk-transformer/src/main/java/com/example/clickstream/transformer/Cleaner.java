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


package com.example.clickstream.transformer;


import com.google.common.base.Charsets;
import com.google.common.collect.Maps;
import com.google.common.io.Resources;
import lombok.extern.slf4j.Slf4j;
import org.apache.spark.sql.Dataset;
import org.apache.spark.sql.Row;
import org.apache.spark.sql.SaveMode;
import org.apache.spark.sql.types.ArrayType;
import org.apache.spark.sql.types.DataType;

import java.io.IOException;
import java.util.Map;

import static java.util.Objects.requireNonNull;
import static org.apache.spark.sql.functions.*;
import static org.apache.spark.sql.types.DataTypes.StringType;
import static com.example.clickstream.transformer.Constants.DEBUG_LOCAL_PATH;

@Slf4j
public class Cleaner {


    private static Dataset<Row> flatDataColumn(final Dataset<Row> dataset) {
        ArrayType arrayType = new ArrayType(StringType, true);
        return dataset.withColumn("data", from_json(col("data"), arrayType).alias("data"))
                .withColumn("exploded_data", explode(col("data")))
                .drop("data").withColumnRenamed("exploded_data", "data");
    }

    public Dataset<Row> clean(final Dataset<Row> dataset) {
        log.info(new ETLMetric(dataset, "clean enter").toString());
        dataset.cache();
        Dataset<Row> flattedDataset = flatDataColumn(dataset);

        log.info(new ETLMetric(flattedDataset, "flatted source").toString());
        Dataset<Row> structuredDataset = processDataColumnSchema(flattedDataset);
        log.info(new ETLMetric(structuredDataset, "after processDataColumnSchema").toString());
        boolean debugLocal = Boolean.valueOf(System.getProperty("debug.local"));
        if (debugLocal) {
            dataset.write().mode(SaveMode.Overwrite).json(DEBUG_LOCAL_PATH + "/clean-0-inputDataset/");
            flattedDataset.write().mode(SaveMode.Overwrite).json(DEBUG_LOCAL_PATH + "/clean-1-flattedDataset/");
            structuredDataset.write().mode(SaveMode.Overwrite).json(DEBUG_LOCAL_PATH + "/clean-2-structuredDataset/");
        }
        return structuredDataset;
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

        Dataset<Row> normalDataset = rowDataset.filter(col("data").getItem("_corrupt_record").isNull())
                .drop(col("data").getItem("_corrupt_record"));

        return normalDataset;
    }


}
