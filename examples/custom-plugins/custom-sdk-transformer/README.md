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
    }
  }
]
```

Input data, schema of item in data array:

[schema.json](./src/main/resources/schema.json)

Output data schema:

```sql

CREATE EXTERNAL TABLE `ods_events`(
  `app_info` struct<app_id:string,id:string,install_source:string,version:string>, 
  `device` struct<mobile_brand_name:string,mobile_model_name:string,manufacturer:string,screen_width:bigint,screen_height:bigint,carrier:string,network_type:string,operating_system_version:string,operating_system:string,ua_browser:string,ua_browser_version:string,ua_os:string,ua_os_version:string,ua_device:string,ua_device_category:string,system_language:string,time_zone_offset_seconds:bigint,vendor_id:string,advertising_id:string>, 
  `ecommerce` struct<total_item_quantity:bigint,purchase_revenue_in_usd:double,purchase_revenue:double,refund_value_in_usd:double,refund_value:double,shipping_value_in_usd:double,shipping_value:double,tax_value_in_usd:double,tax_value:double,transaction_id:string,unique_items:bigint>, 
  `event_bundle_sequence_id` bigint, 
  `event_date` date,
  `event_dimensions` array<struct<key:string,value:struct<double_value:double,float_value:float,int_value:bigint,string_value:string>>>, 
  `event_id` string, 
  `event_name` string, 
  `event_params` array<struct<key:string,value:struct<double_value:double,float_value:float,int_value:bigint,string_value:string>>>, 
  `event_previous_timestamp` bigint, 
  `event_server_timestamp_offset` bigint, 
  `event_timestamp` bigint, 
  `event_value_in_usd` float, 
  `geo` struct<city:string,continent:string,country:string,metro:string,region:string,sub_continent:string,locale:string>, 
  `ingest_timestamp` bigint, 
  `items` struct<item_id:string,item_name:string,item_brand:string,item_variant:string,item_category:string,item_category2:string,item_category3:string,item_category4:string,item_category5:string,price_in_usd:double,price:double,quantity:bigint,item_revenue_in_usd:double,item_revenue:double,item_refund_in_usd:double,item_refund:double,coupon:string,affiliation:string,location_id:string,item_list_id:string,item_list_name:string,item_list_index:string,promotion_id:string,promotion_name:string,creative_name:string,creative_slot:string>, 
  `platform` string, 
  `privacy_info` array<struct<key:string,value:struct<double_value:double,float_value:float,int_value:bigint,string_value:string>>>, 
  `project_id` string, 
  `traffic_source` struct<medium:string,name:string,source:string>, 
  `user_first_touch_timestamp` bigint, 
  `user_id` string, 
  `user_ltv` struct<revenue:double,currency:string>, 
  `user_properties` array<struct<key:string,value:struct<double_value:double,float_value:float,int_value:bigint,string_value:string,set_timestamp_micros:bigint>>>, 
  `user_pseudo_id` string)

```

## Build custom plugin jar

```sh
cd custom-sdk-transformer/

./gradlew clean build


```

## Plugin jar file

```sh

ls -l ./build/libs/custom-sdk-transformer-1.0.0.jar

```

## Plugin class names

- Transformer: `com.example.clickstream.transformer`

## Use Plugin in solution

Please refer the [deployment guide](../../../docs/en/pipeline-mgmt/data-processing/configure-plugin.md).

## Use Plugin in solution (update cloudformation directly)

1. Upload the jar file to your S3 bucket, e.g. `s3://<bucket>/pipeline/jars/custom-sdk-transformer-1.0.0.jar`

2. Update ETL cloudformation parameters:

| Parameter name                  | Value                                                |
|---------------------------------|------------------------------------------------------|
| **Class name list for plugins** | `com.example.clickstream.transformer.MyTransformer,software.aws.solution.clickstream.UAEnrichment,software.aws.solution.clickstream.IPEnrichment` |
| **Plugin jars**                 | `s3://<bucket>/pipeline/jars/custom-sdk-transformer-1.0.0.jar`                       |

## Run Test

- Run test for all

```sh
./gradlew clean test --info

```
