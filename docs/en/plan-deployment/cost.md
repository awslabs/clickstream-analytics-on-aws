---
title: "Cost"
weight: 1

---

!!! Important "Important"

    The following cost estimations are examples and may vary depending on your environment. 

You are responsible for the cost of Amazon cloud technology services used when running this solution. The majority of the cost for this solution is incurred by the data pipeline. As of June 2023, the main factors affecting the solution cost include:

- **Ingestion module**, the cost depends on the size of the ingestion server and the type of the data sink you choose.

- **Data processing and modeling module** (optional), the cost depends on whether you choose to enabled this module and its relevant configurations

- **Enabled Dashboards** (optional), the cost depends on whether you choose to enabled this module and its relevant configurations

- **Volume of clickstream data** 

- **Additonal features**

The following are cost estimations for daily data volumes of 10/100/1000/10000 RPS (request per second) with different data pipeline configurations. Cost estimation are provided by modules. To get a total cost for your use case, sum the cost by modules based on your actual configuration.

!!! Important "Important"

    As of June 2023, the following cost is calculated with `On-Demand` prices in `us-east-1` region measured in USD.

## Ingestion module

Ingestion module includes the following cost components:

- Application load balancer
- EC2 for ECS
- Data sink (Kinesis | Kafka | Direct to S3)
- S3 storage
- Data Transfer Out (DTO)

Key assumptions include:
 
- Request payload: 1KB (compressed, 1:15 ratio)
- MSK configurations (TBD)
- KDS configuration (on-demand, provision - shard#)
- 10/100/1000/10000RPS

| Daily data volume / RPS | ALB | EC2 | Buffer type       | Buffer cost | S3  | NAT Gateway | CloudWatch | Total (USD) |
| ----------------------- | --- | --- | ----------------- | ----------- | --- | ----------- | ----- |----- |
| 10RPS             |   7.2  | 122.4    | Kinesis (On-Demand) |    36         |   3  |             |   14.4    |  183  |
|                         |   7.2  |  122.4   | MSK (m5.large * 2)   |       417.6      |   3  |             |    7.2   | 557.4   |
|                         | 7.2    |  122.4   | None              |             |  3   |             |    14.4   |  147   | 
|100RPS           |   43.2  |  122.4  |     Kinesis(On-demand)              |      86.4       |  3   |     64.8        |    14.4   | 269.4
|           |   43.2  |  122.4  |     MSK (m5.large * 2)              |      417.6       |  3   |             |    14.4   | 600.6
|           |   43.2  |  122.4  |     None              |             |  3   |             |    14.4   | 183
|                         |     |     |                   |             |     |             |       |
|1000RPS           |   396  |   122.4 |     Kinesis(On-demand)              |      576       |  14.4   |             |   14.4    | 1123.2
|           |  396   | 122.4   |     MSK (m5.large * 2)              |      532.8       |  7.2   |             |   14.4    |  1116
|           |  396   | 122.4   |     None              |            |  7.2   |             |   14.4    |  540

## Data processing & modeling modules

Data processing & modeling module include the following cost components if you enable:

- EMR Serverless

- Redshift

Key assumptions include:
 
- 10/100/1000/10000 RPS
- Data processing interval: hourly/6-hourly/daily
- EMR running three built-in plugins to process data 


| Daily data volume / RPS | EMR schedule interval | EMR Job run time | EMR Cost | Redshift type            | Redshift cost | Total (USD) |
| ----------------------- | --------------------- | ---------------- | -------- | ------------------------ | ------------- | ----- |
| 10RPS             | Hourly                |        43 Hours          |     $14.4     | Serverless (8 based RPU) |     $36          |   $50.4    |
|                         | 6-hourly              |                  |          | Serverless               |               |       |
|                         | Daily                 |                  |          | Serverless               |               |       |
|                         | Hourly                |                  |          | Cluster                  |               |       |
|                         | 6-hourly              |                  |          | Cluster                  |               |       |
|                         | Daily                 |                  |          | Cluster                  |               |       |
| 100RPS             | Hourly                |        78 Hours          |      $57.6   | Serverless (8 based RPU) |       $72        |  $129.6    |
|                         | 6-hourly              |                  |          | Serverless               |               |       |
|                         | Daily                 |                  |          | Serverless               |               |       |
|                         | Hourly                |                  |          | Cluster                  |               |       |
|                         | 6-hourly              |                  |          | Cluster                  |               |       |
|                         | Daily                 |                  |          | Cluster                  |               |       |
| 1000RPS             | Hourly                |        480 H          |      964.8   | Serverless (8 based RPU) |       300        |  1264.8    |

## Dashboards

Dashboards module include the following cost components if you choose to enable:

- QuickSight

Key assumptions include
 
- QuickSight Enterprise version 
- Exclude Q cost

| Daily data volume/RPS | Authors | Readers | SPICE | Total |
| --------------------- | ------- | ------- | ----- | ----- |
| All size              | 4       | 10      |       |       |
|                       | 4       | 20      |       |       |

## Additional features

You will be charged with additional cost only if you choose to enable the following features.

### Amazon Global Accelerator

It incurs a fixed hourly charge and per-day-volume data transfer cost.

Key assumptions:

- Ingestion deployment in us-east-1

| Daily data volume/RPS | Fixed hourly cost | Data transfer cost | Total cost |
| --------------------- | ----------------- | ------------------ | ---------- |
| 10RPS           |                   |                    |            |
| 100RPS         |                   |                    |            |
| 1000RPS       |                   |                    |            |
| 10000RPS       |                   |                    |            |

### Application Load Balancer Access log

You are charged storage costs for Amazon S3, but not charged for the bandwidth used by Elastic Load Balancing to send log files to Amazon S3. For more information about storage costs, see [Amazon S3 pricing](https://aws.amazon.com/s3/pricing/).

| Daily data volume/RPS | Log size | S3 cost |
| --------------------- | -------- | ------- |
| 10RPS           |          |         |
| 100RPS         |          |         |
| 1000RPS       |          |         |
| 10000RPS       |          |         |

