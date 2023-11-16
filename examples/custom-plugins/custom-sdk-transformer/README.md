## Plugin description

The plugin `custom-sdk-transformer` is an example transformer plugin, which transforms input raw json data without compression to clickstream schema.

The plugin does not support:

1. decompress data
2. filter appId
3. check data refresh hours

Example input data:

```json
[
  {
    "hashCode": "80452b0",
    "app_id": "uba-app",
    "unique_id": "83e45133-ddaf-4ac6-9844-fe457807715199",
    "device_id": "deviceid-1682319109447",
    "device_unique_id": "uf24bec657ea8eff7",
    "event_type": "Click3",
    "event_id": "1fcd7f5b-9529-4977-a303-e8c7e39db7b898",
    "event_sequence_id": 2,
    "timestamp": 1682319109447,
    "platform": "ANDROID",
    "os_version": "os-v1.0",
    "make": "Make HUAWEI",
    "brand": "Brand HUAWEI",
    "model": "HUAWEI-P10",
    "carrier": "CDMA",
    "network_type": "Mobile",
    "screen_height": 2259,
    "screen_width": 1080,
    "zone_offset": 28800000,
    "locale": "zh_CN_#Hans",
    "system_language": "zh",
    "country_code": "CN",
    "sdk_version": "0.2.0",
    "sdk_name": "aws-solution-clickstream-sdk",
    "app_version": "1.0",
    "app_package_name": "com.demo.demoapplication",
    "app_title": "test-title-98-0",
    "user": {
      "_user_id": {
        "value": "312121",
        "set_timestamp": 1667877566697
      },
      "_user_name": {
        "value": "demo",
        "set_timestamp": 1667877566697
      },
      "_user_age": {
        "value": 20,
        "set_timestamp": 1667877566697
      },
      "_user_first_touch_timestamp": {
        "value": 1667877267895,
        "set_timestamp": 1667877566697
      },
      "_user_ltv_currency": {
        "value": "USD",
        "set_timestamp": 1667877566697
      },
      "_user_ltv_revenue": {
        "value": 123.45,
        "set_timestamp": 1667877566697
      }
    },
    "attributes": {
      "_traffic_source_medium": "TSM",
      "_traffic_source_name": "TSN",
      "_traffic_source_source": "TSS",
      "_privacy_info_ads_storage": "PIAS",
      "_privacy_info_analytics_storage": "PIAAS",
      "_privacy_info_uses_transient_token": "PIUTT",
      "_channel": "C001",
      "_device_vendor_id": "V001",
      "_device_advertising_id": "DAID001",
      "_error_name_invalid": "",
      "_error_name_length_exceed": "",
      "_error_value_length_exceed": "",
      "_error_attribute_size_exceed": "",
      "_is_first_time": true,
      "_is_first_day": true,
      "_session_id": "see000201912dk-23u92-1df0020",
      "_session_start_timestamp": 1667963966697,
      "_session_duration": 690000
    },
    "items": [
      {
        "id": "item_id1",
        "name": "French Press1",
        "category": "housewares",
        "price": 52.99,
        "brand": "Brand1",
        "category2": "Category-2",
        "category3": "Category-3",
        "category4": "Category-4",
        "category5": "Category-5",
        "creative_name": "Creative Name",
        "creative_slot": "Creative Slot",
        "location_id": "Location#001",
        "quantity": 42
      },
      {
        "id": "d3b237aekdme3l",
        "name": "French Press",
        "category": "housewares",
        "price": 52.99
      },
      {
        "id": "item_id034394ldmf3",
        "name": "French Press3",
        "category": "housewares3",
        "price": 42.33,
        "brand": "Brand-3",
        "category2": "Category-2 3",
        "category3": "Category-3 3",
        "category4": "Category-4 3",
        "category5": "Category-5 3",
        "creative_name": "Creative Name 3",
        "creative_slot": "Creative Slot 3",
        "location_id": "Location#003",
        "quantity": 19
      }
    ]
  }
]
```

Input data, schema of item in data array:

[schema.json](./src/main/resources/schema.json)

Output datasets schema:

- event
```json
{
  "type" : "struct",
  "fields" : [ {
    "name" : "event_id",
    "type" : "string",
    "nullable" : true,
    "metadata" : { }
  }, {
    "name" : "event_date",
    "type" : "date",
    "nullable" : true,
    "metadata" : { }
  }, {
    "name" : "event_timestamp",
    "type" : "long",
    "nullable" : true,
    "metadata" : { }
  }, {
    "name" : "event_previous_timestamp",
    "type" : "long",
    "nullable" : true,
    "metadata" : { }
  }, {
    "name" : "event_name",
    "type" : "string",
    "nullable" : true,
    "metadata" : { }
  }, {
    "name" : "event_value_in_usd",
    "type" : "float",
    "nullable" : true,
    "metadata" : { }
  }, {
    "name" : "event_bundle_sequence_id",
    "type" : "long",
    "nullable" : true,
    "metadata" : { }
  }, {
    "name" : "ingest_timestamp",
    "type" : "long",
    "nullable" : true,
    "metadata" : { }
  }, {
    "name" : "device",
    "type" : {
      "type" : "struct",
      "fields" : [ {
        "name" : "mobile_brand_name",
        "type" : "string",
        "nullable" : true,
        "metadata" : { }
      }, {
        "name" : "mobile_model_name",
        "type" : "string",
        "nullable" : true,
        "metadata" : { }
      }, {
        "name" : "manufacturer",
        "type" : "string",
        "nullable" : true,
        "metadata" : { }
      }, {
        "name" : "screen_width",
        "type" : "long",
        "nullable" : true,
        "metadata" : { }
      }, {
        "name" : "screen_height",
        "type" : "long",
        "nullable" : true,
        "metadata" : { }
      }, {
        "name" : "carrier",
        "type" : "string",
        "nullable" : true,
        "metadata" : { }
      }, {
        "name" : "network_type",
        "type" : "string",
        "nullable" : true,
        "metadata" : { }
      }, {
        "name" : "operating_system_version",
        "type" : "string",
        "nullable" : true,
        "metadata" : { }
      }, {
        "name" : "operating_system",
        "type" : "string",
        "nullable" : true,
        "metadata" : { }
      }, {
        "name" : "ua_browser",
        "type" : "string",
        "nullable" : true,
        "metadata" : { }
      }, {
        "name" : "ua_browser_version",
        "type" : "string",
        "nullable" : true,
        "metadata" : { }
      }, {
        "name" : "ua_os",
        "type" : "string",
        "nullable" : true,
        "metadata" : { }
      }, {
        "name" : "ua_os_version",
        "type" : "string",
        "nullable" : true,
        "metadata" : { }
      }, {
        "name" : "ua_device",
        "type" : "string",
        "nullable" : true,
        "metadata" : { }
      }, {
        "name" : "ua_device_category",
        "type" : "string",
        "nullable" : true,
        "metadata" : { }
      }, {
        "name" : "system_language",
        "type" : "string",
        "nullable" : true,
        "metadata" : { }
      }, {
        "name" : "time_zone_offset_seconds",
        "type" : "long",
        "nullable" : true,
        "metadata" : { }
      }, {
        "name" : "vendor_id",
        "type" : "string",
        "nullable" : true,
        "metadata" : { }
      }, {
        "name" : "advertising_id",
        "type" : "string",
        "nullable" : true,
        "metadata" : { }
      }, {
        "name" : "host_name",
        "type" : "string",
        "nullable" : true,
        "metadata" : { }
      }, {
        "name" : "viewport_width",
        "type" : "long",
        "nullable" : true,
        "metadata" : { }
      }, {
        "name" : "viewport_height",
        "type" : "long",
        "nullable" : true,
        "metadata" : { }
      } ]
    },
    "nullable" : false,
    "metadata" : { }
  }, {
    "name" : "geo",
    "type" : {
      "type" : "struct",
      "fields" : [ {
        "name" : "country",
        "type" : "string",
        "nullable" : true,
        "metadata" : { }
      }, {
        "name" : "continent",
        "type" : "string",
        "nullable" : true,
        "metadata" : { }
      }, {
        "name" : "sub_continent",
        "type" : "string",
        "nullable" : true,
        "metadata" : { }
      }, {
        "name" : "locale",
        "type" : "string",
        "nullable" : true,
        "metadata" : { }
      }, {
        "name" : "region",
        "type" : "string",
        "nullable" : true,
        "metadata" : { }
      }, {
        "name" : "metro",
        "type" : "string",
        "nullable" : true,
        "metadata" : { }
      }, {
        "name" : "city",
        "type" : "string",
        "nullable" : true,
        "metadata" : { }
      } ]
    },
    "nullable" : false,
    "metadata" : { }
  }, {
    "name" : "traffic_source",
    "type" : {
      "type" : "struct",
      "fields" : [ {
        "name" : "medium",
        "type" : "string",
        "nullable" : true,
        "metadata" : { }
      }, {
        "name" : "name",
        "type" : "string",
        "nullable" : true,
        "metadata" : { }
      }, {
        "name" : "source",
        "type" : "string",
        "nullable" : true,
        "metadata" : { }
      } ]
    },
    "nullable" : false,
    "metadata" : { }
  }, {
    "name" : "app_info",
    "type" : {
      "type" : "struct",
      "fields" : [ {
        "name" : "app_id",
        "type" : "string",
        "nullable" : true,
        "metadata" : { }
      }, {
        "name" : "id",
        "type" : "string",
        "nullable" : true,
        "metadata" : { }
      }, {
        "name" : "install_source",
        "type" : "string",
        "nullable" : true,
        "metadata" : { }
      }, {
        "name" : "version",
        "type" : "string",
        "nullable" : true,
        "metadata" : { }
      }, {
        "name" : "sdk_version",
        "type" : "string",
        "nullable" : true,
        "metadata" : { }
      }, {
        "name" : "sdk_name",
        "type" : "string",
        "nullable" : true,
        "metadata" : { }
      } ]
    },
    "nullable" : false,
    "metadata" : { }
  }, {
    "name" : "platform",
    "type" : "string",
    "nullable" : true,
    "metadata" : { }
  }, {
    "name" : "project_id",
    "type" : "string",
    "nullable" : false,
    "metadata" : { }
  }, {
    "name" : "items",
    "type" : {
      "type" : "array",
      "elementType" : {
        "type" : "struct",
        "fields" : [ {
          "name" : "id",
          "type" : "string",
          "nullable" : true,
          "metadata" : { }
        }, {
          "name" : "quantity",
          "type" : "long",
          "nullable" : true,
          "metadata" : { }
        }, {
          "name" : "price",
          "type" : "double",
          "nullable" : true,
          "metadata" : { }
        }, {
          "name" : "currency",
          "type" : "string",
          "nullable" : true,
          "metadata" : { }
        }, {
          "name" : "creative_name",
          "type" : "string",
          "nullable" : true,
          "metadata" : { }
        }, {
          "name" : "creative_slot",
          "type" : "string",
          "nullable" : true,
          "metadata" : { }
        } ]
      },
      "containsNull" : true
    },
    "nullable" : true,
    "metadata" : { }
  }, {
    "name" : "user_pseudo_id",
    "type" : "string",
    "nullable" : true,
    "metadata" : { }
  }, {
    "name" : "user_id",
    "type" : "string",
    "nullable" : true,
    "metadata" : { }
  }, {
    "name" : "ua",
    "type" : "string",
    "nullable" : true,
    "metadata" : { }
  }, {
    "name" : "geo_for_enrich",
    "type" : {
      "type" : "struct",
      "fields" : [ {
        "name" : "ip",
        "type" : "string",
        "nullable" : true,
        "metadata" : { }
      }, {
        "name" : "locale",
        "type" : "string",
        "nullable" : true,
        "metadata" : { }
      } ]
    },
    "nullable" : false,
    "metadata" : { }
  } ]
}

```

- event_parameter
```json
{
  "type" : "struct",
  "fields" : [ {
    "name" : "app_id",
    "type" : "string",
    "nullable" : true,
    "metadata" : { }
  }, {
    "name" : "event_date",
    "type" : "date",
    "nullable" : true,
    "metadata" : { }
  }, {
    "name" : "event_timestamp",
    "type" : "long",
    "nullable" : true,
    "metadata" : { }
  }, {
    "name" : "event_id",
    "type" : "string",
    "nullable" : true,
    "metadata" : { }
  }, {
    "name" : "event_name",
    "type" : "string",
    "nullable" : true,
    "metadata" : { }
  }, {
    "name" : "event_param_key",
    "type" : "string",
    "nullable" : true,
    "metadata" : { }
  }, {
    "name" : "event_param_double_value",
    "type" : "double",
    "nullable" : true,
    "metadata" : { }
  }, {
    "name" : "event_param_float_value",
    "type" : "float",
    "nullable" : true,
    "metadata" : { }
  }, {
    "name" : "event_param_int_value",
    "type" : "long",
    "nullable" : true,
    "metadata" : { }
  }, {
    "name" : "event_param_string_value",
    "type" : "string",
    "nullable" : true,
    "metadata" : { }
  } ]
}

```

- item
```json
{
  "type" : "struct",
  "fields" : [ {
    "name" : "app_id",
    "type" : "string",
    "nullable" : true,
    "metadata" : { }
  }, {
    "name" : "event_date",
    "type" : "date",
    "nullable" : true,
    "metadata" : { }
  }, {
    "name" : "event_timestamp",
    "type" : "long",
    "nullable" : true,
    "metadata" : { }
  }, {
    "name" : "id",
    "type" : "string",
    "nullable" : true,
    "metadata" : { }
  }, {
    "name" : "properties",
    "type" : {
      "type" : "array",
      "elementType" : {
        "type" : "struct",
        "fields" : [ {
          "name" : "key",
          "type" : "string",
          "nullable" : true,
          "metadata" : { }
        }, {
          "name" : "value",
          "type" : {
            "type" : "struct",
            "fields" : [ {
              "name" : "double_value",
              "type" : "double",
              "nullable" : true,
              "metadata" : { }
            }, {
              "name" : "float_value",
              "type" : "float",
              "nullable" : true,
              "metadata" : { }
            }, {
              "name" : "int_value",
              "type" : "long",
              "nullable" : true,
              "metadata" : { }
            }, {
              "name" : "string_value",
              "type" : "string",
              "nullable" : true,
              "metadata" : { }
            } ]
          },
          "nullable" : true,
          "metadata" : { }
        } ]
      },
      "containsNull" : true
    },
    "nullable" : true,
    "metadata" : { }
  } ]
}

```

- user 
```json
{
  "type" : "struct",
  "fields" : [ {
    "name" : "app_id",
    "type" : "string",
    "nullable" : true,
    "metadata" : { }
  }, {
    "name" : "event_date",
    "type" : "date",
    "nullable" : true,
    "metadata" : { }
  }, {
    "name" : "event_timestamp",
    "type" : "long",
    "nullable" : true,
    "metadata" : { }
  }, {
    "name" : "user_id",
    "type" : "string",
    "nullable" : true,
    "metadata" : { }
  }, {
    "name" : "user_pseudo_id",
    "type" : "string",
    "nullable" : true,
    "metadata" : { }
  }, {
    "name" : "user_first_touch_timestamp",
    "type" : "long",
    "nullable" : true,
    "metadata" : { }
  }, {
    "name" : "user_properties",
    "type" : {
      "type" : "array",
      "elementType" : {
        "type" : "struct",
        "fields" : [ {
          "name" : "key",
          "type" : "string",
          "nullable" : true,
          "metadata" : { }
        }, {
          "name" : "value",
          "type" : {
            "type" : "struct",
            "fields" : [ {
              "name" : "double_value",
              "type" : "double",
              "nullable" : true,
              "metadata" : { }
            }, {
              "name" : "float_value",
              "type" : "float",
              "nullable" : true,
              "metadata" : { }
            }, {
              "name" : "int_value",
              "type" : "long",
              "nullable" : true,
              "metadata" : { }
            }, {
              "name" : "string_value",
              "type" : "string",
              "nullable" : true,
              "metadata" : { }
            }, {
              "name" : "set_timestamp_micros",
              "type" : "long",
              "nullable" : true,
              "metadata" : { }
            } ]
          },
          "nullable" : true,
          "metadata" : { }
        } ]
      },
      "containsNull" : true
    },
    "nullable" : true,
    "metadata" : { }
  }, {
    "name" : "user_ltv",
    "type" : {
      "type" : "struct",
      "fields" : [ {
        "name" : "revenue",
        "type" : "double",
        "nullable" : true,
        "metadata" : { }
      }, {
        "name" : "currency",
        "type" : "string",
        "nullable" : true,
        "metadata" : { }
      } ]
    },
    "nullable" : true,
    "metadata" : { }
  }, {
    "name" : "_first_visit_date",
    "type" : "date",
    "nullable" : true,
    "metadata" : { }
  }, {
    "name" : "_first_referer",
    "type" : "string",
    "nullable" : true,
    "metadata" : { }
  }, {
    "name" : "_first_traffic_source_type",
    "type" : "string",
    "nullable" : true,
    "metadata" : { }
  }, {
    "name" : "_first_traffic_medium",
    "type" : "string",
    "nullable" : true,
    "metadata" : { }
  }, {
    "name" : "_first_traffic_source",
    "type" : "string",
    "nullable" : true,
    "metadata" : { }
  }, {
    "name" : "device_id_list",
    "type" : {
      "type" : "array",
      "elementType" : "string",
      "containsNull" : true
    },
    "nullable" : true,
    "metadata" : { }
  }, {
    "name" : "_channel",
    "type" : "string",
    "nullable" : true,
    "metadata" : { }
  } ]
}
```

## Build custom plugin jar

```sh
cd custom-sdk-transformer/

./gradlew clean build


```

## Plugin jar file

```sh

ls -l ./build/libs/custom-sdk-transformer-1.1.0.jar

```

## Plugin class names

- Transformer: `com.example.clickstream.transformer.v2.MyTransformerV2`

## Use Plugin in solution

Please refer the [deployment guide](../../../docs/en/pipeline-mgmt/data-processing/configure-plugin.md).

## Use Plugin in solution (update cloudformation directly)

1. Upload the jar file to your S3 bucket, e.g. `s3://<bucket>/pipeline/jars/custom-sdk-transformer-1.1.0.jar`

2. Update ETL cloudformation parameters:

| Parameter name                  | Value                                                |
|---------------------------------|------------------------------------------------------|
| **Class name list for plugins** | `com.example.clickstream.transformer.v2.MyTransformerV2,software.aws.solution.clickstream.UAEnrichment,software.aws.solution.clickstream.IPEnrichment` |
| **Plugin jars**                 | `s3://<bucket>/pipeline/jars/custom-sdk-transformer-1.0.0.jar`                       |

## Run Test

- Run test for all

```sh
./gradlew clean test --info

```
