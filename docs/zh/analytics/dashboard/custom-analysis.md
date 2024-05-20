# 自定义报告
该解决方案的关键优势之一是您可以完全控制从应用程序和网站收集的点击流数据。这使您能够根据特定的业务需求来分析数据。

您有两种选择来创建自定义分析。以下示例将指导您完成详细步骤。

## 选项1 - 使用预设的QuickSight数据集创建自定义分析。
该解决方案已创建了一个`Event_View-<app>-<project>`数据集,其中存储了所有原始事件数据,包括常用和自定义维度,并与QuickSight中的用户属性和会话属性相结合,您可以使用此数据集根据特定需求创建自定义分析。

例如,假设您有一个自定义事件`view_item`,用于记录用户查看商品的详细页面事件。此自定义事件具有一个自定义属性`event_category`,用于跟踪用户从哪个促销位置进入商品的详细页面。现在,您想创建一个饼图来显示导致用户查看项目详细页面的各个event_category百分比的自定义分析。

1. 转到{{solution_name}}网页控制台的Analyze模块。
2. 单击右上角的"新建分析"按钮。
3. 选择`Event_View-<app>-<project>`数据集。
4. 单击"用于分析"按钮。
5. 由于`event_category`是`view_item`事件的自定义参数,因此我们需要从JSON字符串`custom_parameters_json_str`字段中提取它,我们可以使用[**parseJSON**](https://docs.aws.amazon.com/quicksight/latest/user/parseJson-function.html)函数从中提取值。单击"+计算字段"按钮以添加计算字段。
6. 输入"事件类别"作为计算字段的名称,输入`parseJson({custom_parameters_json_str}, "$.event_category")`作为公式,然后单击"保存"按钮。
7. 现在您返回到分析作者控制台,您可以在数据面板中看到一个名为"事件类别"的新字段。
8. 在可视化面板中,单击"+添加"按钮,并选择饼图。
9. 将"事件类别"字段拖到"分组/颜色",将"event_id"拖到"值"。
10. 在筛选器面板中,添加一个筛选器,仅包括`event_name`等于`view_item`。
11. 现在您应该能看到一个条形图,显示导致`view_item`事件的每个event_category的百分比。
12. 您可以根据需要格式化分析,然后将其发布为仪表板。
13. 要使您的自定义分析显示在Clickstream Analytics Studio的"仪表板"模块中,您需要将仪表板添加到由解决方案预先创建的名为`<project-id>_<app_id>`的共享文件夹中。将自定义仪表板添加到共享文件夹后,它将自动显示在Clickstream Analytics Studio中。

## 选项2 - 在Redshift中创建自定义视图并导入到QuickSight

创建自定义报告主要包括两个部分,第一部分是在分析引擎中准备数据集,第二部分是在QuickSight中创建可视化。

### 第1部分 - 数据集准备

1. 打开Redshift Serverless仪表板
2. 单击由解决方案创建的以`clickstream-<project-id>`开头的工作组。
3. 单击"查询数据"按钮,您将被引导至Redshift查询编辑器。
4. 在Redshift查询编辑器的"编辑器"视图中,右键单击名为`clickstream-<project-id>`的工作组。在弹出的下拉菜单中,选择"编辑连接",系统将要求您提供连接参数。按照[指南](https://docs.aws.amazon.com/redshift/latest/mgmt/query-editor-v2-using.html){:target="_blank"}使用适当的方法进行连接。

    !!! info "重要"
        您需要对数据库(名称为`<project-id>`)拥有读写权限才能创建自定义视图或表。例如,您可以使用Admin用户连接到集群或工作组。如果您不知道Admin用户的密码,可以在Redshift控制台重置admin密码([了解更多](https://docs.aws.amazon.com/redshift/latest/mgmt/serverless-security.html){:target="_blank"})。

5. 如果这是您第一次访问查询编辑器,系统将提示您配置帐户,请单击"配置帐户"按钮打开查询编辑器。
6. 添加一个新的SQL编辑器,并确保选择了正确的工作组和模式。
7. 为漏斗分析创建一个新视图。在此示例中,我们使用以下SQL。

    ??? example "SQL命令" 
        ```sql
            SELECT
            platform,
            COUNT(DISTINCT step1_id) AS session_start_users,
            COUNT(DISTINCT step2_id) AS page_view_users,
            COUNT(DISTINCT step3_id) AS scroll_users
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
                {{schema}}.clickstream_event_base_view
            LEFT JOIN (
            SELECT
                user_pseudo_id AS step2_id,
                event_timestamp AS step2_timestamp
            FROM
                {{schema}}.clickstream_event_base_view
            WHERE
                event_name = '_page_view' )
            ON
                user_pseudo_id = step2_id
                AND event_timestamp < step2_timestamp
            LEFT JOIN (
            SELECT
                user_pseudo_id AS step3_id,
                event_timestamp AS step3_timestamp
            FROM
                {{schema}}.clickstream_event_base_view
            WHERE
                event_name= '_scroll' )
            ON
                step3_id  = step2_id
                AND step2_timestamp < step3_timestamp
            WHERE
            event_name = '_session_start' )
            group by
            platform
        ```

8. 转到QuickSight控制台,单击"数据集",然后单击"新建数据集"。

9. 在"新建数据集"页面,单击"Redshift手动连接"以添加数据集,填写提示的表单,参数如下:
      - 数据源名称: `clickstream-funnel-view-<project-id>`
      - 连接类型: 选择"VPC连接"/"Clickstream流水线<project-id>的VPC连接"
      - 数据库服务器: 输入无服务器工作组的端点URL,可在工作组控制台上找到
      - 端口: `5439` 
      - 数据库名称: `<project-id>`
      - 用户名: 您在上一步中用于创建自定义视图的用户名
      - 密码: 您在上一步中用于创建自定义视图的用户密码
10. 验证连接,如果正确,单击"创建数据源"按钮。
11. 从Redshift选择视图作为数据源 - "clickstream_funnel_view",然后
    - Schema: 选择您的模式
    - 表格: `clickstream_funnel_view`

    !!! tip "提示"
        系统将提示您选择"导入到SPICE"或"直接查询数据",请选择"直接查询数据"。
    
    - 单击"编辑/预览数据"以预览数据,熟悉数据后,单击右上角的"发布并可视化"。

### 第2部分 - 在QuickSight中创建可视化

1. 系统将提示您选择可视化布局,请根据需要选择一个。
2. 单击屏幕左上角的"+添加",然后单击"添加可视化"按钮。
3. 在屏幕左下角选择Visual类型,在本示例中,选择"垂直条形图"。
4. 在字段区域,将"platform"选择为X轴,"session_start_users"、"page_view_users"和"scroll_users"选择为值。
5. 现在您可以将此分析发布为仪表板,或继续进行格式化。更多QuickSight可视化知识请参考[链接](https://docs.aws.amazon.com/quicksight/latest/user/working-with-visuals.html){:target="_blank"}。

### 第3部分 - 将自定义仪表板添加到分析工作坊仪表板

要使您的自定义分析显示在Clickstream Analytics Studio的"仪表板"模块中,您需要将仪表板添加到由解决方案预先创建的名为`<project-id>_<app_id>`的共享文件夹中。

将自定义仪表板添加到共享文件夹后,它将自动显示在Clickstream Analytics Studio中。
