# 摄取

摄取模块包含一个 Web 服务，它提供通过 HTTP/HTTPS 请求收集数据的端点，主要由 Amazon 应用程序负载均衡器和 Amazon 弹性容器服务组成。它还支持将数据直接汇入到流服务或 S3。

您可以使用以下设置创建一个摄取模块：

* [摄取端点设置](./configure-ingestion-endpoint.md)：创建一个 Web 服务作为摄取端点，以收集从 SDK 发送的数据。

* 数据宿设置：配置解决方案如何为下游消费者接收数据。目前，解决方案支持三种类型的数据宿：
    - [Apache Kafka](./create-data-sink-w-kafka.md)
    - [Amazon S3](./create-data-sink-w-s3.md)
    - [Amazon Kinesis Data Stream (KDS)](./create-data-sink-w-kinesis.md)