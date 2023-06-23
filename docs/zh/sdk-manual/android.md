# Clickstream Android SDK

## 简介

Clickstream Android SDK 可以帮助您轻松地从 Android 设备收集和报告应用内事件到 AWS。作为解决方案 {{ solution_name }} 的一部分，解决方案提供了数据管道，用于将事件数据导入和处理到 AWS 服务，如 Amazon S3 和 Amazon Redshift。

该 SDK 基于 Amplify for Android SDK 核心库开发，并根据 Amplify Android SDK 插件规范进行了扩展。此外，该 SDK 还具有自动收集常见用户事件和属性（例如，屏幕查看和首次打开）的功能，以简化用户的数据收集过程。

### 平台支持

Clickstream Android SDK 支持 Android 4.1（API 级别 16）及更高版本。

## 集成 SDK

### 1. 包含 SDK

将以下依赖项添加到您的 `app` 模块的 `build.gradle` 文件中。

```groovy
dependencies {
    implementation 'software.aws.solution:clickstream:0.5.1'
}
```

接下来，将您的项目与最新版本进行同步：[![Maven Central](https://img.shields.io/maven-central/v/software.aws.solution/clickstream.svg)](https://search.maven.org/artifact/software.aws.solution/clickstream)

### 2. 配置参数

在 `project/app/src/main` 下找到 `res` 目录，并在 `res` 目录中手动创建一个 raw 文件夹。

![android_raw_folder](../images/sdk-manual/android_raw_folder.png)

从 Clickstream 控制平面下载您的 `amplifyconfiguration.json` 文件，并将其粘贴到 raw 文件夹中。JSON 文件的内容如下所示：

```json
{
  "analytics": {
    "plugins": {
      "awsClickstreamPlugin": {
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

在文件中，您的 `appId` 和 `endpoint` 已经配置好。每个属性的说明如下：

- **appId**：控制平面上项目的应用程序 ID。
- **endpoint**：将事件上传到 AWS 服务器的端点 URL。
- **isCompressEvents**：上传事件时是否压缩事件内容，默认值为 `true`。
- **autoFlushEventsInterval**：事件发送间隔，默认值为 `10s`。
- **isTrackAppExceptionEvents**：是否自动跟踪应用程序中的异常事件，默认值为 `false`。

### 3. 初始化 SDK

在应用程序的 `onCreate()` 方法中初始化 SDK。

```java
import software.aws.solution.clickstream.ClickstreamAnalytics;

public void onCreate() {
    super.onCreate();

    try {
        ClickstreamAnalytics.init(this);
        Log.i("MyApp", "Initialized ClickstreamAnalytics");
    } catch (AmplifyException error) {
        Log.e("MyApp", "Could not initialize ClickstreamAnalytics", error);
    } 
}
```

### 4. 配置 SDK

在初始化 SDK 后，您可以使用以下代码对其进行自定义配置。

!!! Important "重要提示"
    此配置将覆盖 `amplifyconfiguration.json` 文件中的默认配置。

```java
import software.aws.solution.clickstream.ClickstreamAnalytics;

// 在初始化后配置 SDK。
ClickstreamAnalytics.getClickStreamConfiguration()
            .withAppId("appId")
            .withEndpoint("https://example.com/collect")
            .withAuthCookie("your authentication cookie")
            .withSendEventsInterval(10000)
            .withSessionTimeoutDuration(1800000)
            .withTrackAppExceptionEvents(false)
            .withLogEvents(true)
            .withCustomDns(CustomOkhttpDns.getInstance())
            .withCompressEvents(true);
```

### 5. 记录事件

在需要报告事件的位置添加以下代码。有关更多信息，请参阅 [Github](https://github.com/awslabs/clickstream-android#start-using)。

```java
import software.aws.solution.clickstream.ClickstreamAnalytics;
import software.aws.solution.clickstream.ClickstreamEvent;

ClickstreamEvent event = ClickstreamEvent.builder()
    .name("PasswordReset")
    .add("Channel", "SMS")
    .add("Successful", true)
    .add("ProcessDuration", 78.2)
    .add("UserAge", 20)
    .build();
ClickstreamAnalytics.recordEvent(event);

// 直接记录事件
ClickstreamAnalytics.recordEvent("button_click");
```

## 数据格式定义

### 数据类型

Clickstream Android SDK 支持以下数据类型：

| 数据类型 | 范围                           | 示例          |
| ------- | ------------------------------ | ------------- |
| int     | -2147483648 ～ 2147483647       | 12            |
| long    | -9223372036854775808 ～ 9223372036854775807 | 26854775808   |
| double  | 4.9E-324 ～ 1.7976931348623157E308 | 3.14          |
| boolean | true 或 false                  | true          |
| String  | 最大 1024 个字符               | "Clickstream" |

### 命名规则

1. 事件名称和属性名称不能以数字开头，只能包含大写字母、小写字母、数字和下划线。如果事件名称无效，将抛出 `IllegalArgumentException`。如果属性名称或用户属性名称无效，将丢弃该属性并记录错误。

2. 不要在事件名称或属性名称前使用 `_` 作为前缀，因为 `_` 前缀保留给解决方案使用。

3. 事件名称和属性名称区分大小写，因此 `Add_to_cart` 和 `add_to_cart` 将被识别为两个不同的事件名称。

### 事件和属性限制

为了提高查询和分析的效率，我们对事件数据应用了以下限制：

| 名称                     | 推荐值               | 最大值               | 超过限制的处理策略       |
| ------------------------ | ------------------- | ------------------- | ---------------------- |
| 事件名称长度             | 小于 25 个字符          | 50 个字符             | 抛出 IllegalArgumentException |
| 事件属性名称长度         | 小于 25 个字符          | 50 个字符             | 丢弃、记录错误          |
| 事件属性值长度           | 小于 100 个字符         | 1024 个字符           | 丢弃、记录错误          |
| 事件属性数每个事件       | 小于 50 个属性          | 500 个事件属性         | 丢弃、记录错误          |
| 用户属性数               | 小于 25 个属性          | 100 个用户属性         | 丢弃、记录错误          |
| 用户属性名称长度         | 小于 25 个字符          | 50 个字符             | 丢弃、记录错误          |
| 用户属性值长度           | 小于 50 个字符          | 256 个字符            | 丢弃、记录错误          |

!!! Important "重要提示"

    - 字符限制对于单字节字符语言（例如英语）和双字节字符语言（例如中文）是相同的。
    - 事件属性数每个事件包括常见属性和预设属性。
    - 如果添加了具有相同名称的属性或用户属性超过两次，将使用最新的值。

## 预置事件和属性

### 预置事件

自动收集的事件：

| 事件名称           | 触发时机                                    | 事件属性                                                                                         |
| ------------------ | ----------------------------------------- | ----------------------------------------------------------------------------------------------- |
| _session_start     | 当应用程序首次进入前台并没有正在进行的会话时                 | _session_id <br>_session_start_timestamp<br>_session_duration                                       |
| _screen_view       | 当Activity回调的 `onResume()` 方法被触发时                     | _screen_name<br>_screen_id<br>_previous_screen_name<br>_previous_screen_id<br>_entrances<br>_engagement_time_msec |
| _app_exception     | 当应用程序崩溃时                                | _exception_message<br>_exception_stack                                                          |
| _app_update        | 当应用程序更新到新版本并再次启动时                        | _previous_app_version                                                                           |
| _first_open        | 用户在安装后第一次启动应用程序时                                   |                                                                                                 |
| _os_update         | 当设备操作系统更新到新版本时                            | _previous_os_version                                                                             |
| _user_engagement   | 应用程序在前台至少一秒钟时                            | _engagement_time_msec                                                                           |
| _profile_set       | 调用 `addUserAttributes()` 或 `setUserId()` API 时 |                                                                                                 |

#### 会话定义

在 Clickstream Android SDK 中，我们不限制会话的总时间。只要应用程序的下一次进入时间与上次退出时间之间的时间在允许的超时期限内，当前会话就被视为连续的。

- **_session_start**：当应用程序首次启动或应用程序进入前台，并且与上次退出的时间间隔超过 `session_time_out` 期限时，触发此事件。

- **_session_duration**：我们通过当前事件创建时间戳与会话的 `_session_start_timestamp` 相减来计算 `_session_duration`。在会话期间的每个事件中都会添加此属性。

- **session_time_out**：默认为 30 分钟，可以通过配置 API 进行自定义设置。

- **_session_number**：不同会话 ID 的总会话数，每个事件的属性对象中都会出现 `_session_number`。

#### 用户参与度定义

在 Clickstream Android SDK 中，我们将 `user_engagement` 定义为应用程序至少在前台运行一秒钟。

- **何时发送**：当应用程序导航到后台或导航到其他应用程序时，我们发送此事件。

- **engagement_time_msec**：我们计算从应用程序进入前台到应用程序进入后台的时间。

### 常见属性和保留属性

#### 示例事件结构

```json
{
    "hashCode": "80452b0",
    "unique_id": "c84ad28d-16a8-4af4-a331-f34cdc7a7a18",
    "event_type": "PasswordReset",
    "event_id": "460daa08-0717-4385-8f2e-acb5bd019ee7",
    "timestamp": 1667877566697,
    "device_id": "f24bec657ea8eff7",
    "platform": "ANDROID",
    "os_version": "10",
    "make": "HUAWEI",
    "brand":"HUAWEI",
    "model": "TAS-AN00",
    "locale": "zh_CN_#Hans",
    "carrier": "CDMA",
    "network_type": "Mobile",
    "screen_height": 2259,
    "screen_width": 1080,
    "zone_offset": 28800000,
    "system_language": "zh",
    "country_code": "CN",
    "sdk_version": "0.2.0",
    "sdk_name": "aws-solution-clickstream-sdk",
    "app_version": "1.0",
    "app_package_name": "com.notepad.app",
    "app_title": "Notepad",
    "app_id": "notepad-4a929eb9",
    "user": {
        "_user_id": {
            "value":"312121",
            "set_timestamp": 1667877566697
        },
        "_user_name": {
            "value":"carl",
            "set_timestamp": 1667877566697
        },
        "_user_first_touch_timestamp": {
            "value":1667877267895,
            "set_timestamp": 1667877566697
        }
    },
    "attributes": {
        "Channel": "SMS",
        "Successful": true,
        "Price": 120.1,
        "ProcessDuration": 791,
        "_session_id":"dc7a7a18-20221108-031926703",
        "_session_start_timestamp": 1667877566703,
        "_session_duration": 391809,
        "_session_number": 1
    }
}
```

所有用户属性都将存储在 `user` 对象中，所有自定义和全局属性都存储在 `attributes` 对象中。

#### 保留属性

**用户属性**

| 属性名称                   | 描述                           |
| ------------------------- | ------------------------------ |
| _user_id                  | 保留用于分配给应用程序的用户 ID       |
| _user_ltv_revenue         | 保留用于用户终身价值               |
| _user_ltv_currency        | 保留用于用户终身价值货币           |
| _user_first_touch_timestamp | 用户首次打开应用程序或访问站点的时间（以微秒为单位），在 `user` 对象的每个事件中都包含此属性 |

**保留属性**

| 属性名称                     | 描述                                                                                               |
| ---------------------------- | -------------------------------------------------------------------------------------------------- |
| _traffic_source_medium       | 保留用于流量来源媒介。使用此属性存储事件记录时获取用户的媒介。                                                                  |
| _traffic_source_name         | 保留用于流量来源名称。使用此属性存储事件记录时获取用户的营销Activity。                                                                  |
| _traffic_source_source       | 保留用于流量来源。使用此属性存储事件记录时获取用户的网络来源名称。                                                                  |
| _channel                     | 下载应用程序的渠道                                                                                      |
| _device_vendor_id            |                                                                                                    |
| _device_advertising_id       |                                                                                                    |
| _entrances                   | 在 `_screen_view` 事件中添加。会话中的第一个 `_screen_view` 事件具有值 1，其他事件为 0。                           |
| _session_id                  | 在所有事件中添加。                                                                                      |
| _session_start_timestamp     | 在所有事件中添加。                                                                                      |
| _session_duration            | 在所有事件中添加。                                                                                      |
| _session_number              | 在所有事件中添加。初始值为 1，并且用户设备会自动递增该值。                                                                   |