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

import org.apache.flink.connector.kinesis.sink.KinesisStreamsSink;
import org.apache.flink.streaming.connectors.kinesis.FlinkKinesisConsumer;
import org.apache.logging.log4j.Level;
import org.apache.logging.log4j.core.config.Configurator;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.io.IOException;

import static software.aws.solution.clickstream.flink.BaseFlinkTest.TMP_GEO_LITE_2_CITY_MMDB;

public class StreamSourceAndSinkProviderImplTest {
    @BeforeEach
    public void beforeEach() {
        Configurator.setRootLevel(Level.WARN);
        Configurator.setLevel("software.aws.solution.clickstream", Level.DEBUG);
    }

    private static final String[] args = new String[]{
            "_",
            TMP_GEO_LITE_2_CITY_MMDB,
            "arn:aws:kinesis:us-east-1:123456789012:stream/testStream",
            "project1",
            "{\"appIdStreamMap\":[" +
                    "{\"appId\":\"app1\",\"streamArn\":\"arn:aws:kinesis:us-east-1:123456789012:stream/app1Sink\",\"enabled\":true}" +
                    ",{\"appId\":\"app2\",\"streamArn\":\"arn:aws:kinesis:us-east-1:123456789012:stream/app2Sink\",\"enabled\":true}" +
                    ",{\"appId\":\"app3\",\"streamArn\":\"arn:aws:kinesis:us-east-1:123456789012:stream/app2Sink\",\"enabled\":false}" +
                    "]}"
    };

    @Test
    void testCreateSource() throws IOException {
        var props = ApplicationParameters.loadApplicationParameters(args, true);
        StreamSourceAndSinkProvider provider = new StreamSourceAndSinkProviderImpl(props);
        var source = provider.createSource();
        Assertions.assertInstanceOf(FlinkKinesisConsumer.class, source);
    }

    @Test
    void testCreateSink() throws IOException {
        var props = ApplicationParameters.loadApplicationParameters(args, true);
        StreamSourceAndSinkProvider provider = new StreamSourceAndSinkProviderImpl(props);
        var sink = provider.createSink("app1");
        Assertions.assertInstanceOf(KinesisStreamsSink.class, sink);
    }
}
