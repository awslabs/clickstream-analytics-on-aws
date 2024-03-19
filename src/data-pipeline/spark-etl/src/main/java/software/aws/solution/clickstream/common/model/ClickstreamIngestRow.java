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

import com.fasterxml.jackson.annotation.*;
import lombok.*;

import java.util.*;

@JsonIgnoreProperties(ignoreUnknown = true)
public class ClickstreamIngestRow {
    @JsonProperty("date")
    private Date date;
    @Getter
    @JsonProperty("data")
    private String data;
    @Getter
    @JsonProperty("ip")
    private String ip;
    @JsonProperty("source_type")
    private String sourceType;
    @Getter
    @JsonProperty("rid")
    private String rid;
    @Getter
    @JsonProperty("ua")
    private String ua;
    @JsonProperty("m")
    private String m;
    @Getter
    @JsonProperty("uri")
    private String uri;
    @JsonProperty("platform")
    private String platform;
    @JsonProperty("path")
    private String path;
    @JsonProperty("compression")
    private String compression;
    @Getter
    @JsonProperty("ingest_time")
    private Long ingestTime;
    @JsonProperty("timestamp")
    private Date timestamp;
    @Getter
    @JsonProperty("upload_timestamp")
    @JsonAlias("client_timestamp")
    private Long uploadTimestamp;
    @Getter
    @JsonProperty("appId")
    private String appId;

}
