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

import static org.junit.jupiter.api.Assertions.*;

public class UserPropIntegerValueTest extends BaseTest {

        @Test
        public void testToClickstreamUserPropValue() {
            // ./gradlew clean test --info --tests software.aws.solution.clickstream.common.ingest.UserPropIntegerValueTest.testToClickstreamUserPropValue

            // Arrange
            Integer testValue = 123;
            Long testTimestamp = System.currentTimeMillis();
            UserPropIntegerValue userPropIntegerValue1 = new UserPropIntegerValue();
            assertNull(userPropIntegerValue1.getValue());

            UserPropIntegerValue userPropIntegerValue = new UserPropIntegerValue(testValue, testTimestamp);

            // Act
            ClickstreamUserPropValue result = userPropIntegerValue.toClickstreamUserPropValue();

            // Assert
            assertEquals(testValue.toString(), result.getValue());
            assertEquals(ValueType.NUMBER, result.getType());
            assertEquals(testTimestamp, result.getSetTimemsec());
        }

}
