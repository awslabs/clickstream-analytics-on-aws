# 分析

分析模块允许用户基于点击流数据集以拖放的方式创建和修改仪表板。它为用户提供了更大的灵活性，可以创建业务特定的指标和可视化。在以下情况下使用该模块：

- 创建在预设仪表板中未提供或在探索中不支持的仪表板。
- 对从探索分析保存的自定义仪表板进行更改，例如添加用于计算自定义指标的计算字段，调整可视类型等。
- 将点击流数据与外部数据集连接，例如将项目主数据添加到丰富点击流数据集。

## 访问分析

要访问分析，请按照以下步骤进行：

1. 转到 **AWS 控制台上的 Clickstream Analytics**，在 **导航栏** 中，单击 "**分析工作室**"，浏览器将打开一个新的选项卡。
2. 在分析工作室页面中，单击左侧导航面板中的 **分析** 图标。

## 工作原理
分析模块本质上是 QuickSight 的作者界面，您可以在其中拥有对所有 QuickSight 功能的管理访问权限，例如创建分析、添加或管理数据集、发布和共享仪表板。

!!! note "注意"

    只有具有 `管理员` 或 `分析师` 角色的用户才能访问此模块。

该解决方案自动为每个项目和应用添加了以下数据集：

| 数据集名称 | 描述 |
|-------------|------|
|Event_View_`app_name`_`project_name`| 包含所有公共事件参数的事件数据 |
|Event_Parameter_View_`app_name`_`project_name`| 包含所有私有事件参数的事件数据|
|User_Dim_View_`app_name`_`project_name`| 包含所有公共属性的用户数据|
|User_Attr_View_`app_name`_`project_name`| 包含所有私有（自定义）属性的用户数据|
|Session_View_`app_name`_`project_name`| 包含有关会话的度量和维度的数据|
|Device_View_`app_name`_`project_name`| 包含有关用户设备的信息的数据|
|Retention_View_`app_name`_`project_name`| 提供每个日期的总用户和返回用户的指标数据|
|Lifecycle_Weekly_View_`app_name`_`project_name`| 每周用户生命周期指标数据|
|Lifecycle_Daily_View_`app_name`_`project_name`| 每天用户生命周期指标数据|

要创建自定义分析，可以按照以下 QuickSight 文档准备数据并创建可视化：

1. [连接到数据](https://docs.aws.amazon.com/quicksight/latest/user/working-with-data.html)
2. [准备数据](https://docs.aws.amazon.com/quicksight/latest/user/preparing-data.html)
3. [可视化数据](https://docs.aws.amazon.com/quicksight/latest/user/working-with-visuals.html)
