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
import org.apache.spark.sql.Dataset;
import org.apache.spark.sql.Row;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Date;
import java.util.List;

import static com.google.common.collect.Lists.newArrayList;
import static java.util.Objects.requireNonNull;
import static org.apache.spark.sql.functions.col;
import static org.apache.spark.sql.functions.expr;
import static org.junit.jupiter.api.Assertions.*;
import static software.aws.solution.clickstream.ContextUtil.*;
import static software.aws.solution.clickstream.DatasetUtil.*;

class ETLRunnerTest extends BaseSparkTest {

    @Test
    public void should_read_dataset_cross_multi_days() {
        List<String> transformers = Lists.newArrayList();

        transformers.add("software.aws.solution.clickstream.Transformer");
        transformers.add("software.aws.solution.clickstream.UAEnrichment");
        transformers.add("software.aws.solution.clickstream.IPEnrichment");
        String startTimestamp = "1667963966000"; // 2022-11-09T03:19:26.000Z
        String endTimestamp = "1668136766000"; // 2022-11-11T03:19:26.000Z

        ETLRunnerConfig config = getRunnerConfigForPartitionData(
                transformers, "cross_multi_days",
                startTimestamp, endTimestamp
        );
        ETLRunner runner = new ETLRunner(spark, config);

        Dataset<Row> dataset = runner.readInputDataset(false);
        assertEquals(9, dataset.count());
    }

    @Test
    public void should_readDataset() {
        // DOWNLOAD_FILE=0 ./gradlew clean test --info --tests software.aws.solution.clickstream.ETLRunnerTest.should_readDataset

        List<String> transformers = Lists.newArrayList();

        transformers.add("software.aws.solution.clickstream.Transformer");
        transformers.add("software.aws.solution.clickstream.UAEnrichment");
        transformers.add("software.aws.solution.clickstream.IPEnrichment");

        String startTimestamp = "1667963966000"; // 2022-11-09T03:19:26.000Z
        String endTimestamp = "1667969999000"; // 2022-11-09T07:46:39.000Z

        ETLRunnerConfig config = getRunnerConfigForPartitionData(
                transformers, "readDataset",
                startTimestamp, endTimestamp
        );
        ETLRunner runner = new ETLRunner(spark, config);

        Dataset<Row> dataset = runner.readInputDataset(true);
        assertEquals(0, dataset.count());
        dataset = runner.readInputDataset(false);
        assertEquals(2, dataset.count());
    }


    @Test
    public void should_read_corrupt_dataset() {
       // DOWNLOAD_FILE=0 ./gradlew clean test --info --tests software.aws.solution.clickstream.ETLRunnerTest.should_read_corrupt_dataset

        List<String> transformers = Lists.newArrayList();

        transformers.add("software.aws.solution.clickstream.Transformer");
        transformers.add("software.aws.solution.clickstream.UAEnrichment");
        transformers.add("software.aws.solution.clickstream.IPEnrichment");

        String startTimestamp = "1668128460000"; // '2022-11-11T01:01:00Z'
        String endTimestamp = "1668153660000"; // '2022-11-11T08:01:00Z'

        ETLRunnerConfig config = getRunnerConfigForPartitionData(
                transformers, "read_corrupt_dataset",
                startTimestamp, endTimestamp
        );
        ETLRunner runner = new ETLRunner(spark, config);

        Dataset<Row> dataset = runner.readInputDataset(true);
        assertEquals(0, dataset.count());
        dataset = runner.readInputDataset(false);
        assertEquals("\"abc\"", dataset.first().getAs("_corrupt_record"));
    }

    @Test
    public void should_executeTransformers() throws IOException {
        //DOWNLOAD_FILE=1 ./gradlew clean test --info --tests software.aws.solution.clickstream.ETLRunnerTest.should_executeTransformers
        System.setProperty(DEBUG_LOCAL_PROP, "true");
        System.setProperty(APP_IDS_PROP, "id1,id2,uba-app");
        System.setProperty(PROJECT_ID_PROP, "projectId1");
        System.setProperty(SAVE_INFO_TO_WAREHOUSE_PROP, "true");

        spark.sparkContext().addFile(requireNonNull(getClass().getResource("/GeoLite2-City.mmdb")).getPath());

        List<String> transformers = Lists.newArrayList();

        transformers.add("software.aws.solution.clickstream.Transformer");
        transformers.add("software.aws.solution.clickstream.UAEnrichment");
        transformers.add("software.aws.solution.clickstream.IPEnrichment");

        ETLRunnerConfig config = getRunnerConfig(transformers, "executeTransformers");
        ETLRunner runner = new ETLRunner(spark, config);

        Dataset<Row> sourceDataset =
                spark.read().json(requireNonNull(getClass().getResource("/original_data.json")).getPath());

        Dataset<Row> dataset = runner.executeTransformers(sourceDataset, transformers);
        checkSchema(dataset);

        Row row = dataset.first();
        assertEquals(111L, row.getLong(row.fieldIndex("event_bundle_sequence_id")));
        String outPath = "/tmp/test-spark-etl/" + new Date().getTime();
        runner.writeResult(outPath, dataset, ETLRunner.TableName.ODS_EVENTS);
        assertTrue(Paths.get(outPath, "ods_events/partition_app=uba-app/partition_year=2023" +
                        "/partition_month=04/partition_day=24")
                .toFile().isDirectory());
    }

    private void checkSchema(Dataset<Row> dataset) throws IOException {
        dataset.printSchema();
        System.out.println(dataset.schema().toDDL());
        // app_info: STRUCT<app_id: STRING, id: STRING, install_source: STRING, version: STRING>
        // `app_info` struct<app_id:string,id:string,install_source:string,version:string>,

        String path = this.getClass().getResource("/ods_event.sql").getPath();
        String sqlContent = String.join("\n", Files.readAllLines(Paths.get(path)));
        String normalSqlContent = sqlContent.replaceAll("[``]", "");
        dataset.schema().foreach(d -> {
            // change 'app_info: STRUCT<app_id: STRING>' to 'app_info struct<app_id:string>'
            String fieldSql = d.sql().toLowerCase().replaceAll(" ", "")
                    .replaceAll("^" + d.name() + ":", d.name() + " ");
            boolean matchColDef = normalSqlContent.contains(fieldSql + ",") || normalSqlContent.contains(fieldSql + ")");
            if (matchColDef) {
                System.out.println(d.name() + " OK");
            } else {
                System.err.println(fieldSql);
                System.err.println(d.name() + " is mismatch");
                System.out.println("cannot find below sql\n" + fieldSql + "\nin\n" + normalSqlContent);
            }
            assertTrue(matchColDef);
            return "";
        });

        System.out.println(dataset.schema().fieldNames());
        assertEquals(String.join(" ", dataset.schema().fieldNames()), String.join(" ", new String[]{
                "app_info",
                "device",
                "ecommerce",
                "event_bundle_sequence_id",
                "event_date",
                "event_dimensions",
                "event_id",
                "event_name",
                "event_params",
                "event_previous_timestamp",
                "event_server_timestamp_offset",
                "event_timestamp",
                "event_value_in_usd",
                "geo",
                "ingest_timestamp",
                "items",
                "platform",
                "privacy_info",
                "project_id",
                "traffic_source",
                "user_first_touch_timestamp",
                "user_id",
                "user_ltv",
                "user_properties",
                "user_pseudo_id",
        }));
    }

    @Test
    public void should_executeTransformers_with_error() {
        spark.sparkContext().addFile(requireNonNull(getClass().getResource("/GeoLite2-City.mmdb")).getPath());
        List<String> transformers = Lists.newArrayList();

        transformers.add("software.aws.solution.clickstream.Transformer");
        transformers.add("software.aws.solution.clickstream.UAEnrichment");
        transformers.add("software.aws.solution.clickstream.IPEnrichment");

        ETLRunnerConfig config = getRunnerConfig(transformers, "with_error");
        ETLRunner runner = new ETLRunner(spark, config);

        Dataset<Row> sourceDataset =
                spark.read().json(requireNonNull(getClass().getResource("/original_data_with_error.json")).getPath());
        assertEquals(sourceDataset.count(), 1);
        Dataset<Row> dataset = runner.executeTransformers(sourceDataset, transformers);
        assertEquals(dataset.count(), 0);
    }

    @Test
    public void should_executeTransformers_with_postTransformer() {
        List<String> transformers = Lists.newArrayList();
        transformers.add("software.aws.solution.clickstream.SimpleTransformer");
        transformers.add("software.aws.solution.clickstream.SimpleEnrich");

        ETLRunnerConfig config = getRunnerConfig(transformers, "postTransformer");
        ETLRunner runner = new ETLRunner(spark, config);

        Dataset<Row> sourceDataset =
                spark.read().json(requireNonNull(getClass().getResource("/original_data.json")).getPath());
        assertEquals(sourceDataset.count(), 2);
        Dataset<Row> dataset = runner.executeTransformers(sourceDataset, transformers);
        Dataset<Row> dataset1 = dataset.select("transformedBy", "postTransformedBy", "enrichBy");
        assertEquals(dataset1.count(), 2);
    }

    @Test
    public void should_executeTransformers_with_TransformerV2_1() throws IOException {
        // DOWNLOAD_FILE=1 ./gradlew clean test --info --tests software.aws.solution.clickstream.ETLRunnerTest.should_executeTransformers_with_TransformerV2_1
        System.setProperty(APP_IDS_PROP, "uba-app");
        System.setProperty(PROJECT_ID_PROP, "test_project_id_01");
        System.setProperty(DEBUG_LOCAL_PROP, "true");
        System.setProperty(WAREHOUSE_DIR_PROP, "/tmp/warehouse/TransformerV2_1");

        spark.sparkContext().addFile(requireNonNull(getClass().getResource("/GeoLite2-City.mmdb")).getPath());

        List<String> transformers = Lists.newArrayList();
        transformers.add("software.aws.solution.clickstream.TransformerV2");
        transformers.add("software.aws.solution.clickstream.UAEnrichment");
        transformers.add("software.aws.solution.clickstream.IPEnrichment");

        ETLRunnerConfig config = getRunnerConfig(transformers, "TransformerV2_1");
        String outputPath = config.getOutputPath();

        ETLRunner runner = new ETLRunner(spark, config);
        Dataset<Row> sourceDataset =
                spark.read().json(requireNonNull(getClass().getResource("/original_data_with_user_profile_set.json")).getPath());
        assertEquals(sourceDataset.count(), 2);
        Dataset<Row> dataset = runner.executeTransformers(sourceDataset, transformers);
        dataset.printSchema();
        System.out.println(dataset.first().prettyJson());

        String partitionPart = "partition_app=uba-app/partition_year=2023/partition_month=04/partition_day=24";
        String expectedJson = this.resourceFileAsString("/expected/etl_runner_v2_event1.json");
        Assertions.assertEquals(expectedJson, dataset.first().prettyJson());
        Path p1 = Paths.get(outputPath, "user", partitionPart);
        Assertions.assertTrue(p1.toFile().isDirectory());
        Path p2 = Paths.get(outputPath, "event_parameter", partitionPart);
        Assertions.assertTrue(p2.toFile().isDirectory());
        Path p3 = Paths.get(outputPath, "item", partitionPart);
        Assertions.assertTrue(p3.toFile().isDirectory());
    }


    @Test
    public void should_executeTransformers_with_TransformerV2_2() throws IOException {
        // DOWNLOAD_FILE=1 ./gradlew clean test --info --tests software.aws.solution.clickstream.ETLRunnerTest.should_executeTransformers_with_TransformerV2_2
        System.setProperty(APP_IDS_PROP, "uba-app");
        System.setProperty(PROJECT_ID_PROP, "test_project_id_01");
        System.setProperty(WAREHOUSE_DIR_PROP, "/tmp/warehouse/TransformerV2_2");

        spark.sparkContext().addFile(requireNonNull(getClass().getResource("/GeoLite2-City.mmdb")).getPath());
        List<String> transformers = Lists.newArrayList();
        transformers.add("software.aws.solution.clickstream.TransformerV2");
        transformers.add("software.aws.solution.clickstream.UAEnrichment");
        transformers.add("software.aws.solution.clickstream.IPEnrichment");

        ETLRunner runner = new ETLRunner(spark, getRunnerConfig(transformers, "TransformerV2_2"));

        Dataset<Row> sourceDataset =
                spark.read().json(requireNonNull(getClass().getResource("/original_data_with_items.json")).getPath());
        assertEquals(sourceDataset.count(), 1);
        Dataset<Row> dataset = runner.executeTransformers(sourceDataset, transformers);
        dataset.printSchema();
        System.out.println(dataset.first().prettyJson());
        String expectedJson = this.resourceFileAsString("/expected/etl_runner_v2_event2.json");
        Assertions.assertEquals(expectedJson, dataset.first().prettyJson());
    }

    @Test
    public void should_executeTransformers_with_TransformerV2_3() throws IOException {
        // DOWNLOAD_FILE=1 ./gradlew clean test --info --tests software.aws.solution.clickstream.ETLRunnerTest.should_executeTransformers_with_TransformerV2_3
        System.setProperty(APP_IDS_PROP, "uba-app");
        System.setProperty(PROJECT_ID_PROP, "test_project_id_01");
        System.setProperty("force.merge", "true");
        System.setProperty(WAREHOUSE_DIR_PROP, "/tmp/warehouse/TransformerV2_3");

        spark.sparkContext().addFile(requireNonNull(getClass().getResource("/GeoLite2-City.mmdb")).getPath());
        List<String> transformers = Lists.newArrayList();
        transformers.add("software.aws.solution.clickstream.TransformerV2");
        transformers.add("software.aws.solution.clickstream.UAEnrichment");
        transformers.add("software.aws.solution.clickstream.IPEnrichment");

        ETLRunnerConfig config = getRunnerConfig(transformers, "TransformerV2_3");
        ETLRunner runner = new ETLRunner(spark, config);

        Dataset<Row> sourceDataset =
                spark.read().json(requireNonNull(getClass().getResource("/original_data_with_user_profile_set2.json")).getPath());
        assertEquals( 6, sourceDataset.count());
        Dataset<Row> dataset = runner.executeTransformers(sourceDataset, transformers);
        dataset.printSchema();
        System.out.println(dataset.first().prettyJson());
        String expectedJson = this.resourceFileAsString("/expected/etl_runner_v2_event3.json");
        Assertions.assertEquals(expectedJson, dataset.first().prettyJson());

        String dataDir = ContextUtil.getWarehouseDir();

        String tableName1 = dataDir + "/" + TABLE_ETL_USER_TRAFFIC_SOURCE + INCREMENTAL_SUFFIX + TABLE_VERSION_SUFFIX_V1;
        String tableName2 = dataDir + "/" + TABLE_ETL_USER_DEVICE_ID + INCREMENTAL_SUFFIX + TABLE_VERSION_SUFFIX_V1;
        String tableName3 = dataDir + "/" + TABLE_ETL_USER_PAGE_REFERER + INCREMENTAL_SUFFIX + TABLE_VERSION_SUFFIX_V1;
        String tableName4 = dataDir + "/" + TABLE_ETL_USER_CHANNEL+ INCREMENTAL_SUFFIX + TABLE_VERSION_SUFFIX_V1;
        Dataset<Row> d1 = spark.read().parquet(tableName1);
        Dataset<Row> d2 = spark.read().parquet(tableName2);
        Dataset<Row> d3 = spark.read().parquet(tableName3);
        Dataset<Row> d4 = spark.read().parquet(tableName4);

        long cc1 = d1.count();
        long cc2 = d2.count();
        long cc3 = d3.count();
        long cc4 = d4.count();

        System.out.printf("cc1=%s, cc2=%s, cc3=%s cc4=%s %n", cc1, cc2, cc3, cc4);
        Assertions.assertTrue( cc1 >= 1);
        Assertions.assertTrue(cc2 >= 1);
        Assertions.assertTrue(cc3 >= 1);
        Assertions.assertTrue(cc4 >= 1);

        System.setProperty("force.merge", "false");
    }

    @Test
    public void should_executeTransformers_with_TransformerV2_user_item_params() throws IOException {
        // DOWNLOAD_FILE=1 ./gradlew clean test --info --tests software.aws.solution.clickstream.ETLRunnerTest.should_executeTransformers_with_TransformerV2_user_item_params
        System.setProperty(APP_IDS_PROP, "uba-app");
        System.setProperty(PROJECT_ID_PROP, "test_project_id_01");
        System.setProperty(WAREHOUSE_DIR_PROP, "/tmp/warehouse/TransformerV2_user_item_params");

        spark.sparkContext().addFile(requireNonNull(getClass().getResource("/GeoLite2-City.mmdb")).getPath());
        List<String> transformers = Lists.newArrayList();
        transformers.add("software.aws.solution.clickstream.TransformerV2");
        transformers.add("software.aws.solution.clickstream.UAEnrichment");
        transformers.add("software.aws.solution.clickstream.IPEnrichment");

        ETLRunnerConfig config = getRunnerConfig(transformers, "TransformerV2_3");
        ETLRunner runner = new ETLRunner(spark, config);
        Dataset<Row> sourceDataset =
                spark.read().json(requireNonNull(getClass().getResource("/original_data_with_user_etl_runner.json")).getPath());
        assertEquals(sourceDataset.count(), 4);
        runner.writeResultDataset(runner.executeTransformers(sourceDataset, transformers));
        String outputPath = config.getOutputPath();

        System.out.println("outputPath:" + outputPath);

        Dataset<Row> eventParamDataset = spark.read().json(outputPath + ETLRunner.TableName.EVEN_PARAMETER.getTableName());
        String expectedJsonEventParam = this.resourceFileAsString("/expected/etl_runner_v2_event_parameter.json");
        String rowJsonEventParam = datasetToPrettyJson(eventParamDataset
                .where(expr("event_id='1fcd7f5b-9529-4977-a303-e8c7e39db7b898-etl_runner1'")).distinct());
        Assertions.assertEquals(expectedJsonEventParam, rowJsonEventParam);
        Assertions.assertEquals(44, eventParamDataset.count());

        Dataset<Row> userDataset = spark.read().json(outputPath + ETLRunner.TableName.USER.getTableName());
        Dataset<Row> userDataset1 = userDataset.filter(expr("user_pseudo_id='uuid1_etl_runner1'"));
        String expectedJsonUser = this.resourceFileAsString("/expected/etl_runner_v2_user.json");
        Assertions.assertEquals(expectedJsonUser, userDataset1.first().prettyJson());
        Assertions.assertEquals(1, userDataset1.count());

        Dataset<Row> itemDataset = spark.read().json(outputPath + ETLRunner.TableName.ITEM.getTableName());
        Dataset<Row> itemDataset1 = itemDataset.filter(expr("id='item_id_uuid1_etl_runner1'"));
        String expectedJsonItem = this.resourceFileAsString("/expected/etl_runner_v2_item.json");
        Assertions.assertEquals(expectedJsonItem, itemDataset1.first().prettyJson());
        Assertions.assertEquals(1, itemDataset1.count());

        Dataset<Row> eventDataset = spark.read().json(outputPath + ETLRunner.TableName.EVENT.getTableName());
        Assertions.assertEquals(4, eventDataset.count());
        String eventJson = datasetToPrettyJson(eventDataset.where(expr("event_id='1fcd7f5b-9529-4977-a303-e8c7e39db7b898-etl_runner1'")));
        String expectedJsonEvent = this.resourceFileAsString("/expected/etl_runner_v2_event4.json");
        Assertions.assertEquals(expectedJsonEvent, eventJson);
    }



    @Test
    public void should_executeTransformers_with_TransformerV2_with_empty_user() throws IOException {
        // DOWNLOAD_FILE=1 ./gradlew clean test --info --tests software.aws.solution.clickstream.ETLRunnerTest.should_executeTransformers_with_TransformerV2_with_empty_user
        System.setProperty(APP_IDS_PROP, "uba-app");
        System.setProperty(PROJECT_ID_PROP, "test_project_id_01");
        System.setProperty("force.merge", "true");
        System.setProperty(WAREHOUSE_DIR_PROP, "/tmp/warehouse/TransformerV2_with_empty_user");

        spark.sparkContext().addFile(requireNonNull(getClass().getResource("/GeoLite2-City.mmdb")).getPath());
        List<String> transformers = Lists.newArrayList();
        transformers.add("software.aws.solution.clickstream.TransformerV2");
        transformers.add("software.aws.solution.clickstream.UAEnrichment");
        transformers.add("software.aws.solution.clickstream.IPEnrichment");

        ETLRunnerConfig config = getRunnerConfig(transformers, "TransformerV2_4");
        ETLRunner runner = new ETLRunner(spark, config);
        Dataset<Row> sourceDataset =
                spark.read().json(requireNonNull(getClass().getResource("/original_data_with_empty_user.json")).getPath());
        assertEquals(sourceDataset.count(), 1);
        runner.writeResultDataset(runner.executeTransformers(sourceDataset, transformers));
        String outputPath = config.getOutputPath();

        System.out.println("outputPath:" + outputPath);
        Dataset<Row> eventDataset = spark.read().json(outputPath + ETLRunner.TableName.EVENT.getTableName());
        Dataset<Row> eventParamDataset = spark.read().json(outputPath + ETLRunner.TableName.EVEN_PARAMETER.getTableName());
        Dataset<Row> itemDataset = spark.read().json(outputPath + ETLRunner.TableName.ITEM.getTableName());
        try {
           spark.read().json(outputPath + ETLRunner.TableName.USER.getTableName());
        } catch (Exception e) {
            Assertions.assertTrue(e.getMessage().contains("Path does not exist"));
        }
        Assertions.assertEquals(1, eventDataset.count());
        Assertions.assertEquals(11, eventParamDataset.count());
        Assertions.assertTrue(itemDataset.count() > 0);
    }

    @Test
    public void should_executeTransformers_with_TransformerV2_with_empty_user_and_item() throws IOException {
        // DOWNLOAD_FILE=0 ./gradlew clean test --info --tests software.aws.solution.clickstream.ETLRunnerTest.should_executeTransformers_with_TransformerV2_with_empty_user_and_item
        System.setProperty(APP_IDS_PROP, "uba-app");
        System.setProperty(PROJECT_ID_PROP, "test_project_id_01");
        System.setProperty("force.merge", "true");
        System.setProperty(WAREHOUSE_DIR_PROP, "/tmp/warehouse/TransformerV2_with_empty_user_and_item");

        List<String> transformers = Lists.newArrayList();
        transformers.add("software.aws.solution.clickstream.TransformerV2");

        ETLRunnerConfig config = getRunnerConfig(transformers, "TransformerV2_5");
        ETLRunner runner = new ETLRunner(spark, config);
        Dataset<Row> sourceDataset =
                spark.read().json(requireNonNull(getClass().getResource("/original_data_with_empty_user.json")).getPath());
        assertEquals(sourceDataset.count(), 1);
        runner.writeResultDataset(runner.executeTransformers(sourceDataset, transformers));
        String outputPath = config.getOutputPath();

        System.out.println("outputPath:" + outputPath);
        Dataset<Row> eventDataset = spark.read().json(outputPath + ETLRunner.TableName.EVENT.getTableName());
        Dataset<Row> eventParamDataset = spark.read().json(outputPath + ETLRunner.TableName.EVEN_PARAMETER.getTableName());
        try {
            spark.read().json(outputPath + ETLRunner.TableName.USER.getTableName());
        } catch (Exception e) {
            Assertions.assertTrue(e.getMessage().contains("Path does not exist"));
        }
        try {
            spark.read().json(outputPath + ETLRunner.TableName.ITEM.getTableName());
        } catch (Exception e) {
            Assertions.assertTrue(e.getMessage().contains("Path does not exist"));
        }
        Assertions.assertEquals(1, eventDataset.count());
        Assertions.assertEquals(11, eventParamDataset.count());
    }


    @Test
    public void should_executeTransformers_with_GTM_server_transformer() throws IOException {
        // DOWNLOAD_FILE=1 ./gradlew clean test --info --tests software.aws.solution.clickstream.ETLRunnerTest.should_executeTransformers_with_GTM_server_transformer
        System.setProperty(APP_IDS_PROP, "uba-app");
        System.setProperty(PROJECT_ID_PROP, "test_project_id_01");
        System.setProperty("force.merge", "true");
        System.setProperty(WAREHOUSE_DIR_PROP, "/tmp/warehouse/etl_runner/should_executeTransformers_with_GTM_server_transformer");
        spark.sparkContext().addFile(requireNonNull(getClass().getResource("/GeoLite2-City.mmdb")).getPath());

        List<String> transformers = Lists.newArrayList();
        transformers.add("software.aws.solution.clickstream.gtm.GTMServerDataTransformer");
        transformers.add("software.aws.solution.clickstream.UAEnrichment");
        transformers.add("software.aws.solution.clickstream.IPEnrichment");

        ETLRunnerConfig config = getRunnerConfig(transformers, "GTM_server_transformer");
        ETLRunner runner = new ETLRunner(spark, config);
        Dataset<Row> sourceDataset =
                spark.read().json(requireNonNull(getClass().getResource("/gtm-server/server-all.json")).getPath());

        runner.writeResultDataset(runner.executeTransformers(sourceDataset, transformers));

        String outputPath = config.getOutputPath();
        System.out.println("outputPath:" + outputPath);
        Dataset<Row> eventDataset = spark.read().json(outputPath + ETLRunner.TableName.EVENT.getTableName());
        Dataset<Row> eventParamDataset = spark.read().json(outputPath + ETLRunner.TableName.EVEN_PARAMETER.getTableName());
        Dataset<Row> itemDataset = spark.read().json(outputPath + ETLRunner.TableName.ITEM.getTableName());
        Dataset<Row> userDataset = spark.read().json(outputPath + ETLRunner.TableName.USER.getTableName());

        Assertions.assertTrue(eventDataset.count() > 0);
        Assertions.assertTrue( eventParamDataset.count() > 0);
        Assertions.assertTrue(itemDataset.count() > 0);
        Assertions.assertTrue(userDataset.count() > 0);

        Dataset<Row> eventDataset1 = eventDataset.filter(col("event_id").equalTo("7da14049fe2aca7ea98c9f4b2b3c6f4a-0-1691480516-0"));

        String expectedData = this.resourceFileAsString("/gtm-server/expected/test_etl_runner_data_event.json");
        Assertions.assertEquals(expectedData, eventDataset1.first().prettyJson());

        long profileSetCount = eventDataset.filter(col("event_name").equalTo("_profile_set")).count();
        Assertions.assertTrue(profileSetCount > 0, "profileSetCount=" + profileSetCount);

        Dataset<Row> params = eventParamDataset.filter(expr("event_param_int_value = 0 and event_param_key = '_session_start_timestamp'"));
        Assertions.assertTrue(params.count() == 0, "should not have _session_start_timestamp = 0");

    }

    public ETLRunnerConfig getRunnerConfig(List<String> transformers, String name) {
        String sourcePath = getClass().getResource("/original_data.json").getPath();
        String startTimestamp = "1667963966000"; // 2022-11-09T03:19:26.000Z
        String endTimestamp = "1668136766000"; // 2022-11-11T03:19:26.000Z
        return getRunnerConfig(transformers, name, sourcePath, startTimestamp, endTimestamp);
    }

    public ETLRunnerConfig getRunnerConfigForPartitionData(List<String> transformers, String name,
                                                           String startTimestamp, String endTimestamp) {
        String sourcePath = Paths.get(getClass().getResource("/original_data.json").getPath())
                .getParent().toString() + "/partition_data/";
        return getRunnerConfig(transformers, name, sourcePath, startTimestamp, endTimestamp);
    }

    public ETLRunnerConfig getRunnerConfig(List<String> transformers, String name, String sourcePath,
                                           String startTimestamp, String endTimestamp) {
        String database = "default";
        String sourceTable = "fakeSourceTable";
        String jobDataDir = "/tmp/etl-debug/";
        String transformerClassNames = String.join(",", transformers);
        String outputPath = "/tmp/test-output/" + name + new Date().getTime() + "/";
        String projectId = "projectId1";
        String validAppIds = "id1,id2,uba-app";
        String outPutFormat = "json";
        String dataFreshnessInHour = "72";
        int nDaysUser = 360 * 30;
        int nDaysItem = 360 * 30;

        ETLRunnerConfig runnerConfig = new ETLRunnerConfig(
                new ETLRunnerConfig.TransformationConfig(
                        newArrayList(transformerClassNames.split(",")),
                        projectId, validAppIds,
                        Long.valueOf(dataFreshnessInHour),
                        nDaysUser, nDaysItem
                ),
                new ETLRunnerConfig.InputOutputConfig(
                        "false",
                        database,
                        sourceTable,
                        sourcePath,
                        jobDataDir,
                        outputPath,
                        outPutFormat
                ),
                new ETLRunnerConfig.TimestampConfig(
                        Long.valueOf(startTimestamp),
                        Long.valueOf(endTimestamp)
                ),
                new ETLRunnerConfig.PartitionConfig(
                        1, 1
                ));
        return runnerConfig;
    }
}