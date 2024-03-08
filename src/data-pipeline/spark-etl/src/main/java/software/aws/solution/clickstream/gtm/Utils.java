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

package software.aws.solution.clickstream.gtm;

import com.fasterxml.jackson.core.*;
import com.fasterxml.jackson.databind.*;
import lombok.extern.slf4j.*;

import java.util.*;

@Slf4j
public final class Utils {
    private Utils() {
    }
    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();
    public static Map<String, String> convertStringObjectMapToStringJsonMap(final Map<String, Object> inputMap) throws JsonProcessingException {
        Map<String, String> result = new HashMap<>();

        for (Map.Entry<String, Object> entry : inputMap.entrySet()) {
            String k = entry.getKey();
            Object v = entry.getValue();
            if (v instanceof String) {
                result.put(k, (String) v);
            } else {
                try {
                    result.put(k, OBJECT_MAPPER.writeValueAsString(v));
                } catch (JsonProcessingException e) {
                    log.error("Error converting object to string", e);
                    throw e;
                }
            }
        }
        return result;
    }

    public static String objectToJsonString(final Object obj) throws JsonProcessingException {
        return OBJECT_MAPPER.writeValueAsString(obj);
    }

    public static String getStackTrace(final Exception e) {
        StringBuilder sb = new StringBuilder();
        for (StackTraceElement element : e.getStackTrace()) {
            sb.append(element.toString());
            sb.append("\n");
        }
        return sb.toString();
    }
}
