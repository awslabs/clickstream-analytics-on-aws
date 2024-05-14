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


package software.aws.solution.clickstream.common.enrich.ua;

import lombok.Getter;
import lombok.extern.slf4j.Slf4j;
import org.yaml.snakeyaml.Yaml;
import org.yaml.snakeyaml.constructor.SafeConstructor;
import ua_parser.Parser;

import java.io.IOException;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.regex.Pattern;

@Slf4j
public class UaDeviceParser {
    public static final String CS_REGEXES_YAML = "/ua/cs_regexes.yaml";
    public static final String UA_PARSER_REGEXES_YAML = "/ua_parser/regexes.yaml";
    @Getter
    private final List<UaDevicePattern> patterns;

    UaDeviceParser(final List<UaDevicePattern> patterns) {
        this.patterns = patterns;
    }

    static UaDeviceParser fromList(final List<Map<String, String>> configList) {
        List<UaDevicePattern> configPatterns = new ArrayList<>();
        for (Map<String, String> configMap : configList) {
            configPatterns.add(patternFromMap(configMap));
        }
        return new UaDeviceParser(new CopyOnWriteArrayList<>(configPatterns));
    }

    static UaDevicePattern patternFromMap(final Map<String, String> configMap) {
        String regex = configMap.get("regex");
        if (regex == null) {
            throw new IllegalArgumentException("Device is missing regex");
        }
        Pattern pattern = "i".equals(configMap.get("regex_flag"))
                ? Pattern.compile(regex, Pattern.CASE_INSENSITIVE)
                : Pattern.compile(regex);

        return new UaDevicePattern(pattern,
                configMap.get("device_replacement"),
                configMap.get("brand_replacement"),
                configMap.get("model_replacement")
        );
    }

    public static UaDeviceParser newInstance() {
        return newInstance(CS_REGEXES_YAML);
    }

    public static UaDeviceParser newInstance(final String extraConfigFile) {

        List<Map<String, String>> deviceParserConfigs = new ArrayList<>();
        if (extraConfigFile != null && UaDeviceParser.class.getResource(extraConfigFile) != null) {
            List<Map<String, String>> deviceParserConfigs1 = getDeviceParserConfigs(extraConfigFile);
            deviceParserConfigs.addAll(deviceParserConfigs1);
        } else {
            log.warn("Failed to load extra config file {}", extraConfigFile);
        }
        List<Map<String, String>> deviceParserConfigs2 = getDeviceParserConfigs(UA_PARSER_REGEXES_YAML);
        deviceParserConfigs.addAll(deviceParserConfigs2);

        return UaDeviceParser.fromList(deviceParserConfigs);
    }

    static List<Map<String, String>> getDeviceParserConfigs(final String configYamlFile) {
        log.info("Loading device parser configs from {}", configYamlFile);
        byte[] regexYaml;
        try (InputStream is = Parser.class.getResourceAsStream(configYamlFile)) {
            if (is == null) {
                throw new RuntimeException("failed to load " + configYamlFile);
            }
            regexYaml = is.readAllBytes();
            if (regexYaml == null || regexYaml.length == 0) {
                throw new RuntimeException("failed to load regexes.yaml bundled in jar");
            }
        } catch (IOException e) {
            throw new RuntimeException("failed to initialize parser from regexes.yaml bundled in jar", e);
        }

        Yaml yaml = new Yaml(new SafeConstructor());
        Map<String, List<Map<String, String>>> regexConfig = yaml.load(new String(regexYaml));
        List<Map<String, String>> deviceParserConfigs = regexConfig.get("device_parsers");
        if (deviceParserConfigs == null) {
            throw new IllegalArgumentException("device_parsers is missing from yaml");
        }
        log.info("Loaded {} device parser configs", deviceParserConfigs.size());
        return deviceParserConfigs;
    }

    public UaDevice parseUADevice(final String agentString) {
        if (agentString == null) {
            return null;
        }
        for (UaDevicePattern p : patterns) {
            UaDevice uaDevice = p.match(agentString);
            if (uaDevice != null) {
                return uaDevice;
            }
        }
        log.info("No match found for '{}'", agentString);
        return null;
    }

}
