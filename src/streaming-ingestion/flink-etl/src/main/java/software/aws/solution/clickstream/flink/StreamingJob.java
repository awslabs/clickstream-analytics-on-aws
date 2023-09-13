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
 import org.apache.flink.api.common.functions.FilterFunction;
 import org.apache.flink.api.common.serialization.SimpleStringSchema;
 import org.apache.flink.api.common.typeinfo.Types;
 import org.apache.flink.api.connector.sink2.Sink;
 import org.apache.flink.api.java.tuple.Tuple2;
 import org.apache.flink.api.java.utils.ParameterTool;
 import org.apache.flink.connector.aws.config.AWSConfigConstants;
 import org.apache.flink.connector.kinesis.sink.KinesisStreamsSink;
 import org.apache.flink.shaded.jackson2.com.fasterxml.jackson.databind.JsonNode;
 import org.apache.flink.shaded.jackson2.com.fasterxml.jackson.databind.ObjectMapper;
 import org.apache.flink.shaded.jackson2.com.fasterxml.jackson.databind.node.ArrayNode;
 import org.apache.flink.shaded.jackson2.com.fasterxml.jackson.databind.node.ObjectNode;
 import org.apache.flink.streaming.api.datastream.DataStream;
 import org.apache.flink.streaming.api.datastream.SingleOutputStreamOperator;
 import org.apache.flink.streaming.api.environment.LocalStreamEnvironment;
 import org.apache.flink.streaming.api.environment.StreamExecutionEnvironment;
 import org.apache.flink.streaming.api.functions.source.SourceFunction;
 import org.apache.flink.streaming.connectors.kinesis.FlinkKinesisConsumer;
 import org.apache.flink.streaming.connectors.kinesis.config.ConsumerConfigConstants;
 import org.apache.flink.util.Collector;
 import org.slf4j.Logger;
 import org.slf4j.LoggerFactory;
 import software.aws.solution.clickstream.plugin.enrich.Enrichment;
 import software.aws.solution.clickstream.plugin.enrich.IPEnrichment;
 import software.aws.solution.clickstream.plugin.transformer.*;

 import java.io.*;
 import java.nio.charset.StandardCharsets;
 import java.time.Instant;
 import java.time.LocalDateTime;
 import java.time.ZoneId;
 import java.time.format.DateTimeFormatter;
 import java.util.*;
 import java.util.zip.GZIPInputStream;

 import static org.apache.flink.streaming.connectors.kinesis.config.ConsumerConfigConstants.*;
 import static org.apache.flink.streaming.connectors.kinesis.config.ConsumerConfigConstants.RecordPublisherType.EFO;


/**
 * {
 *     "appId": "app1",
 *     "compression": "gzip",
 *     "data": "",
 *     "date": "2023-11-08T12:33:33+00:00",
 *     "fakeIp": "1.26.162.45",
 *     "ingest_time": 1699446813000,
 *     "ip": "3.141.3.4",
 *     "method": "POST",
 *     "path": "/collect",
 *     "platform": "Android",
 *     "rid": "2b8613c5569f48fb9f569f2531403580",
 *     "server_ingest_time": 1699446813000,
 *     "source_type": "http_server",
 *     "timestamp": "2023-11-08T12:33:33.282166261Z",
 *     "ua": "python-requests/2.25.1",
 *     "uri": "/collect?platform=Android&appId=app1&compression=gzip&fakeIp=1.26.162.45&event_bundle_sequence_id=100"
 * }
 */

public class StreamingJob {
     private static final Logger LOG = LoggerFactory.getLogger(StreamingJob.class);
 
     private static final String DEFAULT_SOURCE_STREAM = "source";
     private static final String DEFAULT_PUBLISHER_TYPE = RecordPublisherType.POLLING.name(); // "POLLING" for standard consumer, "EFO" for Enhanced Fan-Out
     private static final String DEFAULT_EFO_CONSUMER_NAME = "sample-efo-flink-consumer";
     private static final String DEFAULT_SINK_STREAM = "destination";
     private static final String DEFAULT_AWS_REGION = "eu-west-1";

     private static final String FLINK_APPLICATION_PROPERTIES = "FlinkApplicationProperties";
     private static final String PROPERTIES_PROJECT_ID = "projectId";
     private static final String PROPERTIES_APP_ID = "appId";
     private static final String PROPERTIES_KINESIS_SOURCE_STREAM = "kinesis.source.stream";
     private static final String PROPERTIES_KINESIS_SINK_STREAM = "kinesis.sink.stream";
     private static final String PROPERTIES_KINESIS_REGION = "kinesis.region";
     private static final String PROPERTIES_PARALLELISM = "parallelism";
     private static final String PROPERTIES_GEO_BUCKET_NAME = "geoBucketName";
     private static final String PROPERTIES_GEO_FILE_KEY = "geoFileKey";
 
     /**
      * Get configuration properties from Amazon Managed Service for Apache Flink runtime properties
      * GroupID "FlinkApplicationProperties", or from command line parameters when running locally
      */
     protected static ParameterTool loadApplicationParameters(String[] args, StreamExecutionEnvironment env) throws IOException {
         if (env instanceof LocalStreamEnvironment) {
             return ParameterTool.fromArgs(args);
         } else {
             Map<String, Properties> applicationProperties = KinesisAnalyticsRuntime.getApplicationProperties();
             Properties flinkProperties = applicationProperties.get(FLINK_APPLICATION_PROPERTIES);
             if (flinkProperties == null) {
                 throw new RuntimeException("Unable to load FlinkApplicationProperties properties from runtime properties");
             }
             Map<String, String> map = new HashMap<>(flinkProperties.size());
             flinkProperties.forEach((k, v) -> map.put((String) k, (String) v));
             return ParameterTool.fromMap(map);
         }
     }
 
     protected static FlinkKinesisConsumer<String> createKinesisSource(
             ParameterTool applicationProperties) {
 
         // Properties for Amazon Kinesis Data Streams Source, we need to specify from where we want to consume the data.
         // STREAM_INITIAL_POSITION: LATEST: consume messages that have arrived from the moment application has been deployed
         // STREAM_INITIAL_POSITION: TRIM_HORIZON: consume messages starting from first available in the Kinesis Stream
         Properties kinesisConsumerConfig = new Properties();
         kinesisConsumerConfig.put(AWSConfigConstants.AWS_REGION, applicationProperties.get(PROPERTIES_KINESIS_REGION, DEFAULT_AWS_REGION));
         kinesisConsumerConfig.put(STREAM_INITIAL_POSITION, "LATEST");
 
 
         // Set up publisher type: POLLING (standard consumer) or EFO (Enhanced Fan-Out)
         kinesisConsumerConfig.put(RECORD_PUBLISHER_TYPE, applicationProperties.get("kinesis.source.type", DEFAULT_PUBLISHER_TYPE));
         if (kinesisConsumerConfig.getProperty(RECORD_PUBLISHER_TYPE).equals(EFO.name())) {
             kinesisConsumerConfig.put(ConsumerConfigConstants.EFO_CONSUMER_NAME, applicationProperties.get("kinesis.source.efoConsumer", DEFAULT_EFO_CONSUMER_NAME));
         }
 
 
         return new FlinkKinesisConsumer<>(applicationProperties.get(PROPERTIES_KINESIS_SOURCE_STREAM, DEFAULT_SOURCE_STREAM), new SimpleStringSchema(), kinesisConsumerConfig);
     }
 
     protected static KinesisStreamsSink<String> createKinesisSink(
             ParameterTool applicationProperties) {
 
         Properties sinkProperties = new Properties();
         // Required
         sinkProperties.put(AWSConfigConstants.AWS_REGION, applicationProperties.get(PROPERTIES_KINESIS_REGION, DEFAULT_AWS_REGION));
 
         return KinesisStreamsSink.<String>builder()
                 .setKinesisClientProperties(sinkProperties)
                 .setSerializationSchema(new SimpleStringSchema())
                 .setPartitionKeyGenerator(element -> String.valueOf(element.hashCode()))
                 .setStreamName(applicationProperties.get(PROPERTIES_KINESIS_SINK_STREAM, DEFAULT_SINK_STREAM))
                 .build();
     }

     public static void main(final String[] args) throws Exception {
         StreamExecutionEnvironment env = StreamExecutionEnvironment.getExecutionEnvironment();
         final ParameterTool applicationProperties = loadApplicationParameters(args, env);
         LOG.info("Application properties: {}", applicationProperties.toMap());
         FlinkKinesisConsumer<String> source = createKinesisSource(applicationProperties);
         DataStream<String> input = env.addSource(source, "Kinesis source");
         KinesisStreamsSink<String> sink = createKinesisSink(applicationProperties);
         runWithFlink(args, env, applicationProperties, input, sink);
     }

     public static void runWithFlink(final String[] args, final StreamExecutionEnvironment env,
                                     ParameterTool applicationProperties,
                                     DataStream<String> input,
                                     Sink<String> sink) throws Exception {
         ObjectMapper jsonParser = new ObjectMapper();
         int parallelism = Integer.parseInt(applicationProperties.get(PROPERTIES_PARALLELISM, "0"));
         SingleOutputStreamOperator<String> matchedData = input.filter((FilterFunction<String>) value -> {
             JsonNode jsonNode = jsonParser.readValue(value, JsonNode.class);
             LOG.info("appId:"+jsonNode.get("appId").asText());
             return jsonNode.get("appId").asText().equalsIgnoreCase(applicationProperties.get(PROPERTIES_APP_ID));
         });
         if (matchedData == null) {
             LOG.error("Input not match the appId:" + applicationProperties.get(PROPERTIES_APP_ID));
             return;
         }
         if (parallelism > 0) {
             matchedData.setParallelism(parallelism);
         }
         SingleOutputStreamOperator<Tuple2<String, String>> flatMapData = matchedData.flatMap((String value, Collector<Tuple2<String, String>> out) -> {
             try {
                 JsonNode jsonNode = jsonParser.readValue(value, JsonNode.class);
                 String compression = jsonNode.get("compression").asText();

                 LOG.debug("data=" + jsonNode.get("data").asText());
                 JsonNode dataNode = null;
                 if ("gzip".equalsIgnoreCase(compression)) {
                     GZIPInputStream gzip = null;
                     BufferedReader br = null;
                     StringBuilder output = new StringBuilder();
                     try {
                         byte[] decodedBytes = Base64.getDecoder().decode(jsonNode.get("data").asText().getBytes(StandardCharsets.UTF_8));
                         gzip = new GZIPInputStream(new ByteArrayInputStream(decodedBytes));
                         br = new BufferedReader(new InputStreamReader(gzip, StandardCharsets.UTF_8));

                         String line;
                         while ((line = br.readLine()) != null) {
                             output.append(line);
                         }
                     } finally {
                         if (br != null) br.close();
                         if (gzip != null) gzip.close();
                     }
                     dataNode = jsonParser.readValue(output.toString(), JsonNode.class);
                 } else {
                     dataNode = jsonNode.get("data");
                 }
                 StringBuffer stringBuffer = new StringBuffer();
                 stringBuffer.append("appId=").append(jsonNode.get("appId").asText())
                         .append(",compression=").append(compression)
                         .append(",is_array=").append(jsonParser.readTree(dataNode.toString()).isArray());
                 LOG.info(stringBuffer.toString());
                 ObjectNode ingestNode = jsonParser.createObjectNode();
                 ingestNode.set("date", jsonNode.get("date"));
                 ingestNode.put("ingest_time", jsonNode.get("ingest_time").asLong());
                 ingestNode.set("ip", jsonNode.get("ip"));
                 ingestNode.set("method", jsonNode.get("method"));
                 ingestNode.set("path", jsonNode.get("path"));
                 ingestNode.set("platform", jsonNode.get("platform"));
                 ingestNode.set("rid", jsonNode.get("rid"));
                 ingestNode.put("server_ingest_time", jsonNode.get("server_ingest_time").asLong());
                 ingestNode.set("source_type", jsonNode.get("source_type"));
                 ingestNode.set("timestamp", jsonNode.get("timestamp"));
                 ingestNode.set("ua", jsonNode.get("ua"));
                 ingestNode.set("uri", jsonNode.get("uri"));

                 // Assume that "data" is an array node
                 ArrayNode arrayNode = (ArrayNode) jsonParser.readTree(dataNode.toString());
                 for (JsonNode node : arrayNode) {
                     out.collect(new Tuple2<>(ingestNode.toString(), node.toString()));
                 }
             } catch (Exception e) {
                 LOG.error("ERROR:", e);
                 LOG.error("ERROR:" + value);
                 throw e;
             }
         }).returns(Types.TUPLE(Types.STRING, Types.STRING));
         if (parallelism > 0) {
             flatMapData.setParallelism(parallelism);
         }

         SingleOutputStreamOperator<String> mapData = flatMapData.map(value -> {
             ObjectNode data = jsonParser.createObjectNode();
             JsonNode ingestNode = jsonParser.readValue(value.f0, JsonNode.class);
             JsonNode dataNode = jsonParser.readValue(value.f1, JsonNode.class);
             JsonNode attributesNode = dataNode.get("attributes");
             JsonNode userNode = dataNode.get("user");

             data.put("project_id", applicationProperties.get(PROPERTIES_PROJECT_ID));
             data.set("event_name", dataNode.get("event_type"));
             data.set("event_id", dataNode.get("event_id"));
             data.set("app_id", dataNode.get("app_id"));
             data.set("user_pseudo_id", dataNode.get("unique_id"));
             data.put("event_timestamp", dataNode.get("timestamp").asLong());

             Transformer deviceTransformer = new DeviceTransformer();
             Map<String, String> deviceParamMap = new HashMap<>();
             deviceParamMap.put(DeviceTransformer.PARAM_KEY_VENDOR_ID, dataNode.get("device_id").asText());
             deviceParamMap.put(DeviceTransformer.PARAM_KEY_BRAND, dataNode.get("brand").asText());
             deviceParamMap.put(DeviceTransformer.PARAM_KEY_MODEL, dataNode.get("model").asText());
             deviceParamMap.put(DeviceTransformer.PARAM_KEY_MAKE, dataNode.get("make").asText());
             deviceParamMap.put(DeviceTransformer.PARAM_KEY_SCREEN_WIDTH, dataNode.get("screen_width").asText());
             deviceParamMap.put(DeviceTransformer.PARAM_KEY_SCREEN_HEIGHT, dataNode.get("screen_height").asText());
             deviceParamMap.put(DeviceTransformer.PARAM_KEY_CARRIER, dataNode.get("carrier").asText());
             deviceParamMap.put(DeviceTransformer.PARAM_KEY_NETWORK_TYPE, dataNode.get("network_type").asText());
             deviceParamMap.put(DeviceTransformer.PARAM_KEY_OPERATING_SYSTEM, dataNode.get("platform").asText());
             deviceParamMap.put(DeviceTransformer.PARAM_KEY_OS_VERSION, dataNode.get("os_version").asText());
             if (ingestNode.hasNonNull("ua")) {
                 deviceParamMap.put(DeviceTransformer.PARAM_KEY_UA, ingestNode.get("ua").asText());
             }
             deviceParamMap.put(DeviceTransformer.PARAM_KEY_SYSTEM_LANGUAGE, dataNode.get("system_language").asText());
             deviceParamMap.put(DeviceTransformer.PARAM_KEY_ZONE_OFFSET, dataNode.get("zone_offset").asText());
             data.set("device", deviceTransformer.transform(deviceParamMap));

             ObjectNode appInfo = jsonParser.createObjectNode();
             appInfo.set("app_id", dataNode.get("app_id"));
             appInfo.set("id", dataNode.get("app_package_name"));
             appInfo.set("install_source", attributesNode.get("_channel"));
             appInfo.set("version", dataNode.get("app_version"));
             appInfo.set("app_package_name", dataNode.get("app_package_name"));
             data.set("app_info", appInfo);
             data.set("ecommerce", null);

             Transformer uriTransformer = new URITransformer();
             Map<String, String> uriTransformerParamsMap = new HashMap<>();
             uriTransformerParamsMap.put(URITransformer.PARAM_KEY_URI, ingestNode.get("uri").asText());
             data.put("event_bundle_sequence_id", uriTransformer.transform(uriTransformerParamsMap).asLong());

             LocalDateTime dateTime = LocalDateTime.ofInstant(Instant.ofEpochMilli(dataNode.get("timestamp").asLong()), ZoneId.of("UTC"));
             DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd");
             String formattedDateTime = dateTime.format(formatter);
             data.put("event_date", formattedDateTime);

             data.set("event_dimensions", null);

             Transformer kvTransformer = new KvTransformer();
             List<KvObjectNode> eventParamList = new ArrayList<>();
             eventParamList.add(new KvObjectNode("_session_id",
                     attributesNode.get("_session_id").asText(),
                     KvTransformer.PARAM_KEY_STRING_VALUE));
             eventParamList.add(new KvObjectNode("_session_start_timestamp",
                     attributesNode.get("_session_start_timestamp").asText(),
                     KvTransformer.PARAM_KEY_INT_VALUE));
             eventParamList.add(new KvObjectNode("_session_duration",
                     attributesNode.get("_session_duration").asText(),
                     KvTransformer.PARAM_KEY_INT_VALUE));
             eventParamList.add(new KvObjectNode("_session_number",
                     attributesNode.get("_session_number").asText(),
                     KvTransformer.PARAM_KEY_INT_VALUE));
             eventParamList.add(new KvObjectNode("_screen_name",
                     attributesNode.get("_screen_name").asText(),
                     KvTransformer.PARAM_KEY_STRING_VALUE));
             eventParamList.add(new KvObjectNode("_screen_id",
                     attributesNode.get("_screen_id").asText(),
                     KvTransformer.PARAM_KEY_STRING_VALUE));
             data.set("event_params", kvTransformer.transformArrayNode(eventParamList));

             data.put("event_previous_timestamp", 0);
             data.put("event_server_timestamp_offset", ingestNode.get("ingest_time").asLong() - dataNode.get("timestamp").asLong());
             data.put("event_value_in_usd", 0);

             Enrichment ipEnrich = new IPEnrichment();
             Map<String, String> paramMap = new HashMap<>();
             paramMap.put(IPEnrichment.PARAM_KEY_IP, ingestNode.get("ip").asText());
             paramMap.put(IPEnrichment.PARAM_KEY_LOCALE, dataNode.get("locale").asText());
             paramMap.put(IPEnrichment.PARAM_KEY_BUCKET, applicationProperties.get(PROPERTIES_GEO_BUCKET_NAME));
             paramMap.put(IPEnrichment.PARAM_KEY_FILE_NAME, applicationProperties.get(PROPERTIES_GEO_FILE_KEY));
             paramMap.put(IPEnrichment.PARAM_KEY_REGION, applicationProperties.get(PROPERTIES_KINESIS_REGION));
             data.set("geo", ipEnrich.enrich(jsonParser.createObjectNode(), paramMap));

             data.put("ingest_timestamp", ingestNode.get("ingest_time").asLong());

             data.set("items", null);

             data.set("platform", ingestNode.get("platform"));


             List<KvObjectNode> privacyInfoList = new ArrayList<>();
             eventParamList.add(new KvObjectNode("ads_storage",
                     null,
                     null));
             eventParamList.add(new KvObjectNode("analytics_storage",
                     null,
                     null));
             eventParamList.add(new KvObjectNode("uses_transient_token",
                     null,
                     null));
             data.set("privacy_info", kvTransformer.transformArrayNode(privacyInfoList));

             ObjectNodeTransformer objNodeTransformer = new ObjectNodeTransformer();
             List<JsonObjectNode> trafficSourceParamList = new ArrayList<>();
             trafficSourceParamList.add(
                     new JsonObjectNode("medium",
                             attributesNode.get("_traffic_source_medium"),
                             ObjectNodeTransformer.PARAM_KEY_JSON_VALUE));
             trafficSourceParamList.add(
                     new JsonObjectNode("source",
                             attributesNode.get("_traffic_source_source"),
                             ObjectNodeTransformer.PARAM_KEY_JSON_VALUE));
             trafficSourceParamList.add(
                     new JsonObjectNode("name",
                             null,
                             ObjectNodeTransformer.PARAM_KEY_JSON_VALUE));
             data.set("traffic_source", objNodeTransformer.transformObjectNode(trafficSourceParamList));

             if (userNode.hasNonNull("_user_first_touch_timestamp")) {
                 data.put("user_first_touch_timestamp", userNode.get("_user_first_touch_timestamp").get("value").asLong());
             } else {
                 data.set("user_first_touch_timestamp", null);
             }
             if (userNode.hasNonNull("_user_id")) {
                 data.set("user_id", userNode.get("_user_id").get("value"));
             } else {
                 data.set("user_id", null);
             }

             List<JsonObjectNode> userLtv = new ArrayList<>();
             if (userNode.hasNonNull("_user_ltv_revenue")) {
                 userLtv.add(new JsonObjectNode("_user_ltv_revenue",
                         userNode.get("_user_ltv_revenue"),
                         ObjectNodeTransformer.PARAM_KEY_DOUBLE_VALUE));
             }
             if (userNode.hasNonNull("_user_ltv_currency")) {
                 userLtv.add(new JsonObjectNode("_user_ltv_currency",
                         userNode.get("_user_ltv_currency"),
                         ObjectNodeTransformer.PARAM_KEY_JSON_VALUE));
             }
             data.set("user_ltv", objNodeTransformer.transformObjectNode(userLtv));

             ArrayNode userProperties = jsonParser.createArrayNode();
             List<JsonObjectNode> userProperty = new ArrayList<>();
             if (userNode.hasNonNull("_user_id")) {
                 userProperty.add(new JsonObjectNode("user_id",
                         userNode.get("_user_id").get("value"),
                         ObjectNodeTransformer.PARAM_KEY_JSON_VALUE));
             }
             if (userNode.hasNonNull("_user_first_touch_timestamp")) {
                 userProperty.add(new JsonObjectNode("_user_first_touch_timestamp",
                         userNode.get("_user_first_touch_timestamp").get("value"),
                         ObjectNodeTransformer.PARAM_KEY_INT_VALUE));
             }
             userProperties.add(objNodeTransformer.transformObjectNode(userProperty));
             data.set("user_properties", userProperties);

             LOG.info("map.result:"+jsonParser.writeValueAsString(data));
             return jsonParser.writeValueAsString(data);
         });
         if (parallelism > 0) {
             mapData.setParallelism(parallelism);
         }
         mapData.sinkTo(sink);

         env.execute("clickstream streaming ingestion flink application");
     }
 }