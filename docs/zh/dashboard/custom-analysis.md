# 自定义报表
该解决方案的主要优势之一是您可以 100% 控制从您的应用程序和网站收集的点击流数据，您可以完全灵活地根据您的特定业务需求分析数据。
本文通过使用 Redshfit Serverless 作为分析引擎和 QuickSight 作为报表工具创建漏斗分析的示例来说明创建自定义报表的步骤。

## 步骤
创建自定义报表主要包括两部分，第一部分是在您的分析引擎中准备数据集，第二部分是在 QuickSight 中创建可视化。

### 第 1 部分 - 数据集准备

1. 打开 **Redshift Serverless 仪表板**
2. 单击解决方案创建的以“clickstream-<project-id>”开头的工作组。
3. 单击“查询数据”按钮，您将被定向到 Redshift 查询编辑器。
4. 在 Redshift 查询编辑器的“编辑器”视图中，右键单击名称为“clickstream-<project-id>”的工作组，在提示的下拉菜单中，选择“编辑连接”，您将被要求提供连接参数，按照此[指南](https://docs.aws.amazon.com/redshift/latest/mgmt/query-editor-v2-using.html){:target="_blank"} 使用适当的方法进行连接。

    !!! note "重要事项"
        
        您需要数据库（名称为`<project-id>`)的读写权限才能创建自定义视图或表。 例如，您可以使用管理员用户连接到集群或工作组，如果您不知道管理员用户的密码，可以在 Redshift 控制台中重置管理员密码（[了解更多](https://docs.aws.amazon.com/redshift/latest/mgmt/serverless-security .html){:target="_blank"})。 

5. 如果您是第一次访问查询编辑器，系统会提示您配置帐户，请点击**配置帐户**按钮打开查询编辑器。
6. 添加一个新的 SQL 编辑器，并确保您选择了正确的工作组和模式。
7. 为漏斗分析创建一个新视图。 在这个例子中，我们使用了下面的 SQL。
  
    ??? SQL command
        ```sql
        CREATE OR REPLACE VIEW notepad.clickstream_funnel_view as
        SELECT
        platform,
        COUNT(DISTINCT step1_id) AS login_users,
        COUNT(DISTINCT step2_id) AS add_button_click_users,
        COUNT(DISTINCT step3_id) AS note_create_users
        FROM (
        SELECT
            platform,
            user_pseudo_id AS step1_id,
            event_timestamp AS step1_timestamp, 
            step2_id,
            step2_timestamp,
            step3_id,
            step3_timestamp
        FROM
            notepad.ods_events
        LEFT JOIN (
        SELECT
            user_pseudo_id AS step2_id,
            event_timestamp AS step2_timestamp
        FROM
            notepad.ods_events
        WHERE
            event_name = 'add_button_click' )
        ON
            user_pseudo_id = step2_id
            AND event_timestamp < step2_timestamp
        LEFT JOIN (
        SELECT
            user_pseudo_id AS step3_id,
            event_timestamp AS step3_timestamp
        FROM
            notepad.ods_events
        WHERE
            event_name= 'note_create' )
        ON
            step3_id  = step2_id
            AND step2_timestamp < step3_timestamp
        WHERE
        event_name = 'user_login' )
        group by
        platform
        ```

8. 转到 QuickSight 控制台，单击“**Dataset**”（数据集），然后单击“**New dataset**”（新建数据集）。

9. 在 New Dataset 页面，点击 **Redshift Manual connect** 添加数据集，在提示的表单中填写以下参数。 
      - **Data source name**（数据源名称）: `clickstream-funnel-view-<project-id>`
      - **Connection type**（连接类型）: 选择“VPC 连接”/“Clickstream 管道的 VPC 连接 <project-id>”
      - **Database server**（数据库服务器）: 输入无服务器工作组的端点url，您可以在工作组控制台上找到。
      - **Port**（端口）: `5439`
      - **Database name**（数据库名称）: `<project-id>`
      - **User name**（用户名）: 您在前面的步骤中用于创建自定义视图的用户名
      - **Password**（密码）: 您在前面的步骤中用于创建自定义视图的用户的密码
10. 验证连接，如果正常，单击**Create data source**（创建数据源）按钮。
11. 选择来自 Redshift 的视图作为数据源 - "**clickstream_funnel_view**", 然后
    - Schema（模式）: 选择 `notepad` 
    - Tables（表）: 选择 `clickstream_funnel_view`
    
    !!! note "提示"
        
        系统会提示您选择“导入到SPICE”或“直接查询您的数据”，请选择“直接查询您的数据”。

    - 点击 **Edit/Preview data**（编辑/预览数据） 来预览你的数据, 确认数据后，单击右上角的 **PUBLISH & VISUALIZE**（发布并可视化）。

### 第 2 部分 - 在 QuickSight 中创建可视化

1. 系统会提示您为可视化选择布局，根据需要选择一个。
2. 点击屏幕左上角的“**+Add**”，然后点击“**Add visual**”（添加可视化）按钮。
3. 选择屏幕左下角的视觉类型，在本例中，选择**Vertical bar chart**（垂直条形图）。
4. 在 Field wells 中，选择 `platform`（平台） 作为 X 轴，选择 `login_user`、`add_button_click_users` 和 `note_create_users` 作为 Value。
5. 您现在可以将此分析发布为仪表板或继续对其进行格式化。 在此[链接](https://docs.aws.amazon.com/quicksight/latest/user/working-with-visuals.html){:target="_blank"}中了解有关 QuickSight 可视化的更多信息。
