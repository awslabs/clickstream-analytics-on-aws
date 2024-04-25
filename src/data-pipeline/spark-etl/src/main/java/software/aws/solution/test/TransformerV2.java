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

package software.aws.solution.test;

import lombok.extern.slf4j.Slf4j;
import org.apache.spark.sql.Column;
import org.apache.spark.sql.Dataset;
import org.apache.spark.sql.Row;
import org.apache.spark.sql.SparkSession;
import org.apache.spark.sql.functions;
import org.apache.spark.sql.types.ArrayType;
import org.apache.spark.sql.types.DataType;
import org.apache.spark.sql.types.DataTypes;
import software.aws.solution.test.transformer.Cleaner;
import software.aws.solution.test.transformer.EventParamsConverter;
import software.aws.solution.test.transformer.KvConverter;
import software.aws.solution.test.transformer.MaxLengthTransformer;
import software.aws.solution.test.transformer.UserPropertiesConverter;
import software.aws.solution.test.util.ContextUtil;
import software.aws.solution.test.util.DatasetUtil;
import software.aws.solution.test.util.ETLMetric;
import software.aws.solution.test.util.TableName;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;

import static org.apache.spark.sql.functions.array;
import static org.apache.spark.sql.functions.array_distinct;
import static org.apache.spark.sql.functions.array_sort;
import static org.apache.spark.sql.functions.coalesce;
import static org.apache.spark.sql.functions.col;
import static org.apache.spark.sql.functions.explode;
import static org.apache.spark.sql.functions.expr;
import static org.apache.spark.sql.functions.flatten;
import static org.apache.spark.sql.functions.from_json;
import static org.apache.spark.sql.functions.get_json_object;
import static org.apache.spark.sql.functions.lit;
import static org.apache.spark.sql.functions.min_by;
import static org.apache.spark.sql.functions.regexp_extract;
import static org.apache.spark.sql.functions.struct;
import static org.apache.spark.sql.functions.timestamp_seconds;
import static org.apache.spark.sql.functions.to_date;


@Slf4j
public final class TransformerV2 {
    private final Cleaner cleaner = new Cleaner();
    private final EventParamsConverter eventParamsConverter = new EventParamsConverter();
    private final UserPropertiesConverter userPropertiesConverter = new UserPropertiesConverter();
    private final KvConverter kvConverter = new KvConverter();

    private static Dataset<Row> getUserTrafficSourceDataset(final Dataset<Row> userDataset, final long newUserCount) {
        Column dataCol = col("data");
        Column attributesCol = dataCol.getField(DatasetUtil.ATTRIBUTES);
        SparkSession spark = userDataset.sparkSession();
        String tableName = DatasetUtil.TABLE_ETL_USER_TRAFFIC_SOURCE;

        Dataset<Row> newUserTrafficSourceDataset = userDataset
                .withColumn(DatasetUtil.TRAFFIC_SOURCE_MEDIUM, get_json_object(attributesCol, "$._traffic_source_medium").cast(DataTypes.StringType))
                .withColumn(DatasetUtil.TRAFFIC_SOURCE_NAME, get_json_object(attributesCol, "$._traffic_source_name").cast(DataTypes.StringType))
                .withColumn(DatasetUtil.TRAFFIC_SOURCE_SOURCE, get_json_object(attributesCol, "$._traffic_source_source").cast(DataTypes.StringType))
                .filter(col(DatasetUtil.TRAFFIC_SOURCE_SOURCE).isNotNull())
                .select(DatasetUtil.APP_ID,
                        DatasetUtil.USER_PSEUDO_ID,
                        DatasetUtil.TRAFFIC_SOURCE_MEDIUM,
                        DatasetUtil.TRAFFIC_SOURCE_NAME,
                        DatasetUtil.TRAFFIC_SOURCE_SOURCE,
                        DatasetUtil.EVENT_TIMESTAMP);

        long newTrafficSourceCount = newUserTrafficSourceDataset.count();
        log.info(DatasetUtil.NEW_USER_COUNT + "=" + newUserCount + ", newTrafficSourceCount=" + newTrafficSourceCount);

        DatasetUtil.PathInfo pathInfo = DatasetUtil.addSchemaToMap(newUserTrafficSourceDataset, tableName, DatasetUtil.TABLE_VERSION_SUFFIX_V1);

        if (newTrafficSourceCount > 0) {
            Dataset<Row> newAggUserTrafficSourceDataset = getAggTrafficSourceDataset(newUserTrafficSourceDataset);
            log.info("newAggUserTrafficSourceDataset count:" + newAggUserTrafficSourceDataset.count());
            String path = DatasetUtil.saveIncrementalDatasetToPath(pathInfo.getIncremental(), newAggUserTrafficSourceDataset);
            Dataset<Row> allTrafficSourceDataset = DatasetUtil.readDatasetFromPath(spark, path, ContextUtil.getUserKeepDays());
            log.info("allTrafficSourceDataset count:" + allTrafficSourceDataset.count());
            Dataset<Row> aggTrafficSourceDataset = getAggTrafficSourceDataset(allTrafficSourceDataset);
            log.info("aggTrafficSourceDataset count:" + aggTrafficSourceDataset.count());
            DatasetUtil.saveFullDatasetToPath(pathInfo.getFull(), aggTrafficSourceDataset);
            return aggTrafficSourceDataset;
        } else if (newUserCount > 0 && newTrafficSourceCount == 0) {
            return DatasetUtil.readDatasetFromPath(spark, pathInfo.getFull(), ContextUtil.getUserKeepDays());
        } else {
            return null;
        }
    }

    private static Dataset<Row> getAggTrafficSourceDataset(final Dataset<Row> allTrafficSourceDataset) {
        return allTrafficSourceDataset.groupBy(DatasetUtil.APP_ID, DatasetUtil.USER_PSEUDO_ID)
                .agg(min_by(struct(col(DatasetUtil.TRAFFIC_SOURCE_MEDIUM),
                                col(DatasetUtil.TRAFFIC_SOURCE_NAME),
                                col(DatasetUtil.TRAFFIC_SOURCE_SOURCE),
                                col(DatasetUtil.EVENT_TIMESTAMP)),
                        col(DatasetUtil.EVENT_TIMESTAMP)).alias("traffic_source_source"))
                .select(col(DatasetUtil.APP_ID), col(DatasetUtil.USER_PSEUDO_ID), expr("traffic_source_source.*"))
                .distinct();
    }

    private static Dataset<Row> getPageRefererDataset(final Dataset<Row> userDataset,
                                                      final long newUserCount) {
        Column dataCol = col("data");
        Column attributesCol = dataCol.getField(DatasetUtil.ATTRIBUTES);
        SparkSession spark = userDataset.sparkSession();
        String tableName = DatasetUtil.TABLE_ETL_USER_PAGE_REFERER;

        Dataset<Row> newUserRefererDataset = userDataset
                .withColumn(DatasetUtil.COL_PAGE_REFERER,
                        coalesce(
                                get_json_object(attributesCol, "$." + DatasetUtil.PROP_PAGE_REFERRER).cast(DataTypes.StringType),
                                get_json_object(attributesCol, "$." + DatasetUtil.COL_PAGE_REFERER).cast(DataTypes.StringType),
                                get_json_object(attributesCol, "$." + DatasetUtil.REFERER).cast(DataTypes.StringType),
                                get_json_object(attributesCol, "$." + DatasetUtil.REFERRER).cast(DataTypes.StringType)
                        ))
                .filter(col(DatasetUtil.COL_PAGE_REFERER).isNotNull())
                .select(DatasetUtil.APP_ID, DatasetUtil.USER_PSEUDO_ID, DatasetUtil.COL_PAGE_REFERER, DatasetUtil.EVENT_TIMESTAMP);

        long newRefererCount = newUserRefererDataset.count();
        log.info(DatasetUtil.NEW_USER_COUNT + "=" + newUserCount + ", newRefererCount=" + newRefererCount);

        DatasetUtil.PathInfo pathInfo = DatasetUtil.addSchemaToMap(newUserRefererDataset, tableName, DatasetUtil.TABLE_VERSION_SUFFIX_V1);

        if (newRefererCount > 0) {
            return DatasetUtil.loadFullUserRefererDataset(newUserRefererDataset, pathInfo);
        } else if (newUserCount > 0 && newRefererCount == 0) {
            return DatasetUtil.readDatasetFromPath(spark, pathInfo.getFull(), ContextUtil.getUserKeepDays());
        } else {
            return null;
        }
    }


    private static Dataset<Row> getUserDeviceIdDataset(final Dataset<Row> userDataset, final long newUserCount) {
        Column dataCol = col("data");
        SparkSession spark = userDataset.sparkSession();
        String tableName = DatasetUtil.TABLE_ETL_USER_DEVICE_ID;

        Dataset<Row> newUserDeviceIdDataset = userDataset
                .withColumn(DatasetUtil.DEVICE_ID, dataCol.getItem(DatasetUtil.DEVICE_ID).cast(DataTypes.StringType))
                .filter(col(DatasetUtil.DEVICE_ID).isNotNull())
                .withColumn(DatasetUtil.DEVICE_ID_LIST, array(col(DatasetUtil.DEVICE_ID)))
                .select(DatasetUtil.APP_ID, DatasetUtil.USER_PSEUDO_ID, DatasetUtil.DEVICE_ID_LIST, DatasetUtil.EVENT_TIMESTAMP);

        long newDeviceIdCount = newUserDeviceIdDataset.count();
        log.info(DatasetUtil.NEW_USER_COUNT + "=" + newUserCount + ", newDeviceIdCount=" + newDeviceIdCount);
        DatasetUtil.PathInfo pathInfo = DatasetUtil.addSchemaToMap(newUserDeviceIdDataset, tableName, DatasetUtil.TABLE_VERSION_SUFFIX_V1);

        if (newDeviceIdCount > 0) {
            Dataset<Row> newAggUserDeviceIdDataset = getAggUserDeviceIdDataset(newUserDeviceIdDataset);
            log.info("newAggUserDeviceIdDataset count:" + newAggUserDeviceIdDataset.count());
            String path = DatasetUtil.saveIncrementalDatasetToPath(pathInfo.getIncremental(), newAggUserDeviceIdDataset);
            Dataset<Row> allUserDeviceIdDataset = DatasetUtil.readDatasetFromPath(spark, path,
                    ContextUtil.getUserKeepDays());
            log.info("allUserDeviceIdDataset count:" + allUserDeviceIdDataset.count());
            Dataset<Row> aggUserDeviceIdDataset = getAggUserDeviceIdDataset(allUserDeviceIdDataset);
            log.info("aggUserDeviceIdDataset count:" + allUserDeviceIdDataset.count());
            DatasetUtil.saveFullDatasetToPath(pathInfo.getFull(), aggUserDeviceIdDataset);
            return aggUserDeviceIdDataset;
        } else if (newUserCount > 0 && newDeviceIdCount == 0) {
            return DatasetUtil.readDatasetFromPath(spark, pathInfo.getFull(), ContextUtil.getUserKeepDays());
        } else {
            return null;
        }
    }

    private static Dataset<Row> getAggUserDeviceIdDataset(final Dataset<Row> allUserDeviceIdDataset) {
        Map<String, String> aggMap = new HashMap<>();
        aggMap.put(DatasetUtil.DEVICE_ID_LIST, "collect_set");
        aggMap.put(DatasetUtil.EVENT_TIMESTAMP, "max");

        return allUserDeviceIdDataset
                .groupBy(col(DatasetUtil.APP_ID), col(DatasetUtil.USER_PSEUDO_ID))
                .agg(aggMap)
                .withColumnRenamed("max(event_timestamp)", DatasetUtil.EVENT_TIMESTAMP)
                .withColumnRenamed("collect_set(device_id_list)", "device_id_list_list")
                .withColumn(DatasetUtil.DEVICE_ID_LIST, array_sort(array_distinct(flatten(col("device_id_list_list")))))
                .select(DatasetUtil.APP_ID, DatasetUtil.USER_PSEUDO_ID, DatasetUtil.DEVICE_ID_LIST, DatasetUtil.EVENT_TIMESTAMP)
                .distinct();
    }

    private static Dataset<Row> getAggUserChannelDataset(final Dataset<Row> newUserChannelDataset) {
        return newUserChannelDataset.groupBy(DatasetUtil.APP_ID, DatasetUtil.USER_PSEUDO_ID)
                .agg(min_by(struct(
                                col(DatasetUtil.CHANNEL),
                                col(DatasetUtil.EVENT_TIMESTAMP)),
                        col(DatasetUtil.EVENT_TIMESTAMP)).alias("c"))
                .select(col(DatasetUtil.APP_ID), col(DatasetUtil.USER_PSEUDO_ID), expr("c.*"))
                .distinct();
    }

    private static Dataset<Row> getUserChannelDataset(final Dataset<Row> userDataset,
                                                      final long newUserCount) {
        Column dataCol = col("data");
        Column attributesCol = dataCol.getField(DatasetUtil.ATTRIBUTES);
        SparkSession spark = userDataset.sparkSession();
        String tableName = DatasetUtil.TABLE_ETL_USER_CHANNEL;

        Dataset<Row> newUserChannelDataset = userDataset
                .withColumn(DatasetUtil.CHANNEL,
                        get_json_object(attributesCol, "$." + DatasetUtil.CHANNEL).cast(DataTypes.StringType))
                .filter(col(DatasetUtil.CHANNEL).isNotNull())
                .select(DatasetUtil.APP_ID, DatasetUtil.USER_PSEUDO_ID, DatasetUtil.CHANNEL, DatasetUtil.EVENT_TIMESTAMP);

        long newChannelDatasetCount = newUserChannelDataset.count();
        log.info(DatasetUtil.NEW_USER_COUNT + "=" + newUserCount + ", newChannelCount=" + newChannelDatasetCount);

        DatasetUtil.PathInfo pathInfo = DatasetUtil.addSchemaToMap(newUserChannelDataset, tableName, DatasetUtil.TABLE_VERSION_SUFFIX_V1);

        if (newChannelDatasetCount > 0) {
            Dataset<Row> newAggUserChannelDataset = getAggUserChannelDataset(newUserChannelDataset);
            log.info("newAggUserChannelDataset count:" + newAggUserChannelDataset.count());
            String path = DatasetUtil.saveIncrementalDatasetToPath(pathInfo.getIncremental(), newAggUserChannelDataset);
            Dataset<Row> allUserChannelDataset = DatasetUtil.readDatasetFromPath(spark, path, ContextUtil.getUserKeepDays());
            log.info("allUserChannelDataset count:" + allUserChannelDataset.count());
            Dataset<Row> aggUserChannelDataset = getAggUserChannelDataset(allUserChannelDataset);
            log.info("aggUserChannelDataset count:" + aggUserChannelDataset.count());
            DatasetUtil.saveFullDatasetToPath(pathInfo.getFull(), aggUserChannelDataset);
            return aggUserChannelDataset;
        } else if (newUserCount > 0 && newChannelDatasetCount == 0) {
            return DatasetUtil.readDatasetFromPath(spark, pathInfo.getFull(), ContextUtil.getUserKeepDays());
        } else {
            return null;
        }
    }

    private static Dataset<Row> explodeKeyValue(final Dataset<Row> dataset2, final String arrColName, final String toColNamePrefix) {
        Dataset<Row> d1 = dataset2.withColumn(arrColName, explode(col(arrColName)).alias(arrColName))
                .withColumn(toColNamePrefix + "key", expr(arrColName + ".key"))
                .withColumn(toColNamePrefix + "double_value", expr(arrColName + ".value.double_value"))
                .withColumn(toColNamePrefix + "float_value", expr(arrColName + ".value.float_value"))
                .withColumn(toColNamePrefix + "int_value", expr(arrColName + ".value.int_value"))
                .withColumn(toColNamePrefix + "string_value", expr(arrColName + ".value.string_value"));
        return d1.drop(arrColName);
    }

    private static void mergeIncrementalTables(final SparkSession sparkSession) {
        log.info("start merging incremental tables");
        int userKeepDays = ContextUtil.getUserKeepDays();
        int itemKeepDays = ContextUtil.getItemKeepDays();

        List<DatasetUtil.TableInfo> l = new ArrayList<>();
        l.add(new DatasetUtil.TableInfo(
                DatasetUtil.TABLE_ETL_USER_DEVICE_ID, DatasetUtil.TABLE_VERSION_SUFFIX_V1, userKeepDays
        ));
        l.add(new DatasetUtil.TableInfo(
                DatasetUtil.TABLE_ETL_USER_PAGE_REFERER, DatasetUtil.TABLE_VERSION_SUFFIX_V1, userKeepDays
        ));
        l.add(new DatasetUtil.TableInfo(
                DatasetUtil.TABLE_ETL_USER_TRAFFIC_SOURCE, DatasetUtil.TABLE_VERSION_SUFFIX_V1, userKeepDays
        ));
        l.add(new DatasetUtil.TableInfo(
                DatasetUtil.TABLE_ETL_USER_CHANNEL, DatasetUtil.TABLE_VERSION_SUFFIX_V1, userKeepDays
        ));
        l.add(new DatasetUtil.TableInfo(
                TableName.USER.getTableName(), DatasetUtil.TABLE_VERSION_SUFFIX_V1, userKeepDays
        ));
        l.add(new DatasetUtil.TableInfo(
                TableName.ITEM.getTableName(), DatasetUtil.TABLE_VERSION_SUFFIX_V1, itemKeepDays
        ));
        DatasetUtil.mergeIncrementalTables(sparkSession, l);
    }

    public List<Dataset<Row>> transform(final Dataset<Row> dataset) {
        log.info(new ETLMetric(dataset, "transform enter").toString());
        Dataset<Row> cleanedDataset = cleaner.clean(dataset, DatasetUtil.DATA_SCHEMA_V2_FILE_PATH);
        ContextUtil.cacheDataset(cleanedDataset);
        log.info(new ETLMetric(cleanedDataset, "after clean").toString());
        Column dataCol = col("data");

        Dataset<Row> dataset0 = cleanedDataset.withColumn(DatasetUtil.APP_ID, dataCol.getField(DatasetUtil.APP_ID))
                .withColumn(DatasetUtil.EVENT_ID, dataCol.getItem(DatasetUtil.EVENT_ID))
                .withColumn(DatasetUtil.USER_PSEUDO_ID, dataCol.getField("unique_id").cast(DataTypes.StringType))
                .withColumn(DatasetUtil.EVENT_NAME, dataCol.getField("event_type"))
                .withColumn(DatasetUtil.EVENT_DATE, to_date(timestamp_seconds(dataCol.getItem(DatasetUtil.TIMESTAMP).$div(1000))))
                .withColumn(DatasetUtil.EVENT_TIMESTAMP, dataCol.getItem(DatasetUtil.TIMESTAMP))
                .withColumn(DatasetUtil.USER_FIRST_TOUCH_TIMESTAMP, get_json_object(dataCol.getField("user"), "$._user_first_touch_timestamp.value").cast(DataTypes.LongType))
                .withColumn(DatasetUtil.USER_ID, get_json_object(dataCol.getField("user"), "$._user_id.value").cast(DataTypes.StringType));
        Dataset<Row> dataset1 = convertAppInfo(dataset0);

        Dataset<Row> eventDataset = extractEvent(dataset1);
        log.info(new ETLMetric(eventDataset, "eventDataset").toString());

        Dataset<Row> eventParameterDataset = extractEventParameter(dataset1);
        log.info(new ETLMetric(eventParameterDataset, "eventParameterDataset").toString());

        Optional<Dataset<Row>> itemDataset = extractItem(dataset1);
        itemDataset.ifPresent(rowDataset -> log.info(new ETLMetric(rowDataset, "itemDataset").toString()));

        Optional<Dataset<Row>> userDataset = extractUser(dataset1);
        userDataset.ifPresent(rowDataset -> log.info(new ETLMetric(rowDataset, "userDataset").toString()));

        return Arrays.asList(eventDataset,
                eventParameterDataset,
                itemDataset.orElse(null),
                userDataset.orElse(null));
    }

    private Dataset<Row> extractEvent(final Dataset<Row> dataset) {
        String projectId = System.getProperty(ContextUtil.PROJECT_ID_PROP);
        Column dataCol = col("data");
        Dataset<Row> dataset1 = dataset.withColumn(DatasetUtil.EVENT_PREVIOUS_TIMESTAMP, dataCol.getField(DatasetUtil.EVENT_PREVIOUS_TIMESTAMP).cast(DataTypes.LongType))
                .withColumn(DatasetUtil.EVENT_VALUE_IN_USD, dataCol.getItem(DatasetUtil.EVENT_VALUE_IN_USD).cast(DataTypes.FloatType))
                .withColumn(DatasetUtil.PLATFORM, dataCol.getItem(DatasetUtil.PLATFORM))
                .withColumn("project_id", lit(projectId))
                .withColumn("ingest_timestamp", col("ingest_time"));

        Dataset<Row> dataset2 = convertUri(dataset1, "event_bundle_sequence_id", DataTypes.LongType);
        Dataset<Row> dataset3 = convertDevice(dataset2);
        Dataset<Row> dataset4 = convertGeo(dataset3);
        Dataset<Row> dataset5 = convertTrafficSource(dataset4);
        Dataset<Row> datasetFinal = convertItems(dataset5);

        Column[] selectedColumns = new Column[]{
                col(DatasetUtil.EVENT_ID),
                col(DatasetUtil.EVENT_DATE),
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
                col(DatasetUtil.GEO_FOR_ENRICH),
        };

        Dataset<Row> datasetFinal2 = datasetFinal.select(selectedColumns);

        Dataset<Row> datasetFinal3 = MaxLengthTransformer.runMaxLengthTransformerForEvent(datasetFinal2);

        log.info("extractEvent done");
        return datasetFinal3.select(
                selectedColumns
        );

    }



    private Dataset<Row> extractEventParameter(final Dataset<Row> dataset) {
        Dataset<Row> dataset1 = eventParamsConverter.transform(dataset);
        Dataset<Row> dataset2 = dataset1.select(
                col(DatasetUtil.APP_ID),
                col(DatasetUtil.EVENT_DATE),
                col(DatasetUtil.EVENT_TIMESTAMP),
                col(DatasetUtil.EVENT_ID),
                col(DatasetUtil.EVENT_NAME),
                col("event_params"));

        Column[] selectColumns = new Column[] {
                col(DatasetUtil.APP_ID),
                col(DatasetUtil.EVENT_DATE),
                col(DatasetUtil.EVENT_TIMESTAMP),
                col(DatasetUtil.EVENT_ID),
                col(DatasetUtil.EVENT_NAME),
                col(DatasetUtil.EVENT_PARAM_KEY),
                col(DatasetUtil.EVENT_PARAM_DOUBLE_VALUE),
                col(DatasetUtil.EVENT_PARAM_FLOAT_VALUE),
                col(DatasetUtil.EVENT_PARAM_INT_VALUE),
                col(DatasetUtil.EVENT_PARAM_STRING_VALUE)
        };
        Dataset<Row> dataset3 = explodeKeyValue(dataset2, "event_params", "event_param_")
                .select(selectColumns);

        Dataset<Row> datasetOut = MaxLengthTransformer.runMaxLengthTransformerForEventParameter(dataset3);

        return datasetOut.select(selectColumns);
    }

    private Optional<Dataset<Row>> extractItem(final Dataset<Row> dataset) {
        Column dataCol = col("data");
        ArrayType itemsType = DataTypes.createArrayType(DataTypes.StringType);
        String itemJson = "item_json";
        Dataset<Row> datasetItems = dataset
                .withColumn(itemJson, explode(from_json(dataCol.getField(DatasetUtil.ITEMS), itemsType)))
                .filter(col(itemJson).isNotNull());

        List<String> excludedAttributes = new ArrayList<>();
        excludedAttributes.add(DatasetUtil.ID);

        Dataset<Row> dataset1 = kvConverter.transform(datasetItems, col(itemJson), DatasetUtil.PROPERTIES, excludedAttributes);

        Column[] selectedColumns = new Column[] {
                col(DatasetUtil.APP_ID),
                col(DatasetUtil.EVENT_DATE),
                col(DatasetUtil.EVENT_TIMESTAMP),
                col(DatasetUtil.ID),
                col(DatasetUtil.PROPERTIES)
        };

        Dataset<Row> newItemsDataset1 = dataset1
                .withColumn(DatasetUtil.ID, get_json_object(col(itemJson), "$." + DatasetUtil.ID).cast(DataTypes.StringType))
                .filter(col(DatasetUtil.ID).isNotNull())
                .select(
                        selectedColumns
                ).distinct();

        String tableName = TableName.ITEM.getTableName();
        DatasetUtil.PathInfo pathInfo = DatasetUtil.addSchemaToMap(newItemsDataset1, tableName, DatasetUtil.TABLE_VERSION_SUFFIX_V1);

        log.info("newItemsDataset count:" + newItemsDataset1.count());

        if (newItemsDataset1.count() == 0) {
            return Optional.empty();
        }

        Dataset<Row> newItemsDatasetOut = MaxLengthTransformer.runMaxLengthTransformerForItem(newItemsDataset1);

        Dataset<Row> newAggeItemsDataset = DatasetUtil.getAggItemDataset(newItemsDatasetOut.select(selectedColumns));
        DatasetUtil.loadFullItemDataset(newAggeItemsDataset, pathInfo);

        return Optional.of(newAggeItemsDataset);
    }



    private Optional<Dataset<Row>> extractUser(final Dataset<Row> dataset) {

        Dataset<Row> newUserEventDataset = dataset
                .filter(col(DatasetUtil.USER_PSEUDO_ID).isNotNull().and(
                        col(DatasetUtil.EVENT_NAME).isin(
                                "user_profile_set",
                                "_user_profile_set",
                                DatasetUtil.EVENT_PROFILE_SET,
                                DatasetUtil.EVENT_FIRST_OPEN,
                                DatasetUtil.EVENT_FIRST_VISIT,
                                DatasetUtil.EVENT_APP_END,
                                DatasetUtil.EVENT_APP_START
                        )
                ));

        long newUserEventCount = newUserEventDataset.count();
        log.info("newUserEventDataset: " + newUserEventCount);

        Dataset<Row> newUniqueUserDataset = newUserEventDataset
                .select(col(DatasetUtil.APP_ID), col(DatasetUtil.USER_PSEUDO_ID), col(DatasetUtil.EVENT_DATE), col(DatasetUtil.EVENT_TIMESTAMP), col(DatasetUtil.USER_FIRST_TOUCH_TIMESTAMP))
                .groupBy(col(DatasetUtil.APP_ID), col(DatasetUtil.USER_PSEUDO_ID))
                .agg(
                        functions.max(DatasetUtil.EVENT_TIMESTAMP).alias(DatasetUtil.EVENT_TIMESTAMP),
                        functions.max(DatasetUtil.EVENT_DATE).alias(DatasetUtil.EVENT_DATE),
                        functions.min(DatasetUtil.USER_FIRST_TOUCH_TIMESTAMP).alias(DatasetUtil.USER_FIRST_TOUCH_TIMESTAMP)
                )
                .select(
                        col(DatasetUtil.APP_ID),
                        col(DatasetUtil.EVENT_DATE),
                        col(DatasetUtil.USER_PSEUDO_ID),
                        col(DatasetUtil.EVENT_TIMESTAMP),
                        coalesce(col(DatasetUtil.USER_FIRST_TOUCH_TIMESTAMP), col(DatasetUtil.EVENT_TIMESTAMP)).alias(DatasetUtil.USER_FIRST_TOUCH_TIMESTAMP)
                );

        long newUserCount = newUniqueUserDataset.count();
        log.info("newUniqueUserDataset: " + newUserCount);

        // for `DeviceId` get from event: _app_start
        Dataset<Row> appStartDataset = newUserEventDataset.filter(col(DatasetUtil.EVENT_NAME).isin(DatasetUtil.EVENT_APP_START));
        log.info("appStartDataset count: " + appStartDataset.count());
        Dataset<Row> userDeviceIdDataset = getUserDeviceIdDataset(appStartDataset, newUserCount);

        // for `PageReferer` and `Channel` get from events: _first_open, _first_visit
        Dataset<Row> firstVisitDataset = newUserEventDataset.filter(col(DatasetUtil.EVENT_NAME).isin(DatasetUtil.EVENT_FIRST_OPEN, DatasetUtil.EVENT_FIRST_VISIT));
        log.info("firstVisitDataset count: " + firstVisitDataset.count());
        Dataset<Row> userReferrerDataset = getPageRefererDataset(firstVisitDataset, newUserCount);
        Dataset<Row> userChannelDataset = getUserChannelDataset(firstVisitDataset, newUserCount);

        // for `TrafficSource` get from event: _app_end
        Dataset<Row> appEndDataset = newUserEventDataset.filter(col(DatasetUtil.EVENT_NAME).equalTo(DatasetUtil.EVENT_APP_END));
        log.info("appEndDataset count: " + appEndDataset.count());
        Dataset<Row> userTrafficSourceDataset = getUserTrafficSourceDataset(appEndDataset, newUserCount);

        // for user_properties and others get from _profile_set
        Dataset<Row> profileSetDataset = newUserEventDataset
                .filter(col(DatasetUtil.EVENT_NAME).isin("user_profile_set", "_user_profile_set", DatasetUtil.EVENT_PROFILE_SET));
        log.info("profileSetDataset count: " + profileSetDataset.count());

        Dataset<Row> newProfileSetDataset = this.userPropertiesConverter.transform(profileSetDataset);

        Dataset<Row> newUserProfileMainDataset = newProfileSetDataset
                .select(
                        DatasetUtil.APP_ID,
                        DatasetUtil.EVENT_DATE,
                        DatasetUtil.EVENT_TIMESTAMP,
                        DatasetUtil.USER_ID,
                        DatasetUtil.USER_PSEUDO_ID,
                        DatasetUtil.USER_PROPERTIES,
                        DatasetUtil.USER_LTV
                ).distinct();

        String tableName = TableName.USER.getTableName();
        DatasetUtil.PathInfo pathInfo = DatasetUtil.addSchemaToMap(newUserProfileMainDataset, tableName, DatasetUtil.TABLE_VERSION_SUFFIX_V1);

        if (newUserCount == 0) {
            return Optional.empty();
        }

        // newUserCount > 0, below dataset should not null
        Objects.requireNonNull(userReferrerDataset);
        Objects.requireNonNull(userDeviceIdDataset);
        Objects.requireNonNull(userTrafficSourceDataset);
        Objects.requireNonNull(userChannelDataset);

        userReferrerDataset = reRepartitionUserDataset(userReferrerDataset);
        userDeviceIdDataset = reRepartitionUserDataset(userDeviceIdDataset);
        userTrafficSourceDataset = reRepartitionUserDataset(userTrafficSourceDataset);
        userChannelDataset = reRepartitionUserDataset(userChannelDataset);

        Dataset<Row> userPropsDataset = DatasetUtil.loadFullUserDataset(newUserProfileMainDataset, pathInfo);
        userPropsDataset = reRepartitionUserDataset(userPropsDataset);

        Column userPseudoIdCol = newUniqueUserDataset.col(DatasetUtil.USER_PSEUDO_ID);
        Column appIdCol = newUniqueUserDataset.col(DatasetUtil.APP_ID);

        Column userIdJoinForUserPropertiesUserId = userPseudoIdCol.equalTo(userPropsDataset.col(DatasetUtil.USER_PSEUDO_ID)).and(appIdCol.equalTo(userPropsDataset.col(DatasetUtil.APP_ID)));
        Column userIdJoinForDeviceId = userPseudoIdCol.equalTo(userDeviceIdDataset.col(DatasetUtil.USER_PSEUDO_ID)).and(appIdCol.equalTo(userDeviceIdDataset.col(DatasetUtil.APP_ID)));
        Column userIdJoinForTrafficSource = userPseudoIdCol.equalTo(userTrafficSourceDataset.col(DatasetUtil.USER_PSEUDO_ID)).and(appIdCol.equalTo(userTrafficSourceDataset.col(DatasetUtil.APP_ID)));
        Column userIdJoinForPageReferrer = userPseudoIdCol.equalTo(userReferrerDataset.col(DatasetUtil.USER_PSEUDO_ID)).and(appIdCol.equalTo(userReferrerDataset.col(DatasetUtil.APP_ID)));
        Column userIdJoinForChannel = userPseudoIdCol.equalTo(userChannelDataset.col(DatasetUtil.USER_PSEUDO_ID)).and(appIdCol.equalTo(userChannelDataset.col(DatasetUtil.APP_ID)));

        Dataset<Row> joinedPossibleUpdateUserDataset = newUniqueUserDataset
                .join(userPropsDataset, userIdJoinForUserPropertiesUserId, "left")
                .join(userDeviceIdDataset, userIdJoinForDeviceId, "left")
                .join(userTrafficSourceDataset, userIdJoinForTrafficSource, "left")
                .join(userReferrerDataset, userIdJoinForPageReferrer, "left")
                .join(userChannelDataset, userIdJoinForChannel, "left");

        log.info("joinedPossibleUpdateUserDataset:" + joinedPossibleUpdateUserDataset.count());
        Dataset<Row> joinedPossibleUpdateUserDatasetRt1 = joinedPossibleUpdateUserDataset
                .select(
                        appIdCol,
                        newUniqueUserDataset.col(DatasetUtil.EVENT_DATE),
                        newUniqueUserDataset.col(DatasetUtil.EVENT_TIMESTAMP),
                        col(DatasetUtil.USER_ID),
                        userPseudoIdCol,
                        newUniqueUserDataset.col(DatasetUtil.USER_FIRST_TOUCH_TIMESTAMP),
                        col(DatasetUtil.USER_PROPERTIES),
                        col(DatasetUtil.USER_LTV),
                        timestamp_seconds(newUniqueUserDataset.col(DatasetUtil.USER_FIRST_TOUCH_TIMESTAMP).$div(1000)).cast(DataTypes.DateType).alias(DatasetUtil.FIRST_VISIT_DATE),
                        col(DatasetUtil.COL_PAGE_REFERER).alias(DatasetUtil.FIRST_REFERER),
                        col(DatasetUtil.TRAFFIC_SOURCE_NAME).alias(DatasetUtil.FIRST_TRAFFIC_SOURCE_TYPE),
                        col(DatasetUtil.TRAFFIC_SOURCE_MEDIUM).alias(DatasetUtil.FIRST_TRAFFIC_MEDIUM),
                        col(DatasetUtil.TRAFFIC_SOURCE_SOURCE).alias(DatasetUtil.FIRST_TRAFFIC_SOURCE),
                        col(DatasetUtil.DEVICE_ID_LIST),
                        col(DatasetUtil.CHANNEL)
                        );

        Dataset<Row> joinedPossibleUpdateUserDatasetRt2 = MaxLengthTransformer.runMaxLengthTransformerForUser(joinedPossibleUpdateUserDatasetRt1);

        Dataset<Row> joinedPossibleUpdateUserDatasetRt3 = joinedPossibleUpdateUserDatasetRt2.select(
                col(DatasetUtil.APP_ID),
                col(DatasetUtil.EVENT_DATE),
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
        return Optional.of(joinedPossibleUpdateUserDatasetRt3);
    }


    private static Dataset<Row> reRepartitionUserDataset(final Dataset<Row> userDataset) {
        return userDataset.repartition(col(DatasetUtil.APP_ID), col(DatasetUtil.USER_PSEUDO_ID));
    }

    private Dataset<Row> convertItems(final Dataset<Row> dataset) {
        DataType itemType = DataTypes.createStructType(Arrays.asList(
                DataTypes.createStructField(DatasetUtil.ID, DataTypes.StringType, true),
                DataTypes.createStructField("quantity", DataTypes.LongType, true),
                DataTypes.createStructField("price", DataTypes.DoubleType, true),
                DataTypes.createStructField("currency", DataTypes.StringType, true),
                DataTypes.createStructField("creative_name", DataTypes.StringType, true),
                DataTypes.createStructField("creative_slot", DataTypes.StringType, true)));
        DataType itemsType = DataTypes.createArrayType(itemType);
        return dataset.withColumn(DatasetUtil.ITEMS,
                from_json(col(DatasetUtil.DATA).getField(DatasetUtil.ITEMS), itemsType));

    }

    private Dataset<Row> convertUri(final Dataset<Row> dataset, final String fieldName, final DataType dataType) {
        String tmpStrFileName = fieldName + "_tmp_";
        return dataset
                .withColumn(tmpStrFileName, regexp_extract(col("uri"), fieldName + "=([^&]+)", 1))
                .withColumn(fieldName, expr("nullif (" + tmpStrFileName + ", '')").cast(dataType)).drop(tmpStrFileName);
    }

    private Dataset<Row> convertGeo(final Dataset<Row> dataset) {
        Column dataCol = col(DatasetUtil.DATA);
        return dataset.withColumn("geo", struct(lit(null).cast(DataTypes.StringType).alias("country"),
                        lit(null).cast(DataTypes.StringType).alias("continent"),
                        lit(null).cast(DataTypes.StringType).alias("sub_continent"),
                        dataCol.getItem(DatasetUtil.LOCALE).alias(DatasetUtil.LOCALE),
                        lit(null).cast(DataTypes.StringType).alias("region"),
                        lit(null).cast(DataTypes.StringType).alias("metro"),
                        lit(null).cast(DataTypes.StringType).alias("city")))
                .withColumn(DatasetUtil.GEO_FOR_ENRICH, struct(col("ip"), dataCol.getItem(DatasetUtil.LOCALE).alias(DatasetUtil.LOCALE)));
    }

    private Dataset<Row> convertTrafficSource(final Dataset<Row> dataset) {
        Column dataCol = col(DatasetUtil.DATA);
        Column attributesCol = dataCol.getField(DatasetUtil.ATTRIBUTES);
        return dataset
                .withColumn("traffic_source", struct(
                        get_json_object(attributesCol, "$._traffic_source_medium").alias("medium"),
                        get_json_object(attributesCol, "$._traffic_source_name").alias("name"),
                        get_json_object(attributesCol, "$._traffic_source_source").alias("source")));
    }

    private Dataset<Row> convertAppInfo(final Dataset<Row> dataset) {
        Column dataCol = col(DatasetUtil.DATA);
        Column attributesCol = dataCol.getField(DatasetUtil.ATTRIBUTES);

        return dataset
                .withColumn(DatasetUtil.APP_INFO, struct(
                                (dataCol.getItem(DatasetUtil.APP_ID)).alias(DatasetUtil.APP_ID),
                                (dataCol.getItem("app_package_name")).alias("id"),
                                get_json_object(attributesCol, "$." + DatasetUtil.CHANNEL).alias("install_source"),
                                (dataCol.getItem("app_version")).alias("version"),
                                dataCol.getItem("sdk_version").alias("sdk_version"),
                                dataCol.getItem("sdk_name").alias("sdk_name")
                        )
                );
    }

    private Dataset<Row> convertDevice(final Dataset<Row> dataset) {
        Column dataCol = col(DatasetUtil.DATA);
        return dataset.withColumn(DatasetUtil.DEVICE, struct(
                (dataCol.getItem("brand")).alias("mobile_brand_name"),
                (dataCol.getItem("model")).alias("mobile_model_name"),
                (dataCol.getItem("make")).alias("manufacturer"),
                (dataCol.getItem("screen_width")).alias("screen_width"),
                (dataCol.getItem("screen_height")).alias("screen_height"),
                (dataCol.getItem("carrier")).alias("carrier"),
                (dataCol.getItem("network_type")).alias("network_type"),
                (dataCol.getItem("os_version")).alias("operating_system_version"),
                (dataCol.getItem(DatasetUtil.PLATFORM)).alias("operating_system"),

                // placeholder for ua enrich fields
                lit(null).cast(DataTypes.StringType).alias(DatasetUtil.UA_BROWSER),
                lit(null).cast(DataTypes.StringType).alias(DatasetUtil.UA_BROWSER_VERSION),
                lit(null).cast(DataTypes.StringType).alias(DatasetUtil.UA_OS),
                lit(null).cast(DataTypes.StringType).alias(DatasetUtil.UA_OS_VERSION),
                lit(null).cast(DataTypes.StringType).alias(DatasetUtil.UA_DEVICE),
                lit(null).cast(DataTypes.StringType).alias(DatasetUtil.UA_DEVICE_CATEGORY),

                (dataCol.getItem("system_language")).alias("system_language"),
                (dataCol.getItem("zone_offset").$div(1000)).cast(DataTypes.LongType).alias("time_zone_offset_seconds"),
                (dataCol.getItem(DatasetUtil.DEVICE_ID)).alias("vendor_id"),
                (dataCol.getItem("device_unique_id")).alias("advertising_id"),
                (dataCol.getItem("host_name")).alias("host_name"),
                (dataCol.getItem("viewport_width")).cast(DataTypes.LongType).alias("viewport_width"),
                (dataCol.getItem("viewport_height")).cast(DataTypes.LongType).alias("viewport_height")));
    }

    public Dataset<Row> postTransform(final Dataset<Row> dataset) {
        SparkSession sparkSession = dataset.sparkSession();
        mergeIncrementalTables(sparkSession);
        return dataset.drop("ua", DatasetUtil.GEO_FOR_ENRICH);
    }

}
