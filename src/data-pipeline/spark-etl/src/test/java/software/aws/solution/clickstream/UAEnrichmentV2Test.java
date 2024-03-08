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

import java.io.*;

import static java.util.Objects.requireNonNull;

public class UAEnrichmentV2Test extends BaseSparkTest {
    UAEnrichmentV2 converter = new UAEnrichmentV2();
    @Test
    void test_enrich_UA_v2() throws IOException {
        // DOWNLOAD_FILE=0 ./gradlew clean test --info --tests software.aws.solution.clickstream.UAEnrichmentV2Test.test_enrich_UA_v2
        Dataset<Row> dataset =
                spark.read().json(requireNonNull(getClass().getResource("/event_v2/transformed_data_event_v2.json")).getPath());
        Dataset<Row> outDataset = converter.transform(dataset);

        String expectedJson = this.resourceFileAsString("/event_v2/expected/test_enrich_UA_v2.json");

        Assertions.assertEquals(expectedJson, outDataset.select(
                ModelV2.DEVICE_UA_BROWSER,
                ModelV2.DEVICE_UA_BROWSER_VERSION,
                ModelV2.DEVICE_UA_DEVICE,
                ModelV2.DEVICE_UA_DEVICE_CATEGORY
        ).first().prettyJson());
    }

}
