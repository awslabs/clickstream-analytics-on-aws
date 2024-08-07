---
title: "成本"
weight: 1

---

!!! info "重要提示"

    以下的成本估算仅为示例，实际成本可能因环境而异。

您需要承担运行此解决方案时使用的 AWS 服务的费用。 部署此解决方案只会在您的 AWS 账户中创建一个解决方案 Web 控制台，该控制台是无服务器架构，通常AWS的免费套餐可以覆盖成本。

该解决方案的大部分成本是由数据管道产生的。 截至本次修订，影响解决方案成本的主要因素包括：

- **摄入模块**，费用取决于摄入服务器的大小和所选择的数据宿类型。

- **数据处理和建模模块**（可选），费用取决于您是否选择启用此模块以及相关配置。

- **启用的仪表板**（可选），费用取决于您是否选择启用此模块以及相关配置。

- **点击流数据的数量**

- **附加功能**

以下是以不同数据管道配置的每日数据量为10/100/1000个请求每秒（RPS）的成本估算。成本估算由模块提供。根据您的实际配置，按模块累加成本以获得您的用例的总成本。

!!! info "重要提示"

    截至本修订版，以下成本是使用`On-Demand`价格在`us-east-1`区域以美元计量的。

## 摄入模块

摄入模块包括以下成本组成部分：

- 应用程序负载均衡器和公有IPv4地址
- 用于ECS的EC2实例 / 用于ECS的Fargate
- 数据宿 - Data sink（Kinesis Data Streams | Kafka | 直接到S3）
- S3存储
- 数据传输出（DTO）

主要假设包括：

- 压缩后的请求有效载荷：2KB（每个请求包含10个事件）
- MSK配置（m5.large * 2）
- KDS配置（按需，预配）
- 10/100/1000 RPS
- 使用三个公有子网

### EC2 类型

| 每日数据量/每秒请求数（RPS） | ALB 费用  | EC2 费用 |  缓冲类型（Buffer type） | 缓冲费用（Buffer cost） | S3 费用   |   总计（美元/月） |
| ------------------ | --- | ---- | ------------- | ----------- | ---  |  --------- |
| 10RPS（49GB/月）         |   $28.8  | $122   |  Kinesis（按需） |    $38         |   $3   |     $191.8  |
|                   |   $28.8  |  $122  |  Kinesis (预备 2 shard)   |      $22       |  $3   |     $175.8  |
|                   |   $28.8  |  $122  |  MSK (m5.large * 2, connector MCU * 1)   |       $417      |   $3  |    $570.8   |
|                   |   $28.8  |  $122  |  无缓冲              |             |  $3    |      $153.8   |
|100RPS（490GB/月）            |   $53.8 |  $122  |      Kinesis（按需）              |      $115       |  $4   |     $294.8 |
|                   | $53.8    |   $122  |  Kinesis (预备 2 shard)   |      $26       | $4    |     $205.8  |
|           |   $53.8  |  $122  |      MSK (m5.large * 2, connector MCU * 1)              |      $417       |  $4   |     $596.8
|           |   $53.8  |  $122 |      无缓冲              |             |  $4    |     $179.8
|1000RPS（4900GB/月）          |   $262.8  |   $122 |      Kinesis（按需）              |      $1051       |  $14   |    $1449.8 |
|                         |  $262.8   |  $122  |  Kinesis (预备 10 shard)   |    $180         |   $14  |     $578.8  |
|           |  $262.8   | $122  |      MSK (m5.large * 2, connector MCU * 2~3)              |      $590       |  $14  |     $988.8
|           |  $262.8   | $122 |      无缓冲              |            |  $14   |     $398.8

### Fargate 类型

| 每日数据量/每秒请求数（RPS） | ALB 费用  | Fargate 费用 |  缓冲类型（Buffer type） | 缓冲费用（Buffer cost） | S3 费用   |   总计（美元/月） |
| ------------------ | --- | ---  |  --------------   | ----------- | ---  |  --------- |
| 10RPS (49GB/month)             |  $28.8  |  $18 |  Kinesis (On-Demand) |    $38       |   $3  |     $87.8  |
|                    |  $28.8  |  $18 |  Kinesis (Provisioned 2 shard)   |      $22       |  $3   |   $71.8  |
|                    |  $28.8  |  $18 |  MSK (m5.large * 2, connector MCU * 1)   |       $417      |   $3  |     $466.8   |
|                         | $28.8    |  $18 |  None              |             |  $3    |      $49.8   |
|100RPS (490GB/month)          |  $53.8  |  $18  |  Kinesis(On-demand)              |      $115       |  $4   |     $190.8 |
|                         | $53.8    |   $18 |  Kinesis (Provisioned 2 shard)   |      $26       | $4    |     $101.8  |
|           |   $53.8  |  $18  |   MSK (m5.large * 2, connector MCU * 1)              |      $417       |  $4   |     $492.8
|           |   $53.8  |  $18 |      None              |             |  $4    |     $75.8
|1000RPS (4900GB/month)          |   $262.8  |   $72 |      Kinesis(On-demand)              |      $1051       |  $14   |    $1399.8 |
|                         |  $262.8   |  $72  |  Kinesis (Provisioned 10 shard)   |    $180         |   $14  |     $528.8  |
|           |  $262.8   | $72  |      MSK (m5.large * 2, connector MCU * 2~3)              |      $590       |  $14  |     $938.8
|           |  $262.8   | $72   |      None              |            |  $14   |     $348.8 

### 数据传输
当数据通过EC2发送到下游的数据宿，会产生数据的费用。下面是以1000RPS，每个请求的有效载荷为2KB为例的费用。

1. EC2 网络输入：此部分不产生费用
2. EC2 网络输出，有如下三种数据宿的情况：

    | 数据宿 | 接入数据宿方法 |  费用说明 |   总计（美元/月）|
    | ------------------ | --- | --- | ---  |  
    | S3         |  S3 Gateway endpoints | The S3 Gateway endpoints 不会产生数据传输费用   | $0  |  
    | MSK          |  |  数据传输费用（$0.010 per GB in/out/between EC2 AZs） | $210  |       
    | KDS          |  NAT |  NAT 固定费用： $64（2 Availability Zones and a NAT per AZ, $0.045 per NAT Gateway Hour）. <br> 数据传输费用：$1201（$0.045 per GB Data Processed by NAT Gateways）.  | $1266  | 
    | KDS          |  VPC Endpoint |  VPC Endpoint 固定费用：$14.62 （Availability Zones $0.01 per AZ Hour）. <br> 数据传输费用: $267($0.01 per GB Data Processed by Interface endpoints).  | $281.62  | 

    我们建议通过VPC endpoint传输数据到KDS。请参考[VPC endpoint][vpce]获取更多信息。       

## 数据处理与建模模块

如果启用数据处理与建模模块，将包括以下费用组成部分：

- EMR Serverless

- Redshift

主要假设包括：

- 10/100/1000 RPS
- 数据处理间隔：每小时/每6小时/每日
- EMR运行三个内置插件来处理数据

| 每日数据量/每秒请求数 (RPS) | EMR调度间隔 |  EMR 费用 | Redshift类型 | Redshift加载数据 费用 | Redshift存储数据 费用 |S3 费用 | 总计 (美元/月) |
| ----------------------- | --------------------- | -------- | ------------------------ | ------------- | ------------- | ------------- | ----- |
| 10RPS             | 每小时                |     $66.5（$1.35/GB）    | 无服务器 (基于8个RPU) |     $172          |   $3.4          | $0.36 | $242.26    |
|                         | 每6小时              |     $22.2（$0.45/GB）    | 无服务器 (基于8个RPU)               |       $70   |       $3.4     | $0.36 |  $95.96    |
|                         | 每日                 |      $39（$0.8/GB）    | 无服务器 (基于8个RPU)               |     $31     |       $3.4         | $0.36 |  $73.76    |
| 100RPS             | 每小时                |      $353（$0.72/GB）   | 无服务器 (基于8个RPU) |       $385    | $34    | $3.6 | $775.6    |
|                         | 每6小时              |     $179（$0.37/GB）     | 无服务器 (基于8个RPU)               |       $282      | $34  | $3.6 |  $498.6    |
|                         | 每日                 |     $247（$0.5/GB）     | 无服务器 (基于8个RPU)               |       $160        | $34 | $3.6 |   $444.6   |
| 1000RPS             | 每小时                |      $1260（$0.26/GB）   | 无服务器 (基于16个RPU) |       $2325     | $340   | $36 | $3961    |

!!! info "提示"
    **Redshift存储数据 费用**是指您以表格中对应的RPS发送一个月的请求所花费的redshift存储费用，如果数据存放超过一个月，请根据[Redshift 定价](https://aws.amazon.com/redshift/pricing/?nc1=h_ls)计算价格

## 实时流模式

如果您开启实时流报告，会产生格外费用，参考如下：

主要假设包括：

- 一个应用程序
- 对于10/100 RPS，批量的EMR调度间隔为每日
- 对于1000 RPS，批量的EMR调度间隔为每小时

| 每日数据量/每秒请求数 (RPS) | 每日开启实时时长 |  Kinesis (On-Demand) 费用 | Redshift类型     | Redshift 费用  | Managed Apache Flink 费用 | 总计 (美元/月) |
| ----------------------- | --------------------- | ---------------- | -------- | ------------------------ |  ----- | -----  |
| 10RPS             | 1 Hour                |    $73    | 无服务器 (基于8个RPU) |   $124.4       |  $6.8     |    $204.2  |
|                         | 24 Hours                |    $207    | 无服务器 (基于8个RPU) |    $1844.4      |  $163     |   $2214.4   |
| 100RPS             | 1 Hour                |    $200    | 无服务器 (基于8个RPU) |    $334      |  $10.2     |  $544.2    |
|                         | 24 Hour                |    $1320    | 无服务器 (基于8个RPU) |   $2144       |  $244.8     |  $3708.8    |
| 1000RPS             | 1 Hour                |    $1189    | 无服务器 (基于16个RPU) |   $2400       |  $24     |   $3613   |

!!! info "提示"

    - Kinesis (On-Demand) 的费用包含了摄入模块使用的的Kinesis费用。

    - 如果实时流全天开启，使用预置Redshift会更加经济。

    - Redshift 的费用包含了数据建模模块的使用费用。

## 仪表板

如果您选择启用，仪表板模块包括以下成本组成部分：

- QuickSight

关键假设包括：

- QuickSight企业版
- 不包括Q成本
- 通过**分析工作坊**访问
- **两个作者**每月订阅
- 10GB的SPICE容量

| 每日数据量/每秒请求数 (RPS) | 作者 |  SPICE | 总计（美元/月） |
| --------------------- | ------- |  ----- | ----- |
| 所有大小              | $24      |    0    |   $24    |

!!! info "提示"
    所有数据管道都适用于以上 QuickSight 费用，即使是在解决方案之外管理的可视化内容也是如此。

## 日志和监控

方案使用CloudWatch Logs，CloudWatch Metrics和CloudWatch Dashboard来实现日志，监控，展示功能，合计费用约为每月约14美元，根据Logs的使用量和Metrics的数量会有一定浮动。

## 额外功能

只有在您选择启用以下功能时，您才会被收取额外费用。

### Secrets Manager

- 如果您启用了报告功能，该解决方案将在 Secrets Manager 中创建一个密钥，用于存储 QuickSight 可视化使用的 Redshift 凭据。**费用**：0.4 美元/月。

- 如果您启用了摄入模块的身份验证功能，您需要在 Secrets Manager 中创建一个密钥，用于存储 OIDC 的信息。**费用**：0.4 美元/月。

### Amazon全球加速器

它产生固定的按小时费用，按每日数据传输量的费用和两个公有IPv4地址的费用。

关键假设：

- 接入部署在`us-east-1`

| 每日数据量/RPS | 固定每小时费用 | 两个公有IPv4地址费用 | 数据传输费用 | 总费用（美元/月） |
| --------------------- | ----------------- | ----------------- | ------------------ | ---------- |
| 10RPS           |        $18           |        $7.2           |          $0.6          |       $25.8     |
| 100RPS         |          $18         |        $7.2           |           $6         |      $31.2      |
| 1000RPS       |            $18       |        $7.2           |            $60        |      $85.2      |

### 应用负载均衡器访问日志

您需要为 Amazon S3 的存储费用付费，但无需为 Elastic Load Balancing 用于将日志文件发送到 Amazon S3 的带宽使用付费。有关存储费用的更多信息，请参阅 [Amazon S3 定价](https://aws.amazon.com/s3/pricing/)。

| 每日数据量/RPS | 日志大小 | S3 费用（美元/月） |
| --------------------- | -------- | ------- |
| 10 RPS           |    16.5       |    $0.38     |
| 100 RPS         |     165     |      $3.8   |
| 1000 RPS       |     1650     |    $38     |

[vpce]: https://docs.aws.amazon.com/whitepapers/latest/aws-privatelink/what-are-vpc-endpoints.html