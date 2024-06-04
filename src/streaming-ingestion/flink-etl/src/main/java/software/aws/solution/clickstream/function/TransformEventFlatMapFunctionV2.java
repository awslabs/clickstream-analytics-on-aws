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

import lombok.extern.slf4j.Slf4j;
import org.apache.flink.api.common.functions.FlatMapFunction;
import org.apache.flink.shaded.jackson2.com.fasterxml.jackson.databind.JsonNode;
import org.apache.flink.util.Collector;
import software.aws.solution.clickstream.common.EventParser;
import software.aws.solution.clickstream.common.ParseRowResult;
import software.aws.solution.clickstream.common.exception.ExtractDataException;
import software.aws.solution.clickstream.common.model.ClickstreamEvent;
import software.aws.solution.clickstream.flink.ClickstreamException;
import software.aws.solution.clickstream.plugin.enrich.ClickstreamEventEnrichment;

import java.util.List;

@Slf4j
public class TransformEventFlatMapFunctionV2 implements FlatMapFunction<JsonNode, String> {
    private final String projectId;
    private final String appId;
    private final EventParser eventParser;
    private final List<ClickstreamEventEnrichment> enrichments;

    public TransformEventFlatMapFunctionV2(final String projectId,
                                           final String appId,
                                           final EventParser eventParser,
                                           final List<ClickstreamEventEnrichment> enrichments) {
        this.projectId = projectId;
        this.appId = appId;
        this.eventParser = eventParser;
        this.enrichments = enrichments;
    }

    @Override
    public void flatMap(final JsonNode value, final Collector<String> out) {
        String delimiter = "/";
        String fileName = "file://" + appId + delimiter + System.currentTimeMillis();
        try {
            ParseRowResult result = this.eventParser.parseLineToDBRow(value.toString(), projectId, fileName);
            List<ClickstreamEvent> eventList = result.getClickstreamEventList();
            for (ClickstreamEvent clickstreamEvent : eventList) {
                for (ClickstreamEventEnrichment enrichment : enrichments) {
                    enrichment.enrich(clickstreamEvent);
                }
                out.collect(clickstreamEvent.toJson());
            }
        } catch (ExtractDataException e) {
            if (e.getMessage().contains("Not in GZIP format")) {
                log.warn("Error '{}' in parse data: {}", e.getMessage(), value);
            } else {
                throw e;
            }
        } catch (Exception e) {
            throw new ClickstreamException(e);
        }
    }
}
