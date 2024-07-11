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

package software.aws.solution.clickstream.function;

import lombok.Getter;
import lombok.extern.slf4j.Slf4j;
import org.apache.flink.streaming.api.functions.ProcessFunction;
import org.apache.flink.configuration.Configuration;
import org.apache.flink.util.Collector;
import org.apache.flink.util.OutputTag;
import software.aws.solution.clickstream.common.EventParser;
import software.aws.solution.clickstream.common.ParseRowResult;
import software.aws.solution.clickstream.common.Util;
import software.aws.solution.clickstream.common.model.ClickstreamEvent;
import software.aws.solution.clickstream.plugin.enrich.ClickstreamEventEnrichment;

import java.io.File;
import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static software.aws.solution.clickstream.flink.StreamingJob.CACHED_FILE_GEO_LITE_2_CITY_MMDB;

@Slf4j

public class TransformEventFlatMapFunctionV2 extends ProcessFunction<String, String> {

    private final String projectId;
    private final String appId;
    private final EventParser eventParser;
    private final List<ClickstreamEventEnrichment> enrichments;
    private final List<String> streamIngestionAllowEventList;

    @Getter
    private final OutputTag<ClickstreamEvent> tableRowOutputTag;
    private final boolean withCustomParameters;

    public TransformEventFlatMapFunctionV2(final String projectId,
                                           final String appId,
                                           final EventParser eventParser,
                                           final List<ClickstreamEventEnrichment> enrichments,
                                           final boolean withCustomParameters,
                                           final List<String> streamIngestionAllowEventList
    ) {
        this.projectId = projectId;
        this.appId = appId;
        this.eventParser = eventParser;
        this.enrichments = enrichments;
        this.tableRowOutputTag = new OutputTag<>("table-row-" + appId) {
        };
        this.withCustomParameters = withCustomParameters;
        this.streamIngestionAllowEventList = streamIngestionAllowEventList;

    }

    @Override
    public void open(final Configuration parameters) {

        File cachedGeoFile = this.getRuntimeContext().getDistributedCache().getFile(CACHED_FILE_GEO_LITE_2_CITY_MMDB);
        Map<String, Object> configMap = new HashMap<>();
        configMap.put(CACHED_FILE_GEO_LITE_2_CITY_MMDB, cachedGeoFile);

        for (ClickstreamEventEnrichment enrichment : enrichments) {
            enrichment.config(configMap);
        }
    }

    @Override
    public void processElement(final String value, final ProcessFunction<String, String>.Context ctx, final Collector<String> out) {

        String delimiter = "/";
        String fileName = "file://" + appId + delimiter + Instant.now().toString();
        try {
            ParseRowResult result = this.eventParser.parseLineToDBRow(value, projectId, fileName);
            List<ClickstreamEvent> eventList = result.getClickstreamEventList();
            for (ClickstreamEvent clickstreamEvent : eventList) {
                for (ClickstreamEventEnrichment enrichment : enrichments) {
                    enrichment.enrich(clickstreamEvent);
                }
                clickstreamEvent.getProcessInfo().put("process_time", Instant.now().toString());
                if (!withCustomParameters) {
                    clickstreamEvent.setCustomParameters(null);
                }
                // to stream ingestion
                if (streamIngestionAllowEventList == null
                        || streamIngestionAllowEventList.contains(clickstreamEvent.getEventName())) {
                    out.collect(clickstreamEvent.toJson());
                }
                // to table agg
                ctx.output(tableRowOutputTag, clickstreamEvent);
            }
        } catch (Exception e) {
            if (e.getMessage().contains("Not in GZIP format")) {
                log.warn("Error {} in parse data: '{}'", e.getMessage(), value);
            } else {
                log.error("Error in parse data: '{}', error: {}", value,  Util.getStackTrace(e), e);
            }
        }
    }
}
