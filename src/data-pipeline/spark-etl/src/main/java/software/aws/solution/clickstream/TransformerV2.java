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

import lombok.extern.slf4j.Slf4j;
import org.apache.spark.sql.Column;
import org.apache.spark.sql.Dataset;
import org.apache.spark.sql.Row;
import org.apache.spark.sql.SparkSession;
import org.apache.spark.sql.types.ArrayType;
import org.apache.spark.sql.types.DataType;
import org.apache.spark.sql.types.DataTypes;
import software.aws.solution.clickstream.util.*;
import software.aws.solution.clickstream.transformer.*;

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
import static org.apache.spark.sql.functions.max;
import static org.apache.spark.sql.functions.min;
import static org.apache.spark.sql.functions.min_by;
import static org.apache.spark.sql.functions.regexp_extract;
import static org.apache.spark.sql.functions.struct;
import static org.apache.spark.sql.functions.timestamp_seconds;
import static org.apache.spark.sql.functions.to_date;
import static software.aws.solution.clickstream.util.ContextUtil.PROJECT_ID_PROP;
import static software.aws.solution.clickstream.util.DatasetUtil.APP_ID;
import static software.aws.solution.clickstream.util.DatasetUtil.APP_INFO;
import static software.aws.solution.clickstream.util.DatasetUtil.ATTRIBUTES;
import static software.aws.solution.clickstream.util.DatasetUtil.CHANNEL;
import static software.aws.solution.clickstream.util.DatasetUtil.COL_PAGE_REFERER;
import static software.aws.solution.clickstream.util.DatasetUtil.DATA;
import static software.aws.solution.clickstream.util.DatasetUtil.DATA_SCHEMA_V2_FILE_PATH;
import static software.aws.solution.clickstream.util.DatasetUtil.DEVICE;
import static software.aws.solution.clickstream.util.DatasetUtil.DEVICE_ID;
import static software.aws.solution.clickstream.util.DatasetUtil.DEVICE_ID_LIST;
import static software.aws.solution.clickstream.util.DatasetUtil.EVENT_APP_END;
import static software.aws.solution.clickstream.util.DatasetUtil.EVENT_APP_START;
import static software.aws.solution.clickstream.util.DatasetUtil.EVENT_BUNDLE_SEQUENCE_ID;
import static software.aws.solution.clickstream.util.DatasetUtil.EVENT_DATE;
import static software.aws.solution.clickstream.util.DatasetUtil.EVENT_FIRST_OPEN;
import static software.aws.solution.clickstream.util.DatasetUtil.EVENT_FIRST_VISIT;
import static software.aws.solution.clickstream.util.DatasetUtil.EVENT_ID;
import static software.aws.solution.clickstream.util.DatasetUtil.EVENT_NAME;
import static software.aws.solution.clickstream.util.DatasetUtil.EVENT_PARAM_DOUBLE_VALUE;
import static software.aws.solution.clickstream.util.DatasetUtil.EVENT_PARAM_FLOAT_VALUE;
import static software.aws.solution.clickstream.util.DatasetUtil.EVENT_PARAM_INT_VALUE;
import static software.aws.solution.clickstream.util.DatasetUtil.EVENT_PARAM_KEY;
import static software.aws.solution.clickstream.util.DatasetUtil.EVENT_PARAM_STRING_VALUE;
import static software.aws.solution.clickstream.util.DatasetUtil.EVENT_PREVIOUS_TIMESTAMP;
import static software.aws.solution.clickstream.util.DatasetUtil.EVENT_PROFILE_SET;
import static software.aws.solution.clickstream.util.DatasetUtil.EVENT_TIMESTAMP;
import static software.aws.solution.clickstream.util.DatasetUtil.EVENT_VALUE_IN_USD;
import static software.aws.solution.clickstream.util.DatasetUtil.FIRST_REFERER;
import static software.aws.solution.clickstream.util.DatasetUtil.FIRST_TRAFFIC_MEDIUM;
import static software.aws.solution.clickstream.util.DatasetUtil.FIRST_TRAFFIC_SOURCE;
import static software.aws.solution.clickstream.util.DatasetUtil.FIRST_TRAFFIC_SOURCE_TYPE;
import static software.aws.solution.clickstream.util.DatasetUtil.FIRST_VISIT_DATE;
import static software.aws.solution.clickstream.util.DatasetUtil.GEO;
import static software.aws.solution.clickstream.util.DatasetUtil.GEO_FOR_ENRICH;
import static software.aws.solution.clickstream.util.DatasetUtil.ID;
import static software.aws.solution.clickstream.util.DatasetUtil.INGEST_TIMESTAMP;
import static software.aws.solution.clickstream.util.DatasetUtil.ITEMS;
import static software.aws.solution.clickstream.util.DatasetUtil.LOCALE;
import static software.aws.solution.clickstream.util.DatasetUtil.NEW_USER_COUNT;
import static software.aws.solution.clickstream.util.DatasetUtil.PLATFORM;
import static software.aws.solution.clickstream.util.DatasetUtil.PROJECT_ID;
import static software.aws.solution.clickstream.util.DatasetUtil.PROPERTIES;
import static software.aws.solution.clickstream.util.DatasetUtil.PROP_PAGE_REFERRER;
import static software.aws.solution.clickstream.util.DatasetUtil.REFERER;
import static software.aws.solution.clickstream.util.DatasetUtil.REFERRER;
import static software.aws.solution.clickstream.util.DatasetUtil.TABLE_ETL_USER_CHANNEL;
import static software.aws.solution.clickstream.util.DatasetUtil.TABLE_ETL_USER_DEVICE_ID;
import static software.aws.solution.clickstream.util.DatasetUtil.TABLE_ETL_USER_PAGE_REFERER;
import static software.aws.solution.clickstream.util.DatasetUtil.TABLE_ETL_USER_TRAFFIC_SOURCE;
import static software.aws.solution.clickstream.util.DatasetUtil.TABLE_VERSION_SUFFIX_V1;
import static software.aws.solution.clickstream.util.DatasetUtil.TIMESTAMP;
import static software.aws.solution.clickstream.util.DatasetUtil.TRAFFIC_SOURCE;
import static software.aws.solution.clickstream.util.DatasetUtil.TRAFFIC_SOURCE_MEDIUM;
import static software.aws.solution.clickstream.util.DatasetUtil.TRAFFIC_SOURCE_NAME;
import static software.aws.solution.clickstream.util.DatasetUtil.TRAFFIC_SOURCE_SOURCE;
import static software.aws.solution.clickstream.util.DatasetUtil.UA;
import static software.aws.solution.clickstream.util.DatasetUtil.UA_BROWSER;
import static software.aws.solution.clickstream.util.DatasetUtil.UA_BROWSER_VERSION;
import static software.aws.solution.clickstream.util.DatasetUtil.UA_DEVICE;
import static software.aws.solution.clickstream.util.DatasetUtil.UA_DEVICE_CATEGORY;
import static software.aws.solution.clickstream.util.DatasetUtil.UA_OS;
import static software.aws.solution.clickstream.util.DatasetUtil.UA_OS_VERSION;
import static software.aws.solution.clickstream.util.DatasetUtil.USER_FIRST_TOUCH_TIMESTAMP;
import static software.aws.solution.clickstream.util.DatasetUtil.USER_ID;
import static software.aws.solution.clickstream.util.DatasetUtil.USER_LTV;
import static software.aws.solution.clickstream.util.DatasetUtil.USER_PROPERTIES;
import static software.aws.solution.clickstream.util.DatasetUtil.USER_PSEUDO_ID;
import static software.aws.solution.clickstream.util.DatasetUtil.addSchemaToMap;
import static software.aws.solution.clickstream.util.DatasetUtil.getAggItemDataset;
import static software.aws.solution.clickstream.util.DatasetUtil.loadFullItemDataset;
import static software.aws.solution.clickstream.util.DatasetUtil.loadFullUserDataset;
import static software.aws.solution.clickstream.util.DatasetUtil.loadFullUserRefererDataset;
import static software.aws.solution.clickstream.util.DatasetUtil.readDatasetFromPath;
import static software.aws.solution.clickstream.util.DatasetUtil.saveFullDatasetToPath;
import static software.aws.solution.clickstream.util.DatasetUtil.saveIncrementalDatasetToPath;
import static software.aws.solution.clickstream.transformer.MaxLengthTransformer.runMaxLengthTransformerForEvent;
import static software.aws.solution.clickstream.transformer.MaxLengthTransformer.runMaxLengthTransformerForEventParameter;
import static software.aws.solution.clickstream.transformer.MaxLengthTransformer.runMaxLengthTransformerForItem;
import static software.aws.solution.clickstream.transformer.MaxLengthTransformer.runMaxLengthTransformerForUser;


@Slf4j
public final class TransformerV2 {
    private final Cleaner cleaner = new Cleaner();
    private final EventParamsConverter eventParamsConverter = new EventParamsConverter();
    private final UserPropertiesConverter userPropertiesConverter = new UserPropertiesConverter();
    private final KvConverter kvConverter = new KvConverter();

    private static Dataset<Row> getUserTrafficSourceDataset(final Dataset<Row> userDataset, final long newUserCount) {
        Column dataCol = col("data");
        Column attributesCol = dataCol.getField(ATTRIBUTES);
        SparkSession spark = userDataset.sparkSession();
        String tableName = TABLE_ETL_USER_TRAFFIC_SOURCE;

        Dataset<Row> newUserTrafficSourceDataset = userDataset
                .withColumn(TRAFFIC_SOURCE_MEDIUM, get_json_object(attributesCol, "$._traffic_source_medium").cast(DataTypes.StringType))
                .withColumn(TRAFFIC_SOURCE_NAME, get_json_object(attributesCol, "$._traffic_source_name").cast(DataTypes.StringType))
                .withColumn(TRAFFIC_SOURCE_SOURCE, get_json_object(attributesCol, "$._traffic_source_source").cast(DataTypes.StringType))
                .filter(col(TRAFFIC_SOURCE_SOURCE).isNotNull())
                .select(APP_ID,
                        USER_PSEUDO_ID,
                        TRAFFIC_SOURCE_MEDIUM,
                        TRAFFIC_SOURCE_NAME,
                        TRAFFIC_SOURCE_SOURCE,
                        EVENT_TIMESTAMP);

        long newTrafficSourceCount = newUserTrafficSourceDataset.count();
        log.info(NEW_USER_COUNT + "=" + newUserCount + ", newTrafficSourceCount=" + newTrafficSourceCount);

        DatasetUtil.PathInfo pathInfo = addSchemaToMap(newUserTrafficSourceDataset, tableName, TABLE_VERSION_SUFFIX_V1);

        if (newTrafficSourceCount > 0) {
            Dataset<Row> newAggUserTrafficSourceDataset = getAggTrafficSourceDataset(newUserTrafficSourceDataset);
            log.info("newAggUserTrafficSourceDataset count:" + newAggUserTrafficSourceDataset.count());
            String path = saveIncrementalDatasetToPath(pathInfo.getIncremental(), newAggUserTrafficSourceDataset);
            Dataset<Row> allTrafficSourceDataset = readDatasetFromPath(spark, path, ContextUtil.getUserKeepDays());
            log.info("allTrafficSourceDataset count:" + allTrafficSourceDataset.count());
            Dataset<Row> aggTrafficSourceDataset = getAggTrafficSourceDataset(allTrafficSourceDataset);
            log.info("aggTrafficSourceDataset count:" + aggTrafficSourceDataset.count());
            saveFullDatasetToPath(pathInfo.getFull(), aggTrafficSourceDataset);
            return aggTrafficSourceDataset;
        } else if (newUserCount > 0 && newTrafficSourceCount == 0) {
            return readDatasetFromPath(spark, pathInfo.getFull(), ContextUtil.getUserKeepDays());
        } else {
            return null;
        }
    }

    private static Dataset<Row> getAggTrafficSourceDataset(final Dataset<Row> allTrafficSourceDataset) {
        return allTrafficSourceDataset.groupBy(APP_ID, USER_PSEUDO_ID)
                .agg(min_by(struct(col(TRAFFIC_SOURCE_MEDIUM),
                                col(TRAFFIC_SOURCE_NAME),
                                col(TRAFFIC_SOURCE_SOURCE),
                                col(EVENT_TIMESTAMP)),
                        col(EVENT_TIMESTAMP)).alias("traffic_source_source"))
                .select(col(APP_ID), col(USER_PSEUDO_ID), expr("traffic_source_source.*"))
                .distinct();
    }

    private static Dataset<Row> getPageRefererDataset(final Dataset<Row> userDataset,
                                                      final long newUserCount) {
        Column dataCol = col("data");
        Column attributesCol = dataCol.getField(ATTRIBUTES);
        SparkSession spark = userDataset.sparkSession();
        String tableName = TABLE_ETL_USER_PAGE_REFERER;

        Dataset<Row> newUserRefererDataset = userDataset
                .withColumn(COL_PAGE_REFERER,
                        coalesce(
                                get_json_object(attributesCol, "$." + PROP_PAGE_REFERRER).cast(DataTypes.StringType),
                                get_json_object(attributesCol, "$." + COL_PAGE_REFERER).cast(DataTypes.StringType),
                                get_json_object(attributesCol, "$." + REFERER).cast(DataTypes.StringType),
                                get_json_object(attributesCol, "$." + REFERRER).cast(DataTypes.StringType)
                        ))
                .filter(col(COL_PAGE_REFERER).isNotNull())
                .select(APP_ID, USER_PSEUDO_ID, COL_PAGE_REFERER, EVENT_TIMESTAMP);

        long newRefererCount = newUserRefererDataset.count();
        log.info(NEW_USER_COUNT + "=" + newUserCount + ", newRefererCount=" + newRefererCount);

        DatasetUtil.PathInfo pathInfo = addSchemaToMap(newUserRefererDataset, tableName, TABLE_VERSION_SUFFIX_V1);

        if (newRefererCount > 0) {
            return loadFullUserRefererDataset(newUserRefererDataset, pathInfo);
        } else if (newUserCount > 0 && newRefererCount == 0) {
            return readDatasetFromPath(spark, pathInfo.getFull(), ContextUtil.getUserKeepDays());
        } else {
            return null;
        }
    }


    private static Dataset<Row> getUserDeviceIdDataset(final Dataset<Row> userDataset, final long newUserCount) {
        Column dataCol = col("data");
        SparkSession spark = userDataset.sparkSession();
        String tableName = TABLE_ETL_USER_DEVICE_ID;

        Dataset<Row> newUserDeviceIdDataset = userDataset
                .withColumn(DEVICE_ID, dataCol.getItem(DEVICE_ID).cast(DataTypes.StringType))
                .filter(col(DEVICE_ID).isNotNull())
                .withColumn(DEVICE_ID_LIST, array(col(DEVICE_ID)))
                .select(APP_ID, USER_PSEUDO_ID, DEVICE_ID_LIST, EVENT_TIMESTAMP);

        long newDeviceIdCount = newUserDeviceIdDataset.count();
        log.info(NEW_USER_COUNT + "=" + newUserCount + ", newDeviceIdCount=" + newDeviceIdCount);
        DatasetUtil.PathInfo pathInfo = addSchemaToMap(newUserDeviceIdDataset, tableName, TABLE_VERSION_SUFFIX_V1);

        if (newDeviceIdCount > 0) {
            Dataset<Row> newAggUserDeviceIdDataset = getAggUserDeviceIdDataset(newUserDeviceIdDataset);
            log.info("newAggUserDeviceIdDataset count:" + newAggUserDeviceIdDataset.count());
            String path = saveIncrementalDatasetToPath(pathInfo.getIncremental(), newAggUserDeviceIdDataset);
            Dataset<Row> allUserDeviceIdDataset = readDatasetFromPath(spark, path,
                    ContextUtil.getUserKeepDays());
            log.info("allUserDeviceIdDataset count:" + allUserDeviceIdDataset.count());
            Dataset<Row> aggUserDeviceIdDataset = getAggUserDeviceIdDataset(allUserDeviceIdDataset);
            log.info("aggUserDeviceIdDataset count:" + allUserDeviceIdDataset.count());
            saveFullDatasetToPath(pathInfo.getFull(), aggUserDeviceIdDataset);
            return aggUserDeviceIdDataset;
        } else if (newUserCount > 0 && newDeviceIdCount == 0) {
            return readDatasetFromPath(spark, pathInfo.getFull(), ContextUtil.getUserKeepDays());
        } else {
            return null;
        }
    }

    private static Dataset<Row> getAggUserDeviceIdDataset(final Dataset<Row> allUserDeviceIdDataset) {
        Map<String, String> aggMap = new HashMap<>();
        aggMap.put(DEVICE_ID_LIST, "collect_set");
        aggMap.put(EVENT_TIMESTAMP, "max");

        return allUserDeviceIdDataset
                .groupBy(col(APP_ID), col(USER_PSEUDO_ID))
                .agg(aggMap)
                .withColumnRenamed("max(event_timestamp)", EVENT_TIMESTAMP)
                .withColumnRenamed("collect_set(device_id_list)", "device_id_list_list")
                .withColumn(DEVICE_ID_LIST, array_sort(array_distinct(flatten(col("device_id_list_list")))))
                .select(APP_ID, USER_PSEUDO_ID, DEVICE_ID_LIST, EVENT_TIMESTAMP)
                .distinct();
    }

    private static Dataset<Row> getAggUserChannelDataset(final Dataset<Row> newUserChannelDataset) {
        return newUserChannelDataset.groupBy(APP_ID, USER_PSEUDO_ID)
                .agg(min_by(struct(
                                col(CHANNEL),
                                col(EVENT_TIMESTAMP)),
                        col(EVENT_TIMESTAMP)).alias("c"))
                .select(col(APP_ID), col(USER_PSEUDO_ID), expr("c.*"))
                .distinct();
    }

    private static Dataset<Row> getUserChannelDataset(final Dataset<Row> userDataset,
                                                      final long newUserCount) {
        Column dataCol = col("data");
        Column attributesCol = dataCol.getField(ATTRIBUTES);
        SparkSession spark = userDataset.sparkSession();
        String tableName = TABLE_ETL_USER_CHANNEL;

        Dataset<Row> newUserChannelDataset = userDataset
                .withColumn(CHANNEL,
                        get_json_object(attributesCol, "$." + CHANNEL).cast(DataTypes.StringType))
                .filter(col(CHANNEL).isNotNull())
                .select(APP_ID, USER_PSEUDO_ID, CHANNEL, EVENT_TIMESTAMP);

        long newChannelDatasetCount = newUserChannelDataset.count();
        log.info(NEW_USER_COUNT + "=" + newUserCount + ", newChannelCount=" + newChannelDatasetCount);

        DatasetUtil.PathInfo pathInfo = addSchemaToMap(newUserChannelDataset, tableName, TABLE_VERSION_SUFFIX_V1);

        if (newChannelDatasetCount > 0) {
            Dataset<Row> newAggUserChannelDataset = getAggUserChannelDataset(newUserChannelDataset);
            log.info("newAggUserChannelDataset count:" + newAggUserChannelDataset.count());
            String path = saveIncrementalDatasetToPath(pathInfo.getIncremental(), newAggUserChannelDataset);
            Dataset<Row> allUserChannelDataset = readDatasetFromPath(spark, path, ContextUtil.getUserKeepDays());
            log.info("allUserChannelDataset count:" + allUserChannelDataset.count());
            Dataset<Row> aggUserChannelDataset = getAggUserChannelDataset(allUserChannelDataset);
            log.info("aggUserChannelDataset count:" + aggUserChannelDataset.count());
            saveFullDatasetToPath(pathInfo.getFull(), aggUserChannelDataset);
            return aggUserChannelDataset;
        } else if (newUserCount > 0 && newChannelDatasetCount == 0) {
            return readDatasetFromPath(spark, pathInfo.getFull(), ContextUtil.getUserKeepDays());
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
                TABLE_ETL_USER_DEVICE_ID, TABLE_VERSION_SUFFIX_V1, userKeepDays
        ));
        l.add(new DatasetUtil.TableInfo(
                TABLE_ETL_USER_PAGE_REFERER, TABLE_VERSION_SUFFIX_V1, userKeepDays
        ));
        l.add(new DatasetUtil.TableInfo(
                TABLE_ETL_USER_TRAFFIC_SOURCE, TABLE_VERSION_SUFFIX_V1, userKeepDays
        ));
        l.add(new DatasetUtil.TableInfo(
                TABLE_ETL_USER_CHANNEL, TABLE_VERSION_SUFFIX_V1, userKeepDays
        ));
        l.add(new DatasetUtil.TableInfo(
                TableName.USER.getTableName(), TABLE_VERSION_SUFFIX_V1, userKeepDays
        ));
        l.add(new DatasetUtil.TableInfo(
                TableName.ITEM.getTableName(), TABLE_VERSION_SUFFIX_V1, itemKeepDays
        ));
        DatasetUtil.mergeIncrementalTables(sparkSession, l);
    }

    public List<Dataset<Row>> transform(final Dataset<Row> dataset) {
        log.info(new ETLMetric(dataset, "transform enter").toString());
        Dataset<Row> cleanedDataset = cleaner.clean(dataset, DATA_SCHEMA_V2_FILE_PATH);
        ContextUtil.cacheDataset(cleanedDataset);
        log.info(new ETLMetric(cleanedDataset, "after clean").toString());
        Column dataCol = col("data");

        Dataset<Row> dataset0 = cleanedDataset.withColumn(APP_ID, dataCol.getField(APP_ID))
                .withColumn(EVENT_ID, dataCol.getItem(EVENT_ID))
                .withColumn(USER_PSEUDO_ID, dataCol.getField("unique_id").cast(DataTypes.StringType))
                .withColumn(EVENT_NAME, dataCol.getField("event_type"))
                .withColumn(EVENT_DATE, to_date(timestamp_seconds(dataCol.getItem(TIMESTAMP).$div(1000))))
                .withColumn(EVENT_TIMESTAMP, dataCol.getItem(TIMESTAMP))
                .withColumn(USER_FIRST_TOUCH_TIMESTAMP, get_json_object(dataCol.getField("user"), "$._user_first_touch_timestamp.value").cast(DataTypes.LongType))
                .withColumn(USER_ID, get_json_object(dataCol.getField("user"), "$._user_id.value").cast(DataTypes.StringType));
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
        String projectId = System.getProperty(PROJECT_ID_PROP);
        Column dataCol = col("data");
        Dataset<Row> dataset1 = dataset.withColumn(EVENT_PREVIOUS_TIMESTAMP, dataCol.getField(EVENT_PREVIOUS_TIMESTAMP).cast(DataTypes.LongType))
                .withColumn(EVENT_VALUE_IN_USD, dataCol.getItem(EVENT_VALUE_IN_USD).cast(DataTypes.FloatType))
                .withColumn(PLATFORM, dataCol.getItem(PLATFORM))
                .withColumn("project_id", lit(projectId))
                .withColumn("ingest_timestamp", col("ingest_time"));

        Dataset<Row> dataset2 = convertUri(dataset1, "event_bundle_sequence_id", DataTypes.LongType);
        Dataset<Row> dataset3 = convertDevice(dataset2);
        Dataset<Row> dataset4 = convertGeo(dataset3);
        Dataset<Row> dataset5 = convertTrafficSource(dataset4);
        Dataset<Row> datasetFinal = convertItems(dataset5);

        Column[] selectedColumns = new Column[]{
                col(EVENT_ID),
                col(EVENT_DATE),
                col(EVENT_TIMESTAMP),
                col(EVENT_PREVIOUS_TIMESTAMP),
                col(EVENT_NAME),
                col(EVENT_VALUE_IN_USD),
                col(EVENT_BUNDLE_SEQUENCE_ID),
                col(INGEST_TIMESTAMP),
                col(DEVICE),
                col(GEO),
                col(TRAFFIC_SOURCE),
                col(APP_INFO),
                col(PLATFORM),
                col(PROJECT_ID),
                col(ITEMS),
                col(USER_PSEUDO_ID),
                col(USER_ID),
                col(UA),
                col(GEO_FOR_ENRICH),
        };

        Dataset<Row> datasetFinal2 = datasetFinal.select(selectedColumns);

        Dataset<Row> datasetFinal3 = runMaxLengthTransformerForEvent(datasetFinal2);

        log.info("extractEvent done");
        return datasetFinal3.select(
                selectedColumns
        );

    }



    private Dataset<Row> extractEventParameter(final Dataset<Row> dataset) {
        Dataset<Row> dataset1 = eventParamsConverter.transform(dataset);
        Dataset<Row> dataset2 = dataset1.select(
                col(APP_ID),
                col(EVENT_DATE),
                col(EVENT_TIMESTAMP),
                col(EVENT_ID),
                col(EVENT_NAME),
                col("event_params"));

        Column[] selectColumns = new Column[] {
                col(APP_ID),
                col(EVENT_DATE),
                col(EVENT_TIMESTAMP),
                col(EVENT_ID),
                col(EVENT_NAME),
                col(EVENT_PARAM_KEY),
                col(EVENT_PARAM_DOUBLE_VALUE),
                col(EVENT_PARAM_FLOAT_VALUE),
                col(EVENT_PARAM_INT_VALUE),
                col(EVENT_PARAM_STRING_VALUE)
        };
        Dataset<Row> dataset3 = explodeKeyValue(dataset2, "event_params", "event_param_")
                .select(selectColumns);

        Dataset<Row> datasetOut = runMaxLengthTransformerForEventParameter(dataset3);

        return datasetOut.select(selectColumns);
    }

    private Optional<Dataset<Row>> extractItem(final Dataset<Row> dataset) {
        Column dataCol = col("data");
        ArrayType itemsType = DataTypes.createArrayType(DataTypes.StringType);
        String itemJson = "item_json";
        Dataset<Row> datasetItems = dataset
                .withColumn(itemJson, explode(from_json(dataCol.getField(ITEMS), itemsType)))
                .filter(col(itemJson).isNotNull());

        List<String> excludedAttributes = new ArrayList<>();
        excludedAttributes.add(ID);

        Dataset<Row> dataset1 = kvConverter.transform(datasetItems, col(itemJson), PROPERTIES, excludedAttributes);

        Column[] selectedColumns = new Column[] {
                col(APP_ID),
                col(EVENT_DATE),
                col(EVENT_TIMESTAMP),
                col(ID),
                col(PROPERTIES)
        };

        Dataset<Row> newItemsDataset1 = dataset1
                .withColumn(ID, get_json_object(col(itemJson), "$." + ID).cast(DataTypes.StringType))
                .filter(col(ID).isNotNull())
                .select(
                        selectedColumns
                ).distinct();

        String tableName = TableName.ITEM.getTableName();
        DatasetUtil.PathInfo pathInfo = addSchemaToMap(newItemsDataset1, tableName, TABLE_VERSION_SUFFIX_V1);

        log.info("newItemsDataset count:" + newItemsDataset1.count());

        if (newItemsDataset1.count() == 0) {
            return Optional.empty();
        }

        Dataset<Row> newItemsDatasetOut = runMaxLengthTransformerForItem(newItemsDataset1);

        Dataset<Row> newAggeItemsDataset = getAggItemDataset(newItemsDatasetOut.select(selectedColumns));
        loadFullItemDataset(newAggeItemsDataset, pathInfo);

        return Optional.of(newAggeItemsDataset);
    }



    private Optional<Dataset<Row>> extractUser(final Dataset<Row> dataset) {

        Dataset<Row> newUserEventDataset = dataset
                .filter(col(USER_PSEUDO_ID).isNotNull().and(
                        col(EVENT_NAME).isin(
                                "user_profile_set",
                                "_user_profile_set",
                                EVENT_PROFILE_SET,
                                EVENT_FIRST_OPEN,
                                EVENT_FIRST_VISIT,
                                EVENT_APP_END,
                                EVENT_APP_START
                        )
                ));

        long newUserEventCount = newUserEventDataset.count();
        log.info("newUserEventDataset: " + newUserEventCount);

        Dataset<Row> newUniqueUserDataset = newUserEventDataset
                .select(col(APP_ID), col(USER_PSEUDO_ID), col(EVENT_DATE), col(EVENT_TIMESTAMP), col(USER_FIRST_TOUCH_TIMESTAMP))
                .groupBy(col(APP_ID), col(USER_PSEUDO_ID))
                .agg(
                        max(EVENT_TIMESTAMP).alias(EVENT_TIMESTAMP),
                        max(EVENT_DATE).alias(EVENT_DATE),
                        min(USER_FIRST_TOUCH_TIMESTAMP).alias(USER_FIRST_TOUCH_TIMESTAMP)
                )
                .select(
                        col(APP_ID),
                        col(EVENT_DATE),
                        col(USER_PSEUDO_ID),
                        col(EVENT_TIMESTAMP),
                        coalesce(col(USER_FIRST_TOUCH_TIMESTAMP), col(EVENT_TIMESTAMP)).alias(USER_FIRST_TOUCH_TIMESTAMP)
                );

        long newUserCount = newUniqueUserDataset.count();
        log.info("newUniqueUserDataset: " + newUserCount);

        // for `DeviceId` get from event: _app_start
        Dataset<Row> appStartDataset = newUserEventDataset.filter(col(EVENT_NAME).isin(EVENT_APP_START));
        log.info("appStartDataset count: " + appStartDataset.count());
        Dataset<Row> userDeviceIdDataset = getUserDeviceIdDataset(appStartDataset, newUserCount);

        // for `PageReferer` and `Channel` get from events: _first_open, _first_visit
        Dataset<Row> firstVisitDataset = newUserEventDataset.filter(col(EVENT_NAME).isin(EVENT_FIRST_OPEN, EVENT_FIRST_VISIT));
        log.info("firstVisitDataset count: " + firstVisitDataset.count());
        Dataset<Row> userReferrerDataset = getPageRefererDataset(firstVisitDataset, newUserCount);
        Dataset<Row> userChannelDataset = getUserChannelDataset(firstVisitDataset, newUserCount);

        // for `TrafficSource` get from event: _app_end
        Dataset<Row> appEndDataset = newUserEventDataset.filter(col(EVENT_NAME).equalTo(EVENT_APP_END));
        log.info("appEndDataset count: " + appEndDataset.count());
        Dataset<Row> userTrafficSourceDataset = getUserTrafficSourceDataset(appEndDataset, newUserCount);

        // for user_properties and others get from _profile_set
        Dataset<Row> profileSetDataset = newUserEventDataset
                .filter(col(EVENT_NAME).isin("user_profile_set", "_user_profile_set", EVENT_PROFILE_SET));
        log.info("profileSetDataset count: " + profileSetDataset.count());

        Dataset<Row> newProfileSetDataset = this.userPropertiesConverter.transform(profileSetDataset);

        Dataset<Row> newUserProfileMainDataset = newProfileSetDataset
                .select(
                        APP_ID,
                        EVENT_DATE,
                        EVENT_TIMESTAMP,
                        USER_ID,
                        USER_PSEUDO_ID,
                        USER_PROPERTIES,
                        USER_LTV
                ).distinct();

        String tableName = TableName.USER.getTableName();
        DatasetUtil.PathInfo pathInfo = addSchemaToMap(newUserProfileMainDataset, tableName, TABLE_VERSION_SUFFIX_V1);

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

        Dataset<Row> userPropsDataset = loadFullUserDataset(newUserProfileMainDataset, pathInfo);
        userPropsDataset = reRepartitionUserDataset(userPropsDataset);

        Column userPseudoIdCol = newUniqueUserDataset.col(USER_PSEUDO_ID);
        Column appIdCol = newUniqueUserDataset.col(APP_ID);

        Column userIdJoinForUserPropertiesUserId = userPseudoIdCol.equalTo(userPropsDataset.col(USER_PSEUDO_ID)).and(appIdCol.equalTo(userPropsDataset.col(APP_ID)));
        Column userIdJoinForDeviceId = userPseudoIdCol.equalTo(userDeviceIdDataset.col(USER_PSEUDO_ID)).and(appIdCol.equalTo(userDeviceIdDataset.col(APP_ID)));
        Column userIdJoinForTrafficSource = userPseudoIdCol.equalTo(userTrafficSourceDataset.col(USER_PSEUDO_ID)).and(appIdCol.equalTo(userTrafficSourceDataset.col(APP_ID)));
        Column userIdJoinForPageReferrer = userPseudoIdCol.equalTo(userReferrerDataset.col(USER_PSEUDO_ID)).and(appIdCol.equalTo(userReferrerDataset.col(APP_ID)));
        Column userIdJoinForChannel = userPseudoIdCol.equalTo(userChannelDataset.col(USER_PSEUDO_ID)).and(appIdCol.equalTo(userChannelDataset.col(APP_ID)));

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
                        newUniqueUserDataset.col(EVENT_DATE),
                        newUniqueUserDataset.col(EVENT_TIMESTAMP),
                        col(USER_ID),
                        userPseudoIdCol,
                        newUniqueUserDataset.col(USER_FIRST_TOUCH_TIMESTAMP),
                        col(USER_PROPERTIES),
                        col(USER_LTV),
                        timestamp_seconds(newUniqueUserDataset.col(USER_FIRST_TOUCH_TIMESTAMP).$div(1000)).cast(DataTypes.DateType).alias(FIRST_VISIT_DATE),
                        col(COL_PAGE_REFERER).alias(FIRST_REFERER),
                        col(TRAFFIC_SOURCE_NAME).alias(FIRST_TRAFFIC_SOURCE_TYPE),
                        col(TRAFFIC_SOURCE_MEDIUM).alias(FIRST_TRAFFIC_MEDIUM),
                        col(TRAFFIC_SOURCE_SOURCE).alias(FIRST_TRAFFIC_SOURCE),
                        col(DEVICE_ID_LIST),
                        col(CHANNEL)
                        );

        Dataset<Row> joinedPossibleUpdateUserDatasetRt2 = runMaxLengthTransformerForUser(joinedPossibleUpdateUserDatasetRt1);

        Dataset<Row> joinedPossibleUpdateUserDatasetRt3 = joinedPossibleUpdateUserDatasetRt2.select(
                col(APP_ID),
                col(EVENT_DATE),
                col(EVENT_TIMESTAMP),
                col(USER_ID),
                col(USER_PSEUDO_ID),
                col(USER_FIRST_TOUCH_TIMESTAMP),
                col(USER_PROPERTIES),
                col(USER_LTV),
                col(FIRST_VISIT_DATE),
                col(FIRST_REFERER),
                col(FIRST_TRAFFIC_SOURCE_TYPE),
                col(FIRST_TRAFFIC_MEDIUM),
                col(FIRST_TRAFFIC_SOURCE),
                col(DEVICE_ID_LIST),
                col(CHANNEL)
        );
        return Optional.of(joinedPossibleUpdateUserDatasetRt3);
    }


    private static Dataset<Row> reRepartitionUserDataset(final Dataset<Row> userDataset) {
        return userDataset.repartition(col(APP_ID), col(USER_PSEUDO_ID));
    }

    private Dataset<Row> convertItems(final Dataset<Row> dataset) {
        DataType itemType = DataTypes.createStructType(Arrays.asList(
                DataTypes.createStructField(ID, DataTypes.StringType, true),
                DataTypes.createStructField("quantity", DataTypes.LongType, true),
                DataTypes.createStructField("price", DataTypes.DoubleType, true),
                DataTypes.createStructField("currency", DataTypes.StringType, true),
                DataTypes.createStructField("creative_name", DataTypes.StringType, true),
                DataTypes.createStructField("creative_slot", DataTypes.StringType, true)));
        DataType itemsType = DataTypes.createArrayType(itemType);
        return dataset.withColumn(ITEMS,
                from_json(col(DATA).getField(ITEMS), itemsType));

    }

    private Dataset<Row> convertUri(final Dataset<Row> dataset, final String fieldName, final DataType dataType) {
        String tmpStrFileName = fieldName + "_tmp_";
        return dataset
                .withColumn(tmpStrFileName, regexp_extract(col("uri"), fieldName + "=([^&]+)", 1))
                .withColumn(fieldName, expr("nullif (" + tmpStrFileName + ", '')").cast(dataType)).drop(tmpStrFileName);
    }

    private Dataset<Row> convertGeo(final Dataset<Row> dataset) {
        Column dataCol = col(DATA);
        return dataset.withColumn("geo", struct(lit(null).cast(DataTypes.StringType).alias("country"),
                        lit(null).cast(DataTypes.StringType).alias("continent"),
                        lit(null).cast(DataTypes.StringType).alias("sub_continent"),
                        dataCol.getItem(LOCALE).alias(LOCALE),
                        lit(null).cast(DataTypes.StringType).alias("region"),
                        lit(null).cast(DataTypes.StringType).alias("metro"),
                        lit(null).cast(DataTypes.StringType).alias("city")))
                .withColumn(GEO_FOR_ENRICH, struct(col("ip"), dataCol.getItem(LOCALE).alias(LOCALE)));
    }

    private Dataset<Row> convertTrafficSource(final Dataset<Row> dataset) {
        Column dataCol = col(DATA);
        Column attributesCol = dataCol.getField(ATTRIBUTES);
        return dataset
                .withColumn("traffic_source", struct(
                        get_json_object(attributesCol, "$._traffic_source_medium").alias("medium"),
                        get_json_object(attributesCol, "$._traffic_source_name").alias("name"),
                        get_json_object(attributesCol, "$._traffic_source_source").alias("source")));
    }

    private Dataset<Row> convertAppInfo(final Dataset<Row> dataset) {
        Column dataCol = col(DATA);
        Column attributesCol = dataCol.getField(ATTRIBUTES);

        return dataset
                .withColumn(APP_INFO, struct(
                                (dataCol.getItem(APP_ID)).alias(APP_ID),
                                (dataCol.getItem("app_package_name")).alias("id"),
                                get_json_object(attributesCol, "$." + CHANNEL).alias("install_source"),
                                (dataCol.getItem("app_version")).alias("version"),
                                dataCol.getItem("sdk_version").alias("sdk_version"),
                                dataCol.getItem("sdk_name").alias("sdk_name")
                        )
                );
    }

    private Dataset<Row> convertDevice(final Dataset<Row> dataset) {
        Column dataCol = col(DATA);
        return dataset.withColumn(DEVICE, struct(
                (dataCol.getItem("brand")).alias("mobile_brand_name"),
                (dataCol.getItem("model")).alias("mobile_model_name"),
                (dataCol.getItem("make")).alias("manufacturer"),
                (dataCol.getItem("screen_width")).alias("screen_width"),
                (dataCol.getItem("screen_height")).alias("screen_height"),
                (dataCol.getItem("carrier")).alias("carrier"),
                (dataCol.getItem("network_type")).alias("network_type"),
                (dataCol.getItem("os_version")).alias("operating_system_version"),
                (dataCol.getItem(PLATFORM)).alias("operating_system"),

                // placeholder for ua enrich fields
                lit(null).cast(DataTypes.StringType).alias(UA_BROWSER),
                lit(null).cast(DataTypes.StringType).alias(UA_BROWSER_VERSION),
                lit(null).cast(DataTypes.StringType).alias(UA_OS),
                lit(null).cast(DataTypes.StringType).alias(UA_OS_VERSION),
                lit(null).cast(DataTypes.StringType).alias(UA_DEVICE),
                lit(null).cast(DataTypes.StringType).alias(UA_DEVICE_CATEGORY),

                (dataCol.getItem("system_language")).alias("system_language"),
                (dataCol.getItem("zone_offset").$div(1000)).cast(DataTypes.LongType).alias("time_zone_offset_seconds"),
                (dataCol.getItem(DEVICE_ID)).alias("vendor_id"),
                (dataCol.getItem("device_unique_id")).alias("advertising_id"),
                (dataCol.getItem("host_name")).alias("host_name"),
                (dataCol.getItem("viewport_width")).cast(DataTypes.LongType).alias("viewport_width"),
                (dataCol.getItem("viewport_height")).cast(DataTypes.LongType).alias("viewport_height")));
    }

    public Dataset<Row> postTransform(final Dataset<Row> dataset) {
        SparkSession sparkSession = dataset.sparkSession();
        mergeIncrementalTables(sparkSession);
        return dataset.drop("ua", GEO_FOR_ENRICH);
    }

}
