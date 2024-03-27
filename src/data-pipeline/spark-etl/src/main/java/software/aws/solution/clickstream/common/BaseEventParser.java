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
import software.aws.solution.clickstream.common.ingest.*;

import java.util.*;

import static software.aws.solution.clickstream.common.Util.decompress;

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
