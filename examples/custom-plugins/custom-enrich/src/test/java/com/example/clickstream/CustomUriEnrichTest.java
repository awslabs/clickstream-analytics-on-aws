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
import static org.junit.jupiter.api.Assertions.assertEquals;


public class CustomUriEnrichTest extends BaseSparkTest {
    CustomUriEnrich uriTransformer = new CustomUriEnrich();
    @Test
    public void should_transform(){
        String inputJsonFile = requireNonNull(getClass().getResource("/transformed_data.json")).getPath();
        Dataset<Row> inputDataset = spark.read().json(inputJsonFile);
        Dataset<Row> transformedDataset = uriTransformer.transform(inputDataset);
        transformedDataset.write().mode(SaveMode.Overwrite).json("/tmp/uriTransformer/");
        List<Row> rows = transformedDataset.takeAsList(2);
        ArraySeq<Row> eventParams = rows.get(0).getAs("event_params");

        String lastKey = eventParams.last().getAs("key").toString();
        String lastValue = ((Row)eventParams.last().getAs("value")).getAs("string_value");
        assertEquals("customAppName", lastKey);
        assertEquals("name1", lastValue);
        assertEquals(20, eventParams.size());

    }
}
