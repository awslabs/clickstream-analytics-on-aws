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

import org.apache.spark.sql.Dataset;
import org.apache.spark.sql.Row;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.lang.reflect.Method;
import java.util.List;

import static java.util.Objects.requireNonNull;
import static software.aws.solution.clickstream.ContextUtil.APP_IDS_PROP;
import static software.aws.solution.clickstream.ContextUtil.PROJECT_ID_PROP;
import static software.aws.solution.clickstream.ETLRunner.TRANSFORM_METHOD_NAME;

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
        Assertions.assertEquals(expectedJson, eventParams.first().prettyJson());
    }


    @Test
    public void should_transform_items() throws IOException {
        // DOWNLOAD_FILE=0 ./gradlew clean test --info --tests software.aws.solution.clickstream.TransformerV2Test.should_transform_items
        System.setProperty(APP_IDS_PROP, "uba-app");
        System.setProperty(PROJECT_ID_PROP, "test_project_id_01");

        Dataset<Row> dataset =
                spark.read().json(requireNonNull(getClass().getResource("/original_data_with_items.json")).getPath());
        List<Dataset<Row>> transformedDatasets = transformer.transform(dataset);
        Dataset<Row> datasetItems = transformedDatasets.get(2);

        String schema =  datasetItems.schema().prettyJson();
        String expectedSchema = this.resourceFileAsString("/expected/schema-item.json");
        Assertions.assertEquals(expectedSchema, schema);

        String expectedJson = this.resourceFileAsString("/expected/transform_v2_item0.json");
        Assertions.assertEquals(expectedJson, datasetItems.first().prettyJson());
        Assertions.assertEquals(3, datasetItems.count());
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
        Assertions.assertEquals(expectedJson, datasetUser.first().prettyJson());
        Assertions.assertEquals(1, datasetUser.count());
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