# Data ingestion 

Data ingestion module contains a web service that provides an endpoint to collect data through HTTP/HTTPS requests, which mainly is composed of Amazon Application Load Balancer and Amazon Elastic Container Service. It also supports sinking data into a stream service or S3 directly. 

You can create a data ingestion module with the following settings:

* [Ingestion endpoint settings](./configure-ingestion-endpoint.md): Create a web service as an ingestion endpoint to collect data sent from your SDKs.

* Data sink settings: Configure how the solution sinks the data for downstream consumption. Currently, the solution supports three types of data sink:
    - [Apache Kafka](./create-data-sink-w-kafka.md)
    - [Amazon S3](./create-data-sink-w-s3.md)
    - [Amazon Kinesis Data Stream (KDS)](./create-data-sink-w-kinesis.md)



