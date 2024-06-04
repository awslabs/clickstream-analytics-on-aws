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

package software.aws.solution.clickstream.flink;

import com.amazonaws.services.kinesisanalytics.runtime.KinesisAnalyticsRuntime;
import lombok.Getter;
import lombok.Setter;
import lombok.ToString;
import lombok.extern.slf4j.Slf4j;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.Properties;

@Setter
@Getter
@ToString
@Slf4j
public class ApplicationParameters {
    public static final String ENVIRONMENT_PROPERTIES = "EnvironmentProperties";
    private static final String DATA_BUCKET_NAME = "dataBucketName";
    private static final String APP_ID_STREAM_CONFIG = "appIdStreamConfig";
    private static final String PROJECT_ID = "projectId";
    private static final String GEO_FILE_KEY = "geoFileKey";
    private static final String INPUT_STREAM_ARN = "inputStreamArn";
    private static final String TRANSFORM_VERSION = "transformVersion";
    private static final String APP_RULE_CONFIG_PATH = "appRuleConfigPath";
    private static final String ENABLE_UA_ENRICH = "enableUaEnrich";
    private static final String ENABLE_IP_ENRICH = "enableIpEnrich";
    private static final String ENABLE_TRAFFIC_SOURCE_ENRICH = "enableTrafficSourceEnrich";

    private String dataBucketName;
    private String region;
    private String geoFileKey;
    private String inputStreamArn;
    private String inputStreamName;
    private String projectId;
    private String appIdStreamConfig;
    private String transformVersion;
    private String appRuleConfigPath;
    private List<AppIdStream> appIdStreamList;
    private int parallelism = 0;

    private boolean uaEnrich;
    private boolean ipEnrich;
    private boolean trafficSourceEnrich;

     static ApplicationParameters fromProperties(final Properties props) {
        ApplicationParameters parameters = new ApplicationParameters();

        String inputStreamArn = props.getProperty(INPUT_STREAM_ARN);
        String region = inputStreamArn.split(":")[3];
        String bucket = props.getProperty(DATA_BUCKET_NAME);
        String projectId = props.getProperty(PROJECT_ID);
        String transformVersion = props.getProperty(TRANSFORM_VERSION);

        boolean enableUaEnrich = Boolean.parseBoolean(props.getProperty(ENABLE_UA_ENRICH, "true"));
        parameters.setUaEnrich(enableUaEnrich);

        boolean enableIpEnrich = Boolean.parseBoolean(props.getProperty(ENABLE_IP_ENRICH, "true"));
        parameters.setIpEnrich(enableIpEnrich);

        boolean enableTrafficSourceEnrich =  Boolean.parseBoolean(props.getProperty(ENABLE_TRAFFIC_SOURCE_ENRICH, "true"));
        parameters.setTrafficSourceEnrich(enableTrafficSourceEnrich);

        parameters.setDataBucketName(bucket);
        parameters.setGeoFileKey(props.getProperty(GEO_FILE_KEY));
        parameters.setInputStreamArn(inputStreamArn);
        parameters.setProjectId(projectId);
        if (transformVersion == null || transformVersion.isEmpty()) {
            transformVersion = "v1";
        }
        parameters.setTransformVersion(transformVersion);

         String s3Schema = "s3://";
         String defaultConfigS3Path = s3Schema + bucket + "/clickstream/" + projectId + "/config/flink/appIdStreamConfig.json";
        String appIdStreamConfig = props.getProperty(APP_ID_STREAM_CONFIG, defaultConfigS3Path);
        log.info("AppIdStreamConfig: {}", appIdStreamConfig);
        parameters.setAppIdStreamConfig(appIdStreamConfig);

        String defaultAppRuleConfigPath = s3Schema + bucket + "/clickstream/" + projectId + "/rules/";
        String appRuleConfigPath = props.getProperty(APP_RULE_CONFIG_PATH, defaultAppRuleConfigPath);
        log.info("appRuleConfigPath: {}", appRuleConfigPath);
        parameters.setAppRuleConfigPath(appRuleConfigPath);

        parameters.setRegion(region);
        parameters.setAppIdStreamList(getConfig(parameters.getAppIdStreamConfig(), region));
        parameters.setInputStreamName(inputStreamArn.split("/")[1]);
        return parameters;
    }


    public static List<AppIdStream> getConfig(final String s3PathOrStringContent, final String region) {
        if (s3PathOrStringContent == null || s3PathOrStringContent.isEmpty()) {
            log.warn("return empty config");
            return new ArrayList<>();
        }
        try {
            String contentStr = s3PathOrStringContent;
            if (s3PathOrStringContent.startsWith("s3://")) {
                log.info("Get config from s3: {}", s3PathOrStringContent);
                contentStr = Utils.getInstance().readS3TextFile(s3PathOrStringContent, region);
            }
            log.info("Config content: {}", contentStr);
            AppIdSteamConfig appIdSteamConfigs = Utils.fromJson(contentStr, AppIdSteamConfig.class);
            return appIdSteamConfigs.getAppIdStreamList();
        } catch (Exception e) {
            log.error(e.getMessage(), e);
            log.warn("return empty config");
            return new ArrayList<>();
        }
    }

    private static ApplicationParameters fromArgs(final String[] args) {
        ApplicationParameters parameters = new ApplicationParameters();
        parameters.setDataBucketName(args[0]);
        parameters.setGeoFileKey(args[1]);
        parameters.setInputStreamArn(args[2]);
        parameters.setProjectId(args[3]);
        parameters.setAppIdStreamConfig(args[4]);
        if (args.length > 5) {
            parameters.setTransformVersion(args[5]);
        }
        if (args.length > 6) {
            parameters.setAppRuleConfigPath(args[6]);
        }
        if (args.length > 7) {
            String enrichFlag = args[7].toLowerCase();
            if (enrichFlag.contains("ua")) {
                parameters.setUaEnrich(true);
            }

            if (enrichFlag.contains("ip")) {
                parameters.setIpEnrich(true);
            }
            if (enrichFlag.contains("ts") || enrichFlag.contains("traffic")) {
                parameters.setTrafficSourceEnrich(true);
            }
        }

        parameters.setRegion(args[2].split(":")[3]);
        parameters.setAppIdStreamList(getConfig(parameters.getAppIdStreamConfig(), parameters.getRegion()));
        return parameters;
    }

    public static ApplicationParameters loadApplicationParameters(final String[] args, final boolean isLocal) throws IOException {
        if (isLocal) {
            return ApplicationParameters.fromArgs(args);
        } else {
            Properties flinkProperties = KinesisAnalyticsRuntime.getApplicationProperties().get(ENVIRONMENT_PROPERTIES);
            if (flinkProperties == null) {
                throw new ClickstreamException("Unable to load FlinkApplicationProperties properties from runtime properties");
            }
            return ApplicationParameters.fromProperties(flinkProperties);
        }
    }

    public String getSinkStreamNameByAppId(final String appId) {
        for (AppIdStream appIdSteamMap : appIdStreamList) {
            if (appIdSteamMap.getAppId().equals(appId)) {
                return appIdSteamMap.getStreamArn().split("/")[1];
            }
        }
        return null;
    }

}


