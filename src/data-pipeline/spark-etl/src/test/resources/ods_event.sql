CREATE EXTERNAL TABLE `ods_events`(
  `app_info` struct<app_id:string,id:string,install_source:string,version:string>, 
  `device` struct<mobile_brand_name:string,mobile_model_name:string,manufacturer:string,screen_width:bigint,screen_height:bigint,carrier:string,network_type:string,operating_system_version:string,operating_system:string,ua_browser:string,ua_browser_version:string,ua_os:string,ua_os_version:string,ua_device:string,ua_device_category:string,system_language:string,time_zone_offset_seconds:bigint,vendor_id:string,advertising_id:string,host_name:string>,
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
  `items` array<struct<brand:string,category:string,category2:string,category3:string,category4:string,category5:string,creative_name:string,creative_slot:string,id:string,location_id:string,name:string,price:double,quantity:int>>,
  `platform` string, 
  `privacy_info` array<struct<key:string,value:struct<double_value:double,float_value:float,int_value:bigint,string_value:string>>>,
  `project_id` string, 
  `traffic_source` struct<medium:string,name:string,source:string>, 
  `user_first_touch_timestamp` bigint, 
  `user_id` string, 
  `user_ltv` struct<revenue:double,currency:string>, 
  `user_properties` array<struct<key:string,value:struct<double_value:double,float_value:float,int_value:bigint,string_value:string,set_timestamp_micros:bigint>>>,
  `user_pseudo_id` string)
PARTITIONED BY ( 
  `partition_app` string COMMENT 'Partition (0)', 
  `partition_year` string COMMENT 'Partition (1)', 
  `partition_month` string COMMENT 'Partition (2)', 
  `partition_day` string COMMENT 'Partition (3)')
ROW FORMAT SERDE 
  'org.apache.hadoop.hive.ql.io.parquet.serde.ParquetHiveSerDe' 
STORED AS INPUTFORMAT 
  'org.apache.hadoop.hive.ql.io.parquet.MapredParquetInputFormat' 
OUTPUTFORMAT 
  'org.apache.hadoop.hive.ql.io.parquet.MapredParquetOutputFormat'
LOCATION
  's3://clickstream-infra-s3sink4dfdadf4-10ewmceey09vp/sink-dp-kafka-2/proj_dp_kafka_2/ods_events/'
TBLPROPERTIES (
  'classification'='parquet', 
  'has_encrypted_data'='false')