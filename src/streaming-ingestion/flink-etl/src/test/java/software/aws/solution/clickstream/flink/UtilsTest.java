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
import org.apache.flink.kinesis.shaded.com.amazonaws.services.s3.AmazonS3;
import org.apache.flink.kinesis.shaded.com.amazonaws.services.s3.model.S3Object;
import org.apache.flink.kinesis.shaded.com.amazonaws.services.s3.model.S3ObjectInputStream;
import org.apache.flink.shaded.jackson2.com.fasterxml.jackson.core.JsonProcessingException;
import org.apache.flink.shaded.jackson2.com.fasterxml.jackson.databind.JsonNode;
import org.apache.flink.shaded.jackson2.com.fasterxml.jackson.databind.ObjectMapper;
import org.apache.logging.log4j.Level;
import org.apache.logging.log4j.core.config.Configurator;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import software.aws.solution.clickstream.plugin.transformer.KvTransformer;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;

@Slf4j
public class UtilsTest {
    private static final ObjectMapper MAPPER = new ObjectMapper();
    @BeforeEach
    public void beforeEach() {
        Configurator.setRootLevel(Level.WARN);
        Configurator.setLevel("software.aws.solution.clickstream", Level.DEBUG);
    }

    @Test
    public void testFromJson() {
        String contentStr = "{\"appIdStreamMap\":[{\"appId\":\"app1\",\"streamArn\":\"arn:aws:kinesis:us-east-1:123456789012:stream/Clickstream_project1_4a4326c0\",\"enabled\":true},{\"appId\":\"app2\",\"streamArn\":\"arn:aws:kinesis:us-east-1:123456789012:stream/Clickstream_project1_4a4326c0\",\"enabled\":true},{\"appId\":\"app3\",\"streamArn\":\"arn:aws:kinesis:us-east-1:123456789012:stream/Clickstream_project1_4a4326c0\",\"enabled\":true},{\"appId\":\"app4\",\"streamArn\":\"arn:aws:kinesis:us-east-1:123456789012:stream/Clickstream_project1_4a4326c0\",\"enabled\":true},{\"appId\":\"app5\",\"streamArn\":\"arn:aws:kinesis:us-east-1:123456789012:stream/Clickstream_project1_4a4326c0\",\"enabled\":true}]}";
        AppIdSteamConfig appIdSteamConfig = null;
        try {
            appIdSteamConfig = Utils.fromJson(contentStr, AppIdSteamConfig.class);
        } catch (JsonProcessingException e) {
            throw new RuntimeException(e);
        }
        Assertions.assertEquals(appIdSteamConfig.getAppIdStreamList().size(), 5);
        Assertions.assertEquals(appIdSteamConfig.getAppIdStreamList().get(0).getAppId(), "app1");
        Assertions.assertEquals(appIdSteamConfig.getAppIdStreamList().get(0).getStreamArn(), "arn:aws:kinesis:us-east-1:123456789012:stream/Clickstream_project1_4a4326c0");
        Assertions.assertTrue(appIdSteamConfig.getAppIdStreamList().get(0).isEnabled());
    }

    @Test
    void testReadS3TextFile() throws IOException {
        //  ./gradlew clean test --tests software.aws.solution.clickstream.flink.UtilsTest.testReadS3TextFile
        String bucket = "testBucket";
        String key = "testKey/t.txt";
        String awsRegion = "us-east-1";
        String s3Path = "s3://" + bucket + "/" + key;

        AmazonS3 s3ClientMock = Mockito.mock(AmazonS3.class);
        S3Object s3ObjectMock = Mockito.mock(S3Object.class);
        Mockito.when(s3ClientMock.getObject(bucket, key)).thenReturn(s3ObjectMock);
        Mockito.when(s3ObjectMock.getObjectContent()).thenReturn(new S3ObjectInputStream(new ByteArrayInputStream("test".getBytes(StandardCharsets.UTF_8)), null));

        Utils utils = Utils.getInstance();
        utils.setS3Client(s3ClientMock);

        String result = Utils.getInstance().readS3TextFile(s3Path, awsRegion);

        Assertions.assertEquals("test", result);
        Mockito.verify(s3ClientMock, Mockito.times(1)).getObject(bucket, key);
    }

    @Test
    void testReadS3BinaryFile() throws IOException {
        // ./gradlew clean test --tests software.aws.solution.clickstream.flink.UtilsTest.testReadS3BinaryFile
        String bucket = "testBucket";
        String key = "testKey/t.txt";
        String awsRegion = "us-east-1";

        AmazonS3 s3ClientMock = Mockito.mock(AmazonS3.class);
        S3Object s3ObjectMock = Mockito.mock(S3Object.class);
        Mockito.when(s3ClientMock.getObject(bucket, key)).thenReturn(s3ObjectMock);
        Mockito.when(s3ObjectMock.getObjectContent()).thenReturn(new S3ObjectInputStream(new ByteArrayInputStream("test1".getBytes(StandardCharsets.UTF_8)), null));

        Utils utils = Utils.getInstance();
        utils.setS3Client(s3ClientMock);

        byte[] result = Utils.getInstance().readS3BinaryFile(bucket, key, awsRegion);

        Assertions.assertEquals("test1", new String(result, StandardCharsets.UTF_8));
        Mockito.verify(s3ClientMock, Mockito.times(1)).getObject(bucket, key);
    }

    @Test
    void testGetStackError() {
        // ./gradlew clean test --tests software.aws.solution.clickstream.flink.UtilsTest.testGetStackError
        String error = Utils.getStackError(new RuntimeException("test error1"));
        Assertions.assertTrue(error.contains("test error1"));
    }

    @Test
    void testGetValueType() throws JsonProcessingException {
        // ./gradlew clean test --tests software.aws.solution.clickstream.flink.UtilsTest.testGetValueType
        JsonNode testNode = MAPPER.readTree("{\n" +
                "\t\"int1\": 1,\n" +
                "\t\"float1\": 0.2,\n" +
                "\t\"double1\": 1.3,\n" +
                "\t\"string1\": \"test1\",\n" +
                "\t\"string2\": \"111\",\n" +
                "\t\"ip\": \"12.34.23.2\",\n" +
                "\t\"bInt1\": 1232323232323232\n" +
                "}");
        Assertions.assertEquals(KvTransformer.PARAM_KEY_INT_VALUE, Utils.getValueType(testNode.get("int1")));
        Assertions.assertEquals(KvTransformer.PARAM_KEY_DOUBLE_VALUE, Utils.getValueType(testNode.get("float1")));
        Assertions.assertEquals(KvTransformer.PARAM_KEY_DOUBLE_VALUE, Utils.getValueType(testNode.get("double1")));
        Assertions.assertEquals(KvTransformer.PARAM_KEY_STRING_VALUE, Utils.getValueType(testNode.get("string1")));
        Assertions.assertEquals(KvTransformer.PARAM_KEY_STRING_VALUE, Utils.getValueType(testNode.get("string2")));
        Assertions.assertEquals(KvTransformer.PARAM_KEY_STRING_VALUE, Utils.getValueType(testNode.get("ip")));
        Assertions.assertEquals(KvTransformer.PARAM_KEY_INT_VALUE, Utils.getValueType(testNode.get("bInt1")));
    }
}
