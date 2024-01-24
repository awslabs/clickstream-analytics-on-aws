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

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;

public class AppIdSteamConfigTest {
    @Test
    void testNewAppIdSteamConfig() {
        AppIdStreamMap app1Stream = new AppIdStreamMap();
        app1Stream.setAppId("app1");
        app1Stream.setStreamArn("arn:aws:kinesis:us-east-1:123456789012:stream/app1");
        app1Stream.setEnabled(true);
        var config = new AppIdSteamConfig();
        var list = new ArrayList<AppIdStreamMap>();
        config.setAppIdStreamMapList(list);
        config.getAppIdStreamMapList().add(app1Stream);
        Assertions.assertEquals(1, list.size());
    }
}
