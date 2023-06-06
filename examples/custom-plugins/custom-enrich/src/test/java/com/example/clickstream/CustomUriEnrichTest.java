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

package com.example.clickstream;

import org.apache.spark.sql.Dataset;
import org.apache.spark.sql.Row;
import org.apache.spark.sql.SaveMode;
import org.junit.jupiter.api.Test;
import scala.collection.mutable.ArraySeq;

import java.util.List;

import static java.util.Objects.requireNonNull;
import static org.apache.spark.sql.functions.lit;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;


public class CustomUriEnrichTest extends BaseSparkTest {
    CustomUriEnrich uriTransformer = new CustomUriEnrich();
    @Test
    public void should_transform(){
        String inputFile = getClass().getResource("/test.snappy.parquet").getPath();
        Dataset<Row> inputDataset = spark.read().parquet(inputFile);

        inputDataset = inputDataset.withColumn("uri", lit("customAppName=testApp007&appId=007"));
        inputDataset.printSchema();

        String eventParamSchema = "{\"name\":\"event_params\",\"type\":{\"type\":\"array\",\"elementType\":{\"type\":\"struct\",\"fields\":[" +
                "{\"name\":\"key\",\"type\":\"string\",\"nullable\":true,\"metadata\":{}}," +
                "{\"name\":\"value\",\"type\":{\"type\":\"struct\",\"fields\":[" +
                "{\"name\":\"double_value\",\"type\":\"double\",\"nullable\":true,\"metadata\":{}}," +
                "{\"name\":\"float_value\",\"type\":\"float\",\"nullable\":true,\"metadata\":{}}," +
                "{\"name\":\"int_value\",\"type\":\"long\",\"nullable\":true,\"metadata\":{}}," +
                "{\"name\":\"string_value\",\"type\":\"string\",\"nullable\":true,\"metadata\":{}}]}," +
                "\"nullable\":true,\"metadata\":{}}]},\"containsNull\":true},\"nullable\":true,\"metadata\":{}}";

        assertTrue(inputDataset.schema().json().indexOf(eventParamSchema) > 0);

        Dataset<Row> transformedDataset = uriTransformer.transform(inputDataset);
        transformedDataset.write().mode(SaveMode.Overwrite).json("/tmp/uriTransformer/");
        List<Row> rows = transformedDataset.takeAsList(2);
        ArraySeq<Row> eventParams = rows.get(0).getAs("event_params");

        String lastKey = eventParams.last().getAs("key").toString();
        String lastValue = ((Row)eventParams.last().getAs("value")).getAs("string_value");
        assertEquals("customAppName", lastKey);
        assertEquals("testApp007", lastValue);
        assertEquals(12, eventParams.size());

    }
}
