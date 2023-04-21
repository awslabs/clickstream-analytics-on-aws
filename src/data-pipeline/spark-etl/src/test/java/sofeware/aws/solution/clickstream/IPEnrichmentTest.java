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

class IPEnrichmentTest extends BaseSparkTest {

    private final IPEnrichment ipEnrichment = new IPEnrichment();

    @Test
    public void should_enrich_ip() {
        System.setProperty("app.ids", "uba-app");
        System.setProperty("project.id", "test_project_id_01");

        spark.sparkContext().addFile(requireNonNull(getClass().getResource("/GeoLite2-City.mmdb")).getPath());

        Dataset<Row> dataset = spark.read().json(requireNonNull(getClass().getResource("/transformed_data.json")).getPath());
        Dataset<Row> transformedDataset = ipEnrichment.transform(dataset);

        Row row = transformedDataset.first();
        Row geo = row.getStruct(row.fieldIndex("geo"));
        assertEquals(geo.getString(geo.fieldIndex("country")), "Singapore");
        assertEquals(geo.getString(geo.fieldIndex("continent")), "Asia");
        assertEquals(geo.getString(geo.fieldIndex("city")), "Singapore");
    }

    @Test
    public void should_return_empty_when_enrich_ip_with_no_db_file() {
        System.setProperty("app.ids", "uba-app");
        System.setProperty("project.id", "test_project_id_01");

        Dataset<Row> dataset = spark.read().json(requireNonNull(getClass().getResource("/transformed_data.json")).getPath());
        Dataset<Row> transformedDataset = ipEnrichment.transform(dataset);

        Row row = transformedDataset.first();
        Row geo = row.getStruct(row.fieldIndex("geo"));
        assertEquals(geo.getString(geo.fieldIndex("country")), "");
        assertEquals(geo.getString(geo.fieldIndex("continent")), "");
        assertEquals(geo.getString(geo.fieldIndex("city")), "");
    }

    @Test
    public void should_return_empty_when_enrich_unrecognized_ip() {
        spark.sparkContext().addFile(requireNonNull(getClass().getResource("/GeoLite2-City.mmdb")).getPath());

        Dataset<Row> dataset = spark.read().json(requireNonNull(getClass().getResource("/transformed_data_with_ip_error.json")).getPath());
        Dataset<Row> transformedDataset = ipEnrichment.transform(dataset);

        Row row = transformedDataset.first();
        Row geo = row.getStruct(row.fieldIndex("geo"));
        assertEquals(geo.getString(geo.fieldIndex("country")), "");
        assertEquals(geo.getString(geo.fieldIndex("continent")), "");
        assertEquals(geo.getString(geo.fieldIndex("city")), "");
    }
}