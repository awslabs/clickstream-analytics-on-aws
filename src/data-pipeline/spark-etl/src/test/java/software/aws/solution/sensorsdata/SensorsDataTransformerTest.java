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

package software.aws.solution.sensorsdata;

import org.apache.spark.sql.Dataset;
import org.apache.spark.sql.Row;
import org.junit.jupiter.api.Test;
import software.aws.solution.clickstream.BaseSparkTest;
import software.aws.solution.sesnorsdata.SensorsDataTransformer;

import static org.junit.jupiter.api.Assertions.assertEquals;

public class SensorsDataTransformerTest extends BaseSparkTest {
    private final SensorsDataTransformer transformer = new SensorsDataTransformer();

    @Test
    public void should_transform() {
       String inputPath = getClass().getResource("/sensorsdata/raw-data.json").getPath();
       Dataset<Row> dataset = spark.read().json(inputPath);
       Dataset<Row> dataset1 = transformer.transform(dataset);
       String expectedJson = "{\n" +
               "      \"app_info\" : {\n" +
               "        \"app_id\" : \"testApp Name\",\n" +
               "        \"id\" : \"testAppId\",\n" +
               "        \"install_source\" : null,\n" +
               "        \"version\" : \"1.3\"\n" +
               "      },\n" +
               "      \"device\" : {\n" +
               "        \"mobile_brand_name\" : null,\n" +
               "        \"mobile_model_name\" : null,\n" +
               "        \"manufacturer\" : null,\n" +
               "        \"screen_width\" : 320,\n" +
               "        \"screen_height\" : 568,\n" +
               "        \"carrier\" : null,\n" +
               "        \"network_type\" : null,\n" +
               "        \"operating_system_version\" : null,\n" +
               "        \"operating_system\" : null,\n" +
               "        \"ua_browser\" : null,\n" +
               "        \"ua_browser_version\" : null,\n" +
               "        \"ua_os\" : null,\n" +
               "        \"ua_os_version\" : null,\n" +
               "        \"ua_device\" : null,\n" +
               "        \"ua_device_category\" : null,\n" +
               "        \"system_language\" : null,\n" +
               "        \"time_zone_offset_seconds\" : null,\n" +
               "        \"vendor_id\" : null,\n" +
               "        \"advertising_id\" : null,\n" +
               "        \"host_name\" : null\n" +
               "      },\n" +
               "      \"ecommerce\" : null,\n" +
               "      \"event_bundle_sequence_id\" : null,\n" +
               "      \"event_date\" : \"2023-07-19\",\n" +
               "      \"event_dimensions\" : null,\n" +
               "      \"event_id\" : null,\n" +
               "      \"event_name\" : \"track-ViewProduct\",\n" +
               "      \"event_params\" : [ {\n" +
               "        \"key\" : \"_is_login_id\",\n" +
               "        \"value\" : {\n" +
               "          \"double_value\" : null,\n" +
               "          \"float_value\" : null,\n" +
               "          \"int_value\" : null,\n" +
               "          \"string_value\" : \"true\"\n" +
               "        }\n" +
               "      }, {\n" +
               "        \"key\" : \"_wifi\",\n" +
               "        \"value\" : {\n" +
               "          \"double_value\" : null,\n" +
               "          \"float_value\" : null,\n" +
               "          \"int_value\" : null,\n" +
               "          \"string_value\" : \"true\"\n" +
               "        }\n" +
               "      }, {\n" +
               "        \"key\" : \"_ip\",\n" +
               "        \"value\" : {\n" +
               "          \"double_value\" : null,\n" +
               "          \"float_value\" : null,\n" +
               "          \"int_value\" : null,\n" +
               "          \"string_value\" : \"180.79.35.65\"\n" +
               "        }\n" +
               "      }, {\n" +
               "        \"key\" : \"_province\",\n" +
               "        \"value\" : {\n" +
               "          \"double_value\" : null,\n" +
               "          \"float_value\" : null,\n" +
               "          \"int_value\" : null,\n" +
               "          \"string_value\" : \"Shanxi\"\n" +
               "        }\n" +
               "      }, {\n" +
               "        \"key\" : \"_user_agent\",\n" +
               "        \"value\" : {\n" +
               "          \"double_value\" : null,\n" +
               "          \"float_value\" : null,\n" +
               "          \"int_value\" : null,\n" +
               "          \"string_value\" : \"Mozilla/5.0 (iPhone; CPU iPhone OS 10_3_2 like Mac OS X) AppleWebKit/602.1.50 (KHTML, like Gecko) CriOS/58.0.3029.113 Mobile/14F89 Safari/602.1\"\n" +
               "        }\n" +
               "      }, {\n" +
               "        \"key\" : \"product_id\",\n" +
               "        \"value\" : {\n" +
               "          \"double_value\" : null,\n" +
               "          \"float_value\" : null,\n" +
               "          \"int_value\" : 12345,\n" +
               "          \"string_value\" : null\n" +
               "        }\n" +
               "      }, {\n" +
               "        \"key\" : \"product_name\",\n" +
               "        \"value\" : {\n" +
               "          \"double_value\" : null,\n" +
               "          \"float_value\" : null,\n" +
               "          \"int_value\" : null,\n" +
               "          \"string_value\" : \"Apple\"\n" +
               "        }\n" +
               "      }, {\n" +
               "        \"key\" : \"product_classify\",\n" +
               "        \"value\" : {\n" +
               "          \"double_value\" : null,\n" +
               "          \"float_value\" : null,\n" +
               "          \"int_value\" : null,\n" +
               "          \"string_value\" : \"Iphone\"\n" +
               "        }\n" +
               "      }, {\n" +
               "        \"key\" : \"product_price\",\n" +
               "        \"value\" : {\n" +
               "          \"double_value\" : null,\n" +
               "          \"float_value\" : null,\n" +
               "          \"int_value\" : 14,\n" +
               "          \"string_value\" : null\n" +
               "        }\n" +
               "      }, {\n" +
               "        \"key\" : \"item_price\",\n" +
               "        \"value\" : {\n" +
               "          \"double_value\" : 1123.8,\n" +
               "          \"float_value\" : null,\n" +
               "          \"int_value\" : null,\n" +
               "          \"string_value\" : null\n" +
               "        }\n" +
               "      } ],\n" +
               "      \"event_previous_timestamp\" : null,\n" +
               "      \"event_server_timestamp_offset\" : -7412430597,\n" +
               "      \"event_timestamp\" : 1689731540000,\n" +
               "      \"event_value_in_usd\" : null,\n" +
               "      \"geo\" : {\n" +
               "        \"country\" : null,\n" +
               "        \"continent\" : null,\n" +
               "        \"sub_continent\" : null,\n" +
               "        \"locale\" : null,\n" +
               "        \"region\" : null,\n" +
               "        \"metro\" : null,\n" +
               "        \"city\" : \"Xi'an\"\n" +
               "      },\n" +
               "      \"ingest_timestamp\" : 1682319109403,\n" +
               "      \"items\" : null,\n" +
               "      \"platform\" : null,\n" +
               "      \"privacy_info\" : null,\n" +
               "      \"project_id\" : null,\n" +
               "      \"traffic_source\" : null,\n" +
               "      \"user_first_touch_timestamp\" : null,\n" +
               "      \"user_id\" : \"123456\",\n" +
               "      \"user_ltv\" : null,\n" +
               "      \"user_properties\" : null,\n" +
               "      \"user_pseudo_id\" : \"123456\",\n" +
               "      \"ua\" : \"Apache-HttpClient/4.5.12 (Java/11.0.15)\",\n" +
               "      \"geo_for_enrich\" : {\n" +
               "        \"ip\" : \"13.212.229.59\",\n" +
               "        \"locale\" : null\n" +
               "      }\n" +
               "    }";

        assertEquals(expectedJson.replaceAll("\\s+", ""),
                dataset1.first().prettyJson().replaceAll("\\s+", ""));

    }

    @Test
    public void should_ignore_corrupt_data() {
        String inputPath = getClass().getResource("/sensorsdata/raw-data-corrupt.json").getPath();
        Dataset<Row> dataset = spark.read().json(inputPath);
        Dataset<Row> dataset1 = transformer.transform(dataset);
        long c = dataset1.count();
        assertEquals(1, c);
    }

    @Test
    public void should_ignore_not_support_event() {
        String inputPath = getClass().getResource("/sensorsdata/raw-data-ignore-events.json").getPath();
        Dataset<Row> dataset = spark.read().json(inputPath);
        Dataset<Row> dataset1 = transformer.transform(dataset);
        long c = dataset1.count();
        assertEquals(2, c);
    }

}
