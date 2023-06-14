## Plugin description

The `custom-enrich` plugin enrich the query parameter `customAppName` in uri into `event_params` array.

E.g. Input data:

```json
{

    "uri": "/collect?customAppName=name1&appId=uba-app&compression=gzip&event_bundle_sequence_id=12",

    "event_params": [
        {
            "key": "test",
            "value": {
                "double_value": "123.4",
                "float_value": "1.23",
                "int_value": "123",
                "string_value": "test string"
            }
        },
        {
            "key": "_traffic_source_medium",
            "value": {
                "string_value": "TSM"
            }
        }
    
    ]
}

```

After transform, the data:

```json
{

    "uri": "/collect?customAppName=name1&appId=uba-app&compression=gzip&event_bundle_sequence_id=12",

    "event_params": [
        {
            "key": "test",
            "value": {
                "double_value": "123.4",
                "float_value": "1.23",
                "int_value": "123",
                "string_value": "test string"
            }
        },
        {
            "key": "_traffic_source_medium",
            "value": {
                "string_value": "TSM"
            }
        },

        {
            "key": "customAppName",
            "value": {
                "string_value": "name1"
            }
        }
    
    ]
}
```

## Build custom plugin jar

```sh
cd custom-enrich/

./gradlew clean build


```

## Custom plugin jar file

```sh

ls -l ./build/libs/custom-enrich-1.0.0.jar

```

## Plugin class name

```java
com.example.clickstream.CustomUriEnrich

```

## Use Plugin in solution

Please refer the [deployment guide](../../../docs/en/pipeline-mgmt/data-processing/configure-plugin.md).

## Use Plugin in solution (update cloudformation directly)

1. Upload this plugin jar file to your S3 bucket, e.g.:  `s3://<bucket>/pipeline/jars/custom-enrich-1.0.0.jar`

2. Update ETL cloudformation parameters:

| Parameter name | Value |
| ------ | ------ |
|**Class name list for plugins** |`software.aws.solution.clickstream.Transformer,com.example.clickstream.CustomUriEnrich,software.aws.solution.clickstream.UAEnrichment,software.aws.solution.clickstream.IPEnrichment`|
|**Plugin jars**|`s3://<bucket>/pipeline/jars/custom-enrich-1.0.0.jar`|

## Run Test

- Run test

```sh
./gradlew clean test --info

```