# 卸载Clickstream Analytics on AWS

!!! Warning "警告"
    如果你在删除{{ solution_name }}主堆栈之前，删除项目相关的堆栈，你会遇到IAM角色丢失的错误。{{ solution_name }}控制台为Clickstream数据管道启动了额外的CloudFormation堆栈。
    我们建议你在卸载解决方案之前删除项目。

## 步骤1. 删除项目

1. 转到{{solution_name}}控制台。
2. 在左边的侧边栏，选择**项目**。
3. 选择要删除的项目。
4. 选择右上角的**删除**按钮。
5. 重复步骤3和4，删除所有项目。

## 步骤2. 删除{{ solution_name }}主堆栈

1. 转到[CloudFormation控制台][cloudformation]。
2. 找到解决方案的CloudFormation堆栈。
3. 删除该解决方案的CloudFormation堆栈。
4. （可选）删除该解决方案创建的S3桶。
    1. 选择解决方案的CloudFormation堆栈，并选择**资源**标签。
    2. 在搜索栏中，输入 "DataBucket"。它显示所有由解决方案创建的名称为 "DataBucket "的资源。你可以找到资源类型**AWS::S3::Bucket**，**Physical ID**字段是S3桶的名称。
    3. 进入S3控制台，找到S3桶的名称。**空**并**删除**该S3桶。

[cloudformation]: https://console.aws.amazon.com/cloudfromation/
