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

import com.clearspring.analytics.util.*;
import org.apache.spark.sql.*;
import org.junit.jupiter.api.*;
import software.aws.solution.clickstream.model.*;
import software.aws.solution.clickstream.util.*;

import java.io.*;
import java.util.*;

import static java.util.Objects.requireNonNull;
import static org.apache.spark.sql.functions.col;
import static software.aws.solution.clickstream.util.ContextUtil.APP_IDS_PROP;
import static software.aws.solution.clickstream.util.ContextUtil.PROJECT_ID_PROP;
import static software.aws.solution.clickstream.util.ContextUtil.WAREHOUSE_DIR_PROP;

public class ETLRunnerForGtmV2Test extends ETLRunnerBaseTest {

    @Test
    public void test_GTM_server_runner_v2() throws IOException {
        // DOWNLOAD_FILE=1 ./gradlew clean test --info --tests software.aws.solution.clickstream.ETLRunnerForGtmV2Test.test_GTM_server_runner_v2
        System.setProperty(APP_IDS_PROP, "uba-app");
        System.setProperty(PROJECT_ID_PROP, "test_project_id_01");
        System.setProperty("force.merge", "true");
        System.setProperty(WAREHOUSE_DIR_PROP, "/tmp/warehouse/etl_runner/test_GTM_server_runner_v2");
        spark.sparkContext().addFile(requireNonNull(getClass().getResource("/GeoLite2-City.mmdb")).getPath());

        List<String> transformers = Lists.newArrayList();
        transformers.add("software.aws.solution.clickstream.gtm.GTMServerDataTransformerV2");
        transformers.add("software.aws.solution.clickstream.UAEnrichmentV2");
        transformers.add("software.aws.solution.clickstream.IPEnrichmentV2");

        ETLRunnerConfig config = getRunnerConfig(transformers, "GTM_server_transformer_v2");
        ETLRunner runner = new ETLRunner(spark, config);
        Dataset<Row> sourceDataset =
                spark.read().json(requireNonNull(getClass().getResource("/gtm-server/server-all-with-ss.json")).getPath());

        runner.writeResultEventDataset(runner.executeTransformers(sourceDataset, transformers));

        String outputPath = config.getOutputPath();
        System.out.println("outputPath:" + outputPath);

        Dataset<Row> eventDataset = spark.read().json(outputPath + TableName.EVENT_V2.getTableName());
        Dataset<Row> sessionDataset = spark.read().json(outputPath + TableName.SESSION.getTableName());
        Dataset<Row> itemDataset = spark.read().json(outputPath + TableName.ITEM_V2.getTableName());
        Dataset<Row> userDataset = spark.read().json(outputPath + TableName.USER_V2.getTableName());

        String expectedData1 = this.resourceFileAsString("/gtm-server/expected/test_GTM_server_runner_v2_event_v2.json");
        Assertions.assertEquals(expectedData1,
                replaceProcessInfo(eventDataset.filter(col("event_id").equalTo("43cc3b89d7dfccbc2c906eb125ea25db-0-1693281535-11")).first().prettyJson()),
                "test_GTM_server_runner_v2_event_v2");

        String expectedData2 = this.resourceFileAsString("/gtm-server/expected/test_GTM_server_runner_v2_session.json");
        Assertions.assertEquals(expectedData2,
                // "session_id" : "1704867229"
                replaceProcessInfo(sessionDataset.filter(col("session_id").equalTo("1704867229")).first().prettyJson()),
                "test_GTM_server_runner_v2_session");

        String expectedData3 = this.resourceFileAsString("/gtm-server/expected/test_GTM_server_runner_v2_item_v2.json");
        Assertions.assertEquals(expectedData3,
                replaceProcessInfo(itemDataset.filter(col("event_id").equalTo("25aefd4cb653fd0fcbac33e24fd3f0ba-0-1695261065-1")).first().prettyJson()),
                "test_GTM_server_runner_v2_item_v2");

        String expectedData4 = this.resourceFileAsString("/gtm-server/expected/test_GTM_server_runner_v2_user_v2.json");
        Assertions.assertEquals(expectedData4,
                replaceProcessInfo(userDataset.filter(col("user_pseudo_id").equalTo("/7Gsn6b5OMMiSyvc3j5JbSjBpN/hUnNDuzkSFtaMqhQ=.1695131921")).first().prettyJson()),
                "test_GTM_server_runner_v2_user_v2");

    }


    @Test
    public void test_GTM_server_runner_parquet_v2() throws IOException {
        // DOWNLOAD_FILE=1 ./gradlew clean test --info --tests software.aws.solution.clickstream.ETLRunnerForGtmV2Test.test_GTM_server_runner_parquet_v2
        System.setProperty(APP_IDS_PROP, "uba-app");
        System.setProperty(PROJECT_ID_PROP, "test_project_id_01");
        System.setProperty("force.merge", "true");
        System.setProperty(WAREHOUSE_DIR_PROP, "/tmp/warehouse/etl_runner/test_GTM_server_runner_parquet_v2");
        spark.sparkContext().addFile(requireNonNull(getClass().getResource("/GeoLite2-City.mmdb")).getPath());

        List<String> transformers = Lists.newArrayList();
        transformers.add("software.aws.solution.clickstream.gtm.GTMServerDataTransformerV2");
        transformers.add("software.aws.solution.clickstream.UAEnrichmentV2");
        transformers.add("software.aws.solution.clickstream.IPEnrichmentV2");

        ETLRunnerConfig config = getRunnerConfig(transformers, "test_GTM_server_runner_parquet_v2");
        ETLRunner runner = new ETLRunner(spark, config);
        Dataset<Row> sourceDataset =
                spark.read().json(requireNonNull(getClass().getResource("/gtm-server/server-app1.json")).getPath());

        runner.writeResultEventDataset(runner.executeTransformers(sourceDataset, transformers));

        String outputPath = config.getOutputPath();
        System.out.println("outputPath:" + outputPath);

        Dataset<Row> eventDataset = spark.read().parquet(outputPath + TableName.EVENT_V2.getTableName());
        Dataset<Row> sessionDataset = spark.read().parquet(outputPath + TableName.SESSION.getTableName());
        Dataset<Row> itemDataset = spark.read().parquet(outputPath + TableName.ITEM_V2.getTableName());
        Dataset<Row> userDataset = spark.read().parquet(outputPath + TableName.USER_V2.getTableName());

        String eventV2Schema = this.resourceFileAsString("/event_v2/expected/event_v2_parquet_schema.json");

        Assertions.assertEquals(eventV2Schema, eventDataset.schema().prettyJson());
        Assertions.assertTrue(eventDataset.filter(col(ModelV2.CREATED_TIME).isNotNull()).count() > 0);
        Assertions.assertTrue(sessionDataset.filter(col(ModelV2.CREATED_TIME).isNotNull()).count() > 0);
        Assertions.assertTrue(itemDataset.filter(col(ModelV2.CREATED_TIME).isNotNull()).count() > 0);
        Assertions.assertTrue(userDataset.filter(col(ModelV2.CREATED_TIME).isNotNull()).count() > 0);
    }
}
