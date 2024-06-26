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

import com.fasterxml.jackson.core.*;
import com.fasterxml.jackson.databind.*;
import lombok.extern.slf4j.Slf4j;

import java.io.*;

@Slf4j
public class SafeDoubleDeserializer extends JsonDeserializer<Double> {
    @Override
    public Double deserialize(final JsonParser p, final DeserializationContext ctxt) throws IOException {
        String value = p.getText();
        try {
            return Double.parseDouble(value);
        } catch (NumberFormatException e) {
            log.error("Failed to parse double value: {}", value, e);
            return null;
        }
    }
}
