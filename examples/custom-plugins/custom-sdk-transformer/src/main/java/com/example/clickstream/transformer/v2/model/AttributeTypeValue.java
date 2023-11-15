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

package com.example.clickstream.transformer.v2.model;


import com.fasterxml.jackson.databind.JsonNode;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;

@Setter
@Getter
@AllArgsConstructor
@NoArgsConstructor
@ToString
public class AttributeTypeValue {
    private Double doubleValue;
    private Float floatValue;
    private Long intValue;
    private String stringValue;

    public static Item.ItemPropertyValue fromValue(final JsonNode value) {
        Item.ItemPropertyValue attrValue = new Item.ItemPropertyValue();
        if (value.isInt() || value.isLong() || value.isIntegralNumber() || value.isBigInteger()) {
            attrValue.setIntValue(value.asLong());
        } else if (value.isDouble() || value.isFloat() || value.isBigDecimal() || value.isFloatingPointNumber()) {
            attrValue.setDoubleValue(value.asDouble());
        } else {
            attrValue.setStringValue(value.asText());
        }
        return attrValue;
    }
}
