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

package software.aws.solution.clickstream.util;

import com.fasterxml.jackson.core.*;
import com.fasterxml.jackson.databind.*;
import lombok.extern.slf4j.*;
import software.aws.solution.clickstream.common.ingest.*;
import software.aws.solution.clickstream.common.model.*;

import java.io.*;
import java.net.*;
import java.util.*;

@Slf4j
public final class Utils {
    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();

    private Utils() {
    }

    public static Map<String, String> convertStringObjectMapToStringStringMap(final Map<String, Object> inputMap) {
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
                    log.error("convertStringObjectMapToStringStringMap::Error converting object to string", e);
                    log.error("key: " + k + " value: " + v);
                }
            }
        }
        return result;
    }

    public static Map<String, ClickstreamEventPropValue> convertStringObjectMapToStringEventPropMap(final Map<String, Object> inputMap)
            throws JsonProcessingException {
        Map<String, ClickstreamEventPropValue> result = new HashMap<>();

        for (Map.Entry<String, Object> entry : inputMap.entrySet()) {
            String k = entry.getKey();
            Object v = entry.getValue();
            if (v instanceof String) {
                result.put(k, new ClickstreamEventPropValue(v.toString(), ValueType.STRING));
            } else if (v instanceof Number) {
                result.put(k, new ClickstreamEventPropValue(v.toString(), ValueType.NUMBER));
            } else if (v instanceof Boolean) {
                result.put(k, new ClickstreamEventPropValue(v.toString(), ValueType.BOOLEAN));
            } else {
                try {
                    result.put(k, new ClickstreamEventPropValue(OBJECT_MAPPER.writeValueAsString(v), ValueType.OBJECT));
                } catch (JsonProcessingException e) {
                    log.error("convertStringObjectMapToStringEventPropMap::Error converting object to string", e);
                    throw e;
                }
            }

        }
        return result;
    }


    public static Map<String, ClickstreamUserPropValue> convertStringObjectMapToStringUserPropMap(final Map<String, Object> inputMap)
            throws JsonProcessingException {
        Map<String, ClickstreamUserPropValue> result = new HashMap<>();

        for (Map.Entry<String, Object> entry : inputMap.entrySet()) {
            String k = entry.getKey();
            Object v = entry.getValue();
            if (v instanceof String) {
                result.put(k, new ClickstreamUserPropValue(v.toString(), ValueType.STRING, null));
            } else if (v instanceof Number) {
                result.put(k, new ClickstreamUserPropValue(v.toString(), ValueType.NUMBER, null));
            } else if (v instanceof Boolean) {
                result.put(k, new ClickstreamUserPropValue(v.toString(), ValueType.BOOLEAN, null));
            } else {
                try {
                    result.put(k, new ClickstreamUserPropValue(OBJECT_MAPPER.writeValueAsString(v), ValueType.OBJECT, null));
                } catch (JsonProcessingException e) {
                    log.error("convertStringObjectMapToStringUserPropMap::Error converting object to string", e);
                    throw e;
                }
            }
        }
        return result;
    }

    public static Map<String, ClickstreamUserPropValue> convertCustomerUserPropMapToStringUserPropMap(final Map<String, UserPropObjectValue> customProperties)
            throws JsonProcessingException {
        Map<String, ClickstreamUserPropValue> result = new HashMap<>();

        for (Map.Entry<String, UserPropObjectValue> entry : customProperties.entrySet()) {
            String k = entry.getKey();
            UserPropObjectValue v = entry.getValue();
            if (v.getValue() instanceof String) {
                result.put(k, new ClickstreamUserPropValue(v.getValue().toString(), ValueType.STRING, v.getSetTimestamp()));
            } else if (v.getValue() instanceof Number) {
                result.put(k, new ClickstreamUserPropValue(v.getValue().toString(), ValueType.NUMBER, v.getSetTimestamp()));
            } else if (v.getValue() instanceof Boolean) {
                result.put(k, new ClickstreamUserPropValue(v.getValue().toString(), ValueType.BOOLEAN, v.getSetTimestamp()));
            } else {
                result.put(k, new ClickstreamUserPropValue(OBJECT_MAPPER.writeValueAsString(v.getValue()), ValueType.OBJECT, v.getSetTimestamp()));
            }
        }

        return result;
    }

    public static String objectToJsonString(final Object obj) throws JsonProcessingException {
        return OBJECT_MAPPER.writeValueAsString(obj);
    }

    public static String getStackTrace(final Exception e) {
        StringBuilder sb = new StringBuilder();
        sb.append(e.getClass()).append(": ")
                .append(e.getMessage()).append("\n");
        for (StackTraceElement element : e.getStackTrace()) {
            sb.append(element.toString());
            sb.append("\n");
        }
        return sb.toString();
    }


    public static Map<String, List<String>> splitQuery(final URI uri) {
        final Map<String, List<String>> queryPairs = new LinkedHashMap<>();
        if (uri.getQuery() == null) {
            return queryPairs;
        }
        final String[] pairs = uri.getQuery().split("&");
        for (String pair : pairs) {
            final int idx = pair.indexOf("=");
            final String key = idx > 0 ? urlDecode(pair.substring(0, idx)) : pair;
            final String value = idx > 0 && pair.length() > idx + 1 ? urlDecode(pair.substring(idx + 1)) : null;
            queryPairs.computeIfAbsent(key, k -> new LinkedList<>()).add(value);
        }
        return queryPairs;
    }

    private static String urlDecode(final String value) {
        try {
            return URLDecoder.decode(value, "utf-8");
        } catch (UnsupportedEncodingException e) {
            log.error("urlDecode error decoding: '" + value + "'", e);
            return value;
        }
    }
}
