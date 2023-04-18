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

class TransformerTest extends BaseSparkTest {

    private final Transformer transformer = new Transformer();

    @Test
    public void should_transform() {
        System.setProperty("app.ids", "uba-app");
        System.setProperty("project.id", "projectId1");
        Dataset<Row> dataset =
                spark.read().json(requireNonNull(getClass().getResource("/original_data.json")).getPath());
        Dataset<Row> transformedDataset = transformer.transform(dataset);
        assertEquals(1, transformedDataset.count());

        Row row = transformedDataset.first();
        Row device = row.getStruct(row.fieldIndex("device"));
        String webInfo = device.getString(device.fieldIndex("web_info"));
        assertEquals(webInfo, "Apache-HttpClient/4.5.12 (Java/11.0.15)");

        String eventDate = row.getString(row.fieldIndex("event_date"));
        long eventServerTimestampOffset = row.getLong(row.fieldIndex("event_server_timestamp_offset"));
        long timeZoneOffsetSeconds = device.getLong(device.fieldIndex("time_zone_offset_seconds"));
        
        assertEquals("20230323", eventDate);
        assertEquals(28800, timeZoneOffsetSeconds);
        assertEquals("projectId1", row.getString(row.fieldIndex("project_id")));
        assertEquals(-6, eventServerTimestampOffset);
    }
}