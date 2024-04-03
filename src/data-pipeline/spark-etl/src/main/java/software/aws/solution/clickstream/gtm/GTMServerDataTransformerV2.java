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

import lombok.extern.slf4j.*;
import org.apache.spark.sql.*;
import org.apache.spark.sql.types.*;
import software.aws.solution.clickstream.common.Constant;
import software.aws.solution.clickstream.model.*;
import software.aws.solution.clickstream.util.*;

import java.util.*;

import static org.apache.spark.sql.functions.*;
import static software.aws.solution.clickstream.util.ContextUtil.*;
import static software.aws.solution.clickstream.util.DatasetUtil.*;
import static software.aws.solution.clickstream.transformer.MaxLengthTransformerV2.*;
import static software.aws.solution.clickstream.TransformerV3.*;
import static software.aws.solution.clickstream.model.ModelV2.*;


@Slf4j
public class GTMServerDataTransformerV2 {
    public static final String TABLE_VERSION_SUFFIX_V2 = "_v2";
    public static final String ETL_GTM_USER_V2_PROPS = "etl_gtm_user_v2_props";
    ServerDataConverterV2 serverDataConverterV2 = new ServerDataConverterV2();

    private static Dataset<Row> extractEvent(final Dataset<Row> convertedDataset) {
        Dataset<Row> eventDataset = convertedDataset.select(explode(expr("dataOut.events")).alias("event"))
                .select("event.*")
                .select(toColumnArray(ModelV2.getEventFields()));
        return addProcessInfo(runMaxLengthTransformerForEventV2(eventDataset));
    }

    public static Dataset<Row> aggUserDataset(final Dataset<Row> userDataSet, final String info) {
        Dataset<Row> userIdDataset = userDataSet
                .select(Constant.APP_ID,
                        Constant.USER_PSEUDO_ID,
                        Constant.USER_ID,
                        Constant.EVENT_TIMESTAMP,
                        Constant.PROCESS_INFO)
                .groupBy(Constant.APP_ID, Constant.USER_PSEUDO_ID)
                .agg(
                        max(Constant.USER_ID).alias(Constant.USER_ID),
                        max(Constant.EVENT_TIMESTAMP).alias(Constant.EVENT_TIMESTAMP),
                        first(Constant.PROCESS_INFO).alias(Constant.PROCESS_INFO)
                );

        log.info("aggUserDataset() userIdDataset count: {}, info: {}", userIdDataset.count(), info);

        boolean debugLocal = Boolean.parseBoolean(System.getProperty(DEBUG_LOCAL_PROP));

        if (debugLocal && userDataSet.count() > 0) {
            log.info("{} userDataSet: {}", info, userDataSet.first().prettyJson());
        }

        String latest = "latest.";
        Dataset<Row> latestUserPropsDataset1 =
                userDataSet.filter(col(Constant.USER_PROPERTIES).isNotNull())
                        .groupBy(Constant.APP_ID, Constant.USER_PSEUDO_ID)
                        .agg(
                                max_by(struct(
                                        Constant.USER_PROPERTIES,
                                        Constant.USER_PROPERTIES_JSON_STR
                                ), col(Constant.EVENT_TIMESTAMP)).alias("latest"));

        Dataset<Row> latestUserPropsDataset = latestUserPropsDataset1.select(
                col(Constant.APP_ID).alias("app_id_1"),
                col(Constant.USER_PSEUDO_ID).alias("user_pseudo_id_1"),
                col(latest + Constant.USER_PROPERTIES).alias(Constant.USER_PROPERTIES),
                col(latest + Constant.USER_PROPERTIES_JSON_STR).alias(Constant.USER_PROPERTIES_JSON_STR)
        );

        log.info("aggUserDataset() latestUserPropsDataset count: {}, info: {}", latestUserPropsDataset.count(), info);
        if (debugLocal && latestUserPropsDataset.count() > 0) {
            log.info("{} - latestUserPropsDataset: {}", info, latestUserPropsDataset.first().prettyJson());
        }

        String first = "first.";
        Dataset<Row> firstUserPropsDataset1 =
                userDataSet
                        .groupBy(Constant.APP_ID, Constant.USER_PSEUDO_ID)
                        .agg(
                                min_by(struct(
                                        Constant.FIRST_TOUCH_TIME_MSEC,
                                        Constant.FIRST_VISIT_DATE,
                                        Constant.FIRST_REFERRER,
                                        Constant.FIRST_TRAFFIC_SOURCE,
                                        Constant.FIRST_TRAFFIC_MEDIUM,
                                        Constant.FIRST_TRAFFIC_CAMPAIGN,
                                        Constant.FIRST_TRAFFIC_CONTENT,
                                        Constant.FIRST_TRAFFIC_TERM,
                                        Constant.FIRST_TRAFFIC_CAMPAIGN_ID,
                                        Constant.FIRST_TRAFFIC_CLID_PLATFORM,
                                        Constant.FIRST_TRAFFIC_CLID,
                                        Constant.FIRST_TRAFFIC_CHANNEL_GROUP,
                                        Constant.FIRST_TRAFFIC_CATEGORY,
                                        Constant.FIRST_APP_INSTALL_SOURCE
                                ), col(Constant.EVENT_TIMESTAMP)).alias("first"));

        Dataset<Row> firstUserPropsDataset = firstUserPropsDataset1.select(
                col(Constant.APP_ID).alias("app_id_2"),
                col(Constant.USER_PSEUDO_ID).alias("user_pseudo_id_2"),
                col(first + Constant.FIRST_TOUCH_TIME_MSEC).alias(Constant.FIRST_TOUCH_TIME_MSEC),
                col(first + Constant.FIRST_VISIT_DATE).alias(Constant.FIRST_VISIT_DATE),
                col(first + Constant.FIRST_REFERRER).alias(Constant.FIRST_REFERRER),
                col(first + Constant.FIRST_TRAFFIC_SOURCE).alias(Constant.FIRST_TRAFFIC_SOURCE),
                col(first + Constant.FIRST_TRAFFIC_MEDIUM).alias(Constant.FIRST_TRAFFIC_MEDIUM),
                col(first + Constant.FIRST_TRAFFIC_CAMPAIGN).alias(Constant.FIRST_TRAFFIC_CAMPAIGN),
                col(first + Constant.FIRST_TRAFFIC_CONTENT).alias(Constant.FIRST_TRAFFIC_CONTENT),
                col(first + Constant.FIRST_TRAFFIC_TERM).alias(Constant.FIRST_TRAFFIC_TERM),
                col(first + Constant.FIRST_TRAFFIC_CAMPAIGN_ID).alias(Constant.FIRST_TRAFFIC_CAMPAIGN_ID),
                col(first + Constant.FIRST_TRAFFIC_CLID_PLATFORM).alias(Constant.FIRST_TRAFFIC_CLID_PLATFORM),
                col(first + Constant.FIRST_TRAFFIC_CLID).alias(Constant.FIRST_TRAFFIC_CLID),
                col(first + Constant.FIRST_TRAFFIC_CHANNEL_GROUP).alias(Constant.FIRST_TRAFFIC_CHANNEL_GROUP),
                col(first + Constant.FIRST_TRAFFIC_CATEGORY).alias(Constant.FIRST_TRAFFIC_CATEGORY),
                col(first + Constant.FIRST_APP_INSTALL_SOURCE).alias(Constant.FIRST_APP_INSTALL_SOURCE)
        );

        log.info("aggUserDataset() firstUserPropsDataset count: {}, info: {}", firstUserPropsDataset.count(), info);
        if (debugLocal && firstUserPropsDataset.count() > 0) {
            log.info("{} - firstUserPropsDataset: {}", info, firstUserPropsDataset.first().prettyJson());
        }
        Column joinCondition1 = col(Constant.APP_ID).equalTo(col("app_id_1"))
                .and(col(Constant.USER_PSEUDO_ID).equalTo(col("user_pseudo_id_1")));

        Column joinCondition2 = col(Constant.APP_ID).equalTo(col("app_id_2"))
                .and(col(Constant.USER_PSEUDO_ID).equalTo(col("user_pseudo_id_2")));

        Dataset<Row> userFinalDatasetJoined = userIdDataset
                .join(latestUserPropsDataset, joinCondition1, "left")
                .join(firstUserPropsDataset, joinCondition2, "left");

        Dataset<Row> userFinalDataset = userFinalDatasetJoined.select(
                col(Constant.APP_ID),
                col(Constant.USER_PSEUDO_ID),
                col(Constant.EVENT_TIMESTAMP),
                col(Constant.USER_ID),
                col(Constant.USER_PROPERTIES),
                col(Constant.USER_PROPERTIES_JSON_STR),
                col(Constant.FIRST_TOUCH_TIME_MSEC),
                col(Constant.FIRST_VISIT_DATE),
                col(Constant.FIRST_REFERRER),
                col(Constant.FIRST_TRAFFIC_SOURCE),
                col(Constant.FIRST_TRAFFIC_MEDIUM),
                col(Constant.FIRST_TRAFFIC_CAMPAIGN),
                col(Constant.FIRST_TRAFFIC_CONTENT),
                col(Constant.FIRST_TRAFFIC_TERM),
                col(Constant.FIRST_TRAFFIC_CAMPAIGN_ID),
                col(Constant.FIRST_TRAFFIC_CLID_PLATFORM),
                col(Constant.FIRST_TRAFFIC_CLID),
                col(Constant.FIRST_TRAFFIC_CHANNEL_GROUP),
                col(Constant.FIRST_TRAFFIC_CATEGORY),
                col(Constant.FIRST_APP_INSTALL_SOURCE),
                col(Constant.PROCESS_INFO)
        );
        log.info("aggUserDataset() return count: {}, info: {}", userFinalDataset.count(), info);
        if (debugLocal && userFinalDataset.count() > 0) {
            log.info("{} - userFinalDataset: {}", info, userFinalDataset.first().prettyJson());
        }
        return userFinalDataset;
    }

    private static void mergeIncrementalTables(final SparkSession sparkSession) {
        log.info("start merging incremental tables");
        int userKeepDays = ContextUtil.getUserKeepDays();

        List<DatasetUtil.TableInfo> l = new ArrayList<>();

        l.add(new DatasetUtil.TableInfo(
                ETL_GTM_USER_V2_PROPS, TABLE_VERSION_SUFFIX_V2, userKeepDays
        ));

        DatasetUtil.mergeIncrementalTables(sparkSession, l);
    }

    public Map<TableName, Dataset<Row>> transform(final Dataset<Row> dataset) {
        Dataset<Row> datasetWithFileName = dataset.withColumn(INPUT_FILE_NAME, input_file_name());
        Dataset<Row> convertedDataset = serverDataConverterV2.transform(datasetWithFileName);
        convertedDataset.cache();
        log.info("convertedDataset count:" + convertedDataset.count());

        Dataset<Row> eventDataset = extractEvent(convertedDataset);
        Dataset<Row> itemDataset = extractItem(convertedDataset);
        Dataset<Row> userDataset = extractUser(eventDataset, convertedDataset);
        Dataset<Row> sessionDataset = extractSessionFromEvent(eventDataset);

        log.info("eventDataset count:" + eventDataset.count());
        log.info("itemDataset count:" + itemDataset.count());
        log.info("userDataset count:" + userDataset.count());
        log.info("sessionDataset count:" + sessionDataset.count());

        Map<TableName, Dataset<Row>> result = new EnumMap<>(TableName.class);
        // table name -> dataset
        result.put(TableName.EVENT_V2, eventDataset);
        result.put(TableName.ITEM_V2, itemDataset);
        result.put(TableName.USER_V2, userDataset);
        result.put(TableName.SESSION, sessionDataset);
        return result;

    }

    private Dataset<Row> extractUser(final Dataset<Row> eventDataset, final Dataset<Row> convertedDataset) {
        Dataset<Row> userDataset = convertedDataset.select(expr("dataOut.user.*"))
                .select(toColumnArray(ModelV2.getUserFields()));

        if (userDataset.count() == 0) {
            log.info("extractUser return empty dataset");
            return userDataset;
        }

        // agg new
        Dataset<Row> newUserAggDataset = aggUserDataset(userDataset, "newUserAggDataset");
        log.info("newUserAggDataset count: {}", newUserAggDataset.count());

        String tableName = ETL_GTM_USER_V2_PROPS;
        DatasetUtil.PathInfo pathInfo = addSchemaToMap(newUserAggDataset, tableName, TABLE_VERSION_SUFFIX_V2);
        log.info("tableName: {}", tableName);
        log.info("pathInfo - incremental: " + pathInfo.getIncremental() + ", full: " + pathInfo.getFull());

        // save new (append)
        String path = saveIncrementalDatasetToPath(pathInfo.getIncremental(), newUserAggDataset);

        // read back full from incremental path
        Dataset<Row> fullUserDataset = readDatasetFromPath(eventDataset.sparkSession(), path, ContextUtil.getUserKeepDays());
        log.info("fullUserDataset count: {}", +fullUserDataset.count());

        // agg full
        Dataset<Row> fullUserAggDataset = aggUserDataset(fullUserDataset, "fullUserAggDataset");

        // save full(overwrite) to full path
        saveFullDatasetToPath(pathInfo.getFull(), fullUserAggDataset);

        // get new updated
        Dataset<Row> newUserIdDataset = newUserAggDataset.select(Constant.APP_ID, Constant.USER_PSEUDO_ID);
        Column jonCondition = newUserIdDataset.col(Constant.APP_ID).equalTo(fullUserAggDataset.col(Constant.APP_ID))
                .and(newUserIdDataset.col(Constant.USER_PSEUDO_ID).equalTo(fullUserAggDataset.col(Constant.USER_PSEUDO_ID)));

        Dataset<Row> userDatasetFinal = newUserIdDataset.join(fullUserAggDataset, jonCondition, "left")
                .select(
                        newUserIdDataset.col(Constant.APP_ID),
                        newUserIdDataset.col(Constant.USER_PSEUDO_ID),
                        col(Constant.EVENT_TIMESTAMP),
                        col(Constant.USER_ID),
                        col(Constant.USER_PROPERTIES),
                        col(Constant.USER_PROPERTIES_JSON_STR),
                        col(Constant.FIRST_TOUCH_TIME_MSEC),
                        col(Constant.FIRST_VISIT_DATE),
                        col(Constant.FIRST_REFERRER),
                        col(Constant.FIRST_TRAFFIC_SOURCE),
                        col(Constant.FIRST_TRAFFIC_MEDIUM),
                        col(Constant.FIRST_TRAFFIC_CAMPAIGN),
                        col(Constant.FIRST_TRAFFIC_CONTENT),
                        col(Constant.FIRST_TRAFFIC_TERM),
                        col(Constant.FIRST_TRAFFIC_CAMPAIGN_ID),
                        col(Constant.FIRST_TRAFFIC_CLID_PLATFORM),
                        col(Constant.FIRST_TRAFFIC_CLID),
                        col(Constant.FIRST_TRAFFIC_CHANNEL_GROUP),
                        col(Constant.FIRST_TRAFFIC_CATEGORY),
                        col(Constant.FIRST_APP_INSTALL_SOURCE),
                        col(Constant.PROCESS_INFO),
                        lit(null).cast(DataTypes.StringType).alias(Constant.EVENT_NAME)
                );

        log.info("extractUser return userDatasetFinal count: {}", userDatasetFinal.count());

        return addProcessInfo(runMaxLengthTransformerForUserV2(userDatasetFinal));
    }

    private Dataset<Row> extractItem(final Dataset<Row> convertedDataset) {
        Dataset<Row> itemDataset = convertedDataset.select(explode(expr("dataOut.items")).alias("item"))
                .select("item.*")
                .select(toColumnArray(ModelV2.getItemFields()));
        return addProcessInfo(runMaxLengthTransformerForItemV2(itemDataset));
    }

    private Dataset<Row> extractSessionFromEvent(final Dataset<Row> eventDataset) {
        Dataset<Row> sessionDataset = eventDataset.select(
                        col(Constant.APP_ID),
                        col(Constant.EVENT_TIMESTAMP),
                        col(Constant.EVENT_NAME),
                        col(Constant.PLATFORM),
                        col(Constant.USER_PSEUDO_ID),
                        col(Constant.SESSION_ID),
                        col(Constant.USER_ID),
                        col(Constant.SESSION_NUMBER),
                        col(Constant.SESSION_START_TIME_MSEC),
                        col(Constant.TRAFFIC_SOURCE_SOURCE).alias(Constant.SESSION_SOURCE),
                        col(Constant.TRAFFIC_SOURCE_MEDIUM).alias(Constant.SESSION_MEDIUM),
                        col(Constant.TRAFFIC_SOURCE_CAMPAIGN).alias(Constant.SESSION_CAMPAIGN),
                        col(Constant.TRAFFIC_SOURCE_CONTENT).alias(Constant.SESSION_CONTENT),
                        col(Constant.TRAFFIC_SOURCE_TERM).alias(Constant.SESSION_TERM),
                        col(Constant.TRAFFIC_SOURCE_CAMPAIGN_ID).alias(Constant.SESSION_CAMPAIGN_ID),
                        col(Constant.TRAFFIC_SOURCE_CLID_PLATFORM).alias(Constant.SESSION_CLID_PLATFORM),
                        col(Constant.TRAFFIC_SOURCE_CLID).alias(Constant.SESSION_CLID),
                        col(Constant.TRAFFIC_SOURCE_CHANNEL_GROUP).alias(Constant.SESSION_CHANNEL_GROUP),
                        col(Constant.TRAFFIC_SOURCE_CATEGORY).alias(Constant.SESSION_SOURCE_CATEGORY),
                        col(Constant.PROCESS_INFO)
                )
                .filter(col(Constant.SESSION_ID).isNotNull()
                        .and(col(Constant.EVENT_NAME).equalTo(EVENT_SESSION_START))
                )
                .groupBy(Constant.APP_ID, Constant.USER_PSEUDO_ID, Constant.SESSION_ID)
                .agg(
                        max(col(Constant.EVENT_TIMESTAMP)).alias(Constant.EVENT_TIMESTAMP),
                        max(col(Constant.USER_ID)).alias(Constant.USER_ID),
                        max(col(Constant.SESSION_NUMBER)).alias(Constant.SESSION_NUMBER),
                        min(col(Constant.SESSION_START_TIME_MSEC)).alias(Constant.SESSION_START_TIME_MSEC),
                        max(col(Constant.SESSION_SOURCE)).alias(Constant.SESSION_SOURCE),
                        max(col(Constant.SESSION_MEDIUM)).alias(Constant.SESSION_MEDIUM),
                        max(col(Constant.SESSION_CAMPAIGN)).alias(Constant.SESSION_CAMPAIGN),
                        max(col(Constant.SESSION_CONTENT)).alias(Constant.SESSION_CONTENT),
                        max(col(Constant.SESSION_TERM)).alias(Constant.SESSION_TERM),
                        max(col(Constant.SESSION_CAMPAIGN_ID)).alias(Constant.SESSION_CAMPAIGN_ID),
                        max(col(Constant.SESSION_CLID_PLATFORM)).alias(Constant.SESSION_CLID_PLATFORM),
                        max(col(Constant.SESSION_CLID)).alias(Constant.SESSION_CLID),
                        max(col(Constant.SESSION_CHANNEL_GROUP)).alias(Constant.SESSION_CHANNEL_GROUP),
                        max(col(Constant.SESSION_SOURCE_CATEGORY)).alias(Constant.SESSION_SOURCE_CATEGORY),
                        first(col(Constant.PROCESS_INFO)).alias(Constant.PROCESS_INFO)
                );
        Dataset<Row> sessionDatasetAgg = sessionDataset.select(toColumnArray(ModelV2.getSessionFields()));
        return addProcessInfo(runMaxLengthTransformerForSession(sessionDatasetAgg));
    }

    public Dataset<Row> postTransform(final Dataset<Row> dataset) {
        SparkSession sparkSession = dataset.sparkSession();
        mergeIncrementalTables(sparkSession);
        return dataset.drop(Constant.UA, Constant.IP);
    }
}
