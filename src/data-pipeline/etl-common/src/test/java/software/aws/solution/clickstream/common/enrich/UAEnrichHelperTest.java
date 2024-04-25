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
import org.junit.jupiter.api.Test;
import software.aws.solution.clickstream.BaseTest;
import software.aws.solution.clickstream.common.model.ClickstreamUA;

public class UAEnrichHelperTest extends BaseTest  {

    @Test
    void shouldParseUserAgent() {
        String userAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36";
        ClickstreamUA clickstreamUA = UAEnrichHelper.parserUA(userAgent);

        Assertions.assertEquals("Chrome", clickstreamUA.getUaBrowser());
        Assertions.assertEquals("58.0.3029", clickstreamUA.getUaBrowserVersion());
        Assertions.assertEquals("Windows", clickstreamUA.getUaOs());
        Assertions.assertEquals("10", clickstreamUA.getUaOsVersion());
        Assertions.assertEquals("Other", clickstreamUA.getUaDevice());
        Assertions.assertEquals("Other", clickstreamUA.getUaDeviceCategory());
    }

    @Test
    void shouldHandleNullUserAgent() {
        ClickstreamUA clickstreamUA = UAEnrichHelper.parserUA(null);

        Assertions.assertNull(clickstreamUA.getUaBrowser());
        Assertions.assertNull(clickstreamUA.getUaBrowserVersion());
        Assertions.assertNull(clickstreamUA.getUaOs());
        Assertions.assertNull(clickstreamUA.getUaOsVersion());
        Assertions.assertNull(clickstreamUA.getUaDevice());
        Assertions.assertNull(clickstreamUA.getUaDeviceCategory());
    }

    @Test
    void shouldHandleEmptyUserAgent() {
        ClickstreamUA clickstreamUA = UAEnrichHelper.parserUA("");

        Assertions.assertNull(clickstreamUA.getUaBrowser());
        Assertions.assertNull(clickstreamUA.getUaBrowserVersion());
        Assertions.assertNull(clickstreamUA.getUaOs());
        Assertions.assertNull(clickstreamUA.getUaOsVersion());
        Assertions.assertNull(clickstreamUA.getUaDevice());
        Assertions.assertNull(clickstreamUA.getUaDeviceCategory());
    }

    @Test
    void shouldHandleOtherUserAgent() {
        ClickstreamUA clickstreamUA = UAEnrichHelper.parserUA("test");

        Assertions.assertEquals("Other", clickstreamUA.getUaBrowser());
        Assertions.assertNull(clickstreamUA.getUaBrowserVersion());
        Assertions.assertEquals("Other", clickstreamUA.getUaOs());
        Assertions.assertNull(clickstreamUA.getUaOsVersion());
        Assertions.assertEquals("Other", clickstreamUA.getUaDevice());
        Assertions.assertEquals("Other", clickstreamUA.getUaDeviceCategory());
    }
}