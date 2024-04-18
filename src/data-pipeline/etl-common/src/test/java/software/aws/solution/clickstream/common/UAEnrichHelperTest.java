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

package software.aws.solution.clickstream.common;

import com.fasterxml.jackson.core.*;
import com.fasterxml.jackson.databind.*;
import org.junit.jupiter.api.*;
import software.aws.solution.clickstream.common.enrich.*;
import software.aws.solution.clickstream.common.model.*;

public class UAEnrichHelperTest {
    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();
    @Test
    void test_parse_UA_string() throws JsonProcessingException {
        // DOWNLOAD_FILE=0 ./gradlew clean test --info --tests software.aws.solution.clickstream.common.UAEnrichHelperTest.test_parse_UA_string
        ClickstreamUA ua = UAEnrichHelper.parserUA("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36");
        String jsonStr = OBJECT_MAPPER.writeValueAsString(ua.getUaMap());
        String expectedStr = "{\"userAgent\":{\"family\":\"Chrome\",\"major\":\"58\",\"minor\":\"0\",\"patch\":\"3029\"}," +
                "\"os\":{\"family\":\"Windows\",\"major\":\"10\",\"minor\":null,\"patch\":null,\"patchMinor\":null}," +
                "\"device\":{\"family\":\"Other\"}," +
                "\"string\":\"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36\"}";
        Assertions.assertEquals(expectedStr, jsonStr);

        Assertions.assertEquals("Windows", ua.getUaOs());
        Assertions.assertEquals("10", ua.getUaOsVersion());

        Assertions.assertEquals("Chrome", ua.getUaBrowser());
        Assertions.assertEquals("58.0.3029", ua.getUaBrowserVersion());

        Assertions.assertEquals("Other", ua.getUaDevice());
        Assertions.assertEquals("Other", ua.getUaDeviceCategory());
    }
}
