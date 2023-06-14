# Amazon Kinesis Data Stream
This data sink will stream the clickstream data collected by the ingestion endpoint into KDS. The solution will create a KDS in your AWS account based on your specifications.

## Provision mode
Two modes are available: **On-demand** and **Provisioned**

* **On-demand**: In this mode, KDS shards are provisioned based on the workshop automatically. On-demand mode is suited for workloads with unpredictable and highly-variable traffic patterns. 

* **Provisioned**: In this mode, KDS shards are set at creation. The provisioned mode is suited for predictable traffic with capacity requirements that are easy to forecast. You can also use the provisioned mode if you want fine-grained control over how data is distributed across shards. 
    * Shard number: With the provisioned mode, you must specify the number of shards for the data stream.  For more information about shard, please refer to [provisioned mode](https://docs.aws.amazon.com/streams/latest/dev/how-do-i-size-a-stream.html#provisionedmode)

## Addtional Settings
* **Sink maximum interval**: With this configuration, you can specify the maximum interval (in seconds) that records should be buffered before streaming to the AWS service.
* **Batch size**: With this configuration, you can specify the maximum number of records to deliver in a single batch.