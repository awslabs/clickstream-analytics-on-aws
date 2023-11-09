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

import lombok.extern.slf4j.Slf4j;
import org.apache.spark.sql.Column;
import org.apache.spark.sql.Dataset;
import org.apache.spark.sql.Row;
import org.apache.spark.sql.SaveMode;
import org.apache.spark.sql.SparkSession;
import org.apache.spark.sql.types.ArrayType;
import org.apache.spark.sql.types.DataTypes;
import org.apache.spark.sql.types.StructField;
import org.apache.spark.sql.types.StructType;
import software.aws.solution.clickstream.ContextUtil;
import software.aws.solution.clickstream.DatasetUtil;
import software.aws.solution.clickstream.ETLMetric;
import software.aws.solution.clickstream.ETLRunner;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;

import static org.apache.spark.sql.functions.coalesce;
import static org.apache.spark.sql.functions.col;
import static org.apache.spark.sql.functions.concat_ws;
import static org.apache.spark.sql.functions.explode;
import static org.apache.spark.sql.functions.lit;
import static org.apache.spark.sql.functions.struct;
import static org.apache.spark.sql.functions.substring;
import static org.apache.spark.sql.functions.timestamp_seconds;
import static org.apache.spark.sql.functions.to_date;
import static software.aws.solution.clickstream.ContextUtil.DEBUG_LOCAL_PROP;
import static software.aws.solution.clickstream.ContextUtil.PROJECT_ID_PROP;
import static software.aws.solution.clickstream.DatasetUtil.APP_ID;
import static software.aws.solution.clickstream.DatasetUtil.APP_INFO;
import static software.aws.solution.clickstream.DatasetUtil.CHANNEL;
import static software.aws.solution.clickstream.DatasetUtil.CLIENT_ID;
import static software.aws.solution.clickstream.DatasetUtil.CLIENT_PLATFORM;
import static software.aws.solution.clickstream.DatasetUtil.CLIENT_PLATFORM_VERSION;
import static software.aws.solution.clickstream.DatasetUtil.COL_PAGE_REFERER;
import static software.aws.solution.clickstream.DatasetUtil.DATA_OUT;
import static software.aws.solution.clickstream.DatasetUtil.DEVICE_ID_LIST;
import static software.aws.solution.clickstream.DatasetUtil.DOUBLE_VALUE;
import static software.aws.solution.clickstream.DatasetUtil.EVENT_ID;
import static software.aws.solution.clickstream.DatasetUtil.EVENT_ITEMS;
import static software.aws.solution.clickstream.DatasetUtil.EVENT_NAME;
import static software.aws.solution.clickstream.DatasetUtil.EVENT_PARAM;
import static software.aws.solution.clickstream.DatasetUtil.EVENT_PARAMS;
import static software.aws.solution.clickstream.DatasetUtil.EVENT_PARAM_DOUBLE_VALUE;
import static software.aws.solution.clickstream.DatasetUtil.EVENT_PARAM_FLOAT_VALUE;
import static software.aws.solution.clickstream.DatasetUtil.EVENT_PARAM_INT_VALUE;
import static software.aws.solution.clickstream.DatasetUtil.EVENT_PARAM_KEY;
import static software.aws.solution.clickstream.DatasetUtil.EVENT_PARAM_STRING_VALUE;
import static software.aws.solution.clickstream.DatasetUtil.EVENT_TIMESTAMP;
import static software.aws.solution.clickstream.DatasetUtil.FIRST_REFERER;
import static software.aws.solution.clickstream.DatasetUtil.FIRST_TRAFFIC_MEDIUM;
import static software.aws.solution.clickstream.DatasetUtil.FIRST_TRAFFIC_SOURCE;
import static software.aws.solution.clickstream.DatasetUtil.FIRST_TRAFFIC_SOURCE_TYPE;
import static software.aws.solution.clickstream.DatasetUtil.FIRST_VISIT_DATE;
import static software.aws.solution.clickstream.DatasetUtil.FLOAT_VALUE;
import static software.aws.solution.clickstream.DatasetUtil.GEO_FOR_ENRICH;
import static software.aws.solution.clickstream.DatasetUtil.GTM_ID;
import static software.aws.solution.clickstream.DatasetUtil.GTM_VERSION;
import static software.aws.solution.clickstream.DatasetUtil.ID;
import static software.aws.solution.clickstream.DatasetUtil.INGEST_TIMESTAMP;
import static software.aws.solution.clickstream.DatasetUtil.INT_VALUE;
import static software.aws.solution.clickstream.DatasetUtil.IP;
import static software.aws.solution.clickstream.DatasetUtil.ITEM;
import static software.aws.solution.clickstream.DatasetUtil.ITEMS;
import static software.aws.solution.clickstream.DatasetUtil.KEY;
import static software.aws.solution.clickstream.DatasetUtil.LANGUAGE;
import static software.aws.solution.clickstream.DatasetUtil.LOCALE;
import static software.aws.solution.clickstream.DatasetUtil.MAX_PARAM_STRING_VALUE_LEN;
import static software.aws.solution.clickstream.DatasetUtil.MAX_STRING_VALUE_LEN;
import static software.aws.solution.clickstream.DatasetUtil.PAGE_REFERRER;
import static software.aws.solution.clickstream.DatasetUtil.PLATFORM;
import static software.aws.solution.clickstream.DatasetUtil.PROPERTIES;
import static software.aws.solution.clickstream.DatasetUtil.REQUEST_START_TIME_MS;
import static software.aws.solution.clickstream.DatasetUtil.SCREEN_HEIGHT;
import static software.aws.solution.clickstream.DatasetUtil.SCREEN_WIDTH;
import static software.aws.solution.clickstream.DatasetUtil.STRING_VALUE;
import static software.aws.solution.clickstream.DatasetUtil.TABLE_NAME_ETL_GTM_USER_REFERRER;
import static software.aws.solution.clickstream.DatasetUtil.TABLE_NAME_ETL_GTM_USER_VISIT;
import static software.aws.solution.clickstream.DatasetUtil.UA;
import static software.aws.solution.clickstream.DatasetUtil.UA_BROWSER;
import static software.aws.solution.clickstream.DatasetUtil.UA_BROWSER_VERSION;
import static software.aws.solution.clickstream.DatasetUtil.UA_DEVICE;
import static software.aws.solution.clickstream.DatasetUtil.UA_DEVICE_CATEGORY;
import static software.aws.solution.clickstream.DatasetUtil.UA_OS;
import static software.aws.solution.clickstream.DatasetUtil.UA_OS_VERSION;
import static software.aws.solution.clickstream.DatasetUtil.USER;
import static software.aws.solution.clickstream.DatasetUtil.USER_FIRST_TOUCH_TIMESTAMP;
import static software.aws.solution.clickstream.DatasetUtil.USER_ID;
import static software.aws.solution.clickstream.DatasetUtil.USER_LTV;
import static software.aws.solution.clickstream.DatasetUtil.USER_PROPERTIES;
import static software.aws.solution.clickstream.DatasetUtil.USER_PSEUDO_ID;
import static software.aws.solution.clickstream.DatasetUtil.VALUE;
import static software.aws.solution.clickstream.DatasetUtil.addSchemaToMap;
import static software.aws.solution.clickstream.DatasetUtil.getAggItemDataset;
import static software.aws.solution.clickstream.DatasetUtil.loadFullItemDataset;
import static software.aws.solution.clickstream.DatasetUtil.loadFullUserDataset;
import static software.aws.solution.clickstream.DatasetUtil.loadFullUserRefererDataset;
import static software.aws.solution.clickstream.DatasetUtil.readDatasetFromPath;
import static software.aws.solution.clickstream.DatasetUtil.saveFullDatasetToPath;
import static software.aws.solution.clickstream.DatasetUtil.saveIncrementalDatasetToPath;
import static software.aws.solution.clickstream.ETLRunner.DEBUG_LOCAL_PATH;
import static software.aws.solution.clickstream.ETLRunner.EVENT_DATE;


@Slf4j
public class GTMServerDataTransformer {
    private static final String TABLE_VERSION_SUFFIX = "_v1";
    ServerDataConverter serverDataConverter = new ServerDataConverter();

    private static Dataset<Row> getAggVisitDataset(final Dataset<Row> newVisitDataset) {
        return newVisitDataset.groupBy(APP_ID, USER_PSEUDO_ID).min(EVENT_TIMESTAMP)
                .select(col(APP_ID), col(USER_PSEUDO_ID), col(String.format("min(%s)", EVENT_TIMESTAMP)).alias(EVENT_TIMESTAMP));
    }

    private static Dataset<Row> getUserReferrerDataset(final Dataset<Row> dataset2) {
        String tableName = TABLE_NAME_ETL_GTM_USER_REFERRER;

        Column dataCol = dataset2.col(DATA_OUT);
        Dataset<Row> newPageReferrerDataset = dataset2.withColumn(
                COL_PAGE_REFERER, dataCol.getField(PAGE_REFERRER)
        ).select(
                APP_ID, EVENT_TIMESTAMP, USER_PSEUDO_ID, COL_PAGE_REFERER
        ).filter(col(COL_PAGE_REFERER).isNotNull());

        DatasetUtil.PathInfo pathInfo = addSchemaToMap(newPageReferrerDataset, tableName, TABLE_VERSION_SUFFIX);

        return loadFullUserRefererDataset(newPageReferrerDataset, pathInfo);
    }

    private static Dataset<Row> extractEvent(final Dataset<Row> dataset1) {
        String projectId = System.getProperty(PROJECT_ID_PROP);

        Column dataCol = dataset1.col(DATA_OUT);
        Dataset<Row> dataset2 = dataset1
                .withColumn("event_previous_timestamp", lit(null).cast(DataTypes.LongType))
                .withColumn(EVENT_NAME, dataCol.getField(EVENT_NAME))
                .withColumn("event_value_in_usd", lit(null).cast(DataTypes.FloatType))
                .withColumn("event_bundle_sequence_id", lit(null).cast(DataTypes.LongType))
                .withColumn(INGEST_TIMESTAMP, col("ingest_time"))
                .withColumn("device", struct(
                        lit(null).cast(DataTypes.StringType).alias("mobile_brand_name"),
                        lit(null).cast(DataTypes.StringType).alias("mobile_model_name"),
                        lit(null).cast(DataTypes.StringType).alias("manufacturer"),
                        dataCol.getField(SCREEN_WIDTH).cast(DataTypes.LongType).alias("screen_width"),
                        dataCol.getField(SCREEN_HEIGHT).cast(DataTypes.LongType).alias("screen_height"),
                        lit(null).cast(DataTypes.StringType).alias("carrier"),
                        lit(null).cast(DataTypes.StringType).alias("network_type"),
                        dataCol.getField(CLIENT_PLATFORM_VERSION).cast(DataTypes.StringType).alias("operating_system_version"),
                        dataCol.getField(CLIENT_PLATFORM).cast(DataTypes.StringType).alias("operating_system"),

                        // placeholder for ua enrich fields
                        lit(null).cast(DataTypes.StringType).alias(UA_BROWSER),
                        lit(null).cast(DataTypes.StringType).alias(UA_BROWSER_VERSION),
                        lit(null).cast(DataTypes.StringType).alias(UA_OS),
                        lit(null).cast(DataTypes.StringType).alias(UA_OS_VERSION),
                        lit(null).cast(DataTypes.StringType).alias(UA_DEVICE),
                        lit(null).cast(DataTypes.StringType).alias(UA_DEVICE_CATEGORY),

                        dataCol.getField(LANGUAGE).cast(DataTypes.StringType).alias("system_language"),
                        lit(null).cast(DataTypes.LongType).alias("time_zone_offset_seconds"),
                        dataCol.getField(CLIENT_ID).cast(DataTypes.StringType).alias("vendor_id"),

                        lit(null).cast(DataTypes.StringType).alias("advertising_id"),
                        lit(null).cast(DataTypes.StringType).alias("host_name"),
                        lit(null).cast(DataTypes.LongType).alias("viewport_width"),
                        lit(null).cast(DataTypes.LongType).alias("viewport_height")
                ))
                .withColumn("geo", struct(
                        lit(null).cast(DataTypes.StringType).alias("country"),
                        lit(null).cast(DataTypes.StringType).alias("continent"),
                        lit(null).cast(DataTypes.StringType).alias("sub_continent"),
                        lit(null).cast(DataTypes.StringType).alias(LOCALE),
                        lit(null).cast(DataTypes.StringType).alias("region"),
                        lit(null).cast(DataTypes.StringType).alias("metro"),
                        lit(null).cast(DataTypes.StringType).alias("city")))

                .withColumn("traffic_source", struct(
                        lit(null).cast(DataTypes.StringType).alias("medium"),
                        lit(null).cast(DataTypes.StringType).alias("name"),
                        lit(null).cast(DataTypes.StringType).alias("source")
                ))
                .withColumn("app_info", struct(
                        col("appId").alias(APP_ID),
                        dataCol.getField(GTM_ID).alias(ID),
                        lit(null).cast(DataTypes.StringType).alias("install_source"),
                        dataCol.getField(GTM_VERSION).alias("version"),
                        lit(null).cast(DataTypes.StringType).alias("sdk_version"),
                        lit("GTM").alias("sdk_name"))
                )
                .withColumn("platform", dataCol.getField(CLIENT_PLATFORM))
                .withColumn("project_id", lit(projectId))
                .withColumn(ITEMS, dataCol.getField(EVENT_ITEMS))

                // enrichment fields
                .withColumn(UA, dataCol.getField(UA))
                .withColumn(GEO_FOR_ENRICH, struct(
                        dataCol.getField(IP).alias(IP),
                        lit(null).cast(DataTypes.StringType).alias(LOCALE)));

        Dataset<Row> eventDataset = dataset2.select(
                EVENT_ID,
                EVENT_DATE,
                EVENT_TIMESTAMP,
                "event_previous_timestamp",
                EVENT_NAME,
                "event_value_in_usd",
                "event_bundle_sequence_id",
                INGEST_TIMESTAMP,
                "device",
                "geo",
                "traffic_source",
                APP_INFO,
                PLATFORM,
                "project_id",
                ITEMS,
                USER_PSEUDO_ID,
                USER_ID,
                UA,
                GEO_FOR_ENRICH
        );

        boolean debugLocal = Boolean.parseBoolean(System.getProperty(DEBUG_LOCAL_PROP));
        if (debugLocal) {
            eventDataset.write().mode(SaveMode.Overwrite).json(DEBUG_LOCAL_PATH + "/GTMSever-eventDataset/");
        }
        return eventDataset;
    }

    private static void mergeIncrementalTables(final SparkSession sparkSession) {
        log.info("start merging incremental tables");
        int userKeepDays = ContextUtil.getUserKeepDays();
        int itemKeepDays = ContextUtil.getItemKeepDays();

        List<DatasetUtil.TableInfo> l = new ArrayList<>();

        l.add(new DatasetUtil.TableInfo(
                TABLE_NAME_ETL_GTM_USER_REFERRER, TABLE_VERSION_SUFFIX, userKeepDays
        ));

        l.add(new DatasetUtil.TableInfo(
                TABLE_NAME_ETL_GTM_USER_VISIT, TABLE_VERSION_SUFFIX, userKeepDays
        ));
        l.add(new DatasetUtil.TableInfo(
                ETLRunner.TableName.USER.getTableName(), TABLE_VERSION_SUFFIX, userKeepDays
        ));
        l.add(new DatasetUtil.TableInfo(
                ETLRunner.TableName.ITEM.getTableName(), TABLE_VERSION_SUFFIX, itemKeepDays
        ));

        DatasetUtil.mergeIncrementalTables(sparkSession, l);
    }

    public List<Dataset<Row>> transform(final Dataset<Row> dataset) {
        Dataset<Row> dataset0 = serverDataConverter.transform(dataset);
        Column dataCol = dataset0.col(DATA_OUT);

        Dataset<Row> dataset1 = dataset0
                .withColumn(APP_ID, col("appId"))
                .withColumn(EVENT_ID,
                        concat_ws("-", col("rid"), dataCol.getField(EVENT_ID)))
                .withColumn(EVENT_TIMESTAMP, coalesce(
                        dataCol.getItem(REQUEST_START_TIME_MS),
                        col("ingest_time")))
                .withColumn(EVENT_DATE,
                        to_date(timestamp_seconds(col(EVENT_TIMESTAMP).$div(1000)))
                )
                .withColumn(USER_PSEUDO_ID, dataCol.getField(CLIENT_ID))
                .withColumn(USER_ID, dataCol.getField(USER_ID))
                .withColumn(EVENT_NAME, dataCol.getField(EVENT_NAME));

        Dataset<Row> eventDataset = extractEvent(dataset1);
        log.info(new ETLMetric(eventDataset, "eventDataset").toString());

        Dataset<Row> eventParameterDataset = extractEventParameter(dataset1);
        log.info(new ETLMetric(eventParameterDataset, "eventParameterDataset").toString());

        Optional<Dataset<Row>> itemDataset = extractItem(dataset1);
        itemDataset.ifPresent(rowDataset -> log.info(new ETLMetric(rowDataset, "itemDataset").toString()));

        Optional<Dataset<Row>> userDataset = extractUser(dataset1);
        userDataset.ifPresent(rowDataset -> log.info(new ETLMetric(rowDataset, "userDataset").toString()));

        return Arrays.asList(
                eventDataset,
                eventParameterDataset,
                itemDataset.orElse(null),
                userDataset.orElse(null)
        );
    }

    private Optional<Dataset<Row>> extractUser(final Dataset<Row> dataset2) {
        Column dataCol = dataset2.col(DATA_OUT);
        ArrayType deviceIdListType = DataTypes.createArrayType(DataTypes.StringType);
        StructType userLtvType = DataTypes.createStructType(new StructField[]{
                        DataTypes.createStructField("revenue", DataTypes.DoubleType, true),
                        DataTypes.createStructField("currency", DataTypes.StringType, true)
                }
        );

        Dataset<Row> userReferrerDataset = getUserReferrerDataset(dataset2);
        Dataset<Row> userFirstVisitDataset = getUserFirstVisitDataset(dataset2)
                .withColumnRenamed(EVENT_TIMESTAMP, USER_FIRST_TOUCH_TIMESTAMP)
                .withColumn(FIRST_VISIT_DATE, to_date(timestamp_seconds(col(USER_FIRST_TOUCH_TIMESTAMP).$div(1000))));

        Dataset<Row> newUserDataset = dataset2
                .withColumn(USER_PROPERTIES, dataCol.getField(USER).getField(USER_PROPERTIES))
                .select(
                        col(APP_ID),
                        col(EVENT_DATE),
                        col(EVENT_TIMESTAMP),
                        col(USER_ID),
                        col(USER_PSEUDO_ID),
                        col(USER_PROPERTIES)
                ).distinct();

        long  newUserDatasetCount =  newUserDataset.count();
        log.info("newUserDataset count:" + newUserDatasetCount);

        Dataset<Row> newProfileSetUserDataset = newUserDataset.filter(col(USER_PROPERTIES).isNotNull());
        log.info("newProfileSetUserDataset count:" + newProfileSetUserDataset.count());

        String tableName = ETLRunner.TableName.USER.getTableName();
        DatasetUtil.PathInfo pathInfo = addSchemaToMap(newProfileSetUserDataset, tableName, TABLE_VERSION_SUFFIX);

        if (newUserDatasetCount== 0) {
            return Optional.empty();
        }

        Dataset<Row> fullAggUserDataset = loadFullUserDataset(newProfileSetUserDataset, pathInfo);

        Column userPseudoIdCol = newUserDataset.col(USER_PSEUDO_ID);
        Column appIdCol = newUserDataset.col(APP_ID);

        Column userIdJoinForNewUserId = userPseudoIdCol.equalTo(fullAggUserDataset.col(USER_PSEUDO_ID)).and(appIdCol.equalTo(fullAggUserDataset.col(APP_ID)));
        Column userIdJoinForPageReferrer = userPseudoIdCol.equalTo(userReferrerDataset.col(USER_PSEUDO_ID)).and(appIdCol.equalTo(userReferrerDataset.col(APP_ID)));
        Column userIdJoinForFirstVisit = userPseudoIdCol.equalTo(userFirstVisitDataset.col(USER_PSEUDO_ID)).and(appIdCol.equalTo(userFirstVisitDataset.col(APP_ID)));

        Dataset<Row> userJoinDataset = newUserDataset
                .join(fullAggUserDataset, userIdJoinForNewUserId, "left")
                .join(userReferrerDataset, userIdJoinForPageReferrer, "left")
                .join(userFirstVisitDataset, userIdJoinForFirstVisit, "left");

        Dataset<Row> finalUserDataset = userJoinDataset.select(
                appIdCol,
                coalesce(fullAggUserDataset.col(EVENT_DATE), newUserDataset.col(EVENT_DATE)).alias(EVENT_DATE),
                coalesce(fullAggUserDataset.col(EVENT_TIMESTAMP), newUserDataset.col(EVENT_TIMESTAMP)).alias(EVENT_TIMESTAMP),
                coalesce(fullAggUserDataset.col(USER_ID), newUserDataset.col(USER_ID)).alias(USER_ID),
                userPseudoIdCol,
                userFirstVisitDataset.col(USER_FIRST_TOUCH_TIMESTAMP).alias(USER_FIRST_TOUCH_TIMESTAMP),
                fullAggUserDataset.col(USER_PROPERTIES).alias(USER_PROPERTIES),
                lit(null).cast(userLtvType).alias(USER_LTV),
                userFirstVisitDataset.col(FIRST_VISIT_DATE).alias(FIRST_VISIT_DATE),
                substring(userReferrerDataset.col(COL_PAGE_REFERER), 0, MAX_STRING_VALUE_LEN).alias(FIRST_REFERER),
                lit(null).cast(DataTypes.StringType).alias(FIRST_TRAFFIC_SOURCE_TYPE),
                lit(null).cast(DataTypes.StringType).alias(FIRST_TRAFFIC_MEDIUM),
                lit(null).cast(DataTypes.StringType).alias(FIRST_TRAFFIC_SOURCE),
                lit(null).cast(deviceIdListType).alias(DEVICE_ID_LIST),
                lit(null).cast(DataTypes.StringType).alias(CHANNEL)
        ).distinct();

        boolean debugLocal = Boolean.parseBoolean(System.getProperty(DEBUG_LOCAL_PROP));
        if (debugLocal) {
            finalUserDataset.write().mode(SaveMode.Overwrite).json(DEBUG_LOCAL_PATH + "/GTMSever-userDataset/");
        }
        return Optional.of(finalUserDataset);
    }

    private Dataset<Row> getUserFirstVisitDataset(final Dataset<Row> dataset2) {
        String tableName = TABLE_NAME_ETL_GTM_USER_VISIT;

        SparkSession spark = dataset2.sparkSession();
        Dataset<Row> newVisitDataset = dataset2.select(
                APP_ID, USER_PSEUDO_ID, EVENT_TIMESTAMP
        );
        DatasetUtil.PathInfo pathInfo = addSchemaToMap(newVisitDataset, tableName, TABLE_VERSION_SUFFIX);

        Dataset<Row> newAggVisitDataset = getAggVisitDataset(newVisitDataset);
        log.info("newAggVisitDataset count:" + newAggVisitDataset.count());
        String path = saveIncrementalDatasetToPath(pathInfo.getIncremental(), newAggVisitDataset);
        Dataset<Row> allUserVisitDataset = readDatasetFromPath(spark, path, ContextUtil.getUserKeepDays());
        log.info("allUserVisitDataset count:" + allUserVisitDataset.count());
        Dataset<Row> allAggVisitDataset = getAggVisitDataset(allUserVisitDataset);
        log.info("allAggVisitDataset count:" + allAggVisitDataset.count());
        saveFullDatasetToPath(pathInfo.getFull(), allAggVisitDataset);
        return allAggVisitDataset;
    }

    private Dataset<Row> extractEventParameter(final Dataset<Row> dataset2) {
        Column dataCol = dataset2.col(DATA_OUT);
        Dataset<Row> eventParamsDataset = dataset2
                .withColumn(EVENT_NAME, dataCol.getField(EVENT_NAME))
                .withColumn(EVENT_PARAM, explode(dataCol.getField(EVENT_PARAMS)))
                .withColumn(EVENT_PARAM_KEY, col(EVENT_PARAM).getField(KEY))
                .withColumn(EVENT_PARAM_DOUBLE_VALUE, col(EVENT_PARAM).getField(VALUE).getField(DOUBLE_VALUE))
                .withColumn(EVENT_PARAM_FLOAT_VALUE, col(EVENT_PARAM).getField(VALUE).getField(FLOAT_VALUE))
                .withColumn(EVENT_PARAM_INT_VALUE, col(EVENT_PARAM).getField(VALUE).getField(INT_VALUE))
                .withColumn(EVENT_PARAM_STRING_VALUE, col(EVENT_PARAM).getField(VALUE).getField(STRING_VALUE))
                .select(
                        col(APP_ID),
                        col(EVENT_DATE),
                        col(EVENT_TIMESTAMP),
                        col(EVENT_ID),
                        col(EVENT_NAME),
                        col(EVENT_PARAM_KEY),
                        col(EVENT_PARAM_DOUBLE_VALUE),
                        col(EVENT_PARAM_FLOAT_VALUE),
                        col(EVENT_PARAM_INT_VALUE),
                        substring(col(EVENT_PARAM_STRING_VALUE), 0, MAX_PARAM_STRING_VALUE_LEN).alias(EVENT_PARAM_STRING_VALUE)
                );

        boolean debugLocal = Boolean.parseBoolean(System.getProperty(DEBUG_LOCAL_PROP));
        if (debugLocal) {
            eventParamsDataset.write().mode(SaveMode.Overwrite).json(DEBUG_LOCAL_PATH + "/GTMSever-eventParameters/");
        }
        return eventParamsDataset;

    }

    private Optional<Dataset<Row>> extractItem(final Dataset<Row> dataset1) {
        Column dataCol = dataset1.col(DATA_OUT);
        Dataset<Row> newItemDataset = dataset1
                .withColumn(ITEMS, dataCol.getField(ITEMS))
                .select(APP_ID,
                        EVENT_DATE,
                        EVENT_TIMESTAMP,
                        ITEMS)
                .withColumn(ITEM, explode(col(ITEMS)))
                .drop(ITEMS)
                .withColumn(ID, col(ITEM).getField(ID))
                .withColumn(PROPERTIES, col(ITEM).getField(PROPERTIES))
                .select(
                        APP_ID,
                        EVENT_DATE,
                        EVENT_TIMESTAMP,
                        ID,
                        PROPERTIES
                )
                .filter(col(ID).isNotNull())
                .distinct();

        String tableName = ETLRunner.TableName.ITEM.getTableName();
        DatasetUtil.PathInfo pathInfo = addSchemaToMap(newItemDataset, tableName, TABLE_VERSION_SUFFIX);
        log.info("newItemsDataset count:" + newItemDataset.count());

        if (newItemDataset.count() == 0) {
            return Optional.empty();
        }

        loadFullItemDataset(newItemDataset, pathInfo);

        Dataset<Row> newAggeItemsDataset = getAggItemDataset(newItemDataset);
        boolean debugLocal = Boolean.parseBoolean(System.getProperty(DEBUG_LOCAL_PROP));
        if (debugLocal) {
            newAggeItemsDataset.write().mode(SaveMode.Overwrite).json(DEBUG_LOCAL_PATH + "/GTMSever-newAggeItemsDataset/");
        }
        return Optional.of(newAggeItemsDataset);
    }

    public Dataset<Row> postTransform(final Dataset<Row> dataset) {
        SparkSession sparkSession = dataset.sparkSession();
        mergeIncrementalTables(sparkSession);
        return dataset.drop("ua", GEO_FOR_ENRICH);
    }

}
