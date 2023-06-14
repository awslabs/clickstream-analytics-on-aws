The {{ solution_name }} solution has three components: a web console, SDKs, the data pipeline for ingesting, processing, analyzing and visualizing the Clickstream data.

### Web console

This solution provides a simple web console which allows you to create and manage projects with their data pipeline to ingest, process, analyze and visualize the Clickstream data.

### SDKs

This solution provides native SDKs for help you easily collect and report in-app events from your applications to your Clickstream pipelines.

- [Android SDK][clickstream -andriod]
- [Swift SDK][clickstream-swift]

### Data pipeline

This solution uses the web console to manage the project and its data pipeline. The data pipeline consists of four modules.

#### Ingestion module

The ingestion module serves as web server for ingesting the Clickstream data. It supports the following features:

- specify the auto scaling group capability
- specify warm pool size to scale out faster and save costs
- support authenticate with OIDC
- support SSL
- support enabling AWS Global Accelerator for ELB
- support different sink buffer, S3, KDS and MSK

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

The data modeling module loads the processed data into data lakehouse. It supports the following features:

- support both provisioned Redshift and Redshift Serverless as data warehouse
  - support the data range for hot data keeping in Redshift
  - specify the interval to update user dimension table
- support use Athena to query the data in data lake

#### Reporting module

The reporting module queries the data in Redshift with out-of-the-box Clickstream reports.

[clickstream-swift]: https://github.com/awslabs/clickstream-swift
[clickstream -andriod]: https://github.com/awslabs/clickstream-android
