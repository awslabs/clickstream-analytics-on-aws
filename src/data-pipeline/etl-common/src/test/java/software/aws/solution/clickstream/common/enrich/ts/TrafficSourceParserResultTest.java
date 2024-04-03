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

package software.aws.solution.clickstream.common.enrich.ts;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;
import software.aws.solution.clickstream.BaseTest;
import software.aws.solution.clickstream.common.model.UriInfo;

public class TrafficSourceParserResultTest extends BaseTest {

    @Test
    void test_newInstance() {
        TrafficSource trafficSource = new TrafficSource();
        CategoryTrafficSource categoryTrafficSource = new CategoryTrafficSource(trafficSource, "category", "subCategory");
        UriInfo uriInfo = new UriInfo();
        TrafficSourceParserResult trafficSourceParserResult = new TrafficSourceParserResult(categoryTrafficSource, uriInfo);

        Assertions.assertEquals(categoryTrafficSource, trafficSourceParserResult.getTrafficSource());
        Assertions.assertEquals(uriInfo, trafficSourceParserResult.getUriInfo());
    }

}
