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

package software.aws.solution.clickstream.transformer;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.apache.spark.sql.api.java.UDF10;
import org.apache.spark.sql.catalyst.expressions.GenericRow;
import org.apache.spark.sql.types.ArrayType;
import org.apache.spark.sql.types.DataTypes;
import org.apache.spark.sql.types.StructField;
import software.aws.solution.clickstream.common.EventParser;
import software.aws.solution.clickstream.common.ExtraParams;
import software.aws.solution.clickstream.common.ParseDataResult;
import software.aws.solution.clickstream.common.RuleConfig;
import software.aws.solution.clickstream.common.model.ClickstreamEvent;
import software.aws.solution.clickstream.common.model.ClickstreamItem;
import software.aws.solution.clickstream.rowconv.ItemGenericRowConverter;
import software.aws.solution.clickstream.rowconv.UserGenericRowConverter;

import java.util.ArrayList;
import java.util.Collections;
import java.util.Iterator;
import java.util.List;
import java.util.Map;

import static software.aws.solution.clickstream.common.Util.ERROR_LOG;
import static software.aws.solution.clickstream.common.Util.VALUE_LOG;
import static software.aws.solution.clickstream.common.Util.getStackTrace;
import static software.aws.solution.clickstream.model.ModelV2.EVENT_TYPE;
import static software.aws.solution.clickstream.model.ModelV2.ITEM_TYPE;
import static software.aws.solution.clickstream.model.ModelV2.USER_TYPE;
import static software.aws.solution.clickstream.rowconv.EventGenericRowConverter.toGenericRow;
import static software.aws.solution.clickstream.util.DatasetUtil.CORRUPT_RECORD;

@Slf4j
public class UDFHelper {
    public static UDF10<String, Long, Long, String, String, String, String, String, String, String, List<GenericRow>>
    getConvertDataUdf(final String name, final Map<String, RuleConfig> appRuleConfig) {
        return (String value,
                Long ingestTimestamp, Long uploadTimestamp,
                String rid, String uri, String ua, String ip,
                String projectId, String inputFileName, String appId) -> {
            try {
                EventParser eventParser = EventParserFactory.getEventParser(name, appRuleConfig);

                return UDFHelper.getGenericRowList(value, ExtraParams.builder()
                        .ingestTimestamp(ingestTimestamp)
                        .uploadTimestamp(uploadTimestamp)
                        .rid(rid)
                        .projectId(projectId)
                        .inputFileName(inputFileName)
                        .uri(uri)
                        .ua(ua)
                        .ip(ip)
                        .appId(appId)
                        .build(), eventParser);
            } catch (Exception e) {
                log.error("cannot convert data to ClickstreamEvent"
                        + ERROR_LOG + e.getMessage() + VALUE_LOG + value);
                log.error(getStackTrace(e));
                return UDFHelper.getCorruptGenericRows(value, e);
            }
        };
    }

    public static List<GenericRow> getCorruptGenericRows(final String value, final Exception e) {

        return Collections.singletonList(new GenericRow(new Object[]{
                "Cannot convert data to ClickstreamEvent" + ERROR_LOG + e.getMessage() + VALUE_LOG + value + ", stackTrace:" + getStackTrace(e),
                null,
                null,
                null,
        }));
    }

    public static List<GenericRow> getGenericRowList(final String jsonString, final ExtraParams extraParams, final EventParser eventParser) throws JsonProcessingException {
        List<GenericRow> rows = new ArrayList<>();
        ObjectMapper objectMapper = new ObjectMapper();
        JsonNode jsonNode = objectMapper.readTree(jsonString);
        int index = 0;
        if (jsonNode.isArray()) {
            for (Iterator<JsonNode> elementsIt = jsonNode.elements(); elementsIt.hasNext(); ) {
                rows.add(getGenericRow(elementsIt.next(), index, extraParams, eventParser));
                index++;
            }
        } else {
            rows.add(getGenericRow(jsonNode, index, extraParams, eventParser));
        }
        return rows;

    }

    private static GenericRow getGenericRow(final JsonNode jsonNode, final int index, final ExtraParams extraParams, final EventParser eventParser) throws JsonProcessingException {
        ParseDataResult result = eventParser.parseData(jsonNode.toString(), extraParams, index);

        List<GenericRow> eventRows = new ArrayList<>();
        for (ClickstreamEvent event : result.getClickstreamEventList()) {
            eventRows.add(toGenericRow(event));
        }
        List<GenericRow> itemRows = new ArrayList<>();
        for (ClickstreamItem item : result.getClickstreamItemList()) {
            itemRows.add(ItemGenericRowConverter.toGenericRow(item));
        }
        return new GenericRow(new Object[]{null, eventRows, UserGenericRowConverter.toGenericRow(result.getClickstreamUser()), itemRows});
    }

    public static ArrayType getUdfOutput() {
        ArrayType eventListType = DataTypes.createArrayType(EVENT_TYPE, true);
        ArrayType itemListType = DataTypes.createArrayType(ITEM_TYPE, true);

        return DataTypes.createArrayType(DataTypes.createStructType(new StructField[]{
                DataTypes.createStructField(CORRUPT_RECORD, DataTypes.StringType, true),
                DataTypes.createStructField("events", eventListType, true),
                DataTypes.createStructField("user", USER_TYPE, true),
                DataTypes.createStructField("items", itemListType, true),
        }));
    }
}
