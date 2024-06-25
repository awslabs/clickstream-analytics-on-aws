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

import com.amazonaws.services.kinesisanalytics.runtime.KinesisAnalyticsRuntime;
import org.apache.logging.log4j.Level;
import org.apache.logging.log4j.core.config.Configurator;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

import java.io.IOException;
import java.util.HashMap;
import java.util.Map;
import java.util.Properties;

import static software.aws.solution.clickstream.flink.ApplicationParameters.ENVIRONMENT_PROPERTIES;
class ApplicationParametersTest {
    @BeforeEach
    public void beforeEach() {
        Configurator.setRootLevel(Level.WARN);
        Configurator.setLevel("software.aws.solution.clickstream", Level.DEBUG);
    }
    private static Properties getProperties() {
        String configText = "{\"appIdStreamMapList\":[" +
                "{\"appId\":\"app1\",\"streamArn\":\"arn:aws:kinesis:us-east-1:123456789012:stream/app1Sink\",\"enabled\":true}" +
                ",{\"appId\":\"app2\",\"streamArn\":\"arn:aws:kinesis:us-east-1:123456789012:stream/app2Sink\",\"enabled\":true}" +
                ",{\"appId\":\"app3\",\"streamArn\":\"arn:aws:kinesis:us-east-1:123456789012:stream/app2Sink\",\"enabled\":false}" +
                "]}";
        Properties props = new Properties();
        props.setProperty("inputStreamArn", "arn:aws:kinesis:us-east-1:123456789012:stream/testStream");
        props.setProperty("dataBucketName", "testBucket");
        props.setProperty("projectId", "project1");
        props.setProperty("geoFileKey", "testKey/t.txt");
        props.setProperty("appIdStreamConfig", configText);
        return props;
    }

    private static Properties getPropertiesV2() {
        String configText = "{\"appIdStreamList\":[" +
                "{\"appId\":\"app1\",\"streamArn\":\"arn:aws:kinesis:us-east-1:123456789012:stream/app1Sink\"}" +
                ",{\"appId\":\"app2\",\"streamArn\":\"arn:aws:kinesis:us-east-1:123456789012:stream/app2Sink\"}" +
                ",{\"appId\":\"app3\",\"streamArn\":\"arn:aws:kinesis:us-east-1:123456789012:stream/app2Sink\"}" +
                "]}";
        Properties props = new Properties();
        props.setProperty("inputStreamArn", "arn:aws:kinesis:us-east-1:123456789012:stream/testStream");
        props.setProperty("dataBucketName", "testBucket");
        props.setProperty("projectId", "project1");
        props.setProperty("geoFileKey", "testKey/t.txt");
        props.setProperty("appIdStreamConfig", configText);
        return props;
    }


    private static Properties getPropertiesV3() {
        String configText = "{\"appIdStreamList\":[" +
                "{\"appId\":\"app1\",\"streamArn\":\"arn:aws:kinesis:us-east-1:123456789012:stream/app1Sink\"}" +
                ",{\"appId\":\"app2\",\"streamArn\":\"arn:aws:kinesis:us-east-1:123456789012:stream/app2Sink\"}" +
                ",{\"appId\":\"app3\",\"streamArn\":\"arn:aws:kinesis:us-east-1:123456789012:stream/app2Sink\"}" +
                "]}";
        Properties props = new Properties();
        props.setProperty("inputStreamArn", "arn:aws:kinesis:us-east-1:123456789012:stream/testStream");
        props.setProperty("dataBucketName", "testBucket");
        props.setProperty("projectId", "project1");
        props.setProperty("geoFileKey", "testKey/t.txt");
        props.setProperty("appIdStreamConfig", configText);
        props.setProperty("transformVersion", "v2");
        props.setProperty("appRuleConfigPath", "s3://test/project1/rules/");
        props.setProperty("enableUaEnrich", "true");
        props.setProperty("enableIpEnrich", "true");
        props.setProperty("enableTrafficSourceEnrich", "false");

        return props;
    }

    private static Properties getPropertiesV4(String allowEvents) {
        String configText = "{\"appIdStreamList\":[" +
                "{\"appId\":\"app1\",\"streamArn\":\"arn:aws:kinesis:us-east-1:123456789012:stream/app1Sink\"}" +
                ",{\"appId\":\"app2\",\"streamArn\":\"arn:aws:kinesis:us-east-1:123456789012:stream/app2Sink\"}" +
                ",{\"appId\":\"app3\",\"streamArn\":\"arn:aws:kinesis:us-east-1:123456789012:stream/app2Sink\"}" +
                "]}";
        Properties props = new Properties();
        props.setProperty("inputStreamArn", "arn:aws:kinesis:us-east-1:123456789012:stream/testStream");
        props.setProperty("dataBucketName", "testBucket");
        props.setProperty("projectId", "project1");
        props.setProperty("geoFileKey", "testKey/t.txt");
        props.setProperty("appIdStreamConfig", configText);
        props.setProperty("transformVersion", "v2");
        props.setProperty("appRuleConfigPath", "s3://test/project1/rules/");
        props.setProperty("enableUaEnrich", "true");
        props.setProperty("enableIpEnrich", "true");
        props.setProperty("enableTrafficSourceEnrich", "false");
        props.setProperty("withCustomParameters", "false");
        props.setProperty("allowRetentionHours", "24");
        props.setProperty("allowEventList", allowEvents);

        return props;
    }

    @Test
    void testCreateApplicationParametersFromProps() throws IOException {
        // ./gradlew  test --tests  software.aws.solution.clickstream.flink.ApplicationParametersTest.testCreateApplicationParametersFromProps
        Properties props = getProperties();
        ApplicationParameters params = ApplicationParameters.fromProperties(props);

        Assertions.assertEquals("us-east-1", params.getRegion());
        Assertions.assertEquals("testBucket", params.getDataBucketName());
        Assertions.assertEquals("testKey/t.txt", params.getGeoFileKey());
        Assertions.assertEquals("arn:aws:kinesis:us-east-1:123456789012:stream/testStream", params.getInputStreamArn());
        Assertions.assertEquals("testStream", params.getInputStreamName());
        Assertions.assertEquals("project1", params.getProjectId());

        Assertions.assertEquals("arn:aws:kinesis:us-east-1:123456789012:stream/app1Sink", params.getSinkStreamArnByAppId("app1"));
        Assertions.assertEquals("arn:aws:kinesis:us-east-1:123456789012:stream/app2Sink", params.getSinkStreamArnByAppId("app2"));
        Assertions.assertNull(params.getSinkStreamArnByAppId("app5"));

        params.getAppIdStreamList().forEach(appIdStreamMap -> {

            if (appIdStreamMap.getAppId().equals("app1")) {
                Assertions.assertTrue(appIdStreamMap.isEnabled());
            }

            if (appIdStreamMap.getAppId().equals("app2")) {
                Assertions.assertTrue(appIdStreamMap.isEnabled());
            }

            if (appIdStreamMap.getAppId().equals("app3")) {
                Assertions.assertFalse(appIdStreamMap.isEnabled());
            }
        });

        Assertions.assertEquals("s3://testBucket/clickstream/project1/rules/", params.getAppRuleConfigPath());
        Assertions.assertEquals("v1", params.getTransformVersion());
    }


    @Test
    void testCreateApplicationParametersFromPropsV2() throws IOException {
        //  ./gradlew  test --tests  software.aws.solution.clickstream.flink.ApplicationParametersTest.testCreateApplicationParametersFromPropsV2
        Properties propsV2 = getPropertiesV2();
        ApplicationParameters params = ApplicationParameters.fromProperties(propsV2);

        Assertions.assertEquals("us-east-1", params.getRegion());
        Assertions.assertEquals("testBucket", params.getDataBucketName());
        Assertions.assertEquals("testKey/t.txt", params.getGeoFileKey());
        Assertions.assertEquals("arn:aws:kinesis:us-east-1:123456789012:stream/testStream", params.getInputStreamArn());
        Assertions.assertEquals("testStream", params.getInputStreamName());
        Assertions.assertEquals("project1", params.getProjectId());

        Assertions.assertEquals("arn:aws:kinesis:us-east-1:123456789012:stream/app1Sink", params.getSinkStreamArnByAppId("app1"));
        Assertions.assertEquals("arn:aws:kinesis:us-east-1:123456789012:stream/app2Sink", params.getSinkStreamArnByAppId("app2"));
        Assertions.assertNull(params.getSinkStreamArnByAppId("app5"));

        params.getAppIdStreamList().forEach(appIdStreamMap -> {
            Assertions.assertTrue(appIdStreamMap.isEnabled());
        });

        Assertions.assertEquals("s3://testBucket/clickstream/project1/rules/", params.getAppRuleConfigPath());
        Assertions.assertEquals("v1", params.getTransformVersion());
    }

    @Test
    void testCreateApplicationParametersFromRuntime() throws IOException {
        Properties props = getPropertiesV3();
        Map<String, Properties> appProperties = new HashMap<>();
        appProperties.put(ENVIRONMENT_PROPERTIES, props);

        try (var mock = Mockito.mockStatic(KinesisAnalyticsRuntime.class)) {
            mock.when(KinesisAnalyticsRuntime::getApplicationProperties).thenReturn(appProperties);

            ApplicationParameters params = ApplicationParameters.loadApplicationParameters(null, false);

            Assertions.assertEquals("us-east-1", params.getRegion());
            Assertions.assertEquals("testBucket", params.getDataBucketName());
            Assertions.assertEquals("testKey/t.txt", params.getGeoFileKey());
            Assertions.assertEquals("arn:aws:kinesis:us-east-1:123456789012:stream/testStream", params.getInputStreamArn());
            Assertions.assertEquals("testStream", params.getInputStreamName());
            Assertions.assertEquals("project1", params.getProjectId());

            Assertions.assertEquals("arn:aws:kinesis:us-east-1:123456789012:stream/app1Sink", params.getSinkStreamArnByAppId("app1"));
            Assertions.assertEquals("arn:aws:kinesis:us-east-1:123456789012:stream/app2Sink", params.getSinkStreamArnByAppId("app2"));
            Assertions.assertNull(params.getSinkStreamArnByAppId("app5"));

            Assertions.assertEquals("s3://test/project1/rules/", params.getAppRuleConfigPath());
            Assertions.assertEquals("v2", params.getTransformVersion());
        }
    }

    @Test
    void testCreateApplicationParametersFromPropsV3() throws IOException {
        //  ./gradlew  test --tests  software.aws.solution.clickstream.flink.ApplicationParametersTest.testCreateApplicationParametersFromPropsV3
        Properties propsV3 = getPropertiesV3();
        ApplicationParameters params = ApplicationParameters.fromProperties(propsV3);

        Assertions.assertEquals("us-east-1", params.getRegion());
        Assertions.assertEquals("testBucket", params.getDataBucketName());
        Assertions.assertEquals("testKey/t.txt", params.getGeoFileKey());
        Assertions.assertEquals("arn:aws:kinesis:us-east-1:123456789012:stream/testStream", params.getInputStreamArn());
        Assertions.assertEquals("testStream", params.getInputStreamName());
        Assertions.assertEquals("project1", params.getProjectId());

        Assertions.assertEquals("arn:aws:kinesis:us-east-1:123456789012:stream/app1Sink", params.getSinkStreamArnByAppId("app1"));
        Assertions.assertEquals("arn:aws:kinesis:us-east-1:123456789012:stream/app2Sink", params.getSinkStreamArnByAppId("app2"));
        Assertions.assertNull(params.getSinkStreamArnByAppId("app5"));

        params.getAppIdStreamList().forEach(appIdStreamMap -> {
            Assertions.assertTrue(appIdStreamMap.isEnabled());
        });

        Assertions.assertEquals("s3://test/project1/rules/", params.getAppRuleConfigPath());
        Assertions.assertEquals("v2", params.getTransformVersion());
        Assertions.assertTrue(params.isIpEnrich());
        Assertions.assertTrue(params.isUaEnrich());
        Assertions.assertFalse(params.isTrafficSourceEnrich());
        Assertions.assertNull(params.getAllowEventList());
        Assertions.assertTrue(params.isWithCustomParameters());
        Assertions.assertEquals(0, params.getAllowRetentionHours());
    }

    @Test
    void testCreateApplicationParametersFromPropsV4() throws IOException {
        //  ./gradlew  test --tests  software.aws.solution.clickstream.flink.ApplicationParametersTest.testCreateApplicationParametersFromPropsV4
        Properties propsV4 = getPropertiesV4("ALL");
        ApplicationParameters params = ApplicationParameters.fromProperties(propsV4);

        Assertions.assertNull(params.getAllowEventList());

        propsV4 = getPropertiesV4("");
        params = ApplicationParameters.fromProperties(propsV4);
        Assertions.assertNull(params.getAllowEventList());
    }

    @Test
    void testCreateApplicationParametersFromPropsV5() throws IOException {
        //  ./gradlew  test --tests  software.aws.solution.clickstream.flink.ApplicationParametersTest.testCreateApplicationParametersFromPropsV5
        Properties propsV4 = getPropertiesV4("ALL,CLICK,VIEW");
        ApplicationParameters params = ApplicationParameters.fromProperties(propsV4);

        Assertions.assertEquals(3, params.getAllowEventList().size());

        Assertions.assertEquals(24, params.getAllowRetentionHours());
        Assertions.assertFalse(params.isWithCustomParameters());
    }
}
