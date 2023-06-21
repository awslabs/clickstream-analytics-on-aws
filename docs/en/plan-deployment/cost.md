---
title: "Cost"
weight: 1

---

!!! Important "Important"

    The following cost estimations are examples and may vary depending on your environment. 

You are responsible for the cost of Amazon cloud technology services used when running this solution. The majority of the cost for this solution is incurred by the data pipeline. As of this revision, the main factors affecting the solution cost include:

- **Ingestion module**, the cost depends on the size of the ingestion server and the type of the data sink you choose.

- **Data processing and modeling module** (optional), the cost depends on whether you choose to enabled this module and its relevant configurations

- **Enabled Dashboards** (optional), the cost depends on whether you choose to enabled this module and its relevant configurations

- **Additional features**

The following are cost estimations for monthly data volumes of 10/100/1000/10000 RPS (request per second) with different data pipeline configurations. Cost estimation are provided by modules. To get a total cost for your use case, sum the cost by modules based on your actual configuration.

!!! Important "Important"

    As of this revision, the following cost is calculated with `On-Demand` prices in `us-east-1` region measured in USD.

## Ingestion module

Ingestion module includes the following cost components:

- Application load balancer
- EC2 for ECS
- Data sink (Kinesis | Kafka | Direct to S3)
- S3 storage
- CloudWatch

Key assumptions include:

- Request payload: 1KB (compressed, 1:15 ratio)
- MSK configurations (m5.large * 2)
- KDS configuration (on-demand, provision - shard 2)
- 10/100/1000/10000RPS

| Request Per Second | ALB | EC2 | Buffer type       | Buffer cost | S3   | CloudWatch | Total (USD/Month) |
| ------------------ | --- | --- | ----------------- | ----------- | ---  | ---------- | --------- |
| 10RPS             |   7  | 122    | Kinesis (On-Demand) |    36         |   3   |   14   |  182  |
|                         |     |     | Kinesis (Provisioned)   |             |     |       |    |
|                         |   7  |  122   | MSK (m5.large * 2)   |       417      |   3  |    14   | 563   |
|                         | 7    |  122   | None              |             |  3    |    14   |  146   |
|100RPS           |   43  |  122  |     Kinesis(On-demand)              |      86       |  3   |    14   | 268 |
|                         |     |     | Kinesis (Provisioned)   |             |     |       |    |
|           |   43  |  122  |     MSK (m5.large * 2)              |      417       |  3   |    14   | 599
|           |   43  |  122  |     None              |             |  3    |    14   | 182
|
|1000RPS           |   396  |   122 |     Kinesis(On-demand)              |      576       |  14   |   14    | 1122 |
|                         |     |     | Kinesis (Provisioned)   |             |     |       |    |
|           |  396   | 122   |     MSK (m5.large * 2)              |      530       |  14  |   14    |  1076
|           |  396   | 122   |     None              |            |  14   |   14    |  546
|10000RPS           |   4996  |   244 |     Kinesis(On-demand)              |      6501       |  86   |   21    | 11848 |
|                         |     |     | Kinesis (Provisioned)   |             |     |       |    |
|           |  4996   |  187  |     MSK (m5.large * 3)              |      1850       |  101|   21    |  7155
|           |  4996   | 187   |     None              |            |  28    |   21    |  5232

## Data processing & data modeling modules

Data processing & modeling module include the following cost components if you enable:

- EMR Serverless

- Redshift

Key assumptions include:

- 10/100/1000/10000 RPS
- Data processing interval: hourly/6-hourly/daily
- EMR running three built-in plugins to process data

| Request Per Second | EMR schedule interval | EMR Job run time | EMR Cost | Redshift type            | Redshift cost | Total (USD) |
| ----------------------- | --------------------- | ---------------- | -------- | ------------------------ | ------------- | ----- |
| 10RPS             | Hourly                |                  |     28     | Serverless (8 based RPU) |     36          |   64    |
|                         | 6-hourly              |                  |     10.8     | Serverless               |       12        |   22.8    |
|                         | Daily                 |                  |      9.6    | Serverless               |     3          |   12.6    |
|                         | Hourly                |                  |      28    | Cluster                  |               |       |
|                         | 6-hourly              |                  |      10.8    | Cluster                  |               |       |
|                         | Daily                 |                  |      9.6    | Cluster                  |               |       |
| 100RPS             | Hourly                |                  |      115   | Serverless (8 based RPU) |       72        |  187    |
|                         | 6-hourly              |                  |          | Serverless               |               |       |
|                         | Daily                 |                  |          | Serverless               |               |       |
|                         | Hourly                |                  |          | Cluster                  |               |       |
|                         | 6-hourly              |                  |          | Cluster                  |               |       |
|                         | Daily                 |                  |          | Cluster                  |               |       |
| 1000RPS             | Hourly                |        480 H          |      964.8   | Serverless (8 based RPU) |       300        |  1264.8    |

## Reporting module

Reporting module include the following cost components if you choose to enable:

- QuickSight

Key assumptions include

- QuickSight Enterprise subscription
- Exclude Q cost
- Two authors with monthly subscription
- Ten readers with 22 working days per month, 5% active readers, 50% frequent readers, 25%  occasional readers, 20% inactive readers
- 10GB SPICE capacity

| Daily data volume/RPS | Authors | Readers | SPICE | Total |
| --------------------- | ------- | ------- | ----- | ----- |
| All size              | 48      | 18.80   |   0   | 66.80 |

!!! note "Note"
    All your data pipelines are applied to the above QuickSight costs, even the visualizations managed outside the solution.

## Additional features

You will be charged with additional cost only if you choose to enable the following features.

### Secrets Manager

- If you enable reporting, the solution creates a secret in Secrets Manager to store the Redshift credentials used by QuickSight visualization. **Cost**: 0.4 USD/month.

- If you enable the authentication feature of the ingestion module, you need to create a secret in Secrets Manager to store the information for OIDC. **Cost**: 0.4 USD/month.

### Amazon Global Accelerator

It incurs a fixed hourly charge and a per-day volume data transfer cost.

Key assumptions:

- Ingestion deployment in us-east-1

| Request Per Second | Fixed hourly cost | Data transfer cost | Total cost(USD) |
| --------------------- | ----------------- | ------------------ | ---------- |
| 10RPS           |        18           |          0.3          |       18.3     |
| 100RPS         |          18         |           3         |      21      |
| 1000RPS       |            18       |            30        |      38      |
| 10000RPS       |            18       |           300       |       318     |

### Application Load Balancer Access log

You are charged storage costs for Amazon S3, but not charged for the bandwidth used by Elastic Load Balancing to send log files to Amazon S3. For more information about storage costs, see [Amazon S3 pricing](https://aws.amazon.com/s3/pricing/).

| Request Per Second | Log size(GB) | S3 cost(USD) |
| --------------------- | -------- | ------- |
| 10 RPS           |    16.5       |    0.38     |
| 100 RPS         |     165     |      3.8   |
| 1000 RPS       |     1650     |    38     |
| 10000 RPS       |     16500     |    380     |
