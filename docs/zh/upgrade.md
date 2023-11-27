# 升级解决方案

## 规划和准备

1. **数据处理间隔**：管道升级大约需要20分钟； 确保升级现有管道时没有数据处理作业正在运行。 您可以更新现有管道，增加间隔时间，并在控制台查看EMR Serverless应用是否有无正在运行的作业。

## 升级过程

### 升级 Web 控制台堆栈

1. 登录到 [AWS CloudFormation 控制台][cloudformation]，选择您现有的 [Web 控制台堆栈][console-stack]，然后选择 **更新**。
2. 选择**替换当前模板**。
3. 在**指定模板**下：
     - 选择 Amazon S3 URL。
     - 根据您的部署类型复制最新模板的链接。
     - 将链接粘贴到 Amazon S3 URL 框中。
     - 再次选择**下一步**。
4. 在**参数**下，查看模板的参数并根据需要进行修改。 参数详情请参考[部署][console-stack]。
5. 选择**下一步**。
6. 在 **配置堆栈选项** 页面上，选择 **下一步**。
7. 在**审核**页面上，查看并确认设置。 请务必选中该框，确认模板可能会创建 (IAM) 资源。
8. 选择 **查看更改集** 并验证更改。
9. 选择 **执行更改集** 以部署堆栈。

您可以在 AWS CloudFormation 控制台的 **状态** 列中查看堆栈的状态。 几分钟后您应该会收到“UPDATE_COMPLETE”状态。

### 升级项目管道

1. 登录解决方案的Web控制台。
2. 在页面右下角验证以`v1.1.0`开头的解决方案版本。 如果没有，您可以强制重新加载页面来重新检查。
3. 转到**项目**，然后选择要升级的项目。
4. 点击`项目id`或**查看详情**按钮，将跳转至数据管道详细信息页面。
5. 在项目详情页面，点击**升级**按钮
6. 系统将提示您确认升级操作。
7. 点击**确认**，管道将处于“正在更新”状态。

您可以在解决方案控制台的 **状态** 列中查看管道的状态。 几分钟后您应该会收到`活跃`状态。

## 升级后操作

### 从1.0.x升级后迁移现有数据

当您从 v1.0.x 升级管道时，您需要执行以下操作将数据从旧表`ods_events`迁移到 Redshift 中的新表`event`、`event_parameter`、`user`和`item`:

1. 打开 [Redshift 查询编辑器 v2][查询编辑器]。 您可以参考 AWS 文档 [使用查询编辑器 v2][working-with-query-editor] 使用 Redshift 查询编辑器 v2 登录并查询数据。

    !!! info "注意"
        您必须使用`admin`用户或具有 schema（名为`项目 ID`）所有权权限的用户。

2. 选择无服务器工作组或配置的集群，`<project-id>`->`<app-id>`->Tables，并确保其中列出了 appId 的表。

3. 新建一个SQL编辑器。

4. 在编辑器中执行以下SQL。

     ```sql
     -- 请将 `<app-id>` 替换为您的实际应用 ID
     CALL "<app-id>".sp_migrate_ods_events_1_0_to_1_1();
     ```

5. 等待SQL 完成。 执行时间取决于表“ods_events”中的数据量。

6. 执行以下SQL查看存储过程执行日志； 确保那里没有错误。

    ```sql 
    -- 请将 `<app-id>` 替换为您的实际应用 IDd
    SELECT * FROM  "<app-id>"."clickstream_log" where log_name = 'sp_migrate_ods_events' order by log_date desc;
    ```     

7. 如果您没有其他应用程序使用旧表和视图，您可以运行下面的 SQL 来清理旧视图和表，以节省 Redshift 的存储空间。

    ```sql
    -- 请将 `<app-id>` 替换为您的实际应用 ID
    ```

[cloudformation]: https://console.aws.amazon.com/cloudfromation/
[console-stack]: ./deployment/index.md
[query-editor]: https://aws.amazon.com/redshift/query-editor-v2/
[working-with-query-editor]: https://docs.aws.amazon.com/redshift/latest/mgmt/query-editor-v2-using.html
