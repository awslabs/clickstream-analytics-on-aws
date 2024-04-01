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


package software.aws.solution.clickstream.common.enrich;

import com.fasterxml.jackson.core.*;
import com.fasterxml.jackson.core.type.*;
import com.fasterxml.jackson.databind.*;
import lombok.extern.slf4j.*;
import software.aws.solution.clickstream.common.model.*;
import ua_parser.*;

import java.util.*;

@Slf4j
public final class UAEnrichHelper {
    private static final Parser UA_PARSER = new Parser();
    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();
    public static final String UA_STRING = "string";

    private UAEnrichHelper() {
    }
    public static ClickstreamUA parserUA(final String userAgent) {
        ClickstreamUA clickstreamUA = new ClickstreamUA();
        Client client = UA_PARSER.parse(userAgent);
        clickstreamUA.setUaBrowser(client.userAgent.family);
        clickstreamUA.setUaBrowserVersion(getVersion(client.userAgent.major, client.userAgent.minor, client.userAgent.patch));

        clickstreamUA.setUaOs(client.os.family);
        clickstreamUA.setUaOsVersion(getVersion(client.os.major, client.os.minor, client.os.patch));

        clickstreamUA.setUaDevice(client.device.family);
        clickstreamUA.setUaDeviceCategory(getCategory(client.device.family));
        Map<String, Object> uaMap = new HashMap<>();

        try {
            String uaJsonStr = OBJECT_MAPPER.writeValueAsString(client);
            uaMap = OBJECT_MAPPER.readValue(uaJsonStr, new TypeReference<Map<String, Object>>(){});
        } catch (JsonProcessingException e) {
            log.error("parserUA::Error parsing user agent", e);
            log.error("parserUA::User agent: {}", userAgent);
        }
        uaMap.put(UA_STRING, userAgent);
        clickstreamUA.setUaMap(uaMap);

        return clickstreamUA;
    }

    private static String getCategory(final String family) {
        if (family == null) {
            return null;
        }
        if (family.toLowerCase().contains("bot")) {
            return "Bot";
        } else if (family.toLowerCase().contains("mobile") || family.toLowerCase().contains("phone")) {
            return "Mobile";
        } else if (family.toLowerCase().contains("tablet") || family.toLowerCase().contains("pad") || family.toLowerCase().contains("kindle")) {
            return "Tablet";
        } else if (family.toLowerCase().contains("pc") || family.toLowerCase().contains("mac") || family.toLowerCase().contains("linux")) {
            return "PC";
        } else {
            return "Other";
        }
    }

    private static String getVersion(final String major, final String minor, final String patch) {
        if (major != null && minor != null && patch != null) {
            return String.format("%s.%s.%s", major, minor, patch);
        } else if (major != null && minor != null) {
            return String.format("%s.%s", major, minor);
        } else if (major != null) {
            return major;
        } else {
            return null;
        }
    }
}
