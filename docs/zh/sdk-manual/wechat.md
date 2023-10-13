# Clickstream 微信小程序 SDK

## 介绍

Clickstream 微信小程序SDK可以帮助您轻松地将微信小程序中的点击流数据发送到您的AWS环境中。作为解决方案 {{ solution_name }} 的一部分，SDK将点击流数据发送到该解决方案创建的数据管道中，并由数据管道处理和导入到AWS的分析服务中，如Amazon S3和Amazon Redshift。

此SDK基于微信小程序平台及API进行开发，它能够自动收集常见用户事件和属性（如页面浏览、首次打开等）以简化关于用户的数据收集。

## 使用说明

### 初始化SDK

1. 从[GitHub](https://github.com/awslabs/clickstream-wechat/releases)版本发布页面下载`clickstream-wechat.min.js`文件，然后拷贝到您的微信小程序项目中。
2. 为了配合点击流分析解决方案，您需要在使用SDK前进行必要的配置。以TypeScript语言开发的微信小程序为例，将以下代码添加到微信小程序项目的 *app.ts* 文件中，注意此段代码需要在小程序默认的`App()`方法之前添加。您可以在Clickstream解决方案控制台应用程序的详情信息页面中找到`appId`和`endpoint`，用以配置SDK。

```typescript
import { ClickstreamAnalytics } from './clickstream-wechat';

ClickstreamAnalytics.init({
    appId: "your appId",
    endpoint: "https://example.com/collect"
});
```

`appId`和`endpoint`是SDK必需的参数，除此之外您还可以配置其他参数以满足更多定制化的使用。

| 参数名称                    | 是否必需 | 默认值                  | 说明                                                           |
|-------------------------|:----:|----------------------|--------------------------------------------------------------|
| appId                   |  是   | -                    | 在解决方案控制平台中应用程序的ID                                            |
| endpoint                |  是   | -                    | 将事件发送到Clickstream摄取服务器的URL请求路径                               |
| sendMode                |  否   | *SendMode.Immediate* | 发送事件模式: *SendMode.Immediate* （立即发送）, *SendMode.Batch* （批量发送） |
| sendEventsInterval      |  否   | 5000                 | 事件发送间隔毫秒数，仅在批量发送模式下生效                                        |
| autoTrackAppStart       |  否   | true                 | 是否自动记录小程序启动事件                                                |
| autoTrackAppEnd         |  否   | true                 | 是否自动记录小程序结束事件                                                |
| autoTrackPageShow       |  否   | true                 | 是否自动记录小程序页面浏览事件                                              |
| autoTrackUserEngagement |  否   | true                 | 是否自动记录用户参与事件                                                 |
| autoTrackMPShare        |  否   | false                | 是否自动记录分享小程序事件                                                |
| autoTrackMPFavorite     |  否   | false                | 是否自动记录收藏小程序事件                                                |
| debug                   |  否   | false                | 是否在控制台打印SDK日志                                                |
| authCookie              |  否   | -                    | 用于应用程序负载均衡器（ALB）身份验证的cookie                                  |
| sessionTimeoutDuration  |   否   | 1800000              | 会话超时的时长（单位：毫秒）                                               |

您可以在初始化SDK后通过调用`configure()`方法更新SDK配置

```typescript
import { ClickstreamAnalytics, SendMode } from './clickstream-wechat';

ClickstreamAnalytics.configure({
  appId: "your appId",
  endpoint: "https://example.com/collect",
  sendMode: SendMode.Batch,
  debug: true,
  authCookie: 'auth cookie',
  autoTrackPageShow: false
});
```

### 使用SDK

#### 添加用户信息

```typescript
// 添加或更新用户属性
ClickstreamAnalytics.setUserAttributes({
  name:"carl",
  age: 22
});

// 用户登录成功后设置用户ID
ClickstreamAnalytics.setUserId("UserId");

// 用户退出登录后清空用户ID
ClickstreamAnalytics.setUserId(null);
```

当前登录用户的属性会缓存在小程序本地存储空间（wxStorage）中。

#### 记录事件

您可以调用`ClickstreamAnalytics.record()`方法记录自定义事件。事件中的参数`name`是必需的，参数`attributes`和`items`不是必需的。参数`attributes`是一个对象，用来记录各种属性。参数`items`是一个保存`item`类型对象的数组，请参阅[item属性](#item)查看item中的参数。

记录自定义事件示例：

```typescript
ClickstreamAnalytics.record({ name: 'albumVisit' });

ClickstreamAnalytics.record({
  name: 'buttonClick',
  attributes: { buttonName: 'confirm', itemNo: 12345, inStock: true },
  items: [
    {
      id: 'p_123',
      name: 'item_name',
      price: 168.99
    }
  ]
});
```

#### 调试事件

您可以按照以下步骤查看事件原始json并调试您的事件：

1. 调用`ClickstreamAnalytics.configure()`方法将SDK配置中的 *debug* 参数设为`true`，以开启SDK的调试模式。
2. 集成SDK并在设备上或[微信开发者工具](https://developers.weixin.qq.com/miniprogram/dev/devtools/devtools.html)中启动微信小程序。
3. 在控制台中查看SDK所记录的事件内容。

## 数据格式定义

### 数据类型

微信小程序SDK支持以下数据类型

| 数据类型    | 范围               | 示例                    |
|---------|------------------|-----------------------|
| number  | 5e-324~1.79e+308 | 12, 26854775808, 3.14 |
| boolean | true、false       | true                  |
| string  | 最大支持1024个字符      | "clickstream"         |

### 命名规则

1. 事件名称和属性名称不能以数字开头，只能包含大小写字母、数字和下划线。如果事件名称不合规，SDK将不会发送此事件。如果事件中的某些属性名称不合规，发送事件时将不包含这些属性。两种情况下都会记录_clickstream_error事件。
2. 不要使用`_`作为事件名称或属性名称的前缀，以`_`为前缀的名称是为点击流分析的预置事件和属性保留的。
3. 事件名称和属性名称区分大小写。例如，事件`Add_to_cart`和`add_to_cart`将被视为两个不同的事件。

### 事件和属性限制

为了提高查询和分析效率，我们需要对事件进行以下限制

| 名称                                 | 建议         | 限制  | 超过限制的处理策略                                | 错误码  |
|------------------------------------|------------|-----|------------------------------------------|------|
| EVENT_NAME_INVALID                 | --         | --  | 丢弃该事件，打印日志并记录_clickstream_error事件        | 1001 |
| EVENT_NAME_LENGTH_EXCEED           | 少于25个字符    | 50个字符 | 丢弃该事件，打印日志并记录_clickstream_error事件        | 1002 |
| ATTRIBUTE_NAME_LENGTH_EXCEED       | 少于25个字符    | 50个字符 | 丢弃该属性，打印日志并记录_clickstream_error事件        | 2001 |
| ATTRIBUTE_NAME_INVALID             | --         | --  | 丢弃该属性，打印日志并记录_clickstream_error事件        | 2002 |
| ATTRIBUTE_VALUE_LENGTH_EXCEED      | 少于100个字符   | 1024个字符 | 丢弃该属性，打印日志并记录_clickstream_error事件        | 2003 |
| ATTRIBUTE_SIZE_EXCEED              | 少于50个属性    | 500个属性 | 丢弃超出限制的属性，打印日志并记录_clickstream_error事件    | 2004 |
| USER_ATTRIBUTE_SIZE_EXCEED         | 少于25个属性    | 100个属性 | 丢弃超出限制的属性，打印日志并记录_clickstream_error事件    | 3001 |
| USER_ATTRIBUTE_NAME_LENGTH_EXCEED  | 少于25个字符    | 50个字符 | 丢弃该属性，打印日志并记录_clickstream_error事件        | 3002 |
| USER_ATTRIBUTE_NAME_INVALID        | --         | --  | 丢弃该属性，打印日志并记录_clickstream_error事件        | 3003 |
| USER_ATTRIBUTE_VALUE_LENGTH_EXCEED | 少于50个字符    | 256个字符 | 丢弃该属性，打印日志并记录_clickstream_error事件        | 3004 |
| ITEM_SIZE_EXCEED                   | 少于50个items | 100个items | 丢弃超出限制的items，打印日志并记录_clickstream_error事件 | 4001 |
| ITEM_VALUE_LENGTH_EXCEED           | 少于100个字符   | 256个字符 | 丢弃该item，打印日志并记录_clickstream_error事件      | 4002 |

!!! info "重要提示"

    - 字符限制适用于单宽字符语言（如英语）和双宽字符语言（如中文）。
    - 事件属性总数限制包括事件中的预设属性。
    - 如果多次添加相同名称的属性，则属性值将被最后一个值覆盖。

## 预置事件

### 自动收集的事件

| 事件名称               | 触发时机                                                                                                        | 事件属性     | 说明                                            |
|--------------------|-------------------------------------------------------------------------------------------------------------|------------------------------------------------------------------------------|-----------------------------------------------|
| _session_start     | 当用户首次访问微信小程序或用户关闭微信小程序30分钟后再次打开微信小程序时                                                                       | 1. *_session_id* <br>2. *_session_start_timestamp*<br>3. *_session_number*<br />4. *_session_duration* | *_session_id* 通过`uniqueId`最后8个字符和起始时间毫秒值生成，例如：dc7a7a18-20230905-131926703 |
| _screen_view       | 当发生页面转换时且满足下列条件之一: <br /> * 上一页面为空<br /> * 新页面名称和上一页面名称不同<br /> * 新页面的类名和上一页面的类名不同<br /> * 新页面的ID和上一页面的ID不同 | 1. *_screen_name*<br>2. *_screen_id*<br>3. *_previous_screen_name*<br>4. *_previous_screen_id*<br>5. *_engagement_time_msec* |                                               |
| _first_open        | 用户第一次启动小程序时                                                                                                 |                                                                              | 只会记录一次                                        |
| _app_start         | 每一次启动微信小程序时                                                                                                 | 1. *_is_first_time*                                                          |                                               |
| _app_end           | 每一次关闭微信小程序时                                                                                                 |                                                                              |                                               |
| _user_engagement   | 当用户离开当前页面或关闭/隐藏微信小程序时                                                                                       | 1. *_engagement_time_msec*<br>                                               | 用户参与时间是以微信小程序页面为对象进行计算                        |
| _profile_set       | 当调用`addUserAttributes()`或`setUserId()`方法时                                                                   |                                                                              |                                               |
| _mp_share          | 当用户分享微信小程序时                                                                                                 |                                                                              |                                               |
| _mp_favorite       | 当用户收藏微信小程序时                                                                                                 |                                                                              |                                               |
| _clickstream_error | 当事件名称，属性名称或属性值不合规时                                                                                          | 1. *_error_code* <br/>2. _*error_message*                                    |                                               |

### 会话定义

在微信小程序SDK中，我们不限制会话的总时间，只要小程序最后一次退出和下次进入之间的时间在允许的超时时间内，我们就认为当前会话是连续的。

1. _session_start：当用户首次访问微信小程序或用户关闭微信小程序30分钟后再次打开微信小程序时
2. _session_duration：我们通过当前事件发生时间减去会话创建时间（`_session_start_timestamp`）来计算会话持续时间，会话期间的每个事件中都包含该属性。
3. _session_number：微信小程序会话的自增数，初始值为1。
4. 会话超时时间：默认为30分钟，可以自定义。

### 用户参与度定义

在微信小程序SDK中，我们将`_user_engagement`定义为记录用户浏览页面时长的事件。`_engagement_time_msec`以微信小程序页面为对象计算用户停留时长，从浏览页面开始直到页面隐藏、关闭或跳转到其他页面。

## 事件属性

### 通用属性

| 属性名称               | 示例                                     | 说明                        | 如何生成                                           |
|--------------------|----------------------------------------|---------------------------|------------------------------------------------|
| app_id             | "appId"                                | 点击流app id，用以区分不同app的事件    | 可通过调用SDK的`init()`或`configure()`方法进行设置          |
| unique_id          | "c84ad28d-16a8-4af4-a331-f34cdc7a7a18" | 标识不同用户的唯一性，并关联登录和未登录用户的行为 | 可以使用微信用户的 *openId* 作为`unique_id`                 |
| device_id          | "a843d34c-15a8-2af4-a332-b34cdc4a7a12" | 区分不同设备                    | 在微信小程序第一次启动时生成uuid，并保存在wxStorage中，之后也不会更改      |
| event_type         | "_session_start"                       | 事件名称                      | 由开发者或SDK设置                                     |
| event_id           | "460daa08-0717-4385-8f2e-acb5bd019ee7" | 事件的唯一id                   | 创建事件时生成uuid                                    |
| timestamp          | 1667877566697                          | 事件创建时的时间戳                 | `new Date().getTime()` 单位：毫秒                   |
| platform           | "WeChatMP"                             | 平台名称                      | 微信小程序固定使用"WeChatMP"                            |
| os_name            | "iOS"                                  | 设备操作系统名称                  | 由`wx.getSystemInfoSync()` API获取                |
| os_version         | "iOS 12.0.1"                           | 设备操作系统版本                  | 由`wx.getSystemInfoSync()` API获取                |
| wechat_version     | "8.0.5"                                | 微信版本                      | 由`wx.getSystemInfoSync()` API获取                |
| wechat_sdk_version | "3.0.0"                                | 微信SDK版本                   | 由`wx.getSystemInfoSync()` API获取                |
| brand              | Google Inc.                            | 设备品牌                      | 由`wx.getSystemInfoSync()` API获取                |
| model              | "iPhone 6/7/8"                         | 设备型号                      | 由`wx.getSystemInfoSync()` API获取                |
| system_language    | "zh"                                   | 设备系统语言                    | 由`wx.getSystemInfoSync()` API获取                |
| screen_height      | 667                                    | 屏幕高度像素                    | 由`wx.getSystemInfoSync()` API获取                |
| screen_width       | 375                                    | 屏幕宽度像素                    | 由`wx.getSystemInfoSync()` API获取                |
| zone_offset        | 28800000                               | 设备所处时区与GMT的原始偏移量（单位：毫秒）   | `-currentDate.getTimezoneOffset() * 60 * 1000` |
| network_type       | "wifi"                                 | 设备网络类型                    | 由`wx.getNetworkType()` API获取                   |
| sdk_version        | "0.2.0"                                | 点击流SDK版本                  | 从 *package.json* 获取                            |
| sdk_name           | "aws-solution-clickstream-sdk"         | 点击流SDK名称                  | 固定为"aws-solution-clickstream-sdk"              |
| app_package_name   | "wxbd614036ba3d1f05"                   | 微信小程序ID                   | 由`wx.getAccountInfoSync()` API获取               |
| app_version        | "1.0.1"                                | 微信小程序版本                   | 由`wx.getAccountInfoSync()` API获取               |

### 保留属性

**用户属性**

| 属性名称                        | 是否必需 | 说明                |
|-----------------------------|:----:|-------------------|
| _user_id                    |  是   | 微信小程序用户ID         |
| _user_name                  |  是   | 微信小程序用户名称         |
| _user_first_touch_timestamp |  是   | 微信小程序用户首次使用小程序的时间 |

**事件属性**

| 属性名称           | 是否必需 | 说明                                                                                 |
|--------------------------|:----:|------------------------------------------------------------------------------------|
| _error_code              |  否   | 错误码，用于上报_clickstream_error事件                                                       |
| _error_message           |  否  | 错误原因，用于上报_clickstream_error事件                                                      |
| _session_id              |  是   | 会话ID                                                                               |
| _session_start_timestamp |  是   | 会话起始时间                                                                             |
| _session_duration        |  是   | 会话持续时间                                                                             |
| _session_number          |  是   | 会话自增数，从1开始                                                                         |
| _screen_name             |  否  | 当前页面名称                                                                             |
| _screen_id               |  否  | 当前页面ID                                                                             |
| _screen_route            |  否  | 当前页面URL                                                                            |
| _previous_screen_name    |  否  | 上一页面名称                                                                             |
| _previous_screen_id      |  否  | 上一页面ID                                                                             |
| _previous_screen_route   |  否  | 上一页面URL                                                                            |
| _engagement_time_msec    |  否  | 用户在当前页面停留时间                                                                        |
| _is_first_time           |  否  | 用户首次使用微信小程序时为`true` |

### Item属性

| 属性名称          | 数据类型             | 是否必需 | 说明        |
|---------------|------------------|------|-----------|
| id            | string           | 否    | item的id   |
| name          | string           | 否   | item的名称   |
| brand         | string           | 否   | item的品牌   |
| price         | string \| number | 否   | item的价格   |
| quantity      | number           | 否   | item的数量   |
| creative_name | string           | 否   | item的创意名称 |
| creative_slot | string           | 否   | item的创意槽  |
| location_id   | string           | 否   | item的位置id |
| category      | string           | 否   | item的类别   |
| category2     | string           | 否   | item的类别2  |
| category3     | string           | 否   | item的类别3  |
| category4     | string           | 否   | item的类别4  |
| category5     | string           | 否   | item的类别5  |

### 事件示例

```json
{
  "app_id": "appId",
  "unique_id": "c84ad28d-16a8-4af4-a331-f34cdc7a7a18",
  "device_id": "be4b3f1e-b2a8-4b7b-9055-4257e3e313c8",
  "event_type": "_screen_view",
  "event_id": "460daa08-0717-4385-8f2e-acb5bd019ee7",
  "timestamp": 1667877566697,
  "platform": "WeChatMP",
  "os_name": "iOS",
  "os_version": "iOS 12.0.1",
  "wechat_version": "8.0.5",
  "wechat_sdk_version": "3.0.0",
  "brand": "devtools",
  "model": "iPhone 6/7/8",
  "system_language": "en",
  "screen_height": 667,
  "screen_width": 375,
  "zone_offset": 28800000,
  "network_type": "wifi",
  "sdk_version": "0.2.0",
  "sdk_name": "aws-solution-clickstream-sdk",
  "app_version": "1.0.1",
  "app_package_name": "wxbd614036ba3d1f05",
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
    "_session_id":"dc7a7a18-20221108-031926703",
    "_session_start_timestamp": 1667877566703,
    "_session_duration": 391809,
    "_session_number": 1,
    "_previous_screen_id": "pages/category/index",
    "_screen_id": "pages/items/11223/detail",
    "_engagement_time_msec": 30000
  },
  "items": [
    {
      "id": "p_123",
      "name": "item_name",
      "price": 168.99
    }
  ]
}
```

## 更新日志

[GitHub更新日志](https://github.com/awslabs/clickstream-wechat/releases)

## 参考链接

[SDK源码](https://github.com/awslabs/clickstream-wechat)

[SDK问题](https://github.com/awslabs/clickstream-wechat/issues)
