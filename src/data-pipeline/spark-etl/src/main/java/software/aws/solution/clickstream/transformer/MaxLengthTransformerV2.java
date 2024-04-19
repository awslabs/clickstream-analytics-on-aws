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

import lombok.*;
import lombok.extern.slf4j.*;
import org.apache.spark.sql.*;
import org.apache.spark.sql.api.java.*;
import org.apache.spark.sql.expressions.*;
import org.apache.spark.sql.types.*;
import software.aws.solution.clickstream.common.Constant;
import software.aws.solution.clickstream.model.*;

import java.util.*;

import static org.apache.spark.sql.functions.*;
import static software.aws.solution.clickstream.util.DatasetUtil.*;
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
                        Constant.EVENT_ID,
                        Constant.EVENT_NAME,
                        Constant.PLATFORM,
                        Constant.USER_PSEUDO_ID,
                        Constant.USER_ID,
                        Constant.ITEM_ID,
                        Constant.NAME,
                        Constant.BRAND,
                        Constant.CURRENCY,
                        Constant.CREATIVE_NAME,
                        Constant.CREATIVE_SLOT,
                        Constant.LOCATION_ID,
                        Constant.CATEGORY,
                        Constant.CATEGORY2,
                        Constant.CATEGORY3,
                        Constant.CATEGORY4,
                        Constant.CATEGORY5
                ), MAX_STRING_VALUE_LEN_255)
        );

        columnsMaxLengthList.add(new ColumnsMaxLength(Arrays.asList(Constant.CUSTOM_PARAMETERS_JSON_STR), MAX_STRING_VALUE_LEN_255));

        Dataset<Row> newItemsDataset2 = new MaxLengthTransformerV2().transform(newItemsDataset1, columnsMaxLengthList);
        return newItemsDataset2.select(
                toColumnArray(ModelV2.getItemFields())
        );
    }

    public static Dataset<Row> runMaxLengthTransformerForUserV2(final Dataset<Row> userDataset) {
        List<ColumnsMaxLength> columnsMaxLengthList = new ArrayList<>();
        columnsMaxLengthList.add(
                new ColumnsMaxLength(Arrays.asList(
                        Constant.USER_PSEUDO_ID,
                        Constant.USER_ID,
                        Constant.FIRST_TRAFFIC_SOURCE,
                        Constant.FIRST_TRAFFIC_MEDIUM,
                        Constant.FIRST_TRAFFIC_CAMPAIGN,
                        Constant.FIRST_TRAFFIC_CAMPAIGN_ID,
                        Constant.FIRST_TRAFFIC_CLID_PLATFORM,
                        Constant.FIRST_TRAFFIC_CHANNEL_GROUP,
                        Constant.FIRST_TRAFFIC_CATEGORY,
                        Constant.FIRST_APP_INSTALL_SOURCE
                ), MAX_STRING_VALUE_LEN_255)
        );

        columnsMaxLengthList.add(new ColumnsMaxLength(Arrays.asList(
                Constant.FIRST_TRAFFIC_CONTENT,
                Constant.FIRST_TRAFFIC_CLID,
                Constant.FIRST_TRAFFIC_TERM
        ), MAX_STRING_VALUE_LEN_2K));

        columnsMaxLengthList.add(new ColumnsMaxLength(Arrays.asList(
                Constant.FIRST_REFERRER,
                Constant.USER_PROPERTIES_JSON_STR
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
                        Constant.EVENT_VALUE_CURRENCY
                ), MAX_STRING_VALUE_LEN_32)
        );
        columnsMaxLengthList.add(
                new ColumnsMaxLength(Arrays.asList(
                        Constant.EVENT_ID,
                        Constant.EVENT_NAME,
                        Constant.DEVICE_MOBILE_BRAND_NAME,
                        Constant.DEVICE_MOBILE_MODEL_NAME,
                        Constant.DEVICE_MANUFACTURER,
                        Constant.DEVICE_CARRIER,
                        Constant.DEVICE_NETWORK_TYPE,
                        Constant.DEVICE_OPERATING_SYSTEM,
                        Constant.DEVICE_OPERATING_SYSTEM_VERSION,
                        Constant.DEVICE_VENDOR_ID,
                        Constant.DEVICE_ADVERTISING_ID,
                        Constant.DEVICE_SYSTEM_LANGUAGE,
                        Constant.DEVICE_UA_BROWSER,
                        Constant.DEVICE_UA_BROWSER_VERSION,
                        Constant.DEVICE_UA_DEVICE,
                        Constant.DEVICE_UA_DEVICE_CATEGORY,
                        Constant.GEO_CONTINENT,
                        Constant.GEO_SUB_CONTINENT,
                        Constant.GEO_COUNTRY,
                        Constant.GEO_REGION,
                        Constant.GEO_METRO,
                        Constant.GEO_CITY,
                        Constant.GEO_LOCALE,
                        Constant.TRAFFIC_SOURCE_SOURCE,
                        Constant.TRAFFIC_SOURCE_MEDIUM,
                        Constant.TRAFFIC_SOURCE_CAMPAIGN,
                        Constant.TRAFFIC_SOURCE_CAMPAIGN_ID,
                        Constant.TRAFFIC_SOURCE_CLID_PLATFORM,
                        Constant.TRAFFIC_SOURCE_CHANNEL_GROUP,
                        Constant.TRAFFIC_SOURCE_CATEGORY,
                        Constant.APP_PACKAGE_ID,
                        Constant.APP_ID,
                        Constant.APP_VERSION,
                        Constant.APP_TITLE,
                        Constant.APP_INSTALL_SOURCE,
                        Constant.PLATFORM,
                        Constant.PROJECT_ID,
                        Constant.SCREEN_VIEW_SCREEN_NAME,
                        Constant.SCREEN_VIEW_SCREEN_ID,
                        Constant.SCREEN_VIEW_SCREEN_UNIQUE_ID,
                        Constant.SCREEN_VIEW_PREVIOUS_SCREEN_NAME,
                        Constant.SCREEN_VIEW_PREVIOUS_SCREEN_ID,
                        Constant.SCREEN_VIEW_PREVIOUS_SCREEN_UNIQUE_ID,
                        Constant.UPGRADE_PREVIOUS_APP_VERSION,
                        Constant.UPGRADE_PREVIOUS_OS_VERSION,
                        Constant.USER_ID,
                        Constant.USER_PSEUDO_ID,
                        Constant.SESSION_ID,
                        Constant.SDK_ERROR_CODE,
                        Constant.SDK_VERSION,
                        Constant.SDK_NAME,
                        Constant.UA,
                        Constant.IP
                ), MAX_STRING_VALUE_LEN_255)
        );

        columnsMaxLengthList.add(
                new ColumnsMaxLength(Arrays.asList(
                        Constant.TRAFFIC_SOURCE_CONTENT,
                        Constant.TRAFFIC_SOURCE_TERM,
                        Constant.TRAFFIC_SOURCE_CLID,
                        Constant.PAGE_VIEW_PAGE_REFERRER_TITLE,
                        Constant.PAGE_VIEW_PAGE_TITLE,
                        Constant.PAGE_VIEW_HOSTNAME,
                        Constant.PAGE_VIEW_LATEST_REFERRER_HOST,
                        Constant.SEARCH_KEY,
                        Constant.SEARCH_TERM,
                        Constant.OUTBOUND_LINK_CLASSES,
                        Constant.OUTBOUND_LINK_DOMAIN,
                        Constant.OUTBOUND_LINK_ID,
                        Constant.SDK_ERROR_MESSAGE,
                        Constant.APP_EXCEPTION_MESSAGE
                ), MAX_STRING_VALUE_LEN_2K)
        );
        columnsMaxLengthList.add(
                new ColumnsMaxLength(Arrays.asList(
                        Constant.PAGE_VIEW_PAGE_REFERRER,
                        Constant.PAGE_VIEW_PAGE_URL,
                        Constant.PAGE_VIEW_PAGE_URL_PATH,
                        Constant.PAGE_VIEW_LATEST_REFERRER,
                        Constant.OUTBOUND_LINK_URL,
                        Constant.APP_EXCEPTION_STACK,
                        Constant.CUSTOM_PARAMETERS_JSON_STR
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
        return sessionDataset.select(
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
