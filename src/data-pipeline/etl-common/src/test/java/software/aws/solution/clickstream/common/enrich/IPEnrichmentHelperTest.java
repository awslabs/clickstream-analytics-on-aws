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


package software.aws.solution.clickstream.common.enrich;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeAll;
import software.aws.solution.clickstream.BaseTest;

import org.junit.jupiter.api.Test;
import software.aws.solution.clickstream.common.model.ClickstreamIPEnrichResult;

import java.io.BufferedInputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.net.URL;
import java.net.URLConnection;
import java.util.zip.GZIPInputStream;

import static org.junit.jupiter.api.Assertions.*;

class IPEnrichmentHelperTest extends BaseTest  {

    private static final String TMP_GEO_LITE_2_CITY_MMDB = "/tmp/GeoLite2-City.mmdb";

    @BeforeAll
    public static void setUPAll() {
        System.out.println("BeforeAll downloadResources");
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


    @Test
    void enrichShouldHandleException() throws IOException {
        IPEnrichmentHelper ipEnrichmentHelper = IPEnrichmentHelper.from(new File(TMP_GEO_LITE_2_CITY_MMDB));
        ClickstreamIPEnrichResult result = ipEnrichmentHelper.enrich("invalid-ip");
        assertNotNull(result);
        assertNull(result.getCity());
        assertNull(result.getContinent());
        assertNull(result.getCountry());
    }

    @Test
    void enrichShouldReturnValidForRealDbFile() throws IOException {
        // ./gradlew clean test --info --tests software.aws.solution.clickstream.common.enrich.IPEnrichmentHelperTest.enrichShouldReturnValidForRealDbFile

        IPEnrichmentHelper ipEnrichmentHelper = IPEnrichmentHelper.from(new File(TMP_GEO_LITE_2_CITY_MMDB));
        ClickstreamIPEnrichResult result = ipEnrichmentHelper.enrich("18.233.165.3");
        Assertions.assertEquals("Ashburn", result.getCity());
        Assertions.assertEquals("North America", result.getContinent());
        Assertions.assertEquals("United States", result.getCountry());
    }

    @Test
    void enrichShouldReturnValidForRealDbFile2() throws IOException {
        // ./gradlew clean test --info --tests software.aws.solution.clickstream.common.enrich.IPEnrichmentHelperTest.enrichShouldReturnValidForRealDbFile2

        IPEnrichmentHelper ipEnrichmentHelper = IPEnrichmentHelper.from(new File(TMP_GEO_LITE_2_CITY_MMDB));
        ClickstreamIPEnrichResult result = ipEnrichmentHelper.enrich("18.233.165.3,127.0.0.1");
        Assertions.assertEquals("Ashburn", result.getCity());
        Assertions.assertEquals("North America", result.getContinent());
        Assertions.assertEquals("United States", result.getCountry());
    }

}
