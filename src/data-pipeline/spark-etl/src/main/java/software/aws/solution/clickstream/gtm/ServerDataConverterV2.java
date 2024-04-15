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

package software.aws.solution.clickstream.gtm;

import com.fasterxml.jackson.core.*;
import com.fasterxml.jackson.databind.*;
import lombok.extern.slf4j.*;
import org.apache.spark.sql.*;
import org.apache.spark.sql.api.java.*;
import org.apache.spark.sql.catalyst.expressions.*;
import org.apache.spark.sql.expressions.*;
import org.apache.spark.sql.types.*;
import software.aws.solution.clickstream.common.*;
import software.aws.solution.clickstream.common.gtm.*;
import software.aws.solution.clickstream.common.model.*;
import software.aws.solution.clickstream.rowconv.*;
import software.aws.solution.clickstream.util.*;

import java.util.*;

import static org.apache.spark.sql.functions.*;
import static software.aws.solution.clickstream.common.Util.getStackTrace;
import static software.aws.solution.clickstream.util.ContextUtil.*;
import static software.aws.solution.clickstream.util.DatasetUtil.*;
import static software.aws.solution.clickstream.ETLRunner.*;
import static software.aws.solution.clickstream.TransformerV3.*;
import static software.aws.solution.clickstream.model.ModelV2.*;
import static software.aws.solution.clickstream.rowconv.EventGenericRowConverter.*;


@Slf4j
public class ServerDataConverterV2 {
    private static UDF6<String, Long, String, String, String, String, List<GenericRow>> convertGTMServerData() {
        return (String value, Long ingestTimestamp,
                String rid, String appId,
                String projectId, String inputFileName) -> {
            try {
                return getGenericRow(value, ExtraParams.builder()
                        .ingestTimestamp(ingestTimestamp)
                        .rid(rid)
                        .projectId(projectId)
                        .inputFileName(inputFileName)
                        .uri(null)
                        .ua(null)
                        .ip(null)
                        .appId(appId)
                        .build());
            } catch (Exception e) {
                log.error("cannot convert data: " + value + ", error: " + e.getMessage());
                log.error(getStackTrace(e));
                return getCorruptGenericRows(value, e);
            }
        };
    }

    private static List<GenericRow> getCorruptGenericRows(final String value, final Exception e) {

        return Collections.singletonList(new GenericRow(new Object[]{
                "data:" + value + ", error:" + e.getMessage() + ", stackTrace:" + getStackTrace(e),
                null,
                null,
                null,
        }));
    }

    private static List<GenericRow> getGenericRow(final String jsonString, final ExtraParams extraParams) throws JsonProcessingException {
        List<GenericRow> rows = new ArrayList<>();

        ObjectMapper objectMapper = new ObjectMapper();
        JsonNode jsonNode = objectMapper.readTree(jsonString);
        int index = 0;
        if (jsonNode.isArray()) {
            for (Iterator<JsonNode> elementsIt = jsonNode.elements(); elementsIt.hasNext(); ) {
                rows.add(getGenericRow(elementsIt.next(), index, extraParams));
                index++;
            }
        } else {
            rows.add(getGenericRow(jsonNode, index, extraParams));
        }
        return rows;

    }

    private static GenericRow getGenericRow(final JsonNode jsonNode, final int index, final ExtraParams extraParams) throws JsonProcessingException {

        ParseDataResult dataResult = GTMEventParser.getInstance()
                .parseData(jsonNode.toString(),
                            extraParams,
                            index);

        // Events
        List<ClickstreamEvent> clickstreamEventList = dataResult.getClickstreamEventList();
        // User
        ClickstreamUser clickstreamUser = dataResult.getClickstreamUser();
        // Items
        List<ClickstreamItem> clickstreamItemList = dataResult.getClickstreamItemList();

        List<GenericRow> eventRows = new ArrayList<>();
        for (ClickstreamEvent event : clickstreamEventList) {
            eventRows.add(toGenericRow(event));
        }

          List<GenericRow> itemRows = new ArrayList<>();
        for (ClickstreamItem item : clickstreamItemList) {
            itemRows.add(ItemGenericRowConverter.toGenericRow(item));
        }

        return new GenericRow(new Object[]{null, eventRows, UserGenericRowConverter.toGenericRow(clickstreamUser), itemRows});
    }



    private static void saveCorruptDataset(final Dataset<Row> corruptDataset, final long corruptDatasetCount) {
        log.info(new ETLMetric(corruptDatasetCount, "GMTServerDataConverterV2 corruptDataset").toString());
        String jobName = System.getProperty(JOB_NAME_PROP);
        String s3FilePath = System.getProperty(WAREHOUSE_DIR_PROP) + "/etl_gtm_corrupted_json_data_v2";
        log.info("save corruptedDataset to " + s3FilePath);
        corruptDataset.withColumn(JOB_NAME_COL, lit(jobName)).write().partitionBy(JOB_NAME_COL).option("compression", "gzip").mode(SaveMode.Append).json(s3FilePath);
    }


    public Dataset<Row> transform(final Dataset<Row> dataset) {
        String projectId = System.getProperty(PROJECT_ID_PROP);
        ArrayType eventListType = DataTypes.createArrayType(EVENT_TYPE, true);
        ArrayType itemListType = DataTypes.createArrayType(ITEM_TYPE, true);

        ArrayType udfOutType = DataTypes.createArrayType(DataTypes.createStructType(new StructField[]{
                DataTypes.createStructField(CORRUPT_RECORD, DataTypes.StringType, true),
                DataTypes.createStructField("events", eventListType, true),
                DataTypes.createStructField("user", USER_TYPE, true),
                DataTypes.createStructField("items", itemListType, true),
        }));

        UserDefinedFunction convertGTMServerDataUdf = udf(convertGTMServerData(), udfOutType);
        String appId = "appId";
        Dataset<Row> convertedKeyValueDataset = dataset
                .filter(col(appId).isNotNull().and(col(appId).notEqual("")))
                .withColumn(DATA_OUT, explode(convertGTMServerDataUdf.apply(
                                col(DATA),
                                col("ingest_time"),
                                col("rid"),
                                col(appId),
                                lit(projectId),
                                col(INPUT_FILE_NAME)
                        )
                ));

        boolean debugLocal = Boolean.parseBoolean(System.getProperty(DEBUG_LOCAL_PROP));
        if (debugLocal) {
            convertedKeyValueDataset.write().mode(SaveMode.Overwrite).json(DEBUG_LOCAL_PATH + "/ServerDataConverterV2/");
        }
        Dataset<Row> okDataset = convertedKeyValueDataset.filter(col(DATA_OUT).getField(CORRUPT_RECORD).isNull());
        Dataset<Row> corruptDataset = convertedKeyValueDataset.filter(col(DATA_OUT).getField(CORRUPT_RECORD).isNotNull());
        long corruptDatasetCount = corruptDataset.count();
        if (corruptDatasetCount > 0) {
            saveCorruptDataset(corruptDataset, corruptDatasetCount);
        }
        return okDataset;
    }

}
