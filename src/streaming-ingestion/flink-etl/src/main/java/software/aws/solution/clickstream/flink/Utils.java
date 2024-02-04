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
import org.apache.commons.io.IOUtils;
import org.apache.flink.kinesis.shaded.com.amazonaws.services.s3.AmazonS3;
import org.apache.flink.kinesis.shaded.com.amazonaws.services.s3.AmazonS3ClientBuilder;
import org.apache.flink.kinesis.shaded.com.amazonaws.services.s3.model.S3Object;
import org.apache.flink.shaded.jackson2.com.fasterxml.jackson.core.JsonProcessingException;
import org.apache.flink.shaded.jackson2.com.fasterxml.jackson.databind.JsonNode;
import org.apache.flink.shaded.jackson2.com.fasterxml.jackson.databind.ObjectMapper;
import software.aws.solution.clickstream.plugin.transformer.KvTransformer;

import java.io.BufferedReader;
import java.io.ByteArrayInputStream;
import java.io.File;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.zip.GZIPInputStream;

@Slf4j
public final class Utils {
    private static final ObjectMapper MAPPER = new ObjectMapper();
    private static Utils instance;

    private Utils() {
    }
    private AmazonS3 s3Client;

    public static synchronized Utils getInstance() {
        if (instance == null) {
            instance = new Utils();
        }
        return instance;
    }

    public static AppIdSteamConfig fromJson(final String contentStr, final Class<AppIdSteamConfig> aClass) throws JsonProcessingException {
        return MAPPER.readValue(contentStr, aClass);
    }

    public static String getStackError(final Exception e) {
        StringBuilder sb = new StringBuilder();
        sb.append(e.getMessage()).append("\n")
                .append(e.getClass()).append("\n");
        for (StackTraceElement stackTraceElement : e.getStackTrace()) {
            sb.append(stackTraceElement.toString()).append("\n");
        }
        return sb.toString();
    }

    public static String getValueType(final JsonNode attrValue) {
        String valueType = KvTransformer.PARAM_KEY_STRING_VALUE;
        if (attrValue.isBigInteger() || attrValue.isInt() || attrValue.isLong() || attrValue.isIntegralNumber()) {
            valueType = KvTransformer.PARAM_KEY_INT_VALUE;
        } else if (attrValue.isDouble() || attrValue.isFloat() || attrValue.isFloatingPointNumber() || attrValue.isBigDecimal() || attrValue.isNumber()) {
            valueType = KvTransformer.PARAM_KEY_DOUBLE_VALUE;
        }
        return valueType;
    }

    public static StringBuilder gzipBytesToString(final byte[] decodedBytes) throws IOException {
        StringBuilder output = new StringBuilder();
        try (
                GZIPInputStream gzip = new GZIPInputStream(new ByteArrayInputStream(decodedBytes));
                BufferedReader br = new BufferedReader(new InputStreamReader(gzip, StandardCharsets.UTF_8))
        ) {
            String line;
            while ((line = br.readLine()) != null) {
                output.append(line);
            }
        }
        return output;
    }

    public String readS3TextFile(final String s3Path, final String region) throws IOException {
        String bucketName = s3Path.split("/")[2];
        String key = s3Path.substring(s3Path.indexOf(bucketName) + bucketName.length() + 1);
        return readS3TextFile(bucketName, key, region);
    }

    public String readS3TextFile(final String bucket, final String key, final String awsRegion) throws IOException {
        S3Object s3Object = this.getS3Client(awsRegion).getObject(bucket, key);
        try (InputStream s3Inputstream = s3Object.getObjectContent()) {
            return IOUtils.toString(s3Inputstream, StandardCharsets.UTF_8);
        }
    }

    public AmazonS3 getS3Client(final String awsRegion) {
        if (this.s3Client == null) {
            this.s3Client = AmazonS3ClientBuilder.standard().withRegion(awsRegion).build();
        }
        return this.s3Client;
    }

     void setS3Client(final AmazonS3 s3Client) {
        this.s3Client = s3Client;
    }

    public byte[] readS3BinaryFile(final String bucket, final String key, final String awsRegion) throws IOException {
        // for test local, set bucket to "_" and key to local file
        if ("_".equals(bucket)) {
            File localfile = new File(key);
            return IOUtils.toByteArray(localfile.toURI());
        }
        S3Object s3Object = this.getS3Client(awsRegion).getObject(bucket, key);
        try (InputStream s3Inputstream = s3Object.getObjectContent()) {
            return IOUtils.toByteArray(s3Inputstream);
        } catch (IOException e) {
            log.error(e.getMessage());
            throw e;
        }
    }

    public static long getCurrentTimeMillis() {
        if (System.getProperty("_LOCAL_TEST_TIME") != null) {
            return Long.parseLong(System.getProperty("_LOCAL_TEST_TIME"));
        }
        return Instant.now().toEpochMilli();
    }

}
