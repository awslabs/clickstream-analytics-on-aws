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

import com.clearspring.analytics.util.Lists;
import lombok.extern.slf4j.Slf4j;
import org.apache.spark.sql.Dataset;
import org.apache.spark.sql.Row;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;
import software.aws.solution.clickstream.util.ETLRunnerConfig;
import software.aws.solution.clickstream.util.TableName;

import java.io.IOException;
import java.util.List;

import static java.util.Objects.requireNonNull;
import static software.aws.solution.clickstream.util.ContextUtil.APP_IDS_PROP;
import static software.aws.solution.clickstream.util.ContextUtil.FILTER_BOT_BY_UA_PROP;
import static software.aws.solution.clickstream.util.ContextUtil.PROJECT_ID_PROP;
import static software.aws.solution.clickstream.util.ContextUtil.WAREHOUSE_DIR_PROP;

@Slf4j
public class ETLRunnerForSensorsDataTest extends ETLRunnerBaseTest {

    @Test
    public void test_sensors_data_runner() throws IOException {
        // DOWNLOAD_FILE=1 ./gradlew clean test --info --tests software.aws.solution.clickstream.ETLRunnerForSensorsDataTest.test_sensors_data_runner
        System.setProperty(APP_IDS_PROP, "uba-app");
        System.setProperty(PROJECT_ID_PROP, "test_project_id_01");
        System.setProperty(FILTER_BOT_BY_UA_PROP, "true");
        System.setProperty("force.merge", "true");
        System.setProperty(WAREHOUSE_DIR_PROP, "/tmp/warehouse/etl_runner/test_sensors_data_runner_" + System.currentTimeMillis());
        spark.sparkContext().addFile(requireNonNull(getClass().getResource("/GeoLite2-City.mmdb")).getPath());

        List<String> transformers = Lists.newArrayList();
        transformers.add("software.aws.solution.clickstream.sensors.SensorsDataTransformerV2");
        transformers.add("software.aws.solution.clickstream.UAEnrichmentV2");
        transformers.add("software.aws.solution.clickstream.IPEnrichmentV2");

        ETLRunnerConfig config = getRunnerConfig(transformers, "test_sensors_data_runner");
        ETLRunner runner = new ETLRunner(spark, config);
        Dataset<Row> sourceDataset =
                spark.read().json(requireNonNull(getClass().getResource("/sensordata/sensors-web-ua.json")).getPath());

        runner.writeResultEventDataset(runner.executeTransformers(sourceDataset, transformers));

        String outputPath = config.getOutputPath();
        System.out.println("outputPath:" + outputPath);

        Dataset<Row> eventDataset = spark.read().json(outputPath + TableName.EVENT_V2.getTableName());

        String expectedJson = this.resourceFileAsString("/sensordata/expected/test_sensors_data_runner.json");

        log.info("eventDataset: " + eventDataset.first().prettyJson());
        Assertions.assertEquals(expectedJson,
                replaceProcessInfo(eventDataset.first().prettyJson()),
                "test_sensors_data_runner");

        Assertions.assertEquals(4, eventDataset.count());

    }
}
