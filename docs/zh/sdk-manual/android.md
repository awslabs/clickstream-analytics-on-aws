# Clickstream Android SDK

## 简介

Clickstream Android SDK 可以帮助您轻松地从 Android 设备收集和发送应用内事件到您配置的解决方案数据管道。

该 SDK 基于 Amplify for Android SDK 核心库开发，并根据 Amplify Android SDK 插件规范进行了扩展。此外，该 SDK
还具有自动收集常见用户事件和属性（例如，屏幕查看和首次打开）的功能，以简化用户的数据收集过程。

### 平台支持

Clickstream Android SDK 支持 Android 4.1（API 级别 16）及更高版本。

## 集成 SDK

### 1. 添加 SDK

在您 `app` 模块的 `build.gradle` 文件中添加 Clickstream SDK 依赖，例如：

```groovy
dependencies {
    implementation 'software.aws.solution:clickstream:0.9.0'
}
```

您可以将SDK同步为最新版本：[![Maven Central](https://img.shields.io/maven-central/v/software.aws.solution/clickstream.svg)](https://central.sonatype.com/artifact/software.aws.solution/clickstream/versions)

### 2. 配置参数

在 `project/app/src/main` 下找到 `res` 目录，并在 `res` 目录中手动创建一个 raw 文件夹。

![android_raw_folder](../images/sdk-manual/android_raw_folder.png)

从 Clickstream web控制台下载您的 `amplifyconfiguration.json` 文件，并将其粘贴到 raw 文件夹中，JSON 文件的内容如下所示：

```json
{
  "analytics": {
    "plugins": {
      "awsClickstreamPlugin": {
        "appId": "your appId",
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

- **appId（必需的）**：控制平面上项目的应用程序 ID。
- **endpoint（必需的）**：将事件上传到 AWS 服务器的端点 URL。
- **isCompressEvents**：上传事件时是否压缩事件内容，默认值为 `true`。
- **autoFlushEventsInterval**：事件发送间隔，默认值为 `10s`。
- **isTrackAppExceptionEvents**：是否自动跟踪应用程序中的异常事件，默认值为 `false`。

### 3. 初始化 SDK

在应用程序的 `onCreate()` 方法中初始化 SDK。

```java
import software.aws.solution.clickstream.ClickstreamAnalytics;

public void onCreate() {
    super.onCreate();

    try{
        ClickstreamAnalytics.init(getApplicationContext());
        Log.i("MyApp", "Initialized ClickstreamAnalytics");
    } catch (AmplifyException error){
        Log.e("MyApp", "Could not initialize ClickstreamAnalytics", error);
    } 
}
```

### 4. 开始使用

#### 记录事件

在需要报告事件的位置添加以下代码。

```java
import software.aws.solution.clickstream.ClickstreamAnalytics;
import software.aws.solution.clickstream.ClickstreamEvent;

// 记录带有自定义参数的事件
ClickstreamEvent event = ClickstreamEvent.builder()
    .name("button_click")
    .add("category", "shoes")
    .add("currency", "CNY")
    .add("value", 279.9)
    .build();
ClickstreamAnalytics.recordEvent(event);

// 直接记录事件名
ClickstreamAnalytics.recordEvent("button_click");
```

#### 添加全局属性

```java
import software.aws.solution.clickstream.ClickstreamAttribute;
import software.aws.solution.clickstream.ClickstreamAnalytics;

ClickstreamAttribute globalAttribute = ClickstreamAttribute.builder()
    .add("channel", "Play Store")
    .add("level", 5.1)
    .add("class", 6)
    .add("isOpenNotification", true)
    .build();
ClickstreamAnalytics.addGlobalAttributes(globalAttribute);

// 删除全局属性
ClickstreamAnalytics.deleteGlobalAttributes("level");
```

请在SDK初始化完成后添加全局属性，全局属性将添加到所有事件的属性对象中。

#### 登录和登出

```java
import software.aws.solution.clickstream.ClickstreamAnalytics;

// 当用户登录成功时设置
ClickstreamAnalytics.setUserId("UserId");

// 当用户退出登录时设置
ClickstreamAnalytics.setUserId(null);
```

#### 添加用户属性

```java
import software.aws.solution.clickstream.ClickstreamAnalytcs;
import software.aws.solution.clickstream.ClickstreamUserAttribute;

ClickstreamUserAttribute clickstreamUserAttribute = ClickstreamUserAttribute.builder()
    .add("_user_age", 21)
    .add("_user_name", "carl")
    .build();
ClickstreamAnalytics.addUserAttributes(clickstreamUserAttribute);
```

当前登录用户的属性会进行缓存，因此在下次App打开时不需要再次设置所有的用户属性，当然您可以使用相同的
api `ClickstreamAnalytics.addUserAttributes()` 在当用户属性改变时来更新当前用户的属性。

!!! info "重要提示"

    如果您的应用已经上线，这时大部分用户已经登录过，则第一次接入Clickstrema SDK时请手动设置一次用户属性，确保后续事件都带有用户属性。

#### 实时发送事件

```java
// 实时发送事件
ClickstreamAnalytics.flushEvent();
```

#### 禁用 SDK

您可以根据需要禁用 SDK 。禁用后 SDK 将不会处理任何事件的记录和发送，同时您可以在需要继续记录事件时再次启用SDK。

请注意，禁用和启用的代码需要在主线程中运行。

```java
import software.aws.solution.clickstream.ClickstreamAnalytics;

// 禁用 SDK
ClickstreamAnalytics.disable();

// 启用 SDK
ClickstreamAnalytics.enable();
```

#### SDK 配置更新

在初始化 SDK 后，您可以使用以下代码对其进行自定义配置。

!!! info "重要提示"
    此配置将覆盖 `amplifyconfiguration.json` 文件中的默认配置。

```java
import software.aws.solution.clickstream.ClickstreamAnalytics;

// 在初始化后更新SDK配置
ClickstreamAnalytics.getClickStreamConfiguration()
        .withAppId("your appId")
        .withEndpoint("https://example.com/collect")
        .withAuthCookie("your authentication cookie")
        .withSendEventsInterval(10000)
        .withSessionTimeoutDuration(1800000)
        .withTrackScreenViewEvents(false)
        .withTrackUserEngagementEvents(false)
        .withTrackAppExceptionEvents(false)
        .withLogEvents(true)
        .withCustomDns(CustomOkhttpDns.getInstance())
        .withCompressEvents(true);
```

以下是每个方法的说明

| 方法名                          | 参数类型 | 是否必需 | 默认值  | 描述                                               |
| ------------------------------- | -------- | -------- | ------- | -------------------------------------------------- |
| withAppId()                     | String   | 是       | --      | 在解决方案控制平面中您应用程序的 ID                |
| withEndpoint()                  | String   | 是       | --      | 您将事件上传到 Clickstream 摄取服务器的URL请求路径 |
| withAuthCookie()                | String   | 否       | --      | 您的 AWS 应用程序负载均衡器身份验证 cookie         |
| withSendEventsInterval()        | long     | 否       | 100000  | 事件发送间隔（毫秒）                               |
| withSessionTimeoutDuration()    | long     | 否       | 1800000 | 会话超时的时长（毫秒）                             |
| withTrackScreenViewEvents()     | boolean  | 否       | true    | 是否自动记录 screen view（屏幕浏览） 事件          |
| withTrackUserEngagementEvents() | boolean  | 否       | true    | 是否自动记录 user engagement（用户参与） 事件      |
| withTrackAppExceptionEvents()   | boolean  | 否       | true    | 是否自动记录应用崩溃事件                           |
| withLogEvents()                 | boolean  | 否       | true    | 是否自动打印事件 json以调试事件, [了解更多](#_8)   |
| withCustomDns()                 | String   | 否       | --      | 设置自定义 DNS 的方法, [了解更多](#dns)            |
| withCompressEvents()            | boolean  | 否       | true    | 上传事件时是否通过gzip压缩事件内容                 |

#### 调试事件

您可以按照以下步骤查看事件原始 json 并调试您的事件。

1.使用 `ClickstreamAnalytics.getClickStreamConfiguration()` 并在调试模式下将 `withLogEvents()` 方法设置为 true，例如：

   ```java
   import software.aws.solution.clickstream.ClickstreamAnalytics;

   // 在调试模式下打开事件json内容的打印
   ClickstreamAnalytics.getClickStreamConfiguration()
           .withLogEvents(BuildConfig.DEBUG);
   ```

2.集成 SDK 并通过 Android Studio 启动您的应用程序，然后打开 **Logcat** 窗口。

3.在filter中输入`EventRecorder`，您将看到Clickstream Android SDK记录的所有事件的json内容。

#### 配置自定义DNS

```java
import software.aws.solution.clickstream.ClickstreamAnalytics;

// 配置自定义DNS
ClickstreamAnalytics.getClickStreamConfiguration()
        .withCustomDns(CustomOkhttpDns.getInstance());
```

如果你想使用自定义DNS进行网络请求，你可以创建你的 `CustomOkhttpDns`并继承`okhttp3.Dns`
，然后配置 `.withCustomDns(CustomOkhttpDns.getInstance())`
使其工作，您可以参考 [示例代码](https://github.com/awslabs/clickstream-android/blob/main/clickstream/src/test/java/software/aws/solution/clickstream/IntegrationTest.java#L503-L516)
。

## 数据格式定义

### 数据类型

Clickstream Android SDK 支持以下数据类型：

| 数据类型    | 范围                                         | 示例            |
|---------|--------------------------------------------|---------------|
| int     | -2147483648 ～ 2147483647                   | 12            |
| long    | -9223372036854775808 ～ 9223372036854775807 | 26854775808   |
| double  | 4.9E-324 ～ 1.7976931348623157E308          | 3.14          |
| boolean | true 或 false                               | true          |
| String  | 最大 1024 个字符                                | "Clickstream" |

### 命名规则

1.
事件名称和属性名称不能以数字开头，只能包含大写字母、小写字母、数字和下划线。如果事件名称无效，将抛出 `IllegalArgumentException`
。如果属性名称或用户属性名称无效，将丢弃该属性并记录错误。

2. 不要在事件名称或属性名称前使用 `_` 作为前缀，因为 `_` 前缀保留给解决方案使用。

3. 事件名称和属性名称区分大小写，因此 `Add_to_cart` 和 `add_to_cart` 将被识别为两个不同的事件名称。

### 事件和属性限制

为了提高查询和分析的效率，我们需要对事件进行以下限制：

| 名称        | 建议         | 硬限制          | 超过限制的处理策略                               | 错误码   |
|:----------|:-----------|:-------------|:----------------------------------------|:------|
| 事件名称合规    | --         | --           | 丢弃该事件，打印日志并记录`_clickstream_error`事件     | 1001  |
| 事件名称长度    | 25 个字符以下   | 50 个字符       | 丢弃该事件，打印日志并记录`_clickstream_error`事件     | 1002  |
| 事件属性名称的长度 | 25 个字符以下   | 50 个字符       | 丢弃该属性、打印日志并在事件属性中记录错误                   | 2001  |
| 属性名称合规    | --         | --           | 丢弃该属性、打印日志并在事件属性中记录错误                   | 2002  |
| 事件属性值的长度  | 少于 100 个字符 | 1024 个字符     | 丢弃该属性、打印日志并在事件属性中记录错误                   | 2003  |
| 每个事件的事件属性 | 50 属性以下    | 500 evnet 属性 | 丢弃超过限制的属性、打印日志并在事件属性中记录错误               | 2004  |
| 用户属性数     | 25岁以下属性    | 100个用户属性     | 丢弃超过限制的属性、打印日志并记录`_clickstream_error`事件 | 3001  |
| 用户属性名称的长度 | 25 个字符以下   | 50 个字符       | 丢弃该属性、打印日志并记录`_clickstream_error`事件     | 3002  |
| 用户属性名称合规  | --         | --           | 丢弃该属性、打印日志并记录`_clickstream_error`事件     | 3003  |
| 用户属性值的长度  | 50 个字符以下   | 256 个字符      | 丢弃该属性、打印日志并记录`_clickstream_error`事件     | 3004  |

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
| _os_update         | 当Android操作系统更新到新版本时                             | 1. _previous_os_version                                                                                                                                                                                                    |
| _clickstream_error | event_name 无效或用户属性无效时                           | 1. _error_code <br>2. _error_message                                                                                                                                                                                       |

### 会话定义

在 Clickstream Android SDK 中，我们不限制会话的总时间，只要App下次进入和最后一次退出之间的时间在允许的超时时间内，我们就认为当前会话是连续的。

当App第一次打开，或者App打开到前台并且最后一次退出之间的时间超过了 `session_time_out` 的时长时，会触发 `_session_start`
事件。 以下是与session相关的属性。

1. _session_id：我们通过uniqueId的后8个字符和当前毫秒值拼接来计算会话id，例如: dc7a7a18-20230905-131926703
2. _session_duration： 我们通过 `_session_start_timestamp` 减去当前事件创建时间戳来计算会话持续时间，该属性将添加到会话期间的每个事件中。
3. _session_number：当前设备的会话数的自动递增值，初始值为1
4. Session timeout duration：默认为30分钟，可以通过[更新配置](#sdk_1) api来自定义。

### 屏幕浏览定义

在Clickstream Android SDK中，我们将 `_screen_view` 定义为记录用户屏幕浏览路径的事件，当屏幕切换开始时，满足以下任何条件时将会记录 `_screen_view` 事件：

1. 之前没有设置过屏幕。
2. 新的屏幕类名与之前的屏幕类名不同。
3. 新的屏幕的路径与之前的屏幕的路径不同。
4. 新的屏幕唯一id与之前的屏幕唯一id不同。

该事件监听Activity的 `onResume` 生命周期方法来判断屏幕切换。 为了跟踪屏幕浏览路径，我们使用 `_previous_screen_name`
、 `_previous_screen_id` 和 `_previous_screen_unique_id` 来关联前一个屏幕。 此外，屏幕浏览事件中还有一些其他属性。

1. _screen_unique_id：我们通过获取当前屏幕的哈希值来计算屏幕唯一id，例如："126861252"。
2. _entrances： 会话中的第一个屏幕浏览事件该值为 1，其他则为 0
3. _previous_timestamp: 上一个 `screen_view` 事件的时间戳。
4. _engagement_time_msec: 上个屏幕最后一次用户参与事件时长的毫秒数。

### 用户参与度定义

在Clickstream Android SDK中，我们将 `_user_engagement` 定义为记录屏幕浏览时间的事件，并且仅当用户离开屏幕并且在该屏幕停留至少一秒时发送。

我们定义用户在以下情况下离开屏幕。

1. 当用户导航到另一个屏幕时。
2. 用户将App退到后台时。
3. 用户退出App，或者杀死App进程时。

**engagement_time_msec**：从屏幕可见到用户离开屏幕的毫秒数。

## 事件属性

### 事件结构示例

```json
{
  "hashCode": "80452b0",
  "unique_id": "c84ad28d-16a8-4af4-a331-f34cdc7a7a18",
  "event_type": "add_to_cart",
  "event_id": "460daa08-0717-4385-8f2e-acb5bd019ee7",
  "timestamp": 1667877566697,
  "device_id": "f24bec657ea8eff7",
  "platform": "Android",
  "os_version": "10",
  "make": "Samsung",
  "brand": "Samsung",
  "model": "TAS-AN00",
  "locale": "zh_CN_#Hans",
  "carrier": "CDMA",
  "network_type": "Mobile",
  "screen_height": 2259,
  "screen_width": 1080,
  "zone_offset": 28800000,
  "system_language": "zh",
  "country_code": "CN",
  "sdk_version": "0.7.1",
  "sdk_name": "aws-solution-clickstream-sdk",
  "app_version": "1.0",
  "app_package_name": "com.notepad.app",
  "app_title": "Notepad",
  "app_id": "notepad-4a929eb9",
  "user": {
    "_user_id": {
      "value": "312121",
      "set_timestamp": 1667877566697
    },
    "_user_name": {
      "value": "carl",
      "set_timestamp": 1667877566697
    },
    "_user_first_touch_timestamp": {
      "value": 1667877267895,
      "set_timestamp": 1667877566697
    }
  },
  "attributes": {
    "event_category": "recommended",
    "currency": "CNY",
    "_session_id": "dc7a7a18-20221108-031926703",
    "_session_start_timestamp": 1667877566703,
    "_session_duration": 391809,
    "_session_number": 1,
    "_screen_name": "ProductDetailActivity",
    "_screen_unique_id": "126861252"
  }
}
```

所有用户属性都将存储在 `user` 对象中，所有自定义和全局属性都存储在 `attributes` 对象中。

### 公共属性

| 属性名              | 数据类型    | 描述                               | 如何生成                                                                                                                                   | 用途和目的                    |
|------------------|---------|----------------------------------|----------------------------------------------------------------------------------------------------------------------------------------|--------------------------|
| hashCode         | String  | 事件对象的哈希值                         | 通过`Integer.toHexString(AnalyticsEvent.hashCode())`生成                                                                                   | 区分不同的事件                  |
| app_id           | String  | 您应用的app id                       | app id 是在您将应用程序注册到数据管道时由点击流解决方案生成的                                                                                                     | 区分不同app的事件               |
| unique_id        | String  | 用户唯一id                           | 在 SDK 首次初始化期间由  `UUID.randomUUID().toString()` 生成<br/>如果用户注销然后登录新用户，它将被更改。 当用户在同一设备中重新登录到以前的用户时，unique_id 将重置为之前的 unique_id            | 唯一id来标识不同的用户并关联登录和未登录的行为 |
| device_id        | String  | 设备唯一id                           | 通过`Settings.System.getString(context.getContentResolver(), Settings.Secure.ANDROID_ID)`生成, <br>如果 Android ID 为 null 或“”，我们将使用 UUID 代替。 | 区分不同设备                   |
| event_type       | String  | 事件名称                             | 由开发者或SDK设置                                                                                                                             | 区分不同的事件名称                |
| event_id         | String  | 事件的唯一id                          | 事件创建时通过`UUID.randomUUID().toString()`生成                                                                                                | 区分每个事件                   |
| timestamp        | long    | 事件创建时间戳                          | 事件创建时由`System.currentTimeMillis()`生成                                                                                                   | 数据分析需要                   |
| platform         | String  | 平台名称                             | Android 设备始终为"Android"                                                                                                                 | 数据分析需要                   |
| os_version       | String  | 系统版本号                            | 通过`Build.VERSION.RELEASE`生成                                                                                                            | 数据分析需要                   |
| make             | String  | 设备制造商                            | 通过`Build.MANUFACTURER`生成                                                                                                               | 数据分析需要                   |
| brand            | String  | 设备品牌                             | 通过`Build.BRAND`生成                                                                                                                      | 数据分析需要                   |
| model            | String  | 设备型号                             | 通过`Build.MODEL`生成                                                                                                                      | 数据分析需要                   |
| carrier          | String  | 设备网络运营商名称                        | 通过`TelephonyManager.getNetworkOperatorName()`生成 默认为："UNKNOWN"                                                                          | 数据分析需要                   |
| network_type     | String  | 当前设备网络类型                         | “移动”、“WIFI”或“未知” 通过`android.netConnectivityManager`生成                                                                                  | 数据分析需要                   |
| screen_height    | int     | 屏幕高度（以像素为单位）                     | 通过`applicationContext.resources.displayMetrics.heightPixels`生成                                                                         | 数据分析需要                   |
| screen_width     | int     | 屏幕宽度（以像素为单位）                     | 通过`applicationContext.resources.displayMetrics.widthPixels`生成                                                                          | 数据分析需要                   |
| zone_offset      | int     | device 与 GMT 的原始偏移量（以毫秒为单位）      | 通过`java.util.Calendar.get(Calendar.ZONE_OFFSET)`生成                                                                                     | 数据分析需要                   |
| locale           | String  | tJava 虚拟机此设备的默认区域设置（语言、国家/地区和变体） | 通过“java.util.Local.getDefault()”生成                                                                                                     | 数据分析需要                   |
| system_language  | String  | 设备语言代码                           | 通过`java.util.Local.getLanguage()`生成 默认为："UNKNOWN"                                                                                      | 数据分析需要                   |
| country_code     | String  | 该设备的国家/地区代码                      | 通过`java.util.Local.getCountry()`生成 默认为："UNKNOWN"                                                                                       | 数据分析需要                   |
| sdk_version      | String  | 点击流SDK版本                         | 通过`BuildConfig.VERSION_NAME`生成                                                                                                         | 数据分析需要                   |
| sdk_name         | String  | Clickstream SDK 名称               | 始终是`aws-solution-clickstream-sdk`                                                                                                      | 数据分析需要                   |
| app_version      | String  | 用户应用程序的应用程序版本名称                  | 通过`android.content.pm.PackageInfo.versionName`生成 默认为："UNKNOWN"                                                                         | 数据分析需要                   |
| app_package_name | String  | 用户应用的应用程序包名称                     | 通过`android.content.pm.PackageInfo.packageName`生成 默认为："UNKNOWN"                                                                         | 数据分析需要                   |
| app_title        | String  | 应用程序的显示名称                        | 通过`android.content.pm.getApplicationLabel(appInfo)`生成                                                                                  | 数据分析需要                   |

### 用户属性

| 属性名称                        | 描述                                                 |
|-----------------------------|----------------------------------------------------|
| _user_id                    | 保留用于分配给应用程序的用户 ID                                  |
| _user_ltv_revenue           | 保留用于用户终身价值                                         |
| _user_ltv_currency          | 保留用于用户终身价值货币                                       |
| _user_first_touch_timestamp | 用户首次打开应用程序或访问站点的时间（以毫秒为单位），在 `user` 对象的每个事件中都包含此属性 |

### 事件属性

| 属性名称                     | 数据类型    | 是否自动采集  | 描述                                                       |
|--------------------------|---------|---------|----------------------------------------------------------|
| _traffic_source_medium   | String  | 否       | 保留给流量媒介，使用此属性存储事件记录时获取用户的媒介，例如：电子邮件、付费搜索、搜索引擎            |
| _traffic_source_name     | String  | 否       | 保留给流量名称，使用此属性存储事件记录时获取用户的营销活动，例如：夏季促销                    |
| _traffic_source_source   | String  | 否       | 保留给流量来源，事件报告时获取的网络来源的名称，例如：Google, Facebook, Bing, Baidu |
| _channel                 | String  | 否       | 预留安装源，app下载的渠道                                           |
| _session_id              | String  | 是       | 在所有事件中添加                                                 |
| _session_start_timestamp | long    | 是       | 在所有事件中添加                                                 |
| _session_duration        | long    | 是       | 在所有事件中添加                                                 |
| _session_number          | int     | 是       | 在所有事件中添加                                                 |
| _screen_name             | String  | 是       | 在所有事件中添加                                                 |
| _screen_unique_id        | String  | 是       | 在所有事件中添加                                                 |

## SDK更新日志

参考：[GitHub 更新日志](https://github.com/awslabs/clickstream-android/releases)

## 参考链接

[SDK 源码](https://github.com/awslabs/clickstream-android)

[SDK 问题](https://github.com/awslabs/clickstream-android/issues)