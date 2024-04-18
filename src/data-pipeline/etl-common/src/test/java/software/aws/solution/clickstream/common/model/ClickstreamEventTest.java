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

package software.aws.solution.clickstream.common.model;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;
import software.aws.solution.clickstream.BaseTest;

import java.util.HashMap;
import java.util.Map;

public class ClickstreamEventTest extends BaseTest {

    @Test
    void testToJson() {
        ClickstreamEvent clickstreamEvent = new ClickstreamEvent();
        clickstreamEvent.setSessionId("sessionId");

        Assertions.assertTrue(clickstreamEvent.toJson().contains("\"session_id\":\"sessionId\""));
    }

    @Test
    void testToJson_error() {
        ClickstreamEvent clickstreamEvent = new ClickstreamEvent();
        clickstreamEvent.setSessionId("sessionId");

        Map<String, ClickstreamEventPropValue> customParameters = new HashMap<>();

        customParameters.put("key", new ClickstreamEventPropValue("value", ValueType.NUMBER));
        clickstreamEvent.setCustomParameters(customParameters);

        Assertions.assertNull(clickstreamEvent.toJson());
    }
}
