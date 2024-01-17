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
        String configText = "{\"appIdStreamMap\":[" +
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

    @Test
    void testCreateApplicationParametersFromProps() throws IOException {

        Properties props = getProperties();
        ApplicationParameters params = ApplicationParameters.fromProperties(props);

        Assertions.assertEquals("us-east-1", params.getRegion());
        Assertions.assertEquals("testBucket", params.getDataBucketName());
        Assertions.assertEquals("testKey/t.txt", params.getGeoFileKey());
        Assertions.assertEquals("arn:aws:kinesis:us-east-1:123456789012:stream/testStream", params.getInputStreamArn());
        Assertions.assertEquals("testStream", params.getInputStreamName());
        Assertions.assertEquals("project1", params.getProjectId());

        Assertions.assertEquals("app1Sink", params.getSinkStreamNameByAppId("app1"));
        Assertions.assertEquals("app2Sink", params.getSinkStreamNameByAppId("app2"));
        Assertions.assertNull(params.getSinkStreamNameByAppId("app5"));
    }

    @Test
    void testCreateApplicationParametersFromRuntime() throws IOException {
        Properties props = getProperties();
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

            Assertions.assertEquals("app1Sink", params.getSinkStreamNameByAppId("app1"));
            Assertions.assertEquals("app2Sink", params.getSinkStreamNameByAppId("app2"));
            Assertions.assertNull(params.getSinkStreamNameByAppId("app5"));
        }
    }
}
