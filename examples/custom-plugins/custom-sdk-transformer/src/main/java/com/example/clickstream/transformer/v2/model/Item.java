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

import java.util.List;

@Getter
@Setter
@ToString
public class Item {
    private String appId;
    private String id;
    private Long eventTimestamp;
    private List<ItemProperty> properties;

    @AllArgsConstructor
    @Getter
    @Setter
    @NoArgsConstructor
    @ToString
    public static class ItemProperty {
        private String key;
        private  ItemPropertyValue value;
    }


    @AllArgsConstructor
    @Getter
    @Setter
    @ToString
    public static class ItemPropertyValue extends AttributeTypeValue{
        public static ItemPropertyValue fromValue(final JsonNode value) {
            return AttributeTypeValue.fromValue(value);
        }
    }
}
