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
import org.apache.spark.sql.SaveMode;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;
import software.aws.solution.clickstream.BaseSparkTest;

import java.io.IOException;

import static java.util.Objects.requireNonNull;
import static org.apache.spark.sql.functions.col;
import static org.apache.spark.sql.functions.expr;
import static software.aws.solution.clickstream.ContextUtil.*;

public class ServerDataConverterTest extends BaseSparkTest {
    ServerDataConverter converter = new ServerDataConverter();

    @Test
    void test_convert_single_data() throws IOException {
        // DOWNLOAD_FILE=0 ./gradlew clean test --info --tests software.aws.solution.clickstream.gtm.ServerDataConverterTest.test_convert_single_data
        System.setProperty(APP_IDS_PROP, "testApp");
        System.setProperty(PROJECT_ID_PROP, "test_project_id_gtm_server");
        System.setProperty(DEBUG_LOCAL_PROP, "true");

        Dataset<Row> dataset =
                spark.read().json(requireNonNull(getClass().getResource("/gtm-server/server-single.json")).getPath());
        Dataset<Row> outDataset = converter.transform(dataset)
                .filter(col("rid").equalTo("7da14049fe2aca7ea98c9f4b2b3c6f4a"));
        String expectedJson = resourceFileAsString("/gtm-server/expected/test_convert_single_data.json");
        Assertions.assertEquals(expectedJson, outDataset.first().prettyJson());
    }


    @Test
    void test_convert_array_data() throws IOException {
        // DOWNLOAD_FILE=0 ./gradlew clean test --info --tests software.aws.solution.clickstream.gtm.ServerDataConverterTest.test_convert_array_data
        System.setProperty(APP_IDS_PROP, "testApp");
        System.setProperty(PROJECT_ID_PROP, "test_project_id_gtm_server");
        System.setProperty(DEBUG_LOCAL_PROP, "true");

        Dataset<Row> dataset =
                spark.read().json(requireNonNull(getClass().getResource("/gtm-server/server-array.json")).getPath());
        Dataset<Row> outDataset = converter.transform(dataset)
                .filter(col("rid").equalTo("4a31fde2533e11dd2b0e7800720f6f86"));
        String expectedJson = resourceFileAsString("/gtm-server/expected/test_convert_array_data.json");
        Assertions.assertEquals(expectedJson, outDataset.first().prettyJson());
    }


    @Test
    void test_convert_user_data() throws IOException {
        // DOWNLOAD_FILE=0 ./gradlew clean test --info --tests software.aws.solution.clickstream.gtm.ServerDataConverterTest.test_convert_user_data
        System.setProperty(APP_IDS_PROP, "testApp");
        System.setProperty(PROJECT_ID_PROP, "test_project_id_gtm_server");
        System.setProperty(DEBUG_LOCAL_PROP, "true");

        Dataset<Row> dataset =
                spark.read().json(requireNonNull(getClass().getResource("/gtm-server/server-user.json")).getPath());
        Dataset<Row> outDataset = converter.transform(dataset)
                .filter(col("rid").equalTo("43cc3b89d7dfccbc2c906eb125ea25db"));
        String expectedJson = resourceFileAsString("/gtm-server/expected/test_convert_user_data.json");
        Assertions.assertEquals(expectedJson, outDataset.first().prettyJson());
    }

    @Test
    void test_convert_item_data() throws IOException {
        // DOWNLOAD_FILE=0 ./gradlew clean test --info --tests software.aws.solution.clickstream.gtm.ServerDataConverterTest.test_convert_item_data
        System.setProperty(APP_IDS_PROP, "testApp");
        System.setProperty(PROJECT_ID_PROP, "test_project_id_gtm_server");
        System.setProperty(DEBUG_LOCAL_PROP, "true");

        Dataset<Row> dataset =
                spark.read().json(requireNonNull(getClass().getResource("/gtm-server/server-items.json")).getPath());
        Dataset<Row> outDataset = converter.transform(dataset)
                .filter(col("rid").equalTo("25aefd4cb653fd0fcbac33e24fd3f0ba"));
        String expectedJson = resourceFileAsString("/gtm-server/expected/test_convert_items_data.json");
        Assertions.assertEquals(expectedJson, outDataset.first().prettyJson());
    }

    @Test
    void test_convert_no_js_client_id() throws IOException {
        // DOWNLOAD_FILE=0 ./gradlew clean test --info --tests software.aws.solution.clickstream.gtm.ServerDataConverterTest.test_convert_no_js_client_id
        System.setProperty(APP_IDS_PROP, "testApp");
        System.setProperty(PROJECT_ID_PROP, "gtm_server_demo_https");
        System.setProperty(DEBUG_LOCAL_PROP, "false");

        Dataset<Row> dataset =
                spark.read().json(requireNonNull(getClass().getResource("/gtm-server/test-convert-no-js-client-id.json")).getPath());
        Dataset<Row> outDataset = converter.transform(dataset)
                .filter(col("rid").equalTo("7aec82f779dc4d911c272e704aa5e68c"));
        String expectedJson = resourceFileAsString("/gtm-server/expected/test_convert_no_js_client_id.json");
        Assertions.assertEquals(expectedJson, outDataset.first().prettyJson());
        Assertions.assertEquals(3, outDataset.count());
    }

    @Test
    void test_convert_corrupt_data() {
        // DOWNLOAD_FILE=0 ./gradlew clean test --info --tests software.aws.solution.clickstream.gtm.ServerDataConverterTest.test_convert_corrupt_data
        System.setProperty(APP_IDS_PROP, "testApp");
        System.setProperty(PROJECT_ID_PROP, "gtm_server_demo_https");
        System.setProperty(DEBUG_LOCAL_PROP, "false");

        Dataset<Row> dataset =
                spark.read().json(requireNonNull(getClass().getResource("/gtm-server/test-convert-corrupt.json")).getPath());
        Dataset<Row> outDataset = converter.transform(dataset);
        Assertions.assertEquals(0, outDataset.count());
        Dataset<Row> corrupDataset =
                spark.read().json("/tmp/warehouse/etl_gtm_corrupted_json_data");
        Assertions.assertTrue(corrupDataset.count() > 0);
    }

    @Test
    void test_convert_fv_session() throws IOException {
        // DOWNLOAD_FILE=0 ./gradlew clean test --info --tests software.aws.solution.clickstream.gtm.ServerDataConverterTest.test_convert_fv_session
        System.setProperty(APP_IDS_PROP, "testApp");
        System.setProperty(PROJECT_ID_PROP, "gtm_server_demo_https");
        System.setProperty(DEBUG_LOCAL_PROP, "false");

        Dataset<Row> dataset =
                spark.read().json(requireNonNull(getClass().getResource("/gtm-server/test-convert-fv-session.json")).getPath());

        Dataset<Row> outDataset = converter.transform(dataset);

        Assertions.assertEquals(7, outDataset.count());

        Long fvCount = outDataset.select(expr("dataOut.*")).select("event_name").where(col("event_name").equalTo("_first_open")).count();
        Assertions.assertEquals(2, fvCount);
    }

    @Test
    void test_convert_session_start() throws IOException {
        // DOWNLOAD_FILE=0 ./gradlew clean test --info --tests software.aws.solution.clickstream.gtm.ServerDataConverterTest.test_convert_session_start
        System.setProperty(APP_IDS_PROP, "testApp");
        System.setProperty(PROJECT_ID_PROP, "sessionStartAppId");
        System.setProperty(DEBUG_LOCAL_PROP, "false");

        Dataset<Row> dataset =
                spark.read().json(requireNonNull(getClass().getResource("/gtm-server/test-convert-session-start.json")).getPath());

        Dataset<Row> outDataset = converter.transform(dataset);

        Assertions.assertEquals(2, outDataset.count());

        Dataset<Row>  dataset1 = outDataset.filter(expr("dataOut.event_name == '_user_engagement'"));
        Dataset<Row>  dataset2 = outDataset.filter(expr("dataOut.event_name == '_session_start'"));

        String expectedJson1 = resourceFileAsString("/gtm-server/expected/test_convert_session_start1.json");
        String expectedJson2 = resourceFileAsString("/gtm-server/expected/test_convert_session_start2.json");

        Assertions.assertEquals(expectedJson1, dataset1.first().prettyJson(), "_user_engagement event is not converted correctly");
        Assertions.assertEquals(expectedJson2, dataset2.first().prettyJson(), "_session_start event is not converted correctly");

    }

}
