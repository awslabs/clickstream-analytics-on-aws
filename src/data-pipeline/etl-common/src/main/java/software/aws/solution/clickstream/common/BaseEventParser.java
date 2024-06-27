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

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import software.aws.solution.clickstream.common.enrich.RuleBasedTrafficSourceHelper;
import software.aws.solution.clickstream.common.enrich.UrlParseResult;
import software.aws.solution.clickstream.common.enrich.ts.CategoryTrafficSource;
import software.aws.solution.clickstream.common.ingest.ClickstreamIngestRow;
import software.aws.solution.clickstream.common.model.ClickstreamEvent;

import java.util.Base64;
import java.util.HashMap;
import java.util.Iterator;
import java.util.Map;
import java.util.Optional;

import static software.aws.solution.clickstream.common.Util.deCodeUri;
import static software.aws.solution.clickstream.common.Util.decompress;
import static software.aws.solution.clickstream.common.enrich.RuleBasedTrafficSourceHelper.CATEGORY_RULE_FILE;
import static software.aws.solution.clickstream.common.enrich.RuleBasedTrafficSourceHelper.CHANNEL_RULE_FILE;

@Slf4j
public abstract class BaseEventParser implements EventParser {
    public static final String UPLOAD_TIMESTAMP = "upload_timestamp";
    public static final int ADJUST_THRESHOLD = 600_000; // 10 minutes
    public static final String INPUT_FILE_NAME = "input_file_name";
    public static final String PLATFORM_WEB = "Web";
    public static final String PLATFORM_ANDROID = "Android";
    public static final String PLATFORM_IOS = "iOS";
    public static final String PLATFORM_WECHATMP = "WeChatMP";

    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();

    private static void addDataResult(final ParseRowResult rowResult, final ParseDataResult result) {
        rowResult.getClickstreamEventList().addAll(result.getClickstreamEventList());
        rowResult.getClickstreamUserList().add(result.getClickstreamUser());
        rowResult.getClickstreamItemList().addAll(result.getClickstreamItemList());
    }

    public ClickstreamIngestRow ingestLineToRow(final String ingestLine) throws JsonProcessingException {
        return OBJECT_MAPPER.readValue(ingestLine, ClickstreamIngestRow.class);
    }

    @Override
    public JsonNode getData(final String ingestDataField) throws JsonProcessingException {
        String rawStringData = ingestDataField;
        if (!rawStringData.startsWith("[") && !rawStringData.startsWith("{")) {
            log.debug("gzipData: " + true);
            String gzipData = rawStringData;
            rawStringData = decompress(Base64.getDecoder().decode(gzipData));
        }
        return OBJECT_MAPPER.readTree(rawStringData);
    }
    @Override
    public ParseRowResult parseLineToDBRow(final String ingestLine, final String projectId, final String fileName) throws JsonProcessingException {
        ParseRowResult rowResult = new ParseRowResult();
        ClickstreamIngestRow clickstreamIngestRow = ingestLineToRow(ingestLine);
        String dataField = clickstreamIngestRow.getData();
        if (dataField == null || dataField.isEmpty()) {
            log.warn("Data field is empty, skipping the row");
            return rowResult;
        }
        JsonNode dataNode = getData(dataField);
        if (dataNode == null) {
            log.warn("getData is empty, skipping the row");
            return rowResult;
        }

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

        int index = 0;
        if (dataNode.isArray()) {
            Iterator<JsonNode> iterator = dataNode.elements();
            while (iterator.hasNext()) {
                JsonNode element = iterator.next();
                ParseDataResult result = parseData(element.toString(), extraParams, index++);
                addDataResult(rowResult, result);
            }
        } else {
            ParseDataResult result = parseData(dataNode.toString(), extraParams, 0);
            addDataResult(rowResult, result);
        }
        return rowResult;
    }

    public ObjectMapper getObjectMapper() {
        return OBJECT_MAPPER;
    }

    protected void setTrafficSourceBySourceParser(final String url, final String pageReferrer, final String latestReferrer, final String latestReferrerHost,
                                                  final ClickstreamEvent clickstreamEvent) {
        String appId = clickstreamEvent.getAppId();
        RuleConfig ruleConfig = getAppRuleConfig() !=null ? getAppRuleConfig().get(appId) : null;

        if (ruleConfig == null) {
            log.warn("RuleConfig is not set for appId: {}", appId);
            if (!Util.isResourceFileExist(CHANNEL_RULE_FILE) || !Util.isResourceFileExist(CATEGORY_RULE_FILE)) {
                log.warn("RuleConfig is not set for appId: {} and default rule files are not available, ignore trafficSource enrich", appId);
                return;
            }
        }

        RuleBasedTrafficSourceHelper rsHelper = RuleBasedTrafficSourceHelper.getInstance(appId, ruleConfig);

        CategoryTrafficSource ts = rsHelper.parse(url,
                pageReferrer,
                latestReferrer,
                latestReferrerHost);

        clickstreamEvent.setTrafficSourceSource(ts.getSource());
        clickstreamEvent.setTrafficSourceMedium(ts.getMedium());
        clickstreamEvent.setTrafficSourceCampaign(ts.getCampaign());
        clickstreamEvent.setTrafficSourceContent(ts.getContent());
        clickstreamEvent.setTrafficSourceTerm(ts.getTerm());
        clickstreamEvent.setTrafficSourceCampaignId(ts.getCampaignId());
        clickstreamEvent.setTrafficSourceClidPlatform(ts.getClidPlatform());
        clickstreamEvent.setTrafficSourceClid(ts.getClid());
        clickstreamEvent.setTrafficSourceChannelGroup(ts.getChannelGroup());
        clickstreamEvent.setTrafficSourceCategory(ts.getCategory());

    }

    protected void setPageViewUrl(final ClickstreamEvent clickstreamEvent, final String url) {
        if (url == null) {
            return;
        }
        clickstreamEvent.setPageViewPageUrl(deCodeUri(url));
        Optional<UrlParseResult> urlParseResultOpt = Util.parseUrl(url);

        if (urlParseResultOpt.isEmpty()) {
            return;
        }
        UrlParseResult urlParseResult = urlParseResultOpt.get();

        if (urlParseResult.getPath() != null) {
            clickstreamEvent.setPageViewPageUrlPath(urlParseResult.getPath());
        }
        clickstreamEvent.setPageViewHostname(urlParseResult.getHostName());
        if (urlParseResult.getQueryParameters() != null && !urlParseResult.getQueryParameters().isEmpty()) {
            clickstreamEvent.setPageViewPageUrlQueryParameters(Util.convertUriParamsToStrMap(urlParseResult.getQueryParameters()));
        }
    }

    protected abstract TransformConfig getTransformConfig();

    protected Map<String, RuleConfig> getAppRuleConfig() {
        if (getTransformConfig() != null && getTransformConfig().getAppRuleConfig() != null) {
            return getTransformConfig().getAppRuleConfig();
        } else {
            return new HashMap<>();
        }
    }

    protected boolean isDisableTrafficSourceEnrichment() {
        if (this.getTransformConfig() == null) {
            return false;
        }
        return this.getTransformConfig() != null && this.getTransformConfig().isTrafficSourceEnrichmentDisabled();
    }

}
