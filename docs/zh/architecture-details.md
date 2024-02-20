{{ solution_name }} 有四个组件：Web 控制台、分析工作坊、软件开发工具包、以及用于摄取、处理、分析和可视化点击流数据的数据管道。

### Web 控制台

该解决方案提供了一个简单易用的 Web 控制台，允许您创建点击流项目，以及配置、创建和管理每个项目的数据管道。

### 分析工作坊

分析工作坊是一个统一的 Web 界面，供业务分析师或数据分析师查看和创建仪表板、查询和探索点击流数据以及管理元数据。它支持以下功能：

- 提供预先扫描的用户生命周期仪表板
- 提供探索性分析模型来查询和分析点击流数据
- 支持以拖放方式创建自定义分析和可视化
- 自动生成点击流数据的元数据，支持元数据管理

### 软件开发工具包

该解决方案提供原生软件开发工具包，可帮助您轻松地从应用程序收集应用内事件并将其报告到点击流管道。

- [Android 软件开发工具包][clickstream-andriod]
- [Swift 软件开发工具包][clickstream-swift]
- [Web 软件开发工具包][clickstream-web]
- [Flutter 软件开发工具包][clickstream-flutter]
- [微信小程序软件开发工具包][clickstream-wechat]

### 数据管道

此解决方案使用 Web 控制台来管理项目及其数据管道。数据管道由四个模块组成。

#### 摄取模块

摄取模块充当用于摄取点击流数据的 Web 服务器。它支持以下功能：

- 指定自动伸缩组功能
- 指定预热服务器池大小以更快地扩展并节省成本
- 支持使用 OIDC 进行身份验证
- 支持 SSL
- 支持启用适用于 ELB 的全球加速器
- 支持不同的数据缓冲区、S3、KDS 和 MSK

#### 数据处理模块

数据处理模块通过在 EMR 无服务器模式下运行的 Apache Spark 应用程序将采集的数据转换并丰富到解决方案的数据模型中。它支持以下功能：

- 指定数据处理的批处理间隔
- 指定数据刷新期限
- 提供开箱即用的数据加工插件
  - 提取用户代理属性，用于从 HTTP 请求头的用户代理字符串中解析操作系统、设备、浏览器信息
  - IP映射，可根据请求源 IP 映射设备位置信息（例如，城市、国家、地区）
- 支持第三方开发的数据格式转换插件
- 支持第三方开发的数据加工插件

#### 数据建模模块

数据建模模块将处理后的数据加载到数据湖中。它支持以下功能：

- 支持预配置的 Redshift 和 Redshift 无服务器作为数据仓库
  - 支持在 Redshift 中保留热数据的数据范围
  - 指定更新用户维度表的刷新时间间隔
- 支持使用 Athena 查询数据湖中的数据

#### 报表模块

报告模块创建与数据仓库的安全连接，并在商业智能 Amazon QuickSight 中配置开箱即用的仪表板。

[clickstream-swift]: https://github.com/awslabs/clickstream-swift
[clickstream-andriod]: https://github.com/awslabs/clickstream-android
[clickstream-web]: https://github.com/awslabs/clickstream-web
[clickstream-flutter]: https://github.com/awslabs/clickstream-flutter
[clickstream-wechat]: https://github.com/awslabs/clickstream-wechat
