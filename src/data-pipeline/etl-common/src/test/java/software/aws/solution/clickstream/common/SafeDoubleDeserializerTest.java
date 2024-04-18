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

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.annotation.JsonDeserialize;
import org.junit.jupiter.api.Test;

import java.io.IOException;

import static org.junit.jupiter.api.Assertions.*;

public class SafeDoubleDeserializerTest {
    @Test
    public void testDeserialize() throws IOException {
        //  ./gradlew clean test --info --tests software.aws.solution.clickstream.common.SafeDoubleDeserializerTest.testDeserialize
        ObjectMapper om = new ObjectMapper();

        String jsonStr = "{\"test\":\"123.45\"}";
        TestClass testClass = om.readValue(jsonStr, TestClass.class);
        assertEquals(Double.valueOf(123.45), testClass.test);

        jsonStr = "{\"test\":\"0.0\"}";
        testClass = om.readValue(jsonStr, TestClass.class);
        assertEquals(Double.valueOf(0.0), testClass.test);

        jsonStr = "{\"test\":123.45}";
        testClass = om.readValue(jsonStr, TestClass.class);
        assertEquals(Double.valueOf(123.45), testClass.test);

        jsonStr = "{\"test\":\"abc\"}";
        testClass = om.readValue(jsonStr, TestClass.class);
        assertNull(testClass.test);

        jsonStr = "{\"test\":null}";
        testClass = om.readValue(jsonStr, TestClass.class);
        assertNull(testClass.test);

        jsonStr = "{\"test\":\"\"}";
        testClass = om.readValue(jsonStr, TestClass.class);
        assertNull(testClass.test);

        jsonStr = "{\"test\":\"null\"}";
        testClass = om.readValue(jsonStr, TestClass.class);
        assertNull(testClass.test);
    }

    static class TestClass {
        @JsonDeserialize(using = SafeDoubleDeserializer.class)
        public Double test;
    }
}
