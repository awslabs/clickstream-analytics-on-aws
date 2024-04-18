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

import com.fasterxml.jackson.core.JsonFactory;
import com.fasterxml.jackson.core.JsonParser;
import com.fasterxml.jackson.databind.*;
import com.fasterxml.jackson.databind.annotation.JsonDeserialize;
import org.junit.jupiter.api.Test;

import java.io.IOException;

import static org.junit.jupiter.api.Assertions.*;

public class SafeBooleanDeserializerTest {

    @Test
    public void testDeserialize() throws IOException {
        // ./gradlew clean test --info --tests software.aws.solution.clickstream.common.SafeBooleanDeserializerTest.testDeserialize
        // Arrange
        SafeBooleanDeserializer safeBooleanDeserializer = new SafeBooleanDeserializer();
        JsonFactory factory = new JsonFactory();

        // Act & Assert
        JsonParser parser = factory.createParser("true");
        parser.nextToken();
        assertTrue(safeBooleanDeserializer.deserialize(parser, null));

        parser = factory.createParser("false");
        parser.nextToken();
        assertFalse(safeBooleanDeserializer.deserialize(parser, null));

        parser = factory.createParser("1");
        parser.nextToken();
        assertTrue(safeBooleanDeserializer.deserialize(parser, null));

        parser = factory.createParser("0");
        parser.nextToken();
        assertFalse(safeBooleanDeserializer.deserialize(parser, null));

        parser = factory.createParser("null");
        parser.nextToken();
        assertNull(safeBooleanDeserializer.deserialize(parser, null));

        parser = factory.createParser("");
        parser.nextToken();
        assertNull(safeBooleanDeserializer.deserialize(parser, null));

        parser = factory.createParser("\"random\"");
        parser.nextToken();
        assertFalse(safeBooleanDeserializer.deserialize(parser, null));
    }

    @Test
    public void testDeserialize2() throws IOException {
        //  ./gradlew clean test --info --tests software.aws.solution.clickstream.common.SafeBooleanDeserializerTest.testDeserialize2

        ObjectMapper om = new ObjectMapper();

        String jsonStr = "{\"test\":\"true\"}";
        TestClass testClass =om.readValue(jsonStr, TestClass.class);
        assertTrue(testClass.test);

        jsonStr = "{\"test\":\"1\"}";
        testClass = om.readValue(jsonStr, TestClass.class);
        assertTrue(testClass.test);

        jsonStr = "{\"test\":1}";
        testClass = om.readValue(jsonStr, TestClass.class);
        assertTrue(testClass.test);

        jsonStr = "{\"test\":\"false\"}";
        testClass =om.readValue(jsonStr, TestClass.class);
        assertFalse(testClass.test);

        jsonStr = "{\"test\":\"0\"}";
        testClass = om.readValue(jsonStr, TestClass.class);
        assertFalse(testClass.test);

        jsonStr = "{\"test\":0}";
        testClass = om.readValue(jsonStr, TestClass.class);
        assertFalse(testClass.test);

        jsonStr = "{\"test\":\"abc\"}";
        testClass = om.readValue(jsonStr, TestClass.class);
        assertFalse(testClass.test);

        jsonStr = "{\"test\":null}";
        testClass = om.readValue(jsonStr, TestClass.class);
        assertNull(testClass.test);

        jsonStr = "{\"test\":\"\"}";
        testClass = om.readValue(jsonStr, TestClass.class);
        assertNull(testClass.test);

        jsonStr = "{\"test\":\"null\"}";
        testClass = new ObjectMapper().readValue(jsonStr, TestClass.class);
        assertNull(testClass.test);

    }

    static class TestClass {
        @JsonDeserialize(using = SafeBooleanDeserializer.class)
        public Boolean test;
    }
}