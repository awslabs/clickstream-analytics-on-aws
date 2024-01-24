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
import org.apache.flink.shaded.jackson2.com.fasterxml.jackson.databind.JsonNode;
import org.apache.flink.streaming.api.datastream.DataStream;
import org.apache.flink.streaming.api.datastream.SingleOutputStreamOperator;
import org.apache.flink.streaming.api.environment.LocalStreamEnvironment;
import org.apache.flink.streaming.api.environment.StreamExecutionEnvironment;
import org.apache.flink.streaming.api.functions.source.SourceFunction;
import org.apache.flink.util.OutputTag;
import software.aws.solution.clickstream.function.ExplodeDataFlatMapFunction;
import software.aws.solution.clickstream.function.RouteProcessFunction;
import software.aws.solution.clickstream.function.TransformDataMapFunction;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.Map;

@Slf4j
public class StreamingJob {
    private final StreamSourceAndSinkProvider streamProvider;
    private final ApplicationParameters props;
    private final HashMap<String, Sink<String>> appSinkMap = new HashMap<>();
    private final ArrayList<String> appIds = new ArrayList<>();
    private final StreamExecutionEnvironment env;

    public StreamingJob(final StreamExecutionEnvironment env, final StreamSourceAndSinkProvider streamSourceAndSinkProvider, final ApplicationParameters props) {
        this.streamProvider = streamSourceAndSinkProvider;
        this.props = props;
        this.env = env;
        env.enableCheckpointing(5000);

        log.info("Application properties: {}", this.props);

        for (AppIdStreamMap appIdStreamMap : this.props.getAppIdStreamMapList()) {
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
        StreamingJob job = new StreamingJob(env, streamSourceAndSinkProvider, props);
        if (job.executeStreamJob()) {
            env.execute("Clickstream application " + String.join("-", job.appIds));
        }
    }


    public boolean executeStreamJob() {
        if (appIds.isEmpty()) {
            log.error("No appId is enabled, exit");
            return false;
        }

        log.info("Enabled appId list: {}", appIds);
        SourceFunction<String> kinesisSource = this.streamProvider.createSource();
        DataStream<String> inputStream = env.addSource(kinesisSource, "Kinesis source");
        runWithFlink(inputStream);
        return true;
    }

    private void runWithFlink(final DataStream<String> inputStream) {

        RouteProcessFunction processFunction = new RouteProcessFunction(appIds);
        Map<String, OutputTag<JsonNode>> sideAppOutputTagMap = processFunction.getSideAppOutputTagMap();
        SingleOutputStreamOperator<JsonNode> mainStream = inputStream.process(processFunction);

        String defaultAppId = appIds.get(0);
        transformAndSink(defaultAppId, mainStream, appSinkMap.get(defaultAppId));

        for (Map.Entry<String, OutputTag<JsonNode>> entry : sideAppOutputTagMap.entrySet()) {
            String appId = entry.getKey();
            DataStream<JsonNode> sideAppStream = mainStream.getSideOutput(entry.getValue());
            Sink<String> outKinesisSink = appSinkMap.get(appId);
            transformAndSink(appId, sideAppStream, outKinesisSink);
        }

    }

    private void transformAndSink(final String appId, final DataStream<JsonNode> inputStream,
                                  final Sink<String> outKinesisSink) {
        String projectId = props.getProjectId();
        String bucketName = props.getDataBucketName();
        String geoFileKey = props.getGeoFileKey();
        String region = props.getRegion();

        log.info("transformAndSink appId: {}", appId);
        DataStream<Tuple2<JsonNode, JsonNode>> explodedData = inputStream.flatMap(new ExplodeDataFlatMapFunction(appId)).name("ExplodeDataFlatMapFunction" + appId);
        DataStream<String> transformedData = explodedData.map(new TransformDataMapFunction(appId, projectId, bucketName, geoFileKey, region))
                .name("TransformDataMapFunction" + appId);
        transformedData.sinkTo(outKinesisSink);
    }

}
