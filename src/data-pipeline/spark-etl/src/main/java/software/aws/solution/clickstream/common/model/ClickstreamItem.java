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

import lombok.*;
import java.sql.*;
import java.util.Map;

@Setter
@Getter
public class ClickstreamItem {
    private Timestamp eventTimestamp;
    private String eventId;
    private String eventName;
    private String platform;
    private String userPseudoId;
    private String userId;
    private String itemId;
    private String name;
    private String brand;
    private String currency;
    private Double price;
    private Double quantity;
    private String creativeName;
    private String creativeSlot;
    private String locationId;
    private String category;
    private String category2;
    private String category3;
    private String category4;
    private String category5;
    private Map<String, ClickstreamEventPropValue> customParameters;
    private Map<String, String> processInfo;
    private String appId;
}
