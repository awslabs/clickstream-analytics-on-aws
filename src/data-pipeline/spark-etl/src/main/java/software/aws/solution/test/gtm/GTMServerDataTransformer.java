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

package software.aws.solution.test.gtm;

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
import software.aws.solution.test.transformer.MaxLengthTransformer;
import software.aws.solution.test.util.ContextUtil;
import software.aws.solution.test.util.DatasetUtil;
import software.aws.solution.test.util.ETLMetric;
import software.aws.solution.test.util.TableName;

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
import static org.apache.spark.sql.functions.timestamp_seconds;
import static org.apache.spark.sql.functions.to_date;
import static software.aws.solution.test.ETLRunner.DEBUG_LOCAL_PATH;
import static software.aws.solution.test.ETLRunner.EVENT_DATE;

@Slf4j
public class GTMServerDataTransformer {
    public static final String MAX_SN = "max_sn";
    public static final String GTM_PREVIOUS_SESSION_KEEP_DAYS = "gtm.previous.session.keep.days";

    ServerDataConverter serverDataConverter = new ServerDataConverter();

    private static Dataset<Row> getAggVisitDataset(final Dataset<Row> newVisitDataset) {
        return newVisitDataset.groupBy(DatasetUtil.APP_ID, DatasetUtil.USER_PSEUDO_ID).min(DatasetUtil.EVENT_TIMESTAMP)
                .select(col(DatasetUtil.APP_ID), col(DatasetUtil.USER_PSEUDO_ID), col(String.format("min(%s)", DatasetUtil.EVENT_TIMESTAMP)).alias(DatasetUtil.EVENT_TIMESTAMP));
    }

    private static Dataset<Row> getUserReferrerDataset(final Dataset<Row> dataset2) {
        String tableName = DatasetUtil.TABLE_NAME_ETL_GTM_USER_REFERRER;

        Column dataCol = dataset2.col(DatasetUtil.DATA_OUT);
        Dataset<Row> newPageReferrerDataset = dataset2.withColumn(
                DatasetUtil.COL_PAGE_REFERER, dataCol.getField(DatasetUtil.PAGE_REFERRER)
        ).select(
                DatasetUtil.APP_ID, DatasetUtil.EVENT_TIMESTAMP, DatasetUtil.USER_PSEUDO_ID, DatasetUtil.COL_PAGE_REFERER
        ).filter(col(DatasetUtil.COL_PAGE_REFERER).isNotNull());

        DatasetUtil.PathInfo pathInfo = DatasetUtil.addSchemaToMap(newPageReferrerDataset, tableName, DatasetUtil.TABLE_VERSION_SUFFIX_V1);

        return DatasetUtil.loadFullUserRefererDataset(newPageReferrerDataset, pathInfo);
    }

    private static Dataset<Row> extractEvent(final Dataset<Row> dataset1) {
        String projectId = System.getProperty(ContextUtil.PROJECT_ID_PROP);

        Column dataCol = dataset1.col(DatasetUtil.DATA_OUT);
        Dataset<Row> dataset2 = dataset1
                .withColumn(DatasetUtil.EVENT_PREVIOUS_TIMESTAMP, lit(null).cast(DataTypes.LongType))
                .withColumn(DatasetUtil.EVENT_NAME, dataCol.getField(DatasetUtil.EVENT_NAME))
                .withColumn(DatasetUtil.EVENT_VALUE_IN_USD, lit(null).cast(DataTypes.FloatType))
                .withColumn(DatasetUtil.EVENT_BUNDLE_SEQUENCE_ID, lit(null).cast(DataTypes.LongType))
                .withColumn(DatasetUtil.INGEST_TIMESTAMP, col("ingest_time"))
                .withColumn(DatasetUtil.DEVICE, struct(
                        dataCol.getField(DatasetUtil.GTM_CLIENT_BRAND).cast(DataTypes.StringType).alias("mobile_brand_name"),
                        lit(null).cast(DataTypes.StringType).alias("mobile_model_name"),
                        lit(null).cast(DataTypes.StringType).alias("manufacturer"),
                        dataCol.getField(DatasetUtil.GTM_SCREEN_WIDTH).cast(DataTypes.LongType).alias("screen_width"),
                        dataCol.getField(DatasetUtil.GTM_SCREEN_HEIGHT).cast(DataTypes.LongType).alias("screen_height"),
                        lit(null).cast(DataTypes.StringType).alias("carrier"),
                        lit(null).cast(DataTypes.StringType).alias("network_type"),
                        dataCol.getField(DatasetUtil.GTM_CLIENT_PLATFORM_VERSION).cast(DataTypes.StringType).alias("operating_system_version"),
                        dataCol.getField(DatasetUtil.GTM_CLIENT_PLATFORM).cast(DataTypes.StringType).alias("operating_system"),

                        // placeholder for ua enrich fields
                        lit(null).cast(DataTypes.StringType).alias(DatasetUtil.UA_BROWSER),
                        lit(null).cast(DataTypes.StringType).alias(DatasetUtil.UA_BROWSER_VERSION),
                        lit(null).cast(DataTypes.StringType).alias(DatasetUtil.UA_OS),
                        lit(null).cast(DataTypes.StringType).alias(DatasetUtil.UA_OS_VERSION),
                        lit(null).cast(DataTypes.StringType).alias(DatasetUtil.UA_DEVICE),
                        lit(null).cast(DataTypes.StringType).alias(DatasetUtil.UA_DEVICE_CATEGORY),

                        dataCol.getField(DatasetUtil.GTM_LANGUAGE).cast(DataTypes.StringType).alias("system_language"),
                        lit(null).cast(DataTypes.LongType).alias("time_zone_offset_seconds"),
                        dataCol.getField(DatasetUtil.CLIENT_ID).cast(DataTypes.StringType).alias("vendor_id"),

                        lit(null).cast(DataTypes.StringType).alias("advertising_id"),
                        lit(null).cast(DataTypes.StringType).alias("host_name"),
                        lit(null).cast(DataTypes.LongType).alias("viewport_width"),
                        lit(null).cast(DataTypes.LongType).alias("viewport_height")
                ))
                .withColumn(DatasetUtil.GEO, struct(
                        lit(null).cast(DataTypes.StringType).alias("country"),
                        lit(null).cast(DataTypes.StringType).alias("continent"),
                        lit(null).cast(DataTypes.StringType).alias("sub_continent"),
                        lit(null).cast(DataTypes.StringType).alias(DatasetUtil.LOCALE),
                        lit(null).cast(DataTypes.StringType).alias("region"),
                        lit(null).cast(DataTypes.StringType).alias("metro"),
                        lit(null).cast(DataTypes.StringType).alias("city")))

                .withColumn(DatasetUtil.TRAFFIC_SOURCE, struct(
                        lit(null).cast(DataTypes.StringType).alias("medium"),
                        lit(null).cast(DataTypes.StringType).alias("name"),
                        lit(null).cast(DataTypes.StringType).alias("source")
                ))
                .withColumn(DatasetUtil.APP_INF, struct(
                        col(DatasetUtil.APP_ID),
                        dataCol.getField(DatasetUtil.GTM_ID).alias(DatasetUtil.ID),
                        lit(null).cast(DataTypes.StringType).alias("install_source"),
                        dataCol.getField(DatasetUtil.GTM_VERSION).alias("version"),
                        lit(null).cast(DataTypes.StringType).alias("sdk_version"),
                        lit("GTM").alias("sdk_name"))
                )
                .withColumn(DatasetUtil.PLATFORM, dataCol.getField(DatasetUtil.GTM_CLIENT_PLATFORM))
                .withColumn(DatasetUtil.PROJECT_ID, lit(projectId))
                .withColumn(DatasetUtil.ITEMS, dataCol.getField(DatasetUtil.EVENT_ITEMS))
                // enrichment fields
                .withColumn(DatasetUtil.UA, dataCol.getField(DatasetUtil.UA))
                .withColumn(DatasetUtil.GEO_FOR_ENRICH, struct(
                        dataCol.getField(DatasetUtil.IP).alias(DatasetUtil.IP),
                        lit(null).cast(DataTypes.StringType).alias(DatasetUtil.LOCALE)))

                // session id
                .withColumn(DatasetUtil.GTM_SESSION_NUM, dataCol.getField(DatasetUtil.GTM_SESSION_NUM));

        Column[] selectCols = new Column[]{
                col(DatasetUtil.EVENT_ID),
                col(EVENT_DATE),
                col(DatasetUtil.EVENT_TIMESTAMP),
                col(DatasetUtil.EVENT_PREVIOUS_TIMESTAMP),
                col(DatasetUtil.EVENT_NAME),
                col(DatasetUtil.EVENT_VALUE_IN_USD),
                col(DatasetUtil.EVENT_BUNDLE_SEQUENCE_ID),
                col(DatasetUtil.INGEST_TIMESTAMP),
                col(DatasetUtil.DEVICE),
                col(DatasetUtil.GEO),
                col(DatasetUtil.TRAFFIC_SOURCE),
                col(DatasetUtil.APP_INFO),
                col(DatasetUtil.PLATFORM),
                col(DatasetUtil.PROJECT_ID),
                col(DatasetUtil.ITEMS),
                col(DatasetUtil.USER_PSEUDO_ID),
                col(DatasetUtil.USER_ID),
                col(DatasetUtil.UA),
                col(DatasetUtil.GEO_FOR_ENRICH)
        };
        Dataset<Row> eventDataset = dataset2.select(selectCols);
        log.info("eventDataset count:" + eventDataset.count());

        boolean debugLocal = Boolean.parseBoolean(System.getProperty(ContextUtil.DEBUG_LOCAL_PROP));
        if (debugLocal) {
            eventDataset.write().mode(SaveMode.Overwrite).json(DEBUG_LOCAL_PATH + "/GTMSever-eventDataset/");
        }
        Dataset<Row> datasetFinal = MaxLengthTransformer.runMaxLengthTransformerForEvent(eventDataset);

        return datasetFinal.select(selectCols);
    }

    private static void mergeIncrementalTables(final SparkSession sparkSession) {
        log.info("start merging incremental tables");
        int userKeepDays = ContextUtil.getUserKeepDays();
        int itemKeepDays = ContextUtil.getItemKeepDays();

        List<DatasetUtil.TableInfo> l = new ArrayList<>();

        l.add(new DatasetUtil.TableInfo(
                DatasetUtil.TABLE_NAME_ETL_GTM_USER_REFERRER, DatasetUtil.TABLE_VERSION_SUFFIX_V1, userKeepDays
        ));

        l.add(new DatasetUtil.TableInfo(
                DatasetUtil.TABLE_NAME_ETL_GTM_USER_VISIT, DatasetUtil.TABLE_VERSION_SUFFIX_V1, userKeepDays
        ));
        l.add(new DatasetUtil.TableInfo(
                TableName.USER.getTableName(), DatasetUtil.TABLE_VERSION_SUFFIX_V1, userKeepDays
        ));
        l.add(new DatasetUtil.TableInfo(
                TableName.ITEM.getTableName(), DatasetUtil.TABLE_VERSION_SUFFIX_V1, itemKeepDays
        ));

        DatasetUtil.mergeIncrementalTables(sparkSession, l);
    }

    private static Dataset<Row> getUserFirstVisitDataset(final Dataset<Row> dataset2) {
        String tableName = DatasetUtil.TABLE_NAME_ETL_GTM_USER_VISIT;

        SparkSession spark = dataset2.sparkSession();
        Dataset<Row> newVisitDataset = dataset2.select(
                DatasetUtil.APP_ID, DatasetUtil.USER_PSEUDO_ID, DatasetUtil.EVENT_TIMESTAMP
        );
        DatasetUtil.PathInfo pathInfo = DatasetUtil.addSchemaToMap(newVisitDataset, tableName, DatasetUtil.TABLE_VERSION_SUFFIX_V1);

        Dataset<Row> newAggVisitDataset = getAggVisitDataset(newVisitDataset);
        log.info("newAggVisitDataset count:" + newAggVisitDataset.count());
        String path = DatasetUtil.saveIncrementalDatasetToPath(pathInfo.getIncremental(), newAggVisitDataset);
        Dataset<Row> allUserVisitDataset = DatasetUtil.readDatasetFromPath(spark, path, ContextUtil.getUserKeepDays());
        log.info("allUserVisitDataset count:" + allUserVisitDataset.count());
        Dataset<Row> allAggVisitDataset = getAggVisitDataset(allUserVisitDataset);
        allAggVisitDataset.cache();
        log.info("allAggVisitDataset count:" + allAggVisitDataset.count());
        DatasetUtil.saveFullDatasetToPath(pathInfo.getFull(), allAggVisitDataset);
        return allAggVisitDataset;
    }

    public List<Dataset<Row>> transform(final Dataset<Row> dataset) {
        Dataset<Row> dataset0 = serverDataConverter.transform(dataset);
        Column dataCol = dataset0.col(DatasetUtil.DATA_OUT);

        Dataset<Row> dataset1 = dataset0
                .withColumn(DatasetUtil.APP_ID, col("appId"))
                .withColumn(DatasetUtil.EVENT_ID,
                        concat_ws("-", col("rid"), dataCol.getField(DatasetUtil.EVENT_ID)))
                .withColumn(DatasetUtil.EVENT_TIMESTAMP, coalesce(
                        dataCol.getItem(DatasetUtil.GTM_REQUEST_START_TIME_MS),
                        col("ingest_time")))
                .withColumn(EVENT_DATE,
                        to_date(timestamp_seconds(col(DatasetUtil.EVENT_TIMESTAMP).$div(1000)))
                )
                .withColumn(DatasetUtil.USER_PSEUDO_ID, dataCol.getField(DatasetUtil.CLIENT_ID))
                .withColumn(DatasetUtil.USER_ID, dataCol.getField(DatasetUtil.USER_ID))
                .withColumn(DatasetUtil.EVENT_NAME, dataCol.getField(DatasetUtil.EVENT_NAME));

        Dataset<Row> userFirstVisitDataset = getUserFirstVisitDataset(dataset1);

        Dataset<Row> eventDataset = extractEvent(dataset1);
        log.info(new ETLMetric(eventDataset, "eventDataset").toString());

        Dataset<Row> eventParameterDataset = extractEventParameter(dataset1);
        log.info(new ETLMetric(eventParameterDataset, "eventParameterDataset").toString());

        Optional<Dataset<Row>> itemDataset = extractItem(dataset1);
        itemDataset.ifPresent(rowDataset -> log.info(new ETLMetric(rowDataset, "itemDataset").toString()));

        Optional<Dataset<Row>> userDataset = extractUser(dataset1, userFirstVisitDataset);
        userDataset.ifPresent(rowDataset -> log.info(new ETLMetric(rowDataset, "userDataset").toString()));

        return Arrays.asList(
                eventDataset,
                eventParameterDataset,
                itemDataset.orElse(null),
                userDataset.orElse(null)
        );
    }

    private Optional<Dataset<Row>> extractUser(final Dataset<Row> dataset2, final Dataset<Row> userFirstVisitDatasetInput) {
        Column dataCol = dataset2.col(DatasetUtil.DATA_OUT);
        ArrayType deviceIdListType = DataTypes.createArrayType(DataTypes.StringType);
        StructType userLtvType = DataTypes.createStructType(new StructField[]{
                        DataTypes.createStructField("revenue", DataTypes.DoubleType, true),
                        DataTypes.createStructField("currency", DataTypes.StringType, true)
                }
        );

        Dataset<Row> userReferrerDataset = getUserReferrerDataset(dataset2);
        Dataset<Row> userFirstVisitDataset = userFirstVisitDatasetInput
                .withColumnRenamed(DatasetUtil.EVENT_TIMESTAMP, DatasetUtil.USER_FIRST_TOUCH_TIMESTAMP)
                .withColumn(DatasetUtil.FIRST_VISIT_DATE, to_date(timestamp_seconds(col(DatasetUtil.USER_FIRST_TOUCH_TIMESTAMP).$div(1000))));

        Dataset<Row> newUserDataset = dataset2
                .withColumn(DatasetUtil.USER_PROPERTIES, dataCol.getField(DatasetUtil.USER).getField(DatasetUtil.USER_PROPERTIES))
                .select(
                        col(DatasetUtil.APP_ID),
                        col(EVENT_DATE),
                        col(DatasetUtil.EVENT_TIMESTAMP),
                        col(DatasetUtil.USER_ID),
                        col(DatasetUtil.USER_PSEUDO_ID),
                        col(DatasetUtil.USER_PROPERTIES)
                ).distinct();

        long newUserDatasetCount = newUserDataset.count();
        log.info("newUserDataset count:" + newUserDatasetCount);

        Dataset<Row> newProfileSetUserDataset = newUserDataset.filter(col(DatasetUtil.USER_PROPERTIES).isNotNull());
        log.info("newProfileSetUserDataset count:" + newProfileSetUserDataset.count());

        String tableName = TableName.USER.getTableName();
        DatasetUtil.PathInfo pathInfo = DatasetUtil.addSchemaToMap(newProfileSetUserDataset, tableName, DatasetUtil.TABLE_VERSION_SUFFIX_V1);

        if (newUserDatasetCount == 0) {
            return Optional.empty();
        }

        Dataset<Row> fullAggUserDataset = DatasetUtil.loadFullUserDataset(newProfileSetUserDataset, pathInfo);

        Column userPseudoIdCol = newUserDataset.col(DatasetUtil.USER_PSEUDO_ID);
        Column appIdCol = newUserDataset.col(DatasetUtil.APP_ID);

        Column userIdJoinForNewUserId = userPseudoIdCol.equalTo(fullAggUserDataset.col(DatasetUtil.USER_PSEUDO_ID)).and(appIdCol.equalTo(fullAggUserDataset.col(DatasetUtil.APP_ID)));
        Column userIdJoinForPageReferrer = userPseudoIdCol.equalTo(userReferrerDataset.col(DatasetUtil.USER_PSEUDO_ID)).and(appIdCol.equalTo(userReferrerDataset.col(DatasetUtil.APP_ID)));
        Column userIdJoinForFirstVisit = userPseudoIdCol.equalTo(userFirstVisitDataset.col(DatasetUtil.USER_PSEUDO_ID)).and(appIdCol.equalTo(userFirstVisitDataset.col(DatasetUtil.APP_ID)));

        Dataset<Row> userJoinDataset = newUserDataset
                .join(fullAggUserDataset, userIdJoinForNewUserId, "left")
                .join(userReferrerDataset, userIdJoinForPageReferrer, "left")
                .join(userFirstVisitDataset, userIdJoinForFirstVisit, "left");

        Dataset<Row> finalUserDataset = userJoinDataset.select(
                appIdCol,
                coalesce(fullAggUserDataset.col(EVENT_DATE), newUserDataset.col(EVENT_DATE)).alias(EVENT_DATE),
                coalesce(fullAggUserDataset.col(DatasetUtil.EVENT_TIMESTAMP), newUserDataset.col(DatasetUtil.EVENT_TIMESTAMP)).alias(DatasetUtil.EVENT_TIMESTAMP),
                coalesce(fullAggUserDataset.col(DatasetUtil.USER_ID), newUserDataset.col(DatasetUtil.USER_ID)).alias(DatasetUtil.USER_ID),
                userPseudoIdCol,
                userFirstVisitDataset.col(DatasetUtil.USER_FIRST_TOUCH_TIMESTAMP).alias(DatasetUtil.USER_FIRST_TOUCH_TIMESTAMP),
                fullAggUserDataset.col(DatasetUtil.USER_PROPERTIES).alias(DatasetUtil.USER_PROPERTIES),
                lit(null).cast(userLtvType).alias(DatasetUtil.USER_LTV),
                userFirstVisitDataset.col(DatasetUtil.FIRST_VISIT_DATE).alias(DatasetUtil.FIRST_VISIT_DATE),
                userReferrerDataset.col(DatasetUtil.COL_PAGE_REFERER).alias(DatasetUtil.FIRST_REFERER),
                lit(null).cast(DataTypes.StringType).alias(DatasetUtil.FIRST_TRAFFIC_SOURCE_TYPE),
                lit(null).cast(DataTypes.StringType).alias(DatasetUtil.FIRST_TRAFFIC_MEDIUM),
                lit(null).cast(DataTypes.StringType).alias(DatasetUtil.FIRST_TRAFFIC_SOURCE),
                lit(null).cast(deviceIdListType).alias(DatasetUtil.DEVICE_ID_LIST),
                lit(null).cast(DataTypes.StringType).alias(DatasetUtil.CHANNEL)
        ).distinct();

        boolean debugLocal = Boolean.parseBoolean(System.getProperty(ContextUtil.DEBUG_LOCAL_PROP));
        if (debugLocal) {
            finalUserDataset.write().mode(SaveMode.Overwrite).json(DEBUG_LOCAL_PATH + "/GTMSever-userDataset/");
        }

        Dataset<Row> finalUserDataset2 = MaxLengthTransformer.runMaxLengthTransformerForUser(finalUserDataset);

        Dataset<Row> finalUserDatasetRt = finalUserDataset2.select(
                col(DatasetUtil.APP_ID),
                col(EVENT_DATE),
                col(DatasetUtil.EVENT_TIMESTAMP),
                col(DatasetUtil.USER_ID),
                col(DatasetUtil.USER_PSEUDO_ID),
                col(DatasetUtil.USER_FIRST_TOUCH_TIMESTAMP),
                col(DatasetUtil.USER_PROPERTIES),
                col(DatasetUtil.USER_LTV),
                col(DatasetUtil.FIRST_VISIT_DATE),
                col(DatasetUtil.FIRST_REFERER),
                col(DatasetUtil.FIRST_TRAFFIC_SOURCE_TYPE),
                col(DatasetUtil.FIRST_TRAFFIC_MEDIUM),
                col(DatasetUtil.FIRST_TRAFFIC_SOURCE),
                col(DatasetUtil.DEVICE_ID_LIST),
                col(DatasetUtil.CHANNEL)
        );

        return Optional.of(finalUserDatasetRt);
    }

    private Dataset<Row> extractEventParameter(final Dataset<Row> dataset2) {
        Column dataCol = dataset2.col(DatasetUtil.DATA_OUT);

        Column[] selectColumns = new Column[] {
                col(DatasetUtil.APP_ID),
                col(EVENT_DATE),
                col(DatasetUtil.EVENT_TIMESTAMP),
                col(DatasetUtil.EVENT_ID),
                col(DatasetUtil.EVENT_NAME),
                col(DatasetUtil.EVENT_PARAM_KEY),
                col(DatasetUtil.EVENT_PARAM_DOUBLE_VALUE),
                col(DatasetUtil.EVENT_PARAM_FLOAT_VALUE),
                col(DatasetUtil.EVENT_PARAM_INT_VALUE),
                col(DatasetUtil.EVENT_PARAM_STRING_VALUE)
        };

        Dataset<Row> eventParamsDataset = dataset2
                .withColumn(DatasetUtil.EVENT_NAME, dataCol.getField(DatasetUtil.EVENT_NAME))
                .withColumn(DatasetUtil.EVENT_PARAM, explode(dataCol.getField(DatasetUtil.EVENT_PARAMS)))
                .withColumn(DatasetUtil.EVENT_PARAM_KEY, col(DatasetUtil.EVENT_PARAM).getField(DatasetUtil.KEY))
                .withColumn(DatasetUtil.EVENT_PARAM_DOUBLE_VALUE, col(DatasetUtil.EVENT_PARAM).getField(DatasetUtil.VALUE).getField(DatasetUtil.DOUBLE_VALUE))
                .withColumn(DatasetUtil.EVENT_PARAM_FLOAT_VALUE, col(DatasetUtil.EVENT_PARAM).getField(DatasetUtil.VALUE).getField(DatasetUtil.FLOAT_VALUE))
                .withColumn(DatasetUtil.EVENT_PARAM_INT_VALUE, col(DatasetUtil.EVENT_PARAM).getField(DatasetUtil.VALUE).getField(DatasetUtil.INT_VALUE))
                .withColumn(DatasetUtil.EVENT_PARAM_STRING_VALUE, col(DatasetUtil.EVENT_PARAM).getField(DatasetUtil.VALUE).getField(DatasetUtil.STRING_VALUE))
                .select(selectColumns);

        boolean debugLocal = Boolean.parseBoolean(System.getProperty(ContextUtil.DEBUG_LOCAL_PROP));
        if (debugLocal) {
            eventParamsDataset.write().mode(SaveMode.Overwrite).json(DEBUG_LOCAL_PATH + "/GTMSever-eventParameters/");
        }

        Dataset<Row> datasetOut = MaxLengthTransformer.runMaxLengthTransformerForEventParameter(eventParamsDataset);
        return datasetOut.select(selectColumns);
    }

    private Optional<Dataset<Row>> extractItem(final Dataset<Row> dataset1) {
        Column dataCol = dataset1.col(DatasetUtil.DATA_OUT);
        Column[] selectedColumns = new Column[] {
                col(DatasetUtil.APP_ID),
                col(EVENT_DATE),
                col(DatasetUtil.EVENT_TIMESTAMP),
                col(DatasetUtil.ID),
                col(DatasetUtil.PROPERTIES)
        };

        Dataset<Row> newItemDataset = dataset1
                .withColumn(DatasetUtil.ITEMS, dataCol.getField(DatasetUtil.ITEMS))
                .select(DatasetUtil.APP_ID,
                        EVENT_DATE,
                        DatasetUtil.EVENT_TIMESTAMP,
                        DatasetUtil.ITEMS)
                .withColumn(DatasetUtil.ITEM, explode(col(DatasetUtil.ITEMS)))
                .drop(DatasetUtil.ITEMS)
                .withColumn(DatasetUtil.ID, col(DatasetUtil.ITEM).getField(DatasetUtil.ID))
                .withColumn(DatasetUtil.PROPERTIES, col(DatasetUtil.ITEM).getField(DatasetUtil.PROPERTIES))
                .select(
                        selectedColumns
                )
                .filter(col(DatasetUtil.ID).isNotNull())
                .distinct();

        String tableName = TableName.ITEM.getTableName();
        DatasetUtil.PathInfo pathInfo = DatasetUtil.addSchemaToMap(newItemDataset, tableName, DatasetUtil.TABLE_VERSION_SUFFIX_V1);
        log.info("newItemsDataset count:" + newItemDataset.count());

        if (newItemDataset.count() == 0) {
            return Optional.empty();
        }

        DatasetUtil.loadFullItemDataset(newItemDataset, pathInfo);

        Dataset<Row> newItemsDatasetOut = MaxLengthTransformer.runMaxLengthTransformerForItem(newItemDataset);

        Dataset<Row> newAggeItemsDataset = DatasetUtil.getAggItemDataset(newItemsDatasetOut.select(selectedColumns));

        boolean debugLocal = Boolean.parseBoolean(System.getProperty(ContextUtil.DEBUG_LOCAL_PROP));
        if (debugLocal) {
            newAggeItemsDataset.write().mode(SaveMode.Overwrite).json(DEBUG_LOCAL_PATH + "/GTMSever-newAggeItemsDataset/");
        }
        return Optional.of(newAggeItemsDataset);
    }

    public Dataset<Row> postTransform(final Dataset<Row> dataset) {
        SparkSession sparkSession = dataset.sparkSession();
        mergeIncrementalTables(sparkSession);
        return dataset.drop("ua", DatasetUtil.GEO_FOR_ENRICH);
    }
}
