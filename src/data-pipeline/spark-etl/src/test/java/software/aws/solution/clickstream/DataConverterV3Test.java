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

import org.apache.spark.sql.*;
import org.junit.jupiter.api.*;
import software.aws.solution.clickstream.transformer.*;

import java.io.*;

import static org.apache.spark.sql.functions.*;
import static software.aws.solution.clickstream.util.ContextUtil.PROJECT_ID_PROP;

public class DataConverterV3Test extends BaseSparkTest {
    private DataConverterV3 converter;
    @BeforeEach
    void setupConverter() {
        this.converter = new DataConverterV3(getTestTransformConfig().getAppRuleConfig());
    }

    public static Dataset<Row> addFileName(Dataset<Row> dataset) {
        return dataset.withColumn(INPUT_FILE_NAME, input_file_name());
    }
    @Test
    public void test_convert_data_v3() throws IOException {
        // ./gradlew clean test --info --tests software.aws.solution.clickstream.DataConverterV3Test.test_convert_data_v3

        String filePath = "/original_data_nozip_upload_time.json";
        Dataset<Row> dataset = readJsonDataset(filePath);
        dataset = addFileName(dataset);
        System.setProperty(PROJECT_ID_PROP, "projectId1");

        Dataset<Row> result = converter.transform(dataset);
        Assertions.assertEquals(5, result.count());
        result.printSchema();

        String dataJson = replaceInputFileName(result.first().prettyJson());
        String expectedJson = this.resourceFileAsString("/expected/test_convert_data_v3.json");
        Assertions.assertEquals(expectedJson, dataJson);
    }

    @Test
    public void test_convert_data_v3_invalid_data() throws IOException {
        // ./gradlew clean test --info --tests software.aws.solution.clickstream.DataConverterV3Test.test_convert_data_v3_invalid_data

        String whDir = setWarehouseDir("test_convert_data_v3_invalid_data");

        String filePath = "/original_data_null.json";
        Dataset<Row> dataset = readJsonDataset(filePath)
                .withColumn("upload_timestamp", lit(null))
                .withColumn("rid", lit("test-rid"))
                .withColumn("ip", lit(null))
                .withColumn(INPUT_FILE_NAME, lit(null));

        dataset = addFileName(dataset);
        System.setProperty(PROJECT_ID_PROP, "projectId1");

        Dataset<Row> result = converter.transform(dataset);
        Assertions.assertEquals(0, result.count());
        Assertions.assertTrue(result.schema().prettyJson().contains("dataOut"));

        // etl_corrupted_json_" + getName().toLowerCase()
        String corruptedDir = whDir + "/etl_corrupted_json_clickstream/jobName=test-job";
        System.out.printf("corruptedDir: %s\n", corruptedDir);
        Assertions.assertTrue(new File(corruptedDir).exists(), corruptedDir + " should exist");
    }

}
