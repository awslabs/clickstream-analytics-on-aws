# Amazon S3
In this option, clickstream data is buffered in the memory of ingestion Server, then sink into a S3 bucket. This option provides the best cost-performance in case real-time data consumption is not required. 

!!! note "Note"
    Unlike Kafka and KDS data sink, this option buffers data in the ingestion server and responses 200 code to SDK client before sink into S3, so there is chance data could be lost while ingestion server fails and auto-scaled machine is in the process of creation. But it is worth to note that this probability is very low because of the High-availability design of the solution.

* **S3 URI**: You can select an amazon s3 bucket. The data will be sank into this bucket.
* **S3 prefix**: By default, the solution adds prefix of "<project_id>/YYYY/MM/dd/HH" (in UTC) to the data files when delivered to S3. You can provide additional prefix which will be added before <project_id>.
* **Buffer size**: Specify the data size to buffer before sending to Amazon S3. The higher buffer size may be lower in cost with higher latency, the lower buffer size will be faster in delivery with higher cost. Min: 1 MiB, Max: 50 MiB
* **Buffer interval**: Specify the max interval (second) for saving buffer to S3. The higher interval allows more time to collect data and the size of data may be bigger. The lower interval sends the data more frequently and may be more advantageous when looking at shorter cycles of data activity. Min: 60 Second, Max: 3600 Second