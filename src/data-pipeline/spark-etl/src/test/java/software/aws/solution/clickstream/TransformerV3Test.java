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

import lombok.extern.slf4j.Slf4j;
import org.apache.spark.sql.Dataset;
import org.apache.spark.sql.Row;
import org.apache.spark.sql.SaveMode;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import software.aws.solution.clickstream.common.Constant;
import software.aws.solution.clickstream.util.*;

import java.io.IOException;
import java.util.*;

import static java.util.Objects.requireNonNull;
import static org.apache.spark.sql.functions.*;
import static software.aws.solution.clickstream.util.ContextUtil.*;
import static software.aws.solution.clickstream.util.DatasetUtil.*;
import static software.aws.solution.clickstream.TransformerV3.ETL_USER_V2_PROPS;


@Slf4j
class TransformerV3Test extends BaseSparkTest {

    private TransformerV3 transformer;
    @BeforeEach
    void setupTransformer() {
        this.transformer = new TransformerV3(getTestTransformConfig("uba-app"));
    }

    @Test
    public void should_transform_event_v2() throws IOException {
        // DOWNLOAD_FILE=0 ./gradlew clean test --info --tests software.aws.solution.clickstream.TransformerV3Test.should_transform_event_v2
        System.setProperty(APP_IDS_PROP, "uba-app");
        System.setProperty(PROJECT_ID_PROP, "test_project_id_01");
        String testWarehouseDir = "/tmp/warehouse/should_transform_event_v2/" + new Date().getTime();
        System.setProperty(WAREHOUSE_DIR_PROP, testWarehouseDir);

        Dataset<Row> dataset =
                spark.read().json(requireNonNull(getClass().getResource("/original_data_with_items.json")).getPath());
        Map<TableName, Dataset<Row>> transformedDatasets = transformer.transform(dataset);
        Dataset<Row> datasetEvent = transformedDatasets.get(TableName.EVENT_V2);

        String eventSchema = replaceSchemaString(datasetEvent.schema().prettyJson());
        String expectedSchema = this.resourceFileAsString("/expected/schema-event_v2.json");
        Assertions.assertEquals(expectedSchema, eventSchema);

        String expectedJson = this.resourceFileAsString("/event_v2/expected/transform_v3_event.json");
        Assertions.assertEquals(expectedJson, replaceDynData(datasetEvent.first().prettyJson()));
    }


    @Test
    public void should_transform_gzip_data() throws IOException {
        // DOWNLOAD_FILE=0 ./gradlew clean test --info --tests software.aws.solution.clickstream.TransformerV3Test.should_transform_gzip_data
        System.setProperty(APP_IDS_PROP, "uba-app");
        System.setProperty(PROJECT_ID_PROP, "test_project_id_01");
        String testWarehouseDir = "/tmp/warehouse/should_transform_event_v2/" + new Date().getTime();
        System.setProperty(WAREHOUSE_DIR_PROP, testWarehouseDir);

        Dataset<Row> dataset =
                spark.read().json(requireNonNull(getClass().getResource("/original_data.json")).getPath());
        Map<TableName, Dataset<Row>> transformedDatasets = transformer.transform(dataset);
        Dataset<Row> datasetEvent = transformedDatasets.get(TableName.EVENT_V2);

        String expectedJson = this.resourceFileAsString("/event_v2/expected/transform_v3_gzip_event.json");
        Assertions.assertEquals(expectedJson, replaceDynData(datasetEvent.first().prettyJson()));
        System.out.printf(datasetEvent.first().prettyJson());
    }

    @Test
    public void should_transform_item_v2() throws IOException {
        // DOWNLOAD_FILE=0 ./gradlew clean test --info --tests software.aws.solution.clickstream.TransformerV3Test.should_transform_item_v2
        System.setProperty(APP_IDS_PROP, "uba-app");
        System.setProperty(PROJECT_ID_PROP, "test_project_id_01");
        String testWarehouseDir = "/tmp/warehouse/should_transform_item_v2/" + new Date().getTime();
        System.setProperty(WAREHOUSE_DIR_PROP, testWarehouseDir);

        Dataset<Row> dataset =
                spark.read().json(requireNonNull(getClass().getResource("/original_data_with_items.json")).getPath());
        Map<TableName, Dataset<Row>> transformedDatasets = transformer.transform(dataset);
        Dataset<Row> itemsDataset = transformedDatasets.get(TableName.ITEM_V2);

        String schema = replaceSchemaString(itemsDataset.schema().prettyJson());
        String expectedSchema = this.resourceFileAsString("/expected/schema-item_v2.json");
        Assertions.assertEquals(expectedSchema, schema);

        String itemId = "item_id034394ldmf3";
        Dataset<Row> datasetItem3 = itemsDataset.filter(col("item_id").equalTo(itemId));
        String expectedJson = this.resourceFileAsString("/event_v2/expected/transform_v3_item.json");
        Assertions.assertEquals(expectedJson, replaceDynData(datasetItem3.first().prettyJson()));
        Assertions.assertEquals(3, itemsDataset.count());
    }

    @Test
    public void should_transform_user_v2() throws IOException {
        // DOWNLOAD_FILE=0 ./gradlew clean test --info --tests software.aws.solution.clickstream.TransformerV3Test.should_transform_user_v2
        System.setProperty(APP_IDS_PROP, "uba-app");
        System.setProperty(PROJECT_ID_PROP, "test_project_id_01");
        String testWarehouseDir = "/tmp/warehouse/should_transform_user_v2/" + new Date().getTime();
        System.setProperty(WAREHOUSE_DIR_PROP, testWarehouseDir);

        Dataset<Row> dataset =
                spark.read().json(requireNonNull(getClass().getResource("/original_data_with_user_profile_set.json")).getPath());
        Map<TableName, Dataset<Row>> transformedDatasets = transformer.transform(dataset);
        Dataset<Row> datasetUser = transformedDatasets.get(TableName.USER_V2);

        String schema =  replaceSchemaString(datasetUser.schema().prettyJson());
        String expectedSchema = this.resourceFileAsString("/expected/schema-user_v2.json");
        Assertions.assertEquals(expectedSchema, schema);

        String expectedJson = this.resourceFileAsString("/event_v2/expected/transform_v3_user.json");
        datasetUser = datasetUser.filter(expr("user_pseudo_id='uuid1-231jdf'"));
        Assertions.assertEquals(expectedJson, replaceDynData(datasetUser.first().prettyJson()));
        Assertions.assertEquals(1, datasetUser.count());
    }

    @Test
    public void should_transform_user_with_page_referer_v2() throws IOException {
        // DOWNLOAD_FILE=0 ./gradlew clean test --info --tests software.aws.solution.clickstream.TransformerV3Test.should_transform_user_with_page_referer_v2
        System.setProperty(APP_IDS_PROP, "uba-app");
        System.setProperty(PROJECT_ID_PROP, "test_project_id_01");
        String testWarehouseDir = "/tmp/warehouse/should_transform_user_with_page_referer_v2/" + new Date().getTime();
        System.setProperty(WAREHOUSE_DIR_PROP, testWarehouseDir);

        Dataset<Row> dataset =
                spark.read().json(requireNonNull(getClass().getResource("/original_data_with_user_profile_set2.json")).getPath());
        Map<TableName, Dataset<Row>> transformedDatasets = transformer.transform(dataset);
        Dataset<Row> datasetUser = transformedDatasets.get(TableName.USER_V2);

        String expectedJson = this.resourceFileAsString("/event_v2/expected/transform_v3_user2.json");

        Dataset<Row> datasetUser1 = datasetUser.filter(expr("user_pseudo_id='uuid1-9844af32'"));
        Assertions.assertEquals(expectedJson, replaceDynData(datasetUser1.first().prettyJson()));
        Assertions.assertEquals(1, datasetUser1.count());
    }
    
    @Test
    public void should_transform_save_state_data_temp_table_v2() throws IOException {
        // DOWNLOAD_FILE=0 ./gradlew clean test --info --tests software.aws.solution.clickstream.TransformerV3Test.should_transform_save_state_data_temp_table_v2
        System.setProperty(APP_IDS_PROP, "uba-app");
        System.setProperty(PROJECT_ID_PROP, "test_project_id_01");
        System.setProperty("force.merge", "false");

        String testWarehouseDir = "/tmp/warehouse/should_transform_save_state_data_temp_table_v2/" + new Date().getTime();
        System.setProperty(WAREHOUSE_DIR_PROP, testWarehouseDir);

        Dataset<Row> dataset =
                spark.read().json(requireNonNull(getClass().getResource("/original_data_with_user_profile_set2.json")).getPath());
        Map<TableName, Dataset<Row>> transformedDatasets = transformer.transform(dataset);
        Dataset<Row> datasetEvent = transformedDatasets.get(TableName.EVENT_V2);
        String dataDir = ContextUtil.getWarehouseDir();

        String tableName1 = dataDir + "/" + ETL_USER_V2_PROPS + FULL_SUFFIX  + TABLE_VERSION_SUFFIX_V1;

        transformer.postTransform(datasetEvent);
        Dataset<Row> d1 = spark.read().parquet(tableName1);
        String appId1 = d1.select("app_id").first().getAs(0);
        Assertions.assertEquals("uba-app", appId1);
        Integer dateStr1 = d1.select("update_date").orderBy(col("update_date").desc()).first().getAs(0);
        Assertions.assertTrue(dateStr1.toString().matches("\\d{8}"));

    }

    @Test
    public void should_transform_user_with_first_open_v2() throws IOException {
        // DOWNLOAD_FILE=0 ./gradlew clean test --info --tests software.aws.solution.clickstream.TransformerV3Test.should_transform_user_with_first_open_v2
        System.setProperty(APP_IDS_PROP, "uba-app");
        System.setProperty(PROJECT_ID_PROP, "test_project_id_01");
        String testWarehouseDir = "/tmp/warehouse/should_transform_user_with_first_open_v2/" + new Date().getTime();
        System.setProperty(WAREHOUSE_DIR_PROP, testWarehouseDir);

        Dataset<Row> dataset =
                spark.read().json(requireNonNull(getClass().getResource("/original_data_with_first_open.json")).getPath());
        Map<TableName, Dataset<Row>> transformedDatasets = transformer.transform(dataset);
        Dataset<Row> datasetUser = transformedDatasets.get(TableName.USER_V2);


        String expectedJson = this.resourceFileAsString("/event_v2/expected/transform_v3_user_first_open.json");
        datasetUser = datasetUser.filter(expr("user_pseudo_id='uuid1_first_open1'"));
        Assertions.assertEquals(expectedJson, replaceDynData(datasetUser.first().prettyJson()));
        Assertions.assertEquals(1, datasetUser.count());
    }


    @Test
    public void should_transform_with_traffic_source_event_v2() throws IOException {
        // DOWNLOAD_FILE=0 ./gradlew clean test --info --tests software.aws.solution.clickstream.TransformerV3Test.should_transform_with_traffic_source_event_v2
        System.setProperty(APP_IDS_PROP, "uba-app");
        System.setProperty(PROJECT_ID_PROP, "test_project_id_01");
        String testWarehouseDir = "/tmp/warehouse/should_transform_with_traffic_source_event_v2/" + new Date().getTime();
        System.setProperty(WAREHOUSE_DIR_PROP, testWarehouseDir);

        Dataset<Row> dataset =
                spark.read().json(requireNonNull(getClass().getResource("/original_data_with_traffic_source_v2.json")).getPath());
        Map<TableName, Dataset<Row>> transformedDatasets = transformer.transform(dataset);
        Dataset<Row> datasetEvent = transformedDatasets.get(TableName.EVENT_V2)
                .filter(col("event_id").equalTo("event_id_xxx1_web_session_start"));

        String expectedJsonEvent = this.resourceFileAsString("/event_v2/expected/transform_v3_traffic_source_event.json");
        Assertions.assertEquals(expectedJsonEvent, replaceDynData(datasetEvent.first().prettyJson()), "transform_v3_traffic_source_event");
    }


    @Test
    public void should_transform_with_traffic_source_user_v2() throws IOException {
        // DOWNLOAD_FILE=0 ./gradlew clean test --info --tests software.aws.solution.clickstream.TransformerV3Test.should_transform_with_traffic_source_user_v2
        System.setProperty(APP_IDS_PROP, "uba-app");
        System.setProperty(PROJECT_ID_PROP, "test_project_id_01");
        String testWarehouseDir = "/tmp/warehouse/should_transform_with_traffic_source_user_v2/" + new Date().getTime();
        System.setProperty(WAREHOUSE_DIR_PROP, testWarehouseDir);

        Dataset<Row> dataset =
                spark.read().json(requireNonNull(getClass().getResource("/original_data_with_traffic_source_v2.json")).getPath());
        Map<TableName, Dataset<Row>> transformedDatasets = transformer.transform(dataset);
        Dataset<Row> datasetUser = transformedDatasets.get(TableName.USER_V2);

        String expectedJsonUser = this.resourceFileAsString("/event_v2/expected/transform_v3_traffic_source_user.json");
        datasetUser = datasetUser.filter(expr("user_pseudo_id='unique_id_web_1'"));
        Assertions.assertEquals(expectedJsonUser, replaceDynData(datasetUser.first().prettyJson()), "transform_v3_traffic_source_user");
    }

    @Test
    public void should_transform_with_traffic_source_session_v2() throws IOException {
        // DOWNLOAD_FILE=0 ./gradlew clean test --info --tests software.aws.solution.clickstream.TransformerV3Test.should_transform_with_traffic_source_session_v2
        System.setProperty(APP_IDS_PROP, "uba-app");
        System.setProperty(PROJECT_ID_PROP, "test_project_id_01");
        String testWarehouseDir = "/tmp/warehouse/should_transform_with_traffic_source_session_v2/" + new Date().getTime();
        System.setProperty(WAREHOUSE_DIR_PROP, testWarehouseDir);

        Dataset<Row> dataset =
                spark.read().json(requireNonNull(getClass().getResource("/original_data_with_traffic_source_v2.json")).getPath());
        Map<TableName, Dataset<Row>> transformedDatasets = transformer.transform(dataset);

        Dataset<Row> datasetSession = transformedDatasets.get(TableName.SESSION);

        datasetSession.write().mode(SaveMode.Overwrite).json("/tmp/session/");

        datasetSession = datasetSession.filter(col(Constant.USER_PSEUDO_ID).equalTo("unique_id_iOS_1").and(
                col(Constant.SESSION_ID).equalTo("see000201912dk-23u92-1df0020")
        ));
        String expectedJsonSession = this.resourceFileAsString("/event_v2/expected/transform_v3_traffic_source_session.json");

        Assertions.assertEquals(expectedJsonSession, replaceDynData(datasetSession.first().prettyJson()), "transform_v3_traffic_source_session");
    }


    @Test
    public void should_transform_user_item_with_field_len_gt_255_v2() throws IOException {
        // DOWNLOAD_FILE=0 ./gradlew clean test --info --tests software.aws.solution.clickstream.TransformerV3Test.should_transform_user_item_with_field_len_gt_255_v2
        System.setProperty(APP_IDS_PROP, "maxLenTestItemUser");
        System.setProperty(PROJECT_ID_PROP, "test_project_id_01");
        System.setProperty(WAREHOUSE_DIR_PROP, "/tmp/warehouse/should_transform_user_item_with_field_len_gt_255_v2/" + new Date().getTime() + "/");

        Dataset<Row> dataset =
                spark.read().json(requireNonNull(getClass().getResource("/original_data_nozip_item_max_len.json")).getPath());
        Map<TableName, Dataset<Row>> transformedDatasets = transformer.transform(dataset);

        Dataset<Row> datasetEvent = transformedDatasets.get(TableName.EVENT_V2);
        String itemId = "d3b237aekdme3ld3b237aekdme3ld3b237aekdme3ld3b237aekdme3ld3b237aekdme3ld3b237aekdme3ld3b237aekdme3ld3b237aekdme3ld3b237aekdme3ld3b237aekdme3ld3b237aekdme3ld3b237aekdme3ld3b237aekdme3ld3b237aekdme3ld3b237aekdme3ld3b237aekdme3ld3b237aekdme3ld3b237aekdme3ld3b";
        Dataset<Row> datasetItem = transformedDatasets.get(TableName.ITEM_V2).filter(expr(String.format("item_id='%s'", itemId)));
        Dataset<Row> datasetUser = transformedDatasets.get(TableName.USER_V2);

        String expectedJson0 = this.resourceFileAsString("/event_v2/expected/transform_v3_event_max_len2.json");
        Assertions.assertEquals(expectedJson0, replaceDynData(datasetEvent.first().prettyJson()), "transform_v3_event_max_len2");

        String expectedJson1 = this.resourceFileAsString("/event_v2/expected/transform_v3_item_max_len.json");
        Assertions.assertEquals(expectedJson1, replaceDynData(datasetItem.first().prettyJson()), "transform_v3_item_max_len");

        String expectedJson2 = this.resourceFileAsString("/event_v2/expected/transform_v3_user_max_len.json");
        Assertions.assertEquals(expectedJson2, replaceDynData(datasetUser.first().prettyJson()), "transform_v3_user_max_len");

    }
}