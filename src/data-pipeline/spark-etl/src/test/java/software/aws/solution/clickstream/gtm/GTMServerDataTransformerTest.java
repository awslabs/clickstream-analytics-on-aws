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

import org.apache.spark.sql.Dataset;
import org.apache.spark.sql.Row;
import org.apache.spark.sql.types.StructType;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;
import software.aws.solution.clickstream.BaseSparkTest;
import software.aws.solution.clickstream.DatasetUtil;

import java.io.IOException;
import java.util.List;
import java.util.Map;

import static java.util.Objects.requireNonNull;
import static org.apache.spark.sql.functions.col;
import static software.aws.solution.clickstream.ContextUtil.*;

public class GTMServerDataTransformerTest extends BaseSparkTest {
    GTMServerDataTransformer transformer = new GTMServerDataTransformer();

    @Test
    void test_convert_event() throws IOException {
        // DOWNLOAD_FILE=0 ./gradlew clean test --info --tests software.aws.solution.clickstream.gtm.GTMServerDataTransformerTest.test_convert_event
        System.setProperty(APP_IDS_PROP, "testApp");
        System.setProperty(PROJECT_ID_PROP, "test_project_id_gtm_server");
        System.setProperty(DEBUG_LOCAL_PROP, "true");

        Dataset<Row> dataset =
                spark.read().json(requireNonNull(getClass().getResource("/gtm-server/server-single.json")).getPath());

        List<Dataset<Row>> datasetList = transformer.transform(dataset);

        Dataset<Row> eventDataset = datasetList.get(0);
        String eventSchema = eventDataset.schema().prettyJson().replaceAll("\"nullable\" : false,", "\"nullable\" : true,");
        String expectedSchema = this.resourceFileAsString("/expected/schema-event.json").replaceAll("\"nullable\" : false,", "\"nullable\" : true,");
        Assertions.assertEquals(expectedSchema, eventSchema);
    }


    @Test
    void test_convert_event_parameter() throws IOException {
        // DOWNLOAD_FILE=0 ./gradlew clean test --info --tests software.aws.solution.clickstream.gtm.GTMServerDataTransformerTest.test_convert_event_parameter
        System.setProperty(APP_IDS_PROP, "testApp");
        System.setProperty(PROJECT_ID_PROP, "test_project_id_gtm_server");
        System.setProperty(DEBUG_LOCAL_PROP, "true");

        Dataset<Row> dataset =
                spark.read().json(requireNonNull(getClass().getResource("/gtm-server/server-single.json")).getPath());

        List<Dataset<Row>> datasetList = transformer.transform(dataset);
        Dataset<Row> eventParamDataset = datasetList.get(1);
        String eventSchema = eventParamDataset.schema().prettyJson().replaceAll("\"nullable\" : false,", "\"nullable\" : true,");
        String expectedSchema = this.resourceFileAsString("/expected/schema-event_parameter.json");
        Assertions.assertEquals(expectedSchema, eventSchema);

    }


    @Test
    void test_convert_item() throws IOException {
        // DOWNLOAD_FILE=0 ./gradlew clean test --info --tests software.aws.solution.clickstream.gtm.GTMServerDataTransformerTest.test_convert_item
        System.setProperty(APP_IDS_PROP, "testApp");
        System.setProperty(PROJECT_ID_PROP, "test_project_id_gtm_server");
        System.setProperty(DEBUG_LOCAL_PROP, "true");

        Dataset<Row> dataset =
                spark.read().json(requireNonNull(getClass().getResource("/gtm-server/server-items.json")).getPath());

        List<Dataset<Row>> datasetList = transformer.transform(dataset);
        Dataset<Row> itemDataset = datasetList.get(2);

        String eventSchema = itemDataset.schema().prettyJson().replaceAll("\"nullable\" : false,", "\"nullable\" : true,");

        String expectedSchema = this.resourceFileAsString("/expected/schema-item.json");
        Assertions.assertEquals(expectedSchema, eventSchema);

    }


    @Test
    void test_convert_item_is_null() throws IOException {
        // DOWNLOAD_FILE=0 ./gradlew clean test --info --tests software.aws.solution.clickstream.gtm.GTMServerDataTransformerTest.test_convert_item_is_null
        System.setProperty(APP_IDS_PROP, "testApp");
        System.setProperty(PROJECT_ID_PROP, "test_project_id_gtm_server");
        System.setProperty(DEBUG_LOCAL_PROP, "true");

        Dataset<Row> dataset =
                spark.read().json(requireNonNull(getClass().getResource("/gtm-server/server-single.json")).getPath());

        List<Dataset<Row>> datasetList = transformer.transform(dataset);
        Dataset<Row> itemDataset = datasetList.get(2);
        Assertions.assertNull(itemDataset);
    }


    @Test
    void test_convert_user() throws IOException {
        // DOWNLOAD_FILE=0 ./gradlew clean test --info --tests software.aws.solution.clickstream.gtm.GTMServerDataTransformerTest.test_convert_user
        System.setProperty(APP_IDS_PROP, "testApp");
        System.setProperty(PROJECT_ID_PROP, "test_project_id_gtm_server");
        System.setProperty(DEBUG_LOCAL_PROP, "true");

        Dataset<Row> dataset =
                spark.read().json(requireNonNull(getClass().getResource("/gtm-server/server-user.json")).getPath());

        List<Dataset<Row>> datasetList = transformer.transform(dataset);
        Dataset<Row> userDataset = datasetList.get(3);
        String eventSchema = userDataset.schema().prettyJson().replaceAll("\"nullable\" : false,", "\"nullable\" : true,");

        String expectedSchema = this.resourceFileAsString("/expected/schema-user.json");
        Assertions.assertEquals(expectedSchema, eventSchema);
    }

    @Test
    void test_post_transform() {
        // DOWNLOAD_FILE=0 ./gradlew clean test --info --tests software.aws.solution.clickstream.gtm.GTMServerDataTransformerTest.test_post_transform
        System.setProperty(APP_IDS_PROP, "testApp");
        System.setProperty(PROJECT_ID_PROP, "test_project_id_gtm_server");
        System.setProperty(DEBUG_LOCAL_PROP, "true");

        Dataset<Row> dataset =
                spark.read().json(requireNonNull(getClass().getResource("/gtm-server/server-all.json")).getPath());

        List<Dataset<Row>> datasetList = transformer.transform(dataset);
        Map<String, StructType> schemaMap = DatasetUtil.getSchemaMap();

        Assertions.assertNotNull(schemaMap.get("/tmp/warehouse/etl_gtm_user_visit_incremental_v1"));
        Assertions.assertNotNull(schemaMap.get("/tmp/warehouse/etl_gtm_user_visit_full_v1"));

        Assertions.assertNotNull(schemaMap.get("/tmp/warehouse/etl_gtm_user_referrer_full_v1"));
        Assertions.assertNotNull(schemaMap.get("/tmp/warehouse/etl_gtm_user_referrer_incremental_v1"));

        Assertions.assertNotNull(schemaMap.get("/tmp/warehouse/user_full_v1"));
        Assertions.assertNotNull(schemaMap.get("/tmp/warehouse/user_incremental_v1"));

        Assertions.assertNotNull(schemaMap.get("/tmp/warehouse/item_full_v1"));
        Assertions.assertNotNull(schemaMap.get("/tmp/warehouse/item_incremental_v1"));

        Dataset<Row> eventDataset = transformer.postTransform(datasetList.get(0));
        Assertions.assertTrue(eventDataset.count() > 1);
    }


    @Test
    void test_transform_data_event() throws IOException {
        // DOWNLOAD_FILE=0 ./gradlew clean test --info --tests software.aws.solution.clickstream.gtm.GTMServerDataTransformerTest.test_transform_data_event
        System.setProperty(APP_IDS_PROP, "testApp");
        System.setProperty(PROJECT_ID_PROP, "test_project_id_gtm_server");
        System.setProperty(DEBUG_LOCAL_PROP, "true");
        System.setProperty("force.merge", "true");

        Dataset<Row> dataset =
                spark.read().json(requireNonNull(getClass().getResource("/gtm-server/server-all.json")).getPath());

        List<Dataset<Row>> datasetList = transformer.transform(dataset);

        String expectedData1 = this.resourceFileAsString("/gtm-server/expected/test_transform_data_event1.json");
        Assertions.assertEquals(expectedData1, datasetList.get(0).first().prettyJson());

        Dataset<Row> eventDataset = transformer.postTransform(datasetList.get(0));

        String expectedData2 = this.resourceFileAsString("/gtm-server/expected/test_transform_data_event1_post.json");
        Assertions.assertEquals(expectedData2, eventDataset.first().prettyJson());

    }


    @Test
    void test_transform_data_event_parameter() throws IOException {
        // DOWNLOAD_FILE=0 ./gradlew clean test --info --tests software.aws.solution.clickstream.gtm.GTMServerDataTransformerTest.test_transform_data_event_parameter
        System.setProperty(APP_IDS_PROP, "testApp");
        System.setProperty(PROJECT_ID_PROP, "test_project_id_gtm_server");
        System.setProperty(DEBUG_LOCAL_PROP, "true");

        Dataset<Row> dataset =
                spark.read().json(requireNonNull(getClass().getResource("/gtm-server/server-all.json")).getPath());

        List<Dataset<Row>> datasetList = transformer.transform(dataset);
        Dataset<Row> resultDataset =datasetList.get(1);

        String expectedData = this.resourceFileAsString("/gtm-server/expected/test_transform_data_event_param.json");
        Assertions.assertEquals(expectedData, resultDataset.first().prettyJson());

    }


    @Test
    void test_transform_data_item() throws IOException {
        // DOWNLOAD_FILE=0 ./gradlew clean test --info --tests software.aws.solution.clickstream.gtm.GTMServerDataTransformerTest.test_transform_data_item
        System.setProperty(APP_IDS_PROP, "testApp");
        System.setProperty(PROJECT_ID_PROP, "test_project_id_gtm_server");
        System.setProperty(DEBUG_LOCAL_PROP, "true");
        System.setProperty(WAREHOUSE_DIR_PROP, "/tmp/warehouse/gtm/test_transform_data_item/");

        Dataset<Row> dataset =
                spark.read().json(requireNonNull(getClass().getResource("/gtm-server/server-all.json")).getPath());

        List<Dataset<Row>> datasetList = transformer.transform(dataset);
        Dataset<Row> resultDataset =datasetList.get(2);

        String expectedData = this.resourceFileAsString("/gtm-server/expected/test_transform_data_item.json");
        Assertions.assertEquals(expectedData, resultDataset.first().prettyJson());

    }


    @Test
    void test_transform_data_user() throws IOException {
        // DOWNLOAD_FILE=0 ./gradlew clean test --info --tests software.aws.solution.clickstream.gtm.GTMServerDataTransformerTest.test_transform_data_user
        System.setProperty(APP_IDS_PROP, "testApp");
        System.setProperty(PROJECT_ID_PROP, "test_project_id_gtm_server");
        System.setProperty(DEBUG_LOCAL_PROP, "true");
        System.setProperty(WAREHOUSE_DIR_PROP, "/tmp/warehouse/gtm/test_transform_data_user/");

        Dataset<Row> dataset =
                spark.read().json(requireNonNull(getClass().getResource("/gtm-server/server-all.json")).getPath());

        List<Dataset<Row>> datasetList = transformer.transform(dataset);
        Dataset<Row> resultDataset =datasetList.get(3).filter(col("user_id").isNotNull());

        String expectedData = this.resourceFileAsString("/gtm-server/expected/test_transform_data_user.json");
        Assertions.assertEquals(expectedData, resultDataset.first().prettyJson());

    }


    @Test
    void test_transform_data_user_login() throws IOException {
        // DOWNLOAD_FILE=0 ./gradlew clean test --info --tests software.aws.solution.clickstream.gtm.GTMServerDataTransformerTest.test_transform_data_user_login
        System.setProperty(APP_IDS_PROP, "testApp");
        System.setProperty(PROJECT_ID_PROP, "test_project_id_gtm_server");
        System.setProperty(DEBUG_LOCAL_PROP, "true");
        System.setProperty(WAREHOUSE_DIR_PROP, "/tmp/warehouse/gtm/test_transform_data_user_login/");

        Dataset<Row> dataset =
                spark.read().json(requireNonNull(getClass().getResource("/gtm-server/server-user-login.json")).getPath());

        List<Dataset<Row>> datasetList = transformer.transform(dataset);
        Dataset<Row> resultDataset =datasetList.get(3).filter(col("user_id").isNotNull());

        String expectedData = this.resourceFileAsString("/gtm-server/expected/test_transform_data_user_login.json");
        Assertions.assertEquals(expectedData, resultDataset.first().prettyJson());

    }

    @Test
    void test_transform_data_user_login2() throws IOException {
        // DOWNLOAD_FILE=0 ./gradlew clean test --info --tests software.aws.solution.clickstream.gtm.GTMServerDataTransformerTest.test_transform_data_user_login2
        System.setProperty(APP_IDS_PROP, "testApp");
        System.setProperty(PROJECT_ID_PROP, "test_project_id_gtm_server");
        System.setProperty(DEBUG_LOCAL_PROP, "true");
        System.setProperty(WAREHOUSE_DIR_PROP, "/tmp/warehouse/gtm/test_transform_data_user_login2/");

        Dataset<Row> dataset =
                spark.read().json(requireNonNull(getClass().getResource("/gtm-server/server-user-login2.json")).getPath());

        List<Dataset<Row>> datasetList = transformer.transform(dataset);
        Dataset<Row> resultDataset =datasetList.get(3).filter(col("user_id").isNotNull());

        String expectedData = this.resourceFileAsString("/gtm-server/expected/test_transform_data_user_login2.json");
        Assertions.assertEquals(expectedData, resultDataset.first().prettyJson());

    }

}
