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

import java.sql.Date;
import java.util.List;

import static java.util.Objects.requireNonNull;
import static org.junit.jupiter.api.Assertions.assertEquals;

class TransformerTest extends BaseSparkTest {

    private final Transformer transformer = new Transformer();

    @Test
    public void should_transform() {
        System.setProperty("app.ids", "uba-app");
        System.setProperty("project.id", "test_project_id_01");

        Dataset<Row> dataset =
                spark.read().json(requireNonNull(getClass().getResource("/original_data.json")).getPath());
        Dataset<Row> transformedDataset = transformer.transform(dataset);

        assertEquals(2, transformedDataset.count());

        transformedDataset.printSchema();

        Row row = transformedDataset.first();

        assertEquals(true, row.isNullAt(row.fieldIndex("event_value_in_usd")));

        Date eventDate = row.getDate(row.fieldIndex("event_date"));
        assertEquals(Date.valueOf("2023-04-24"), eventDate);

        Row device = row.getStruct(row.fieldIndex("device"));
        assertEquals("Brand HUAWEI", device.getString(device.fieldIndex("mobile_brand_name")));
        assertEquals(28800, device.getLong(device.fieldIndex("time_zone_offset_seconds")));

        assertEquals(-44, row.getLong(row.fieldIndex("event_server_timestamp_offset")));

        assertEquals(null, device.getString(device.fieldIndex("ua_browser")));

        Row geo_for_enrich = row.getStruct(row.fieldIndex("geo_for_enrich"));
        assertEquals("13.212.229.59", geo_for_enrich.getString(geo_for_enrich.fieldIndex("ip")));
        assertEquals("zh_CN_#Hans", geo_for_enrich.getString(geo_for_enrich.fieldIndex("locale")));

        String ua = row.getString(row.fieldIndex("ua"));
        assertEquals("Apache-HttpClient/4.5.12 (Java/11.0.15)", ua);

        assertEquals(111, row.getLong(row.fieldIndex("event_bundle_sequence_id")));
        assertEquals("test_project_id_01", row.getString(row.fieldIndex("project_id")));

        List<Row> privateInfo = row.getList(row.fieldIndex("privacy_info"));

        assertEquals(3, privateInfo.size());

        String ads_storage = privateInfo.get(0).getAs("key");
        Row value0 = privateInfo.get(0).getAs("value");
        String ads_storage_value = value0.getAs("string_value");

        String analytics_storage = privateInfo.get(1).getAs("key");
        Row value1 = privateInfo.get(1).getAs("value");
        String analytics_storage_value = value1.getAs("string_value");

        String uses_transient_token = privateInfo.get(2).getAs("key");
        Row value2 = privateInfo.get(2).getAs("value");
        String uses_transient_token_value = value2.getAs("string_value");

        assertEquals(ads_storage, "ads_storage");
        assertEquals(analytics_storage, "analytics_storage");
        assertEquals(uses_transient_token, "uses_transient_token");
        
        assertEquals("PIAS", ads_storage_value);
        assertEquals("PIAAS", analytics_storage_value);
        assertEquals("PIUTT", uses_transient_token_value);
    }


    @Test
    public void should_transform_with_no_seq_id() {
        System.setProperty("app.ids", "uba-app");
        System.setProperty("project.id", "test_project_id_01");

        Dataset<Row> dataset =
                spark.read().json(requireNonNull(getClass().getResource("/original_data_without_seq_id.json")).getPath());
        Dataset<Row> transformedDataset = transformer.transform(dataset);

        List<Row> rows = transformedDataset.takeAsList(3);
        assertEquals(0, rows.get(0).getLong(rows.get(0).fieldIndex("event_bundle_sequence_id")));
        assertEquals(0, rows.get(1).getLong(rows.get(1).fieldIndex("event_bundle_sequence_id")));
        assertEquals(123456, rows.get(2).getLong(rows.get(2).fieldIndex("event_bundle_sequence_id")));
    }

    @Test
    public void should_transform_without_error_for_raw_text_data() {
        System.setProperty("app.ids", "uba-app");
        System.setProperty("project.id", "test_project_id_01");

        Dataset<Row> dataset =
                spark.read().json(requireNonNull(getClass().getResource("/original_data_raw_text_error.json")).getPath());
        Dataset<Row> transformedDataset = transformer.transform(dataset);
        assertEquals(0, transformedDataset.count());

    }

    @Test
    public void should_transform_without_error_for_raw_json_data() {
        System.setProperty("app.ids", "uba-app");
        System.setProperty("project.id", "test_project_id_01");

        Dataset<Row> dataset =
                spark.read().json(requireNonNull(getClass().getResource("/original_data_raw_json_error.json")).getPath());
        Dataset<Row> transformedDataset = transformer.transform(dataset);
        assertEquals(0, transformedDataset.count());
    }
}