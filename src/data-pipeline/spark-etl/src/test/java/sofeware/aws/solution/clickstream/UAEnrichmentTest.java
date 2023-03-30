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

class UAEnrichmentTest extends BaseSparkTest {

    private final UAEnrichment uaEnrichment = new UAEnrichment();

    @Test
    public void should_enrich_ua() {
        Dataset<Row> dataset = spark.read().json(requireNonNull(getClass().getResource("/transformed_data.json")).getPath());

        Dataset<Row> transformedDataset = uaEnrichment.transform(dataset);

        Row row = transformedDataset.first();
        Row device = row.getStruct(row.fieldIndex("device"));
        String web_info = device.getString(device.fieldIndex("web_info"));
        String browser =  device.getString(device.fieldIndex("browser"));
        String browser_version =  device.getString(device.fieldIndex("browser_version"));

        assertEquals(web_info, "Apache-HttpClient/4.5.12 (Java/11.0.15)");
        assertEquals(browser, "Apache-HttpClient");
        assertEquals(browser_version, "4.5.12");
    }

    @Test
    public void should_return_empty_when_enrich_invalid_ua_value() {
        Dataset<Row> dataset =
                spark.read().json(requireNonNull(getClass().getResource("/transformed_data_with_error.json")).getPath());

        Dataset<Row> transformedDataset = uaEnrichment.transform(dataset);

        Row row = transformedDataset.first();
        Row device = row.getStruct(row.fieldIndex("device"));
        String browser =  device.getString(device.fieldIndex("browser"));
        String browser_version =  device.getString(device.fieldIndex("browser_version"));

        assertEquals(browser, "");
        assertEquals(browser_version, "");
    }
}