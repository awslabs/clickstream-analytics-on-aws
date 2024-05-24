# Clickstream React Native SDK

## 简介

Clickstream React Native SDK 可以帮助您轻松地从移动设备收集和发送应用内事件到您配置的解决方案数据管道。

该 SDK 基于 [Clickstream Android SDK](./android.md) 和 [Clickstream Swift SDK](./swift.md) 构建。因此，React Native SDK
还支持自动收集常见的用户事件和属性（例如会话开始、首次打开）。 此外，我们还添加了易于使用的 API 来简化 React Native
应用程序中的数据收集。

### 平台支持

**Android**: 4.1（API 级别 16）及更高版本。

**iOS**: 13 及更高版本。

## 集成 SDK

### 1. 添加 SDK

```bash
npm install @aws/clickstream-react-native
```

完成后，你需要使用该如下命令来安装 iOS 的 CocoaPod 依赖库：

```bash
cd ios && pod install
```

### 2. 初始化 SDK

从点击流解决方案 Web 控制台复制配置代码，我们建议您将代码添加到您的应用程序中入口处，如 `index.js`，配置代码应如下所示。
在解决方案控制台中将应用程序注册到数据管道后，您还可以手动添加此代码段并替换 appId 和 endpoint 的值。

```javascript title="index.js"

import { ClickstreamAnalytics } from '@aws/clickstream-react-native';

ClickstreamAnalytics.init({
    appId: 'your appId',
    endpoint: 'https://example.com/collect',
});
```

!!! info "Important"

    - 您的 appId 和 endpoint 已在其中设置好了。我们只需要在应用程序启动后初始化一次 SDK。
    - 确保在应用程序的生命周期中尽早调用 `ClickstreamAnalytics.init`。 并确保调用其他 API 时 SDK 已初始化。
    - 我们可以使用 `const result = await ClickstreamAnalytics.init()` 来获取初始化结果的布尔值。

### 3. 开始使用

#### 记录事件

在需要记录事件的地方添加以下代码。

```typescript
import { ClickstreamAnalytics } from '@aws/clickstream-react-native';

// 记录带有属性的事件
ClickstreamAnalytics.record({
  name: 'button_click',
  attributes: {
    event_category: 'shoes',
    currency: 'CNY',
    value: 279.9,
  },
});

// 记录只带名称的事件
ClickstreamAnalytics.record({name: 'button_click'});
```

#### 添加全局属性
1. 在初始化 SDK 时添加全局属性。

    以下示例代码展示了如何在初始化 SDK 时添加 traffic source 相关字段作为全局属性。

    ```typescript
    import { ClickstreamAnalytics, Attr } from '@aws/clickstream-react-native';
    
    ClickstreamAnalytics.init({
       appId: "your appId",
       endpoint: "https://example.com/collect",
       globalAttributes:{
         [Attr.TRAFFIC_SOURCE_SOURCE]: 'amazon',
         [Attr.TRAFFIC_SOURCE_MEDIUM]: 'cpc',
         [Attr.TRAFFIC_SOURCE_CAMPAIGN]: 'summer_promotion',
         [Attr.TRAFFIC_SOURCE_CAMPAIGN_ID]: 'summer_promotion_01',
         [Attr.TRAFFIC_SOURCE_TERM]: 'running_shoes',
         [Attr.TRAFFIC_SOURCE_CONTENT]: 'banner_ad_1',
         [Attr.TRAFFIC_SOURCE_CLID]: 'amazon_ad_123',
         [Attr.TRAFFIC_SOURCE_CLID_PLATFORM]: 'amazon_ads',
         [Attr.APP_INSTALL_CHANNEL]: 'amazon_store',
       }
    });
    ```

2. 在初始化 SDK 后添加全局属性。
    ``` typescript
    import { ClickstreamAnalytics, Attr } from '@aws/clickstream-react-native';
    
    ClickstreamAnalytics.setGlobalAttributes({
      [Attr.TRAFFIC_SOURCE_MEDIUM]: "Search engine",
      level: 10,
    });
    ```

建议在初始化 SDK 时设置全局属性，设置后记录的所有事件都会包含全局属性。

#### 删除全局属性

``` typescript
ClickstreamAnalytics.deleteGlobalAttributes(['level','_traffic_source_medium']);
```

#### 登录和登出

```typescript
import { ClickstreamAnalytics } from '@aws/clickstream-react-native';

// 当用户登录成功后调用
ClickstreamAnalytics.setUserId("userId");

// 当用户退出登录时调用
ClickstreamAnalytics.setUserId(null);
```

#### 添加用户属性

```typescript
import { ClickstreamAnalytics } from '@aws/clickstream-react-native';

ClickstreamAnalytics.setUserAttributes({
  userName: "carl",
  userAge: 22
});
```

当前登录用户的属性会缓存在磁盘中，因此在下次 APP 打开时不需要再次设置所有的用户属性，当然您可以使用相同的
API `ClickstreamAnalytics.setUserAttributes()` 在当用户属性改变时来更新当前用户的属性。

!!! info "重要提示"

    如果您的应用已经上线，这时大部分用户已经登录过，则第一次接入 Clickstream SDK 时请手动设置一次用户属性，确保后续事件都带有用户属性。

#### 记录带有 Item 的事件

您可以添加以下代码来记录带有 Item 的事件，同时您可以在 `attributes` Map 中添加自定义 Item 属性。 除了预置属性外，一个 Item
最多可以添加 10 个自定义属性。

```typescript
import { ClickstreamAnalytics, Item, Attr } from '@aws/clickstream-react-native';

const itemBook: Item = {
  id: '123',
  name: 'Nature',
  category: 'book',
  price: 99,
  book_publisher: "Nature Research",
};
ClickstreamAnalytics.record({
  name: 'view_item',
  attributes: {
    [Attr.VALUE]: 99,
    [Attr.CURRENCY]: 'USD',
    event_category: 'recommended',
  },
  items: [itemBook],
});
```

要记录 Item 中的更多属性，请参阅 [Item 属性](android.md#item_1)。

!!! warning "重要提示"

    数据管道的版本需要在 v1.1 及以上才能够处理带有自定义属性的 Item。
    
    ITEM_ID 为必需字段，如果不设置，该 Item 将被丢弃。

#### 手动记录 Screen View 事件

默认情况下，当 Android Activity 触发 `onResume` 或 iOS ViewController 触发 `viewDidAppear` 时，SDK
会自动记录预置的 `_screen_view` 事件。

无论是否启用预置的 `_screen_view` 事件，您都可以手动记录屏幕浏览事件。添加以下代码以记录带有如下两个属性的 `_screen_view`
事件。

* `SCREEN_NAME` 必需字段，屏幕的名称。
* `SCREEN_UNIQUE_ID` 可选字段，设置为您组件的 id。如果不设置，SDK会以当前原生 Activity 或原生 ViewController 的 hashcode
  作为默认值。

```typescript
import { ClickstreamAnalytics } from '@aws/clickstream-react-native';

ClickstreamAnalytics.record({
  name: ClickstreamAnalytics.Event.SCREEN_VIEW,
  attributes: {
    [ClickstreamAnalytics.Attr.SCREEN_NAME]: 'HomeComponet',
    [ClickstreamAnalytics.Attr.SCREEN_UNIQUE_ID]: '123adf',
  },
});
```

#### 记录 React Navigation 的 Screen View 事件
此 [示例](https://github.com/aws-samples/clickstream-sdk-samples/pull/25/files#diff-96a74db413b2f02988e5537fdbdf4f307334e8f5ef3a9999df7de3c6785af75bR344-R397) 代码演示了 React Navigation 6.x 版本如何全局记录 `_screen_view` 事件。

对于其他版本的 React Navigation，你可以参考官方文档：[Screen tracking for analytics](https://reactnavigation.org/docs/screen-tracking/)

#### 实时发送事件

```typescript
import { ClickstreamAnalytics } from '@aws/clickstream-react-native';

ClickstreamAnalytics.flushEvents();
```

#### 其他配置项

除了必需的 `appId` 和 `endpoint` 之外，您还可以在 SDK 初始化时配置其他参数以满足更多定制化的使用：

```typescript
import { ClickstreamAnalytics } from '@aws/clickstream-react-native';

ClickstreamAnalytics.init({
  appId: 'your appId',
  endpoint: 'https://example.com/collect',
  isLogEvents: true,
  isCompressEvents: true,
  isTrackScreenViewEvents: false,
  isTrackUserEngagementEvents: true,
  isTrackAppExceptionEvents: true,
  sendEventsInterval: 15000,
  sessionTimeoutDuration: 1800000,
  authCookie: 'your auth cookie',
  globalAttributes: {
    _traffic_source_medium: 'Search engine',
  },
});
```

以下是每个参数的说明

| 参数名称                        | 是否必需	 | 默认值	    | 解释                                  |
|-----------------------------|-------|---------|-------------------------------------|
| appId                       | 是     | --      | 在解决方案控制平面中您应用程序的 ID                 |
| endpoint                    | 是     | --      | 您将事件上传到 Clickstream 摄取服务器的 URL 请求路径 |
| isLogEvents                 | 否     | false   | 是否自动打印事件 JSON 以调试事件，[了解更多](#_11)    |
| isCompressEvents            | 否     | true    | 上传事件时是否通过gzip压缩事件内容                 |
| isTrackScreenViewEvents     | 否     | true    | 是否自动记录 screen view（屏幕浏览） 事件         |
| isTrackUserEngagementEvents | 否     | true    | 是否自动记录 user engagement（用户参与） 事件     |
| isTrackAppExceptionEvents   | 否     | false   | 是否自动记录应用崩溃事件                        |
| sendEventsInterval          | 否     | 10000   | 事件发送间隔（毫秒）                          |
| sessionTimeoutDuration      | 否     | 1800000 | 会话超时时间（毫秒）                          |
| authCookie                  | 否     | --      | 您的 AWS 应用程序负载均衡器身份验证 cookie         |
| globalAttributes            | 否     | --      | 初始化SDK时的全局属性                        |

#### 更新配置

您可以在初始化 SDK 后更新默认配置，以下是您可以更新的配置参数。

```typescript
import { ClickstreamAnalytics } from '@aws/clickstream-react-native';

ClickstreamAnalytics.updateConfigure({
  appId: 'your appId',
  endpoint: 'https://example.com/collect',
  isLogEvents: true,
  authCookie: 'your auth cookie',
  isCompressEvents: true,
  isTrackScreenViewEvents: false,
  isTrackUserEngagementEvents: false,
  isTrackAppExceptionEvents: false,
});
```

#### 禁用 SDK

您可以根据需要禁用该SDK。禁用 SDK 后，SDK 将不会处理日志记录和发送任何事件。当然，当您需要继续记录事件时，您可以再次启用 SDK。

```javascript
import { ClickstreamAnalytics } from '@aws/clickstream-react-native';

// 禁用 SDK
ClickstreamAnalytics.disable();

// 启用 SDK
ClickstreamAnalytics.enable();
```

#### 调试事件

您可以按照以下步骤查看事件原始 JSON 并调试您的事件。

1. 初始化 SDK 时启用 `isLogEvents` 配置
   ```javascript
   import { ClickstreamAnalytics } from '@aws/clickstream-react-native';
   
   ClickstreamAnalytics.init({
     appId: 'your appId',
     endpoint: 'https://example.com/collect',
     isLogEvents: true,
   });
   ```

2. 配置 `isLogEvents:true` 后，当您记录事件时，您可以在 AndroidStudio 的 Logcat 或 Xcode 调试控制台中筛选 EventRecorder 看到事件原始
   JSON 内容。

## 数据格式定义

参考 [Web SDK 数据格式定义](./web.md#_11)

## 预置事件

Android: 参考 [Android SDK 预置事件](./android.md#_13)

iOS: 参考 [Swift SDK 预置事件](./swift.md#_13)

## 事件属性

Android: 参考 [Android SDK 事件属性](./android.md#_18)

iOS: 参考 [Swift SDK 事件属性](./swift.md#_18)

## SDK 更新日志

参考：[GitHub 更新日志](https://github.com/awslabs/clickstream-react-native/releases)

原生 SDK 版本依赖关系

| React Native SDK 版本 | Android SDK 版本 | Swift SDK 版本 |
|---------------------|----------------|--------------|
| 0.1.0 ~ 0.2.0       | 0.12.0         | 0.11.0       |

## 示例项目
集成 SDK 的示例 [React Native 项目](https://github.com/aws-samples/clickstream-sdk-samples/tree/main/react-native)

## 参考链接

[SDK 源码](https://github.com/awslabs/clickstream-react-native)

[SDK 问题](https://github.com/awslabs/clickstream-react-native/issues)
