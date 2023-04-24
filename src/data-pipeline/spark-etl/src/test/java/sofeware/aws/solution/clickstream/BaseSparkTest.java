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

package sofeware.aws.solution.clickstream;

import org.apache.spark.sql.SparkSession;
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

public class BaseSparkTest {
    protected SparkSession spark;

    @BeforeAll
    public static void downloadResources() {
        System.out.println("download GeoLite2-City.mmdb.gz...");
        String dbFile = downloadFile("https://cdn.jsdelivr.net/npm/geolite2-city@1.0.0/GeoLite2-City.mmdb.gz");
        System.out.println("download completed, " + dbFile);
    }

    public static String downloadFile(String urlStr) {
        String dbFile = new File(BaseSparkTest.class.getResource("/original_data.json").getPath())
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
        spark = SparkSession.builder()
                .appName("Test Spark App")
                .master("local[*]")
                .config("spark.driver.bindAddress", "127.0.0.1")
                .getOrCreate();
    }

    @AfterEach
    public void clear() {
        spark.stop();
    }
}
