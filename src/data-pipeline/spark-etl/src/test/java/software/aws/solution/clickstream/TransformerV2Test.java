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
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.lang.reflect.Method;
import java.util.List;

import static java.util.Objects.requireNonNull;
import static org.apache.spark.sql.functions.*;
import static software.aws.solution.clickstream.ContextUtil.*;
import static software.aws.solution.clickstream.ETLRunner.TRANSFORM_METHOD_NAME;
import static software.aws.solution.clickstream.TransformerV2.FULL_SUFFIX;
import static software.aws.solution.clickstream.TransformerV2.INCREMENTAL_SUFFIX;

@Slf4j
class TransformerV2Test extends BaseSparkTest {

    private final TransformerV2 transformer = new TransformerV2();

    @Test
    public void should_transform_event() throws IOException {
        // DOWNLOAD_FILE=0 ./gradlew clean test --info --tests software.aws.solution.clickstream.TransformerV2Test.should_transform_event
        System.setProperty(APP_IDS_PROP, "uba-app");
        System.setProperty(PROJECT_ID_PROP, "test_project_id_01");

        Dataset<Row> dataset =
                spark.read().json(requireNonNull(getClass().getResource("/original_data_with_items.json")).getPath());
        List<Dataset<Row>> transformedDatasets = transformer.transform(dataset);
        Dataset<Row> datasetEvent = transformedDatasets.get(0);

        datasetEvent.printSchema();
        String eventSchema =  datasetEvent.schema().prettyJson();
        String expectedSchema = this.resourceFileAsString("/expected/schema-event.json");
        Assertions.assertEquals(expectedSchema, eventSchema);

        System.out.println(datasetEvent.first().prettyJson());
        String expectedJson = this.resourceFileAsString("/expected/transform_v2_event.json");
        Assertions.assertEquals(expectedJson, datasetEvent.first().prettyJson());
    }

    @Test
    public void should_transform_event_params() throws IOException {
        // DOWNLOAD_FILE=0 ./gradlew clean test --info --tests software.aws.solution.clickstream.TransformerV2Test.should_transform_event_params
        System.setProperty(APP_IDS_PROP, "uba-app");
        System.setProperty(PROJECT_ID_PROP, "test_project_id_01");

        Dataset<Row> dataset =
                spark.read().json(requireNonNull(getClass().getResource("/original_data_with_items.json")).getPath());
        List<Dataset<Row>> transformedDatasets = transformer.transform(dataset);
        Dataset<Row> eventParams = transformedDatasets.get(1);

        eventParams.printSchema();
        String schema =  eventParams.schema().prettyJson();
        String expectedSchema = this.resourceFileAsString("/expected/schema-event_parameter.json");
        Assertions.assertEquals(expectedSchema, schema);

        String expectedJson = this.resourceFileAsString("/expected/transform_v2_event_params.json");
        Dataset<Row> eventParams1 = eventParams.where(col("event_id").equalTo(lit("1fcd7f5b-9529-4977-a303-e8c7e39db7b898")));

        String rowsJson = datasetToPrettyJson(eventParams1);
        Assertions.assertEquals(expectedJson, rowsJson);
    }

    @Test
    public void should_transform_items() throws IOException {
        // DOWNLOAD_FILE=0 ./gradlew clean test --info --tests software.aws.solution.clickstream.TransformerV2Test.should_transform_items
        System.setProperty(APP_IDS_PROP, "uba-app");
        System.setProperty(PROJECT_ID_PROP, "test_project_id_01");

        Dataset<Row> dataset =
                spark.read().json(requireNonNull(getClass().getResource("/original_data_with_items.json")).getPath());
        List<Dataset<Row>> transformedDatasets = transformer.transform(dataset);
        String itemId = "item_id034394ldmf3";
        Dataset<Row> itemsDataset = transformedDatasets.get(2);
        Dataset<Row> datasetItem3 = itemsDataset.filter(col("id").equalTo(itemId));

        String schema =  itemsDataset.schema().prettyJson();
        String expectedSchema = this.resourceFileAsString("/expected/schema-item.json");
        Assertions.assertEquals(expectedSchema, schema);

        String expectedJson = this.resourceFileAsString("/expected/transform_v2_item0.json");
        Assertions.assertEquals(expectedJson, datasetItem3.first().prettyJson());
        Assertions.assertEquals(3, itemsDataset.count());
    }

    @Test
    public void should_transform_user() throws IOException {
        // DOWNLOAD_FILE=0 ./gradlew clean test --info --tests software.aws.solution.clickstream.TransformerV2Test.should_transform_user
        System.setProperty(APP_IDS_PROP, "uba-app");
        System.setProperty(PROJECT_ID_PROP, "test_project_id_01");

        Dataset<Row> dataset =
                spark.read().json(requireNonNull(getClass().getResource("/original_data_with_user_profile_set.json")).getPath());
        List<Dataset<Row>> transformedDatasets = transformer.transform(dataset);
        Dataset<Row> datasetUser = transformedDatasets.get(3);

        String schema =  datasetUser.schema().prettyJson();
        String expectedSchema = this.resourceFileAsString("/expected/schema-user.json");
        Assertions.assertEquals(expectedSchema, schema);

        String expectedJson = this.resourceFileAsString("/expected/transform_v2_user.json");
        datasetUser = datasetUser.filter(expr("user_pseudo_id='uuid1-231jdf'"));
        Assertions.assertEquals(expectedJson, datasetUser.first().prettyJson());
        Assertions.assertEquals(1, datasetUser.count());
    }

    @Test
    public void should_transform_user_with_page_referer() throws IOException {
        // DOWNLOAD_FILE=0 ./gradlew clean test --info --tests software.aws.solution.clickstream.TransformerV2Test.should_transform_user_with_page_referer
        System.setProperty(APP_IDS_PROP, "uba-app");
        System.setProperty(PROJECT_ID_PROP, "test_project_id_01");

        Dataset<Row> dataset =
                spark.read().json(requireNonNull(getClass().getResource("/original_data_with_user_profile_set2.json")).getPath());
        List<Dataset<Row>> transformedDatasets = transformer.transform(dataset);
        Dataset<Row> datasetUser = transformedDatasets.get(3);

        String schema =  datasetUser.schema().prettyJson();
        String expectedSchema = this.resourceFileAsString("/expected/schema-user.json");
        Assertions.assertEquals(expectedSchema, schema);

        String expectedJson = this.resourceFileAsString("/expected/transform_v2_user2.json");

        Dataset<Row> datasetUser1 = datasetUser.filter(expr("user_pseudo_id='uuid1-9844af32'"));
        Assertions.assertEquals(expectedJson, datasetUser1.first().prettyJson());
        Assertions.assertEquals(1, datasetUser1.count());
    }

    @Test
    public void should_transform_save_state_data_temp_table() throws IOException {
        // DOWNLOAD_FILE=0 ./gradlew clean test --info --tests software.aws.solution.clickstream.TransformerV2Test.should_transform_save_state_data_temp_table
        System.setProperty(APP_IDS_PROP, "uba-app");
        System.setProperty(PROJECT_ID_PROP, "test_project_id_01");
        System.setProperty("force.merge", "false");

        Dataset<Row> dataset =
                spark.read().json(requireNonNull(getClass().getResource("/original_data_with_user_profile_set2.json")).getPath());
        List<Dataset<Row>> transformedDatasets = transformer.transform(dataset);
        Dataset<Row> datasetUser = transformedDatasets.get(3);

        String dataDir = ContextUtil.getWarehouseDir();

        String tableName1 = dataDir + "/" + TransformerV2.TABLE_ETL_USER_TRAFFIC_SOURCE + FULL_SUFFIX ;
        String tableName2 = dataDir + "/" + TransformerV2.TABLE_ETL_USER_DEVICE_ID + FULL_SUFFIX;
        String tableName3 = dataDir + "/" + TransformerV2.TABLE_ETL_USER_PAGE_REFERER + FULL_SUFFIX;

        transformer.postTransform(datasetUser);
        Dataset<Row> d1 = spark.read().parquet(tableName1);
        Dataset<Row> d2 = spark.read().parquet(tableName2);
        Dataset<Row> d3 = spark.read().parquet(tableName3);

        String appId1 = d1.select("app_id").first().getAs(0);
        String appId2 = d2.select("app_id").first().getAs(0);
        String appId3 = d3.select("app_id").first().getAs(0);
        log.info(String.format("%s, %s, %s", appId1, appId2, appId3));

        Assertions.assertEquals("uba-app", appId1);
        Assertions.assertEquals("uba-app", appId2);
        Assertions.assertEquals("uba-app", appId3);

        Integer dateStr1 = d1.select("update_date").orderBy(col("update_date").desc()).first().getAs(0);
        Integer dateStr2 = d2.select("update_date").orderBy(col("update_date").desc()).first().getAs(0);
        Integer dateStr3 = d3.select("update_date").orderBy(col("update_date").desc()).first().getAs(0);

        log.info(String.format("%s, %s, %s", dateStr1, dateStr2, dateStr3));

        Assertions.assertTrue(dateStr1.toString().matches("\\d{8}"));
        Assertions.assertTrue(dateStr1.toString().matches("\\d{8}"));
        Assertions.assertTrue(dateStr1.toString().matches("\\d{8}"));
    }

    @Test
    public void should_transform_save_state_data_incremental() throws IOException {
        // DOWNLOAD_FILE=0 ./gradlew clean test --info --tests software.aws.solution.clickstream.TransformerV2Test.should_transform_save_state_data_incremental
        System.setProperty(APP_IDS_PROP, "uba-app");
        System.setProperty(PROJECT_ID_PROP, "test_project_id_01");
        System.setProperty("force.merge", "true");

        Dataset<Row> dataset =
                spark.read().json(requireNonNull(getClass().getResource("/original_data_with_user_profile_set2.json")).getPath());
        List<Dataset<Row>> transformedDatasets = transformer.transform(dataset);
        Dataset<Row> datasetUser = transformedDatasets.get(3);
        transformer.postTransform(datasetUser);

        String dirPath = ContextUtil.getWarehouseDir();
        String pathUser = dirPath + "/user" + INCREMENTAL_SUFFIX;
        String pathItem = dirPath + "/item" + INCREMENTAL_SUFFIX;

        Dataset<Row> userDataset = spark.read().parquet(pathUser);
        Dataset<Row> itemDataset = spark.read().parquet(pathItem);

        String appId1 = userDataset.select("app_id").first().getAs(0);
        String appId2 = itemDataset.select("app_id").first().getAs(0);
        log.info(String.format("%s, %s", appId1, appId2));

        Assertions.assertEquals("uba-app", appId1);
        Assertions.assertEquals("uba-app", appId2);

        Integer dateStr1 = userDataset.select("update_date").first().getAs(0);
        Integer dateStr2 = itemDataset.select("update_date").first().getAs(0);

        log.info(String.format("dateStr1=%s, dateStr2=%s\n", dateStr1, dateStr2));

        Assertions.assertTrue(dateStr1.toString().matches("\\d{8}"));
        Assertions.assertTrue(dateStr1.toString().matches("\\d{8}"));

        System.setProperty("force.merge", "false");
        transformer.postTransform(datasetUser);
    }

        @Test
    public void check_return_type() throws ClassNotFoundException, NoSuchMethodException {
        // DOWNLOAD_FILE=0 ./gradlew clean test --info --tests software.aws.solution.clickstream.TransformerV2Test.check_return_type
        Class<?> aClass = Class.forName("software.aws.solution.clickstream.TransformerV2");
        Method transform = aClass.getMethod(TRANSFORM_METHOD_NAME, Dataset.class);
        Assertions.assertEquals("java.util.List", transform.getReturnType().getCanonicalName());

        Class<?> aClass1 = Class.forName("software.aws.solution.clickstream.Transformer");
        Method transform1 = aClass1.getMethod(TRANSFORM_METHOD_NAME, Dataset.class);
        Assertions.assertEquals("org.apache.spark.sql.Dataset", transform1.getReturnType().getCanonicalName());
    }
}