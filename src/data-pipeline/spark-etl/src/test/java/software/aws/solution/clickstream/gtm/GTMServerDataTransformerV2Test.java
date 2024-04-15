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

package software.aws.solution.clickstream.gtm;

import lombok.extern.slf4j.*;
import org.apache.spark.sql.*;
import org.apache.spark.sql.types.*;
import org.junit.jupiter.api.*;
import software.aws.solution.clickstream.*;
import software.aws.solution.clickstream.util.*;

import java.io.*;
import java.sql.*;
import java.util.*;
import java.util.Date;

import static java.util.Objects.*;
import static org.apache.spark.sql.functions.*;
import static software.aws.solution.clickstream.util.ContextUtil.*;


@Slf4j
public class GTMServerDataTransformerV2Test extends BaseSparkTest {
    GTMServerDataTransformerV2 transformer = new GTMServerDataTransformerV2();

    @Test
    void test_convert_event_v2() throws IOException {
        // DOWNLOAD_FILE=0 ./gradlew clean test --info --tests software.aws.solution.clickstream.gtm.GTMServerDataTransformerV2Test.test_convert_event_v2
        System.setProperty(APP_IDS_PROP, "testApp");
        System.setProperty(PROJECT_ID_PROP, "test_project_id_gtm_server");
        System.setProperty(DEBUG_LOCAL_PROP, "true");
        String testWarehouseDir = "/tmp/warehouse/gtm/test_convert_event_v2/" + new Date().getTime();
        System.setProperty(WAREHOUSE_DIR_PROP, testWarehouseDir);

        Dataset<Row> dataset = spark.read().json(requireNonNull(getClass().getResource("/gtm-server/server-single.json")).getPath());

        Map<TableName, Dataset<Row>> datasetMap = transformer.transform(dataset);

        Dataset<Row> eventDataset = datasetMap.get(TableName.EVENT_V2);
        String eventSchema = eventDataset.schema().prettyJson().replaceAll("\"nullable\" : false,", "\"nullable\" : true,");
        String expectedSchema = this.resourceFileAsString("/expected/schema-event_v2.json").replaceAll("\"nullable\" : false,", "\"nullable\" : true,");
        Assertions.assertEquals(expectedSchema, eventSchema);
    }

    @Test
    void test_convert_item_v2() throws IOException {
        // DOWNLOAD_FILE=0 ./gradlew clean test --info --tests software.aws.solution.clickstream.gtm.GTMServerDataTransformerV2Test.test_convert_item_v2
        System.setProperty(APP_IDS_PROP, "testApp");
        System.setProperty(PROJECT_ID_PROP, "test_project_id_gtm_server");
        System.setProperty(DEBUG_LOCAL_PROP, "true");
        String testWarehouseDir = "/tmp/warehouse/gtm/test_convert_item_v2/" + new Date().getTime();
        System.setProperty(WAREHOUSE_DIR_PROP, testWarehouseDir);

        Dataset<Row> dataset = spark.read().json(requireNonNull(getClass().getResource("/gtm-server/server-items.json")).getPath());

        Map<TableName, Dataset<Row>> datasetMap = transformer.transform(dataset);
        Dataset<Row> itemDataset = datasetMap.get(TableName.ITEM_V2);

        String eventSchema = itemDataset.schema().prettyJson().replaceAll("\"nullable\" : false,", "\"nullable\" : true,");

        String expectedSchema = this.resourceFileAsString("/expected/schema-item_v2.json");
        Assertions.assertEquals(expectedSchema, eventSchema);

    }


    @Test
    void test_convert_item_is_empty_v2() throws IOException {
        // DOWNLOAD_FILE=0 ./gradlew clean test --info --tests software.aws.solution.clickstream.gtm.GTMServerDataTransformerV2Test.test_convert_item_is_empty_v2
        System.setProperty(APP_IDS_PROP, "testApp");
        System.setProperty(PROJECT_ID_PROP, "test_project_id_gtm_server");
        System.setProperty(DEBUG_LOCAL_PROP, "true");
        String testWarehouseDir = "/tmp/warehouse/gtm/test_convert_item_is_empty_v2/" + new Date().getTime();
        System.setProperty(WAREHOUSE_DIR_PROP, testWarehouseDir);

        Dataset<Row> dataset = spark.read().json(requireNonNull(getClass().getResource("/gtm-server/server-single.json")).getPath());

        Map<TableName, Dataset<Row>> datasetMap = transformer.transform(dataset);
        Dataset<Row> itemDataset = datasetMap.get(TableName.ITEM_V2);

        Assertions.assertEquals(0, itemDataset.count());
    }


    @Test
    void test_convert_user_v2() throws IOException {
        // DOWNLOAD_FILE=0 ./gradlew clean test --info --tests software.aws.solution.clickstream.gtm.GTMServerDataTransformerV2Test.test_convert_user_v2
        System.setProperty(APP_IDS_PROP, "testApp");
        System.setProperty(PROJECT_ID_PROP, "test_project_id_gtm_server");
        System.setProperty(DEBUG_LOCAL_PROP, "true");
        String testWarehouseDir = "/tmp/warehouse/gtm/test_convert_user_v2/" + new Date().getTime();
        System.setProperty(WAREHOUSE_DIR_PROP, testWarehouseDir);

        Dataset<Row> dataset = spark.read().json(requireNonNull(getClass().getResource("/gtm-server/server-user.json")).getPath());

        Map<TableName, Dataset<Row>> datasetMap = transformer.transform(dataset);
        Dataset<Row> userDataset = datasetMap.get(TableName.USER_V2);
        String eventSchema = userDataset.schema().prettyJson().replaceAll("\"nullable\" : false,", "\"nullable\" : true,");

        String expectedSchema = this.resourceFileAsString("/expected/schema-user_v2.json");
        Assertions.assertEquals(expectedSchema, eventSchema);
    }


    @Test
    void test_convert_session() throws IOException {
        // DOWNLOAD_FILE=0 ./gradlew clean test --info --tests software.aws.solution.clickstream.gtm.GTMServerDataTransformerV2Test.test_convert_session
        System.setProperty(APP_IDS_PROP, "testApp");
        System.setProperty(PROJECT_ID_PROP, "test_project_id_gtm_server");
        System.setProperty(DEBUG_LOCAL_PROP, "true");
        String testWarehouseDir = "/tmp/warehouse/gtm/test_convert_session/" + new Date().getTime();
        System.setProperty(WAREHOUSE_DIR_PROP, testWarehouseDir);

        Dataset<Row> dataset = spark.read().json(requireNonNull(getClass().getResource("/gtm-server/server-single.json")).getPath());

        Map<TableName, Dataset<Row>> datasetMap = transformer.transform(dataset);
        Dataset<Row> eventParamDataset = datasetMap.get(TableName.SESSION);
        String eventSchema = eventParamDataset.schema().prettyJson().replaceAll("\"nullable\" : false,", "\"nullable\" : true,");
        String expectedSchema = this.resourceFileAsString("/expected/schema-session.json");
        Assertions.assertEquals(expectedSchema, eventSchema);

    }

    @Test
    void test_post_transform() {
        // DOWNLOAD_FILE=0 ./gradlew clean test --info --tests software.aws.solution.clickstream.gtm.GTMServerDataTransformerV2Test.test_post_transform
        System.setProperty(APP_IDS_PROP, "testApp");
        System.setProperty(PROJECT_ID_PROP, "test_project_id_gtm_server");
        System.setProperty(DEBUG_LOCAL_PROP, "true");
        String testWarehouseDir = "/tmp/warehouse/gtm/test_post_transform/" + new Date().getTime();
        System.setProperty(WAREHOUSE_DIR_PROP, testWarehouseDir);

        Dataset<Row> dataset = spark.read().json(requireNonNull(getClass().getResource("/gtm-server/server-all.json")).getPath());

        Map<TableName, Dataset<Row>> datasetMap = transformer.transform(dataset);
        Map<String, StructType> schemaMap = DatasetUtil.getSchemaMap();

        Assertions.assertNotNull(schemaMap.get(testWarehouseDir + "/etl_gtm_user_v2_props_full_v2"));
        Assertions.assertNotNull(schemaMap.get(testWarehouseDir + "/etl_gtm_user_v2_props_incremental_v2"));

        Dataset<Row> eventDataset = transformer.postTransform(datasetMap.get(TableName.EVENT_V2));
        Assertions.assertTrue(eventDataset.count() > 1);
    }


    @Test
    void test_transform_data_event_v2() throws IOException {
        // DOWNLOAD_FILE=0 ./gradlew clean test --info --tests software.aws.solution.clickstream.gtm.GTMServerDataTransformerV2Test.test_transform_data_event_v2
        System.setProperty(APP_IDS_PROP, "testApp");
        System.setProperty(PROJECT_ID_PROP, "test_project_id_gtm_server");
        System.setProperty(DEBUG_LOCAL_PROP, "true");
        System.setProperty("force.merge", "true");
        String testWarehouseDir = "/tmp/warehouse/gtm/test_transform_data_event_v2/" + new Date().getTime();
        System.setProperty(WAREHOUSE_DIR_PROP, testWarehouseDir);

        Dataset<Row> dataset = spark.read().json(requireNonNull(getClass().getResource("/gtm-server/server-all.json")).getPath());

        Map<TableName, Dataset<Row>> datasetMap = transformer.transform(dataset);

        String expectedData1 = this.resourceFileAsString("/gtm-server/expected/test_transform_data_event_v2.json");

        datasetMap.get(TableName.EVENT_V2).select("event_id").show(100, false);

        Assertions.assertEquals(expectedData1, replaceProcessInfo(datasetMap.get(TableName.EVENT_V2).filter(expr("event_id='4a31fde2533e11dd2b0e7800720f6f86-0-1695260713-2'")).first().prettyJson()), "event is correct");

        Dataset<Row> eventDataset = transformer.postTransform(datasetMap.get(TableName.EVENT_V2));
        String expectedDataPost = this.resourceFileAsString("/gtm-server/expected/test_transform_data_event_post_v2.json");
        Assertions.assertEquals(expectedDataPost, replaceProcessInfo(eventDataset.filter(expr("event_id='4a31fde2533e11dd2b0e7800720f6f86-0-1695260713-2'")).first().prettyJson()), "event post is correct");

    }

    @Test
    void test_transform_data_event_brand_v2() throws IOException {
        // DOWNLOAD_FILE=0 ./gradlew clean test --info --tests software.aws.solution.clickstream.gtm.GTMServerDataTransformerV2Test.test_transform_data_event_brand_v2
        System.setProperty(APP_IDS_PROP, "testApp");
        System.setProperty(PROJECT_ID_PROP, "test_project_id_gtm_server");
        System.setProperty(DEBUG_LOCAL_PROP, "true");
        System.setProperty("force.merge", "true");
        String testWarehouseDir = "/tmp/warehouse/gtm/test_transform_data_event_brand_v2/" + new Date().getTime();
        System.setProperty(WAREHOUSE_DIR_PROP, testWarehouseDir);

        Dataset<Row> dataset = spark.read().json(requireNonNull(getClass().getResource("/gtm-server/server-brand.json")).getPath());

        Map<TableName, Dataset<Row>> datasetMap = transformer.transform(dataset);

        datasetMap.get(TableName.EVENT_V2).select("event_id").show(100, false);

        String expectedData1 = this.resourceFileAsString("/gtm-server/expected/test_transform_data_brand_v2.json");
        Assertions.assertEquals(expectedData1, replaceProcessInfo(datasetMap.get(TableName.EVENT_V2).filter(expr("event_id='43cc3b89d7dfccbc2c906eb125ea25dbbrand-0-1693281535-11'")).first().prettyJson()));
    }

    @Test
    void test_transform_data_session() throws IOException {
        // DOWNLOAD_FILE=0 ./gradlew clean test --info --tests software.aws.solution.clickstream.gtm.GTMServerDataTransformerV2Test.test_transform_data_session
        System.setProperty(APP_IDS_PROP, "testApp");
        System.setProperty(PROJECT_ID_PROP, "test_project_id_gtm_server");
        System.setProperty(DEBUG_LOCAL_PROP, "true");
        String testWarehouseDir = "/tmp/warehouse/gtm/test_transform_data_session/" + new Date().getTime();
        System.setProperty(WAREHOUSE_DIR_PROP, testWarehouseDir);

        Dataset<Row> dataset = spark.read().json(requireNonNull(getClass().getResource("/gtm-server/test-convert-session-start.json")).getPath());

        Map<TableName, Dataset<Row>> datasetMap = transformer.transform(dataset);

        datasetMap.get(TableName.SESSION).select("session_id", "session_number", "user_pseudo_id").show(100, false);

        Dataset<Row> resultDataset = datasetMap.get(TableName.SESSION).filter(expr("session_id='1704867229' and session_number=9"));

        String expectedData = this.resourceFileAsString("/gtm-server/expected/test_transform_data_session.json");
        Assertions.assertEquals(expectedData, replaceProcessInfo(resultDataset.first().prettyJson()));

    }


    @Test
    void test_transform_data_item_v2() throws IOException {
        // DOWNLOAD_FILE=0 ./gradlew clean test --info --tests software.aws.solution.clickstream.gtm.GTMServerDataTransformerV2Test.test_transform_data_item_v2
        System.setProperty(APP_IDS_PROP, "testApp");
        System.setProperty(PROJECT_ID_PROP, "test_project_id_gtm_server");
        System.setProperty(DEBUG_LOCAL_PROP, "true");
        String testWarehouseDir = "/tmp/warehouse/gtm/test_transform_data_item_v2/" + new Date().getTime();
        System.setProperty(WAREHOUSE_DIR_PROP, testWarehouseDir);

        Dataset<Row> dataset = spark.read().json(requireNonNull(getClass().getResource("/gtm-server/server-all.json")).getPath());

        Map<TableName, Dataset<Row>> datasetMap = transformer.transform(dataset);
        Dataset<Row> resultDataset = datasetMap.get(TableName.ITEM_V2);
        resultDataset.select("item_id", "event_timestamp").show(100, false);
        //  |CTF-28015231-16005642|2023-09-21 09:54:26.828|
        String expectedData = this.resourceFileAsString("/gtm-server/expected/test_transform_data_item_v2.json");
        Assertions.assertEquals(expectedData, replaceProcessInfo(resultDataset.filter(col("item_id").equalTo("CTF-28015231-16005642")).first().prettyJson()));

    }


    @Test
    void test_transform_data_user_v2() throws IOException {
        // DOWNLOAD_FILE=0 ./gradlew clean test --info --tests software.aws.solution.clickstream.gtm.GTMServerDataTransformerV2Test.test_transform_data_user_v2
        System.setProperty(APP_IDS_PROP, "testApp");
        System.setProperty(PROJECT_ID_PROP, "test_project_id_gtm_server");
        System.setProperty(DEBUG_LOCAL_PROP, "true");
        String testWarehouseDir = "/tmp/warehouse/gtm/test_transform_data_user_v2/" + new Date().getTime();
        System.setProperty(WAREHOUSE_DIR_PROP, testWarehouseDir);

        Dataset<Row> dataset = spark.read().json(requireNonNull(getClass().getResource("/gtm-server/server-all.json")).getPath());

        Map<TableName, Dataset<Row>> datasetMap = transformer.transform(dataset);
        Dataset<Row> resultDataset = datasetMap.get(TableName.USER_V2);

        resultDataset = resultDataset.filter(col("user_pseudo_id").equalTo("rzKifeYdYvmoWzeYcdcv9CyGY9NAPpL4vm7QxoxTPnM=.1690769179"));

        String expectedData = this.resourceFileAsString("/gtm-server/expected/test_transform_data_user_v2.json");
        Assertions.assertEquals(expectedData, replaceProcessInfo(resultDataset.first().prettyJson()));

    }


    @Test
    void test_transform_data_user_login_v2() throws IOException {
        // DOWNLOAD_FILE=0 ./gradlew clean test --info --tests software.aws.solution.clickstream.gtm.GTMServerDataTransformerV2Test.test_transform_data_user_login_v2
        System.setProperty(APP_IDS_PROP, "testApp");
        System.setProperty(PROJECT_ID_PROP, "test_project_id_gtm_server");
        System.setProperty(DEBUG_LOCAL_PROP, "true");
        String testWarehouseDir = "/tmp/warehouse/gtm/test_transform_data_user_login_v2/" + new Date().getTime();
        System.setProperty(WAREHOUSE_DIR_PROP, testWarehouseDir);

        Dataset<Row> dataset = spark.read().json(requireNonNull(getClass().getResource("/gtm-server/server-user-login.json")).getPath());

        Map<TableName, Dataset<Row>> datasetMap = transformer.transform(dataset);
        Dataset<Row> resultDataset = datasetMap.get(TableName.USER_V2).filter(col("user_id").equalTo("0eb41e46-2373-4883-8daf-e1975ccb3821"));

        String expectedData = this.resourceFileAsString("/gtm-server/expected/test_transform_data_user_login_v2.json");
        Assertions.assertEquals(expectedData, replaceProcessInfo(resultDataset.first().prettyJson()));

    }

    @Test
    void test_filter_by_event_timestamp() {
        //  DOWNLOAD_FILE=0 ./gradlew clean test --info --tests software.aws.solution.clickstream.gtm.GTMServerDataTransformerV2Test.test_filter_by_event_timestamp
        Dataset<Row> dataset0 = spark.read().parquet(requireNonNull(getClass().getResource("/gtm-server/etl_gtm_user_v2_props_incremental_v1/")).getPath());
        log.info(dataset0.first().prettyJson());
        Dataset<Row> dataset1 = dataset0.filter(col("event_timestamp").$greater$eq(new Timestamp(1692504000000L))); // 2023-08-20T04:00:00.000Z
        Assertions.assertEquals(1, dataset1.count());

        Dataset<Row> dataset2 = dataset0.filter(col("event_timestamp").$greater$eq(new Timestamp(1755662400000L))); // 2025-08-20T04:00:00.000Z
        Assertions.assertEquals(0, dataset2.count());
    }

    @Test
    void test_transform_data_user_login2_v2() throws IOException {
        // DOWNLOAD_FILE=0 ./gradlew clean test --info --tests software.aws.solution.clickstream.gtm.GTMServerDataTransformerV2Test.test_transform_data_user_login2_v2
        System.setProperty(APP_IDS_PROP, "testApp");
        System.setProperty(PROJECT_ID_PROP, "test_project_id_gtm_server");
        System.setProperty(DEBUG_LOCAL_PROP, "true");
        String testWarehouseDir = "/tmp/warehouse/gtm/test_transform_data_user_login2_v2/" + new Date().getTime();
        System.setProperty(WAREHOUSE_DIR_PROP, testWarehouseDir);

        Dataset<Row> dataset = spark.read().json(requireNonNull(getClass().getResource("/gtm-server/server-user-login2.json")).getPath());
        Map<TableName, Dataset<Row>> datasetMap = transformer.transform(dataset);

        Dataset<Row> resultDataset = datasetMap.get(TableName.USER_V2);

        String expectedData = this.resourceFileAsString("/gtm-server/expected/test_transform_data_user_login2_v2.json");
        Assertions.assertEquals(expectedData, replaceProcessInfo(resultDataset.first().prettyJson()), "test_transform_data_user_login2_v2.json");
    }


    @Test
    void test_transform_data_user_incremental_v2() throws IOException {
        // DOWNLOAD_FILE=0 ./gradlew clean test --info --tests software.aws.solution.clickstream.gtm.GTMServerDataTransformerV2Test.test_transform_data_user_incremental_v2
        System.setProperty(APP_IDS_PROP, "testApp");
        System.setProperty(PROJECT_ID_PROP, "test_project_id_gtm_server");
        System.setProperty(DEBUG_LOCAL_PROP, "true");
        String testWarehouseDir = "/tmp/warehouse/gtm/test_transform_data_user_incremental_v2/" + new Date().getTime();
        System.setProperty(WAREHOUSE_DIR_PROP, testWarehouseDir);

        Dataset<Row> dataset = spark.read().json(requireNonNull(getClass().getResource("/gtm-server/server-user-login2.json")).getPath());
        transformer.transform(dataset);

        int year100 = 100 * 365;

        DatasetUtil.getSchemaMap().forEach((k, v) -> {
            log.info("{} -> {}", k, v.prettyJson());
        });
        Dataset<Row> incrementalUserDataset = DatasetUtil.readDatasetFromPath(spark, testWarehouseDir + "/etl_gtm_user_v2_props_incremental_v2", year100);
        String expectedDataInc = this.resourceFileAsString("/gtm-server/expected/test_transform_data_user_incremental_v2.json");

        Assertions.assertEquals(expectedDataInc,
                incrementalUserDataset.filter(col("user_id").equalTo("x-0eb41e46-2373-4883-8daf-e1975ccb3821")).first().prettyJson()
                        // "update_date" : ".*", -> "update_date" : "_YYYYMMDD_",
                        .replaceAll("\"update_date\" : \"\\d+\",", "\"update_date\" : \"_YYYYMMDD_\","),
                "test_transform_data_user_incremental_v2.json");

        Dataset<Row> fullUserDataset = DatasetUtil.readDatasetFromPath(spark, testWarehouseDir + "/etl_gtm_user_v2_props_full_v2", year100);
        Assertions.assertTrue(fullUserDataset.count() > 0);

    }

    @Test
    void test_transform_data_with_session_start_v2() throws IOException {
        // DOWNLOAD_FILE=0 ./gradlew clean test --info --tests software.aws.solution.clickstream.gtm.GTMServerDataTransformerV2Test.test_transform_data_with_session_start_v2
        System.setProperty(APP_IDS_PROP, "testApp");
        System.setProperty(PROJECT_ID_PROP, "test_project_id_gtm_server");
        System.setProperty(DEBUG_LOCAL_PROP, "true");
        String testWarehouseDir = "/tmp/warehouse/gtm/test_transform_data_with_session_start_v2/" + new Date().getTime();
        System.setProperty(WAREHOUSE_DIR_PROP, testWarehouseDir);

        Dataset<Row> dataset = spark.read().json(requireNonNull(getClass().getResource("/gtm-server/server-session-start.json")).getPath());

        Map<TableName, Dataset<Row>> datasetMap = transformer.transform(dataset);
        Dataset<Row> eventDataset = datasetMap.get(TableName.EVENT_V2);

        Assertions.assertEquals(2, eventDataset.count());

        String expectedData = this.resourceFileAsString("/gtm-server/expected/test_transform_data_session_start_v2.json");
        Assertions.assertEquals(expectedData, replaceProcessInfo(eventDataset.filter(expr("event_name = '_session_start'")).first().prettyJson()), "_session_start event is correct");
    }


    @Test
    void test_transform_data_with_session_v2() throws IOException {
        // DOWNLOAD_FILE=0 ./gradlew clean test --info --tests software.aws.solution.clickstream.gtm.GTMServerDataTransformerV2Test.test_transform_data_with_session_v2
        System.setProperty(APP_IDS_PROP, "testApp");
        System.setProperty(PROJECT_ID_PROP, "test_project_id_gtm_server");
        System.setProperty(DEBUG_LOCAL_PROP, "true");
        String testWarehouseDir = "/tmp/warehouse/gtm/test_transform_data_with_session_v2/" + new Date().getTime();
        System.setProperty(WAREHOUSE_DIR_PROP, testWarehouseDir);

        Dataset<Row> dataset = spark.read().json(requireNonNull(getClass().getResource("/gtm-server/server-session-start.json")).getPath());

        Map<TableName, Dataset<Row>> datasetMap = transformer.transform(dataset);
        Dataset<Row> sessionDataset = datasetMap.get(TableName.SESSION);

        Assertions.assertEquals(1, sessionDataset.count());

        String expectedData = this.resourceFileAsString("/gtm-server/expected/test_transform_data_with_session_v2.json");
        Assertions.assertEquals(expectedData, replaceProcessInfo(sessionDataset.first().prettyJson()), "session is correct");
    }

}
