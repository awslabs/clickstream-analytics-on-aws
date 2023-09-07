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

import java.io.IOException;

import static java.util.Objects.requireNonNull;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static software.aws.solution.clickstream.ContextUtil.*;

class IPEnrichmentTest extends BaseSparkTest {

    private final IPEnrichment ipEnrichment = new IPEnrichment();

    @Test
    public void should_enrich_ip() {
        System.setProperty(APP_IDS_PROP, "uba-app");
        System.setProperty(PROJECT_ID_PROP, "test_project_id_01");

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
        System.setProperty(APP_IDS_PROP, "uba-app");
        System.setProperty(PROJECT_ID_PROP, "test_project_id_01");

        Dataset<Row> dataset = spark.read().json(requireNonNull(getClass().getResource("/transformed_data.json")).getPath());
        Dataset<Row> transformedDataset = ipEnrichment.transform(dataset);

        Row row = transformedDataset.first();
        Row geo = row.getStruct(row.fieldIndex("geo"));
        assertEquals(geo.getString(geo.fieldIndex("country")), null);
        assertEquals(geo.getString(geo.fieldIndex("continent")), null);
        assertEquals(geo.getString(geo.fieldIndex("city")), null);
    }

    @Test
    public void should_return_empty_when_enrich_unrecognized_ip() {
        spark.sparkContext().addFile(requireNonNull(getClass().getResource("/GeoLite2-City.mmdb")).getPath());

        Dataset<Row> dataset = spark.read().json(requireNonNull(getClass().getResource("/transformed_data_with_ip_error.json")).getPath());
        Dataset<Row> transformedDataset = ipEnrichment.transform(dataset);

        Row row = transformedDataset.first();
        Row geo = row.getStruct(row.fieldIndex("geo"));
        assertEquals(geo.getString(geo.fieldIndex("country")), null);
        assertEquals(geo.getString(geo.fieldIndex("continent")), null);
        assertEquals(geo.getString(geo.fieldIndex("city")), null);
    }

    @Test
    public void ip_enrich_for_data_v2() throws IOException {
        // DOWNLOAD_FILE=1 ./gradlew clean test --info --tests software.aws.solution.clickstream.IPEnrichmentTest.ip_enrich_for_data_v2
        System.setProperty(APP_IDS_PROP, "uba-app");
        System.setProperty(PROJECT_ID_PROP, "test_project_id_01");
        spark.sparkContext().addFile(requireNonNull(getClass().getResource("/GeoLite2-City.mmdb")).getPath());

        Dataset<Row> dataset = spark.read().json(requireNonNull(getClass().getResource("/transformed_data_v2.json")).getPath());
        Dataset<Row> transformedDataset = ipEnrichment.transform(dataset);
        System.out.println(transformedDataset.first().prettyJson());

        String expectedJson = this.resourceFileAsString("/expected/ip_enrich_data_v2.json");
        Assertions.assertEquals(expectedJson, transformedDataset.first().prettyJson());
    }
}