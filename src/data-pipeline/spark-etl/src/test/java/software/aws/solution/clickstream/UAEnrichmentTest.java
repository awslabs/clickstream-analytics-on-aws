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
import org.junit.jupiter.api.Test;

import static java.util.Objects.requireNonNull;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static software.aws.solution.clickstream.ContextUtil.APP_IDS_PROP;
import static software.aws.solution.clickstream.ContextUtil.PROJECT_ID_PROP;

class UAEnrichmentTest extends BaseSparkTest {

    private final UAEnrichment uaEnrichment = new UAEnrichment();

    @Test
    public void should_enrich_ua() {
        System.setProperty(APP_IDS_PROP, "uba-app");
        System.setProperty(PROJECT_ID_PROP, "test_project_id_01");

        Dataset<Row> dataset = spark.read().json(requireNonNull(getClass().getResource("/transformed_data.json")).getPath());

        Dataset<Row> transformedDataset = uaEnrichment.transform(dataset);

        transformedDataset.printSchema();

        Row row = transformedDataset.first();
        Row device = row.getStruct(row.fieldIndex("device"));
        String browser = device.getString(device.fieldIndex("ua_browser"));
        String browser_version = device.getString(device.fieldIndex("ua_browser_version"));

        assertEquals("Apache-HttpClient", browser);
        assertEquals("4.4.12", browser_version);

        String os = device.getString(device.fieldIndex("ua_os"));
        String osVersion = device.getString(device.fieldIndex("ua_os_version"));

        assertEquals("Other", os);
        assertEquals(null, osVersion);

        String deviceCategory = device.getString(device.fieldIndex("ua_device_category"));
        String uaDevice = device.getString(device.fieldIndex("ua_device"));
        assertEquals("Other", uaDevice);
        assertEquals(null, deviceCategory);
    }

    @Test
    public void should_return_empty_when_enrich_invalid_ua_value() {
        System.setProperty(APP_IDS_PROP, "uba-app");
        System.setProperty(PROJECT_ID_PROP, "test_project_id_01");

        Dataset<Row> dataset =
                spark.read().json(requireNonNull(getClass().getResource("/transformed_data_with_ua_error.json")).getPath());

        Dataset<Row> transformedDataset = uaEnrichment.transform(dataset);

        Row row = transformedDataset.first();
        Row device = row.getStruct(row.fieldIndex("device"));
        String browser = device.getString(device.fieldIndex("ua_browser"));
        String browser_version = device.getString(device.fieldIndex("ua_browser_version"));

        assertEquals("Other", browser);
        assertEquals(null, browser_version);
    }
}