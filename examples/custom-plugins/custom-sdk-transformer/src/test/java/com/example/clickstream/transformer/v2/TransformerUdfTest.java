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

package com.example.clickstream.transformer.v2;

import com.example.clickstream.transformer.BaseSparkTest;
import lombok.extern.slf4j.Slf4j;
import org.apache.spark.sql.Dataset;
import org.apache.spark.sql.Row;
import org.junit.jupiter.api.Test;

import static java.util.Objects.requireNonNull;
import static org.apache.spark.sql.functions.col;
import static org.apache.spark.sql.functions.explode;
import static org.apache.spark.sql.functions.expr;
import static org.junit.jupiter.api.Assertions.assertEquals;

@Slf4j
public class TransformerUdfTest extends BaseSparkTest {
    TransformerUdf transformerUdf = new TransformerUdf();

    @Test
    void test_transform() {
        //  ./gradlew clean test --info --tests com.example.clickstream.transformer.v2.TransformerUdfTest.test_transform
        System.setProperty("project.id", "test_project_id_02");
        System.setProperty("debug.local", "true");

        Dataset<Row> dataset =
                spark.read().json(requireNonNull(getClass().getResource("/original_data.json")).getPath());

        Dataset<Row> transformedDataset = transformerUdf.transform(dataset);

        log.info("transformedDataset count: " + transformedDataset.count());
        log.info(transformedDataset.first().prettyJson());
        transformedDataset.printSchema();

        Dataset<Row> newDataset = transformedDataset.select(explode(col("new_data")).alias("data"));

        Dataset<Row> eventDataset = newDataset.select(expr("data.event.*"));
        log.info("------ event -----");
        eventDataset.printSchema();
        assertEquals("{\n" +
                "  \"type\" : \"struct\",\n" +
                "  \"fields\" : [ {\n" +
                "    \"name\" : \"event_id\",\n" +
                "    \"type\" : \"string\",\n" +
                "    \"nullable\" : true,\n" +
                "    \"metadata\" : { }\n" +
                "  }, {\n" +
                "    \"name\" : \"event_timestamp\",\n" +
                "    \"type\" : \"long\",\n" +
                "    \"nullable\" : true,\n" +
                "    \"metadata\" : { }\n" +
                "  }, {\n" +
                "    \"name\" : \"event_previous_timestamp\",\n" +
                "    \"type\" : \"long\",\n" +
                "    \"nullable\" : true,\n" +
                "    \"metadata\" : { }\n" +
                "  }, {\n" +
                "    \"name\" : \"event_name\",\n" +
                "    \"type\" : \"string\",\n" +
                "    \"nullable\" : true,\n" +
                "    \"metadata\" : { }\n" +
                "  }, {\n" +
                "    \"name\" : \"event_value_in_usd\",\n" +
                "    \"type\" : \"double\",\n" +
                "    \"nullable\" : true,\n" +
                "    \"metadata\" : { }\n" +
                "  }, {\n" +
                "    \"name\" : \"event_bundle_sequence_id\",\n" +
                "    \"type\" : \"long\",\n" +
                "    \"nullable\" : true,\n" +
                "    \"metadata\" : { }\n" +
                "  }, {\n" +
                "    \"name\" : \"ingest_timestamp\",\n" +
                "    \"type\" : \"long\",\n" +
                "    \"nullable\" : true,\n" +
                "    \"metadata\" : { }\n" +
                "  }, {\n" +
                "    \"name\" : \"device\",\n" +
                "    \"type\" : {\n" +
                "      \"type\" : \"struct\",\n" +
                "      \"fields\" : [ {\n" +
                "        \"name\" : \"mobile_brand_name\",\n" +
                "        \"type\" : \"string\",\n" +
                "        \"nullable\" : true,\n" +
                "        \"metadata\" : { }\n" +
                "      }, {\n" +
                "        \"name\" : \"mobile_model_name\",\n" +
                "        \"type\" : \"string\",\n" +
                "        \"nullable\" : true,\n" +
                "        \"metadata\" : { }\n" +
                "      }, {\n" +
                "        \"name\" : \"manufacturer\",\n" +
                "        \"type\" : \"string\",\n" +
                "        \"nullable\" : true,\n" +
                "        \"metadata\" : { }\n" +
                "      }, {\n" +
                "        \"name\" : \"screen_width\",\n" +
                "        \"type\" : \"long\",\n" +
                "        \"nullable\" : true,\n" +
                "        \"metadata\" : { }\n" +
                "      }, {\n" +
                "        \"name\" : \"screen_height\",\n" +
                "        \"type\" : \"long\",\n" +
                "        \"nullable\" : true,\n" +
                "        \"metadata\" : { }\n" +
                "      }, {\n" +
                "        \"name\" : \"carrier\",\n" +
                "        \"type\" : \"string\",\n" +
                "        \"nullable\" : true,\n" +
                "        \"metadata\" : { }\n" +
                "      }, {\n" +
                "        \"name\" : \"network_type\",\n" +
                "        \"type\" : \"string\",\n" +
                "        \"nullable\" : true,\n" +
                "        \"metadata\" : { }\n" +
                "      }, {\n" +
                "        \"name\" : \"operating_system_version\",\n" +
                "        \"type\" : \"string\",\n" +
                "        \"nullable\" : true,\n" +
                "        \"metadata\" : { }\n" +
                "      }, {\n" +
                "        \"name\" : \"operating_system\",\n" +
                "        \"type\" : \"string\",\n" +
                "        \"nullable\" : true,\n" +
                "        \"metadata\" : { }\n" +
                "      }, {\n" +
                "        \"name\" : \"ua_browser\",\n" +
                "        \"type\" : \"string\",\n" +
                "        \"nullable\" : true,\n" +
                "        \"metadata\" : { }\n" +
                "      }, {\n" +
                "        \"name\" : \"ua_browser_version\",\n" +
                "        \"type\" : \"string\",\n" +
                "        \"nullable\" : true,\n" +
                "        \"metadata\" : { }\n" +
                "      }, {\n" +
                "        \"name\" : \"ua_os\",\n" +
                "        \"type\" : \"string\",\n" +
                "        \"nullable\" : true,\n" +
                "        \"metadata\" : { }\n" +
                "      }, {\n" +
                "        \"name\" : \"ua_os_version\",\n" +
                "        \"type\" : \"string\",\n" +
                "        \"nullable\" : true,\n" +
                "        \"metadata\" : { }\n" +
                "      }, {\n" +
                "        \"name\" : \"ua_device\",\n" +
                "        \"type\" : \"string\",\n" +
                "        \"nullable\" : true,\n" +
                "        \"metadata\" : { }\n" +
                "      }, {\n" +
                "        \"name\" : \"ua_device_category\",\n" +
                "        \"type\" : \"string\",\n" +
                "        \"nullable\" : true,\n" +
                "        \"metadata\" : { }\n" +
                "      }, {\n" +
                "        \"name\" : \"system_language\",\n" +
                "        \"type\" : \"string\",\n" +
                "        \"nullable\" : true,\n" +
                "        \"metadata\" : { }\n" +
                "      }, {\n" +
                "        \"name\" : \"time_zone_offset_seconds\",\n" +
                "        \"type\" : \"long\",\n" +
                "        \"nullable\" : true,\n" +
                "        \"metadata\" : { }\n" +
                "      }, {\n" +
                "        \"name\" : \"vendor_id\",\n" +
                "        \"type\" : \"string\",\n" +
                "        \"nullable\" : true,\n" +
                "        \"metadata\" : { }\n" +
                "      }, {\n" +
                "        \"name\" : \"advertising_id\",\n" +
                "        \"type\" : \"string\",\n" +
                "        \"nullable\" : true,\n" +
                "        \"metadata\" : { }\n" +
                "      }, {\n" +
                "        \"name\" : \"host_name\",\n" +
                "        \"type\" : \"string\",\n" +
                "        \"nullable\" : true,\n" +
                "        \"metadata\" : { }\n" +
                "      }, {\n" +
                "        \"name\" : \"viewport_width\",\n" +
                "        \"type\" : \"long\",\n" +
                "        \"nullable\" : true,\n" +
                "        \"metadata\" : { }\n" +
                "      }, {\n" +
                "        \"name\" : \"viewport_height\",\n" +
                "        \"type\" : \"long\",\n" +
                "        \"nullable\" : true,\n" +
                "        \"metadata\" : { }\n" +
                "      } ]\n" +
                "    },\n" +
                "    \"nullable\" : true,\n" +
                "    \"metadata\" : { }\n" +
                "  }, {\n" +
                "    \"name\" : \"geo\",\n" +
                "    \"type\" : {\n" +
                "      \"type\" : \"struct\",\n" +
                "      \"fields\" : [ {\n" +
                "        \"name\" : \"country\",\n" +
                "        \"type\" : \"string\",\n" +
                "        \"nullable\" : true,\n" +
                "        \"metadata\" : { }\n" +
                "      }, {\n" +
                "        \"name\" : \"continent\",\n" +
                "        \"type\" : \"string\",\n" +
                "        \"nullable\" : true,\n" +
                "        \"metadata\" : { }\n" +
                "      }, {\n" +
                "        \"name\" : \"sub_continent\",\n" +
                "        \"type\" : \"string\",\n" +
                "        \"nullable\" : true,\n" +
                "        \"metadata\" : { }\n" +
                "      }, {\n" +
                "        \"name\" : \"locale\",\n" +
                "        \"type\" : \"string\",\n" +
                "        \"nullable\" : true,\n" +
                "        \"metadata\" : { }\n" +
                "      }, {\n" +
                "        \"name\" : \"region\",\n" +
                "        \"type\" : \"string\",\n" +
                "        \"nullable\" : true,\n" +
                "        \"metadata\" : { }\n" +
                "      }, {\n" +
                "        \"name\" : \"metro\",\n" +
                "        \"type\" : \"string\",\n" +
                "        \"nullable\" : true,\n" +
                "        \"metadata\" : { }\n" +
                "      }, {\n" +
                "        \"name\" : \"city\",\n" +
                "        \"type\" : \"string\",\n" +
                "        \"nullable\" : true,\n" +
                "        \"metadata\" : { }\n" +
                "      } ]\n" +
                "    },\n" +
                "    \"nullable\" : true,\n" +
                "    \"metadata\" : { }\n" +
                "  }, {\n" +
                "    \"name\" : \"traffic_source\",\n" +
                "    \"type\" : {\n" +
                "      \"type\" : \"struct\",\n" +
                "      \"fields\" : [ {\n" +
                "        \"name\" : \"medium\",\n" +
                "        \"type\" : \"string\",\n" +
                "        \"nullable\" : true,\n" +
                "        \"metadata\" : { }\n" +
                "      }, {\n" +
                "        \"name\" : \"name\",\n" +
                "        \"type\" : \"string\",\n" +
                "        \"nullable\" : true,\n" +
                "        \"metadata\" : { }\n" +
                "      }, {\n" +
                "        \"name\" : \"source\",\n" +
                "        \"type\" : \"string\",\n" +
                "        \"nullable\" : true,\n" +
                "        \"metadata\" : { }\n" +
                "      } ]\n" +
                "    },\n" +
                "    \"nullable\" : true,\n" +
                "    \"metadata\" : { }\n" +
                "  }, {\n" +
                "    \"name\" : \"app_info\",\n" +
                "    \"type\" : {\n" +
                "      \"type\" : \"struct\",\n" +
                "      \"fields\" : [ {\n" +
                "        \"name\" : \"app_id\",\n" +
                "        \"type\" : \"string\",\n" +
                "        \"nullable\" : true,\n" +
                "        \"metadata\" : { }\n" +
                "      }, {\n" +
                "        \"name\" : \"id\",\n" +
                "        \"type\" : \"string\",\n" +
                "        \"nullable\" : true,\n" +
                "        \"metadata\" : { }\n" +
                "      }, {\n" +
                "        \"name\" : \"install_source\",\n" +
                "        \"type\" : \"string\",\n" +
                "        \"nullable\" : true,\n" +
                "        \"metadata\" : { }\n" +
                "      }, {\n" +
                "        \"name\" : \"version\",\n" +
                "        \"type\" : \"string\",\n" +
                "        \"nullable\" : true,\n" +
                "        \"metadata\" : { }\n" +
                "      }, {\n" +
                "        \"name\" : \"sdk_version\",\n" +
                "        \"type\" : \"string\",\n" +
                "        \"nullable\" : true,\n" +
                "        \"metadata\" : { }\n" +
                "      }, {\n" +
                "        \"name\" : \"sdk_name\",\n" +
                "        \"type\" : \"string\",\n" +
                "        \"nullable\" : true,\n" +
                "        \"metadata\" : { }\n" +
                "      } ]\n" +
                "    },\n" +
                "    \"nullable\" : true,\n" +
                "    \"metadata\" : { }\n" +
                "  }, {\n" +
                "    \"name\" : \"platform\",\n" +
                "    \"type\" : \"string\",\n" +
                "    \"nullable\" : true,\n" +
                "    \"metadata\" : { }\n" +
                "  }, {\n" +
                "    \"name\" : \"project_id\",\n" +
                "    \"type\" : \"string\",\n" +
                "    \"nullable\" : true,\n" +
                "    \"metadata\" : { }\n" +
                "  }, {\n" +
                "    \"name\" : \"items\",\n" +
                "    \"type\" : {\n" +
                "      \"type\" : \"array\",\n" +
                "      \"elementType\" : {\n" +
                "        \"type\" : \"struct\",\n" +
                "        \"fields\" : [ {\n" +
                "          \"name\" : \"id\",\n" +
                "          \"type\" : \"string\",\n" +
                "          \"nullable\" : true,\n" +
                "          \"metadata\" : { }\n" +
                "        }, {\n" +
                "          \"name\" : \"quantity\",\n" +
                "          \"type\" : \"long\",\n" +
                "          \"nullable\" : true,\n" +
                "          \"metadata\" : { }\n" +
                "        }, {\n" +
                "          \"name\" : \"price\",\n" +
                "          \"type\" : \"double\",\n" +
                "          \"nullable\" : true,\n" +
                "          \"metadata\" : { }\n" +
                "        }, {\n" +
                "          \"name\" : \"currency\",\n" +
                "          \"type\" : \"string\",\n" +
                "          \"nullable\" : true,\n" +
                "          \"metadata\" : { }\n" +
                "        }, {\n" +
                "          \"name\" : \"creative_name\",\n" +
                "          \"type\" : \"string\",\n" +
                "          \"nullable\" : true,\n" +
                "          \"metadata\" : { }\n" +
                "        }, {\n" +
                "          \"name\" : \"creative_slot\",\n" +
                "          \"type\" : \"string\",\n" +
                "          \"nullable\" : true,\n" +
                "          \"metadata\" : { }\n" +
                "        } ]\n" +
                "      },\n" +
                "      \"containsNull\" : true\n" +
                "    },\n" +
                "    \"nullable\" : true,\n" +
                "    \"metadata\" : { }\n" +
                "  }, {\n" +
                "    \"name\" : \"user_pseudo_id\",\n" +
                "    \"type\" : \"string\",\n" +
                "    \"nullable\" : true,\n" +
                "    \"metadata\" : { }\n" +
                "  }, {\n" +
                "    \"name\" : \"user_id\",\n" +
                "    \"type\" : \"string\",\n" +
                "    \"nullable\" : true,\n" +
                "    \"metadata\" : { }\n" +
                "  }, {\n" +
                "    \"name\" : \"ua\",\n" +
                "    \"type\" : \"string\",\n" +
                "    \"nullable\" : true,\n" +
                "    \"metadata\" : { }\n" +
                "  }, {\n" +
                "    \"name\" : \"geo_for_enrich\",\n" +
                "    \"type\" : {\n" +
                "      \"type\" : \"struct\",\n" +
                "      \"fields\" : [ {\n" +
                "        \"name\" : \"ip\",\n" +
                "        \"type\" : \"string\",\n" +
                "        \"nullable\" : true,\n" +
                "        \"metadata\" : { }\n" +
                "      }, {\n" +
                "        \"name\" : \"locale\",\n" +
                "        \"type\" : \"string\",\n" +
                "        \"nullable\" : true,\n" +
                "        \"metadata\" : { }\n" +
                "      } ]\n" +
                "    },\n" +
                "    \"nullable\" : true,\n" +
                "    \"metadata\" : { }\n" +
                "  } ]\n" +
                "}", eventDataset.schema().prettyJson());

        Dataset<Row> eventParameterDataset = newDataset.select(explode(expr("data.event_parameters")).alias("ep")).select(expr("ep.*"));
        log.info("------ event parameter -----");
        eventParameterDataset.printSchema();
        assertEquals("{\n" +
                "  \"type\" : \"struct\",\n" +
                "  \"fields\" : [ {\n" +
                "    \"name\" : \"app_id\",\n" +
                "    \"type\" : \"string\",\n" +
                "    \"nullable\" : true,\n" +
                "    \"metadata\" : { }\n" +
                "  }, {\n" +
                "    \"name\" : \"event_timestamp\",\n" +
                "    \"type\" : \"long\",\n" +
                "    \"nullable\" : true,\n" +
                "    \"metadata\" : { }\n" +
                "  }, {\n" +
                "    \"name\" : \"event_id\",\n" +
                "    \"type\" : \"string\",\n" +
                "    \"nullable\" : true,\n" +
                "    \"metadata\" : { }\n" +
                "  }, {\n" +
                "    \"name\" : \"event_name\",\n" +
                "    \"type\" : \"string\",\n" +
                "    \"nullable\" : true,\n" +
                "    \"metadata\" : { }\n" +
                "  }, {\n" +
                "    \"name\" : \"event_param_key\",\n" +
                "    \"type\" : \"string\",\n" +
                "    \"nullable\" : true,\n" +
                "    \"metadata\" : { }\n" +
                "  }, {\n" +
                "    \"name\" : \"event_param_double_value\",\n" +
                "    \"type\" : \"string\",\n" +
                "    \"nullable\" : true,\n" +
                "    \"metadata\" : { }\n" +
                "  }, {\n" +
                "    \"name\" : \"event_param_float_value\",\n" +
                "    \"type\" : \"string\",\n" +
                "    \"nullable\" : true,\n" +
                "    \"metadata\" : { }\n" +
                "  }, {\n" +
                "    \"name\" : \"event_param_int_value\",\n" +
                "    \"type\" : \"long\",\n" +
                "    \"nullable\" : true,\n" +
                "    \"metadata\" : { }\n" +
                "  }, {\n" +
                "    \"name\" : \"event_param_string_value\",\n" +
                "    \"type\" : \"string\",\n" +
                "    \"nullable\" : true,\n" +
                "    \"metadata\" : { }\n" +
                "  } ]\n" +
                "}", eventParameterDataset.schema().prettyJson());

        Dataset<Row> itemDataset = newDataset.select(explode(expr("data.items")).alias("item")).select(expr("item.*"));
        log.info("------ item -----");
        itemDataset.printSchema();
        assertEquals("{\n" +
                "  \"type\" : \"struct\",\n" +
                "  \"fields\" : [ {\n" +
                "    \"name\" : \"app_id\",\n" +
                "    \"type\" : \"string\",\n" +
                "    \"nullable\" : true,\n" +
                "    \"metadata\" : { }\n" +
                "  }, {\n" +
                "    \"name\" : \"event_timestamp\",\n" +
                "    \"type\" : \"long\",\n" +
                "    \"nullable\" : true,\n" +
                "    \"metadata\" : { }\n" +
                "  }, {\n" +
                "    \"name\" : \"id\",\n" +
                "    \"type\" : \"string\",\n" +
                "    \"nullable\" : true,\n" +
                "    \"metadata\" : { }\n" +
                "  }, {\n" +
                "    \"name\" : \"properties\",\n" +
                "    \"type\" : {\n" +
                "      \"type\" : \"array\",\n" +
                "      \"elementType\" : {\n" +
                "        \"type\" : \"struct\",\n" +
                "        \"fields\" : [ {\n" +
                "          \"name\" : \"key\",\n" +
                "          \"type\" : \"string\",\n" +
                "          \"nullable\" : true,\n" +
                "          \"metadata\" : { }\n" +
                "        }, {\n" +
                "          \"name\" : \"value\",\n" +
                "          \"type\" : {\n" +
                "            \"type\" : \"struct\",\n" +
                "            \"fields\" : [ {\n" +
                "              \"name\" : \"double_value\",\n" +
                "              \"type\" : \"double\",\n" +
                "              \"nullable\" : true,\n" +
                "              \"metadata\" : { }\n" +
                "            }, {\n" +
                "              \"name\" : \"float_value\",\n" +
                "              \"type\" : \"float\",\n" +
                "              \"nullable\" : true,\n" +
                "              \"metadata\" : { }\n" +
                "            }, {\n" +
                "              \"name\" : \"int_value\",\n" +
                "              \"type\" : \"long\",\n" +
                "              \"nullable\" : true,\n" +
                "              \"metadata\" : { }\n" +
                "            }, {\n" +
                "              \"name\" : \"string_value\",\n" +
                "              \"type\" : \"string\",\n" +
                "              \"nullable\" : true,\n" +
                "              \"metadata\" : { }\n" +
                "            } ]\n" +
                "          },\n" +
                "          \"nullable\" : true,\n" +
                "          \"metadata\" : { }\n" +
                "        } ]\n" +
                "      },\n" +
                "      \"containsNull\" : true\n" +
                "    },\n" +
                "    \"nullable\" : true,\n" +
                "    \"metadata\" : { }\n" +
                "  } ]\n" +
                "}", itemDataset.schema().prettyJson());

        Dataset<Row> userDataset = newDataset.select(expr("data.user.*"));
        log.info("------ user -----");
        userDataset.printSchema();
        assertEquals("{\n" +
                "  \"type\" : \"struct\",\n" +
                "  \"fields\" : [ {\n" +
                "    \"name\" : \"app_id\",\n" +
                "    \"type\" : \"string\",\n" +
                "    \"nullable\" : true,\n" +
                "    \"metadata\" : { }\n" +
                "  }, {\n" +
                "    \"name\" : \"event_timestamp\",\n" +
                "    \"type\" : \"long\",\n" +
                "    \"nullable\" : true,\n" +
                "    \"metadata\" : { }\n" +
                "  }, {\n" +
                "    \"name\" : \"user_id\",\n" +
                "    \"type\" : \"string\",\n" +
                "    \"nullable\" : true,\n" +
                "    \"metadata\" : { }\n" +
                "  }, {\n" +
                "    \"name\" : \"user_pseudo_id\",\n" +
                "    \"type\" : \"string\",\n" +
                "    \"nullable\" : true,\n" +
                "    \"metadata\" : { }\n" +
                "  }, {\n" +
                "    \"name\" : \"user_first_touch_timestamp\",\n" +
                "    \"type\" : \"long\",\n" +
                "    \"nullable\" : true,\n" +
                "    \"metadata\" : { }\n" +
                "  }, {\n" +
                "    \"name\" : \"user_properties\",\n" +
                "    \"type\" : {\n" +
                "      \"type\" : \"array\",\n" +
                "      \"elementType\" : {\n" +
                "        \"type\" : \"struct\",\n" +
                "        \"fields\" : [ {\n" +
                "          \"name\" : \"key\",\n" +
                "          \"type\" : \"string\",\n" +
                "          \"nullable\" : true,\n" +
                "          \"metadata\" : { }\n" +
                "        }, {\n" +
                "          \"name\" : \"value\",\n" +
                "          \"type\" : {\n" +
                "            \"type\" : \"struct\",\n" +
                "            \"fields\" : [ {\n" +
                "              \"name\" : \"double_value\",\n" +
                "              \"type\" : \"double\",\n" +
                "              \"nullable\" : true,\n" +
                "              \"metadata\" : { }\n" +
                "            }, {\n" +
                "              \"name\" : \"float_value\",\n" +
                "              \"type\" : \"float\",\n" +
                "              \"nullable\" : true,\n" +
                "              \"metadata\" : { }\n" +
                "            }, {\n" +
                "              \"name\" : \"int_value\",\n" +
                "              \"type\" : \"long\",\n" +
                "              \"nullable\" : true,\n" +
                "              \"metadata\" : { }\n" +
                "            }, {\n" +
                "              \"name\" : \"string_value\",\n" +
                "              \"type\" : \"string\",\n" +
                "              \"nullable\" : true,\n" +
                "              \"metadata\" : { }\n" +
                "            }, {\n" +
                "              \"name\" : \"set_timestamp_micros\",\n" +
                "              \"type\" : \"long\",\n" +
                "              \"nullable\" : true,\n" +
                "              \"metadata\" : { }\n" +
                "            } ]\n" +
                "          },\n" +
                "          \"nullable\" : true,\n" +
                "          \"metadata\" : { }\n" +
                "        } ]\n" +
                "      },\n" +
                "      \"containsNull\" : true\n" +
                "    },\n" +
                "    \"nullable\" : true,\n" +
                "    \"metadata\" : { }\n" +
                "  }, {\n" +
                "    \"name\" : \"user_ltv\",\n" +
                "    \"type\" : {\n" +
                "      \"type\" : \"struct\",\n" +
                "      \"fields\" : [ {\n" +
                "        \"name\" : \"revenue\",\n" +
                "        \"type\" : \"double\",\n" +
                "        \"nullable\" : true,\n" +
                "        \"metadata\" : { }\n" +
                "      }, {\n" +
                "        \"name\" : \"currency\",\n" +
                "        \"type\" : \"string\",\n" +
                "        \"nullable\" : true,\n" +
                "        \"metadata\" : { }\n" +
                "      } ]\n" +
                "    },\n" +
                "    \"nullable\" : true,\n" +
                "    \"metadata\" : { }\n" +
                "  }, {\n" +
                "    \"name\" : \"_first_referer\",\n" +
                "    \"type\" : \"string\",\n" +
                "    \"nullable\" : true,\n" +
                "    \"metadata\" : { }\n" +
                "  }, {\n" +
                "    \"name\" : \"_first_traffic_source_type\",\n" +
                "    \"type\" : \"string\",\n" +
                "    \"nullable\" : true,\n" +
                "    \"metadata\" : { }\n" +
                "  }, {\n" +
                "    \"name\" : \"_first_traffic_medium\",\n" +
                "    \"type\" : \"string\",\n" +
                "    \"nullable\" : true,\n" +
                "    \"metadata\" : { }\n" +
                "  }, {\n" +
                "    \"name\" : \"_first_traffic_source\",\n" +
                "    \"type\" : \"string\",\n" +
                "    \"nullable\" : true,\n" +
                "    \"metadata\" : { }\n" +
                "  }, {\n" +
                "    \"name\" : \"device_id_list\",\n" +
                "    \"type\" : {\n" +
                "      \"type\" : \"array\",\n" +
                "      \"elementType\" : \"string\",\n" +
                "      \"containsNull\" : true\n" +
                "    },\n" +
                "    \"nullable\" : true,\n" +
                "    \"metadata\" : { }\n" +
                "  }, {\n" +
                "    \"name\" : \"_channel\",\n" +
                "    \"type\" : \"string\",\n" +
                "    \"nullable\" : true,\n" +
                "    \"metadata\" : { }\n" +
                "  } ]\n" +
                "}", userDataset.schema().prettyJson());


        log.info(String.format("row counts: event: %s,  params: %s, item: %s,user: %s \n", eventDataset.count(), eventParameterDataset.count(), itemDataset.count(), userDataset.count()));
        assertEquals(2, eventDataset.count());
        assertEquals(36, eventParameterDataset.count());
        assertEquals(0, itemDataset.count());
        assertEquals(2, userDataset.count());
    }

    @Test
    void test_transform_data_with_items() {
        //  ./gradlew clean test --info --tests com.example.clickstream.transformer.v2.TransformerUdfTest.test_transform_data_with_items
        System.setProperty("project.id", "test_project_id_02");
        System.setProperty("debug.local", "true");

        Dataset<Row> dataset =
                spark.read().json(requireNonNull(getClass().getResource("/data_with_item.json")).getPath());

        Dataset<Row> transformedDataset = transformerUdf.transform(dataset);
        Dataset<Row> newDataset = transformedDataset.select(explode(col("new_data")).alias("data"));
        log.info(newDataset.first().prettyJson());

        Dataset<Row> itemDataset = newDataset.select(explode(expr("data.items")).alias("item")).select(expr("item.*"));
        assertEquals(3, itemDataset.count());
        assertEquals("{\n" +
                "  \"app_id\" : \"1fcd7f5b-9529-4977-a303-e8c7e39db7b898\",\n" +
                "  \"event_timestamp\" : 1682319109447,\n" +
                "  \"id\" : \"item_id1\",\n" +
                "  \"properties\" : [ {\n" +
                "    \"key\" : \"name\",\n" +
                "    \"value\" : {\n" +
                "      \"double_value\" : null,\n" +
                "      \"float_value\" : null,\n" +
                "      \"int_value\" : null,\n" +
                "      \"string_value\" : \"French Press1\"\n" +
                "    }\n" +
                "  }, {\n" +
                "    \"key\" : \"category\",\n" +
                "    \"value\" : {\n" +
                "      \"double_value\" : null,\n" +
                "      \"float_value\" : null,\n" +
                "      \"int_value\" : null,\n" +
                "      \"string_value\" : \"housewares\"\n" +
                "    }\n" +
                "  }, {\n" +
                "    \"key\" : \"price\",\n" +
                "    \"value\" : {\n" +
                "      \"double_value\" : 52.99,\n" +
                "      \"float_value\" : null,\n" +
                "      \"int_value\" : null,\n" +
                "      \"string_value\" : null\n" +
                "    }\n" +
                "  }, {\n" +
                "    \"key\" : \"brand\",\n" +
                "    \"value\" : {\n" +
                "      \"double_value\" : null,\n" +
                "      \"float_value\" : null,\n" +
                "      \"int_value\" : null,\n" +
                "      \"string_value\" : \"Brand1\"\n" +
                "    }\n" +
                "  }, {\n" +
                "    \"key\" : \"category2\",\n" +
                "    \"value\" : {\n" +
                "      \"double_value\" : null,\n" +
                "      \"float_value\" : null,\n" +
                "      \"int_value\" : null,\n" +
                "      \"string_value\" : \"Category-2\"\n" +
                "    }\n" +
                "  }, {\n" +
                "    \"key\" : \"category3\",\n" +
                "    \"value\" : {\n" +
                "      \"double_value\" : null,\n" +
                "      \"float_value\" : null,\n" +
                "      \"int_value\" : null,\n" +
                "      \"string_value\" : \"Category-3\"\n" +
                "    }\n" +
                "  }, {\n" +
                "    \"key\" : \"category4\",\n" +
                "    \"value\" : {\n" +
                "      \"double_value\" : null,\n" +
                "      \"float_value\" : null,\n" +
                "      \"int_value\" : null,\n" +
                "      \"string_value\" : \"Category-4\"\n" +
                "    }\n" +
                "  }, {\n" +
                "    \"key\" : \"category5\",\n" +
                "    \"value\" : {\n" +
                "      \"double_value\" : null,\n" +
                "      \"float_value\" : null,\n" +
                "      \"int_value\" : null,\n" +
                "      \"string_value\" : \"Category-5\"\n" +
                "    }\n" +
                "  }, {\n" +
                "    \"key\" : \"creative_name\",\n" +
                "    \"value\" : {\n" +
                "      \"double_value\" : null,\n" +
                "      \"float_value\" : null,\n" +
                "      \"int_value\" : null,\n" +
                "      \"string_value\" : \"Creative Name\"\n" +
                "    }\n" +
                "  }, {\n" +
                "    \"key\" : \"creative_slot\",\n" +
                "    \"value\" : {\n" +
                "      \"double_value\" : null,\n" +
                "      \"float_value\" : null,\n" +
                "      \"int_value\" : null,\n" +
                "      \"string_value\" : \"Creative Slot\"\n" +
                "    }\n" +
                "  }, {\n" +
                "    \"key\" : \"location_id\",\n" +
                "    \"value\" : {\n" +
                "      \"double_value\" : null,\n" +
                "      \"float_value\" : null,\n" +
                "      \"int_value\" : null,\n" +
                "      \"string_value\" : \"Location#001\"\n" +
                "    }\n" +
                "  }, {\n" +
                "    \"key\" : \"quantity\",\n" +
                "    \"value\" : {\n" +
                "      \"double_value\" : null,\n" +
                "      \"float_value\" : null,\n" +
                "      \"int_value\" : 42,\n" +
                "      \"string_value\" : null\n" +
                "    }\n" +
                "  } ]\n" +
                "}", itemDataset.first().prettyJson());
    }
}
