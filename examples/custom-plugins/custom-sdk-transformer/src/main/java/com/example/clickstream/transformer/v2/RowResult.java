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

package com.example.clickstream.transformer.v2;

import com.example.clickstream.transformer.v2.model.Event;
import com.example.clickstream.transformer.v2.model.EventParameter;
import com.example.clickstream.transformer.v2.model.Item;
import com.example.clickstream.transformer.v2.model.User;
import lombok.Getter;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
public class RowResult {
    private Event event;
    private List<EventParameter> eventParameters;
    private User user;
    private List<Item> items;
}
