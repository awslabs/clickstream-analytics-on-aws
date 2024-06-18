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
import org.apache.flink.runtime.testutils.MiniClusterResourceConfiguration;
import org.apache.flink.streaming.api.environment.StreamExecutionEnvironment;
import org.apache.flink.test.util.MiniClusterWithClientResource;
import org.apache.logging.log4j.Level;
import org.apache.logging.log4j.core.config.Configurator;
import org.junit.ClassRule;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
import org.testcontainers.shaded.com.fasterxml.jackson.databind.JsonNode;
import org.testcontainers.shaded.com.fasterxml.jackson.databind.ObjectMapper;
import org.testcontainers.shaded.com.fasterxml.jackson.databind.node.ObjectNode;
import org.testcontainers.shaded.org.apache.commons.io.IOUtils;
import software.aws.solution.clickstream.flink.mock.MockKinesisSink;

import java.io.BufferedInputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.net.URL;
import java.net.URLConnection;
import java.nio.charset.StandardCharsets;
import java.util.zip.GZIPInputStream;

@Slf4j
public class BaseFlinkTest {
    public static final String TMP_GEO_LITE_2_CITY_MMDB = "/tmp/GeoLite2-City.mmdb";
    @ClassRule
    public static MiniClusterWithClientResource flinkCluster = new MiniClusterWithClientResource(
            new MiniClusterResourceConfiguration.Builder()
                    .setNumberSlotsPerTaskManager(2)
                    .setNumberTaskManagers(1)
                    .build());

    protected StreamExecutionEnvironment env;

    @BeforeAll
    public static void setUPAll() {
        log.info("BeforeAll downloadResources");
        if (!needDownloadFile()) {
            return;
        }
        log.info("download GeoLite2-City.mmdb.gz...");
        String dbFile = downloadFile("https://cdn.jsdelivr.net/npm/geolite2-city@1.0.0/GeoLite2-City.mmdb.gz");
        log.info("download completed, {}", dbFile);
    }

    public static String downloadFile(String urlStr) {
        File dbFile = new File(TMP_GEO_LITE_2_CITY_MMDB);
        if (dbFile.exists()) {
            log.info("File already exists: {}", dbFile.getAbsolutePath());
            return dbFile.getAbsolutePath();
        }
        try (
                FileOutputStream fs = new FileOutputStream(dbFile)
        ) {
            URL url = new URL(urlStr);
            URLConnection conn = url.openConnection();
            InputStream inStream = conn.getInputStream();
            GZIPInputStream gis = new GZIPInputStream(inStream);
            BufferedInputStream bufferedInputStream = new BufferedInputStream(gis);

            byte[] buffer = new byte[1024];
            int byteRead;
            while ((byteRead = bufferedInputStream.read(buffer)) != -1) {
                fs.write(buffer, 0, byteRead);
            }
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
        return dbFile.getAbsolutePath();
    }

    public static boolean needDownloadFile() {
        String dfile = System.getenv("DOWNLOAD_FILE");
        return !"false".equals(dfile) && !"0".equals(dfile);
    }

    @BeforeEach
    public void init() {
        Configurator.setRootLevel(Level.WARN);
        Configurator.setLevel("software.aws.solution.clickstream", Level.DEBUG);
        log.info("BeforeEach init");
        env = StreamExecutionEnvironment.getExecutionEnvironment();
        env.setParallelism(2);
        env.setMaxParallelism(2);
    }

    @AfterEach
    public void clear() {
        MockKinesisSink.appValues.clear();
        log.info("AfterEach clear");
        if (env != null) {
            try {
                env.close();
            } catch (Exception e) {
              log.error("Failed to close env", e);
            }
        }
    }

    public String resourceFileAsString(final String fileName) throws IOException {
        ObjectMapper om = new ObjectMapper();
        String jsonStr = IOUtils.resourceToString(fileName, StandardCharsets.UTF_8).trim();
        JsonNode jsonNode = om.readTree(jsonStr);
        return om.writerWithDefaultPrettyPrinter().writeValueAsString(jsonNode);
    }

    public String prettyJson(String jsonStr) throws IOException {
        ObjectMapper om = new ObjectMapper();
        JsonNode jsonNode = om.readTree(jsonStr);
        return om.writerWithDefaultPrettyPrinter().writeValueAsString(jsonNode);
    }

    public String removeDynamicFields(String jsonStr) throws IOException {
        ObjectMapper om = new ObjectMapper();
        JsonNode jsonNode = om.readTree(jsonStr);

        ObjectNode info = (ObjectNode)jsonNode.get("process_info");
        String inputFileName = info.get("input_file_name").asText();
        info.put("input_file_name", inputFileName.replaceAll("\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}\\.\\d{3,}Z", "2021-01-01T00:00:00.001Z"));
        String processTime = info.get("process_time").asText();
        // "process_time" : "2024-06-06T02:16:26.362709Z",
        info.put("process_time", processTime.replaceAll("\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}\\.\\d{3,}Z", "2021-01-01T00:00:00.000Z"));

        return om.writerWithDefaultPrettyPrinter().writeValueAsString(jsonNode);
    }
}
