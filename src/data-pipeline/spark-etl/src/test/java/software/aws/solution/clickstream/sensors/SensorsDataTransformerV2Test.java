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

package software.aws.solution.clickstream.sensors;

import lombok.extern.slf4j.Slf4j;
import org.apache.spark.sql.Dataset;
import org.apache.spark.sql.Row;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import software.aws.solution.clickstream.BaseSparkTest;
import software.aws.solution.clickstream.util.TableName;

import java.io.IOException;
import java.util.Date;
import java.util.Map;

import static java.util.Objects.requireNonNull;
import static software.aws.solution.clickstream.util.ContextUtil.APP_IDS_PROP;
import static software.aws.solution.clickstream.util.ContextUtil.PROJECT_ID_PROP;
import static software.aws.solution.clickstream.util.ContextUtil.WAREHOUSE_DIR_PROP;

@Slf4j
public class SensorsDataTransformerV2Test extends BaseSparkTest {
    private SensorsDataTransformerV2 transformer;
    @BeforeEach
    void setupTransformer() {
        this.transformer = new SensorsDataTransformerV2();
        this.transformer.config(getTestTransformConfig("sensorTest"));
    }

    @Test
    void should_transform_event() throws IOException {
        // DOWNLOAD_FILE=0 ./gradlew clean test --info --tests software.aws.solution.clickstream.sensors.SensorsDataTransformerV2Test.should_transform_event
        System.setProperty(APP_IDS_PROP, "sensorTest");
        System.setProperty(PROJECT_ID_PROP, "test_project_id_01");
        String testWarehouseDir = "/tmp/warehouse/sensor_data/should_transform_event/" + new Date().getTime();
        System.setProperty(WAREHOUSE_DIR_PROP, testWarehouseDir);

        Dataset<Row> dataset =
                spark.read().json(requireNonNull(getClass().getResource("/sensordata/web_sdk_data.json")).getPath());

        log.info("dataset count: " + dataset.count());

        Assertions.assertEquals(3, dataset.count());

        Map<TableName, Dataset<Row>> transformedDatasets = transformer.transform(dataset);

        long eventCount = transformedDatasets.get(TableName.EVENT_V2).count();
        long userCount = transformedDatasets.get(TableName.USER_V2).count();
        long itemCount = transformedDatasets.get(TableName.ITEM_V2).count();
        long sessionCount = transformedDatasets.get(TableName.SESSION).count();

        log.info("eventCount: " + eventCount + " userCount: " + userCount + " itemCount: " + itemCount + " sessionCount: " + sessionCount);

        Assertions.assertEquals(15, eventCount);
        Assertions.assertEquals(2, userCount);
        Assertions.assertEquals(0, itemCount);
        Assertions.assertEquals(0, sessionCount);

        log.info( transformedDatasets.get(TableName.EVENT_V2).first().prettyJson());


    }

}
