# Change Log

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] - 2023-12-08

### Web Console and Data pipeline

#### Added

* support self-hosted Apache Kafka cluster
* add resource awareness to the Data Processing scheduler
* add user roles management
* add metadata scanning workflow
* add third-party transform plug-in: GTM Server Side plug-in

#### Changed

* update the ingestion configuration of the existing data pipeline
* data schema updates
* update out-of-box reporting dashboards
* improve pipeline status management
* improve the reliability of service availability checks

#### Fixed

* check the incorrect configuration of NAT gateway or VPC endpoints for data pipeline
* gracefully handle with the incomplete user profile

### SDK

#### Added

* add Flutter SDK
* add Wechat Miniprogram SDK

### Analytics Studio

#### Added

* Dashboard
* Explore
* Analyzes
* Data management

## [1.0.3] - 2023-10-30

### Fixed

- the creation of reporting stack failure

## [1.0.2] - 2023-08-31

### Fixed

- schema 'items' type for data modeling
- create Athena stack when disabling Redshift in pipeline
- inconsistently set the warm pool size
- can not update endpoint path of ingestion sever
- cors not working when specifying specific domain(s)
- let domain name pattern comply with TLD standard
- web sdk integration guide
- UI spell typo

## [1.0.1] - 2023-07-24

### Fixed

- can not update interval of data processing in the existing pipeline
- can not update the CORS configuration of the existing pipeline
- incorrectly check the QuickSight availability in China regions
- can not retry when putting events into KDS throttled
- time filter does not work for the visuals of device and retention reports
- increase the timeout to avoid some stacks left after deleting the project
- the typos in web console UI
- incorrect plugin descriptions in web console
- remove broken and duplicated links in navigation bar of web console
- set the default compression option as true for SDK configuration files

## [1.0.0] - 2023-07-07

### Added

- All files, initial version
