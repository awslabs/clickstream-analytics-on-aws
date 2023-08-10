# Clickstream Web SDK

## 介绍

Clickstream Web SDK 可以帮助您通过此解决方案配置的数据管道轻松收集从浏览器到您的 AWS 环境的点击流数据。

该 SDK 基于 amplify-js SDK核心库，按照amplify-js SDK插件规范开发。此外，该 SDK 还配备了自动收集常见用户事件和属性（例如屏幕视图、首次打开）的功能，以简化用户的数据收集。

## 集成 SDK

### 安装 SDK

```bash
npm install @aws/clickstream-web
```

### 初始化 SDK

使用前您需要配置SDK默认信息。 从点击流解决方案控制平面复制配置代码，配置代码应如下所示。在 Clickstream Analytics 解决方案控制台中将应用程序注册到数据管道后，您还可以手动添加此代码段并替换 appId 和 endpoint 的值。

```typescript
import { ClickstreamAnalytics } from '@aws/clickstream-web';

ClickstreamAnalytics.init({
   appId: "your appId",
   endpoint: "https://example.com/collect",
});
```

其中，您的 `appId` 和 `endpoint` 已经设置好了。

### 开始使用

#### 记录事件

在需要报告事件的位置添加以下代码。

```typescript
import { ClickstreamAnalytics } from '@aws/clickstream-web';

ClickstreamAnalytics.record({ name: 'albumVisit' });
ClickstreamAnalytics.record({
  name: 'buttonClick',
  attributes: { _channel: 'SMS', Successful: true }
});
```
更多用法请参考 [GitHub 开始使用](https://github.com/awslabs/clickstream-web#start-using)

## 数据格式定义

### 数据类型

Clickstream Web SDK 支持以下数据类型：

| 数据类型     | 范围                 | 示例                     |
|----------|--------------------|------------------------|
| number   | 5e-324~1.79e+308   | 12, 26854775808, 3.14  |
| boolean  | true、false         | true                   |
| string   | 最大支持 1024 个字符      | "clickstream"          |

### 命名规则

1. 事件名称和属性名称不能以数字开头，只能包含：大小写字母、数字、下划线，如果事件名称无效，SDK会记录`_clickstream_error`事件，如果属性或用户属性名称无效，该属性将被丢弃并记录 `_clickstream_error` 事件。

2. 不要使用 `_` 作为事件名称和属性名称的前缀，`_` 前缀是 Clickstream Analytics 保留的。

3. 事件名称和属性名称区分大小写。因此，事件 `Add_to_cart` 和 `add_to_cart` 将被视为两个不同的事件。

### 事件和属性限制

为了提高查询和分析的效率，我们需要对事件进行以下限制：

| 名称            | 建议            | 硬限制          | 超过限制的处理策略                | 错误码     |
|---------------|---------------|--------------|--------------------------|---------|
| 事件名称合规        | --            | --           | 记录`_clickstream_error`事件 | 1001    | 
| 事件名称长度        | 25 个字符以下      | 50 个字符       | 丢弃，记录错误事件                | 1002    | 
| 事件属性名称的长度     | 25 个字符以下      | 50 个字符       | 丢弃、记录并记录错误               | 2001    |
| 属性名称合规        | --            | --           | 记录`_clickstream_error`事件 | 2002    |
| 事件属性值的长度      | 少于 100 个字符    | 1024 个字符     | 丢弃、记录并记录错误               | 2003    |
| 每个事件的事件属性     | 50 属性以下       | 500 evnet 属性 | 丢弃、记录并记录错误               | 2004    |
| 用户属性数         | 25岁以下属性       | 100个用户属性     | 丢弃、记录并记录错误               | 3001    | 
| 用户属性名称的长度     | 25 个字符以下      | 50 个字符       | 丢弃、记录并记录错误               | 3002    |
| 用户属性名称合规      | --            | --           | 记录`_clickstream_error`事件 | 3003    | 
| 用户属性值的长度      | 50 个字符以下      | 256 个字符      | 丢弃、记录并记录错误               | 3004    | 

!!! info "重要提示"

    - 字符限制适用于单宽字符语言（如英语）和双宽字符语言（如中文）。
    - 事件属性数包括事件中的预设属性。
    - 如果多次添加相同名称的属性或用户属性，则值将被最后一个值覆盖。

## 预置事件和属性

### 预置事件

自动收集的事件：

| 事件名                | 触发时机                                                                                    | 事件属性                                                                                                                                                                                          |
|--------------------|-----------------------------------------------------------------------------------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| _session_start     | 当用户首次访问该网站或用户在 30 分钟不活动期后返回该网站时                                                         | 1._session_id <br>2._session_start_timestamp<br>3._session_duration                                                                                                                           |
| _page_view         | 当新页面打开时                                                                                 | 1._page_url<br>2._page_referrer                                                                                                                                                               |
| _first_open        | 用户第一次打开网站                                                                               |                                                                                                                                                                                               |
| _app_start         | 每次浏览器从不可见到进入可见状态时                                                                       | 1._is_first_time                                                                                                                                                                              |
| _user_engagement   | 当网页处于焦点至少一秒时                                                                            | 1._engagement_time_msec<br>                                                                                                                                                                   |
| _profile_set       | 当调用 `addUserAttributes()` 或 `setUserId()` api 时                                         |                                                                                                                                                                                               |
| _scroll            | 用户第一次到达每个页面的底部时（即当 90% 的垂直深度变得可见时）                                                      | 1._engagement_time_msec                                                                                                                                                                       |
| _search            | 每次用户执行站点搜索时，根据 URL 查询参数的存在来判断，默认情况下，我们在查询参数中检测 `q`, `s`, `search`, `query` 和 `keyword`。 | 1._search_key (the keyword name)<br>2._search_term (the search content)                                                                                                                       |
| _click             | 每次用户单击将其带离当前域（或配置的域列表）的链接时                                                              | 1._link_classes（标签 `<a>`中`class`里的内容）<br>2._link_domain（标签 `<a>`中`herf`里的域名）<br>3._link_id（标签 `<a>`中`id`里的内容）<br>4._link_url（标签 `<a>`中`herf`里的内容）<br>5._outbound（如果该域不在配置的域列表中，则属性值为“true”）   |
| _clickstream_error | event_name 无效或用户属性无效                                                                    | 1._error_code <br>2._error_value                                                                                                                                                              |

#### 会话定义

在 Clickstream Web SDK 中，我们不限制会话的总时间。只要应用程序的下一次进入时间与上次退出时间之间的时间在允许的超时期限内，当前会话就被视为连续的。

- **_session_start（会话开始）**：当网页首次启动或进入前台，并且与上次退出的时间间隔超过 `session_time_out` 期限时，触发此事件。

- **_session_duration（会话时长）**：我们通过当前事件创建时间戳与会话的 `_session_start_timestamp` 相减来计算 `_session_duration`（会话时长）。在会话期间的每个事件中都会添加此属性。

- **session_time_out（会话超时）**：默认为 30 分钟，可以通过配置 API 进行自定义设置。

- **_session_number（会话数）**：不同会话 ID 的总会话数，每个事件的属性对象中都会出现 `_session_number`。

#### 用户参与度定义

在 Clickstream Web SDK 中，我们将 `user_engagement` 定义为网页至少在前台运行一秒钟。

- **何时发送**：当网页退到后台或导航到其他页面时，我们发送此事件。

- **engagement_time_msec**：我们计算从网页进入前台到网页进入后台的时间。

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
  "platform": "Web",
  "make": "Google Inc.",
  "locale": "zh_CN",
  "screen_height": 1080,
  "screen_width": 1920,
  "zone_offset": 28800000,
  "system_language": "zh",
  "country_code": "CN",
  "sdk_version": "0.2.0",
  "sdk_name": "aws-solution-clickstream-sdk",
  "host_name": "https://example.com",
  "app_id": "appId",
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
    "_channel": "SMS",
    "Successful": true,
    "Price": 120.1,
    "ProcessDuration": 791,
    "_session_id":"dc7a7a18-20221108-031926703",
    "_session_start_timestamp": 1667877566703,
    "_session_duration": 391809,
    "_session_number": 1,
    "_page_referrer": "https://example.com/index.html",
    "_page_referrer_title": "index",
    "_page_title": "login page",
    "_page_url": "https://example.com/login.html"
  }
}
```

所有用户属性都将存储在 `user` 对象中，所有自定义和全局属性都存储在 `attributes` 对象中。

#### 公共属性

| 属性              | 描述                         | 如何生成                                                                                                             | 用途和目的                   |
|-----------------|----------------------------|------------------------------------------------------------------------------------------------------------------|-------------------------|
| hashCode        | 事件对象的哈希码                   | 通过 `@aws-crypto/sha256-js` 库来计算                                                                                  | 区分不同的事件                 |
| app_id          | 点击流app id                  | 控制平面创建点击流应用程序时生成                                                                                                 | 区分不同app的事件              |
| unique_id       | 用户唯一id                     | sdk 第一次初始化时从 `uuidV4()` 生成<br> 当用户重新登录到另一个从未登录过的用户后，它会被更改，并且当用户在同一浏览器中重新登录到之前的用户时，unique_id 将重置为之前 用户的 unique_id | 标识不同用户的唯一性，并关联登录和未登录的行为 |
| device_id       | 浏览器唯一id                    | 网站首次打开时生成`uuidV4()`形式，然后uuid将存储在localStorage中, 并且不会修改                                                            | 区分不同设备                  |
| event_type      | 事件名称                       | 由开发者或SDK设置                                                                                                       | 区分不同的事件名称               |
| event_id        | 事件的唯一id                    | 事件创建时从 `uuidV4()` 生成                                                                                             | 区分每个事件                  |
| timestamp       | 事件创建时间戳                    | 事件创建时从 `new Date().getTime()` 生成                                                                                 | 数据分析需要                  |
| platform        | 平台名称                       | 对于浏览器一直是 `Web`                                                                                                   | 数据分析需要                  |
| make            | 浏览器制造商                     | 从`window.navigator.product`或`window.navigator.vendor` 生成                                                         | 数据分析需要                  |
| screen_height   | 屏幕高度（以像素为单位）               | 通过 `window.innerHeight` 生成                                                                                       | 数据分析需要                  |
| screen_width    | 屏幕宽度（以像素为单位）               | 通过 `window.innerWidth` 生成                                                                                        | 数据分析需要                  |
| zone_offset     | divce 与 GMT 的原始偏移量（以毫秒为单位） | 通过 `-currentDate.getTimezoneOffset()*60000` 生成                                                                   | 数据分析需要                  |
| locale          | 浏览器的默认区域设置（语言、国家/地区和变体）    | 通过 `window.navigator.language` 生成                                                                                | 数据分析需要                  |
| system_language | 浏览器本地语言                    | 通过 `window.navigator.language` 生成                                                                                | 数据分析需要                  |
| country_code    | 浏览器的国家/地区代码                | 通过 `window.navigator.language` 生成                                                                                | 数据分析需要                  |
| sdk_version     | 点击流SDK版本                   | 通过 `package.json` 生成                                                                                             | 数据分析需要                  |
| sdk_name        | Clickstream SDK 名称         | 一直是 `aws-solution-clickstream-sdk`                                                                               | 数据分析需要                  |
| host_name       | 网站主机名                      | 通过 `window.location.hostname` 生成                                                                                 | 数据分析需要                  |

#### 保留属性

**用户属性**

| 属性名称                        | 描述                                                 |
|-----------------------------|----------------------------------------------------|
| _user_id                    | 保留用于分配给应用程序的用户 ID                                  |
| _user_ltv_revenue           | 保留用于用户终身价值                                         |
| _user_ltv_currency          | 保留用于用户终身价值货币                                       |
| _user_first_touch_timestamp | 用户首次打开应用程序或访问站点的时间（以微秒为单位），在 `user` 对象的每个事件中都包含此属性 |

**事件属性**

| 属性名称                     | 描述                                                        |
|--------------------------|-----------------------------------------------------------|
| _traffic_source_medium   | 保留给流量媒介，使用此属性存储事件记录时获取用户的媒介，例如：电子邮件、付费搜索、搜索引擎             |
| _traffic_source_name     | 保留给流量名称，使用此属性存储事件记录时获取用户的营销活动，例如：夏季促销                     |
| _traffic_source_source   | 保留给流量来源，事件报告时获取的网络来源的名称，例如：Google, Facebook, Bing, Baidu  |
| _entrances               | 在 `_page_view` 事件中添加。会话中的第一个 `_page_view` 事件具有值 1，其他事件为 0 |
| _session_id              | 在所有事件中添加                                                  |
| _session_start_timestamp | 在所有事件中添加                                                  |
| _session_duration        | 在所有事件中添加                                                  |
| _session_number          | 在所有事件中添加，初始值为1，该值根据用户设备自动递增                               |
| _error_code              | `_clickstream_error` 事件的属性                                |
| _page_title              | 在所有事件中添加                                                  |
| _page_url                | 在所有事件中添加                                                  |
