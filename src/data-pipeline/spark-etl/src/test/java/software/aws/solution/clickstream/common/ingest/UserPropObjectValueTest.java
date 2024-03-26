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

import com.fasterxml.jackson.core.JsonProcessingException;
import org.junit.jupiter.api.Test;
import software.aws.solution.clickstream.*;

import software.aws.solution.clickstream.common.model.ClickstreamUserPropValue;
import software.aws.solution.clickstream.common.model.ValueType;

import java.nio.file.*;
import java.util.*;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static software.aws.solution.clickstream.util.Utils.objectToJsonString;

public class UserPropObjectValueTest extends BaseTest {

    @Test
    public void testToClickstreamUserPropValue() throws JsonProcessingException {
        // ./gradlew clean test --info --tests software.aws.solution.clickstream.common.ingest.UserPropObjectValueTest.testToClickstreamUserPropValue

        // Arrange
        Map<String, String> testValue = new HashMap<>();
        testValue.put("key1", "value1");
        testValue.put("key2", "value2");
        Long testTimestamp = System.currentTimeMillis();
        UserPropObjectValue userPropObjectValue1 = new UserPropObjectValue();
        assertNull(userPropObjectValue1.getValue());

        UserPropObjectValue userPropObjectValue = new UserPropObjectValue(testValue, testTimestamp);

        // Act
        ClickstreamUserPropValue result = userPropObjectValue.toClickstreamUserPropValue();

        // Assert
        assertEquals(objectToJsonString(testValue), result.getValue());
        assertEquals(ValueType.OBJECT, result.getType());
        assertEquals(testTimestamp, result.getSetTimemsec());
    }

    @Test
    public void testToClickstreamUserPropValue_invalidObject() throws JsonProcessingException {
        // ./gradlew clean test --info --tests software.aws.solution.clickstream.common.ingest.UserPropObjectValueTest.testToClickstreamUserPropValue_invalidObject
        // Arrange

        Long testTimestamp = System.currentTimeMillis();
        UserPropObjectValue userPropObjectValue1 = new UserPropObjectValue();
        assertNull(userPropObjectValue1.getValue());

        UserPropObjectValue userPropObjectValue = new UserPropObjectValue(new TestObject(), testTimestamp);

        // Act
        ClickstreamUserPropValue result = userPropObjectValue.toClickstreamUserPropValue();

        // Assert
        assertEquals("/some/path", result.getValue());
        assertEquals(ValueType.STRING, result.getType());
        assertEquals(testTimestamp, result.getSetTimemsec());
    }


    public class TestObject {
        private Path path;
        public TestObject() {
            this.path = Paths.get("/some/path");
        }
        @Override
        public String toString() {
            return path.toString();
        }
    }
}
