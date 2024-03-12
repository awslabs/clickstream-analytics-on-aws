---
title: "Cost"
weight: 1

---

!!! info "Important"

    The following cost estimations are examples and may vary depending on your environment.

You are responsible for the cost of AWS services used when running this solution. Deploying this solution will only create a solution web console in your AWS account, which is completely serverless and typically can be covered within free tier.

The majority of the cost for this solution is incurred by the data pipeline. As of this revision, the main factors affecting the solution cost include:

- **Ingestion module**: the cost depends on the size of the ingestion server and the type of the data sink you choose.

- **Data processing and modeling module** (optional): the cost depends on whether you choose to enabled this module and its relevant configurations

- **Enabled Dashboards** (optional): the cost depends on whether you choose to enabled this module and its relevant configurations

- **Additional features**

The following are cost estimations for monthly data volumes of 10/100/1000 RPS (request per second) with different data pipeline configurations. Cost estimation are provided by modules. To get a total cost for your use case, sum the cost by modules based on your actual configuration.

!!! info "Important"

    As of this revision, the following cost is calculated with `On-Demand` prices in `us-east-1` region measured in USD.

## Ingestion module

Ingestion module includes the following cost components:

- Application load balancer
- EC2 for ECS
- Data sink (Kinesis Data Streams | Kafka | Direct to S3)
- S3 storage

Key assumptions include:

- Compressed request payload: 2KB (10 events per request)
- MSK configurations (m5.large * 2)
- KDS configuration (on-demand, provision)
- 10/100/1000RPS

| Request Per Second | ALB cost | EC2 cost  |  Buffer type      | Buffer cost | S3 cost   |  Total (USD/Month) |
| ------------------ | --- | ---  |  --------------   | ----------- | ---  |  --------- |
| 10RPS (49GB/month)             |  $18  |  $122 |  Kinesis (On-Demand) |    $38       |   $3  |     $181  |
|                    |  $18  |  $122 |  Kinesis (Provisioned 2 shard)   |      $22       |  $3   |   $165  |
|                    |  $18  |  $122 |  MSK (m5.large * 2, connector MCU * 1)   |       $417      |   $3  |     $560   |
|                         | $18    |  $122 |  None              |             |  $3    |      $143   |
|100RPS (490GB/month)          |  $43  |  $122  |  Kinesis(On-demand)              |      $115       |  $4   |     $284 |
|                         | $43    |   $122 |  Kinesis (Provisioned 2 shard)   |      $26       | $4    |     $195  |
|           |   $43  |  $122  |   MSK (m5.large * 2, connector MCU * 1)              |      $417       |  $4   |     $586
|           |   $43  |  $122 |      None              |             |  $4    |     $169
|1000RPS (4900GB/month)          |   $252  |   $122 |      Kinesis(On-demand)              |      $1051       |  $14   |    $1439 |
|                         |  $252   |  $122  |  Kinesis (Provisioned 10 shard)   |    $180         |   $14  |     $568  |
|           |  $252   | $122  |      MSK (m5.large * 2, connector MCU * 2~3)              |      $590       |  $14  |     $978
|           |  $252   | $122   |      None              |            |  $14   |     $388 

### Data transfer
There are associated costs when data is transferred from EC2 to the downstream data sink. Below is an example of data transfer costs based on 1000 RPS and a 2KB request payload.

1. EC2 Network In: This does not incur any costs.
2. EC2 Network Out: There are three data sink options:

    | Data Sink Type | Way to access data sink |  Dimensions |   Total (USD/Month) |
    | ------------------ | --- | --- | ---  |  
    | S3         |  S3 Gateway endpoints | The S3 Gateway endpoints does not incur any costs   | $0  |  
    | MSK          |  |  Data processed cost ($0.010 per GB in/out/between EC2 AZs)  | $210  |       
    | KDS          |  NAT |  NAT fixed cost: $64 (2 Availability Zones and a NAT per AZ, $0.045 per NAT Gateway Hour). <br> Data processed cost: $1201 ($0.045 per GB Data Processed by NAT Gateways).  | $1266  | 
    | KDS          |  VPC Endpoint |  VPC Endpoint fixed cost: $14.62 (Availability Zones $0.01 per AZ Hour). <br> Data processed cost: $267 ($0.01 per GB Data Processed by Interface endpoints).  | $281.62  | 

    We suggest using a [VPC endpoint](https://docs.aws.amazon.com/whitepapers/latest/aws-privatelink/what-are-vpc-endpoints.html) for the KDS data sink. For more information on using the VPC endpoint, please refer to the VPC endpoint documentation. 

## Data processing & data modeling modules

Data processing & modeling module include the following cost components if you choose to enable:

- EMR Serverless

- Redshift

Key assumptions include:

- 10/100/1000 RPS
- Data processing interval: hourly/6-hourly/daily
- EMR running three built-in plugins to process data

| Request Per Second | EMR schedule interval |  EMR cost | Redshift type            | Redshift Load cost  | Redshift Storage cost | S3 cost | Total (USD/Month) |
| ----------------------- | --------------------- | ---------------- | -------- | ------------------------ |  ----- | ----- | -----  |
| 10RPS             | Hourly                |     $72 ($1.47/GB)    | Serverless (8 based RPU) |     $74     |  $3.4     |  $0.36 |  $149.76    |
|                         | 6-hourly              |     $41.5 ($0.84/GB)     | Serverless(8 based RPU)               |      $13      |  $3.4       | $0.36 |  $58.26    |
|                         | Daily                 |      $26.7 ($0.54/GB)   | Serverless(8 based RPU)               |     $8     |  $3.4          |  $0.36 | $38.46    |
| 100RPS             | Hourly                |      $321 ($0.65/GB)   | Serverless (8 based RPU) |       $96       |  $34      | $3.6 |  $454.6    |
|                         | 6-hourly              |     $202 ($0.41/GB)     | Serverless(8 based RPU)               |       $31       |  $34      |  $3.6 |  $270.6    |
|                         | Daily                 |     $281 ($0.57/GB)     | Serverless(8 based RPU)               |       $21        |  $34      |  $3.6 |   $339.6   |
| 1000RPS             | 40 minutes (Recommended)                |      $1926 ($0.39/GB)   | Serverless (32 based RPU) |       $440     |  $340        | $36 | $2742    |

!!! info "Note"
    The term **Redshift storage cost** refers to the cost of Redshift storage incurred for one month based on the corresponding RPS (Requests Per Second) specified in the above table. If the data is stored for more than one month, please refer to the [Redshift pricing](https://aws.amazon.com/redshift/pricing/?nc1=h_ls) for calculating the pricing.

## Reporting module

Reporting module include the following cost components if you choose to enable:

- QuickSight

Key assumptions include

- QuickSight Enterprise subscription
- Exclude Q cost
- Access through **Analytics Studio**
- **Two authors** with monthly subscription
- 10GB SPICE capacity

| Daily data volume/RPS | Authors |  SPICE | Total cost (USD/Month) |
| --------------------- | ------- |  ----- | ----- |
| All size              | $24      |    0   | $24 |

!!! info "Note"
    All your data pipelines are applied to the above QuickSight costs, even the visualizations managed outside the solution.

## Logs and Monitoring

The solution utilizes CloudWatch Logs, CloudWatch Metrics and CloudWatch Dashboard to implement logging, monitoring and visualizating features. The total cost is around $14 per month and may fluctuate based on the volume of logs and the number of metrics being monitored.

## Additional features

You will be charged with additional cost only if you choose to enable the following features.

### Secrets Manager

- If you enable reporting, the solution creates a secret in Secrets Manager to store the Redshift credentials used by QuickSight visualization. **Cost**: 0.4 USD/month.

- If you enable the authentication feature of the ingestion module, you need to create a secret in Secrets Manager to store the information for OIDC. **Cost**: 0.4 USD/month.

### Amazon Global Accelerator

It incurs a fixed hourly charge and a per-day volume data transfer cost.

Key assumptions:

- Ingestion deployment in `us-east-1`

| Request Per Second | Fixed hourly cost | Data transfer cost | Total cost (USD/Month) |
| --------------------- | ----------------- | ------------------ | ---------- |
| 10RPS           |        $18           |          $0.6          |       $18.6     |
| 100RPS         |          $18         |           $6         |      $24      |
| 1000RPS       |            $18       |            $60        |      $78      |

### Application Load Balancer Access log

You are charged storage costs for Amazon S3, but not charged for the bandwidth used by Elastic Load Balancing to send log files to Amazon S3. For more information about storage costs, see [Amazon S3 pricing](https://aws.amazon.com/s3/pricing/).

| Request Per Second | Log size(GB) | S3 cost(USD/Month)|
| --------------------- | -------- | ------- |
| 10 RPS           |    16.5       |    $0.38     |
| 100 RPS         |     165     |      $3.8   |
| 1000 RPS       |     1650     |    $38     |

[vpce]: https://docs.aws.amazon.com/whitepapers/latest/aws-privatelink/what-are-vpc-endpoints.html