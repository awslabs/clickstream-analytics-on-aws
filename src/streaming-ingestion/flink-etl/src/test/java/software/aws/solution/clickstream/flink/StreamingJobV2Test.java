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
import org.testcontainers.shaded.com.fasterxml.jackson.databind.ObjectMapper;
import software.aws.solution.clickstream.common.EventParser;
import software.aws.solution.clickstream.common.model.ClickstreamEvent;
import software.aws.solution.clickstream.flink.mock.MockKinesisSink;
import software.aws.solution.clickstream.flink.mock.SourceFunctionMock;

import java.io.File;
import java.io.IOException;
import java.io.InputStream;
import java.util.List;
import java.util.Objects;

import static org.apache.commons.io.FileUtils.copyInputStreamToFile;

@Slf4j
public class StreamingJobV2Test extends BaseFlinkTest {
    private static final String[] args = new String[]{
            "_",
            TMP_GEO_LITE_2_CITY_MMDB,
            "arn:aws:kinesis:us-east-1:123456789012:stream/testStream",
            "project1",
            "{\"appIdStreamMap\":[" +
                    "{\"appId\":\"app1\",\"streamArn\":\"arn:aws:kinesis:us-east-1:123456789012:stream/app1Sink\"}" +
                    ",{\"appId\":\"app2\",\"streamArn\":\"arn:aws:kinesis:us-east-1:123456789012:stream/app2Sink\"}" +
                    "]}",
            "v2",
            getRuleConfigPath(),
            "IP|UA|TRAFFIC"

    };

    private static String getRuleConfigPath() {
        String path = Objects.requireNonNull(StreamingJobV2Test.class.getResource("/ts/rules/app1/traffic_source_category_rule_v1.json")).toString();
        return path.split(":")[1].replace("app1/traffic_source_category_rule_v1.json", "");
    }

    private String[] getTestArgs(boolean withCustomParameters, double allowRetentionHours, String allowEventList) {
        return new String[]{
                "_",
                TMP_GEO_LITE_2_CITY_MMDB,
                "arn:aws:kinesis:us-east-1:123456789012:stream/testStream",
                "project1",
                "{\"appIdStreamMap\":[" +
                        "{\"appId\":\"app1\",\"streamArn\":\"arn:aws:kinesis:us-east-1:123456789012:stream/app1Sink\"}" +
                        ",{\"appId\":\"app2\",\"streamArn\":\"arn:aws:kinesis:us-east-1:123456789012:stream/app2Sink\"}" +
                        "]}",
                "v2",
                getRuleConfigPath(),
                "IP|UA|TRAFFIC",
                withCustomParameters + "",  // WithCustomParameters
                allowRetentionHours + "", // allowRetentionHours
                allowEventList, // AllowEventList
                "clickstream" // TransformerName
        };
    }

    private String[] getTestArgs(String parserName, boolean withCustomParameters, double allowRetentionHours, String allowEventList, boolean enableWindowAgg) {
        return new String[]{
                "_",
                TMP_GEO_LITE_2_CITY_MMDB,
                "arn:aws:kinesis:us-east-1:123456789012:stream/testStream",
                "project1",
                "{\"appIdStreamMap\":[" +
                        "{\"appId\":\"app1\",\"streamArn\":\"arn:aws:kinesis:us-east-1:123456789012:stream/app1Sink\"}" +
                        ",{\"appId\":\"app2\",\"streamArn\":\"arn:aws:kinesis:us-east-1:123456789012:stream/app2Sink\"}" +
                        "]}",
                "v2",
                getRuleConfigPath(),
                "IP|UA|TRAFFIC",
                withCustomParameters + "",  // WithCustomParameters
                allowRetentionHours + "", // allowRetentionHours
                allowEventList, // AllowEventList
                parserName, // TransformerName
                "10", // windowSlideMinutes
                "60", // windowSizeMinutes
                enableWindowAgg + "", // enableWindowAgg
                "ALL" // "eventAndUserCount" //"ALL" // windowAggTypes
        };
    }

    private String[] getTestArgs(String parserName, boolean withCustomParameters, double allowRetentionHours,
                                 String allowEventList, boolean enableWindowAgg, boolean enableStreamIngestion) {

        return new String[]{
                "_",
                TMP_GEO_LITE_2_CITY_MMDB,
                "arn:aws:kinesis:us-east-1:123456789012:stream/testStream",
                "project1",
                "{\"appIdStreamMap\":[" +
                        "{\"appId\":\"app1\",\"streamArn\":\"arn:aws:kinesis:us-east-1:123456789012:stream/app1Sink\"}" +
                        ",{\"appId\":\"app2\",\"streamArn\":\"arn:aws:kinesis:us-east-1:123456789012:stream/app2Sink\"}" +
                        "]}",
                "v2",
                getRuleConfigPath(),
                "IP|UA|TRAFFIC",
                withCustomParameters + "",  // WithCustomParameters
                allowRetentionHours + "", // allowRetentionHours
                allowEventList, // AllowEventList
                parserName, // TransformerName
                "10", // windowSlideMinutes
                "60", // windowSizeMinutes
                enableWindowAgg + "", // enableWindowAgg
                "ALL", // windowAggTypes
                enableStreamIngestion + "" // enableStreamIngestion

        };
    }

    private String[] getTestArgsForMultiApps() {
        return new String[]{
                "_",
                TMP_GEO_LITE_2_CITY_MMDB,
                "arn:aws:kinesis:us-east-1:123456789012:stream/testStream",
                "project1",
                "{\"appIdStreamMap\":[" +
                        "{\"appId\":\"app1\",\"streamArn\":\"arn:aws:kinesis:us-east-1:123456789012:stream/app1Sink\"}" +
                        ",{\"appId\":\"app2\",\"streamArn\":\"arn:aws:kinesis:us-east-1:123456789012:stream/app2Sink\"}" +
                        ",{\"appId\":\"app3\",\"streamArn\":\"arn:aws:kinesis:us-east-1:123456789012:stream/app3Sink\"}" +
                        ",{\"appId\":\"app4\",\"streamArn\":\"arn:aws:kinesis:us-east-1:123456789012:stream/app4Sink\"}" +
                        ",{\"appId\":\"app5\",\"streamArn\":\"arn:aws:kinesis:us-east-1:123456789012:stream/app5Sink\"}" +
                        "]}",
                "v2",
                getRuleConfigPath(),
                "IP|UA|TRAFFIC",
                "true",  // WithCustomParameters
                "1", // allowRetentionHours
                "ALL", // AllowEventList
                "clickstream" // TransformerName
        };
    }

    @Test
    void testExecuteStreamJob_app1() throws Exception {
        // ./gradlew clean test --info --tests software.aws.solution.clickstream.flink.StreamingJobV2Test.testExecuteStreamJob_app1

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

        EventParser eventParser = StreamingJob.getEventParser(props);

        StreamingJob steamingJob = new StreamingJob(env, streamSourceAndSinkProviderMock, props, eventParser);
        steamingJob.executeStreamJob();
        env.execute("test");

        List<String> app1Result = MockKinesisSink.appValues.get("app1");

        String resultJson = app1Result.stream().filter(s -> s.contains("bde86c46b0594297d753f3d42cff1834")).findFirst().get();

        String expectedStr = resourceFileAsString("/event_v2/expected/app1-0.json");

        Assertions.assertEquals(expectedStr, removeDynamicFields(prettyJson(resultJson)));
    }

    @Test
    void testExecuteStreamJob_app2() throws Exception {
        // ./gradlew clean test --info --tests software.aws.solution.clickstream.flink.StreamingJobV2Test.testExecuteStreamJob_app2

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

        EventParser eventParser = StreamingJob.getEventParser(props);

        StreamingJob steamingJob = new StreamingJob(env, streamSourceAndSinkProviderMock, props, eventParser);
        steamingJob.executeStreamJob();
        env.execute("test");

        List<String> app1Result = MockKinesisSink.appValues.get("app2");

        String resultJson = app1Result.stream().filter(s -> s.contains("3516b363c97fad46902c293783d209ed")).findFirst().get();

        String expectedStr = resourceFileAsString("/event_v2/expected/app2-0.json");

        Assertions.assertEquals(expectedStr, removeDynamicFields(prettyJson(resultJson)));
    }


    @Test
    void testExecuteStreamJob_badData() throws Exception {
        // ./gradlew clean test --info --tests software.aws.solution.clickstream.flink.StreamingJobV2Test.testExecuteStreamJob_badData

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

        EventParser eventParser = StreamingJob.getEventParser(props);

        StreamingJob steamingJob = new StreamingJob(env, streamSourceAndSinkProviderMock, props, eventParser);
        steamingJob.executeStreamJob();
        env.execute("test");

        List<String> app1Result = MockKinesisSink.appValues.get("app1");

        Assertions.assertEquals(1, app1Result.size());
    }

    @Test
    void testExecuteStreamJob_allow_event_list() throws Exception {
        // ./gradlew clean test --info --tests software.aws.solution.clickstream.flink.StreamingJobV2Test.testExecuteStreamJob_allow_event_list

        var args = getTestArgs(false, Integer.MAX_VALUE, "PageView3,PageView4");
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

        EventParser eventParser = StreamingJob.getEventParser(props);

        StreamingJob steamingJob = new StreamingJob(env, streamSourceAndSinkProviderMock, props, eventParser);
        steamingJob.executeStreamJob();
        env.execute("test");

        List<String> app1Result = MockKinesisSink.appValues.get("app2");
        String resultJson = app1Result.stream().filter(s -> s.contains("3516b363c97fad46902c293783d209ed")).findFirst().get();
        ObjectMapper objectMapper = new ObjectMapper();
        ClickstreamEvent event = objectMapper.readValue(resultJson, ClickstreamEvent.class);
        Assertions.assertTrue(resultJson.contains("\"custom_parameters\""));
        Assertions.assertNull(event.getCustomParameters());
    }

    @Test
    void testExecuteStreamJob_allow_event_list2() throws Exception {
        // ./gradlew clean test --info --tests software.aws.solution.clickstream.flink.StreamingJobV2Test.testExecuteStreamJob_allow_event_list2

        var args = getTestArgs(false, Integer.MAX_VALUE, "NoEvent1");
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

        EventParser eventParser = StreamingJob.getEventParser(props);

        StreamingJob steamingJob = new StreamingJob(env, streamSourceAndSinkProviderMock, props, eventParser);
        steamingJob.executeStreamJob();
        env.execute("test");

        List<String> app1Result = MockKinesisSink.appValues.get("app2");
        Assertions.assertNull(app1Result);
    }


    @Test
    void testExecuteStreamJob_allow_event_list3() throws Exception {
        // ./gradlew clean test --info --tests software.aws.solution.clickstream.flink.StreamingJobV2Test.testExecuteStreamJob_allow_event_list3
        var args = getTestArgs("clickstream", false, 10.5, "PageView3,PageView4", false);
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

        EventParser eventParser = StreamingJob.getEventParser(props);

        StreamingJob steamingJob = new StreamingJob(env, streamSourceAndSinkProviderMock, props, eventParser);
        steamingJob.executeStreamJob();
        env.execute("test");

        List<String> app1Result = MockKinesisSink.appValues.get("app2");
        Assertions.assertNull(app1Result);
    }

    @Test
    void testExecuteStreamJob_allow_event_enableWindow() throws Exception {
        // ./gradlew clean test --info --tests software.aws.solution.clickstream.flink.StreamingJobV2Test.testExecuteStreamJob_allow_event_enableWindow

        var args = getTestArgs("clickstream", false, 10.5, "PageView3,PageView4", true);
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

        EventParser eventParser = StreamingJob.getEventParser(props);

        StreamingJob steamingJob = new StreamingJob(env, streamSourceAndSinkProviderMock, props, eventParser);
        steamingJob.executeStreamJob();
        env.execute("test");

        List<String> app1Result = MockKinesisSink.appValues.get("app2");
        Assertions.assertNull(app1Result);
    }

    @Test
    void testExecuteStreamJob_allow_event_disableStreamIngestion() throws Exception {
        // ./gradlew clean test --info --tests software.aws.solution.clickstream.flink.StreamingJobV2Test.testExecuteStreamJob_allow_event_disableStreamIngestion

        var args = getTestArgs("clickstream", false, 10.5, "ALL",
                true, false);

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

        EventParser eventParser = StreamingJob.getEventParser(props);

        StreamingJob steamingJob = new StreamingJob(env, streamSourceAndSinkProviderMock, props, eventParser);
        steamingJob.executeStreamJob();
        env.execute("test");

        List<String> app1Result = MockKinesisSink.appValues.get("app2");
        Assertions.assertNull(app1Result);
    }


    @Test
    void testExecuteStreamJob_allow_event_list_gtm() throws Exception {
        // ./gradlew clean test --info --tests software.aws.solution.clickstream.flink.StreamingJobV2Test.testExecuteStreamJob_allow_event_list_gtm

        var args = getTestArgs("gtm", false, Integer.MAX_VALUE, "_profile_set", false);
        var props = ApplicationParameters.loadApplicationParameters(args, true);
        var streamSourceAndSinkProviderMock = new StreamSourceAndSinkProvider() {
            @Override
            public SourceFunction<String> createSource() {
                return new SourceFunctionMock("/gtm_data_app1.json");
            }

            @Override
            public Sink<String> createSink(String appId) {
                return new MockKinesisSink(appId);
            }
        };

        env.setRestartStrategy(RestartStrategies.noRestart());

        EventParser eventParser = StreamingJob.getEventParser(props);

        StreamingJob steamingJob = new StreamingJob(env, streamSourceAndSinkProviderMock, props, eventParser);
        steamingJob.executeStreamJob();
        env.execute("test");

        List<String> app1Result = MockKinesisSink.appValues.get("app1");
        Assertions.assertTrue(app1Result.get(0).contains("\"event_name\":\"_profile_set\""));
    }

    @Test
    void testExecuteStreamJob_allow_event_list_sensors() throws Exception {
        // ./gradlew clean test --info --tests software.aws.solution.clickstream.flink.StreamingJobV2Test.testExecuteStreamJob_allow_event_list_sensors

        var args = getTestArgs("sensors", false, Integer.MAX_VALUE, "$AppViewScreen", false);
        var props = ApplicationParameters.loadApplicationParameters(args, true);
        var streamSourceAndSinkProviderMock = new StreamSourceAndSinkProvider() {
            @Override
            public SourceFunction<String> createSource() {
                return new SourceFunctionMock("/sensors_data_app1.json");
            }

            @Override
            public Sink<String> createSink(String appId) {
                return new MockKinesisSink(appId);
            }
        };

        env.setRestartStrategy(RestartStrategies.noRestart());

        EventParser eventParser = StreamingJob.getEventParser(props);

        StreamingJob steamingJob = new StreamingJob(env, streamSourceAndSinkProviderMock, props, eventParser);
        steamingJob.executeStreamJob();
        env.execute("test");

        List<String> app1Result = MockKinesisSink.appValues.get("app1");
        Assertions.assertTrue(app1Result.get(0).contains("\"event_name\":\"$AppViewScreen\""));
    }


    @Test
    void theClusterCanBeStartedForMultiApps() throws Exception {
        // ./gradlew clean test --info --tests software.aws.solution.clickstream.flink.StreamingJobV2Test.theClusterCanBeStartedForMultiApps
        setupRuleFiles(List.of("app3", "app4", "app5"));
        var args = getTestArgsForMultiApps();
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

        EventParser eventParser = StreamingJob.getEventParser(props);

        StreamingJob steamingJob = new StreamingJob(env, streamSourceAndSinkProviderMock, props, eventParser);
        steamingJob.executeStreamJob();
        env.execute("test");
    }

    private void setupRuleFiles(List<String> appList) throws IOException {
        appList.forEach(app -> {
            InputStream channelRuleIn = this.getClass().getResourceAsStream("/ts/rules/app1/traffic_source_channel_rule_v1.json");
            String channelRulePath = this.getClass().getResource("/ts/rules/app1/traffic_source_channel_rule_v1.json").toString()
                    .replace("app1", app).replace("file:", "");
            try {
                copyInputStreamToFile(channelRuleIn, new File(channelRulePath));
                channelRuleIn.close();
            } catch (IOException e) {
                throw new RuntimeException(e);
            }

            InputStream categoryRuleIn = this.getClass().getResourceAsStream("/ts/rules/app1/traffic_source_category_rule_v1.json");
            String categoryRulePath = this.getClass().getResource("/ts/rules/app1/traffic_source_category_rule_v1.json").toString()
                    .replace("app1", app).replace("file:", "");
            try {
                copyInputStreamToFile(categoryRuleIn, new File(categoryRulePath));
                categoryRuleIn.close();
            } catch (IOException e) {
                throw new RuntimeException(e);
            }
        });

    }


}
