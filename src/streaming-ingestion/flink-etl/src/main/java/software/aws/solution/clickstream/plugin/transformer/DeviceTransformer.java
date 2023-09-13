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

import org.apache.flink.shaded.jackson2.com.fasterxml.jackson.databind.ObjectMapper;
import org.apache.flink.shaded.jackson2.com.fasterxml.jackson.databind.node.ArrayNode;
import org.apache.flink.shaded.jackson2.com.fasterxml.jackson.databind.node.ObjectNode;
import software.aws.solution.clickstream.plugin.enrich.Enrichment;
import software.aws.solution.clickstream.plugin.enrich.UAEnrichment;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

public class DeviceTransformer implements Transformer{
    public static final String PARAM_KEY_VENDOR_ID = "vendor_id";
    public static final String PARAM_KEY_BRAND = "brand";
    public static final String PARAM_KEY_MODEL = "model";
    public static final String PARAM_KEY_MAKE = "make";
    public static final String PARAM_KEY_SCREEN_WIDTH = "screen_width";
    public static final String PARAM_KEY_SCREEN_HEIGHT = "screen_height";
    public static final String PARAM_KEY_CARRIER = "carrier";
    public static final String PARAM_KEY_NETWORK_TYPE = "network_type";
    public static final String PARAM_KEY_OPERATING_SYSTEM = "operating_system";
    public static final String PARAM_KEY_OS_VERSION = "os_version";
    public static final String PARAM_KEY_UA = "ua";
    public static final String PARAM_KEY_SYSTEM_LANGUAGE = "system_language";
    public static final String PARAM_KEY_ZONE_OFFSET = "zone_offset";
    @Override
    public ObjectNode transform(Map<String, String> paramMap) {
        ObjectMapper jsonParser = new ObjectMapper();
        ObjectNode device = jsonParser.createObjectNode();
        String vendorId = paramMap.get(PARAM_KEY_VENDOR_ID);
        String brand = paramMap.get(PARAM_KEY_BRAND);
        String model = paramMap.get(PARAM_KEY_MODEL);
        String make = paramMap.get(PARAM_KEY_MAKE);
        int screenWidth = Integer.parseInt(paramMap.get(PARAM_KEY_SCREEN_WIDTH));
        int screenHeight = Integer.parseInt(paramMap.get(PARAM_KEY_SCREEN_HEIGHT));
        String carrier = paramMap.get(PARAM_KEY_CARRIER);
        String networkType = paramMap.get(PARAM_KEY_NETWORK_TYPE);
        String operatingSystem = paramMap.get(PARAM_KEY_OPERATING_SYSTEM);
        String osVersion = paramMap.get(PARAM_KEY_OS_VERSION);
        String systemLanguage = paramMap.get(PARAM_KEY_SYSTEM_LANGUAGE);
        long zoneOffset = Long.parseLong(paramMap.get(PARAM_KEY_ZONE_OFFSET));
        device.put("vendor_id", vendorId);
        device.put("mobile_brand_name", brand);
        device.put("mobile_model_name", model);
        device.put("manufacturer", make);
        device.put("screen_width", screenWidth);
        device.put("screen_height", screenHeight);
        device.put("carrier", carrier);
        device.put("network_type", networkType);
        device.put("operating_system", operatingSystem);
        device.put("operating_system_version", osVersion);

        if (paramMap.containsKey(PARAM_KEY_UA)) {
            Enrichment uaEnrich = new UAEnrichment();
            Map<String, String> uaParamMap = new HashMap<>();
            uaParamMap.put(UAEnrichment.PARAM_KEY_UA, paramMap.get(PARAM_KEY_UA));
            uaEnrich.enrich(device, uaParamMap);
        }

        device.put("system_language", systemLanguage);
        device.put("time_zone_offset_seconds", zoneOffset);
        device.set("advertising_id", null);
        device.set("host_name", null);

        return device;
    }

    @Override
    public ArrayNode transformArrayNode(List<KvObjectNode> paramList) {
        return null;
    }

    @Override
    public ObjectNode transformObjectNode(List<JsonObjectNode> paramList) {
        return null;
    }

}
