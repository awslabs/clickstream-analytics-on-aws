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

import com.fasterxml.jackson.core.JsonFactory;
import com.fasterxml.jackson.core.JsonGenerator;
import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.io.StringWriter;

import static org.junit.jupiter.api.Assertions.*;

public class ClickstreamUserPropValueSerializerTest {

    @Test
    public void testSerialize_for_string() throws IOException {
        //  ./gradlew clean test --info --tests software.aws.solution.clickstream.common.model.ClickstreamUserPropValueSerializerTest.testSerialize_for_string

        // Arrange
        ClickstreamUserPropValueSerializer serializer = new ClickstreamUserPropValueSerializer();
        ClickstreamUserPropValue value = new ClickstreamUserPropValue("test", ValueType.STRING, 123456789L);

        StringWriter writer = new StringWriter();
        JsonGenerator gen = new JsonFactory().createGenerator(writer);

        // Act
        serializer.serialize(value, gen, null);
        gen.flush();

        // Assert
        String expectedJson = "{\"set_time_msec\":123456789,\"value\":\"test\"}";
        assertEquals(expectedJson, writer.toString());
    }

    @Test
    public void testSerialize_for_number() throws IOException {
        //  ./gradlew clean test --info --tests software.aws.solution.clickstream.common.model.ClickstreamUserPropValueSerializerTest.testSerialize_for_number

        // Arrange
        ClickstreamUserPropValueSerializer serializer = new ClickstreamUserPropValueSerializer();
        ClickstreamUserPropValue value = new ClickstreamUserPropValue("123.32", ValueType.NUMBER, 123456789L);

        StringWriter writer = new StringWriter();
        JsonGenerator gen = new JsonFactory().createGenerator(writer);

        // Act
        serializer.serialize(value, gen, null);
        gen.flush();

        // Assert
        String expectedJson = "{\"set_time_msec\":123456789,\"value\":123.32}";
        assertEquals(expectedJson, writer.toString());

    }

    @Test
    public void testSerialize_for_bool() throws IOException {
        //  ./gradlew clean test --info --tests software.aws.solution.clickstream.common.model.ClickstreamUserPropValueSerializerTest.testSerialize_for_bool

        // Arrange
        ClickstreamUserPropValueSerializer serializer = new ClickstreamUserPropValueSerializer();
        ClickstreamUserPropValue value = new ClickstreamUserPropValue("true", ValueType.BOOLEAN, 123456789L);

        StringWriter writer = new StringWriter();
        JsonGenerator gen = new JsonFactory().createGenerator(writer);

        // Act
        serializer.serialize(value, gen, null);
        gen.flush();

        // Assert
        String expectedJson = "{\"set_time_msec\":123456789,\"value\":true}";
        assertEquals(expectedJson, writer.toString());
    }



    @Test
    public void testSerialize_for_object() throws IOException {
        //  ./gradlew clean test --info --tests software.aws.solution.clickstream.common.model.ClickstreamUserPropValueSerializerTest.testSerialize_for_object

        // Arrange
        ClickstreamUserPropValueSerializer serializer = new ClickstreamUserPropValueSerializer();
        ClickstreamUserPropValue value = new ClickstreamUserPropValue("{\"key\":\"value\"}", ValueType.OBJECT, 123456789L);

        StringWriter writer = new StringWriter();
        JsonGenerator gen = new JsonFactory().createGenerator(writer);

        // Act
        serializer.serialize(value, gen, null);
        gen.flush();

        // Assert
        String expectedJson = "{\"set_time_msec\":123456789,\"value\":{\"key\":\"value\"}}";
        assertEquals(expectedJson, writer.toString());
    }

}

