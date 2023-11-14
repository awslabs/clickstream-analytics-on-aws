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

package com.example.clickstream.transformer.v2;

import com.example.clickstream.transformer.BaseSparkTest;
import lombok.extern.slf4j.Slf4j;
import org.apache.spark.sql.Dataset;
import org.apache.spark.sql.Row;
import org.junit.jupiter.api.Test;

import java.util.List;

import static java.util.Objects.requireNonNull;
import static org.junit.jupiter.api.Assertions.assertEquals;

@Slf4j
public class MyTransformerV2Test extends BaseSparkTest {
    private MyTransformerV2 transformerV2 = new MyTransformerV2();
    @Test
    void test_transform() {
        //  ./gradlew clean test --info --tests com.example.clickstream.transformer.v2.MyTransformerV2Test.test_transform
        System.setProperty("project.id", "test_project_id_02");
        System.setProperty("debug.local", "true");

        Dataset<Row> dataset =
                spark.read().json(requireNonNull(getClass().getResource("/data_with_item.json")).getPath());

        List<Dataset<Row>> datasetList = transformerV2.transform(dataset);
        Dataset<Row> eventDataset = datasetList.get(0);
        Dataset<Row> eventParameterDataset = datasetList.get(1);
        Dataset<Row>  itemDataset = datasetList.get(2);
        Dataset<Row> userDataset = datasetList.get(3);

        eventDataset = transformerV2.postTransform(eventDataset);

        log.info(String.format("dataset count: %s, %s, %s, %s\n", eventDataset.count(), eventParameterDataset.count(), itemDataset.count(), userDataset.count()));
        assertEquals(1, eventDataset.count());
        assertEquals(18, eventParameterDataset.count());
        assertEquals(3, itemDataset.count());
        assertEquals(1, userDataset.count());
    }
}
