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
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;
import software.aws.solution.clickstream.BaseSparkTest;

import java.io.IOException;

import static java.util.Objects.requireNonNull;
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
        Dataset<Row> outDataset = converter.transform(dataset);
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
        Dataset<Row> outDataset = converter.transform(dataset);
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
        Dataset<Row> outDataset = converter.transform(dataset);
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
        Dataset<Row> outDataset = converter.transform(dataset);
        String expectedJson = resourceFileAsString("/gtm-server/expected/test_convert_items_data.json");
        Assertions.assertEquals(expectedJson, outDataset.first().prettyJson());
    }

}
