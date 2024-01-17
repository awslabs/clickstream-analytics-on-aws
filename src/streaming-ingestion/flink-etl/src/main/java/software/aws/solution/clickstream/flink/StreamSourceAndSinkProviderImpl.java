/**
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *
 *  Licensed under the Apache License, Version 2.0 (the "License"). You may not use this file except in compliance
 *  with the License. A copy of the License is located at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 *  or in the 'license' file accompanying this file. This file is distributed on an 'AS IS' BASIS, WITHOUT WARRANTIES
 *  OR CONDITIONS OF ANY KIND, express or implied. See the License for the specific language governing permissions
 *  and limitations under the License.
 */

package software.aws.solution.clickstream.flink;

import lombok.extern.slf4j.Slf4j;
import org.apache.flink.api.common.serialization.SimpleStringSchema;
import org.apache.flink.api.connector.sink2.Sink;
import org.apache.flink.connector.aws.config.AWSConfigConstants;
import org.apache.flink.connector.kinesis.sink.KinesisStreamsSink;
import org.apache.flink.streaming.api.functions.source.SourceFunction;
import org.apache.flink.streaming.connectors.kinesis.FlinkKinesisConsumer;

import java.util.Properties;

import static org.apache.flink.streaming.connectors.kinesis.config.ConsumerConfigConstants.STREAM_INITIAL_POSITION;

@Slf4j
public class StreamSourceAndSinkProviderImpl implements StreamSourceAndSinkProvider {
    private final ApplicationParameters props;

    public StreamSourceAndSinkProviderImpl(final ApplicationParameters props) {
        this.props = props;

    }

    @Override
    public SourceFunction<String> createSource() {
        // Properties for Amazon Kinesis Data Streams Source, we need to specify from where we want to consume the data.
        // STREAM_INITIAL_POSITION: LATEST: consume messages that have arrived from the moment application has been deployed
        // STREAM_INITIAL_POSITION: TRIM_HORIZON: consume messages starting from first available in the Kinesis Stream

        Properties kinesisConsumerConfig = new Properties();
        kinesisConsumerConfig.put(AWSConfigConstants.AWS_REGION, props.getRegion());
        kinesisConsumerConfig.put(STREAM_INITIAL_POSITION, "LATEST");
        log.info("createKinesisSource InputStreamName: {}", props.getInputStreamName());

        return new FlinkKinesisConsumer<>(props.getInputStreamName(), new SimpleStringSchema(), kinesisConsumerConfig);
    }

    @Override
    public Sink<String> createSink(final String appId) {
        Properties sinkProperties = new Properties();
        // Required
        sinkProperties.put(AWSConfigConstants.AWS_REGION, props.getRegion());
        String sinkStreamName = props.getSinkStreamNameByAppId(appId);
        log.info("createSink appId: {}, sinkStreamName: {}", appId, sinkStreamName);

        return KinesisStreamsSink.<String>builder()
                .setKinesisClientProperties(sinkProperties)
                .setSerializationSchema(new SimpleStringSchema())
                .setPartitionKeyGenerator(element -> String.valueOf(element.hashCode()))
                .setStreamName(sinkStreamName)
                .build();
    }
}
