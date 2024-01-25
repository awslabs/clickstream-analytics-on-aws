# 自定义报告

这个解决方案的一个关键优势是您对从您的应用程序和网站收集的点击流数据具有100%的控制权。您完全可以灵活地分析数据，以满足特定的业务需求。本文以使用Redshift Serverless作为分析引擎和QuickSight作为报告工具创建漏斗分析的示例来说明创建自定义报告的步骤。

## 步骤

创建自定义报告主要包括两个部分，第一部分是在您的分析引擎中准备数据集，第二部分是在QuickSight中创建可视化。

### 第一部分 - 数据集准备

1. 打开**Redshift Serverless dashboard**
2. 点击以`clickstream-<project-id>`开头的工作组，该工作组由解决方案创建。
3. 点击`Query data`按钮，您将被引导到Redshift Query Editor。
4. 在Redshift Query Editor的编辑器视图中，右键单击名为`clickstream-<project-id>`的工作组。在弹出的下拉菜单中，选择`Edit connection`，您将被要求提供连接参数。请按照这个[guide](https://docs.aws.amazon.com/redshift/latest/mgmt/query-editor-v2-using.html){:target="_blank"}使用适当的方法连接。

    !!! info "重要"

        您将需要对数据库（名称为`<project-id>`）具有读写权限，以创建自定义视图或表。例如，您可以使用Admin用户连接到集群或工作组。如果您不知道Admin用户的密码，您可以在Redshift控制台中重置Admin用户的密码（[了解更多](https://docs.aws.amazon.com/redshift/latest/mgmt/serverless-security.html){:target="_blank"}）。

5. 如果这是您第一次访问查询编辑器，系统将提示您配置帐户，请单击**Config account**按钮以打开查询编辑器。
6. 添加一个新的SQL编辑器，并确保选择了正确的工作组和模式。
7. 为漏斗分析创建一个新的视图。在这个例子中，我们使用了下面的SQL。

    ??? example "SQL Commands"
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

8. 转到QuickSight控制台，点击'**Dataset**'，然后点击'**New dataset**'。

9. 在New Dataset页面，点击**Redshift Manual connect**以添加数据集，使用以下参数填写弹出的表单。
      - **数据源名称**：`clickstream-funnel-view-<project-id>`
      - **连接类型**：选择`VPC连接` / `VPC Connection for Clickstream pipeline <project-id>`
      - **数据库服务器**：输入服务器less工作组的端点URL，您可以在工作组控制台上找到它。
      - **端口**：`5439`
      - **数据库名称**：`<project-id>`
      - **用户名**：您用于在前面的步骤中创建自定义视图的用户的名称
      - **密码**：您用于在前面的步骤中创建自定义视图的用户的密码
10. 验证连接，如果正常，请点击**Create data source**按钮。
11. 选择Redshift中的视图作为数据源 - "**clickstream_funnel_view**"，然后
    - 模式：选择`notepad` 
    - 表：`clickstream_funnel_view`

    !!! tip "提示"

        您将被提示选择`导入到SPICE`或`直接查询数据`，请选择`直接查询您的数据`。

    - 点击**Edit/Preview data**以预览数据，一旦熟悉了数据，点击右上角的**PUBLISH & VISUALIZE**。

### 第二部分 - 在QuickSight中创建可视化

1. 您将被提示为可视化选择布局，请根据需要选择一个。
2. 点击屏幕左上角的“**+Add**”，然后点击“**Add visual**”按钮。
3. 在屏幕左下角选择一个视觉类型，在这个例子中选择**垂直条形图**。
4. 在字段井中，选择`platform`作为X轴，`login_user`，`add_button_click_users`和`note_create_users`作为值。
5. 现在您可以将此分析发布为仪表板，或继续格式化它。在这个[链接](https://docs.aws.amazon.com/quicksight/latest/user/working-with-visuals.html){:target="_blank"}中了解有关QuickSight可视化的更多信息。

### 第三部分 - 将自定义仪表板添加到 Clickstream Analytic Studio

要使您的自定义分析显示在Clickstream Analytics Studio的仪表板模块中，您需要将仪表板添加到该解决方案预先创建的名为`<project_id>_<app_id>`的共享文件夹中。

将自定义仪表板添加到共享文件夹后，它将自动显示在点击流分析工作室中的仪表板中。
