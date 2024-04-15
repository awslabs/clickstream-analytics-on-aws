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

import lombok.Getter;
import lombok.extern.slf4j.*;
import org.apache.spark.sql.*;
import org.apache.spark.sql.types.*;
import software.aws.solution.clickstream.common.Constant;
import software.aws.solution.clickstream.common.RuleConfig;
import software.aws.solution.clickstream.common.enrich.RuleBasedTrafficSourceHelper;
import software.aws.solution.clickstream.model.*;
import software.aws.solution.clickstream.transformer.*;
import software.aws.solution.clickstream.util.*;

import java.sql.*;
import java.time.*;
import java.util.*;

import static org.apache.spark.sql.functions.*;
import static software.aws.solution.clickstream.common.BaseEventParser.UPLOAD_TIMESTAMP;
import static software.aws.solution.clickstream.util.ContextUtil.*;
import static software.aws.solution.clickstream.util.DatasetUtil.*;
import static software.aws.solution.clickstream.transformer.MaxLengthTransformerV2.*;
import static software.aws.solution.clickstream.model.ModelV2.*;


@Slf4j
public class TransformerV3 implements TransformerInterfaceV3 {
    public static final String TABLE_VERSION_SUFFIX_V1 = "_v1";
    public static final String ETL_USER_V2_PROPS = "etl_user_v2_props";
    public static final String INPUT_FILE_NAME = "input_file_name";
    public static final String PROCESS_JOB_ID = "process_job_id";
    public static final String PROCESS_TIME = "process_time";
    public static final String PLATFORM_WEB = "Web";
    public static final String USER_FIRST_EVENT_NAME = "first_event_name";
    public static final String USER_LATEST_EVENT_NAME = "latest_event_name";
    public static final String CLIENT_TIMESTAMP = "client_timestamp";
    public static final String DATA_STR = "data_str";
    private final Cleaner cleaner = new Cleaner();
    @Getter
    private Map<String, RuleConfig> appRuleConfig;

    public TransformerV3() {
    }
    public TransformerV3(final TransformConfig transformConfig) {
        config(transformConfig);
    }

    @Override
    public void config(final TransformConfig transformConfig) {
        this.appRuleConfig = transformConfig.getAppRuleConfig();
        log.info("appRuleConfig is set");
    }

    public static Dataset<Row> addProcessInfo(final Dataset<Row> dataset) {
        String jobName = ContextUtil.getJobName();
        return dataset.withColumn(Constant.PROCESS_INFO,
                mapConcatSafe(
                        col(Constant.PROCESS_INFO),
                        map(
                                lit(PROCESS_JOB_ID), lit(jobName),
                                lit(PROCESS_TIME), lit(Instant.now().toString())
                        ))
        ).withColumn(Constant.CREATED_TIME, lit(new Timestamp(System.currentTimeMillis())).cast(DataTypes.TimestampType));
    }


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
        String latestEventName = USER_LATEST_EVENT_NAME;
        Dataset<Row> profileSetUserPropsDataset = userDataSet.filter(
                col(Constant.USER_PROPERTIES).isNotNull()
                        .and(col(latestEventName).equalTo(EVENT_PROFILE_SET))
        );

        log.info("aggUserDataset() profileSetUserPropsDataset count: {}, info: {}", profileSetUserPropsDataset.count(), info);

        Dataset<Row> latestUserPropsDataset1 = profileSetUserPropsDataset
                .groupBy(Constant.APP_ID, Constant.USER_PSEUDO_ID)
                .agg(
                        max_by(struct(
                                Constant.USER_PROPERTIES,
                                Constant.USER_PROPERTIES_JSON_STR,
                                latestEventName
                        ), col(Constant.EVENT_TIMESTAMP)).alias("latest")
                );

        Dataset<Row> latestUserPropsDataset = latestUserPropsDataset1.select(
                col(Constant.APP_ID).alias("app_id_1"),
                col(Constant.USER_PSEUDO_ID).alias("user_pseudo_id_1"),
                col(latest + Constant.USER_PROPERTIES).alias(Constant.USER_PROPERTIES),
                col(latest + Constant.USER_PROPERTIES_JSON_STR).alias(Constant.USER_PROPERTIES_JSON_STR),
                col(latest + latestEventName).alias(latestEventName)
        );

        log.info("aggUserDataset() latestUserPropsDataset count: {}, info: {}", latestUserPropsDataset.count(), info);
        if (debugLocal && latestUserPropsDataset.count() > 0) {
            log.info("{} - latestUserPropsDataset: {}", info, latestUserPropsDataset.first().prettyJson());
        }

        String first = "first.";
        String firstEventName = USER_FIRST_EVENT_NAME;
        Dataset<Row> userFirstDataSet = userDataSet.filter(
                col(firstEventName).isin(
                        EVENT_FIRST_OPEN,
                        EVENT_FIRST_VISIT,
                        EVENT_SESSION_START,
                        EVENT_SCREEN_VIEW));
        log.info("aggUserDataset() userFirstDataSet count: {}, info: {}", userFirstDataSet.count(), info);

        Dataset<Row> firstUserPropsDataset1 = userFirstDataSet
                .groupBy(Constant.APP_ID, Constant.USER_PSEUDO_ID)
                .agg(
                        min_by(struct(
                                firstEventName,
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
                col(first + firstEventName).alias(firstEventName),
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
        Dataset<Row> userFinalDataset = joinUserDatasets(userIdDataset, latestUserPropsDataset, firstUserPropsDataset, latestEventName, firstEventName);

        log.info("aggUserDataset() return count: {}, info: {}", userFinalDataset.count(), info);
        if (debugLocal && userFinalDataset.count() > 0) {
            log.info("{} - userFinalDataset: {}", info, userFinalDataset.first().prettyJson());
        }
        return userFinalDataset;
    }

    private static Dataset<Row> joinUserDatasets(final Dataset<Row> userIdDataset,
                                                 final Dataset<Row> latestUserPropsDataset,
                                                 final Dataset<Row> firstUserPropsDataset,
                                                 final String latestEventName, final String firstEventName) {
        Column joinCondition1 = col(Constant.APP_ID).equalTo(col("app_id_1"))
                .and(col(Constant.USER_PSEUDO_ID).equalTo(col("user_pseudo_id_1")));

        Column joinCondition2 = col(Constant.APP_ID).equalTo(col("app_id_2"))
                .and(col(Constant.USER_PSEUDO_ID).equalTo(col("user_pseudo_id_2")));

        Dataset<Row> userFinalDatasetJoined = userIdDataset
                .join(latestUserPropsDataset, joinCondition1, "left")
                .join(firstUserPropsDataset, joinCondition2, "left");

        return userFinalDatasetJoined.select(
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
                col(latestEventName),
                col(firstEventName),
                mapConcatSafe(
                        col(Constant.PROCESS_INFO),
                        map(
                                lit(latestEventName), col(latestEventName),
                                lit(firstEventName), col(firstEventName)
                        )).alias(Constant.PROCESS_INFO)
        );
    }

    public static Column mapConcatSafe(final Column map1, final Column map2) {
        return when(map1.isNull(), map2)
                .when(map2.isNull(), map1)
                .otherwise(map_concat(map1, map2));
    }

    private static void mergeIncrementalTables(final SparkSession sparkSession) {
        log.info("start merging incremental tables");
        int userKeepDays = ContextUtil.getUserKeepDays();

        List<DatasetUtil.TableInfo> l = new ArrayList<>();

        l.add(new DatasetUtil.TableInfo(
                ETL_USER_V2_PROPS, TABLE_VERSION_SUFFIX_V1, userKeepDays
        ));

        DatasetUtil.mergeIncrementalTables(sparkSession, l);
    }

    @Override
    public Map<TableName, Dataset<Row>> transform(final Dataset<Row> dataset) {
        Dataset<Row> cleanedDataset = cleaner.clean(dataset, DATA_SCHEMA_V2_FILE_PATH);
        cleanedDataset = cleanedDataset.drop(DATA)
                .withColumnRenamed(DATA_STR, DATA);

        ContextUtil.cacheDataset(cleanedDataset);
        log.info(new ETLMetric(cleanedDataset, "after clean").toString());

        log.info(cleanedDataset.schema().prettyJson());

        if (Arrays.asList(dataset.columns()).contains(CLIENT_TIMESTAMP)) {
            cleanedDataset = cleanedDataset.withColumn(UPLOAD_TIMESTAMP, col(CLIENT_TIMESTAMP).cast(DataTypes.LongType));
        } else if (!Arrays.asList(dataset.columns()).contains(UPLOAD_TIMESTAMP)) {
            cleanedDataset = cleanedDataset.withColumn(UPLOAD_TIMESTAMP, lit(null).cast(DataTypes.LongType));
        }

        if (this.getAppRuleConfig() == null) {
            throw new IllegalArgumentException("appRuleConfig is null");
        }

        DataConverterV3 dataConverter = new DataConverterV3(this.getAppRuleConfig());

        Dataset<Row> convertedDataset = dataConverter.transform(cleanedDataset);
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

        userDataset = userDataset.withColumn(USER_FIRST_EVENT_NAME, col(Constant.EVENT_NAME))
                .withColumn(USER_LATEST_EVENT_NAME, col(Constant.EVENT_NAME))
                .drop(Constant.EVENT_NAME);

        // agg new
        Dataset<Row> newUserAggDataset = aggUserDataset(userDataset, "newUserAggDataset");
        log.info("newUserAggDataset count: {}", newUserAggDataset.count());

        String tableName = ETL_USER_V2_PROPS;
        DatasetUtil.PathInfo pathInfo = addSchemaToMap(newUserAggDataset, tableName, TABLE_VERSION_SUFFIX_V1);
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
                // add event name to process info
                mapConcatSafe(
                        col(Constant.PROCESS_INFO),
                        map(lit(Constant.EVENT_NAME), col(Constant.EVENT_NAME))
                ).alias(Constant.PROCESS_INFO)
        ).filter(col(Constant.SESSION_ID).isNotNull());

        sessionDataset.cache();

        log.info("sessionDataset count: {}", sessionDataset.count());
        Dataset<Row> sessionDatasetWeb = sessionDataset
                .filter((col(Constant.EVENT_NAME).equalTo(EVENT_SESSION_START))
                        .and(lower(col(Constant.PLATFORM)).equalTo(PLATFORM_WEB.toLowerCase())));

        Column[] aggColumns = new Column[]{
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
        };
        Dataset<Row> sessionDatasetWebAgg = sessionDatasetWeb
                .groupBy(Constant.APP_ID, Constant.USER_PSEUDO_ID, Constant.SESSION_ID)
                .agg(
                        max(col(Constant.EVENT_TIMESTAMP)).alias(Constant.EVENT_TIMESTAMP),
                        aggColumns
                );

        log.info("sessionDatasetWebAgg count: {}", sessionDatasetWebAgg.count());

        Dataset<Row> sessionDatasetMobile = sessionDataset
                .filter((col(Constant.EVENT_NAME).isin(
                        EVENT_SCREEN_VIEW,
                        EVENT_USER_ENGAGEMENT,
                        EVENT_APP_END
                )).and(lower(col(Constant.PLATFORM)).notEqual(PLATFORM_WEB.toLowerCase())));

        sessionDatasetMobile.cache();
        log.info("sessionDatasetMobile count: {}", sessionDatasetMobile.count());

        Dataset<Row> sessionDatasetMobileNonDirectAgg = sessionDatasetMobile
                .filter(col(Constant.SESSION_SOURCE).isNotNull().and(col(Constant.SESSION_SOURCE).notEqual(RuleBasedTrafficSourceHelper.DIRECT)))
                .groupBy(Constant.APP_ID, Constant.USER_PSEUDO_ID, Constant.SESSION_ID)
                .agg(
                        max(col(Constant.EVENT_TIMESTAMP)).alias(Constant.EVENT_TIMESTAMP),
                        aggColumns
                );

        log.info("sessionDatasetMobileNonDirectAgg count: {}", sessionDatasetMobileNonDirectAgg.count());
        Dataset<Row> sessionDatasetMobileDirectAgg = sessionDatasetMobile.join(sessionDatasetMobileNonDirectAgg,
                        sessionDatasetMobile.col(Constant.SESSION_ID)
                                .equalTo(sessionDatasetMobileNonDirectAgg.col(Constant.SESSION_ID))
                                .and(sessionDatasetMobile.col(Constant.APP_ID)
                                        .equalTo(sessionDatasetMobileNonDirectAgg.col(Constant.APP_ID)))
                                .and(sessionDatasetMobile.col(Constant.USER_PSEUDO_ID)
                                        .equalTo(sessionDatasetMobileNonDirectAgg.col(Constant.USER_PSEUDO_ID))),
                        "left_anti")
                .groupBy(Constant.APP_ID, Constant.USER_PSEUDO_ID, Constant.SESSION_ID)
                .agg(
                        max(col(Constant.EVENT_TIMESTAMP)).alias(Constant.EVENT_TIMESTAMP),
                        aggColumns
                );
        log.info("sessionDatasetMobileDirectAgg count: {}", sessionDatasetMobileDirectAgg.count());

        Dataset<Row> sessionDatasetAgg = sessionDatasetWebAgg
                .unionAll(sessionDatasetMobileNonDirectAgg)
                .unionAll(sessionDatasetMobileDirectAgg)
                .select(toColumnArray(ModelV2.getSessionFields()));
        return addProcessInfo(runMaxLengthTransformerForSession(sessionDatasetAgg));
    }

    @Override
    public Dataset<Row> postTransform(final Dataset<Row> dataset) {
        SparkSession sparkSession = dataset.sparkSession();
        mergeIncrementalTables(sparkSession);
        return dataset.drop(Constant.UA, Constant.IP);
    }


}
