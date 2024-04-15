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
import com.fasterxml.jackson.databind.*;

import java.io.*;

import static software.aws.solution.clickstream.common.Constant.SET_TIME_MSEC;


public class ClickstreamUserPropValueSerializer extends JsonSerializer<ClickstreamUserPropValue> {

    public static final String VALUE = "value";
    @Override
    public void serialize(final ClickstreamUserPropValue value, final JsonGenerator gen, final SerializerProvider serializers) throws IOException {
        if (value == null) {
            gen.writeNull();
            return;
        }

        gen.writeStartObject();
        if (value.getSetTimemsec() != null) {
            gen.writeNumberField(SET_TIME_MSEC, value.getSetTimemsec());
        } else {
            gen.writeNullField(SET_TIME_MSEC);
        }

        if (value.getValue() == null) {
            gen.writeNullField(VALUE);
            gen.writeEndObject();
            return;
        }

        if (value.getType() == ValueType.STRING) {
            gen.writeStringField(VALUE, value.getValue());
        } else if (value.getType() == ValueType.BOOLEAN) {
            gen.writeBooleanField(VALUE, Boolean.parseBoolean(value.getValue()));
        } else if (value.getType() == ValueType.NUMBER) {
            try {
                gen.writeNumberField(VALUE, Long.parseLong(value.getValue()));
            } catch (NumberFormatException e) {
                gen.writeNumberField(VALUE, Double.parseDouble(value.getValue()));
            }
        } else if (value.getType() == ValueType.OBJECT) {
            gen.writeFieldName(VALUE);
            gen.writeRawValue(value.getValue());
        }
        gen.writeEndObject();
    }
}
