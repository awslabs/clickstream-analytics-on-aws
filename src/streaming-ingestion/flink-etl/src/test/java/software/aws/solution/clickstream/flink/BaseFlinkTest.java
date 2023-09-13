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
import org.junit.ClassRule;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;

import java.io.BufferedInputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.net.URL;
import java.net.URLConnection;
import java.util.zip.GZIPInputStream;

import static org.mockito.Mockito.mock;

public class BaseFlinkTest {
    @ClassRule
    public static MiniClusterWithClientResource flinkCluster = new MiniClusterWithClientResource(
            new MiniClusterResourceConfiguration.Builder()
                    .setNumberSlotsPerTaskManager(2)
                    .setNumberTaskManagers(1)
                    .build());

    protected StreamExecutionEnvironment env;
    protected StreamingJob streamingJob;
    @BeforeAll
    public static void downloadResources() {
        System.out.println("BeforeAll downloadResources");
        if (!needDownloadFile()) {
            return;
        }
        System.out.println("download GeoLite2-City.mmdb.gz...");
//        String dbFile = downloadFile("https://cdn.jsdelivr.net/npm/geolite2-city@1.0.0/GeoLite2-City.mmdb.gz");
//        System.out.println("download completed, " + dbFile);
    }

    public static String downloadFile(String urlStr) {
        String dbFile = new File(BaseFlinkTest.class.getResource("/original_data.json").getPath())
                .getParent() + "/GeoLite2-City.mmdb";
        System.out.println(dbFile);
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
            e.printStackTrace();
            throw new RuntimeException(e);
        }
        return dbFile;
    }

    @BeforeEach
    public void init() {
        System.out.println("BeforeEach init");
//        env = mock(LocalStreamEnvironment.class);
        env = StreamExecutionEnvironment.getExecutionEnvironment();
        streamingJob = mock(StreamingJob.class);
    }

    @AfterEach
    public void clear() {
        MockKinesisSink.values.clear();
        System.out.println("AfterEach clear");
    }

    public static boolean needDownloadFile(){
        String dfile = System.getenv("DOWNLOAD_FILE");
        if ("false".equals(dfile) || "0".equals(dfile)) {
            return false;
        }
        return true;
    }
}
