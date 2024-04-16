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



package software.aws.solution.clickstream.common.sensors.event;

import com.fasterxml.jackson.annotation.JsonAnyGetter;
import com.fasterxml.jackson.annotation.JsonAnySetter;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Getter;
import lombok.Setter;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Getter
@Setter
public class SensorsEvent {
    private final Map<String, Object> unknownProperties = new HashMap<>();

    @JsonProperty("_track_id")
    private String trackId;

    @JsonProperty("time")
    private long time;

    @JsonProperty("type")
    private String type;

    @JsonProperty("crc")
    private String crc;

    @JsonProperty("distinct_id")
    private String distinctId;

    @JsonProperty("original_id")
    private String originalId;

    @JsonProperty("anonymous_id")
    private String anonymousId;

    @JsonProperty("identities")
    private Identities identities;

    @JsonProperty("event")
    private String event;

    @JsonProperty("project")
    private String project;

    @JsonProperty("time_free")
    private boolean timeFree;

    @JsonProperty("lib")
    private Lib lib;

    @JsonProperty("properties")
    private Properties properties;

    @JsonProperty("_flush_time")
    private long _flush_time;

    @JsonProperty("items")
    private List<Item> items;

    @JsonAnySetter
    public void setUnknownProperty(final String name, final Object value) {
        unknownProperties.put(name, value);
    }

    @JsonAnyGetter
    public Map<String, Object> getUnknownProperties() {
        return unknownProperties;
    }
}
