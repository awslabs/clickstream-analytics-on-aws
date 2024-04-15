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
import org.apache.flink.api.common.restartstrategy.RestartStrategies;
import org.apache.flink.api.connector.sink2.Sink;
import org.apache.flink.streaming.api.functions.source.SourceFunction;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;
import org.mockito.*;
import org.testcontainers.shaded.com.fasterxml.jackson.databind.JsonNode;
import org.testcontainers.shaded.com.fasterxml.jackson.databind.ObjectMapper;
import software.aws.solution.clickstream.flink.mock.MockKinesisSink;
import software.aws.solution.clickstream.flink.mock.SourceFunctionMock;

import java.util.List;

@Slf4j
public class StreamingJobTest extends BaseFlinkTest {
    private static final String[] args = new String[]{
            "_",
            TMP_GEO_LITE_2_CITY_MMDB,
            "arn:aws:kinesis:us-east-1:123456789012:stream/testStream",
            "project1",
            "{\"appIdStreamMap\":[" +
                    "{\"appId\":\"app1\",\"streamArn\":\"arn:aws:kinesis:us-east-1:123456789012:stream/app1Sink\",\"enabled\":true}" +
                    ",{\"appId\":\"app2\",\"streamArn\":\"arn:aws:kinesis:us-east-1:123456789012:stream/app2Sink\",\"enabled\":true}" +
                    ",{\"appId\":\"app3\",\"streamArn\":\"arn:aws:kinesis:us-east-1:123456789012:stream/app2Sink\",\"enabled\":false}" +
                    ",{\"appId\":\"sApp1\",\"streamArn\":\"arn:aws:kinesis:us-east-1:123456789012:stream/sApp1Sink\",\"enabled\":true}" +
                    "]}"
    };

    @Test
    void testExecuteStreamJob_app1() throws Exception {
        // ./gradlew clean test --info --tests software.aws.solution.clickstream.flink.StreamingJobTest.testExecuteStreamJob_app1
        System.setProperty("_LOCAL_TEST_TIME", "1707028087000");

        var props = ApplicationParameters.loadApplicationParameters(args, true);
        var streamSourceAndSinkProviderMock = new StreamSourceAndSinkProvider() {
            @Override
            public SourceFunction<String> createSource() {
                return new SourceFunctionMock("/zip_data_app1.json");
            }

            @Override
            public Sink<String> createSink(String appId) {
                return new MockKinesisSink(appId);
            }
        };

        env.setRestartStrategy(RestartStrategies.noRestart());
        StreamingJob steamingJob = new StreamingJob(env, streamSourceAndSinkProviderMock, props);
        steamingJob.executeStreamJob();
        env.execute("test");
        ObjectMapper objectMapper = new ObjectMapper();

        List<String> app1Result = MockKinesisSink.appValues.get("app1");

        String app1First = app1Result.stream().filter(s -> s.contains("1917e95b-6d75-4609-a2a0-18b45fb183c2") && s.contains("657998")).findFirst().get();

        JsonNode jsonNode = objectMapper.readTree(app1First);
        String jsonOut1 = objectMapper.writerWithDefaultPrettyPrinter().writeValueAsString(jsonNode);

        String expectedStr = resourceFileAsString("/expected/app1-0.json");
        Assertions.assertEquals(expectedStr, jsonOut1);
    }

    @Test
    void testExecuteStreamJob_zip_data_sApp1() throws Exception {
        // ./gradlew clean test --info --tests software.aws.solution.clickstream.flink.StreamingJobTest.testExecuteStreamJob_zip_data_sApp1

        var props = ApplicationParameters.loadApplicationParameters(args, true);
        var streamSourceAndSinkProviderMock = new StreamSourceAndSinkProvider() {
            @Override
            public SourceFunction<String> createSource() {
                return new SourceFunctionMock("/zip_data_sapp1.json");
            }

            @Override
            public Sink<String> createSink(String appId) {
                return new MockKinesisSink(appId);
            }
        };

        env.setRestartStrategy(RestartStrategies.noRestart());
        StreamingJob steamingJob = new StreamingJob(env, streamSourceAndSinkProviderMock, props);
        steamingJob.executeStreamJob();
        env.execute("test");

        List<String> app1Result = MockKinesisSink.appValues.get("sApp1");

        Assertions.assertEquals(5, app1Result.size());

    }

    @Test
    void testExecuteStreamJob_app2_none_zip() throws Exception {
        // ./gradlew clean test --info --tests software.aws.solution.clickstream.flink.StreamingJobTest.testExecuteStreamJob_app2_none_zip
        System.setProperty("_LOCAL_TEST_TIME", "1707028087000");

        var props = ApplicationParameters.loadApplicationParameters(args, true);
        var streamSourceAndSinkProviderMock = new StreamSourceAndSinkProvider() {
            @Override
            public SourceFunction<String> createSource() {
                return new SourceFunctionMock("/none_zip_data_app2.json");
            }

            @Override
            public Sink<String> createSink(String appId) {
                return new MockKinesisSink(appId);
            }
        };

        env.setRestartStrategy(RestartStrategies.noRestart());
        StreamingJob steamingJob = new StreamingJob(env, streamSourceAndSinkProviderMock, props);
        steamingJob.executeStreamJob();
        env.execute("test");
        ObjectMapper objectMapper = new ObjectMapper();

        List<String> appResult = MockKinesisSink.appValues.get("app2");
        Assertions.assertEquals(3, appResult.size());

        JsonNode jsonNode = objectMapper.readTree(appResult.get(0));
        String jsonOut1 = objectMapper.writerWithDefaultPrettyPrinter().writeValueAsString(jsonNode);

        String expectedStr = resourceFileAsString("/expected/app2-0.json");
        Assertions.assertEquals(expectedStr, jsonOut1);
    }


    @Test
    void testExecuteStreamJob_bad_data_should_not_crash_the_application() throws Exception {
        // ./gradlew clean test --info --tests software.aws.solution.clickstream.flink.StreamingJobTest.testExecuteStreamJob_bad_data_should_not_crash_the_application

        var props = ApplicationParameters.loadApplicationParameters(args, true);
        var streamSourceAndSinkProviderMock = new StreamSourceAndSinkProvider() {
            @Override
            public SourceFunction<String> createSource() {
                return new SourceFunctionMock("/bad_data.json");
            }

            @Override
            public Sink<String> createSink(String appId) {
                return new MockKinesisSink(appId);
            }
        };

        env.setRestartStrategy(RestartStrategies.noRestart());
        StreamingJob steamingJob = new StreamingJob(env, streamSourceAndSinkProviderMock, props);
        steamingJob.executeStreamJob();
        env.execute("test");

        Assertions.assertEquals(1, MockKinesisSink.appValues.size());
        var resultValue = MockKinesisSink.appValues.get("app1").get(0);
        System.out.println(resultValue);
        Assertions.assertTrue(resultValue.contains("\"error\":"));
    }

    @Test
    void testExecuteStreamJob_empty_config_map() throws Exception {
        // ./gradlew clean test --info --tests software.aws.solution.clickstream.flink.StreamingJobTest.testExecuteStreamJob_empty_config_map

        var args1 = new String[]{
                "_",
                TMP_GEO_LITE_2_CITY_MMDB,
                "arn:aws:kinesis:us-east-1:123456789012:stream/testStream",
                "project1",
                null,
        };

        var props = ApplicationParameters.loadApplicationParameters(args1, true);
        var streamSourceAndSinkProviderMock = new StreamSourceAndSinkProvider() {
            @Override
            public SourceFunction<String> createSource() {
                return new SourceFunctionMock("/none_zip_data_app2.json");
            }

            @Override
            public Sink<String> createSink(String appId) {
                return new MockKinesisSink(appId);
            }
        };

        env.setRestartStrategy(RestartStrategies.noRestart());
        StreamingJob steamingJob = new StreamingJob(env, streamSourceAndSinkProviderMock, props);
        boolean b = steamingJob.executeStreamJob();
        Assertions.assertFalse(b);

    }

    @Test
    void testExecuteStreamJob_get_config_error() throws Exception {
        // ./gradlew clean test --info --tests software.aws.solution.clickstream.flink.StreamingJobTest.testExecuteStreamJob_get_config_error

        var args1 = new String[]{
                "_",
                TMP_GEO_LITE_2_CITY_MMDB,
                "arn:aws:kinesis:us-east-1:123456789012:stream/testStream",
                "project1",
                "s3://testbucket/test.json"
        };

        var props = ApplicationParameters.loadApplicationParameters(args1, true);
        var streamSourceAndSinkProviderMock = new StreamSourceAndSinkProvider() {
            @Override
            public SourceFunction<String> createSource() {
                return new SourceFunctionMock("/none_zip_data_app2.json");
            }

            @Override
            public Sink<String> createSink(String appId) {
                return new MockKinesisSink(appId);
            }
        };

        env.setRestartStrategy(RestartStrategies.noRestart());
        StreamingJob steamingJob = new StreamingJob(env, streamSourceAndSinkProviderMock, props);
        boolean b = steamingJob.executeStreamJob();
        Assertions.assertFalse(b);
    }

    @Test
    void testExecuteStreamJob_get_config_json_error() throws Exception {
        // ./gradlew clean test --info --tests software.aws.solution.clickstream.flink.StreamingJobTest.testExecuteStreamJob_get_config_json_error

        var args1 = new String[]{
                "_",
                TMP_GEO_LITE_2_CITY_MMDB,
                "arn:aws:kinesis:us-east-1:123456789012:stream/testStream",
                "project1",
                "errorAppIdStreamMap"
        };
        var props = ApplicationParameters.loadApplicationParameters(args1, true);
        var streamSourceAndSinkProviderMock = new StreamSourceAndSinkProvider() {
            @Override
            public SourceFunction<String> createSource() {
                return new SourceFunctionMock("/none_zip_data_app2.json");
            }

            @Override
            public Sink<String> createSink(String appId) {
                return new MockKinesisSink(appId);
            }
        };

        env.setRestartStrategy(RestartStrategies.noRestart());
        StreamingJob steamingJob = new StreamingJob(env, streamSourceAndSinkProviderMock, props);
        boolean b = steamingJob.executeStreamJob();
        Assertions.assertFalse(b);
    }
}
