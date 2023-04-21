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

package sofeware.aws.solution.clickstream;

import org.apache.spark.sql.Dataset;
import org.apache.spark.sql.Row;
import org.junit.jupiter.api.Test;

import static java.util.Objects.requireNonNull;
import static org.junit.jupiter.api.Assertions.assertEquals;

class CleanerTest extends BaseSparkTest {
    private final Cleaner cleaner = new Cleaner();

    @Test
    public void should_clean_normal_data() {
        System.setProperty("app.ids", "uba-app");

        Dataset<Row> dataset = spark.read().json(requireNonNull(getClass().getResource("/original_data.json")).getPath());
        Dataset<Row> cleanedDataset = cleaner.clean(dataset);

        assertEquals(2, cleanedDataset.count());
    }

    @Test
    public void should_clean_when_data_has_corrupt_records() {
        String path = requireNonNull(getClass().getResource("/")).getPath();
        System.setProperty("job.data.uri", path);
        System.setProperty("app.ids", "uba-app");

        Dataset<Row> dataset =
                spark.read().json(requireNonNull(getClass().getResource("/original_data_with_error.json")).getPath());
        Dataset<Row> cleanedDataset = cleaner.clean(dataset);

        assertEquals(0, cleanedDataset.count());
    }
}