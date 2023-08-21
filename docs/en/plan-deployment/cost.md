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

- Request payload: 1KB (compressed, 1:10 ratio)
- MSK configurations (m5.large * 2)
- KDS configuration (on-demand, provision - shard 2)
- 10/100/1000RPS

| Request Per Second | ALB | EC2  |  Buffer type      | Buffer cost | S3   |  Total (USD/Month) |
| ------------------ | --- | ---  |  --------------   | ----------- | ---  |  --------- |
| 10RPS              |  7  |  122 |  Kinesis (On-Demand) |    36       |   3  |     168  |
|                    |  7  |  122 |  Kinesis (Provisioned 2 shard)   |      22       |  3   |   154  |
|                    |  7  |  122 |  MSK (m5.large * 2, connector MCU * 1)   |       417      |   3  |     549   |
|                         | 7    |  122 |  None              |             |  3    |      132   |
|100RPS           |   43  |  122  |  Kinesis(On-demand)              |      86       |  3   |     254 |
|                         | 43    |   122 |  Kinesis (Provisioned 2 shard)   |      26       | 3    |     194  |
|           |   43  |  122  |   MSK (m5.large * 2, connector MCU * 1)              |      417       |  3   |     585
|           |   43  |  122 |      None              |             |  3    |     168
|1000RPS           |   396  |   122 |      Kinesis(On-demand)              |      576       |  14   |    1108 |
|                         |  396   |  122  |  Kinesis (Provisioned 10 shard)   |    146         |   14  |     678  |
|           |  396   | 122  |      MSK (m5.large * 2, connector MCU * 2~3)              |      530       |  14  |     1062
|           |  396   | 122   |      None              |            |  14   |     532

## Data transfer
There are associated costs when data is transferred from EC2 to the downstream data sink. Below is an example of data transfer costs based on 1000 RPS and a 1KB request payload.

1. EC2 Network In: This does not incur any costs.
2. EC2 Network Out: There are three data sink options:
    - S3: It is recommended to use S3 Gateway endpoints, which does not incur any costs.
    - MSK: It will cost `$0.010 per GB in/out/between EC2 AZs`, about $105/month.
    - KDS: There are two ways to sink data from EC2 to KDS: NAT or VPC endpoint.
        - NAT: Suppose there is one NAT, the total cost is about $633/month. The price consists of the following items:
            1. `$0.045 per NAT Gateway Hour`, $32/month.
            2. `$0.045 per GB Data Processed by NAT Gateways`, $601/month.
        - VPC Endpoint: Suppose deploying interface endpoint in two availability zones, the total cost is about $148.1/month. The price consists of the following items:
            1. `$0.01 per AZ Hour`, $14.6/month.
            2. `$0.01 per GB Data Processed by Interface endpoints`, $133.5/month.            

        We suggest using a [VPC endpoint](https://docs.aws.amazon.com/whitepapers/latest/aws-privatelink/what-are-vpc-endpoints.html) for the KDS data sink. For more information on using the VPC endpoint, please refer to the VPC endpoint documentation.        

## Data processing & data modeling modules

Data processing & modeling module include the following cost components if you choose to enable:

- EMR Serverless

- Redshift

Key assumptions include:

- 10/100/1000 RPS
- Data processing interval: hourly/6-hourly/daily
- EMR running three built-in plugins to process data

| Request Per Second | EMR schedule interval |  EMR Cost | Redshift type            | Redshift cost | Total (USD) |
| ----------------------- | --------------------- | ---------------- | -------- | ------------------------ |  ----- |
| 10RPS             | Hourly                |     28     | Serverless (8 based RPU) |     68          |   96    |
|                         | 6-hourly              |     10.8     | Serverless(8 based RPU)               |       11        |   21.8    |
|                         | Daily                 |      9.6    | Serverless(8 based RPU)               |     3          |   12.6    |
| 100RPS             | Hourly                |      72   | Serverless (8 based RPU) |       70        |  142    |
|                         | 6-hourly              |     61.2     | Serverless(8 based RPU)               |       17.2        |   78.4    |
|                         | Daily                 |     43.7     | Serverless(8 based RPU)               |       12.4        |    56.1   |
| 1000RPS             | Hourly                |      842   | Serverless (8 based RPU) |       172        |  1014    |
|              | 6-Hourly                |      579   | Serverless (8 based RPU) |       137        |  716    |
| <span style="background-color: lightgray">The EMR for this case is configured as below.</span>              | Daily               |     642   | Serverless (8 based RPU) |        94       |   736   |

!!! info "Note"
    For the cost of 1000 PRS Daily, we used below EMR configuration.

    ```json
    {
    "sparkConfig": [
            "spark.emr-serverless.executor.disk=200g",
            "spark.executor.instances=16",
            "spark.dynamicAllocation.initialExecutors=16",
            "spark.executor.memory=100g",
            "spark.executor.cores=16",
            "spark.network.timeout=10000000",
            "spark.executor.heartbeatInterval=10000000",
            "spark.shuffle.registration.timeout=120000",
            "spark.shuffle.registration.maxAttempts=5",
            "spark.shuffle.file.buffer=2m",
            "spark.shuffle.unsafe.file.output.buffer=1m"
        ],
        "inputRePartitions": 800
    }
    ```

## Reporting module

Reporting module include the following cost components if you choose to enable:

- QuickSight

Key assumptions include

- QuickSight Enterprise subscription
- Exclude Q cost
- **Two authors** with monthly subscription
- **Ten readers** with 22 working days per month, 5% active readers, 50% frequent readers, 25%  occasional readers, 20% inactive readers
- 10GB SPICE capacity

| Daily data volume/RPS | Authors | Readers | SPICE | Total |
| --------------------- | ------- | ------- | ----- | ----- |
| All size              | 48      | 18.80   |   0   | 66.80 |

!!! info "Note"
    All your data pipelines are applied to the above QuickSight costs, even the visualizations managed outside the solution.

## Logs and Monitoring

The solution utilizes CloudWatch Logs， CloudWatch Metrics and CloudWatch Dashboard to implement logging, monitoring and visualizating features. The total cost is around $14 per month and may fluctuate based on the volume of logs and the number of metrics being monitored.

## Additional features

You will be charged with additional cost only if you choose to enable the following features.

### Secrets Manager

- If you enable reporting, the solution creates a secret in Secrets Manager to store the Redshift credentials used by QuickSight visualization. **Cost**: 0.4 USD/month.

- If you enable the authentication feature of the ingestion module, you need to create a secret in Secrets Manager to store the information for OIDC. **Cost**: 0.4 USD/month.

### Amazon Global Accelerator

It incurs a fixed hourly charge and a per-day volume data transfer cost.

Key assumptions:

- Ingestion deployment in `us-east-1`

| Request Per Second | Fixed hourly cost | Data transfer cost | Total cost(USD) |
| --------------------- | ----------------- | ------------------ | ---------- |
| 10RPS           |        18           |          0.3          |       18.3     |
| 100RPS         |          18         |           3         |      21      |
| 1000RPS       |            18       |            30        |      38      |

### Application Load Balancer Access log

You are charged storage costs for Amazon S3, but not charged for the bandwidth used by Elastic Load Balancing to send log files to Amazon S3. For more information about storage costs, see [Amazon S3 pricing](https://aws.amazon.com/s3/pricing/).

| Request Per Second | Log size(GB) | S3 cost(USD) |
| --------------------- | -------- | ------- |
| 10 RPS           |    16.5       |    0.38     |
| 100 RPS         |     165     |      3.8   |
| 1000 RPS       |     1650     |    38     |

[vpce]: https://docs.aws.amazon.com/whitepapers/latest/aws-privatelink/what-are-vpc-endpoints.html