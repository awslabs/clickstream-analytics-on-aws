# Clickstream Swift SDK

## 介绍

Clickstream Swift SDK 可以帮助您轻松从 iOS 设备收集和报告应用内事件到 AWS。作为 {{ solution_name }} 解决方案的一部分，解决方案会构建数据管道，将事件数据传送到 AWS 服务，例如 Amazon S3 和 Amazon Redshift 进行处理。

该 SDK 基于 Amplify for Swift 核心库，并根据 Amplify Swift SDK 插件规范进行开发。此外，该 SDK 还配备了自动收集常见用户事件和属性（例如屏幕视图、首次打开）的功能，以简化用户的数据收集。

### 平台支持

Clickstream Swift SDK 支持 iOS 13+。

[**API 文档**](https://awslabs.github.io/clickstream-swift/)

## 集成 SDK

Clickstream 需要 Xcode 13.4 或更高版本才能构建。

### 1. 添加软件包

我们使用 **Swift Package Manager** 来分发 Clickstream Swift SDK，在 Xcode 中打开您的项目，选择 **File > Add Packages**。

![](../images/sdk-manual/swift_add_package.png)

将 Swift SDK 的 GitHub 仓库 URL（`https://github.com/awslabs/clickstream-swift`）输入搜索栏中，您将看到 Swift Package Manager 安装版本的规则。选择 **Up to Next Major Version**，然后单击 **Add Package**，将 Clickstream 选中为默认值，然后再次单击 **Add Package**。

![](../images/sdk-manual/swift_add_package_url.png)

### 2. 参数配置

从您的 Clickstream 解决方案控制面板中下载您的 `amplifyconfiguration.json` 文件，并将其粘贴到项目根文件夹中：

![](../images/sdk-manual/swift_add_amplify_config_json_file.png)

该 json 文件如下所示：

```json
{
  "analytics": {
    "plugins": {
      "awsClickstreamPlugin ": {
        "appId": "appId",
        "endpoint": "https://example.com/collect",
        "isCompressEvents": true,
        "autoFlushEventsInterval": 10000,
        "isTrackAppExceptionEvents": false
      }
    }
  }
}
```

其中，您的 `appId` 和 `endpoint` 已经设置好了。下面是每个属性的说明：

- **appId**：您在控制面板中的app id。
- **endpoint**：您将事件上传到 AWS 服务器的端点 URL。
- **isCompressEvents**：上传事件时是否压缩事件内容，默认为 `true`。
- **autoFlushEventsInterval**：事件发送间隔， 默认为 `10s`。
- **isTrackAppExceptionEvents**：是否自动跟踪应用程序异常事件，默认为 `false`。

### 3.初始化 SDK

在配置参数之后，您需要在 AppDelegate 的 `didFinishLaunchingWithOptions` 生命周期方法中进行初始化以使用 SDK。

```swift
import Clickstream
...
func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
    // Override point for customization after application launch.
    do {
        try ClickstreamAnalytics.initSDK()
    } catch {
        assertionFailure("无法初始化 ClickstreamAnalytics: \(error)")
    }
    return true
}
```

### 4.配置 SDK

```swift
import Clickstream

// 在初始化后配置 SDK。
do {
    var configuration = try ClickstreamAnalytics.getClickstreamConfiguration()
    configuration.appId = "应用ID"
    configuration.endpoint = "https://example.com/collect"
    configuration.authCookie = "您的身份验证Cookie"
    configuration.sessionTimeoutDuration = 1800000
    configuration.isLogEvents = true
    configuration.isCompressEvents = true    
    configuration.isLogEvents = true
} catch {
    print("配置 ClickstreamAnalytics 失败: \(error)")
}
```

> 注意：此配置将覆盖 `amplifyconfiguration.json` 文件中的默认配置。

### 5.记录事件

在需要报告事件的位置添加以下代码。

```swift
import Clickstream

let attributes: ClickstreamAttribute = [
    "channel": "apple",
    "successful": true,
    "ProcessDuration": 12.33,
    "UserAge": 20,
]
ClickstreamAnalytics.recordEvent(eventName: "testEvent", attributes: attributes)

// 直接记录事件
ClickstreamAnalytics.recordEvent(eventName: "button_click")
```

更多用法请参考 [Github 开始使用](https://github.com/awslabs/clickstream-swift#start-using)

对于 **Objective-c** 项目，请参考 [ClickstreamObjc API 参考](https://awslabs.github.io/clickstream-swift/Classes/ClickstreamObjc.html)

## 数据格式定义

### 数据类型

Clickstream Swift SDK 支持以下数据类型：

| 数据类型    | 范围                                                    | 示例            |
| ------- |-------------------------------------------------------| ------------- |
| Int     | -2147483648～2147483647                                | 12            |
| Int64   | -9,223,372,036,854,775,808～ 9,223,372,036,854,775,807 | 26854775808   |
| Double  | -2.22E-308~1.79E+308                                  | 3.14          |
| Boolean | true 或 false                                          | true          |
| String  | 最大支持 1024 个字符                                         | "clickstream" |

### 命名规则

1. 事件名称和属性名称不能以数字开头，只能包含大写字母、小写字母、数字、下划线。如果事件名称无效，将引发 `precondition failure` 错误；如果属性或用户属性名称无效，该属性将被丢弃，并记录错误。

2. 不要使用 `_` 作为事件名称和属性名称的前缀，`_` 前缀是 Clickstream Analytics 保留的。

3. 事件名称和属性名称区分大小写。因此，事件 `Add_to_cart` 和 `add_to_cart` 将被视为两个不同的事件。

### 事件和属性限制

为了提高查询和分析的效率，我们需要对事件进行以下限制：

| 名称       | 建议           | 硬限制       | 超过限制的处理策略  |
| -------- | ------------ | --------- | ---------- |
| 事件名称长度   | 小于等于 25 个字符  | 50 个字符    | 抛出错误       |
| 事件属性名称长度 | 小于等于 25 个字符  | 50 个字符    | 丢弃、记录和报告错误 |
| 事件属性值长度  | 小于等于 100 个字符 | 1024 个字符  | 丢弃、记录和报告错误 |
| 每个事件的属性数 | 小于等于 50 个属性  | 500 个事件属性 | 丢弃、记录和报告错误 |
| 用户属性数量   | 小于等于 25 个属性  | 100 个用户属性 | 丢弃、记录和报告错误 |
| 用户属性名称长度 | 小于等于 25 个字符  | 50 个字符    | 丢弃、记录和报告错误 |
| 用户属性值长度  | 小于等于 50 个字符  | 256 个字符   | 丢弃、记录和报告错误 |

**限制说明**

- 字符限制适用于单宽字符语言（如英语）和双宽字符语言（如中文）。
- 事件属性每个事件中包括常用属性和预设属性。
- 如果多次添加相同名称的属性或用户属性，则值将被最后一个值覆盖。

## 预设事件和属性

### 预设事件

自动收集的事件：

| 事件名称             | 触发时机                                             | 事件属性                                                                                                              |
| ---------------- | ------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------- |
| _session_start   | 用户首次启动应用程序进入前台时且没有正在进行的会话                        | _session_id <br>_session_start_timestamp<br>_session_duration                                                     |
| _screen_view     | 当 Activity 的 `onResume()` 方法被调用时                 | _screen_name<br>_screen_id<br>_previous_screen_name<br>_previous_screen_id<br>_entrances<br>_engagement_time_msec |
| _app_exception   | 应用程序崩溃时                                          | _exception_message<br>_exception_stack                                                                            |
| _app_update      | 应用程序升级到新版本并再次启动时                                 | _previous_app_version                                                                                             |
| _first_open      | 用户首次安装应用程序后启动时                                   |                                                                                                                   |
| _os_update       | 设备操作系统升级到新版本时                                    | _previous_os_version                                                                                              |
| _user_engagement | 当应用程序在前台至少停留一秒钟时                                 | _engagement_time_msec<br>                                                                                         |
| _profile_set     | 调用 `addUserAttributes()` 或 `setUserId()` API 时触发 |                                                                                                                   |

#### 会话定义

在 Clickstream Swift SDK 中，我们不限制会话的总时间，只要应

用程序下次进入和上次退出之间的时间在允许的超时期限内，我们就认为当前会话是连续的。

- **_session_start**：当应用程序首次启动，或应用程序被切换到前台且距离上次退出的时间超过 `session_time_out` 期限时触发。

- **_session_duration**：通过当前事件的创建时间戳减去会话的 `_session_start_timestamp` 来计算 `_session_duration`，此属性将在会话期间的每个事件中添加。

- **session_time_out**：默认为 30 分钟，可以通过配置 API 进行自定义。

- **_session_number**：由会话 ID 区分的会话总数，`_session_number` 将出现在每个事件的属性对象中。

#### 用户参与定义

在 Clickstream Swift SDK 中，我们将 `user_engagement` 定义为应用程序在前台停留至少一秒钟。

- **何时发送**：当应用程序切换到后台或导航到另一个应用程序时发送事件。

- **engagement_time_msec**：我们计算从应用程序进入前台到应用程序切换到后台的时间。

### 常用属性和保留属性

#### 事件结构示例

```json
{
    "app_id": "shopping",
    "app_package_name": "com.company.app",
    "app_title": "ModerneShopping",
    "app_version": "1.0",
    "brand": "apple",
    "carrier": "UNKNOWN",
    "country_code": "US",
    "device_id": "A536A563-65BD-49BE-A6EC-6F3CE7AC8FBE",
    "device_unique_id": "",
    "event_id": "91DA4BBE-933F-4DFA-A489-8AEFBC7A06D8",
    "event_type": "add_to_cart",
    "hashCode": "63D7991D",
    "locale": "en_US (current)",
    "make": "apple",
    "model": "iPhone 14 Pro",
    "network_type": "WIFI",
    "os_version": "16.4",
    "platform": "iOS",
    "screen_height": 2556,
    "screen_width": 1179,
    "sdk_name": "aws-solution-clickstream-sdk",
    "sdk_version": "0.4.1",
    "system_language": "en",
    "timestamp": 1685082174195,
    "unique_id": "0E6614B7-2D2C-4774-AB2F-B0A9E6C3BFAC",
    "zone_offset": 28800000,
    "user": {
        "_user_city": {
            "set_timestamp": 1685006678437,
            "value": "Shanghai"
        },
        "_user_first_touch_timestamp": {
            "set_timestamp": 1685006678434,
            "value": 1685006678432
        },
        "_user_name": {
            "set_timestamp": 1685006678437,
            "value": "carl"
        }
    },
    "attributes": {
        "_session_duration": 15349,
        "_session_id": "0E6614B7-20230526-062238846",
        "_session_number": 3,
        "_session_start_timestamp": 1685082158847,
        "product_category": "men's clothing",
        "product_id": 1
    }
}
```

所有用户属性将出现在 `user` 对象中，所有自定义和全局属性将存储在 `attributes` 对象中。

#### 公共属性

| 属性               | 描述                       | 如何生成                                                                                                              | 用途和目的                  |
| ---------------- | ------------------------ | ----------------------------------------------------------------------------------------------------------------- | ---------------------- |
| hashCode         | 事件json的哈希码               | 通过`String(format："%08X", hasher.combine(eventjson))`生成                                                            | 区分不同的事件                |
| app_id           | Clickstream App id       | 从解决方案控制平面创建点击流应用程序时生成                                                                                             | 区分不同app的事件             |
| unique_id        | 用户的唯一id                  | sdk第一次初始化时生成`UUID().uuidString`形式<br>当用户重新登录到另一个用户后，它会改变，并且当用户在同一设备上重新登录到之前的用户时，`unique_id`将重置为之前的用户的 `unique_id` | 标识不同用户的唯一性并关联登录和未登录的行为 |
| device_id        | 设备的唯一id                  | 通过`UIDevice.current.identifierForVendor?.uuidString ?? UUID().uuidString`生成 <br>应用程序重新安装后将更改<br>                  | 区分不同设备                 |
| device_unique_id | 设备广告id                   | 通过`ASIdentifierManager.shared().advertisingIdentifier.uuidString ?? ""`生成                                         | 区分不同设备                 |
| event_type       | 事件名称                     | 由用户或sdk设置                                                                                                         | 区分不同的事件类型              |
| event_id         | 事件的唯一id                  | 事件创建时通过`UUID().uuidString`生成                                                                                      | 区分每个事件                 |
| timestamp        | 事件创建时间戳                  | 事件创建时通过`Date().timeIntervalSince1970 * 1000`生成                                                                    | 数据分析需要                 |
| platform         | 平台名称                     | iOS 设备始终为"iOS"                                                                                                    | 数据分析需要                 |
| os_version       | iOS 操作系统版本               | 通过`UIDevice.current.systemVersion`生成                                                                              | 数据分析需要                 |
| make             | 设备制造商                    | iOS 设备始终是"apple"                                                                                                  | 数据分析需要                 |
| brand            | 设备品牌                     | iOS 设备始终是"apple"                                                                                                  | 数据分析需要                 |
| model            | 设备型号                     | 通过设备标识符映射设备版本生成                                                                                                   | 数据分析需要                 |
| carrier          | 设备网络运营商名称                | 通过`CTTelephonyNetworkInfo().serviceSubscriberCellularProviders?.first?.value`生成<br>默认值为："UNKNOWN"                 | 数据分析需要                 |
| network_type     | 当前设备网络类型                 | "Mobile", "WIFI" or "UNKNOWN"<br>由`NWPathMonitor` 生成                                                              | 数据分析需要                 |
| screen_height    | 屏幕高度（以像素为单位）             | 通过`UIScreen.main.bounds.size.height * UIScreen.main.scale`生成                                                      | 数据分析需要                 |
| screen_width     | 屏幕宽度（以像素为单位）             | 通过`UIScreen.main.bounds.size.width * UIScreen.main.scale`生成                                                       | 数据分析需要                 |
| zone_offset      | 设备与 GMT 的原始时区偏移量（以毫秒为单位） | 通过`TimeZone.current.secondsFromGMT()*1000`生成                                                                      | 数据分析需要                 |
| locale           | 此设备的默认区域设置（语言、国家/地区和变体）  | 通过`Locale.current`生成                                                                                              | 数据分析需要                 |
| system_language  | 设备语言代码                   | 通过`Locale.current.languageCode`生成 <br>默认为："UNKNOWN"                                                               | 数据分析需要                 |
| country_code     | 该设备的国家/地区代码              | 通过`Locale.current.regionCode`生成<br>默认值为："UNKNOWN"                                                                 | 数据分析需要                 |
| sdk_version      | 点击流sdk版本                 | 通过`PackageInfo.version`生成                                                                                         | 数据分析需要                 |
| sdk_name         | Clickstream SDK 名称       | 始终为"aws-solution-clickstream-sdk"                                                                                 | 数据分析需要                 |
| app_version      | 应用程序版本名称                 | 通过`Bundle.main.infoDictionary["CFBundleShortVersionString"] ?? ""`生成                                              | 数据分析需要                 |
| app_package_name | 应用程序包名称                  | 通过`Bundle.main.infoDictionary["CFBundleIdentifier"] ?? ""`生成                                                      | 数据分析需要                 |
| app_title        | 应用程序的显示名称                | 通过`Bundle.main.infoDictionary["CFBundleName"] ?? ""`生成                                                            | 数据分析需要                 |

#### 保留属性

**用户属性**

| 属性名称                        | 描述                                              |
| --------------------------- | ----------------------------------------------- |
| _user_id                    | 保留给由应用程序分配的用户 ID                                |
| _user_ltv_revenue           | 保留给用户生命周期价值                                     |
| _user_ltv_currency          | 保留给用户生命周期价值货币                                   |
| _user_first_touch_timestamp | 用户首次打开应用程序或访问网站的时间（以微秒为单位），它包含在 `user` 对象的每个事件中 |

**事件属性**

| 属性名称                     | 描述                                                |
| ------------------------ |---------------------------------------------------|
| _traffic_source_medium   | 保留给流量媒介，使用此属性存储事件记录时获取用户的媒介                       |
| _traffic_source_name     | 保留给流量名称，使用此属性存储事件记录时获取用户的营销活动                     |
| _traffic_source_source   | 保留给流量来源，事件报告时获取的网络来源的名称                           |
| _channel                 | 下载应用的渠道                                           |
| _device_vendor_id        | 设备供应商ID                                           |
| _device_advertising_id   | 设备广告ID                                            |
| _entrances               | 添加在 `_screen_view` 事件中，会话中第一个 `_screen_view` 事件的值为 1，其他为 0 |
| _session_id              | 添加在所有事件中                                          |
| _session_start_timestamp | 添加在所有事件中                                          |
| _session_duration        | 添加在所有事件中                                          |
| _session_number          | 添加在所有事件中，初始值为 1，由用户设备自动增加                         |
