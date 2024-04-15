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
import software.aws.solution.clickstream.transformer.*;

import java.util.List;

import static java.util.Objects.requireNonNull;
import static org.apache.spark.sql.functions.col;
import static org.apache.spark.sql.functions.udf;

public class MaxLengthTransformerTest extends BaseSparkTest {
    @Test
    public void test_transform() {
        // DOWNLOAD_FILE=0 ./gradlew clean test --info --tests software.aws.solution.clickstream.MaxLengthTransformerTest.test_transform
        Dataset<Row> dataset =
                spark.read().json(requireNonNull(getClass().getResource("/user_cn_chars.json")).getPath());

        MaxLengthTransformer maxLengthTransformer = new MaxLengthTransformer();

        Dataset<Row> dataset1 = maxLengthTransformer.transform(dataset, List.of( "name", "address"), 10);

        Assertions.assertEquals("{\"address\":\"北京市\",\"age\":18,\"name\":\"刘先生\",\"phone\":\"13888888888\",\"sex\":\"M\",\"name_truncated\":false,\"address_truncated\":true}",
                dataset1.filter(col("name").equalTo("刘先生")).first().json());
        Assertions.assertEquals("{\"address\":\"陕西省\",\"age\":19,\"name\":\"李先生\",\"phone\":\"13888888889\",\"sex\":\"M\",\"name_truncated\":false,\"address_truncated\":true}",
                dataset1.filter(col("name").equalTo("李先生")).first().json());

    }

    @Test
    public void test_transform_null() {
        // DOWNLOAD_FILE=0 ./gradlew clean test --info --tests software.aws.solution.clickstream.MaxLengthTransformerTest.test_transform_null
        Assertions.assertNull(MaxLengthTransformer.checkStringValueLength(null, 1));
    }

    @Test
    public void test_transform_text() {
        // DOWNLOAD_FILE=0 ./gradlew clean test --info --tests software.aws.solution.clickstream.MaxLengthTransformerTest.test_transform_text
        Assertions.assertEquals("我爱", MaxLengthTransformer.checkStringValueLength("我爱你，亚马逊", 8));
    }

}
