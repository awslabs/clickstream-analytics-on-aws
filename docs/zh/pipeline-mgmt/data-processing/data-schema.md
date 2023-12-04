# 数据模式
本文解释了在{{solution_name}}中的数据模式和格式。此解决方案使用基于**事件**的数据模型来存储和分析点击流数据，客户端上的每一项活动（例如，点击，查看）都被模型化为具有多个维度的事件。所有事件都有公共维度，但是客户可以灵活地使用JSON对象将值存储到某些维度（例如，事件参数，用户属性）中，以满足收集特定于其业务的信息的需求。这些JSON将存储在允许客户在分析引擎中取消嵌套值的特殊数据类型中。

## 数据库和表
对于每个项目，该解决方案在Redshift和Athena中创建一个名为`<project-id>`的数据库。每个应用将具有一个名为`app_id`的数据模式（schema），其中与事件相关的数据存储在`event`和`event_parameter`表中，与用户相关的数据存储在`user`表中，与对象相关的数据存储在`item`表中。在Athena中，所有表都增加了`app_id`、`year`、`month`和`day`的分区。下面的图表说明了表之间的关系。

![table-relationship](../../images/pipe-mgmt/table_relationship.png)

## 列
表中的每一列都表示事件、用户或对象的特定参数。请注意，某些参数嵌套在Redshift的Super字段中或在Athena的Array中，这些字段（例如，items、user_properties 和 item properties）包含可重复的参数。表格列的描述如下。



### 事件字段
|**字段名称**| **Redshift数据类型** | **Athena数据类型** | **描述** |
|-----------------------------|-------------------|-------------------|--------------------------------------------|
| event_id                    | VARCHAR           | STRING            | 事件的唯一标识符。                        |
| event_date                  | DATE              | DATE              | 记录事件的日期（以UTC的YYYYMMDD格式）。    |
| event_timestamp             | BIGINT            | BIGINT            | 客户端记录事件的时间（微秒，UTC）。        |
| event_previous_timestamp    | BIGINT            | BIGINT            | 客户端先前记录事件的时间（微秒，UTC）。    |
| event_name                  | VARCHAR           | STRING            | 事件的名称。                              |
| event_value_in_usd          | BIGINT            | BIGINT            | 事件“value”参数的货币转换值（以USD计）。   |
| event_bundle_sequence_id    | BIGINT            | BIGINT            | 包含这些事件的捆绑的顺序ID。              |
| ingest_timestamp            | BIGINT            | BIGINT            | 采集时间和上传时间之间的时间戳偏移（微秒）。|
| device.mobile_brand_name    | VARCHAR           | STRING            | 设备品牌名称。                           |
| device.mobile_model_name    | VARCHAR           | STRING            | 设备型号名称。                           |
| device.manufacturer         | VARCHAR           | STRING            | 设备制造商名称。                         |
| device.carrier              | VARCHAR           | STRING            | 设备网络提供商名称。                     |
| device.network_type         | VARCHAR           | STRING            | 设备的网络类型，例如WIFI，5G。             |
| device.operating_system     | VARCHAR           | STRING            | 设备的操作系统。                         |
| device.operating_system_version | VARCHAR      | STRING            | 操作系统版本。                         |
| device.vendor_id            | VARCHAR           | STRING            | IDFV（仅在未收集IDFA时存在）。          |
| device.advertising_id       | VARCHAR           | STRING            | 广告ID/IDFA。                            |
| device.system_language      | VARCHAR           | STRING            | 操作系统语言。                         |
| device.time_zone_offset_seconds | BIGINT         | BIGINT            | 相对GMT的偏移秒数。                    |
| device.ua_browser           | VARCHAR           | STRING            | 用户查看内容时所使用的浏览器，派生自User Agent字符串。 |
| device.ua_browser_version   | VARCHAR           | STRING            | 用户查看内容时所使用的浏览器的版本，派生自User Agent。   |
| device.ua_device            | VARCHAR           | STRING            | 用户查看内容时所使用的设备，派生自User Agent。         |
| device.ua_device_category   | VARCHAR           | STRING            | 用户查看内容时所使用的设备类别，派生自User Agent。     |
| device.screen_width         | VARCHAR           | STRING            | 设备的屏幕宽度。                         |
| device.screen_height        | VARCHAR           | STRING            | 设备的屏幕高度。                         |
| geo.continent               | VARCHAR           | STRING            | 基于IP地址报告事件的大洲。              |
| geo.sub_continent           | VARCHAR           | STRING            | 基于IP地址报告事件的次大洲。           |
| geo.country                 | VARCHAR           | STRING            | 基于IP地址报告事件的国家。             |
| geo.region                  | VARCHAR           | STRING            | 基于IP地址报告事件的区域。             |
| geo.metro                   | VARCHAR           | STRING            | 基于IP地址报告事件的大都市区。         |
| geo.city                    | VARCHAR           | STRING            | 基于IP地址报告事件的城市。             |
| geo.locale                  | VARCHAR           | STRING            | 从设备获取的区域设置信息。             |
| traffic_source.name         | VARCHAR           | STRING            | 在报告事件时获得用户的营销活动名称。    |
| traffic_source.medium       | VARCHAR           | STRING            | 在报告事件时获得用户的媒介（付费搜索、有机搜索、电子邮件等）名称。|
| traffic_source.source       | VARCHAR           | STRING            | 在报告事件时获得用户的网络来源名称。    |
| app_info.id                 | VARCHAR           | STRING            | 应用程序的包名称或捆绑ID。              |
| app_info.app_id             | VARCHAR           | STRING            | 与应用程序相关联的应用程序ID（由此解决方案创建）。|
| app_info.install_source      | VARCHAR           | STRING            | 安装应用程序的商店。                   |
| app_info.version             | VARCHAR           | STRING            | 应用程序的versionName（Android）或简短的捆绑版本。|
| platform                    | VARCHAR           | STRING            | 事件来源的数据流平台（Web、IOS或Android）。|
| project_id                  | VARCHAR           | STRING            | 与应用程序相关联的项目ID。               |
| items                       | SUPER             | ARRAY             | 包含与事件相关的项目信息的键值记录。    |
| user_id                     | VARCHAR           | STRING            | 通过`setUserId()` API分配给用户的唯一ID。|
| user_pseudo_id              | VARCHAR           | STRING            | SDK生成的用户的匿名ID。                |


### 事件参数字段
| **字段名称** | **Redshift 数据类型** | **Athena 数据类型** | **描述** |
|---------------------------|--------------------|------------------------|---------------------------------------------------------|
| event_id                    | VARCHAR           | STRING            | 事件的唯一标识符。                        |
| event_name                  | VARCHAR           | STRING            | 事件的名称。                              |
| event_params          | SUPER             |     ARRAY         | 事件参数。                        |
| event_params.key          | VARCHAR             |     STRING         | 事件参数的名称。                        |
| event_params.value        | SUPER             |   ARRAY                     | 包含事件参数值的记录。         |
| event_params.value.string_value  |     VARCHAR          | STRING          | 如果事件参数由字符串表示，例如 URL 或活动名称，则在此字段中填充。 |
| event_params.value.int_value   |         BIGINT           | INTEGER                | 如果事件参数由整数表示，则在此字段中填充。 |
| event_params.value.double_value  |   DOUBLE PRECISION  | FLOAT       | 如果事件参数由双精度值表示，则在此字段中填充。 |
| event_params.value.float_value  |    DOUBLE PRECISION  | FLOAT          | 如果事件参数由浮点值表示，则在此字段中填充。此字段目前未使用。 |

### 用户字段
| 字段名称                             | 数据类型 - Redshift | 数据类型 - Athena | 描述                                                                      |
|------------------------------------|---------------------|-------------------|---------------------------------------------------------------------------|
| event_timestamp                    | BIGINT              | STRING            | 用户属性被收集的时间戳（微秒）。                                             |
| user_id                            | VARCHAR             | STRING            | 通过 `setUserId()` API 分配给用户的唯一ID。                                   |
| user_pseudo_id                    | VARCHAR             | STRING            | SDK为用户生成的匿名ID。                                                  |
| user_first_touch_timestamp        | BIGINT              | BIGINT            | 用户首次打开应用或访问站点的时间（微秒）。                                    |
| user_properties                   | SUPER               | ARRAY             | 用户的属性。                                                              |
| user_properties.key               | VARCHAR             | STRING            | 用户属性的名称。                                                          |
| user_properties.value             | SUPER               | ARRAY             | 用户属性值的记录。                                                       |
| user_properties.value.string_value | VARCHAR             | STRING            | 用户属性的字符串值。                                                     |
| user_properties.value.int_value    | BIGINT              | BIGINT            | 用户属性的整数值。                                                       |
| user_properties.value.double_value | DOUBLE PRECISION    | FLOAT             | 用户属性的双精度值。                                                     |
| user_properties.value.float_value  | DOUBLE PRECISION    | FLOAT             | 此字段目前未使用。                                                       |
| user_ltv                          | SUPER               | ARRAY             | 用户的生命周期价值。                                                    |
| _first_visit_date                 | Date                | Date              | 用户首次访问的日期。                                                      |
| _first_referer                    | VARCHAR             | STRING            | 检测到用户的第一个引荐来源。                                               |
| _first_traffic_source_type        | VARCHAR             | STRING            | 获取用户的第一个被检测到的网络来源，例如Google、Baidu等。               |
| _first_traffic_source_medium      | VARCHAR             | STRING            | 获取用户的第一个被检测到的网络来源的媒介，例如付费搜索、有机搜索、电子邮件等。 |
| _first_traffic_source_name        | VARCHAR             | STRING            | 获取用户的第一个被检测到的营销活动的名称。                                |
| device_id_list                    | SUPER               | ARRAY             | 与 user_pseudo_id 关联的所有 device_id 的记录。                          |
| _channel                          | VARCHAR             | STRING            | 用户的安装渠道，例如 Google Play。                                       |


### Item 表字段
| 字段名称                  | 数据类型 - RedShift | 数据类型 - Athena | 描述                                               |
| ------------------------ | ------------------- | ----------------- | --------------------------------------------------- |
| event_timestamp          | BIGINT              | STRING            | 记录项目属性被收集的时间戳（微秒）。                  |
| id                       | VARCHAR             | STRING            | 项目的ID。                                          |
| properties               | SUPER               | ARRAY             | 项目属性值的记录。                                   |
| properties.value.string_value  | VARCHAR     | STRING       | 项目属性的字符串值。                              |
| properties.value.int_value     | BIGINT      | BIGINT       | 项目属性的整数值。                                 |
| properties.value.double_value  | DOUBLE PRECISION | FLOAT  | 项目属性的双精度值。                               |
| properties.value.float_value   | DOUBLE PRECISION | FLOAT  | 项目属性的浮点值。                                |

