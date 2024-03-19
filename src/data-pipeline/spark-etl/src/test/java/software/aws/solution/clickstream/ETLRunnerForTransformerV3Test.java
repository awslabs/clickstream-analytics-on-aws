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
import java.nio.file.*;
import java.util.*;

import static java.util.Objects.*;
import static org.apache.spark.sql.functions.col;
import static org.junit.jupiter.api.Assertions.*;
import static software.aws.solution.clickstream.util.ContextUtil.*;
import static software.aws.solution.clickstream.util.DatasetUtil.*;
import static software.aws.solution.clickstream.TransformerV3.ETL_USER_V2_PROPS;

class ETLRunnerForTransformerV3Test extends ETLRunnerBaseTest {

    @Test
    public void should_executeTransformers_with_TransformerV3_1() throws IOException {
        // DOWNLOAD_FILE=1 ./gradlew clean test --info --tests software.aws.solution.clickstream.ETLRunnerForTransformerV3Test.should_executeTransformers_with_TransformerV3_1
        System.setProperty(APP_IDS_PROP, "uba-app");
        System.setProperty(PROJECT_ID_PROP, "test_project_id_01");
        System.setProperty(DEBUG_LOCAL_PROP, "true");
        setWarehouseDir("should_executeTransformers_with_TransformerV3_1");

        spark.sparkContext().addFile(requireNonNull(getClass().getResource("/GeoLite2-City.mmdb")).getPath());

        List<String> transformers = Lists.newArrayList();
        transformers.add("software.aws.solution.clickstream.TransformerV3");
        transformers.add("software.aws.solution.clickstream.UAEnrichmentV2");
        transformers.add("software.aws.solution.clickstream.IPEnrichmentV2");

        ETLRunnerConfig config = getRunnerConfig(transformers, "TransformerV3_1");
        String outputPath = config.getOutputPath();

        ETLRunner runner = new ETLRunner(spark, config);
        Dataset<Row> sourceDataset =
                spark.read().json(requireNonNull(getClass().getResource("/original_data_with_user_profile_set2.json")).getPath());
        assertEquals(sourceDataset.count(), 6);

        Dataset<Row> dataset = runner.executeTransformers(sourceDataset, transformers);
        dataset.printSchema();
        System.out.println(dataset.first().prettyJson());

        String partitionPart = "partition_app=uba-app/partition_year=2023/partition_month=04/partition_day=24";
        String expectedJson = this.resourceFileAsString("/event_v2/expected/etl_runner_v3_event1.json");

        Assertions.assertEquals(expectedJson, replaceDynData(dataset.first().prettyJson()));
        System.out.println("outputPath:" + outputPath);
        Path p1 = Paths.get(outputPath, "user_v2", partitionPart);
        Assertions.assertTrue(p1.toFile().isDirectory());
        Path p3 = Paths.get(outputPath, "item_v2", partitionPart);
        Assertions.assertTrue(p3.toFile().isDirectory());
        Path p4 = Paths.get(outputPath, "session", partitionPart);
        Assertions.assertTrue(p4.toFile().isDirectory());
        try {
            spark.read().json(outputPath + TableName.EVENT_V2.getTableName());
        } catch (Exception e) {
            Assertions.assertTrue(e.getMessage().contains("Path does not exist"));
        }
    }


    @Test
    public void should_executeTransformers_with_TransformerV3_parquet() throws IOException {
        // DOWNLOAD_FILE=1 ./gradlew clean test --info --tests software.aws.solution.clickstream.ETLRunnerForTransformerV3Test.should_executeTransformers_with_TransformerV3_parquet
        System.setProperty(APP_IDS_PROP, "app1");
        System.setProperty(PROJECT_ID_PROP, "test_project_id_01");
        System.setProperty(DEBUG_LOCAL_PROP, "true");
        setWarehouseDir("should_executeTransformers_with_TransformerV3_parquet");

        spark.sparkContext().addFile(requireNonNull(getClass().getResource("/GeoLite2-City.mmdb")).getPath());

        List<String> transformers = Lists.newArrayList();
        transformers.add("software.aws.solution.clickstream.TransformerV3");
        transformers.add("software.aws.solution.clickstream.UAEnrichmentV2");
        transformers.add("software.aws.solution.clickstream.IPEnrichmentV2");

        ETLRunnerConfig config = getRunnerConfig(transformers, "should_executeTransformers_with_TransformerV3_parquet");

        ETLRunner runner = new ETLRunner(spark, config);
        Dataset<Row> sourceDataset =
                spark.read().json(requireNonNull(getClass().getResource("/original_data_with_app1.json")).getPath());
        assertEquals(sourceDataset.count(), 6);

        Dataset<Row> dataset = runner.executeTransformers(sourceDataset, transformers);
        runner.writeResultEventDataset(dataset);

        String outputPath = config.getOutputPath();
        System.out.println("outputPath:" + outputPath);

        Dataset<Row> eventDataset = spark.read().parquet(outputPath + TableName.EVENT_V2.getTableName());
        Dataset<Row> sessionDataset = spark.read().parquet(outputPath + TableName.SESSION.getTableName());
        Dataset<Row> itemDataset = spark.read().parquet(outputPath + TableName.ITEM_V2.getTableName());
        Dataset<Row> userDataset = spark.read().parquet(outputPath + TableName.USER_V2.getTableName());

        String eventV2Schema = this.resourceFileAsString("/event_v2/expected/event_v2_parquet_schema.json");
        Assertions.assertEquals(eventV2Schema, eventDataset.schema().prettyJson(), "event_v2_parquet_schema");

        String userV2Schema = this.resourceFileAsString("/event_v2/expected/user_v2_parquet_schema.json");
        Assertions.assertEquals(userV2Schema, userDataset.schema().prettyJson(), "user_v2_parquet_schema");

        String itemV2Schema = this.resourceFileAsString("/event_v2/expected/item_v2_parquet_schema.json");
        Assertions.assertEquals(itemV2Schema, itemDataset.schema().prettyJson(), "item_v2_parquet_schema");

        String sessionSchema = this.resourceFileAsString("/event_v2/expected/session_parquet_schema.json");
        Assertions.assertEquals(sessionSchema, sessionDataset.schema().prettyJson(), "session_parquet_schema");

        Assertions.assertTrue(eventDataset.filter(col(ModelV2.CREATED_TIME).isNotNull()).count() > 0);
        Assertions.assertTrue(sessionDataset.filter(col(ModelV2.CREATED_TIME).isNotNull()).count() > 0);
        Assertions.assertTrue(itemDataset.filter(col(ModelV2.CREATED_TIME).isNotNull()).count() > 0);
        Assertions.assertTrue(userDataset.filter(col(ModelV2.CREATED_TIME).isNotNull()).count() > 0);

    }
    @Test
    public void should_executeTransformers_with_TransformerV3_2() throws IOException {
        // DOWNLOAD_FILE=1 ./gradlew clean test --info --tests software.aws.solution.clickstream.ETLRunnerForTransformerV3Test.should_executeTransformers_with_TransformerV3_2
        System.setProperty(APP_IDS_PROP, "uba-app");
        System.setProperty(PROJECT_ID_PROP, "test_project_id_01");
        System.setProperty("force.merge", "true");
        setWarehouseDir("should_executeTransformers_with_TransformerV3_2");

        spark.sparkContext().addFile(requireNonNull(getClass().getResource("/GeoLite2-City.mmdb")).getPath());
        List<String> transformers = Lists.newArrayList();
        transformers.add("software.aws.solution.clickstream.TransformerV3");
        transformers.add("software.aws.solution.clickstream.UAEnrichmentV2");
        transformers.add("software.aws.solution.clickstream.IPEnrichmentV2");

        ETLRunnerConfig config = getRunnerConfig(transformers, "TransformerV3_2");
        ETLRunner runner = new ETLRunner(spark, config);

        Dataset<Row> sourceDataset =
                spark.read().json(requireNonNull(getClass().getResource("/original_data_with_user_profile_set2.json")).getPath());
        assertEquals(6, sourceDataset.count());
        runner.executeTransformers(sourceDataset, transformers);

        String dataDir = ContextUtil.getWarehouseDir();

        String tableNameIncr = dataDir + "/" + ETL_USER_V2_PROPS + INCREMENTAL_SUFFIX + TABLE_VERSION_SUFFIX_V1;
        String tableNameFull = dataDir + "/" + ETL_USER_V2_PROPS + FULL_SUFFIX + TABLE_VERSION_SUFFIX_V1;

        Dataset<Row> dIncr = spark.read().parquet(tableNameIncr);
        long cIncr = dIncr.count();
        Assertions.assertTrue(cIncr >= 1);

        Dataset<Row> dFull = spark.read().parquet(tableNameFull);
        long cFull = dFull.count();
        Assertions.assertTrue(cFull >= 1);

        String tableSchema = this.resourceFileAsString("/event_v2/expected/etl_user_v2_props_incremental_v1_schema.json");
        Assertions.assertEquals(tableSchema, dIncr.schema().prettyJson(), "etl_user_v2_props_incremental_v1_schema");

        System.setProperty("force.merge", "false");
    }



    @Test
    public void should_executeTransformers_with_TransformerV3_with_empty_user_and_item() throws IOException {
        // DOWNLOAD_FILE=0 ./gradlew clean test --info --tests software.aws.solution.clickstream.ETLRunnerForTransformerV3Test.should_executeTransformers_with_TransformerV3_with_empty_user_and_item
        System.setProperty(APP_IDS_PROP, "uba-app");
        System.setProperty(PROJECT_ID_PROP, "test_project_id_01");
        System.setProperty("force.merge", "true");
        setWarehouseDir("should_executeTransformers_with_TransformerV3_with_empty_user_and_item");

        List<String> transformers = Lists.newArrayList();
        transformers.add("software.aws.solution.clickstream.TransformerV3");

        ETLRunnerConfig config = getRunnerConfig(transformers, "should_executeTransformers_with_TransformerV3_with_empty_user_and_item");
        ETLRunner runner = new ETLRunner(spark, config);
        Dataset<Row> sourceDataset =
                spark.read().json(requireNonNull(getClass().getResource("/original_data_with_empty_user.json")).getPath());
        assertEquals(sourceDataset.count(), 1);
        runner.writeResultEventDataset(runner.executeTransformers(sourceDataset, transformers));
        String outputPath = config.getOutputPath();

        System.out.println("outputPath:" + outputPath);

        try {
            spark.read().json(outputPath + TableName.USER_V2.getTableName());
        } catch (Exception e) {
            Assertions.assertTrue(e.getMessage().contains("Path does not exist"));
        }
        try {
            spark.read().json(outputPath + TableName.ITEM_V2.getTableName());
        } catch (Exception e) {
            Assertions.assertTrue(e.getMessage().contains("Path does not exist"));
        }
        try {
            spark.read().json(outputPath + TableName.SESSION.getTableName());
        } catch (Exception e) {
            Assertions.assertTrue(e.getMessage().contains("Path does not exist"));
        }

    }

}