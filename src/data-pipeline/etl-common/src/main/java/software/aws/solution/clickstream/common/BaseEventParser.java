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

package software.aws.solution.clickstream.common;

import com.fasterxml.jackson.core.*;
import com.fasterxml.jackson.databind.*;
import lombok.*;
import lombok.extern.slf4j.*;
import software.aws.solution.clickstream.common.enrich.DefaultTrafficSourceHelper;
import software.aws.solution.clickstream.common.enrich.ts.CategoryTrafficSource;
import software.aws.solution.clickstream.common.enrich.ts.TrafficSourceParserResult;
import software.aws.solution.clickstream.common.ingest.*;
import software.aws.solution.clickstream.common.model.ClickstreamEvent;
import software.aws.solution.clickstream.common.model.UriInfo;

import java.util.*;

import static software.aws.solution.clickstream.common.Util.decompress;
import static software.aws.solution.clickstream.common.Util.getStackTrace;

@Slf4j
public abstract class BaseEventParser implements EventParser {
    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();
    public static final String UPLOAD_TIMESTAMP = "upload_timestamp";
    public static final int ADJUST_THRESHOLD = 600_000; // 10 minutes

    public static final String INPUT_FILE_NAME = "input_file_name";

    public ClickstreamIngestRow ingestLineToRow(final String ingestLine) throws JsonProcessingException {
        return OBJECT_MAPPER.readValue(ingestLine, ClickstreamIngestRow.class);
    }

    @Override
    public ParseRowResult parseLineToDBRow(final String ingestLine, final String projectId, final String fileName) throws JsonProcessingException {
        ClickstreamIngestRow clickstreamIngestRow = ingestLineToRow(ingestLine);
        String data = clickstreamIngestRow.getData();

        if (!data.contains("[") && !data.contains("{")) {
            String gzipData = data;
            log.info("gzipData: " + true);
            data = decompress(Base64.getDecoder().decode(gzipData));
        }

        ParseRowResult rowResult = new ParseRowResult();

        ExtraParams extraParams = ExtraParams.builder()
                .ua(clickstreamIngestRow.getUa())
                .ip(clickstreamIngestRow.getIp())
                .projectId(projectId)
                .rid(clickstreamIngestRow.getRid())
                .ingestTimestamp(clickstreamIngestRow.getIngestTime())
                .uploadTimestamp(clickstreamIngestRow.getUploadTimestamp())
                .uri(clickstreamIngestRow.getUri())
                .inputFileName(fileName)
                .appId(clickstreamIngestRow.getAppId())
                .build();

        JsonNode dataNode = OBJECT_MAPPER.readTree(data);
        int index = 0;
        if (dataNode.isArray()) {
            Iterator<JsonNode> iterator = dataNode.elements();
            while (iterator.hasNext()) {
                JsonNode element = iterator.next();
                ParseDataResult result = parseData(element.toString(), extraParams, index++);
                addDataResult(rowResult, result);
            }
        } else {
            ParseDataResult result = parseData(data, extraParams, 0);
            addDataResult(rowResult, result);
        }
        return rowResult;
    }

    public ObjectMapper getObjectMapper() {
        return OBJECT_MAPPER;
    }

    private static void addDataResult(final ParseRowResult rowResult, final ParseDataResult result) {
        rowResult.getClickstreamEventList().addAll(result.getClickstreamEventList());
        rowResult.getClickstreamUserList().add(result.getClickstreamUser());
        rowResult.getClickstreamItemList().addAll(result.getClickstreamItemList());
    }


    protected void setTrafficSourceBySourceParser(final ClickstreamEvent clickstreamEvent) {
        DefaultTrafficSourceHelper trafficSourceParser = DefaultTrafficSourceHelper.getInstance();
        TrafficSourceParserResult parserResult = null;
        try {
            if (clickstreamEvent.getPageViewPageUrl() != null) {
                parserResult = trafficSourceParser.parse(clickstreamEvent.getPageViewPageUrl(), clickstreamEvent.getPageViewPageReferrer());
            } else if (clickstreamEvent.getPageViewLatestReferrer() != null) {
                parserResult = trafficSourceParser.parse(clickstreamEvent.getPageViewLatestReferrer(), null);
            }
        } catch (Exception e) {
            log.error("cannot parse traffic source: " + clickstreamEvent.getPageViewPageUrl() + ", error: " + e.getMessage());
            log.error(getStackTrace(e));
            return;
        }

        if (parserResult != null) {
            CategoryTrafficSource cTrafficSource = parserResult.getTrafficSource();
            clickstreamEvent.setTrafficSourceCampaign(cTrafficSource.getTrafficSource().getCampaign());
            clickstreamEvent.setTrafficSourceContent(cTrafficSource.getTrafficSource().getContent());
            clickstreamEvent.setTrafficSourceMedium(cTrafficSource.getTrafficSource().getMedium());
            clickstreamEvent.setTrafficSourceSource(cTrafficSource.getTrafficSource().getSource());
            clickstreamEvent.setTrafficSourceTerm(cTrafficSource.getTrafficSource().getTerm());
            clickstreamEvent.setTrafficSourceClid(cTrafficSource.getTrafficSource().getClid());
            clickstreamEvent.setTrafficSourceClidPlatform(cTrafficSource.getTrafficSource().getClidPlatform());
            clickstreamEvent.setTrafficSourceCampaignId(cTrafficSource.getTrafficSource().getCampaignId());
            clickstreamEvent.setTrafficSourceChannelGroup(cTrafficSource.getChannelGroup());
            clickstreamEvent.setTrafficSourceCategory(cTrafficSource.getCategory());

            UriInfo uriInfo = parserResult.getUriInfo();
            if (uriInfo != null) {
                if (clickstreamEvent.getPageViewHostname() == null) {
                    clickstreamEvent.setPageViewHostname(uriInfo.getHost());
                }
                if (clickstreamEvent.getPageViewPageUrlPath() == null) {
                    clickstreamEvent.setPageViewPageUrlPath(uriInfo.getPath());
                }
                if (clickstreamEvent.getPageViewPageUrlQueryParameters() == null) {
                    clickstreamEvent.setPageViewPageUrlQueryParameters(uriInfo.getParameters());
                }
            }

        }
    }


    @Getter
    @Setter
    static class TimeShiftInfo {
        Long ingestTimestamp;
        Long uploadTimestamp;
        Long eventTimestamp;
        Long originEventTimestamp;
        Long timeDiff;
        boolean isAdjusted;
        String uri;
        Integer adjustThreshold;
    }
}
