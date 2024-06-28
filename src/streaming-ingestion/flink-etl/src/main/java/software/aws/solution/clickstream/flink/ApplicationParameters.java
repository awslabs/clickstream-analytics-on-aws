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
    private static final String WITH_CUSTOM_PARAMETERS = "withCustomParameters";
    private static final String ALLOW_RETENTION_HOURS = "allowRetentionHours";
    private static final String ALLOW_EVENT_LIST = "allowEventList";
    private static final String TRANSFORMER_NAME = "transformerName";

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
    private boolean enableStreamIngestion= true;
    private boolean isWithCustomParameters;
    private double allowRetentionHours;
    private List<String> allowEventList;

    private boolean uaEnrich;
    private boolean ipEnrich;
    private boolean trafficSourceEnrich;
    private String transformerName;

    private int windowSlideMinutes = 10;
    private int windowSizeMinutes = 60;
    private boolean enableWindowAgg = false;
    private String[] windowAggTypes = new String[] {"ALL"};
    private AggSqlProvider.WindowTVF windowTVF = AggSqlProvider.WindowTVF.CUMULATE;

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

         boolean withCustomParameters = Boolean.parseBoolean(props.getProperty(WITH_CUSTOM_PARAMETERS, "true"));
         parameters.setWithCustomParameters(withCustomParameters);
         log.info("With custom parameters: {}", withCustomParameters);

         String allowEventListStr = props.getProperty(ALLOW_EVENT_LIST);
         if (allowEventListStr != null
                 && !allowEventListStr.isEmpty() && !allowEventListStr.equals("ALL")) {
             parameters.setAllowEventList(List.of(allowEventListStr.split(",")));
             log.info("Allow event list: {}", String.join(",", parameters.getAllowEventList()));
         }

         double allowRetentionHours = Double.parseDouble(props.getProperty(ALLOW_RETENTION_HOURS, "0"));
         parameters.setAllowRetentionHours(allowRetentionHours);
         log.info("allow retention hours: {}", allowRetentionHours);

         String transformerName = props.getProperty(TRANSFORMER_NAME, "clickstream");
         parameters.setTransformerName(transformerName);
         log.info("transformerName: {}", transformerName);

         int windowSlideMinutes = Integer.parseInt(props.getProperty("windowSlideMinutes", "10"));
         parameters.setWindowSlideMinutes(windowSlideMinutes);
         log.info("windowSlideMinutes: {}", windowSlideMinutes);

         int windowSizeMinutes = Integer.parseInt(props.getProperty("windowSizeMinutes", "60"));
         parameters.setWindowSizeMinutes(windowSizeMinutes);
         log.info("windowSizeMinutes: {}", windowSizeMinutes);

         boolean enableWindowAgg = Boolean.parseBoolean(props.getProperty("enableWindowAgg", "false"));
         parameters.setEnableWindowAgg(enableWindowAgg);
         log.info("enableWindowAgg: {}", enableWindowAgg);

         String windowAggTypeStr = props.getProperty("windowAggTypes", AggSqlProvider.ALL);
         parameters.setWindowAggTypes(windowAggTypeStr.split(","));
         log.info("windowAggTypesStr: {}", windowAggTypeStr);

         boolean enableStreamIngestion = Boolean.parseBoolean(props.getProperty("enableStreamIngestion", "true"));
         parameters.setEnableStreamIngestion(enableStreamIngestion);
         log.info("enableStreamIngestion: {}", enableStreamIngestion);

         String windowType = props.getProperty("windowTVF", AggSqlProvider.WindowTVF.CUMULATE.name());
         parameters.setWindowTVF(AggSqlProvider.WindowTVF.valueOf(windowType));
         log.info("windowType: {}", windowType);

         validate(parameters);
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
        parameters.setTransformerName("clickstream");
        parameters.setWithCustomParameters(true);
        parameters.setAllowRetentionHours(0);
        parameters.setAllowEventList(null);
        parameters.setEnableStreamIngestion(true);
        parameters.setWindowTVF(AggSqlProvider.WindowTVF.CUMULATE);

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

        if (args.length > 8) { // WithCustomParameters
            parameters.setWithCustomParameters(Boolean.parseBoolean(args[8]));
        }

        if (args.length > 9) { // allowRetentionHours
            parameters.setAllowRetentionHours(Double.parseDouble(args[9]));
        }

        if (args.length > 10) { // AllowEventList
            parameters.setAllowEventList(List.of(args[10].split(",")));
        }

        setMoreParametersFromArgs(args, parameters);

        parameters.setRegion(args[2].split(":")[3]);
        parameters.setAppIdStreamList(getConfig(parameters.getAppIdStreamConfig(), parameters.getRegion()));

        validate(parameters);

        log.info("ApplicationParameters: {}", parameters);
        return parameters;
    }

    private static void setMoreParametersFromArgs(final String[] args, final ApplicationParameters parameters) {
        if (args.length > 11) { // transformerName
            parameters.setTransformerName(args[11]);
        }

        if (args.length > 12) { // windowSlideMinutes
            parameters.setWindowSizeMinutes(Integer.parseInt(args[12]));
        }

        if (args.length > 13) { // windowSizeMinutes
            parameters.setWindowSizeMinutes(Integer.parseInt(args[13]));
        }

        if (args.length > 14) { // enableWindowAgg
            parameters.setEnableWindowAgg(Boolean.parseBoolean(args[14]));
        }

        if (args.length > 15) { // windowAggTypes
            parameters.setWindowAggTypes(args[15].split(","));
        }

        if (args.length > 16) { // enableStreamIngestion
            parameters.setEnableStreamIngestion(Boolean.parseBoolean(args[16]));
        }

        if (args.length > 17) { // windowType
            parameters.setWindowTVF(AggSqlProvider.WindowTVF.valueOf(args[17]));
        }
    }

    private static void validate(final ApplicationParameters parameters) {
        if (!parameters.isEnableStreamIngestion() && !parameters.isEnableWindowAgg()) {
            throw new ClickstreamException("Both enableStreamIngestion and enableWindowAgg are false, at least one should be true");
        }

        if (parameters.getWindowSlideMinutes() > parameters.getWindowSizeMinutes()) {
            throw new ClickstreamException("windowSlideMinutes should be less than or equal to windowSizeMinutes");
        }
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

    public String getSinkStreamArnByAppId(final String appId) {
        for (AppIdStream appIdSteamMap : appIdStreamList) {
            if (appIdSteamMap.getAppId().equals(appId)) {
                return appIdSteamMap.getStreamArn();
            }
        }
        return null;
    }
}


