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

package software.aws.solution.clickstream.common.ingest;

import org.junit.jupiter.api.*;
import software.aws.solution.clickstream.*;
import software.aws.solution.clickstream.common.model.*;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

public class UserPropStringValueTest extends BaseTest {

        @Test
        public void testToClickstreamUserPropValue() {
            // ./gradlew clean test --info --tests software.aws.solution.clickstream.common.ingest.UserPropStringValueTest.testToClickstreamUserPropValue

            // Arrange
            String testValue = "testValue";
            Long testTimestamp = System.currentTimeMillis();
            UserPropStringValue userPropStringValue1 = new UserPropStringValue();
            assertNull(userPropStringValue1.getValue());

            UserPropStringValue userPropStringValue = new UserPropStringValue(testValue, testTimestamp);

            // Act
            ClickstreamUserPropValue result = userPropStringValue.toClickstreamUserPropValue();

            // Assert
            assertEquals(testValue, result.getValue());
            assertEquals(ValueType.STRING, result.getType());
            assertEquals(testTimestamp, result.getSetTimemsec());
        }
}
