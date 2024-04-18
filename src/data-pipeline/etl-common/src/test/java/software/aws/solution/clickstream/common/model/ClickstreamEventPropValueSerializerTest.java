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

import com.fasterxml.jackson.core.*;
import org.junit.jupiter.api.*;

import java.io.*;

import static org.junit.jupiter.api.Assertions.assertEquals;

public class ClickstreamEventPropValueSerializerTest {
    @Test
    public void testSerialize() throws IOException {
         //  ./gradlew clean test --info --tests software.aws.solution.clickstream.common.model.ClickstreamEventPropValueSerializerTest.testSerialize
        // Arrange
        ClickstreamEventPropValueSerializer serializer = new ClickstreamEventPropValueSerializer();
        ClickstreamEventPropValue value = new ClickstreamEventPropValue("test", ValueType.STRING);

        StringWriter writer = new StringWriter();
        JsonGenerator gen = new JsonFactory().createGenerator(writer);

        // Act
        serializer.serialize(value, gen, null);
        gen.flush();

        // Assert
        String expectedJson = "\"test\"";
        assertEquals(expectedJson, writer.toString());
    }

    @Test
    public void testSerialize_for_number() throws IOException {
        //  ./gradlew clean test --info --tests software.aws.solution.clickstream.common.model.ClickstreamEventPropValueSerializerTest.testSerialize_for_number

        // Arrange
        ClickstreamEventPropValueSerializer serializer = new ClickstreamEventPropValueSerializer();
        ClickstreamEventPropValue value = new ClickstreamEventPropValue("123.32", ValueType.NUMBER);

        StringWriter writer = new StringWriter();
        JsonGenerator gen = new JsonFactory().createGenerator(writer);

        // Act
        serializer.serialize(value, gen, null);
        gen.flush();

        // Assert
        String expectedJson = "123.32";
        assertEquals(expectedJson, writer.toString());

    }

    @Test
    public void testSerialize_for_bool() throws IOException {
        //  ./gradlew clean test --info --tests software.aws.solution.clickstream.common.model.ClickstreamEventPropValueSerializerTest.testSerialize_for_bool

        // Arrange
        ClickstreamEventPropValueSerializer serializer = new ClickstreamEventPropValueSerializer();
        ClickstreamEventPropValue value = new ClickstreamEventPropValue("true", ValueType.BOOLEAN);

        StringWriter writer = new StringWriter();
        JsonGenerator gen = new JsonFactory().createGenerator(writer);

        // Act
        serializer.serialize(value, gen, null);
        gen.flush();

        // Assert
        String expectedJson = "true";
        assertEquals(expectedJson, writer.toString());
    }

    @Test
    public void testSerialize_for_object() throws IOException {
        //  ./gradlew clean test --info --tests software.aws.solution.clickstream.common.model.ClickstreamEventPropValueSerializerTest.testSerialize_for_object

        // Arrange
        ClickstreamEventPropValueSerializer serializer = new ClickstreamEventPropValueSerializer();
        ClickstreamEventPropValue value = new ClickstreamEventPropValue("{\"key\":\"value\"}", ValueType.OBJECT);

        StringWriter writer = new StringWriter();
        JsonGenerator gen = new JsonFactory().createGenerator(writer);

        // Act
        serializer.serialize(value, gen, null);
        gen.flush();

        // Assert
        String expectedJson = "{\"key\":\"value\"}";
        assertEquals(expectedJson, writer.toString());
    }
}
