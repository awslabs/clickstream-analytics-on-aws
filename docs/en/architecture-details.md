The {{ solution_name }} solution has four components: a web console, Analytics Studio, SDKs, and data pipeline.

### Web console

This solution provides a web console which allows you to create clickstream projects, and configure, deploy, and manage  data pipeline for each clickstream project.

### Analytics Studio

Analytics Studio is a unified web interface for business analysts or data analysts to view and create dashboards, query and explore clickstream data, and manage metadata. It supports the following features:

- provide a pre-canned user life cycle dashboard
- provide an explorative analytics model to query and analyze clickstream data
- support creating custom analysis and visualization in a drag-and-drop manner
- auto-generate metadata for clickstream data, support metadata management

### SDKs

This solution provides native SDKs for help you easily collect and report in-app events from your applications to data pipelines.

- [Android SDK][clickstream-andriod]
- [Swift SDK][clickstream-swift]
- [Web SDK][clickstream-web]
- [Flutter SDK][clickstream-flutter]
- [WeChat Mini Program SDK][clickstream-wechat]

### Data pipeline

This solution uses the web console to manage the project and its data pipeline. The data pipeline consists of four modules.

#### Ingestion module

The ingestion module serves as web server for ingesting the Clickstream data. It supports the following features:

- specify the auto scaling group capability
- specify warm pool size to scale out faster and save costs
- support authenticate with OIDC
- support SSL
- support enabling AWS Global Accelerator for ELB
- support different data sinks, including S3, KDS and MSK

#### Data processing module

The data processing module transforms and enriches the ingested data to solution's data model by the Apache Spark application running in EMR serverless. It supports the following features:

- specify the batch interval of data processing
- specify the data refreshness age
- provider out-of-the-box enrichment plug-ins
  - UA enrichment to parse OS, device, browser information from User Agent string of the HTTP request header
  - IP enrichment to mapping device location information (for example, city, country, region) based on the request source IP
- support third-party transformer plug-ins
- support third-party enrichment plug-ins

#### Data modeling module

The data modeling module loads the processed data into lake house. It supports the following features:

- support both provisioned Redshift and Redshift Serverless as data warehouse
  - support the data range for hot data keeping in Redshift
  - specify the interval to update user dimension table
- support use Athena to query the data in data lake

#### Reporting module

The reporting module creates a secure connection to the data warehouse and provisions the out-of-box dashboards in business intelligence Amazon QuickSight.

[clickstream-swift]: https://github.com/awslabs/clickstream-swift
[clickstream-andriod]: https://github.com/awslabs/clickstream-android
[clickstream-web]: https://github.com/awslabs/clickstream-web
[clickstream-flutter]: https://github.com/awslabs/clickstream-flutter
[clickstream-wechat]: https://github.com/awslabs/clickstream-wechat
