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

package software.aws.solution.clickstream;

import lombok.*;
import lombok.extern.slf4j.*;
import org.apache.spark.sql.*;
import org.apache.spark.sql.api.java.*;
import org.apache.spark.sql.expressions.*;
import org.apache.spark.sql.types.*;
import software.aws.solution.clickstream.model.*;

import java.util.*;

import static org.apache.spark.sql.functions.*;
import static software.aws.solution.clickstream.DatasetUtil.*;
import static software.aws.solution.clickstream.model.ModelV2.toColumnArray;

@Slf4j
public class MaxLengthTransformerV2 {
    private static final int MAX_STRING_VALUE_LEN_32 = 32;
    private static final int MAX_STRING_VALUE_LEN_255 = 255;
    private static final int MAX_STRING_VALUE_LEN_MAX = 65535;
    private static final int MAX_STRING_VALUE_LEN_2K = 2048;

    private static UDF2<String, Integer, Row> truncateWithMaxByteLength() {
      return MaxLengthTransformer.truncateWithMaxByteLength();
    }

    public static Dataset<Row> runMaxLengthTransformerForItemV2(final Dataset<Row> newItemsDataset1) {
        List<ColumnsMaxLength> columnsMaxLengthList = new ArrayList<>();
        columnsMaxLengthList.add(
                new ColumnsMaxLength(Arrays.asList(
                        ModelV2.EVENT_ID,
                        ModelV2.EVENT_NAME,
                        ModelV2.PLATFORM,
                        ModelV2.USER_PSEUDO_ID,
                        ModelV2.USER_ID,
                        ModelV2.ITEM_ID,
                        ModelV2.NAME,
                        ModelV2.BRAND,
                        ModelV2.CURRENCY,
                        ModelV2.CREATIVE_NAME,
                        ModelV2.CREATIVE_SLOT,
                        ModelV2.LOCATION_ID,
                        ModelV2.CATEGORY,
                        ModelV2.CATEGORY2,
                        ModelV2.CATEGORY3,
                        ModelV2.CATEGORY4,
                        ModelV2.CATEGORY5
                ), MAX_STRING_VALUE_LEN_255)
        );

        columnsMaxLengthList.add(new ColumnsMaxLength(Arrays.asList(ModelV2.CUSTOM_PARAMETERS_JSON_STR), MAX_STRING_VALUE_LEN_255));

        Dataset<Row> newItemsDataset2 = new MaxLengthTransformerV2().transform(newItemsDataset1, columnsMaxLengthList);
        return newItemsDataset2.select(
                toColumnArray(ModelV2.getItemFields())
        );
    }

    public static Dataset<Row> runMaxLengthTransformerForUserV2(final Dataset<Row> userDataset) {
        List<ColumnsMaxLength> columnsMaxLengthList = new ArrayList<>();
        columnsMaxLengthList.add(
                new ColumnsMaxLength(Arrays.asList(
                        ModelV2.USER_PSEUDO_ID,
                        ModelV2.USER_ID,
                        ModelV2.FIRST_TRAFFIC_SOURCE,
                        ModelV2.FIRST_TRAFFIC_MEDIUM,
                        ModelV2.FIRST_TRAFFIC_CAMPAIGN,
                        ModelV2.FIRST_TRAFFIC_CAMPAIGN_ID,
                        ModelV2.FIRST_TRAFFIC_CLID_PLATFORM,
                        ModelV2.FIRST_TRAFFIC_CHANNEL_GROUP,
                        ModelV2.FIRST_TRAFFIC_CATEGORY,
                        ModelV2.FIRST_APP_INSTALL_SOURCE
                ), MAX_STRING_VALUE_LEN_255)
        );

        columnsMaxLengthList.add(new ColumnsMaxLength(Arrays.asList(
                ModelV2.FIRST_TRAFFIC_CONTENT,
                ModelV2.FIRST_TRAFFIC_CLID,
                ModelV2.FIRST_TRAFFIC_TERM
        ), MAX_STRING_VALUE_LEN_2K));

        columnsMaxLengthList.add(new ColumnsMaxLength(Arrays.asList(
                ModelV2.FIRST_REFERRER,
                ModelV2.USER_PROPERTIES_JSON_STR
        ), MAX_STRING_VALUE_LEN_MAX));

        Dataset<Row> userDatasetTruncated = new MaxLengthTransformerV2().transform(
                userDataset,
                columnsMaxLengthList
        );
        return userDatasetTruncated.select(
                toColumnArray(ModelV2.getUserFields())
        );
    }

    public static Dataset<Row> runMaxLengthTransformerForEventV2(final Dataset<Row> eventDataset) {
        List<ColumnsMaxLength> columnsMaxLengthList = new ArrayList<>();
        columnsMaxLengthList.add(
                new ColumnsMaxLength(Arrays.asList(
                        ModelV2.EVENT_VALUE_CURRENCY
                ), MAX_STRING_VALUE_LEN_32)
        );
        columnsMaxLengthList.add(
                new ColumnsMaxLength(Arrays.asList(
                        ModelV2.EVENT_ID,
                        ModelV2.EVENT_NAME,
                        ModelV2.DEVICE_MOBILE_BRAND_NAME,
                        ModelV2.DEVICE_MOBILE_MODEL_NAME,
                        ModelV2.DEVICE_MANUFACTURER,
                        ModelV2.DEVICE_CARRIER,
                        ModelV2.DEVICE_NETWORK_TYPE,
                        ModelV2.DEVICE_OPERATING_SYSTEM,
                        ModelV2.DEVICE_OPERATING_SYSTEM_VERSION,
                        ModelV2.DEVICE_VENDOR_ID,
                        ModelV2.DEVICE_ADVERTISING_ID,
                        ModelV2.DEVICE_SYSTEM_LANGUAGE,
                        ModelV2.DEVICE_UA_BROWSER,
                        ModelV2.DEVICE_UA_BROWSER_VERSION,
                        ModelV2.DEVICE_UA_DEVICE,
                        ModelV2.DEVICE_UA_DEVICE_CATEGORY,
                        ModelV2.GEO_CONTINENT,
                        ModelV2.GEO_SUB_CONTINENT,
                        ModelV2.GEO_COUNTRY,
                        ModelV2.GEO_REGION,
                        ModelV2.GEO_METRO,
                        ModelV2.GEO_CITY,
                        ModelV2.GEO_LOCALE,
                        ModelV2.TRAFFIC_SOURCE_SOURCE,
                        ModelV2.TRAFFIC_SOURCE_MEDIUM,
                        ModelV2.TRAFFIC_SOURCE_CAMPAIGN,
                        ModelV2.TRAFFIC_SOURCE_CAMPAIGN_ID,
                        ModelV2.TRAFFIC_SOURCE_CLID_PLATFORM,
                        ModelV2.TRAFFIC_SOURCE_CHANNEL_GROUP,
                        ModelV2.TRAFFIC_SOURCE_CATEGORY,
                        ModelV2.APP_PACKAGE_ID,
                        ModelV2.APP_ID,
                        ModelV2.APP_VERSION,
                        ModelV2.APP_TITLE,
                        ModelV2.APP_INSTALL_SOURCE,
                        ModelV2.PLATFORM,
                        ModelV2.PROJECT_ID,
                        ModelV2.SCREEN_NAME,
                        ModelV2.SCREEN_ID,
                        ModelV2.SCREEN_UNIQUE_ID,
                        ModelV2.PREVIOUS_SCREEN_NAME,
                        ModelV2.PREVIOUS_SCREEN_ID,
                        ModelV2.PREVIOUS_SCREEN_UNIQUE_ID,
                        ModelV2.PREVIOUS_APP_VERSION,
                        ModelV2.PREVIOUS_OS_VERSION,
                        ModelV2.USER_ID,
                        ModelV2.USER_PSEUDO_ID,
                        ModelV2.SESSION_ID,
                        ModelV2.SDK_ERROR_CODE,
                        ModelV2.SDK_VERSION,
                        ModelV2.SDK_NAME,
                        ModelV2.UA,
                        ModelV2.IP
                ), MAX_STRING_VALUE_LEN_255)
        );

        columnsMaxLengthList.add(
                new ColumnsMaxLength(Arrays.asList(
                        ModelV2.TRAFFIC_SOURCE_CONTENT,
                        ModelV2.TRAFFIC_SOURCE_TERM,
                        ModelV2.TRAFFIC_SOURCE_CLID,
                        ModelV2.PAGE_REFERRER_TITLE,
                        ModelV2.PAGE_TITLE,
                        ModelV2.HOSTNAME,
                        ModelV2.LATEST_REFERRER_HOST,
                        ModelV2.SEARCH_KEY,
                        ModelV2.SEARCH_TERM,
                        ModelV2.OUTBOUND_LINK_CLASSES,
                        ModelV2.OUTBOUND_LINK_DOMAIN,
                        ModelV2.OUTBOUND_LINK_ID,
                        ModelV2.SDK_ERROR_MESSAGE,
                        ModelV2.SDK_EXCEPTION_MESSAGE
                ), MAX_STRING_VALUE_LEN_2K)
        );
        columnsMaxLengthList.add(
                new ColumnsMaxLength(Arrays.asList(
                        ModelV2.PAGE_REFERRER,
                        ModelV2.PAGE_URL,
                        ModelV2.PAGE_URL_PATH,
                        ModelV2.LATEST_REFERRER,
                        ModelV2.OUTBOUND_LINK_URL,
                        ModelV2.SDK_EXCEPTION_STACK,
                        ModelV2.CUSTOM_PARAMETERS_JSON_STR
                ), MAX_STRING_VALUE_LEN_MAX)
        );

        Dataset<Row> eventDatasetTruncated = new MaxLengthTransformerV2().transform(
                eventDataset,
                columnsMaxLengthList
        );

        return eventDatasetTruncated.select(
                toColumnArray(ModelV2.getEventFields())
        );
    }

    public static Dataset<Row> runMaxLengthTransformerForSession(final Dataset<Row> sessionDataset) {
        List<ColumnsMaxLength> columnsMaxLengthList = new ArrayList<>();
        columnsMaxLengthList.add(
                new ColumnsMaxLength(Arrays.asList(
                        ModelV2.USER_PSEUDO_ID,
                        ModelV2.SESSION_ID,
                        ModelV2.USER_ID,
                        ModelV2.SESSION_SOURCE,
                        ModelV2.SESSION_MEDIUM,
                        ModelV2.SESSION_CAMPAIGN,
                        ModelV2.SESSION_CAMPAIGN_ID,
                        ModelV2.SESSION_CLID_PLATFORM,
                        ModelV2.SESSION_CHANNEL_GROUP,
                        ModelV2.SESSION_SOURCE_CATEGORY
                ), MAX_STRING_VALUE_LEN_255)

        );
        columnsMaxLengthList.add(
                new ColumnsMaxLength(Arrays.asList(
                        ModelV2.SESSION_CONTENT,
                        ModelV2.SESSION_TERM,
                        ModelV2.SESSION_CLID
                ), MAX_STRING_VALUE_LEN_2K)

        );
        Dataset<Row> sessionDatasetTruncated = new MaxLengthTransformerV2().transform(
                sessionDataset,
                columnsMaxLengthList
        );
        return sessionDatasetTruncated.select(
                toColumnArray(ModelV2.getSessionFields())
        );
    }

    public Dataset<Row> transform(final Dataset<Row> dataset, final List<ColumnsMaxLength> columnsMaxLengthList) {

        UserDefinedFunction truncateWithMaxByteLengthUdf = udf(truncateWithMaxByteLength(), DataTypes.createStructType(
                new StructField[]{
                        DataTypes.createStructField("value", DataTypes.StringType, true),
                        DataTypes.createStructField(TRUNCATED, DataTypes.BooleanType, true),
                }
        ));

        Dataset<Row> datasetOut = dataset;
        for (ColumnsMaxLength columnsMaxLength : columnsMaxLengthList) {
            for (String colName : columnsMaxLength.columns) {
                datasetOut = datasetOut.withColumn(colName + "_new", truncateWithMaxByteLengthUdf.apply(col(colName), lit(columnsMaxLength.maxLength)))
                        .withColumn(colName + TRUNCATED, expr(colName + "_new." + TRUNCATED))
                        .withColumn(colName, expr(colName + "_new.value"))
                        .drop(colName + "_new");
            }
        }
        return datasetOut;
    }

    @AllArgsConstructor
    public static class ColumnsMaxLength {
        List<String> columns;
        int maxLength;
    }

}
