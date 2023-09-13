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

import org.apache.flink.api.java.utils.ParameterTool;
import org.apache.flink.streaming.api.datastream.DataStream;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;

import java.io.File;
import java.util.Objects;

import static org.junit.jupiter.api.Assertions.assertTrue;

public class StreamingJobTest extends BaseFlinkTest{

    @Mock
    private ParameterTool applicationProperties;

    @Test
    public void testOriginalDataFromFile() throws Exception {
        String[] args = new String[] {
                "--projectId",
                "project1",
                "--appId",
                "app1",
                "--kinesis.source.stream",
                "Clickstream_project1_4a4326c0",
                "--kinesis.sink.stream",
                "clickstream_project1_app1_sink_1f5427f0",
                "--kinesis.region",
                "us-east-1"
        };
        applicationProperties = StreamingJob.loadApplicationParameters(args, env);
      MockKinesisSink sink = new MockKinesisSink();
        StreamingJob.runWithFlink(args,
                env,
                applicationProperties,
                getDataStreamFromFile("original_data.json"),
                sink);
        System.out.println("sink.values:"+sink.values.size());
        assertTrue(sink.values.size() == 100);
    }

    @Test
    public void testOriginalDataFromElement() throws Exception {
        String[] args = new String[] {
                "--projectId",
                "project1",
                "--appId",
                "app1",
                "--kinesis.source.stream",
                "Clickstream_project1_4a4326c0",
                "--kinesis.sink.stream",
                "clickstream_project1_app1_sink_1f5427f0",
                "--kinesis.region",
                "us-east-1"
        };
        applicationProperties = StreamingJob.loadApplicationParameters(args, env);
        MockKinesisSink sink = new MockKinesisSink();
        StreamingJob.runWithFlink(args,
                env,
                applicationProperties,
                getDataStreamFromElement(null),
                sink);
        System.out.println("sink.values:"+sink.values.size());
        assertTrue(sink.values.size() == 50);
    }

    private DataStream<String> getDataStreamFromFile(String resourceName) {
        ClassLoader classLoader = getClass().getClassLoader();
        File file = new File(Objects.requireNonNull(classLoader.getResource(resourceName)).getFile());
        String absolutePath = file.getAbsolutePath();
        return env.readTextFile(absolutePath);
    }

    private DataStream<String> getDataStreamFromElement(String[] elements) {
        if (elements == null) {
            elements = new String[] {
                    "{\"appId\":\"app1\",\"compression\":\"gzip\",\"data\":\"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\",\"date\":\"2024-01-03T23:58:02+00:00\",\"fakeIp\":\"109.167.27.30\",\"ingest_time\":1704326584236,\"ip\":\"3.141.3.4\",\"method\":\"POST\",\"path\":\"/collect\",\"platform\":\"Android\",\"rid\":\"8595bd597399fe5d0cd3f3eac76ade2a\",\"server_ingest_time\":1704326282000,\"source_type\":\"http_server\",\"timestamp\":\"2024-01-03T23:58:02.699845087Z\",\"ua\":\"python-requests/2.25.1\",\"uri\":\"/collect?platform=Android&appId=app1&compression=gzip&fakeIp=109.167.27.30&event_bundle_sequence_id=657995\"}"
            };
        }
        return env.fromElements(elements);
    }

}
