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

package com.example.clickstream.transformer;

import org.apache.spark.sql.Dataset;
import org.apache.spark.sql.Row;
import org.junit.jupiter.api.Test;

import static java.util.Objects.requireNonNull;
import static org.junit.jupiter.api.Assertions.assertEquals;

class MyTransformerTest extends BaseSparkTest {

    private final MyTransformer transformer = new MyTransformer();


    @Test
    public void should_transform() {
        System.setProperty("project.id", "test_project_id_01");
        System.setProperty("debug.local", "true");

        Dataset<Row> dataset =
                spark.read().json(requireNonNull(getClass().getResource("/original_data.json")).getPath());
        Dataset<Row> transformedDataset = transformer.transform(dataset);

        assertEquals(2, transformedDataset.count());

        transformedDataset.printSchema();

        Row row = transformedDataset.first();
        Row device = row.getStruct(row.fieldIndex("device"));
        assertEquals("Brand HUAWEI", device.getString(device.fieldIndex("mobile_brand_name")));
        assertEquals(28800, device.getLong(device.fieldIndex("time_zone_offset_seconds")));

        assertEquals(-44, row.getLong(row.fieldIndex("event_server_timestamp_offset")));

        assertEquals("", device.getString(device.fieldIndex("ua_browser")));

        Row geo_for_enrich = row.getStruct(row.fieldIndex("geo_for_enrich"));
        assertEquals("13.212.229.59", geo_for_enrich.getString(geo_for_enrich.fieldIndex("ip")));
        assertEquals("zh_CN_#Hans", geo_for_enrich.getString(geo_for_enrich.fieldIndex("locale")));

        String ua = row.getString(row.fieldIndex("ua"));
        assertEquals("Apache-HttpClient/4.5.12 (Java/11.0.15)", ua);

        assertEquals("test_project_id_01", row.getString(row.fieldIndex("project_id")));
    }

}