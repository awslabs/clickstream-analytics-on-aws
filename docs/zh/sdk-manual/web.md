# Clickstream Web SDK

## 介绍

Clickstream Web SDK 可以帮助您轻松将Web网站里的点击流数据发送到您配置的解决方案数据管道。

该 SDK 基于 amplify-js SDK核心库，按照amplify-js SDK插件规范开发。此外，该 SDK 还配备了自动收集常见用户事件和属性（例如页面浏览、首次打开）的功能，以简化用户的数据收集。

## 集成 SDK

### 初始化 SDK

!!! note ""
    === "使用 NPM"
        1.安装 SDK

        ```bash
        npm install @aws/clickstream-web
        ```
    
        2.初始化 SDK
        
        使用前需要配置SDK默认信息。从点击流解决方案 Web 控制台复制初始化代码，我们建议您将代码添加到应用程序的入口处，例如 React 中的`index.js/app.tsx`或 Vue/Angular 中的`main.ts`，初始化代码如下所示:
    
        ```typescript
        import { ClickstreamAnalytics } from '@aws/clickstream-web';
    
        ClickstreamAnalytics.init({
           appId: "your appId",
           endpoint: "https://example.com/collect",
        });
        ```
    
        您的 `appId` 和 `endpoint` 已经设置好了, 在 Clickstream Analytics 解决方案控制台中将应用程序注册到数据管道后，您还可以手动添加此代码段并替换 appId 和 endpoint 的值。
    
    === "使用 JS 文件"
        1.在 [GitHub](https://github.com/awslabs/clickstream-web/releases) 版本发布页面的附件中下载 `clickstream-web.min.js`文件，然后拷贝到您的项目中。
        
        2.将以下初始代码添加到`index.html`中。
    
        ```html
        <script src="clickstream-web.min.js"></script>
        <script>
            window.ClickstreamAnalytics.init({
                appId: 'your appId',
                endpoint: 'https://example.com/collect',
            })
        </script>
        ```
    
        您可以在 Clickstream 解决方案控制台应用程序的详情信息页面中找到 `appId` 和 `endpoint` 。
        
        如果您要延迟加载 SDK，请在 `<script>` 标签中使用 `async` 属性，并将`ClickstreamAnalytics.init()` 方法放在 `window.onload `或 `DOMContentLoaded` 之后。


### 开始使用

#### 记录事件

在需要报告事件的位置添加以下代码。

```typescript
import { ClickstreamAnalytics } from '@aws/clickstream-web';

// 记录带属性的事件
ClickstreamAnalytics.record({
  name: 'button_click',
  attributes: { 
    category: 'shoes', 
    currency: 'CNY',
    value: 279.9,
  }
});

//记录只带有事件名的事件
ClickstreamAnalytics.record({ name: 'button_click' });
```

#### 添加全局属性
1. 在 SDK 初始化时添加全局属性。
   ```typescript
   ClickstreamAnalytics.init({
      appId: "your appId",
      endpoint: "https://example.com/collect",
      globalAttributes:{
        _traffic_source_medium: "Search engine",
        _traffic_source_name: "Summer promotion",
      }
   });
   ```

2. 在 SDK 初始化完成后添加全局属性。
   ``` typescript
   ClickstreamAnalytics.setGlobalAttributes({
     _traffic_source_medium: "Search engine",
     level: 10,
   });
   ```

建议在 SDK 初始化时添加全局属性，全局属性将会出现在其设置后生成的每一个事件中。您也可以通过设置全局属性的值为 `null` 从而删除某个全局属性。

#### 登录和登出

```typescript
import { ClickstreamAnalytics } from '@aws/clickstream-web';

// 当用户登录成功后调用
ClickstreamAnalytics.setUserId("1234");

// 当用户退出登录时调用
ClickstreamAnalytics.setUserId(null);
```

#### 添加用户属性

```typescript
ClickstreamAnalytics.setUserAttributes({
  userName:"carl",
  userAge: 22
});
```

当前登录用户的属性会缓存在 `localStorage` 中，因此在下次浏览器打开时不需要再次设置所有的用户属性，当然您可以使用相同的 API `ClickstreamAnalytics.setUserAttributes()` 在当用户属性改变时来更新当前用户的属性。

!!! info "重要提示"

    如果您的应用已经上线，这时大部分用户已经登录过，则第一次接入Clickstream SDK时请手动设置一次用户属性，确保后续事件都带有用户属性。


#### 记录带有 Item 的事件

您可以添加以下代码来记录带有 Item 的事件。

```typescript
import { ClickstreamAnalytics, Item } from '@aws/clickstream-web';

const itemBook: Item = {
  id: '123',
  name: 'Nature',
  category: 'book',
  price: 99,
  book_publisher: 'Nature Research',
};

ClickstreamAnalytics.record({
  name: 'view_item',
  attributes: {
    currency: 'USD',
    event_category: 'recommended',
  },
  items: [itemBook],
});
```

要记录 Item 中的更多属性，请参阅 [Item 属性](#item_1).

!!! warning "重要提示"

    数据管道的版本需要在 v1.1 及以上才能够处理带有自定义属性的 Item。

    ITEM_ID 为必需字段，如果不设置，该 Item 将被丢弃。

#### 在批处理模式时发送实时事件

当您处于批处理模式时，您仍然可以通过将 `isImmediate `属性设置为 `true` 来立即发送事件，代码如下：

```typescript
import { ClickstreamAnalytics } from '@aws/clickstream-web';

ClickstreamAnalytics.record({
  name: 'button_click',
  isImmediate: true,
});
```

#### 其他配置项

除了必需的 `appId` 和 `endpoint` 之外，您还可以配置其他参数以满足更多定制化的使用：

```typescript
import { ClickstreamAnalytics, SendMode, PageType } from '@aws/clickstream-web';

ClickstreamAnalytics.init({
   appId: "your appId",
   endpoint: "https://example.com/collect",
   sendMode: SendMode.Batch,
   sendEventsInterval: 5000,
   isTrackPageViewEvents: true,
   isTrackUserEngagementEvents: true,
   isTrackClickEvents: true,
   isTrackSearchEvents: true,
   isTrackScrollEvents: true,
   pageType: PageType.SPA,
   isLogEvents: false,
   authCookie: "your auth cookie",
   sessionTimeoutDuration: 1800000,
   searchKeyWords: ['product', 'class'],
   domainList: ['example1.com', 'example2.com'],
});
```

以下是每个参数的说明

| 参数名称                        | 是否必需 | 默认值       | 解释                                                                                            |
|-----------------------------|------|-----------|-----------------------------------------------------------------------------------------------|
| appId                       | 是    | --        | 在解决方案控制平面中您应用程序的 ID                                                                           |
| endpoint                    | 是    | --        | 您将事件上传到 Clickstream 摄取服务器的URL请求路径                                                             |
| sendMode                    | 否    | Immediate | 发送事件的两种模式 `Immediate` (立即发送)和 `Batch`（批量发送）                                                   |
| sendEventsInterval          | 否    | 5000      | 事件发送间隔毫秒数，仅在`Batch`（批量发送）模式时生效                                                                |
| isTrackPageViewEvents       | 否    | true      | 是否自动记录 page view（页面浏览） 事件                                                                     |
| isTrackUserEngagementEvents | 否    | true      | 是否自动记录 user engagement（用户参与） 事件                                                               |
| isTrackClickEvents          | 否    | true      | 是否自动记录 click（点击） 事件                                                                           |
| isTrackSearchEvents         | 否    | true      | 是否自动记录 search（搜索） 事件                                                                          |
| isTrackScrollEvents         | 否    | true      | 是否自动记录 scroll（页面滚动） 事件                                                                        |
| pageType                    | 否    | SPA       | 网站类型，`SPA`表示单页面应用程序，`multiPageApp`表示多页面应用程序。 仅当属性 `sTrackPageViewEvents` 的值为 `true` 时，此属性才起作用 |
| isLogEvents                 | 否    | false     | 是否在控制台打印事件json内容以进行调试                                                                         |
| authCookie                  | 否    | --        | 您的AWS ALB（应用程序负载均衡器）身份验证的 cookie                                                              |
| sessionTimeoutDuration      | 否    | 1800000   | 会话超时的时长（毫秒）                                                                                   |
| searchKeyWords              | 否    | --        | 自定义的关键字用于触发`_search`事件，默认情况下我们检测查询参数中的`q`，`s`，`search`，`query`和`keyword`                      |
| domainList                  | 否    | --        | 如果您的网站跨多个域名，您可以自定义域名列表。 当链接指向不属于您配置的域名网站时，`_click ` 事件的 `_outbound  `属性将为 ` true`             |

#### 更新配置

您可以在初始化 SDK 后更新默认配置，以下是您可以更新的配置参数。

```typescript
import { ClickstreamAnalytics } from '@aws/clickstream-web';

ClickstreamAnalytics.updateConfigure({
  isLogEvents: true,
  authCookie: 'your auth cookie',
  isTrackPageViewEvents: false,
  isTrackUserEngagementEvents: false,
  isTrackClickEvents: false,
  isTrackScrollEvents: false,
  isTrackSearchEvents: false,
});
```

#### 调试事件

您可以按照以下步骤查看事件原始 json 并调试您的事件。

1. 使用 `ClickstreamAnalytics.init()` API 并在调试模式下将 `isLogEvents` 属性设置为 true。
2. 集成 SDK 并在浏览器中启动 Web 应用程序，然后打开检查页面并切换到控制台选项卡。
3. 在 Filter 中输入 `EventRecorder`，您将看到 Clickstream Web SDK 记录的所有事件的 json 内容。

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

| 名称                | 建议           | 硬限制          | 超过限制的处理策略                               | 错误码  |
|-------------------|--------------|--------------|-----------------------------------------|------|
| 事件名称合规            | --           | --           | 丢弃该事件，打印日志并记录`_clickstream_error`事件     | 1001 |
| 事件名称长度            | 25 个字符以下     | 50 个字符       | 丢弃该事件，打印日志并记录`_clickstream_error`事件     | 1002 |
| 事件属性名称的长度         | 25 个字符以下     | 50 个字符       | 丢弃该属性、打印日志并在事件属性中记录错误                   | 2001 |
| 属性名称合规            | --           | --           | 丢弃该属性、打印日志并在事件属性中记录错误                   | 2002 |
| 事件属性值的长度          | 少于 100 个字符   | 1024 个字符     | 丢弃该属性、打印日志并在事件属性中记录错误                   | 2003 |
| 每个事件的事件属性         | 50 属性以下      | 500 event 属性 | 丢弃超过限制的属性、打印日志并在事件属性中记录错误               | 2004 |
| 用户属性数             | 25岁以下属性      | 100个用户属性     | 丢弃超过限制的属性、打印日志并记录`_clickstream_error`事件 | 3001 |
| 用户属性名称的长度         | 25 个字符以下     | 50 个字符       | 丢弃该属性、打印日志并记录`_clickstream_error`事件     | 3002 |
| 用户属性名称合规          | --           | --           | 丢弃该属性、打印日志并记录`_clickstream_error`事件     | 3003 |
| 用户属性值的长度          | 50 个字符以下     | 256 个字符      | 丢弃该属性、打印日志并记录`_clickstream_error`事件     | 3004 |
| 事件中 Item 的个数      | 50 个 Item 以下 | 100 个 Item   | 丢弃超出限制的 Item，打印错误日志并在事件属性中记录错误          | 4001 |
| Item 属性值的长度       | 少于 100 个字符   | 256 个字符      | 丢弃超出限制的 Item，打印错误日志并在事件属性中记录错误          | 4002 |
| 一个 Item 中自定义属性的个数 | 少于 10 个自定义属性 | 10 个自定义属性    | 丢弃超出限制的 Item，打印错误日志并在事件属性中记录错误          | 4003 |
| Item 属性名的长度       | 25 个字符以下     | 50 个字符       | 丢弃超出限制的 Item，打印错误日志并在事件属性中记录错误          | 4004 |
| Item 属性名称合规       | --           | --           | 丢弃超出限制的 Item，打印错误日志并在事件属性中记录错误          | 4005 |



!!! info "重要提示"

    - 字符限制适用于单宽字符语言（如英语）和双宽字符语言（如中文）。
    - 事件属性数包括事件中的预设属性。
    - 如果多次添加相同名称的属性或用户属性，则值将被最后一个值覆盖。
    - 超过限制的所有错误都会在事件attributes里记录 `_error_code` 和 `_error_message` 这两个字段。

## 预置事件

### 自动收集的事件

| 事件名                | 触发时机                                                                                    | 事件属性                                                                                                                                                                                              |
|--------------------|-----------------------------------------------------------------------------------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| _first_open        | 用户在一个浏览器中第一次打开网站                                                                        |                                                                                                                                                                                                   |
| _session_start     | 当用户首次访问该网站或用户离开网站30 分钟后返回该网站时，[了解更多](#_16)                                              | 1. _session_id <br>2. _session_start_timestamp                                                                                                                                                    |
| _page_view         | 当新页面打开时，[了解更多](#_17)                                                                    | 1. _page_referrer<br/>2. _page_referrer_title<br/>3. _entrances<br/>4. _previous_timestamp<br/>5. _engagement_time_msec                                                                           |
| _user_engagement   | 当用户离开当前页面，并且该页面处于焦点超过一秒时，[了解更多](#_18)                                                   | 1 ._engagement_time_msec<br>                                                                                                                                                                      |
| _app_start         | 每次浏览器从不可见到进入可见状态时                                                                       | 1. _is_first_time（当应用程序启动后第一个`_app_start`事件时，值为`true`）                                                                                                                                            |
| _app_end           | 每次浏览器从可见到进入不可见状态时                                                                       |                                                                                                                                                                                                   |
| _profile_set       | 当调用 `addUserAttributes()` 或 `setUserId()` API 时                                         |                                                                                                                                                                                                   |
| _scroll            | 用户第一次到达每个页面的底部时（即当 90% 的垂直深度变得可见时）                                                      | 1. _engagement_time_msec                                                                                                                                                                          |
| _search            | 每次用户执行站点搜索时，根据 URL 查询参数的存在来判断，默认情况下，我们在查询参数中检测 `q`, `s`, `search`, `query` 和 `keyword`。 | 1. _search_key (搜索参数名称)<br>2. _search_term (搜索内容)                                                                                                                                                 |
| _click             | 每次用户单击将其带离当前域名（或配置的域名列表）的链接时                                                            | 1. _link_classes（标签 `<a>`中`class`里的内容）<br>2. _link_domain（标签 `<a>`中`herf`里的域名）<br>3. _link_id（标签 `<a>`中`id`里的内容）<br>4. _link_url（标签 `<a>`中`herf`里的内容）<br>5. _outbound（如果该域不在配置的域名列表中，则属性值为“true”） |
| _clickstream_error | event_name 不合规或用户属性不合规时                                                                 | 1. _error_code <br>2. _error_message                                                                                                                                                              |

### 会话定义

在 Clickstream Web SDK 中，我们不限制会话的总时间，只要浏览器下次进入和最后一次退出之间的时间在允许的超时时间内，我们就认为当前会话是连续的。

当网站第一次打开，或者浏览器打开到前台与最后一次退出之间的时间超过了session_time_out时，会触发`_session_start`事件，以下是session相关的属性。

1. _session_id：我们通过uniqueId的后8个字符和当前毫秒值拼接来计算会话id，例如：dc7a7a18-20230905-131926703
2. _session_duration：我们通过减去当前事件创建时间戳和会话的`_session_start_timestamp`来计算会话持续时间，该属性将添加到会话期间的每个事件中。
3. _session_number：当前浏览器中session的自增数，初始值为1
4. 会话超时时间：默认为 30 分钟，可以通过[configuration](#_7) API 自定义。

### 页面浏览定义

在 Clickstream Web SDK 中，我们将`_page_view`（页面浏览）定义为记录用户浏览页面路径的事件，当页面切换开始时，满足以下任何条件时将记录`_page_view`事件：

1. 之前没有设置过页面。
2. 新的页面标题与之前的页面标题不同。
3. 新的页面 url 与之前的页面 url 不同。

该事件监听 history 中的`pushState`、`popState`以及 window 的`replaceState `来判断并触发页面的跳转。为了统计页面浏览路径，我们使用 `_page_referrer`（上个页面 url）和 `page_referrer_title` 来跟踪前一个页面。 此外，页面浏览事件中还有一些其他属性。

1. _entrances：当前会话中第一个页面浏览事件值为1，其他页面浏览事件值为0。
2. _previous_timestamp：上一个 `_page_view ` 事件的时间戳。
3. _engagement_time_msec：上个页面最后一次用户参与时长的毫秒数。

当页面进入不可见状态超过 30 分钟再打开时，将生成新的会话并清除之前的页面url，然后发送新的 `_page_view` 事件。

### 用户参与度定义

在 Clickstream Web SDK 中，我们将 _user_engagement 定义为记录用户浏览页面时长的事件，该事件仅在用户离开当前页面且在该页面停留至少一秒时发送。

我们定义用户在以下情况下离开页面。

1. 当用户导航到当前域名下的另一个页面时。

2. 当用户点击将其带离当前域名的链接时。
3. 当用户点击浏览器另一个选项卡或最小化当前浏览器窗口时。
4. 当用户关闭网站选项卡或关闭浏览器应用程序时。

**engagement_time_msec**：我们计算从当前页面可见到用户离开当前页面的时长（单位毫秒）。

## 事件属性

### 事件结构示例

```json
{
	"unique_id": "c84ad28d-16a8-4af4-a331-f34cdc7a7a18",
	"event_type": "add_to_cart",
	"event_id": "460daa08-0717-4385-8f2e-acb5bd019ee7",
	"timestamp": 1667877566697,
	"device_id": "f24bec657ea8eff7",
	"platform": "Web",
	"make": "Google Inc.",
	"locale": "zh_CN",
	"screen_height": 1080,
	"screen_width": 1920,
    "viewport_height": 980,
    "viewport_width": 1520,
	"zone_offset": 28800000,
	"system_language": "zh",
	"country_code": "CN",
	"sdk_version": "0.2.0",
	"sdk_name": "aws-solution-clickstream-sdk",
	"host_name": "https://example.com",
	"app_id": "appId",
	"items": [{
		"id": "123",
		"name": "Nike",
		"category": "shoes",
		"price": 279.9
	}],
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
		"_latest_referrer": "https://amazon.com/s?k=nike",
		"_latest_referrer_host": "amazon.com",
		"_page_title": "index",
		"_page_url": "https://example.com/index.html"
	}
}
```

所有用户属性都将存储在 `user` 对象中，所有自定义性都存储在 `attributes` 对象中。

### 公共属性

| 属性              | 数据类型    | 描述                        | 如何生成                                                                                                             | 用途和目的                     |
|-----------------|---------|---------------------------|------------------------------------------------------------------------------------------------------------------|---------------------------|
| app_id          | string  | 点击流app id                 | 控制平面创建点击流应用程序时生成                                                                                                 | 区分不同app的事件                |
| unique_id       | string  | 用户唯一id                    | sdk 第一次初始化时从 `uuidV4()` 生成<br> 当用户重新登录到另一个从未登录过的用户后，它会被更改，并且当用户在同一浏览器中重新登录到之前的用户时，unique_id 将重置为之前 用户的 unique_id | 标识不同用户的唯一性，并关联登录和未登录用户的行为 |
| device_id       | string  | 浏览器唯一id                   | 网站首次打开时生成`uuidV4()`形式，然后uuid将存储在localStorage中, 并且不会修改                                                            | 区分不同设备                    |
| event_type      | string  | 事件名称                      | 由开发者或SDK设置                                                                                                       | 区分不同的事件名称                 |
| event_id        | string  | 事件的唯一id                   | 事件创建时从 `uuidV4()` 生成                                                                                             | 区分每个事件                    |
| timestamp       | number  | 事件创建时的时间戳                 | 事件创建时从 `new Date().getTime()` 生成，单位：毫秒                                                                           | 数据分析需要                    |
| platform        | string  | 平台名称                      | 对于浏览器一直是 `Web`                                                                                                   | 数据分析需要                    |
| make            | string  | 浏览器制造商                    | 从`window.navigator.product`或`window.navigator.vendor` 生成                                                         | 数据分析需要                    |
| screen_height   | number  | 屏幕高度（以像素为单位）              | 通过 `window.screen.height` 生成                                                                                     | 数据分析需要                    |
| screen_width    | number  | 屏幕宽度（以像素为单位）              | 通过 `window.screen.width` 生成                                                                                      | 数据分析需要                    |
| viewport_height | number  | 视区高度（以像素为单位）              | 通过 `window.innerHeight` 生成                                                                                       | 数据分析需要                    |
| viewport_width  | number  | 视区宽度（以像素为单位）              | 通过 `window.innerWidth` 生成                                                                                        | 数据分析需要                    |
| zone_offset     | number  | device 与 GMT 的原始偏移量（以毫秒为单位） | 通过 `-currentDate.getTimezoneOffset()*60000` 生成                                                                   | 数据分析需要                    |
| locale          | string  | 浏览器的默认区域设置（语言、国家/地区和变体）   | 通过 `window.navigator.language` 生成                                                                                | 数据分析需要                    |
| system_language | string  | 浏览器本地语言                   | 通过 `window.navigator.language` 生成                                                                                | 数据分析需要                    |
| country_code    | string  | 浏览器的国家/地区代码               | 通过 `window.navigator.language` 生成                                                                                | 数据分析需要                    |
| sdk_version     | string  | 点击流SDK版本                  | 通过 `package.json` 生成                                                                                             | 数据分析需要                    |
| sdk_name        | string  | Clickstream SDK 名称        | 一直是 `aws-solution-clickstream-sdk`                                                                               | 数据分析需要                    |
| host_name       | string  | 网站主机名                     | 通过 `window.location.hostname` 生成                                                                                 | 数据分析需要                    |

### 用户属性

| 属性名称                        | 描述                                                 |
|-----------------------------|----------------------------------------------------|
| _user_id                    | 保留用于分配给应用程序的用户 ID                                  |
| _user_ltv_revenue           | 保留用于用户终身价值                                         |
| _user_ltv_currency          | 保留用于用户终身价值货币                                       |
| _user_first_touch_timestamp | 用户首次打开应用程序或访问站点的时间（以毫秒为单位），在 `user` 对象的每个事件中都包含此属性 |

### 事件属性

| 属性名称                     | 数据类型    | 描述                                                        |
|--------------------------|---------|-----------------------------------------------------------|
| _traffic_source_medium   | string  | 保留给流量媒介，使用此属性存储事件记录时获取用户的媒介，例如：电子邮件、付费搜索、搜索引擎             |
| _traffic_source_name     | string  | 保留给流量名称，使用此属性存储事件记录时获取用户的营销活动，例如：夏季促销                     |
| _traffic_source_source   | string  | 保留给流量来源，事件报告时获取的网络来源的名称，例如：Google, Facebook, Bing, Baidu  |
| _entrances               | string  | 在 `_page_view` 事件中添加。会话中的第一个 `_page_view` 事件具有值 1，其他事件为 0 |
| _session_id              | string  | 在所有事件中添加                                                  |
| _session_start_timestamp | number  | 在所有事件中添加，单位：毫秒                                            |
| _session_duration        | number  | 在所有事件中添加，单位：毫秒                                            |
| _session_number          | number  | 在所有事件中添加                                                  |
| _page_title              | string  | 在所有事件中添加                                                  |
| _page_url                | string  | 在所有事件中添加                                                  |
| _latest_referrer         | string  | 在所有事件中添加，最近一次站外链接                                         |
| _latest_referrer_host    | string  | 在所有事件中添加，最近一次站外域名                                         |

### Item 属性

| 属性名           | 数据类型     | 是否必需 | 描述        |
|---------------|----------|------|-----------|
| id            | string   | 是    | item的id   |
| name          | string   | 否    | item的名称   |
| brand         | string   | 否    | item的品牌   |
| currency      | string   | 否    | item的货币   |
| price         | number   | 否    | item的价格   |
| quantity      | string   | 否    | item的数量   |
| creative_name | string   | 否    | item的创意名称 |
| creative_slot | string   | 否    | item的创意槽  |
| location_id   | string   | 否    | item的位置id |
| category      | string   | 否    | item的类别   |
| category2     | string   | 否    | item的类别2  |
| category3     | string   | 否    | item的类别3  |
| category4     | string   | 否    | item的类别4  |
| category5     | string   | 否    | item的类别5  |

您可以使用上面预置的 Item 属性，当然您也可以为 Item 添加自定义属性。 除了预置属性外，一个 Item 最多可以添加 10 个自定义属性。

## 在 Google Tag Manager 中集成

1. 从 SDK [发布页面]((https://github.com/awslabs/clickstream-web/releases))下载 Clickstream SDK Google Tag Manager 模板文件（.tpl）。

2. 请参考 Google Tag Manager [导入指南](https://developers.google.com/tag-platform/tag-manager/templates#export_and_import)，按照说明在您的标签管理器控制台将 .tpl 文件作为自定义模板导入。

3. 查看[使用新标签](https://developers.google.com/tag-platform/tag-manager/templates#use_your_new_tag)并将 ClickstreamAnalytics 标签添加到您的容器中。

4. ClickstreamAnalytics 标签目前支持四种标签类型： 
     * Initialize SDK
     * Record Custom Event
     * Set User ID
     * Set User Attribute

!!! info "重要提示"
   
    请确保在使用其他 ClickstreamAnalytics 标签类型之前先使用 Initialize SDK 标签对 SDK 进行初始化。

## SDK更新日志

参考：[GitHub 更新日志](https://github.com/awslabs/clickstream-web/releases)

## 示例项目
集成 SDK 的示例 [Web 项目](https://github.com/aws-samples/clickstream-sdk-samples/tree/main/web)

## 参考链接

[SDK 源码](https://github.com/awslabs/clickstream-web)

[SDK 问题](https://github.com/awslabs/clickstream-web/issues)
