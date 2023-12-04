# Clickstream Swift SDK

## 介绍

Clickstream Swift SDK 可以帮助您轻松从 iOS 设备收集和发送应用内事件到您配置的解决方案数据管道。

该 SDK 基于 Amplify for Swift 核心库，并根据 Amplify Swift SDK 插件规范进行开发。此外，该 SDK 还配备了自动收集常见用户事件和属性（例如，屏幕查看和首次打开）的功能，以简化用户的数据收集过程。

### 平台支持

Clickstream Swift SDK 支持 iOS 13+。

Clickstream Swift SDK 需要 Xcode 13.4 或更高版本才能构建。

## 集成 SDK

### 1. 添加软件包

我们使用 **Swift Package Manager** 来分发 Clickstream Swift SDK，在 Xcode 中打开您的项目，选择 **File > Add Packages**。

![](../images/sdk-manual/swift_add_package.png)

1. 复制Swift SDK 的 GitHub 仓库 URL，然后粘贴到搜索栏中。
    ```bash
    https://github.com/awslabs/clickstream-swift
    ```
2. 检查您希望 Swift Package Manager 安装 SDK 版本的规则。推荐选择 **Up to Next Major Version**，然后点击 **Add Package** 按钮。
3. 默认选中 Clickstream 库。
4. 再次单击 **Add Package** 按钮完成安装。

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

- **appId（必需的）**：您在控制面板中的app id。
- **endpoint（必需的）**：您将事件上传到 AWS 服务器的端点 URL。
- **isCompressEvents**：上传事件时是否压缩事件内容，默认为 `true`。
- **autoFlushEventsInterval**：事件发送间隔， 默认为 `10s`。
- **isTrackAppExceptionEvents**：是否自动跟踪应用程序异常事件，默认为 `false`。

### 3.初始化 SDK

在配置参数之后，您需要在 AppDelegate 的 `didFinishLaunchingWithOptions` 生命周期方法中进行初始化以使用 SDK。

=== "Swift"
    ```swift
    import Clickstream
    
    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        do {
            try ClickstreamAnalytics.initSDK()
        } catch {
            assertionFailure("Fail to initialize ClickstreamAnalytics: \(error)")
        }
        return true
    }
    ```
=== "Objective-C"
    ```objective-c
    @import Clickstream;
    
    - (BOOL)application:(UIApplication *)application didFinishLaunchingWithOptions:(NSDictionary *)launchOptions { 
        NSError *error = nil;
        [ClickstreamObjc initSDKAndReturnError:&error];
        if (error) {
            NSLog(@"Fail to initialize ClickstreamAnalytics: %@", error.localizedDescription);
        }
        return YES;
    }
    ```

如果您的项目是使用 SwiftUI 开发的，您需要创建一个`application` 代理并通过 `UIApplicationDelegateAdaptor` 将其附加到您的 App。

```swift
@main
struct YourApp: App {
    @UIApplicationDelegateAdaptor(AppDelegate.self) var appDelegate
    var body: some Scene {
        WindowGroup {
            YourView()
        }
    }
}
```

对于 SwiftUI，我们尚不支持自动收集屏幕浏览事件，您需要通过设置 `configuration.isTrackScreenViewEvents = false` 来禁用屏幕浏览事件，请参阅[更新SDK配置](#sdk_1)。

### 4.开始使用

#### 记录事件

在需要报告事件的位置添加以下代码。

=== "Swift"
    ```swift
    import Clickstream
    
    // 记录带有自定义参数的事件
    let attributes: ClickstreamAttribute = [
        "category": "shoes",
        "currency": "CNY",
        "value": 279.9
    ]
    ClickstreamAnalytics.recordEvent("button_click", attributes)
    
    // 直接记录事件名
    ClickstreamAnalytics.recordEvent("button_click")
    ```
=== "Objective-C"
    ```objective-c
    import Clickstream;
    
    // 记录带有自定义参数的事件
    NSDictionary *attributes =@{
        @"category": @"shoes",
        @"currency": @"CNY",
        @"value": @12.34
    };
    [ClickstreamObjc recordEvent:@"button_click" :attributes];
    
    // 直接记录事件名
    [ClickstreamObjc recordEvent:@"button_click"];
    ```

#### 添加全局属性

=== "Swift"
    ```swift
    import Clickstream
    
    let globalAttribute: ClickstreamAttribute = [
        "channel": "apple",
        "class": 6,
        "level": 5.1,
        "isOpenNotification": true,
    ]
    ClickstreamAnalytics.addGlobalAttributes(globalAttribute)
    
    // 删除全局属性
    ClickstreamAnalytics.deleteGlobalAttributes("level")
    ```
=== "Objective-C"
    ```objective-c
    import Clickstream;
    
    NSDictionary *attributes =@{
        @"channel": @"apple",
        @"class": @6,
        @"level": @5.1,
        @"isOpenNotification": @YES
    };
    [ClickstreamObjc addGlobalAttributes :attributes];
    
    // 删除全局属性
    [ClickstreamObjc deleteGlobalAttributes: @[@"level"]];
    ```

请在SDK初始化完成后添加全局属性，全局属性将添加到所有事件的属性对象中。

#### 登录和登出

=== "Swift"
    ```swift
    import Clickstream
    
    // 当用户登录成功时设置
    ClickstreamAnalytics.setUserId("userId")
    
    // 当用户退出登录时设置
    ClickstreamAnalytics.setUserId(nil)
    ```
=== "Objective-C"

    ```objective-c
    import Clickstream;
    
    // 当用户登录成功时设置
    [ClickstreamObjc setUserId:@"userId"];
    
    // 当用户退出登录时设置
    [ClickstreamObjc setUserId:NULL];
    ```

#### 添加用户属性

=== "Swift"

    ```swift
    import Clickstream
    
    let userAttributes : ClickstreamAttribute=[
        "_user_age": 21,
        "_user_name": "carl"
    ]
    ClickstreamAnalytics.addUserAttributes(userAttributes)
    ```

=== "Objective-C"

    ```objective-c
    import Clickstream;
    
    NSDictionary *userAttributes =@{
        @"_user_age": @21,
        @"user_name": @"carl"
    };
    [ClickstreamObjc addUserAttributes:userAttributes];
    ```

当前登录用户的属性会进行缓存，因此在下次App打开时不需要再次设置所有的用户属性，当然您可以使用相同的 api `ClickstreamAnalytics.addUserAttributes()` 在当用户属性改变时来更新当前用户的属性。

!!! info "重要提示"

    如果您的应用已经上线，这时大部分用户已经登录过，则第一次接入Clickstrema SDK时请手动设置一次用户属性，确保后续事件都带有用户属性。

#### 实时发送事件

=== "Swift"

    ```swift
    import Clickstream
    // 实时发送事件
    ClickstreamAnalytics.flushEvents()
    ```

=== "Objective-C"

    ```objective-c
    import Clickstream;
    // 实时发送事件
    [ClickstreamObjc flushEvents];
    ```

#### 禁用 SDK

您可以根据需要禁用 SDK 。禁用后 SDK 将不会处理任何事件的记录和发送，同时您可以在需要继续记录事件时再次启用SDK。

=== "Swift"

    ```swift
    import Clickstream
    
    // 禁用 SDK
    ClickstreamAnalytics.disable()
    
    // 启用 SDK
    ClickstreamAnalytics.enable()
    ```

=== "Objective-C"

    ```objective-c
    import Clickstream;
    
    // 禁用 SDK
    [ClickstreamObjc disable];
    
    // 启用 SDK
    [ClickstreamObjc enable];
    ```

#### SDK 配置更新

在初始化 SDK 后，您可以使用以下代码对其进行自定义配置。

=== "Swift"

    ```swift
    import Clickstream
    
    // 在初始化后更新SDK配置
    do {
        var configuration = try ClickstreamAnalytics.getClickstreamConfiguration()
        configuration.appId = "your appId"
        configuration.endpoint = "https://example.com/collect"
        configuration.authCookie = "your authentication cookie"
        configuration.sessionTimeoutDuration = 1800000
        configuration.isTrackScreenViewEvents = false
        configuration.isTrackUserEngagementEvents = false
        configuration.isLogEvents = true
        configuration.isCompressEvents = true
    } catch {
        print("Failed to config ClickstreamAnalytics: \(error)")
    }
    ```

=== "Objective-C"

    ```objective-c
    import Clickstream;
    
    // 在初始化后更新SDK配置
    ClickstreamContextConfiguration *configuration = [ClickstreamObjc getClickstreamConfigurationAndReturnError:&error];
    if (configuration) {
        [configuration setAppId:@"your appId"];
        [configuration setEndpoint:@"https://example.com/collect"];
        [configuration setAuthCookie:@"your authentication cookie"];
        [configuration setSessionTimeoutDuration:1800000];
        [configuration setIsTrackScreenViewEvents:0];
        [configuration setIsTrackUserEngagementEvents:0];
        [configuration setIsLogEvents:1];
        [configuration setIsCompressEvents:1];
    }else{
        NSLog(@"Failed to get configuration: %@", error.localizedDescription);
    }
    ```

!!! info "重要提示"
    此配置将覆盖 `amplifyconfiguration.json` 文件中的默认配置。

以下是每个配置项的说明

| 名称                          | 参数类型     | 是否必填     | 默认值     | 描述                                |
|-----------------------------|----------|----------|---------|-----------------------------------|
| appId                       | String   | 是        | --      | 在解决方案控制平面中您应用程序的 ID               |
| endpoint                    | String   | 是        | --      | 您将事件上传到 Clickstream 摄取服务器的URL请求路径 |
| authCookie                  | String   | 否        | --      | 您的 AWS 应用程序负载均衡器身份验证 cookie       |
| sessionTimeoutDuration      | Int64    | 否        | 1800000 | 会话超时的时长（毫秒）                       |
| isTrackScreenViewEvents     | Bool     | 否        | true    | 是否自动记录 screen view（屏幕浏览） 事件       |
| isTrackUserEngagementEvents | Bool     | 否        | true    | 是否自动记录 user engagement（用户参与） 事件   |
| isLogEvents                 | Bool     | 否        | false   | 是否自动打印事件 json以调试事件, [了解更多](#_9)   |
| isCompressEvents            | Bool     | 否        | true    | 上传事件时是否通过gzip压缩事件内容               |

#### 调试事件

您可以按照以下步骤查看事件原始 json 并调试您的事件。

1.在调试模式下将 `isLogEvents` 配置项设置为 true。

2.集成 SDK 并通过 Xcode 启动您的应用程序，然后打开日志窗口。

3.在filter中输入`EventRecorder`，您将看到Clickstream Swift SDK记录的所有事件的json内容。

## 数据格式定义

### 数据类型

Clickstream Swift SDK 支持以下数据类型：

| 数据类型    | 范围                                                    | 示例            |
|---------|-------------------------------------------------------|---------------|
| Int     | -2147483648～2147483647                                | 12            |
| Int64   | -9,223,372,036,854,775,808～ 9,223,372,036,854,775,807 | 26854775808   |
| Double  | -2.22E-308~1.79E+308                                  | 3.14          |
| Boolean | true 或 false                                          | true          |
| String  | 最大支持 1024 个字符                                         | "clickstream" |

### 命名规则

1. 事件名称和属性名称不能以数字开头，只能包含大写字母、小写字母、数字、下划线。如果事件名称无效，将引发 `precondition failure` 错误；如果属性或用户属性名称无效，该属性将被丢弃，并记录错误。

2. 不要使用 `_` 作为事件名称和属性名称的前缀，`_` 前缀是 Clickstream Analytics 保留的。

3. 事件名称和属性名称区分大小写。因此，事件 `Add_to_cart` 和 `add_to_cart` 将被视为两个不同的事件。

### 事件和属性限制

为了提高查询和分析的效率，我们需要对事件进行以下限制：

| 名称        | 建议         | 硬限制          | 超过限制的处理策略                               | 错误码     |
|:----------|:-----------|:-------------|:----------------------------------------|:--------|
| 事件名称合规    | --         | --           | 丢弃该事件，打印日志并记录`_clickstream_error`事件     | 1001    |
| 事件名称长度    | 25 个字符以下   | 50 个字符       | 丢弃该事件，打印日志并记录`_clickstream_error`事件     | 1002    |
| 事件属性名称的长度 | 25 个字符以下   | 50 个字符       | 丢弃该属性、打印日志并在事件属性中记录错误                   | 2001    |
| 属性名称合规    | --         | --           | 丢弃该属性、打印日志并在事件属性中记录错误                   | 2002    |
| 事件属性值的长度  | 少于 100 个字符 | 1024 个字符     | 丢弃该属性、打印日志并在事件属性中记录错误                   | 2003    |
| 每个事件的事件属性 | 50 属性以下    | 500 evnet 属性 | 丢弃超过限制的属性、打印日志并在事件属性中记录错误               | 2004    |
| 用户属性数     | 25岁以下属性    | 100个用户属性     | 丢弃超过限制的属性、打印日志并记录`_clickstream_error`事件 | 3001    |
| 用户属性名称的长度 | 25 个字符以下   | 50 个字符       | 丢弃该属性、打印日志并记录`_clickstream_error`事件     | 3002    |
| 用户属性名称合规  | --         | --           | 丢弃该属性、打印日志并记录`_clickstream_error`事件     | 3003    |
| 用户属性值的长度  | 50 个字符以下   | 256 个字符      | 丢弃该属性、打印日志并记录`_clickstream_error`事件     | 3004    |

!!! info "重要提示"

    - 字符限制对于单字节字符语言（例如英语）和双字节字符语言（例如中文）是相同的。
    - 事件属性数包括事件中公共属性和预设属性。
    - 如果添加了具有相同名称的属性或用户属性超过两次，将使用最新的值。
    - 超过限制的所有错误都会在事件attributes里记录 `_error_code` 和 `_error_message` 这两个字段。

## 预置事件

### 自动收集的事件

| 事件名称               | 触发时机                                            | 事件属性                                                                                                                                                                                                                       |
|--------------------|-------------------------------------------------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| _first_open        | 当用户安装后第一次启动应用程序时                                |                                                                                                                                                                                                                            |
| _session_start     | 当用户首次打开App或用户在 30 分钟不活动后返回App时，[了解更多](#_15)     | 1. _session_id <br>2. _session_start_timestamp                                                                                                                                                                             |
| _screen_view       | 当新的屏幕打开时，[了解更多](#_16)                           | 1. _screen_name <br>2. _screen_id <br>3. _screen_unique_id <br>4. _previous_screen_name<br>5. _previous_screen_id<br>6. _previous_screen_unique_id<br/>7. _entrances<br>8. _previous_timestamp<br>9. _engagement_time_msec |
| _user_engagement   | 当用户离开当前屏幕并且屏幕处于焦点状态至少一秒钟时，[了解更多](#_17)          | 1. _engagement_time_msec<br>                                                                                                                                                                                               |
| _app_start         | 每次App变为可见时                                      | 1. _is_first_time(当应用程序启动后第一个 `_app_start` 事件时，值为 `true` )                                                                                                                                                                 |
| _app_end           | 每次App变为不可见时                                     |                                                                                                                                                                                                                            |
| _profile_set       | 当调用 `addUserAttributes()` 或 `setUserId()` API 时 |                                                                                                                                                                                                                            |
| _app_exception     | 当应用程序崩溃时                                        | 1. _exception_message<br>2. _exception_stack                                                                                                                                                                               |
| _app_update        | 当App更新到新版本并再次启动时                                | 1. _previous_app_version                                                                                                                                                                                                   |
| _os_update         | 当iOS操作系统更新到新版本时                                 | 1. _previous_os_version                                                                                                                                                                                                    |
| _clickstream_error | event_name 无效或用户属性无效时                           | 1. _error_code <br>2. _error_message                                                                                                                                                                                       |

### 会话定义

在 Clickstream Swift SDK 中，我们不限制会话的总时间，只要App下次进入和最后一次退出之间的时间在允许的超时时间内，我们就认为当前会话是连续的。

当App第一次打开，或者App打开到前台并且最后一次退出之间的时间超过了 `session_time_out` 的时长时，会触发 `_session_start` 事件。 以下是与session相关的属性。

1. _session_id：我们通过uniqueId的后8个字符和当前毫秒值拼接来计算会话id，例如: dc7a7a18-20230905-131926703
2. _session_duration： 我们通过 `_session_start_timestamp` 减去当前事件创建时间戳来计算会话持续时间，该属性将添加到会话期间的每个事件中。
3. _session_number：当前设备的会话数的自动递增值，初始值为1
4. Session timeout duration：默认为30分钟，可以通过[更新配置](#sdk_1) api来自定义。

### 屏幕浏览定义

在Clickstream Swift SDK中，我们将 `_screen_view` 定义为记录用户屏幕浏览路径的事件，当屏幕切换开始时，满足以下任何条件时将会记录 `_screen_view` 事件：

1. 之前没有设置过屏幕。
2. 新的屏幕类名与之前的屏幕类名不同。
3. 新的屏幕的路径与之前的屏幕的路径不同。
4. 新的屏幕唯一id与之前的屏幕唯一id不同。

该事件监听UIViewController的 `onViewDidAppear` 生命周期方法来判断屏幕切换。 为了跟踪屏幕浏览路径，我们使用 `_previous_screen_name` 、 `_previous_screen_id` 和 `_previous_screen_unique_id` 来关联前一个屏幕。 此外，屏幕浏览事件中还有一些其他属性。

1. _screen_unique_id：我们通过获取当前屏幕的哈希值来计算屏幕唯一id，例如："5260751568"。
2. _entrances： 会话中的第一个屏幕浏览事件该值为 1，其他则为 0
3. _previous_timestamp: 上一个 `screen_view` 事件的时间戳。
4. _engagement_time_msec: 上个屏幕最后一次用户参与事件时长的毫秒数。

### 用户参与度定义

在Clickstream Swift SDK中，我们将 `_user_engagement` 定义为记录屏幕浏览时间的事件，并且仅当用户离开屏幕并且在该屏幕停留至少一秒时发送。

我们定义用户在以下情况下离开屏幕。

1. 当用户导航到另一个屏幕时。
2. 用户将App退到后台时。
3. 用户退出App，或者杀死App进程时。

**engagement_time_msec**：从屏幕可见到用户离开屏幕的毫秒数。

## 事件属性

### 事件结构示例

```json
{
    "app_id": "Shopping",
    "app_package_name": "com.company.app",
    "app_title": "Shopping",
    "app_version": "1.0",
    "brand": "apple",
    "carrier": "UNKNOWN",
    "country_code": "US",
    "device_id": "A536A563-65BD-49BE-A6EC-6F3CE7AC8FBE",
    "device_unique_id": "",
    "event_id": "91DA4BBE-933F-4DFA-A489-8AEFBC7A06D8",
    "event_type": "add_to_cart",
    "hashCode": "63D7991D",
    "locale": "en_US",
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
        "event_category": "recommended",
        "currency": "CNY",
        "_session_duration": 15349,
        "_session_id": "0E6614B7-20230526-062238846",
        "_session_number": 3,
        "_session_start_timestamp": 1685082158847,
        "_screen_name": "ProductDetailViewController",
        "_screen_unique_id": "5260751568"
    }
}
```

所有用户属性将出现在 `user` 对象中，所有自定义和全局属性将存储在 `attributes` 对象中。

### 公共属性

| 属性               | 数据类型    | 描述                       | 如何生成                                                                                                       | 用途和目的                    |
|------------------|---------|--------------------------|------------------------------------------------------------------------------------------------------------|--------------------------|
| hashCode         | String  | 事件对象的哈希码                 | 通过`String(format："%08X", hasher.combine(eventjson))`生成                                                     | 区分不同的事件                  |
| app_id           | String  | 您应用的app id               | app id 是在您将应用程序注册到数据管道时由点击流解决方案生成的                                                                         | 区分不同app的事件               |
| unique_id        | String  | 用户的唯一id                  | sdk第一次初始化时生成`UUID().uuidString`形式<br>如果用户注销然后登录新用户，它将被更改。 当用户在同一设备中重新登录到以前的用户时，unique_id 将重置为之前的 unique_id | 唯一id来标识不同的用户并关联登录和未登录的行为 |
| device_id        | String  | 设备的唯一id                  | 通过`UIDevice.current.identifierForVendor?.uuidString ?? UUID().uuidString`生成 <br>应用程序重新安装后将更改<br>           | 区分不同设备                   |
| device_unique_id | String  | 设备广告id                   | 通过`ASIdentifierManager.shared().advertisingIdentifier.uuidString ?? ""`生成                                  | 区分不同设备                   |
| event_type       | String  | 事件名称                     | 由用户或SDK设置                                                                                                  | 区分不同的事件类型                |
| event_id         | String  | 事件的唯一id                  | 事件创建时通过`UUID().uuidString`生成                                                                               | 区分每个事件                   |
| timestamp        | Int64   | 事件创建时间戳                  | 事件创建时通过`Date().timeIntervalSince1970 * 1000`生成                                                             | 数据分析需要                   |
| platform         | String  | 平台名称                     | iOS 设备始终为"iOS"                                                                                             | 数据分析需要                   |
| os_version       | String  | iOS 操作系统版本               | 通过`UIDevice.current.systemVersion`生成                                                                       | 数据分析需要                   |
| make             | String  | 设备制造商                    | iOS 设备始终是"apple"                                                                                           | 数据分析需要                   |
| brand            | String  | 设备品牌                     | iOS 设备始终是"apple"                                                                                           | 数据分析需要                   |
| model            | String  | 设备型号                     | 通过设备标识符映射设备版本生成                                                                                            | 数据分析需要                   |
| carrier          | String  | 设备网络运营商名称                | 通过`CTTelephonyNetworkInfo().serviceSubscriberCellularProviders?.first?.value`生成<br>默认值为："UNKNOWN"          | 数据分析需要                   |
| network_type     | String  | 当前设备网络类型                 | "Mobile", "WIFI" or "UNKNOWN"<br>由`NWPathMonitor` 生成                                                       | 数据分析需要                   |
| screen_height    | int     | 屏幕高度（以像素为单位）             | 通过`UIScreen.main.bounds.size.height * UIScreen.main.scale`生成                                               | 数据分析需要                   |
| screen_width     | int     | 屏幕宽度（以像素为单位）             | 通过`UIScreen.main.bounds.size.width * UIScreen.main.scale`生成                                                | 数据分析需要                   |
| zone_offset      | int     | 设备与 GMT 的原始时区偏移量（以毫秒为单位） | 通过`TimeZone.current.secondsFromGMT()*1000`生成                                                               | 数据分析需要                   |
| locale           | String  | 此设备的默认区域设置（语言、国家/地区和变体）  | 通过`Locale.current`生成                                                                                       | 数据分析需要                   |
| system_language  | String  | 设备语言代码                   | 通过`Locale.current.languageCode`生成 <br>默认为："UNKNOWN"                                                        | 数据分析需要                   |
| country_code     | String  | 该设备的国家/地区代码              | 通过`Locale.current.regionCode`生成<br>默认值为："UNKNOWN"                                                          | 数据分析需要                   |
| sdk_version      | String  | 点击流sdk版本                 | 通过`PackageInfo.version`生成                                                                                  | 数据分析需要                   |
| sdk_name         | String  | Clickstream SDK 名称       | 始终为"aws-solution-clickstream-sdk"                                                                          | 数据分析需要                   |
| app_version      | String  | 应用程序版本名称                 | 通过`Bundle.main.infoDictionary["CFBundleShortVersionString"] ?? ""`生成                                       | 数据分析需要                   |
| app_package_name | String  | 应用程序包名称                  | 通过`Bundle.main.infoDictionary["CFBundleIdentifier"] ?? ""`生成                                               | 数据分析需要                   |
| app_title        | String  | 应用程序的显示名称                | 通过`Bundle.main.infoDictionary["CFBundleName"] ?? ""`生成                                                     | 数据分析需要                   |

### 用户属性

| 属性名称                        | 描述                                                 |
|-----------------------------|----------------------------------------------------|
| _user_id                    | 保留给由应用程序分配的用户 ID                                   |
| _user_ltv_revenue           | 保留给用户生命周期价值                                        |
| _user_ltv_currency          | 保留给用户生命周期价值货币                                      |
| _user_first_touch_timestamp | 用户首次打开应用程序或访问站点的时间（以毫秒为单位），在 `user` 对象的每个事件中都包含此属性 |

### 事件属性

| 属性名称                     | 数据类型     | 是否自动采集 | 描述                                                       |
|--------------------------|----------|--------|----------------------------------------------------------|
| _traffic_source_medium   | String   | 否      | 保留给流量媒介，使用此属性存储事件记录时获取用户的媒介，例如：电子邮件、付费搜索、搜索引擎            |
| _traffic_source_name     | String   | 否      | 保留给流量名称，使用此属性存储事件记录时获取用户的营销活动，例如：夏季促销                    |
| _traffic_source_source   | String   | 否      | 保留给流量来源，事件报告时获取的网络来源的名称，例如：Google, Facebook, Bing, Baidu |
| _channel                 | String   | 否      | 预留安装源，app下载的渠道                                           |
| _session_id              | String   | 是      | 在所有事件中添加                                                 |
| _session_start_timestamp | long     | 是      | 在所有事件中添加                                                 |
| _session_duration        | long     | 是      | 在所有事件中添加                                                 |
| _session_number          | int      | 是      | 在所有事件中添加                                                 |
| _screen_name             | String   | 是      | 在所有事件中添加                                                 |
| _screen_unique_id        | String   | 是      | 在所有事件中添加                                                 |

## SDK更新日志

参考：[GitHub 更新日志](https://github.com/awslabs/clickstream-swift/releases)

## 参考链接

[SDK 源码](https://github.com/awslabs/clickstream-swift)

[SDK 问题](https://github.com/awslabs/clickstream-swift/issues)

[API 文档](https://awslabs.github.io/clickstream-swift/)

[Objective-C Api 文档](https://awslabs.github.io/clickstream-swift/Classes/ClickstreamObjc.html)
