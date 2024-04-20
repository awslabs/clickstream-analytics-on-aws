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

import org.apache.spark.sql.*;
import org.junit.jupiter.api.*;
import software.aws.solution.clickstream.*;

import java.io.*;

import static java.util.Objects.*;
import static org.apache.spark.sql.functions.*;
import static software.aws.solution.clickstream.util.ContextUtil.*;
import static software.aws.solution.clickstream.common.Util.deCodeUri;

public class ServerDataConverterV2Test extends BaseSparkTest {
    ServerDataConverterV2 converter;
    @BeforeEach
    void setupConverter() {
        this.converter = new ServerDataConverterV2(getTestTransformConfig().getAppRuleConfig());
    }
    public static Dataset<Row> addFileName(Dataset<Row> dataset) {
        return dataset.withColumn(INPUT_FILE_NAME, input_file_name());
    }

    @Test
    void test_convert_single_data_v2() throws IOException {
        // DOWNLOAD_FILE=0 ./gradlew clean test --info --tests software.aws.solution.clickstream.gtm.ServerDataConverterV2Test.test_convert_single_data_v2
        System.setProperty(APP_IDS_PROP, "testApp");
        System.setProperty(PROJECT_ID_PROP, "test_project_id_gtm_server");
        System.setProperty(DEBUG_LOCAL_PROP, "true");

        Dataset<Row> dataset =
                spark.read().json(requireNonNull(getClass().getResource("/gtm-server/server-single.json")).getPath());
        Dataset<Row> outDataset = converter.transform(addFileName(dataset));

        outDataset = outDataset.filter(col("rid").equalTo("7da14049fe2aca7ea98c9f4b2b3c6f4a"));

        String expectedJson = resourceFileAsString("/gtm-server/expected/test_convert_single_data_v2.json");
        Assertions.assertEquals(expectedJson, replaceInputFileName(outDataset.first().prettyJson()));
    }


    @Test
    void test_convert_array_data_v2() throws IOException {
        // DOWNLOAD_FILE=0 ./gradlew clean test --info --tests software.aws.solution.clickstream.gtm.ServerDataConverterV2Test.test_convert_array_data_v2
        System.setProperty(APP_IDS_PROP, "testApp");
        System.setProperty(PROJECT_ID_PROP, "test_project_id_gtm_server");
        System.setProperty(DEBUG_LOCAL_PROP, "true");

        Dataset<Row> dataset =
                spark.read().json(requireNonNull(getClass().getResource("/gtm-server/server-array.json")).getPath());
        Dataset<Row> outDataset = converter.transform(addFileName(dataset))
                .filter(col("rid").equalTo("4a31fde2533e11dd2b0e7800720f6f86"));

        String expectedJson = resourceFileAsString("/gtm-server/expected/test_convert_array_data_v2.json");
        Assertions.assertEquals(expectedJson, replaceInputFileName(outDataset.first().prettyJson()));
    }


    @Test
    void test_convert_user_data_v2() throws IOException {
        // DOWNLOAD_FILE=0 ./gradlew clean test --info --tests software.aws.solution.clickstream.gtm.ServerDataConverterV2Test.test_convert_user_data_v2
        System.setProperty(APP_IDS_PROP, "testApp");
        System.setProperty(PROJECT_ID_PROP, "test_project_id_gtm_server");
        System.setProperty(DEBUG_LOCAL_PROP, "true");

        Dataset<Row> dataset =
                spark.read().json(requireNonNull(getClass().getResource("/gtm-server/server-user.json")).getPath());
        Dataset<Row> outDataset = converter.transform(addFileName(dataset))
                .filter(col("rid").equalTo("43cc3b89d7dfccbc2c906eb125ea25db"));

        String expectedJson = resourceFileAsString("/gtm-server/expected/test_convert_user_data_v2.json");
        Assertions.assertEquals(expectedJson, replaceInputFileName(outDataset.first().prettyJson()));
    }

    @Test
    void test_convert_user_data_user_props_v2() throws IOException {
        // DOWNLOAD_FILE=0 ./gradlew clean test --info --tests software.aws.solution.clickstream.gtm.ServerDataConverterV2Test.test_convert_user_data_user_props_v2
        System.setProperty(APP_IDS_PROP, "testApp");
        System.setProperty(PROJECT_ID_PROP, "test_project_id_gtm_server");
        System.setProperty(DEBUG_LOCAL_PROP, "true");

        Dataset<Row> dataset =
                spark.read().json(requireNonNull(getClass().getResource("/gtm-server/server-user-props.json")).getPath());
        Dataset<Row> outDataset = converter.transform(addFileName(dataset))
                .filter(col("rid").equalTo("42cc3b89d7dfccbc2c906eb125ea25db"));

        String expectedJson = resourceFileAsString("/gtm-server/expected/test_convert_user_data_user_props_v2.json");
        Assertions.assertEquals(expectedJson, replaceInputFileName(outDataset.first().prettyJson()));
    }

    @Test
    void test_convert_item_data_v2() throws IOException {
        // DOWNLOAD_FILE=0 ./gradlew clean test --info --tests software.aws.solution.clickstream.gtm.ServerDataConverterV2Test.test_convert_item_data_v2
        System.setProperty(APP_IDS_PROP, "testApp");
        System.setProperty(PROJECT_ID_PROP, "test_project_id_gtm_server");
        System.setProperty(DEBUG_LOCAL_PROP, "true");

        Dataset<Row> dataset =
                spark.read().json(requireNonNull(getClass().getResource("/gtm-server/server-items.json")).getPath());
        Dataset<Row> outDataset = converter.transform(addFileName(dataset))
                .filter(col("rid").equalTo("25aefd4cb653fd0fcbac33e24fd3f0ba"));

        String expectedJson = resourceFileAsString("/gtm-server/expected/test_convert_items_data_v2.json");
        Assertions.assertEquals(expectedJson, replaceInputFileName(outDataset.first().prettyJson()));
    }

    @Test
    void test_convert_no_js_client_id_v2() throws IOException {
        // DOWNLOAD_FILE=0 ./gradlew clean test --info --tests software.aws.solution.clickstream.gtm.ServerDataConverterV2Test.test_convert_no_js_client_id_v2
        System.setProperty(APP_IDS_PROP, "testApp");
        System.setProperty(PROJECT_ID_PROP, "gtm_server_demo_https");
        System.setProperty(DEBUG_LOCAL_PROP, "false");

        Dataset<Row> dataset =
                spark.read().json(requireNonNull(getClass().getResource("/gtm-server/test-convert-no-js-client-id.json")).getPath());

        Dataset<Row> outDataset = converter.transform(addFileName(dataset))
                .filter(col("rid").equalTo("7aec82f779dc4d911c272e704aa5e68c"));
        String expectedJson = resourceFileAsString("/gtm-server/expected/test_convert_no_js_client_id_v2.json");

        Assertions.assertEquals(expectedJson, replaceInputFileName(outDataset.first().prettyJson()));
        Assertions.assertEquals(4, outDataset.count());
    }

    @Test
    void test_convert_corrupt_data_v2() {
        // DOWNLOAD_FILE=0 ./gradlew clean test --info --tests software.aws.solution.clickstream.gtm.ServerDataConverterV2Test.test_convert_corrupt_data_v2
        System.setProperty(APP_IDS_PROP, "testApp");
        System.setProperty(PROJECT_ID_PROP, "gtm_server_demo_https");
        System.setProperty(DEBUG_LOCAL_PROP, "false");

        Dataset<Row> dataset =
                spark.read().json(requireNonNull(getClass().getResource("/gtm-server/test-convert-corrupt-v2.json")).getPath());
        Dataset<Row> outDataset = converter.transform(addFileName(dataset));

        Assertions.assertEquals(0, outDataset.count());
        Dataset<Row> corrupDataset =
                spark.read().json("/tmp/warehouse/etl_corrupted_json_gtm_server_data").filter(col("rid").equalTo("ssssss9dc4d91c00000v2"));
        Assertions.assertTrue(corrupDataset.count() > 0);

       Assertions.assertTrue(corrupDataset.select(expr("dataOut._corrupt_record"))
               .first().getString(0).startsWith("Cannot convert data to ClickstreamEvent")
       );
    }

    @Test
    void test_convert_fv_session_v2() throws IOException {
        // DOWNLOAD_FILE=0 ./gradlew clean test --info --tests software.aws.solution.clickstream.gtm.ServerDataConverterV2Test.test_convert_fv_session_v2
        System.setProperty(APP_IDS_PROP, "testApp");
        System.setProperty(PROJECT_ID_PROP, "gtm_server_demo_https");
        System.setProperty(DEBUG_LOCAL_PROP, "false");

        Dataset<Row> dataset =
                spark.read().json(requireNonNull(getClass().getResource("/gtm-server/test-convert-fv-session.json")).getPath());

        Dataset<Row> outDataset = converter.transform(addFileName(dataset));

        Assertions.assertEquals(5, outDataset.count());

        Dataset<Row> eventDataset = outDataset.select(explode(expr("dataOut.events")).alias("e")).select(expr("e.*"));

        Long fvCount = eventDataset.select("event_name").where(col("event_name").equalTo("_first_open")).count();
        Assertions.assertEquals(2, fvCount);
    }

    @Test
    void test_convert_session_start_v2() throws IOException {
        // DOWNLOAD_FILE=0 ./gradlew clean test --info --tests software.aws.solution.clickstream.gtm.ServerDataConverterV2Test.test_convert_session_start_v2
        System.setProperty(APP_IDS_PROP, "testApp");
        System.setProperty(PROJECT_ID_PROP, "sessionStartAppId");
        System.setProperty(DEBUG_LOCAL_PROP, "false");

        Dataset<Row> dataset =
                spark.read().json(requireNonNull(getClass().getResource("/gtm-server/test-convert-session-start.json")).getPath());

        Dataset<Row> outDataset = converter.transform(addFileName(dataset));

        Assertions.assertEquals(1, outDataset.count());

        Dataset<Row> eventDataset = outDataset.select(explode(expr("dataOut.events")).alias("e")).select(expr("e.*"));

        Assertions.assertEquals(2, eventDataset.count());

        System.out.print(eventDataset.first().prettyJson());

        Dataset<Row>  dataset1 = eventDataset.filter(expr("event_name = '_user_engagement'"));
        Dataset<Row>  dataset2 = eventDataset.filter(expr("event_name = '_session_start'"));

        String expectedJson1 = resourceFileAsString("/gtm-server/expected/test_convert_session_start1_v2.json");
        String expectedJson2 = resourceFileAsString("/gtm-server/expected/test_convert_session_start2_v2.json");

        Assertions.assertEquals(expectedJson1, replaceInputFileName(dataset1.first().prettyJson()), "_user_engagement event is not converted correctly");
        Assertions.assertEquals(expectedJson2, replaceInputFileName(dataset2.first().prettyJson()), "_session_start event is not converted correctly");

    }

    @Test
    void test_decode_uri_v2() {
        // DOWNLOAD_FILE=0 ./gradlew clean test --info --tests software.aws.solution.clickstream.gtm.ServerDataConverterV2Test.test_decode_uri_v2
        String uri = "https://www.bing.com/search?q=%E4%B8%AD%E5%9B%BD%E4%BD%A0%E5%A5%BD&qs=n&form=QBRE&=%25eManage%20Your%20Search%20History%25E&sp=-1&lq=0&pq=%E4%B8%AD%E5%9B%BD%E4%BD%A0%E5%A5%BD&sc=4-4&sk=&cvid=8AAED8D2E8F14915AAF3426E1B6EFB9E&ghsh=0&ghacc=0&ghpl=";
        String decodeUri = deCodeUri(uri);
        Assertions.assertEquals(
                "https://www.bing.com/search?q=中国你好&qs=n&form=QBRE&=%eManage Your Search History%E&sp=-1&lq=0&pq=中国你好&sc=4-4&sk=&cvid=8AAED8D2E8F14915AAF3426E1B6EFB9E&ghsh=0&ghacc=0&ghpl=",
                decodeUri
        );
        decodeUri = deCodeUri(null);
        Assertions.assertNull(decodeUri);
    }

}
