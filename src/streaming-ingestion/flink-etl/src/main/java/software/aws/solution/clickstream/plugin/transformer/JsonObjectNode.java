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


package software.aws.solution.clickstream.plugin.transformer;

import lombok.Getter;
import lombok.Setter;
import org.apache.flink.shaded.jackson2.com.fasterxml.jackson.databind.JsonNode;

public class JsonObjectNode {
    @Setter
    @Getter
    private String key;
    @Setter
    @Getter
    private JsonNode value;
    @Setter
    @Getter
    private String valueFormat;
    public JsonObjectNode(final String key, final JsonNode value, final String valueFormat) {
        this.key = key;
        this.value = value;
        this.valueFormat = valueFormat;
    }
}
