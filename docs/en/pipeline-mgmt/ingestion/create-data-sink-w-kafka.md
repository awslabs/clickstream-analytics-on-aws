# Apache Kafka
This data sink will stream the clickstream data collected by the ingestion endpoint into an topic in a Kafka cluster.
Currently, solution support Amazon Managed Streaming for Apache Kafka (Amazon MSK).

## Amazon MSK
* **Select an existing Amazon MSK cluster.** Select an MSK cluster from the drop-down list, the MSK cluster needs to meet the following requirements:
    * MSK cluster and this solution need to be in the same VPC
    * Enable **Unauthenticated access** in Access control methods
    * Enable **Plaintext** in Encryption
    * Set **auto.create.topics.enable** as `true` in MSK cluster configuration. This configuration sets whether MSK cluster can create topic automatically. Or You need to create the specific topic in your Kafka cluster before creating the data pipeline.
    * The value of **default.replication.factor** cannot be larger than the number of MKS cluster brokers
    
    **Note**: If there is no MSK cluster, the user needs to create an MSK Cluster follow above requirements.

* **Topic**: The user can specify a topic name. By default, the solution will create a topic with "project-id".

<!-- ## Self-hosted:
Users can also use self-hosted Kafka clusters. In order to integrate the solution with Kafka clusters, provide the following configurations:

* **Broker link**: Enter the  brokers link of Kafka cluster that you wish to connect to.
* **Topic**: User can specify the topic for storing the data
* **Security Group**: This VPC security group defines which subnets and IP ranges can access the Kafka cluster. -->

## Connector
Enable solution to create Kafka connector and a custom plugin for this connector. This connector will sink the data from Kafka cluster to S3 bucket.

## Additional Settings:
* **Sink maximum interval**: Specifies the maximum length of time (in seconds) that records should be buffered before streaming to the AWS service.
* **Batch size**: The maximum number of records to deliver in a single batch.


