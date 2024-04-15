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
import software.aws.solution.clickstream.model.*;
import software.aws.solution.clickstream.transformer.*;

import java.io.*;

import static java.util.Objects.*;

public class MaxLengthTransformerV2Test extends BaseSparkTest {
    @Test
    public void test_max_len_transform_v2() throws IOException {
        // DOWNLOAD_FILE=0 ./gradlew clean test --info --tests software.aws.solution.clickstream.MaxLengthTransformerV2Test.test_max_len_transform_v2
        Dataset<Row> dataset =
                spark.read().schema(ModelV2.EVENT_TYPE).json(requireNonNull(getClass().getResource("/event_v2/max_len_input.json")).getPath());

        Dataset<Row> outDataset = MaxLengthTransformerV2.runMaxLengthTransformerForEventV2(dataset);

        String actualData = outDataset.first().prettyJson();
        String expectedStr = this.resourceFileAsString("/event_v2/expected/test_max_len_transform_v2.json");
        Assertions.assertEquals(expectedStr, actualData);
    }
}
