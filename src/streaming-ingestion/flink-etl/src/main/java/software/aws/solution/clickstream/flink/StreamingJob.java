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

import lombok.extern.slf4j.Slf4j;
import org.apache.flink.api.connector.sink2.Sink;
import org.apache.flink.api.java.tuple.Tuple2;
import org.apache.flink.streaming.api.datastream.DataStream;
import org.apache.flink.streaming.api.datastream.SingleOutputStreamOperator;
import org.apache.flink.streaming.api.environment.LocalStreamEnvironment;
import org.apache.flink.streaming.api.environment.StreamExecutionEnvironment;
import org.apache.flink.streaming.api.functions.sink.v2.DiscardingSink;
import org.apache.flink.streaming.api.functions.source.SourceFunction;
import org.apache.flink.table.api.DataTypes;
import org.apache.flink.table.api.FormatDescriptor;
import org.apache.flink.table.api.Schema;
import org.apache.flink.table.api.Table;
import org.apache.flink.table.api.TableDescriptor;
import org.apache.flink.table.api.bridge.java.StreamStatementSet;
import org.apache.flink.table.api.bridge.java.StreamTableEnvironment;
import org.apache.flink.table.catalog.ResolvedSchema;
import org.apache.flink.util.OutputTag;
import software.aws.solution.clickstream.common.EventParser;
import software.aws.solution.clickstream.common.RuleConfig;
import software.aws.solution.clickstream.common.TransformConfig;
import software.aws.solution.clickstream.common.model.ClickstreamEvent;
import software.aws.solution.clickstream.function.ExplodeDataFlatMapFunction;
import software.aws.solution.clickstream.function.RouteProcessFunction;
import software.aws.solution.clickstream.function.TransformDataMapFunction;
import software.aws.solution.clickstream.function.TransformEventFlatMapFunctionV2;
import software.aws.solution.clickstream.plugin.enrich.ClickstreamEventEnrichment;
import software.aws.solution.clickstream.plugin.enrich.IPEnrichmentV2;
import software.aws.solution.clickstream.plugin.enrich.UAEnrichmentV2;

import java.io.File;
import java.io.IOException;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import static org.apache.flink.table.api.Expressions.$;
import static org.apache.flink.table.api.Expressions.dateFormat;

@Slf4j
public class StreamingJob {
    public static final String TMP_GEO_LITE_2_CITY_MMDB = "/tmp/GeoLite2-City.mmdb";
    public static final String CACHED_FILE_GEO_LITE_2_CITY_MMDB = "CACHED_FILE_GEO_LITE_2_CITY_MMDB";
    private final StreamSourceAndSinkProvider streamProvider;
    private final ApplicationParameters props;
    private final HashMap<String, Sink<String>> appSinkMap = new HashMap<>();
    private final ArrayList<String> appIds = new ArrayList<>();
    private final StreamExecutionEnvironment env;
    private final StreamTableEnvironment tableEnv;
    private final StreamStatementSet statementSet;
    private final EventParser eventParser;

    public StreamingJob(final StreamExecutionEnvironment env,
                        final StreamSourceAndSinkProvider streamSourceAndSinkProvider,
                        final ApplicationParameters props,
                        final EventParser eventParser) {
        this.streamProvider = streamSourceAndSinkProvider;
        this.props = props;
        this.env = env;
        this.eventParser = eventParser;
        this.tableEnv = StreamTableEnvironment.create(this.env);
        this.statementSet = tableEnv.createStatementSet();

        log.info("Application properties: {}", this.props);

        for (AppIdStream appIdStreamMap : this.props.getAppIdStreamList()) {
            if (appIdStreamMap.isEnabled()) {
                String appId = appIdStreamMap.getAppId();
                Sink<String> sink = this.streamProvider.createSink(appId);
                appSinkMap.put(appId, sink);
                appIds.add(appId);
            }
        }
    }

    public static void main(final String[] args) throws Exception {
        StreamExecutionEnvironment env = StreamExecutionEnvironment.getExecutionEnvironment();
        ApplicationParameters props = ApplicationParameters.loadApplicationParameters(args, env instanceof LocalStreamEnvironment);
        StreamSourceAndSinkProvider streamSourceAndSinkProvider = new StreamSourceAndSinkProviderImpl(props);

        EventParser eventParser = getEventParser(props);
        StreamingJob job = new StreamingJob(env, streamSourceAndSinkProvider, props, eventParser);
        if (job.executeStreamJob()) {
            env.execute("Clickstream application " + String.join("-", job.appIds));
        }
    }

    static EventParser getEventParser(final ApplicationParameters props) throws IOException {
        TransformConfig transformConfig = new TransformConfig();
        transformConfig.setTrafficSourceEnrichmentDisabled(!props.isTrafficSourceEnrich());
        transformConfig.setAppRuleConfig(getAppRuleConfig(props));

        List<String> allowEvents = props.getAllowEventList();
        if (props.isEnableWindowAgg()) {
            allowEvents = null;
            log.info("Enable window aggregation, set transformConfig.allowEvents: null for ALL events");
        }
        transformConfig.setAllowEvents(allowEvents);

        long allowEventTimeMaxLatencyMilisec = Math.round(props.getAllowRetentionHours() * 3600 * 1000);
        // at least 1 seconds
        transformConfig.setAllowEventTimeMaxLatencyMilisec(allowEventTimeMaxLatencyMilisec >= 1000 ? allowEventTimeMaxLatencyMilisec : 0);
        String transformName = props.getTransformerName();
        return EventParserFactory.newEventParser(transformConfig, transformName);
    }

    private static Map<String, RuleConfig> getAppRuleConfig(final ApplicationParameters props) throws IOException {
        String s3Path = props.getAppRuleConfigPath();
        String region = props.getRegion();
        log.info("getAppRuleConfig rule config from s3: {}", s3Path);
        List<String> appIds = props.getAppIdStreamList().stream().map(AppIdStream::getAppId).collect(Collectors.toList());
        String categoryRuleFile ="traffic_source_category_rule_v1.json";
        String channelRuleFile = "traffic_source_channel_rule_v1.json";

        Map<String, RuleConfig> ruleConfigMap = new HashMap<>();
        for (String appId : appIds) {
            RuleConfig ruleConfig = new RuleConfig();
            ruleConfig.setOptChannelRuleJson(getRuleConfig(appId, s3Path, channelRuleFile, region));
            ruleConfig.setOptCategoryRuleJson(getRuleConfig(appId, s3Path, categoryRuleFile, region));
            ruleConfigMap.put(appId, ruleConfig);
        }
        return ruleConfigMap;
    }

    private static String getRuleConfig(final String appId, final String s3PathInput, final String fileName, final String region) throws IOException {
        String s3Path = s3PathInput;
        String delimiter = "/";
        if (!s3Path.endsWith(delimiter)) {
            s3Path += delimiter;
        }
        String s3ObjectPath = s3Path + appId  + delimiter +  fileName;

        log.info("Get rule config from s3: {}", s3ObjectPath);
        String contentStr = Utils.getInstance().readS3TextFile(s3ObjectPath, region);
        log.info("Rule config content.length: {}", contentStr.length() + " for " + s3ObjectPath);
        return contentStr;
    }

    public boolean executeStreamJob() throws IOException {
        if (appIds.isEmpty()) {
            log.error("No appId is enabled, exit");
            return false;
        }

        log.info("Enabled appId list: {}", appIds);
        registerCachedFile();

        SourceFunction<String> kinesisSource = this.streamProvider.createSource(); // NOSONAR
        DataStream<String> inputStream = env.addSource(kinesisSource, "Kinesis source"); // NOSONAR
        runWithFlink(inputStream);
        if (props.isEnableWindowAgg()) {
            this.statementSet.attachAsDataStream();
        }
        return true;
    }

    private void registerCachedFile() throws IOException {
        String bucketName = this.props.getDataBucketName();
        String geoFileKey = this.props.getGeoFileKey();
        String region = this.props.getRegion();
        File dbFile = new File(TMP_GEO_LITE_2_CITY_MMDB); // NOSONAR
        if (!dbFile.exists()) {
            dbFile = Utils.getInstance().dowloadS3File(bucketName, geoFileKey, region, TMP_GEO_LITE_2_CITY_MMDB);
            log.info("Downloaded {} to {}, file size: {}", geoFileKey, dbFile.getAbsolutePath(), dbFile.length());
        }
        this.env.registerCachedFile(dbFile.getAbsolutePath(), CACHED_FILE_GEO_LITE_2_CITY_MMDB);
    }

    private void runWithFlink(final DataStream<String> inputStream) throws IOException {

        RouteProcessFunction processFunction = new RouteProcessFunction(appIds);
        Map<String, OutputTag<String>> sideAppOutputTagMap = processFunction.getSideAppOutputTagMap();
        SingleOutputStreamOperator<String> mainStream = inputStream.process(processFunction);

        String defaultAppId = appIds.get(0);
        transformAndSink(defaultAppId, mainStream, appSinkMap.get(defaultAppId));

        for (Map.Entry<String, OutputTag<String>> entry : sideAppOutputTagMap.entrySet()) {
            String appId = entry.getKey();
            DataStream<String> sideAppStream = mainStream.getSideOutput(entry.getValue());
            Sink<String> outKinesisSink = appSinkMap.get(appId);
            transformAndSink(appId, sideAppStream, outKinesisSink);
        }

    }

    private void transformAndSink(final String appId, final DataStream<String> inputStream,
                                  final Sink<String> outKinesisSink) throws IOException {
        if ("v2".equals(props.getTransformVersion())) {
            transformAndSinkV2(appId, inputStream, outKinesisSink);
        } else {
            transformAndSinkV1(appId, inputStream, outKinesisSink);
        }
    }

    private void transformAndSinkV1(final String appId, final DataStream<String> inputStream,
                                  final Sink<String> outKinesisSink) {
        String projectId = props.getProjectId();
        String bucketName = props.getDataBucketName();
        String geoFileKey = props.getGeoFileKey();
        String region = props.getRegion();

        log.info("transformAndSink appId: {}", appId);
        DataStream<Tuple2<String, String>> explodedData = inputStream.flatMap(new ExplodeDataFlatMapFunction(appId)).name("ExplodeDataFlatMapFunction" + appId);
        DataStream<String> transformedData = explodedData.map(new TransformDataMapFunction(appId, projectId, bucketName, geoFileKey, region))
                .name("TransformDataMapFunction" + appId);
        transformedData.sinkTo(outKinesisSink).name(appId);
    }

    private void transformAndSinkV2(final String appId, final DataStream<String> inputStream,
                                  final Sink<String> outKinesisSink) throws IOException {
        String projectId = props.getProjectId();
        log.info("transformAndSinkV2 appId: {}", appId);
        boolean withCustomParameters = props.isWithCustomParameters();

        List<String> streamIngestionAllowEventList = props.getAllowEventList();

        TransformEventFlatMapFunctionV2 transformEventProcessFunction = new TransformEventFlatMapFunctionV2(projectId, appId, eventParser,
                getEnrichments(), withCustomParameters, streamIngestionAllowEventList);
        SingleOutputStreamOperator<String> transformedData = inputStream.process(transformEventProcessFunction).name("TransformEventFunction-" + appId);

        if (props.isEnableStreamIngestion()) {
            transformedData.sinkTo(outKinesisSink).name(appId);
        } else {
            transformedData.sinkTo(new DiscardingSink<>()).name("Discarding-" + appId).setParallelism(1);
        }
        aggStreamTable(appId, transformedData.getSideOutput(transformEventProcessFunction.getTableRowOutputTag()));
    }

    void aggStreamTable(final String appId, final DataStream<ClickstreamEvent> inputStream) {
        if (!props.isEnableWindowAgg()) {
            return;
        }
        Table table = tableEnv.fromDataStream(inputStream, Schema.newBuilder()
                //.columnByExpression("proc_time", "PROCTIME()")
                .columnByExpression("event_time", "CAST(eventTimestamp AS TIMESTAMP_LTZ(3))")
                .watermark("event_time", "event_time - INTERVAL '10' SECOND")
                .build());

        log.info("{} Table schema: {}", appId, table.getResolvedSchema());
        String viewName = "clickstream_" + appId;
        tableEnv.createTemporaryView(viewName, table);
        String sql = getAggSql(viewName, table.getResolvedSchema());
        if (sql.isEmpty()) {
            return;
        }
        Table aggTable = tableEnv.sqlQuery(sql).addColumns(
                dateFormat($("window_start"), "yyyyMMdd").as("date")
        );
        String sinkTable = getAggSinkTable(appId);
        this.statementSet.add(aggTable.insertInto(sinkTable));
    }

    private String getAggSql(final String viewName, final ResolvedSchema schema) {
        int windowSlide = this.props.getWindowSlideMinutes();
        int windowSize = this.props.getWindowSizeMinutes();
        String[] aggTypes = this.props.getWindowAggTypes();
        AggSqlProvider.WindowTVF windowTVF = this.props.getWindowTVF();
        String sql = AggSqlProvider.builder()
                .viewName(viewName)
                .windowSize(windowSize)
                .windowSlide(windowSlide)
                .sourceTableSchema(schema)
                .addAggTypes(aggTypes)
                .windowTVF(windowTVF)
                .build()
                .getSql();

        log.info("SQL: {}", sql);
        return sql;
    }

    String getAggSinkTable(final String appId) {
        String bucket = this.props.getDataBucketName();
        String projectId = this.props.getProjectId();
        String fileName =  "agg_result.json";
        String sinkTableName = fileName.replace(".json", "_" + appId);

        String s3Path = String.format("s3://%s/clickstream/%s/flink/AggReports/%s/%s", bucket, projectId, appId, fileName);

        if ("_".equals(bucket)) { // Test local
            s3Path = Paths.get("/", "tmp", appId, fileName).toString();
        }
        log.info("Agg Sink table path: {}", s3Path);
        Schema schema = Schema.newBuilder()
                .column("window_start", DataTypes.TIMESTAMP(3))
                .column("window_end", DataTypes.TIMESTAMP(3))
                .column("data_type", DataTypes.STRING())
                .column("event_count", DataTypes.BIGINT())
                .column("user_count", DataTypes.BIGINT())
                .column("top_rank", DataTypes.BIGINT())
                .column("property_name", DataTypes.STRING())
                .column("property_value", DataTypes.STRING())
                .column("date", DataTypes.STRING())
                .build();

        tableEnv.createTemporaryTable(sinkTableName, TableDescriptor.forConnector("filesystem")
                .schema(schema)
                .partitionedBy("date")
                .option("path", s3Path)
                .option("sink.rolling-policy.check-interval", "1 min")
                .option("sink.rolling-policy.rollover-interval", "1 min")
                .format(FormatDescriptor.forFormat("json")
                        .build())
                .build());
        return sinkTableName;
    }

    private List<ClickstreamEventEnrichment> getEnrichments() {
        List<ClickstreamEventEnrichment> enrichments = new ArrayList<>();
        if (this.props.isIpEnrich()) {
           enrichments.add(new IPEnrichmentV2());
        }
        if (this.props.isUaEnrich()) {
            enrichments.add(new UAEnrichmentV2());
        }
        return enrichments;

    }

}
