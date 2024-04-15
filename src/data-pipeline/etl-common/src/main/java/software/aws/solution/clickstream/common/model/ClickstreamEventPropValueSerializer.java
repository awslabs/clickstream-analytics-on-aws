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

public class ClickstreamEventPropValueSerializer extends JsonSerializer<ClickstreamEventPropValue> {
    @Override
    public void serialize(final ClickstreamEventPropValue value, final JsonGenerator gen, final SerializerProvider serializers) throws IOException {

        if (value == null) {
            gen.writeNull();
            return;
        }

        if (value.getType() == ValueType.STRING) {
            gen.writeString(value.getValue());
            return;
        }

        if (value.getType() == ValueType.BOOLEAN) {
            gen.writeBoolean(Boolean.parseBoolean(value.getValue()));
            return;
        }

        if (value.getType() == ValueType.NUMBER) {
            try {
                gen.writeNumber(Long.parseLong(value.getValue()));
            } catch (NumberFormatException e) {
                gen.writeNumber(Double.parseDouble(value.getValue()));
            }
            return;
        }

        if (value.getType() == ValueType.OBJECT) {
            gen.writeRawValue(value.getValue());
        }
    }
}
