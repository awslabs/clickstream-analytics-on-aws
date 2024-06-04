# 升级解决方案

!!! warning " 升级须知"

    1. 请注意，不支持直接从 1.0.x 版本升级到 1.1.6(+)版本。必须先升级到 [1.1.5 版本][v115]。
    2. 从早期 1.1 版本(1.1.6 之前)升级 Web 控制台后，您可以继续查看项目的仪表板。但是，由于数据模式的变化，您无法[探索现有的点击流数据][exploration]。如果您希望继续使用探索功能，您还需要升级数据管道，并将现有数据迁移到新的数据模式(如果您想探索历史数据)。

## 升级过程

### 升级 Web 控制台堆栈

1. 登录到 [AWS CloudFormation 控制台][cloudformation]，选择您现有的 [Web 控制台堆栈][console-stack]，然后选择**更新**。
2. 选择**替换当前模板**。
3. 在**指定模板**下：
     - 选择 Amazon S3 URL。
     - 请参阅下表查找适合您的部署类型的链接。
     - 将链接粘贴到 Amazon S3 URL 框中。
     - 再次选择**下一步**。

    | 模板      | 描述                          |
    | :---------- | :----------------------------------- |
    | [使用 Cognito 进行身份验证][cloudfront-s3-template]     | 在 AWS 区域中部署为公开服务  |
    | [使用 Cognito 通过自定义域进行身份验证][cloudfront-s3-custom-domain-template]     | 在 AWS 区域中部署为具有自定义域名的公开服务  |
    | [使用 OIDC 进行身份验证][cloudfront-s3-oidc-template]   | 在 AWS 区域中部署为公开服务 |
    | [使用 OIDC 通过自定义域进行身份验证][cloudfront-s3-oidc-custom-domain-template]    | 在 AWS 区域中部署为具有自定义域名的公开服务  |
    | [在 VPC 内使用 OIDC 进行身份验证][intranet-template]   | 在 AWS 区域的 VPC 内部署为私有服务  |
    | [在 AWS 中国使用 OIDC 对自定义域进行身份验证][cloudfront-s3-oidc-cn-template]    | 在 AWS 中国区域中部署为具有自定义域名的公开服务 |
    | [在 AWS 中国的 VPC 内使用 OIDC 进行身份验证][intranet-cn-template]   | 在 AWS 中国区域的 VPC 内部署为私有服务  |

4. 在**参数**下，查看模板的参数并根据需要进行修改。 参数详情请参考[部署][console-stack]。
5. 选择**下一步**。
6. 在 **配置堆栈选项** 页面上，选择 **下一步**。
7. 在**审核**页面上，查看并确认设置。 请务必选中该框，确认模板可能会创建 (IAM) 资源。
8. 选择 **查看更改集** 并验证更改。
9. 选择 **执行更改集** 以部署堆栈。

您可以在 AWS CloudFormation 控制台的 **状态** 列中查看堆栈的状态。 几分钟后您应该会收到“UPDATE_COMPLETE”状态。

### 升级项目管道

!!! info "重要提示"

    如果您在升级过程中遇到任何问题，请参考[故障排除页面][troubleshooting]。

1. 登录解决方案的Web控制台。
2. 转到**项目**，然后选择要升级的项目。
3. 点击`项目id`或**查看详情**按钮，将跳转至数据管道详细信息页面。
4. 在项目详情页面，点击**升级**按钮
5. 系统将提示您确认升级操作。
6. 点击**确认**，管道将处于“正在更新”状态。

您可以在解决方案控制台的 **状态** 列中查看管道的状态。 几分钟后您应该会收到`活跃`状态。

## 升级后操作(仅适用于已启用数据建模)

### 升级数据模型和预置仪表板

在升级项目的管道后，解决方案会自动异步升级仪表板所需的视图和物化视图。更新持续时间取决于 Redshift 集群的工作负载和现有数据量，可能需要几分钟到几小时。您可以在管道详情页面的**数据处理和建模**标签下的**Redshift Schemas**部分中跟踪进度。如果后期配置作业失败，您可以通过其链接访问工作流程的执行情况，然后使用保持不变的输入通过**操作 - 重启**或**新执行**来重新运行作业。

### 迁移现有数据(仅适用于从1.1.6之前的版本升级)

!!! info "注意"

    数据迁移过程是CPU密集型的。在开始迁移之前，请确保您的Redshift的负载较低。当迁移大量数据时，建议临时增加Redshift Serverless的RPU或集群大小。

    在我们的基准测试中，我们使用32个RPU的Redshift Serverless，在25分钟内迁移了1亿个事件。

1. 打开[Redshift查询编辑器v2][query-editor]。您可以参考AWS文档[使用查询编辑器v2][working-with-query-editor]，以登录并使用Redshift查询编辑器查询数据。

    !!! info "注意"
        您必须使用admin用户或具有schema(即作为应用程序ID)所有权权限的用户。有关更多详细信息，请参阅此[FAQ][view-schema-in-redshift]。

2. 选择Serverless工作组或预置集群，`<project-id>`->`<app-id>`->表，并确保列出了appId的表。

3. 创建一个新的SQL编辑器，选中对应的project。

4. 根据需要自定义日期范围，并在编辑器中执行以下SQL，将过去180天或任意天数前到现在的事件迁移到新表中。

    ```sql
    -- 请用您的实际应用程序ID替换 <app-id>
    -- 根据需要更新天数范围（如下例中的 180 天）
    CALL "<app-id>".sp_migrate_data_to_v2(180);
    ```

5. 等待SQL执行完成。执行时间取决于`events`表中的数据量。

6. 执行以下SQL来检查存储过程执行日志，确保没有错误。如遇中断，超时，其他错误，可重新执行第 4 步继续执行数据迁移。

    ```sql
    -- 请用您的实际应用程序ID替换 <app-id>
    SELECT * FROM "<app-id>"."clickstream_log_v2" WHERE log_name = 'sp_migrate_event_to_v2' ORDER BY log_date DESC;
    SELECT * FROM "<app-id>"."clickstream_log_v2" WHERE log_name = 'sp_migrate_user_to_v2' ORDER BY log_date DESC;
    SELECT * FROM "<app-id>"."clickstream_log_v2" WHERE log_name = 'sp_migrate_item_to_v2' ORDER BY log_date DESC;
    SELECT * FROM "<app-id>"."clickstream_log_v2" WHERE log_name = 'sp_migrate_session_to_v2' ORDER BY log_date DESC;
    SELECT * FROM "<app-id>"."clickstream_log_v2" WHERE log_name = 'sp_migrate_data_to_v2' ORDER BY log_date DESC;
    ```

7. 将原始事件表转化为`clickstream_event_base_view`表。

    ```sql
    -- 请用您的实际应用程序ID替换 <app-id>
    -- 根据需要更新天数范围（如下例中的 180 天）
    CALL "<app-id>".clickstream_event_base_view_sp(NULL, NULL, 24*180);
    ```

    !!! info "注意"

        建议分批刷新`clickstream_event_base_view`，尤其在以下情况下:

        - 在迁移作业完成之前有新的事件加载作业到来时。
        - 当要迁移的数据量很大时(例如,每批10000万条记录)。

        注意，分批刷新数据需要根据事件时间戳来完成。按事件时间戳从旧到新的顺序，多次调用以下存储过程。
        ```sql
        call "<schema>".clickstream_event_base_view(start_event_timestamp, end_event_timestamp, 1);
        ```
        例如要将2024-05-10 00:00:00至2024-05-12 00:00:00之间的数据刷新，则执行如下SQL：
        ```sql
        call "<schema>".clickstream_event_base_view_sp(TIMESTAMP 'epoch' + 1715270400  * INTERVAL '1 second', TIMESTAMP 'epoch' + 1715443200 * INTERVAL '1 second', 1);
        ```

8. 请遵循[此指南][faq-recalculate-data]，使用迁移后的新数据来计算预设仪表板的指标。

9. 如果您没有其他应用程序使用旧表和视图，您可以运行以下SQL来清理旧视图和表，从而节省Redshift存储空间。

    ```sql
    -- 请用您的实际应用程序ID替换 `<app-id>`
    DROP TABLE "<app-id>".event CASCADE;
    DROP TABLE "<app-id>".item CASCADE;
    DROP TABLE "<app-id>".user CASCADE;
    DROP TABLE "<app-id>".event_parameter CASCADE;

    DROP PROCEDURE "<app-id>".sp_migrate_event_to_v2(nday integer);
    DROP PROCEDURE "<app-id>".sp_migrate_item_to_v2(nday integer);
    DROP PROCEDURE "<app-id>".sp_clear_expired_events(retention_range_days integer);
    DROP PROCEDURE "<app-id>".sp_migrate_data_to_v2(nday integer);
    DROP PROCEDURE "<app-id>".sp_migrate_user_to_v2();
    DROP PROCEDURE "<app-id>".sp_migrate_session_to_v2();
    DROP PROCEDURE "<app-id>".sp_clear_item_and_user();
    ```

[quicksight-assets-export]: https://docs.aws.amazon.com/quicksight/latest/developerguide/assetbundle-export.html
[cloudformation]: https://console.aws.amazon.com/cloudfromation/
[console-stack]: ./deployment/index.md
[query-editor]: https://aws.amazon.com/redshift/query-editor-v2/
[working-with-query-editor]: https://docs.aws.amazon.com/redshift/latest/mgmt/query-editor-v2-using.html
[cloudfront-s3-template]: https://{{ aws_bucket }}.s3.amazonaws.com/{{ aws_prefix }}/{{ aws_version }}/cloudfront-s3-control-plane-stack-global.template.json
[cloudfront-s3-custom-domain-template]: https://{{ aws_bucket }}.s3.amazonaws.com/{{ aws_prefix }}/{{ aws_version }}/cloudfront-s3-control-plane-stack-global-customdomain.template.json
[cloudfront-s3-oidc-template]: https://{{ aws_bucket }}.s3.amazonaws.com/{{ aws_prefix }}/{{ aws_version }}/cloudfront-s3-control-plane-stack-global-oidc.template.json
[cloudfront-s3-oidc-custom-domain-template]: https://{{ aws_bucket }}.s3.amazonaws.com/{{ aws_prefix }}/{{ aws_version }}/cloudfront-s3-control-plane-stack-global-customdomain-oidc.template.json
[cloudfront-s3-oidc-cn-template]: https://{{ aws_cn_bucket }}.s3.cn-north-1.amazonaws.com.cn/{{ aws_cn_prefix }}/{{ aws_cn_version }}/cloudfront-s3-control-plane-stack-cn.template.json
[intranet-template]: https://{{ aws_bucket }}.s3.amazonaws.com/{{ aws_prefix }}/{{ aws_version }}/private-exist-vpc-control-plane-stack.template.json
[intranet-cn-template]: https://{{ aws_cn_bucket }}.s3.cn-north-1.amazonaws.com.cn/{{ aws_cn_prefix }}/{{ aws_cn_version }}/private-exist-vpc-control-plane-stack.template.json
[troubleshooting]: ./troubleshooting.md
[v115]: https://awslabs.github.io/clickstream-analytics-on-aws/zh/1.1.5/upgrade/
[exploration]: ./analytics/explore/index.md
[view-schema-in-redshift]: ./faq.md#redshift-redshift-schema
[faq-recalculate-data]: ./faq.md#_10
