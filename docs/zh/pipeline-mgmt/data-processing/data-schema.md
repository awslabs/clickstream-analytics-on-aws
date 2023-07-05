# 数据模式
本文解释了在{{solution_name}}中的数据模式和格式。此解决方案使用基于**事件**的数据模型来存储和分析点击流数据，客户端上的每一项活动（例如，点击，查看）都被模型化为具有多个维度的事件。所有事件都有公共维度，但是客户可以灵活地使用JSON对象将值存储到某些维度（例如，事件参数，用户属性）中，以满足收集特定于其业务的信息的需求。这些JSON将存储在允许客户在分析引擎中取消嵌套值的特殊数据类型中。

## 数据库和表
对于每个项目，解决方案在Redshift和Athena中创建一个名为`<project-id>`的数据库。在Redshift中，每个应用程序都会有一个名为`app_id`的数据模式，在该模式中，事件数据存储在`ods_event`表中，用户相关属性存储在`dim_user`表中。在Athena中，项目中所有应用程序的数据将存储在`ods_event`表中，该表的分区为app_id，年，月，和日。

## 列
ods_event表中的每一列都代表一个特定于事件的参数。注意，某些参数嵌套在Redshift中的Super字段或Athena中的Array字段中，例如items和event_params等这些字段里的参数是可重复的。下面将描述表列。

### 事件字段
|**字段名称**| **Redshift数据类型** | **Athena数据类型** | **描述** |
|--------------|------------------------|------------------------|-------------------|
|event_id| VARCHAR | STRING | 事件的唯一ID。|
|event_date| DATE | DATE | 记录事件的日期（UTC的YYYYMMDD格式）。|
|event_timestame| BIGINT | BIGINT | 客户端上记录事件的时间（以微秒为单位，UTC）。|
|event_previous_timestamp| BIGINT | BIGINT | 客户端上以前记录事件的时间（以微秒为单位，UTC）。|
|event_name| VARCHAR | STRING | 事件的名称。|
|event_value_in_usd| BIGINT | BIGINT | 事件的“值”参数的货币转换值（以USD为单位）。|
|event_bundle_sequence_id| BIGINT | BIGINT | 这些事件上传的捆绑包的序列ID。|
|ingest_timestamp| BIGINT | BIGINT | 收集时间和上传时间之间的时间戳偏移（以微秒为单位）。|

### 事件参数字段
| **字段名称** | **Redshift 数据类型** | **Athena 数据类型** | **描述** |
|---------------------------|--------------------|------------------------|---------------------------------------------------------|
| event_params          | SUPER             |     ARRAY         | 事件参数。                        |
| event_params.key          | VARCHAR             |     STRING         | 事件参数的名称。                        |
| event_params.value        | SUPER             |   ARRAY                     | 包含事件参数值的记录。         |
| event_params.value.string_value  |     VARCHAR          | STRING          | 如果事件参数由字符串表示，例如 URL 或活动名称，则在此字段中填充。 |
| event_params.value.int_value   |         BIGINT           | INTEGER                | 如果事件参数由整数表示，则在此字段中填充。 |
| event_params.value.double_value  |   DOUBLE PRECISION  | FLOAT       | 如果事件参数由双精度值表示，则在此字段中填充。 |
| event_params.value.float_value  |    DOUBLE PRECISION  | FLOAT          | 如果事件参数由浮点值表示，则在此字段中填充。此字段目前未使用。 |

### 用户字段
| 字段名称                   | Redshift 数据类型 | Athena 数据类型 | 描述                                                                  |
| ---------------------------- | -------------------- | --------- | ---------------------------------------------------------------------------- |
| user_id                  | VARCHAR               | STRING  | 通过 `setUserId()` API 分配给用户的唯一 ID。                                    |
| user_pseudo_id     | VARCHAR               | STRING    | SDK 生成的用户伪匿名 ID。                                 |
| user_first_touch_timestamp      | BIGINT             | BIGINT | 用户首次打开应用程序或访问站点的时间（以微秒为单位）。                     |


### 用户属性字段
| 字段名称                   | Redshift 数据类型 | Athena 数据类型 | 描述                                               |
| ---------------------------- | -------------------- | --------- | --------------------------------------------------------- |
| user_properties                  | SUPER               |     ARRAY        | 用户属性。                            |
| user_properties.key     | VARCHAR               |     STRING    | 用户属性的名称。                            |
| user_properties.value               | SUPER               |     ARRAY         | 用户属性值的记录。                      |
| user_properties.value.string_value  | VARCHAR               |       STRING   | 用户属性的字符串值。                    |
| user_properties.value.int_value     | BIGINT             |          BIGINT    | 用户属性的整数值。                   |
| user_properties.value.double_value  | DOUBLE PRECISION             |           FLOAT   | 用户属性的双精度值。                    |
| user_properties.value.float_value   | DOUBLE PRECISION             |         FLOAT     | 此字段目前未使用。                           |
| user_properties.value.set_timestamp_micros | BIGINT |         BIGINT          | 用户属性最后设置的时间（以微秒为单位）。 |
| user_ltv  | SUPER               | ARRAY| 用户的生命周期价值。 |
| user_ltv.revenue  | DOUBLE PRECISION               | FLOAT| 用户的生命周期价值（收入）。 |
| user_ltv.revenue  | DOUBLE PRECISION               | FLOAT| 用户的生命周期价值（货币）。 |

### 设备字段
| 字段名称                   | 数据类型 | Athena 数据类型 | 描述                                                                                              |
| ---------------------------- | --------- | -------------------- | -------------------------------------------------------------------------------------------------------- |
| device.mobile_brand_name             | VARCHAR               |     STRING     | 设备品牌名称。                                                                                   |
| device.mobile_model_name             | VARCHAR               |      STRING       | 设备型号名称。                                                                                   |
| device.manufacturer                  | VARCHAR               |      STRING    | 设备制造商名称。                                                                               |
| device.carrier                       | VARCHAR               |     STRING       | 设备网络提供商名称。                              |
| device.network_type                  | VARCHAR               |     STRING      | 设备的网络类型，例如 WIFI、5G。                                                                     |
| device.operating_system              | VARCHAR               |    STRING        | 设备的操作系统。                                                                                          |
| device.operating_system_version      | VARCHAR               |     STRING         | 操作系统版本。                                                                                          |
| device.vendor_id                     | VARCHAR               |     STRING       | IDFV（仅在未收集 IDFA 时存在）。                                                            |
| device.advertising_id                | VARCHAR               |      STRING        | 广告 ID/IDFA。                                                                                     |
| device.system_language               | VARCHAR               |    STRING        | 操作系统语言。                                                                                         |
| device.time_zone_offset_seconds      | BIGINT             |       BIGINT     | 与 GMT 的偏移量（以秒为单位）。                                                                          |
| device.ua_browser                    | VARCHAR               |     STRING       | 用户查看内容的浏览器，从 User Agent 字符串中派生                                                            |
| device.ua_browser_version      | VARCHAR               |       STRING      | 用户查看内容的浏览器版本，从 User Agent 字符串中派生                                            |
| device.ua_device            | VARCHAR               |            STRING    | 用户查看内容的设备，从 User Agent 中派生。                                                           |
| device.ua_device_category             | VARCHAR               |    STRING               | 用户查看内容的设备类别，从 User Agent 中派生。                                                           |
| device.screen_width             | VARCHAR               |        STRING           | 设备的屏幕宽度。                                                           |
| device.screen_height             | VARCHAR               |       STRING            | 设备的屏幕高度。                                                           |

### 地理字段
| 字段名称          | Redshift 数据类型 | Athena 数据类型 | 描述                                                              |
| ------------------- | ------------------ | -------------------- | ------------------------------------------------------------------------ |
| geo.continent       |     VARCHAR      | STRING               | 基于 IP 地址报告事件的大陆。       |
| geo.sub_continent   |     VARCHAR         | STRING               | 基于 IP 地址报告事件的子大陆。 |
| geo.country        |     VARCHAR         | STRING               | 基于 IP 地址报告事件的国家。      |
| geo.region         |     VARCHAR         | STRING               | 基于 IP 地址报告事件的地区。      |
| geo.city           |     VARCHAR         | STRING               | 基于 IP 地址报告事件的城市。      |
| geo.latitude       |     DOUBLE PRECISION | FLOAT                | 基于 IP 地址报告事件的纬度。      |
| geo.longitude      |     DOUBLE PRECISION | FLOAT                | 基于 IP 地址报告事件的经度。      |
| geo.accuracy       |     BIGINT          | BIGINT               | 基于 IP 地址报告事件的精度。      |
                                                                       |
### 流量字段
| 字段名称               | 数据类型 - Redshift | 数据类型 - Athena | 描述                                                                           |
| ------------------------ | -------------------- | --------- | ------------------------------------------------------------------------------------- |
| traffic_source.name      | VARCHAR               |   STRING   | 报告事件时获取用户的营销活动名称。  |
| traffic_source.medium    | VARCHAR               |  STRING  | 报告事件时获取用户的媒介名称（付费搜索、有机搜索、电子邮件等）。  |
| traffic_source.source    | VARCHAR               |   STRING   | 报告事件时获取用户的网络来源名称。  |


### 应用信息字段
| 字段名称                   | 数据类型 - Redshift | 数据类型 - Athena | 描述                                                                  |
| ---------------------------- | -------------------- | --------- | ---------------------------------------------------------------------------- |
| app_info.id                  | VARCHAR               | STRING  | 应用程序的软件包名称或 Bundle ID。                                    |
| app_info.app_id     | VARCHAR               | STRING    | 与应用相关联的 App ID（由此解决方案创建）。                                 |
| app_info.install_source      | VARCHAR               | STRING    | 安装应用程序的商店。                                            |
| app_info.version             | VARCHAR               | STRING    | 应用程序的 versionName（Android）或简短的 bundle 版本。                     |


### 其他字段
| 字段名称                   | 数据类型 - Redshift | 数据类型 - Athena | 描述                                                                  |
| ---------------------------- | -------------------- | --------- | ---------------------------------------------------------------------------- |
| platform                 | VARCHAR               | STRING  | 事件来源的数据流平台（Web、iOS 或 Android）。                                    |
| project_id     | VARCHAR               | STRING    | 与应用相关联的项目 ID。                                 |
| items      | SUPER               | ARRAY    | 包含与事件关联的项目信息的键值记录。                                            |
| ecommerce             | SUPER               | ARRAY    | 包含与事件关联的电子商务特定属性的键值记录。                      |
| event_dimensions             | SUPER               | ARRAY    | 包含与事件关联的附加维度信息的键值记录。                      |
| privacy_info             | SUPER               | ARRAY    | 包含与事件关联的用户隐私设置信息的键值记录。                      |
