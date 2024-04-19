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

package software.aws.solution.clickstream.common.ingest;

import com.fasterxml.jackson.annotation.*;
import com.fasterxml.jackson.databind.annotation.*;
import lombok.*;
import software.aws.solution.clickstream.common.*;

import java.util.*;

@Getter
@Setter
public class Item {
    @JsonProperty("item_id")
    @JsonAlias("id")
    private String itemId;
    @JsonProperty("item_name")
    @JsonAlias("name")
    private String itemName;
    @JsonProperty("category")
    private String category;
    @JsonProperty("price")
    @JsonDeserialize(using = SafeDoubleDeserializer.class)
    private Double price;
    @JsonProperty("brand")
    private String brand;
    @JsonProperty("currency")
    private String currency;
    @JsonProperty("category2")
    private String category2;
    @JsonProperty("category3")
    private String category3;
    @JsonProperty("category4")
    private String category4;
    @JsonProperty("category5")
    private String category5;
    @JsonProperty("creative_name")
    private String creativeName;
    @JsonProperty("creative_slot")
    private String creativeSlot;
    @JsonProperty("location_id")
    private String locationId;
    @JsonProperty("quantity")
    @JsonDeserialize(using = SafeDoubleDeserializer.class)
    private Double quantity;

    private final Map<String, Object> customProperties = new HashMap<>();
    @JsonAnySetter
    public void setCustomProperty(final String name, final Object value) {
        customProperties.put(name, value);
    }
    @JsonAnyGetter
    public Map<String, Object> getCustomProperties() {
        return customProperties;
    }
}
