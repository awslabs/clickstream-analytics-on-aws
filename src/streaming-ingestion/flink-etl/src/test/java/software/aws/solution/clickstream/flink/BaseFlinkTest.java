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

import org.apache.flink.runtime.testutils.MiniClusterResourceConfiguration;
import org.apache.flink.streaming.api.environment.StreamExecutionEnvironment;
import org.apache.flink.test.util.MiniClusterWithClientResource;
import org.apache.logging.log4j.Level;
import org.apache.logging.log4j.core.config.Configurator;
import org.junit.ClassRule;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.testcontainers.shaded.com.fasterxml.jackson.databind.JsonNode;
import org.testcontainers.shaded.com.fasterxml.jackson.databind.ObjectMapper;
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

import static org.mockito.Mockito.mock;

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
        System.out.println("BeforeAll downloadResources");
        if (!needDownloadFile()) {
            return;
        }
        System.out.println("download GeoLite2-City.mmdb.gz...");
        String dbFile = downloadFile("https://cdn.jsdelivr.net/npm/geolite2-city@1.0.0/GeoLite2-City.mmdb.gz");
        System.out.println("download completed, " + dbFile);
    }

    public static String downloadFile(String urlStr) {
        File dbFile = new File(TMP_GEO_LITE_2_CITY_MMDB);
        if (dbFile.isFile()) {
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
        System.out.println("BeforeEach init");
        env = StreamExecutionEnvironment.getExecutionEnvironment();
    }

    @AfterEach
    public void clear() {
        MockKinesisSink.appValues.clear();
        System.out.println("AfterEach clear");
    }

    public String resourceFileAsString(final String fileName) throws IOException {
        ObjectMapper om = new ObjectMapper();
        String jsonStr = IOUtils.resourceToString(fileName, StandardCharsets.UTF_8).trim();
        JsonNode jsonNode = om.readTree(jsonStr);
        return om.writerWithDefaultPrettyPrinter().writeValueAsString(jsonNode);
    }
}
