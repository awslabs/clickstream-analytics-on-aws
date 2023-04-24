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
        System.setProperty("debug.local", "true");
        System.setProperty("app.ids", "uba-app");

        Dataset<Row> dataset = spark.read().json(requireNonNull(getClass().getResource("/original_data.json")).getPath());
        Dataset<Row> cleanedDataset = cleaner.clean(dataset);

        assertEquals(2, cleanedDataset.count());

        Row row = cleanedDataset.first();
        Row data = row.getStruct(row.fieldIndex("data"));
        String attributes = data.getString(data.fieldIndex("attributes"));

        String expectedString = "{\"_traffic_source_medium\":\"TSM\",\"_traffic_source_name\":\"TSN\",\"_traffic_source_source\":\"TSS\",\"_privacy_info_ads_storage\":\"PIAS\"," +
                "\"_privacy_info_analytics_storage\":\"PIAAS\",\"_privacy_info_uses_transient_token\":\"PIUTT\",\"_channel\":\"C001\",\"_device_vendor_id\":\"V001\"," +
                "\"_device_advertising_id\":\"DAID001\",\"_error_name_invalid\":\"\",\"_error_name_length_exceed\":\"\",\"_error_value_length_exceed\":\"\"," +
                "\"_error_attribute_size_exceed\":\"\",\"_is_first_time\":true,\"_is_first_day\":true,\"_session_id\":\"see000201912dk-23u92-1df0020\"," +
                "\"_session_start_timestamp\":1667963966697,\"_session_duration\":690000}";
        assertEquals(expectedString, attributes);

        String expectedUserString = "{\"_user_id\":{\"value\":\"312121\",\"set_timestamp\":1667877566697}," +
                "\"_user_name\":{\"value\":\"xiaowei\",\"set_timestamp\":1667877566697}," +
                "\"_user_age\":{\"value\":20,\"set_timestamp\":1667877566697}," +
                "\"_user_first_touch_timestamp\":{\"value\":1667877267895,\"set_timestamp\":1667877566697}," +
                "\"_user_ltv_currency\":{\"value\":\"USD\",\"set_timestamp\":1667877566697}," +
                "\"_user_ltv_revenue\":{\"value\":123.45,\"set_timestamp\":1667877566697}}";

        String user = data.getString(data.fieldIndex("user"));
        assertEquals(expectedUserString, user);

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