# Clickstream Unity SDK

## 介绍

Clickstream Unity SDK 可以帮助您轻松将 Unity 应用里的点击流数据发送到您配置的解决方案数据管道。该 SDK 提供了易于使用的数据收集
API，同时我们添加了自动收集常见用户事件和属性的功能（例如，应用启动和场景加载），以简化用户的数据收集过程。

## 集成 SDK

### 初始化 SDK

我们使用 Unity Package Manager 来分发我们的 SDK。

1. 在 Unity Editor 中打开 `Window` 并点击 `Package Manager`
2. 点击 `+` 按钮，然后选择 `Add package from git URL...`
3. 输入 `https://github.com/awslabs/clickstream-unity` 然后点击 `Add` 并等待完成。

### 初始化 SDK

```c#
using ClickstreamAnalytics;

ClickstreamAnalytics.Init(new ClickstreamConfiguration{
    AppId = "your AppId",
    Endpoint = "https://example.com/collect"
});
```

### 开始使用

#### 记录事件

```c#
using ClickstreamAnalytics;

var attributes = new Dictionary<string, object>{
    { "event_category", "shoes" },
    { "currency", "CNY" },
    { "value", 279.9 }
};
ClickstreamAnalytics.Record("button_click", attributes);

// 记录只带有事件名的事件
ClickstreamAnalytics.Record("button_click");
```

#### 登录和登出

```c#
using ClickstreamAnalytics;

// 当用户登录成功后调用
ClickstreamAnalytics.SetUserId("UserId");

// 当用户退出登录时调用
ClickstreamAnalytics.SetUserId(null);
```

#### 添加用户属性

```c#
using ClickstreamAnalytics;

var userAttrs = new Dictionary<string, object> {
    { "userName", "carl" },
    { "userAge", 22 }
};
ClickstreamAnalytics.SetUserAttributes(userAttrs);
```

首次集成 SDK 后打开时，你需要手动设置一次用户属性，当前登录用户的属性会缓存到 PlayerPrefs
中，因此下次启动游戏时不需要再次设置所有用户属性，当然你可以使用相同的 API `ClickstreamAnalytics.SetUserAttributes()`
来更新当前用户的属性。

#### 添加全局属性

1. 在 SDK 初始化时添加全局属性

    以下示例代码展示了如何在初始化 SDK 时添加全局属性
    
    ```c#
    using ClickstreamAnalytics;
    
    ClickstreamAnalytics.Init(new ClickstreamConfiguration
    {
        AppId = "your AppId",
        Endpoint = "https://example.com/collect",
        GlobalAttributes = new Dictionary<string, object>
        {
            { "_app_install_channel", "Amazon Store" }
        }
    });
    ```

2. 在初始化 SDK 后添加全局属性。
    
    ```c#
    using ClickstreamAnalytics;
    
    ClickstreamAnalytics.SetGlobalAttributes(new Dictionary<string, object>
    {
        { "_traffic_source_source", "Search engine" }, { "level", 10 }
    });
    ```

建议在初始化 SDK 时设置全局属性，全局属性将在设置后包含在所有事件中，你也可以通过将其值设置为 `null` 来移除全局属性。

#### 其他配置

除了必需的 `AppId` 和 `Endpoint`，您还可以配置其他参数以满足更多定制化的使用：

```c#
using ClickstreamAnalytics;

ClickstreamAnalytics.Init(new ClickstreamConfiguration
{
    AppId = "your AppId",
    Endpoint = "https://example.com/collect",
    SendEventsInterval = 10000,
    IsCompressEvents = true,
    IsLogEvents = false,
    IsTrackAppStartEvents = true,
    IsTrackAppEndEvents = true,
    IsTrackSceneLoadEvents = true,
    IsTrackSceneUnLoadEvents = true
});
```

以下是每个参数的说明

| 参数名称                     | 是否必需   | 默认值   | 解释                                |
|--------------------------|--------|-------|-----------------------------------|
| AppId                    | true   | --    | Clickstream 控制台中你的应用的 app id      |
| Endpoint                 | true   | --    | 您将事件上传到 Clickstream 摄取服务器的URL请求路径 |
| SendEventsInterval       | false  | 10000 | 事件发送间隔毫秒数                         |
| IsLogEvents              | false  | false | 是否在控制台打印事件json内容以进行调试             |
| IsTrackAppStartEvents    | false  | true  | 应用获得焦点时是否自动记录 _app_start 事件       |
| IsTrackAppEndEvents      | false  | true  | 应用失去焦点时是否自动记录 _app_end 事件事件       |
| IsTrackSceneLoadEvents   | false  | true  | 场景加载时是否自动记录 _scene_load 事件        |
| IsTrackSceneUnLoadEvents | false  | true  | 场景卸载时是否自动记录 _scene_unload 事件      |

#### 更新配置

在初始化 SDK 后，你可以更新默认配置，以下是你可以自定义的附加配置选项。

```c#
using ClickstreamAnalytics;

ClickstreamAnalytics.UpdateConfiguration(new Configuration
{
    AppId = "your AppId",
    Endpoint = "https://example.com/collect",
    IsCompressEvents = false,
    IsLogEvents = true,
    IsTrackAppStartEvents = false,
    IsTrackAppEndEvents = false,
    IsTrackSceneLoadEvents = false,
    IsTrackSceneUnLoadEvents = false
});
```

#### 调试事件

您可以按照以下步骤查看事件原始 JSON 并调试您的事件。

1. 使用 `ClickstreamAnalytics.Init()` API 并在调试模式下将  `IsLogEvents` 属性设置为 true。
2. 集成 SDK 并在 Unity Editor 中启动你的游戏, 然后打开 Console 选项卡。
3. 在过滤器中输入 `[ClickstreamAnalytics]`, 你将看到 Clickstream Unity SDK 记录的所有事件的 JSON 内容。

## 数据格式定义

### 数据类型

Clickstream Unity SDK 支持以下数据类型：

| 数据类型     | 范围                                                     | 示例                     |
|----------|--------------------------------------------------------|------------------------|
| int      | -2,147,483,648 ～ 2,147,483,647                         | 42                     |
| uint     | 0 ～ 4,294,967,295                                      | 123456U                |
| byte     | 0 ～ 255                                                | (byte)5                |
| sbyte    | -128 ～ 127                                             | (sbyte)-10             |
| short    | -32,768 ～ 32,767                                       | (short)-200            |
| ushort   | 	0 to 65,535                                           | (ushort)1000           |
| long     | -9,223,372,036,854,775,808 ～ 9,223,372,036,854,775,807 | 9876543210L            |
| ulong    | 0 ～ 18,446,744,073,709,551,615                         | 12345678901234567890UL |
| float    | +- 1.5E−45 ～ +- 3.4E+38                                | 19.99f                 |       
| double   | +- 5E-324 ～ +- 1.7E+308                                | 3.141592653589793      |       
| decimal  | +- 1.0E-28 ～ +- 7.9228E+28                             | 0.075m                 |       
| bool     | true, false                                            | true                   |
| string   | max support 1024 characters                            | "clickstream"          |

### 命名规则

1. 事件名称和属性名称不能以数字开头，只能包含：大小写字母、数字、下划线，如果事件名称无效，SDK会记录`_clickstream_error`
   事件，如果属性或用户属性名称无效，该属性将被丢弃并记录 `_clickstream_error` 事件。

2. 不要使用 `_` 作为事件名称和属性名称的前缀，`_` 前缀是 Clickstream Analytics 保留的。

3. 事件名称和属性名称区分大小写。因此，事件 `Add_to_cart` 和 `add_to_cart` 将被视为两个不同的事件。

### 事件和属性限制

为了提高查询和分析的效率，我们需要对事件进行以下限制：

| Name      | Suggestion | Hard limit | Strategy                                 | Error code |
|-----------|------------|------------|------------------------------------------|------------|
| 事件名称合规    | --         | --         | 丢弃该事件，打印日志并记录`_clickstream_error`事件      | 1001       |
| 事件名称长度    | 少于 25 个字符  | 50 个字符     | 丢弃该事件，打印日志并记录`_clickstream_error`事件      | 1002       |
| 事件属性名称的长度 | 少于 25 个字符  | 50 个字符     | 丢弃该属性、打印日志并在事件属性中记录错误                    | 2001       |
| 属性名称合规    | --         | --         | 丢弃该属性、打印日志并在事件属性中记录错误                    | 2002       |
| 事件属性值的长度  | 少于 100 个字符 | 1024 个字符   | 丢弃该属性、打印日志并在事件属性中记录错误                    | 2003       |
| 每个事件的事件属性 | 少于 50 个    | 500 个事件属性  | 丢弃该属性、打印日志并在事件属性中记录错误                    | 2004       |
| 事件属性值类型合规 | --         | --         | 丢弃该属性、打印日志并在事件属性中记录错误                    | 2005       |
| 用户属性数     | 少于 25 个    | 100 个用户属性  | 丢弃超过限制的属性、打印日志并记录`_clickstream_error`事件  | 3001       |
| 用户属性名称的长度 | 少于 25 个字符  | 50 个字符     | 丢弃超过限制的属性、打印日志并记录`_clickstream_error`事件  | 3002       |
| 用户属性名称合规  | --         | --         | 丢弃超过限制的属性、打印日志并记录`_clickstream_error`事件  | 3003       |
| 用户属性值的长度  | 少于 50 个字符  | 256 个字符    | 丢弃超过限制的属性、打印日志并记录`_clickstream_error`事件  | 3004       |
| 用户属性值类型合规 | --         | --         | 丢弃超过限制的属性、打印日志并记录`_clickstream_error`事件  | 3005       |

!!! info "重要提示"

    - 字符限制适用于单宽字符语言（如英语）和双宽字符语言（如中文）。
    - 事件属性数包括事件中的预设属性。
    - 如果多次添加相同名称的属性或用户属性，则值将被最后一个值覆盖。
    - 超过限制的所有错误都会在事件attributes里记录 `_error_code` 和 `_error_message` 这两个字段。

## 预置事件

### 自动收集的事件

| 事件名                | 触发时机                                               | 事件属性                                                     |
|--------------------|----------------------------------------------------|----------------------------------------------------------|
| _first_open        | 用户第一次启动该应用                                         |                                                          |
| _app_start         | 每次应用获得焦点时                                          | 1. _is_first_time(当应用程序启动后第一个`_app_start`事件时，值为`true`)   |
| _app_end           | 每次应用失去焦点时                                          |                                                          |
| _scene_load        | 每次场景加载时                                            | 1. _scene_name <br>2. _scene_path                        |
| _scene_unload      | 每次场景卸载时                                            | 1. _scene_name <br>2. _scene_path                        |
| _profile_set       | 当 API  `SetUserAttributes()` 或者 `SetUserId()` 被调用时 |                                                          |
| _clickstream_error | event_name 不合规或用户属性不合规时                            | 1. _error_code <br>2. _error_message                     |

## 事件属性

### 事件结构示例

```json
{
  "event_type": "_app_start",
  "event_id": "e83980c4-e89a-407f-9d73-a63cb5d53928",
  "device_id": "D9149255-7373-5EB6-8187-017D3854D8C9",
  "unique_id": "f716a7b1-34c4-4f15-a63e-e38cbf8d695a",
  "app_id": "myAppId",
  "timestamp": 1719982758903,
  "platform": "Mac",
  "os_version": "Mac OS X 14.4.1",
  "make": "Apple",
  "model": "MacBookPro17,1",
  "locale": "en-US",
  "zone_offset": 28800000,
  "network_type": "WIFI",
  "screen_width": 2880,
  "screen_height": 1800,
  "system_language": "en",
  "country_code": "US",
  "sdk_name": "aws-solution-clickstream-sdk",
  "sdk_version": "0.1.0",
  "app_package_name": "com.example.game",
  "app_version": "1.0",
  "user": {
    "_user_id": {
      "value": "12345",
      "set_timestamp": 1719978926974
    },
    "_user_first_touch_timestamp": {
      "value": 1719804098750,
      "set_timestamp": 1719804098750
    }
  },
  "attributes": {
    "player_name": "test player",
    "_app_install_channel": "Amazon Store",
    "level": 10
  }
}
```

所有用户属性都将存储在 `user` 对象中，所有自定义性都存储在 `attributes` 对象中。

### 公共属性

| 属性               | 数据类型   | 描述                      | 如何生成                                                                                                                                           | 用途和目的                     |
|------------------|--------|-------------------------|------------------------------------------------------------------------------------------------------------------------------------------------|---------------------------|
| event_type       | string | 事件名称                    | 由开发者或 SDK 设置                                                                                                                                   | 区分不同的事件名称                 |
| event_id         | string | 事件的唯一id                 | 事件创建时从 `Guid.NewGuid().ToString()` 生成                                                                                                          | 区分不同的事件                   |
| device_id        | string | 设备唯一id                  | 通过 `SystemInfo.deviceUniqueIdentifier` 生成，如果值为空， 我们将使用 `Guid.NewGuid().ToString()`当作设备id，设备 id 存储在 PlayerPref 中，应用卸载后将会重置。                     | 区分不同的设备                   |
| unique_id        | string | 用户唯一id                  | 通过 `Guid.NewGuid().ToString()` 生成，<br> 当用户重新登录到另一个从未登录过的用户后，它会被更改，并且当用户在同一浏览器中重新登录到之前的用户时，unique_id 将重置为之前 用户的 unique_id                       | 标识不同用户的唯一性，并关联登录和未登录用户的行为 |
| app_id           | string | 点击流app id               | 控制平面创建点击流应用程序时生成                                                                                                                               | 区分不同app的事件                |
| timestamp        | long   | 事件创建时的时间戳               | 事件创建时通过 `DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()` 生成                                                                                    | 数据分析需要                    |
| platform         | string | 平台名称                    | 通过 `Application.platform`, 我们会将其转换成如下类型： `Android`, `iOS`, `Mac`, `Windows`, `PS4` ,`PS5`, `Switch`, `VisionOS`, `Xbox`, `Linux` and `UNKNOWN` | 数据分析需要                    |
| os_version       | String | 系统版本号                   | 通过 `SystemInfo.operatingSystem` 生成                                                                                                             | 数据分析需要                    |
| make             | string | 设备制造商                   | 通过 `SystemInfo.graphicsDeviceVendor` 生成                                                                                                        | 数据分析需要                    |
| model            | String | 设备型号                    | 通过 `SystemInfo.deviceModel` 生成                                                                                                                 | 数据分析需要                    |
| locale           | string | 设备默认区域设置（语言、国家/地区和变体）   | 通过 `CultureInfo.CurrentCulture.Name` 生成                                                                                                        | 数据分析需要                    |
| zone_offset      | int    | 设备 与 GMT 的原始偏移量（以毫秒为单位） | 通过 `TimeZoneInfo.Local.GetUtcOffset(DateTime.Now).TotalMilliseconds` 生成                                                                        | 数据分析需要                    |
| network_type     | string | 设备网络类型                  | "Mobile", "WIFI" or "UNKNOWN"<br>通过 `Application.internetReachability` 生成                                                                      | 数据分析需要                    |
| screen_width     | int    | 屏幕宽度（以像素为单位）            | 通过 `Screen.currentResolution.width` 生成                                                                                                         | 数据分析需要                    |
| screen_height    | int    | 屏幕高度（以像素为单位）            | 通过 `Screen.currentResolution.height` 生成                                                                                                        | 数据分析需要                    |
| system_language  | string | 设备系统语言                  | 通过 `CultureInfo.CurrentCulture.Name` 生成                                                                                                        | 数据分析需要                    |
| country_code     | string | 设备国家/地区代码               | 通过 `CultureInfo.CurrentCulture.Name` 生成                                                                                                        | 数据分析需要                    |
| sdk_name         | string | 点击流SDK名称                | 值始终为 `aws-solution-clickstream-sdk`                                                                                                            | 数据分析需要                    |
| sdk_version      | string | 点击流SDK版本                | 通过读取 `package.json` 中的 version 生成                                                                                                              | 数据分析需要                    |
| app_package_name | String | app的包名                  | 通过 `Application.identifier` 生成                                                                                                                 | 数据分析需要                    |
| app_version      | String | app的版本号                 | 通过 `Application.version` 生成                                                                                                                    | 数据分析需要                    |

### 用户属性

| 属性名称                        | 描述                                                 |
|-----------------------------|----------------------------------------------------|
| _user_id                    | 保留用于分配给应用程序的用户 ID                                  |
| _user_ltv_revenue           | 保留用于用户终身价值                                         |
| _user_ltv_currency          | 保留用于用户终身价值货币                                       |
| _user_first_touch_timestamp | 用户首次打开应用程序或访问站点的时间（以毫秒为单位），在 `user` 对象的每个事件中都包含此属性 |

### 事件属性

| 属性名称                          | 数据类型      | 是否自动采集 | 描述                                                          |
|-------------------------------|-----------|--------|-------------------------------------------------------------|
| _traffic_source_source        | String    | 否      | 流量来源保留字段。事件报告时获取的网络来源的名称，例如：Google, Facebook, Bing, Baidu   |
| _traffic_source_medium        | String    | 否      | 流量来源保留字段。使用此属性存储事件记录时获取用户的媒介，例如：电子邮件、付费搜索、搜索引擎              |
| _traffic_source_campaign      | String    | 否      | 流量来源保留字段。使用此属性来存储您的流量来源的活动，例如：summer_sale, holiday_specials |
| _traffic_source_campaign_id   | String    | 否      | 流量来源保留字段。使用此属性来存储流量来源的营销活动 ID，例如：campaign_1, campaign_2     |
| _traffic_source_term          | String    | 否      | 流量来源保留字段。使用此属性来存储流量来源的术语，例如：running_shoes, fitness_tracker  |
| _traffic_source_content       | String    | 否      | 流量来源保留字段。使用此属性来存储流量来源的内容，例如：banner_ad_1, text_ad_2          |
| _traffic_source_clid          | String    | 否      | 流量来源保留字段。使用此属性来存储流量源的 CLID，例如：amazon_ad_123, google_ad_456  |
| _traffic_source_clid_platform | String    | 否      | 流量来源保留字段。使用此属性来存储您的流量来源的clid平台，例如：amazon_ads, google_ads    |
| _app_install_channel          | String    | 否      | 安装来源保留字段。应用下载的渠道                                            |

## SDK更新日志

参考：[GitHub 更新日志](https://github.com/awslabs/clickstream-unity/releases)

## 参考链接

[SDK 源码](https://github.com/awslabs/clickstream-unity)

[SDK 问题](https://github.com/awslabs/clickstream-unity/issues)
