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
import org.apache.spark.sql.SaveMode;
import org.apache.spark.sql.catalyst.expressions.GenericRow;
import org.apache.spark.sql.types.DataTypes;
import org.apache.spark.sql.types.DataType;
import org.apache.spark.sql.types.StructType;
import org.apache.spark.sql.types.ArrayType;
import org.apache.spark.sql.types.StructField;
import org.apache.spark.sql.SparkSession;

import org.apache.spark.sql.functions;

import java.nio.file.Paths;
import java.text.DateFormat;
import java.text.SimpleDateFormat;
import java.time.Instant;
import java.util.Map;
import java.util.HashMap;
import java.util.ArrayList;
import java.util.List;
import java.util.Arrays;
import java.util.Collections;
import java.util.Date;
import java.util.Optional;
import java.util.Objects;

import static org.apache.spark.sql.functions.col;
import static org.apache.spark.sql.functions.coalesce;
import static org.apache.spark.sql.functions.struct;
import static org.apache.spark.sql.functions.lit;
import static org.apache.spark.sql.functions.expr;
import static org.apache.spark.sql.functions.get_json_object;
import static org.apache.spark.sql.functions.to_date;
import static org.apache.spark.sql.functions.timestamp_seconds;
import static org.apache.spark.sql.functions.array;
import static org.apache.spark.sql.functions.regexp_extract;
import static org.apache.spark.sql.functions.min_by;
import static org.apache.spark.sql.functions.explode;
import static org.apache.spark.sql.functions.from_json;
import static org.apache.spark.sql.functions.array_sort;
import static org.apache.spark.sql.functions.array_distinct;
import static org.apache.spark.sql.functions.flatten;
import static org.apache.spark.sql.functions.max_by;

import static software.aws.solution.clickstream.ContextUtil.PROJECT_ID_PROP;
import static software.aws.solution.clickstream.Transformer.GEO_FOR_ENRICH;
import static software.aws.solution.clickstream.Transformer.TIMESTAMP;
import static software.aws.solution.clickstream.Transformer.PLATFORM;
import static software.aws.solution.clickstream.Transformer.ATTRIBUTES;
import static software.aws.solution.clickstream.Transformer.LOCALE;
import static software.aws.solution.clickstream.Transformer.UA_BROWSER;
import static software.aws.solution.clickstream.Transformer.UA_BROWSER_VERSION;
import static software.aws.solution.clickstream.Transformer.UA_OS;
import static software.aws.solution.clickstream.Transformer.UA_OS_VERSION;
import static software.aws.solution.clickstream.Transformer.UA_DEVICE;
import static software.aws.solution.clickstream.Transformer.UA_DEVICE_CATEGORY;
import static software.aws.solution.clickstream.Transformer.JOB_NAME_COL;


@Slf4j
public final class TransformerV2 {
    public static final String TABLE_ETL_USER_TRAFFIC_SOURCE = "etl_user_traffic_source";
    public static final String TABLE_ETL_USER_DEVICE_ID = "etl_user_device_id";
    public static final String TABLE_ETL_USER_PAGE_REFERER = "etl_user_page_referer";

    public static final String TABLE_ETL_USER_CHANNEL = "etl_user_channel";;

    public static final String UPDATE_DATE = "update_date";
    public static final String INCREMENTAL_SUFFIX = "_incremental_v1";
    public static final String FULL_SUFFIX = "_full_v1";
    public static final String DATA_SCHEMA_V2_FILE_PATH = System.getProperty("data.schema.file.path.v2", "/data_schema_v2.json");
    public static final String PROPERTIES = "properties";
    public static final String YYYYMMDD = "yyyyMMdd";
    public static final String TRAFFIC_SOURCE_MEDIUM = "_traffic_source_medium";
    public static final String TRAFFIC_SOURCE_NAME = "_traffic_source_name";
    public static final String TRAFFIC_SOURCE_SOURCE = "_traffic_source_source";
    public static final String EVENT_TIMESTAMP = "event_timestamp";
    public static final String NEW_USER_COUNT = "newUserCount";
    public static final String EVENT_NAME = "event_name";
    public static final String EVENT_DATE = "event_date";
    public static final String USER_FIRST_TOUCH_TIMESTAMP = "user_first_touch_timestamp";
    public static final String COMPRESSION = "compression";
    public static final String USER_PSEUDO_ID = "user_pseudo_id";
    public static final String EVENT_ID = "event_id";
    public static final String EVENT_PREVIOUS_TIMESTAMP = "event_previous_timestamp";
    public static final String ITEMS = "items";
    public static final String FIRST_VISIT_DATE = "first_visit_date";
    public static final String CHANNEL = "channel";
    public static final String USER_ID = "user_id";
    public static final String DEVICE_ID = "device_id";
    public static final String SNAPPY = "snappy";
    public static final String EVENT_VALUE_IN_USD = "event_value_in_usd";
    public static final String DEVICE_ID_LIST = "device_id_list";
    public static final String APP_ID = "app_id";
    public static final String REFERRER = "_referrer";
    public static final String PROP_PAGE_REFERRER = "_page" + REFERRER;
    public static final String REFERER = "_referer";
    public static final String COL_PAGE_REFERER = "_page" + REFERER;
    public static final String PAGE_VIEW = "_page_view";
    public static final String FIRST_OPEN = "_first_open";
    public static final String PROFILE_SET = "_profile_set";
    public static final String FIRST_VISIT = "_first_visit";
    private final Cleaner cleaner = new Cleaner();
    private final EventParamsConverter eventParamsConverter = new EventParamsConverter();
    private final UserPropertiesConverter userPropertiesConverter = new UserPropertiesConverter();
    private final KvConverter kvConverter = new KvConverter();
    private static Map<String, StructType> schemaMap = new HashMap<>();

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

        setSchemaMap(newUserTrafficSourceDataset, tableName);

        if (newTrafficSourceCount > 0) {
            Dataset<Row> newAggUserTrafficSourceDataset = getAggTrafficSourceDataset(newUserTrafficSourceDataset);
            log.info("newAggUserTrafficSourceDataset count:" + newAggUserTrafficSourceDataset.count());
            String path = saveIncrementalDatasetWithTableName(tableName, newAggUserTrafficSourceDataset);
            Dataset<Row> allTrafficSourceDataset = readDatasetFromPath(spark, path, ContextUtil.getUserKeepDays());
            log.info("allTrafficSourceDataset count:" + allTrafficSourceDataset.count());
            Dataset<Row> aggTrafficSourceDataset = getAggTrafficSourceDataset(allTrafficSourceDataset);
            log.info("aggTrafficSourceDataset count:" + aggTrafficSourceDataset.count());
            saveFullDataset(tableName, aggTrafficSourceDataset);
            return aggTrafficSourceDataset;
        } else if (newUserCount > 0 && newTrafficSourceCount == 0) {
            String pathFull = getPathForTable(tableName + FULL_SUFFIX);
            return readDatasetFromPath(spark, pathFull, ContextUtil.getUserKeepDays());
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

        Dataset<Row> newUserRefererDataset = userDataset.filter(col(EVENT_NAME).equalTo(FIRST_OPEN))
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

        setSchemaMap(newUserRefererDataset, tableName);

        if (newRefererCount > 0) {
            Dataset<Row> newAggUserRefererDataset = getAggUserRefererDataset(newUserRefererDataset);
            log.info("newAggUserRefererDataset count:" + newAggUserRefererDataset.count());
            String path = saveIncrementalDatasetWithTableName(tableName, newAggUserRefererDataset);
            Dataset<Row> allUserRefererDataset = readDatasetFromPath(spark, path, ContextUtil.getUserKeepDays());
            log.info("allUserRefererDataset count:" + allUserRefererDataset.count());
            Dataset<Row> aggUserRefererDataset = getAggUserRefererDataset(allUserRefererDataset);
            log.info("aggTrafficSourceDataset count:" + aggUserRefererDataset.count());
            saveFullDataset(tableName, aggUserRefererDataset);
            return aggUserRefererDataset;
        } else if (newUserCount > 0 && newRefererCount == 0) {
            String pathFull = getPathForTable(tableName + FULL_SUFFIX);
            return readDatasetFromPath(spark, pathFull, ContextUtil.getUserKeepDays());
        } else {
            return null;
        }
    }

    private static Dataset<Row> getAggUserRefererDataset(final Dataset<Row> allUserRefererDataset) {
        return allUserRefererDataset.groupBy(APP_ID, USER_PSEUDO_ID)
                .agg(min_by(struct(
                                col(COL_PAGE_REFERER),
                                col(EVENT_TIMESTAMP)),
                        col(EVENT_TIMESTAMP)).alias("page_referer"))
                .select(col(APP_ID), col(USER_PSEUDO_ID), expr("page_referer.*"))
                .distinct();
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
        setSchemaMap(newUserDeviceIdDataset, tableName);

        if (newDeviceIdCount > 0) {
            Dataset<Row> newAggUserDeviceIdDataset = getAggUserDeviceIdDataset(newUserDeviceIdDataset);
            log.info("newAggUserDeviceIdDataset count:" + newAggUserDeviceIdDataset.count());
            String path = saveIncrementalDatasetWithTableName(tableName, newAggUserDeviceIdDataset);
            Dataset<Row> allUserDeviceIdDataset = readDatasetFromPath(spark, path,
                    ContextUtil.getUserKeepDays());
            log.info("allUserDeviceIdDataset count:" + allUserDeviceIdDataset.count());
            Dataset<Row> aggUserDeviceIdDataset = getAggUserDeviceIdDataset(allUserDeviceIdDataset);
            log.info("aggUserDeviceIdDataset count:" + allUserDeviceIdDataset.count());
            saveFullDataset(tableName, aggUserDeviceIdDataset);
            return aggUserDeviceIdDataset;
        } else if (newUserCount > 0 && newDeviceIdCount == 0) {
            String pathFull = getPathForTable(tableName + FULL_SUFFIX);
            return readDatasetFromPath(spark, pathFull, ContextUtil.getUserKeepDays());
        } else {
            return null;
        }
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

        Dataset<Row> newUserChannelDataset = userDataset.filter(col(EVENT_NAME).isin(FIRST_OPEN, FIRST_VISIT, PROFILE_SET))
                .withColumn(CHANNEL,
                        get_json_object(attributesCol, "$._" + CHANNEL).cast(DataTypes.StringType))
                .filter(col(CHANNEL).isNotNull())
                .select(APP_ID, USER_PSEUDO_ID, CHANNEL, EVENT_TIMESTAMP);

        long newChannelCount = newUserChannelDataset.count();
        log.info(NEW_USER_COUNT + "=" + newUserCount + ", newChannelCount=" + newChannelCount);

        setSchemaMap(newUserChannelDataset, tableName);

        if (newChannelCount > 0) {
            Dataset<Row> newAggUserChannelDataset = getAggUserChannelDataset(newUserChannelDataset);
            log.info("newAggUserChannelDataset count:" + newAggUserChannelDataset.count());
            String path = saveIncrementalDatasetWithTableName(tableName, newAggUserChannelDataset);
            Dataset<Row> allUserChannelDataset = readDatasetFromPath(spark, path, ContextUtil.getUserKeepDays());
            log.info("allUserChannelDataset count:" + allUserChannelDataset.count());
            Dataset<Row> aggUserChannelDataset = getAggUserChannelDataset(allUserChannelDataset);
            log.info("aggTrafficSourceDataset count:" + aggUserChannelDataset.count());
            saveFullDataset(tableName, aggUserChannelDataset);
            return aggUserChannelDataset;
        } else if (newUserCount > 0 && newChannelCount == 0) {
            String pathFull = getPathForTable(tableName + FULL_SUFFIX);
            return readDatasetFromPath(spark, pathFull, ContextUtil.getUserKeepDays());
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


    private static void saveFullDataset(final String tbName, final Dataset<Row> dataset) {
        String path = getPathForTable(tbName + FULL_SUFFIX);
        overWriteDataset(path, dataset);
    }

    private static void overWriteDataset(final String path, final Dataset<Row> dataset) {
        Date now = new Date();
        DateFormat dateFormatYMD = new SimpleDateFormat(YYYYMMDD);
        String yyyyMMdd = dateFormatYMD.format(now);
        Dataset<Row> dataset1 = dataset.withColumn(UPDATE_DATE, lit(yyyyMMdd).cast(DataTypes.StringType));

        int numPartitions = dataset1.rdd().getNumPartitions();
        numPartitions = Math.max(Math.min(numPartitions, 10), 1);

        dataset1.coalesce(numPartitions).write()
                .partitionBy(UPDATE_DATE, APP_ID)
                .option(COMPRESSION, SNAPPY)
                .mode(SaveMode.Overwrite)
                .parquet(path);
    }

    private static String getPathForTable(final String tableName) {
        return Paths.get(ContextUtil.getWarehouseDir(), tableName).toString()
                .replace("s3:/", "s3://");
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

    private static String saveIncrementalDataset(final ETLRunner.TableName tableName, final Dataset<Row> newItemsDataset) {
        String path = getPathForTable(tableName.name + INCREMENTAL_SUFFIX);
        saveIncrementalDataset(path, newItemsDataset);
        return path;
    }

    private static String saveIncrementalDatasetWithTableName(final String tableName, final Dataset<Row> newItemsDataset) {
        String path = getPathForTable(tableName + INCREMENTAL_SUFFIX);
        saveIncrementalDataset(path, newItemsDataset);
        return path;
    }

    private static String saveIncrementalDataset(final String path, final Dataset<Row> newItemsDataset) {
        log.info("saveIncrementalDataset path=" + path + ", count:" + newItemsDataset.count());
        Date now = new Date();
        DateFormat dateFormatYMD = new SimpleDateFormat(YYYYMMDD);
        String yyyyMMdd = dateFormatYMD.format(now);
        Dataset<Row> newItemsDatasetSave = newItemsDataset.withColumn(UPDATE_DATE, lit(yyyyMMdd).cast(DataTypes.StringType));
        schemaMap.put(path, newItemsDatasetSave.schema());

        newItemsDatasetSave.coalesce(1).write()
                .partitionBy(UPDATE_DATE, APP_ID)
                .option(COMPRESSION, SNAPPY)
                .mode(SaveMode.Append).parquet(path);

        return path;
    }

    private static Dataset<Row> readDatasetFromPath(final SparkSession spark, final String path,
                                                    final int fromNDays) {
        Date nDaysBeforeDate = Date.from(Instant.now().minusSeconds(fromNDays * 24 * 3600L));
        StructType schemaRead = schemaMap.get(path);
        DateFormat dateFormatYMD = new SimpleDateFormat(YYYYMMDD);
        String nDaysBefore = dateFormatYMD.format(nDaysBeforeDate);
        String pathInfo = "readDatasetFromPath path=" + path;
        log.info(pathInfo + ", nDaysBefore=" + nDaysBefore + ", fromNDays=" + fromNDays);
        Dataset<Row> fullItemsDataset;
        try {
            Dataset<Row>  fullItemsDatasetRead = spark.read().schema(schemaRead).parquet(path);
            log.info(pathInfo + ", read count:" + fullItemsDatasetRead.count());

            fullItemsDataset = fullItemsDatasetRead.filter(
                            expr(String.format("%s >= '%s'", UPDATE_DATE, nDaysBefore)).and(
                                    expr(String.format("%s >= %s", EVENT_TIMESTAMP, nDaysBeforeDate.getTime()))
                            ));

        } catch (Exception e) {
            log.error(e.getMessage());
            if (e.getMessage().toLowerCase().contains("path does not exist")) {
                List<Row> dataList = new ArrayList<>();
                return spark.createDataFrame(dataList, schemaRead);
            }
            throw e;
        }
        log.info(pathInfo + ", return count:" + fullItemsDataset.count());
        return fullItemsDataset;
    }

    private static Dataset<Row> getAggItemDataset(final Dataset<Row> dataset2) {
        return dataset2.groupBy(APP_ID, "id")
                .agg(max_by(struct(expr("*")), col(EVENT_TIMESTAMP))
                        .alias("item"))
                .select(expr("item.*"))
                .distinct();

    }

    public List<Dataset<Row>> transform(final Dataset<Row> dataset) {
        log.info(new ETLMetric(dataset, "transform enter").toString());
        Dataset<Row> cleanedDataset = cleaner.clean(dataset, DATA_SCHEMA_V2_FILE_PATH);
        ContextUtil.cacheDataset(cleanedDataset);
        log.info(new ETLMetric(cleanedDataset, "after clean").toString());
        Column dataCol = col("data");

        Dataset<Row> dataset0 = cleanedDataset.withColumn(APP_ID, dataCol.getField(APP_ID))
                .withColumn(USER_PSEUDO_ID, dataCol.getField("unique_id").cast(DataTypes.StringType))
                .withColumn(EVENT_NAME, dataCol.getField("event_type"))
                .withColumn(EVENT_DATE, to_date(timestamp_seconds(dataCol.getItem(TIMESTAMP).$div(1000))))
                .withColumn(EVENT_TIMESTAMP, dataCol.getItem(TIMESTAMP))
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
        Dataset<Row> dataset1 = dataset.withColumn(EVENT_ID, dataCol.getItem(EVENT_ID))
                .withColumn(EVENT_PREVIOUS_TIMESTAMP, dataCol.getField(EVENT_PREVIOUS_TIMESTAMP).cast(DataTypes.LongType))
                .withColumn(EVENT_VALUE_IN_USD, dataCol.getItem(EVENT_VALUE_IN_USD).cast(DataTypes.FloatType))
                .withColumn(PLATFORM, dataCol.getItem(PLATFORM)).withColumn("project_id", lit(projectId))
                .withColumn("ingest_timestamp", col("ingest_time"));

        Dataset<Row> dataset2 = convertUri(dataset1, "event_bundle_sequence_id", DataTypes.LongType);
        Dataset<Row> dataset3 = convertDevice(dataset2);
        Dataset<Row> dataset4 = convertGeo(dataset3);
        Dataset<Row> dataset5 = convertTrafficSource(dataset4);
        Dataset<Row> datasetFinal = convertItems(dataset5);
        log.info("extractEvent done");
        return datasetFinal.select(EVENT_ID,
                EVENT_DATE,
                EVENT_TIMESTAMP,
                EVENT_PREVIOUS_TIMESTAMP,
                EVENT_NAME,
                EVENT_VALUE_IN_USD,
                "event_bundle_sequence_id",
                "ingest_timestamp",
                "device",
                "geo",
                "traffic_source",
                "app_info",
                "platform",
                "project_id",
                ITEMS,
                USER_PSEUDO_ID,
                USER_ID,
                "ua",
                GEO_FOR_ENRICH);
    }

    private Dataset<Row> extractEventParameter(final Dataset<Row> dataset) {
        Column dataCol = col("data");
        Dataset<Row> dataset1 = eventParamsConverter.transform(dataset);
        Dataset<Row> dataset2 = dataset1.select(
                col(APP_ID),
                col(EVENT_DATE),
                col(EVENT_TIMESTAMP),
                dataCol.getItem(EVENT_ID).cast(DataTypes.StringType).alias(EVENT_ID),
                col(EVENT_NAME),
                col("event_params"));

        return explodeKeyValue(dataset2, "event_params", "event_param_")
                .select(APP_ID, EVENT_DATE,
                        EVENT_TIMESTAMP, EVENT_ID, EVENT_NAME,
                        "event_param_key", "event_param_double_value",
                        "event_param_float_value", "event_param_int_value",
                        "event_param_string_value"
                );

    }

    private Optional<Dataset<Row>> extractItem(final Dataset<Row> dataset) {
        SparkSession spark = dataset.sparkSession();
        Column dataCol = col("data");
        ArrayType itemsType = DataTypes.createArrayType(DataTypes.StringType);
        String itemJson = "item_json";
        Dataset<Row> datasetItems = dataset
                .withColumn(itemJson, explode(from_json(dataCol.getField(ITEMS), itemsType)))
                .filter(col(itemJson).isNotNull());

        List<String> topFields = Collections.singletonList("id");
        List<String> ignoreFields = Collections.singletonList("quantity");

        List<String> excludedAttributes = new ArrayList<>();
        excludedAttributes.addAll(topFields);
        excludedAttributes.addAll(ignoreFields);

        Dataset<Row> dataset1 = kvConverter.transform(datasetItems, col(itemJson), PROPERTIES, excludedAttributes);
        Dataset<Row> dataset2 = dataset1
                .withColumn("id", get_json_object(col(itemJson), "$.id").cast(DataTypes.StringType))
                .filter(col("id").isNotNull())
                .select(
                        APP_ID,
                        EVENT_DATE,
                        EVENT_TIMESTAMP,
                        "id",
                        PROPERTIES
                ).distinct();

        String tableName = ETLRunner.TableName.ITEM.name;
        setSchemaMap(dataset2, tableName);

        if (dataset2.count() == 0) {
            return Optional.empty();
        }

        List<String> selectedFields = new ArrayList<>();
        selectedFields.add(APP_ID);
        selectedFields.add(EVENT_DATE);
        selectedFields.add(EVENT_TIMESTAMP);
        selectedFields.addAll(topFields);
        selectedFields.add(PROPERTIES);

        Column[] selectCols = selectedFields.stream().map(functions::col).toArray(Column[]::new);
        Dataset<Row> newItemsDataset = dataset2.select(selectCols);
        Dataset<Row> newAggItemsDataset = getAggItemDataset(newItemsDataset);
        long newCount = newAggItemsDataset.count();
        log.info("newAggItemsDataset count  " + newCount);

        String path = saveIncrementalDataset(ETLRunner.TableName.ITEM, newAggItemsDataset);
        Dataset<Row> fullItemsDataset = readDatasetFromPath(spark, path,
                ContextUtil.getItemKeepDays()
        );
        Dataset<Row> fullAggItemsDataset = getAggItemDataset(fullItemsDataset);
        log.info("fullAggItemsDataset count " + fullAggItemsDataset.count());
        Dataset<Row> fullAggItemsDatasetRt = fullAggItemsDataset.select(
                APP_ID,
                EVENT_DATE,
                EVENT_TIMESTAMP,
                "id",
                PROPERTIES
        );
        saveFullDataset(ETLRunner.TableName.ITEM.name, fullAggItemsDatasetRt);

        return Optional.of(newAggItemsDataset);
    }

    private Optional<Dataset<Row>> extractUser(final Dataset<Row> dataset) {
        SparkSession spark = dataset.sparkSession();
        Column dataCol = col("data");
        Dataset<Row> userDataset = dataset.filter((col(USER_PSEUDO_ID).isNotNull()));

        Dataset<Row> possibleUpdateUserIdDataset = dataset.select(col(APP_ID), col(USER_PSEUDO_ID)).distinct();

        Dataset<Row> profileSetDataset = userDataset
                .filter(col(EVENT_NAME)
                        .isin("user_profile_set", "_user_profile_set", PROFILE_SET, FIRST_OPEN));

        long newUserCount = profileSetDataset.count();
        log.info(NEW_USER_COUNT + ":" + newUserCount);

        Dataset<Row> userReferrerDataset = getPageRefererDataset(userDataset, newUserCount);
        Dataset<Row> userDeviceIdDataset = getUserDeviceIdDataset(userDataset, newUserCount);
        Dataset<Row> userTrafficSourceDataset = getUserTrafficSourceDataset(userDataset, newUserCount);
        Dataset<Row> userChannelDataset = getUserChannelDataset(userDataset, newUserCount);

        Dataset<Row> profileSetDataset1 = this.userPropertiesConverter.transform(profileSetDataset);

        Dataset<Row> newUserProfileMainDataset = profileSetDataset1
                .withColumn(FIRST_VISIT_DATE, to_date(timestamp_seconds(col(USER_FIRST_TOUCH_TIMESTAMP).$div(1000))))
                .withColumn(PLATFORM, coalesce(col(PLATFORM), dataCol.getField(PLATFORM)))
                .select(
                        APP_ID,
                        EVENT_DATE,
                        EVENT_TIMESTAMP,
                        USER_ID,
                        USER_PSEUDO_ID,
                        USER_FIRST_TOUCH_TIMESTAMP,
                        "user_properties",
                        "user_ltv",
                        FIRST_VISIT_DATE,
                        PLATFORM
                ).distinct();

        String tableName = ETLRunner.TableName.USER.name;
        setSchemaMap(newUserProfileMainDataset, tableName);
        if (newUserCount == 0) {
            return Optional.empty();
        }

        // newUserCount > 0, below dataset should not null
        Objects.requireNonNull(userReferrerDataset);
        Objects.requireNonNull(userDeviceIdDataset);
        Objects.requireNonNull(userTrafficSourceDataset);
        Objects.requireNonNull(userChannelDataset);

        log.info("newUserProfileMainDataset:" + newUserProfileMainDataset.count());

        Dataset<Row> newAggUserProfileMainDataset = getAggUserDataset(newUserProfileMainDataset);
        log.info("newAggUserProfileMainDataset count " + newAggUserProfileMainDataset.count());

        String path = saveIncrementalDataset(ETLRunner.TableName.USER, newAggUserProfileMainDataset);
        Dataset<Row> fullUsersDataset = readDatasetFromPath(spark, path, ContextUtil.getUserKeepDays());
        Dataset<Row> fullAggUserDataset = getAggUserDataset(fullUsersDataset);
        log.info("fullAggUserDataset count " + fullAggUserDataset.count());
        saveFullDataset(ETLRunner.TableName.USER.name, fullAggUserDataset);

        Column userPseudoIdCol = fullAggUserDataset.col(USER_PSEUDO_ID);
        Column appIdCol = fullAggUserDataset.col(APP_ID);
        Column eventTimestampCol =  fullAggUserDataset.col(EVENT_TIMESTAMP);

        Column userIdJoinForPossibleUpdate = userPseudoIdCol.equalTo(possibleUpdateUserIdDataset.col(USER_PSEUDO_ID)).and(appIdCol.equalTo(possibleUpdateUserIdDataset.col(APP_ID)));
        Column userIdJoinForDeviceId = userPseudoIdCol.equalTo(userDeviceIdDataset.col(USER_PSEUDO_ID)).and(appIdCol.equalTo(userDeviceIdDataset.col(APP_ID)));
        Column userIdJoinForTrafficSource = userPseudoIdCol.equalTo(userTrafficSourceDataset.col(USER_PSEUDO_ID)).and(appIdCol.equalTo(userTrafficSourceDataset.col(APP_ID)));
        Column userIdJoinForPageReferrer = userPseudoIdCol.equalTo(userReferrerDataset.col(USER_PSEUDO_ID)).and(appIdCol.equalTo(userReferrerDataset.col(APP_ID)));
        Column userIdJoinForUserChannel = userPseudoIdCol.equalTo(userChannelDataset.col(USER_PSEUDO_ID)).and(appIdCol.equalTo(userChannelDataset.col(APP_ID)));

        Dataset<Row> joinedPossibleUpdateUserDataset = fullAggUserDataset
                .join(possibleUpdateUserIdDataset, userIdJoinForPossibleUpdate, "inner")
                .join(userDeviceIdDataset, userIdJoinForDeviceId, "left")
                .join(userTrafficSourceDataset, userIdJoinForTrafficSource, "left")
                .join(userReferrerDataset, userIdJoinForPageReferrer, "left")
                .join(userChannelDataset, userIdJoinForUserChannel, "left");

        log.info("joinedPossibleUpdateUserDataset:" + joinedPossibleUpdateUserDataset.count());
        Dataset<Row> joinedPossibleUpdateUserDatasetRt = joinedPossibleUpdateUserDataset.select(appIdCol,
                col(EVENT_DATE),
                eventTimestampCol,
                col(USER_ID),
                userPseudoIdCol,
                col(PLATFORM),
                col(USER_FIRST_TOUCH_TIMESTAMP),
                col("user_properties"),
                col("user_ltv"),
                col(FIRST_VISIT_DATE),
                col(COL_PAGE_REFERER).alias("first_referer"),
                col(TRAFFIC_SOURCE_NAME).alias("first_traffic_source_type"),
                col(TRAFFIC_SOURCE_MEDIUM).alias("first_traffic_medium"),
                col(TRAFFIC_SOURCE_SOURCE).alias("first_traffic_source"),
                col(CHANNEL).alias("first_channel"),
                col(DEVICE_ID_LIST)
        );

        return Optional.of(joinedPossibleUpdateUserDatasetRt);
    }

    private static void setSchemaMap(final Dataset<Row> newUserProfileMainDataset, final String tableName) {
        StructType schema = newUserProfileMainDataset.schema().add(UPDATE_DATE, DataTypes.StringType, true);
        String pathFull = getPathForTable(tableName + FULL_SUFFIX);
        String pathIncremental = getPathForTable(tableName + INCREMENTAL_SUFFIX);
        schemaMap.put(pathFull, schema);
        schemaMap.put(pathIncremental, schema);
    }

    private Dataset<Row> getAggUserDataset(final Dataset<Row> newUserDataset) {
        return newUserDataset.groupBy(APP_ID, USER_PSEUDO_ID)
                .agg(max_by(struct(expr("*")), col(EVENT_TIMESTAMP)).alias("user"))
                .select(expr("user.*"))
                .distinct();
    }

    private Dataset<Row> convertItems(final Dataset<Row> dataset) {
        DataType itemType = DataTypes.createStructType(Arrays.asList(
                DataTypes.createStructField("id", DataTypes.StringType, true),
                DataTypes.createStructField("quantity", DataTypes.LongType, true),
                DataTypes.createStructField("price", DataTypes.DoubleType, true),
                DataTypes.createStructField("currency", DataTypes.StringType, true),
                DataTypes.createStructField("creative_name", DataTypes.StringType, true),
                DataTypes.createStructField("creative_slot", DataTypes.StringType, true)));
        DataType itemsType = DataTypes.createArrayType(itemType);
        return dataset.withColumn(ITEMS,
                from_json(col("data").getField(ITEMS), itemsType));

    }


    private Dataset<Row> convertUri(final Dataset<Row> dataset, final String fileName, final DataType dataType) {
        String tmpStrFileName = fileName + "_tmp_";
        return dataset
                .withColumn(tmpStrFileName, regexp_extract(col("uri"), fileName + "=([^&]+)", 1))
                .withColumn(fileName, expr("nullif (" + tmpStrFileName + ", '')").cast(dataType)).drop(tmpStrFileName);
    }

    private Dataset<Row> convertGeo(final Dataset<Row> dataset) {
        Column dataCol = col("data");
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
        Column dataCol = col("data");
        Column attributesCol = dataCol.getField(ATTRIBUTES);
        return dataset
                .withColumn("traffic_source", struct(
                        get_json_object(attributesCol, "$._traffic_source_medium").alias("medium"),
                        get_json_object(attributesCol, "$._traffic_source_name").alias("name"),
                        get_json_object(attributesCol, "$._traffic_source_source").alias("source")));
    }


    private Dataset<Row> convertAppInfo(final Dataset<Row> dataset) {
        Column dataCol = col("data");
        Column attributesCol = dataCol.getField(ATTRIBUTES);

        return dataset
                .withColumn("app_info", struct(
                        (dataCol.getItem(APP_ID)).alias(APP_ID),
                        (dataCol.getItem("app_package_name")).alias("id"),
                        get_json_object(attributesCol, "$._channel").alias("install_source"),
                        (dataCol.getItem("app_version")).alias("version")));
    }

    private Dataset<Row> convertDevice(final Dataset<Row> dataset) {
        Column dataCol = col("data");
        return dataset.withColumn("device", struct(
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

    private static void mergeIncrementalTables(final SparkSession sparkSession) {
        boolean forceMerge = System.getProperty("force.merge", "false").equals("true");

        // run this process daily
        if (isDatasetMergedToday(sparkSession) && !forceMerge) {
            return;
        }
        log.info("start merging incremental tables");
        int userKeepDays = ContextUtil.getUserKeepDays();
        int itemKeepDays = ContextUtil.getItemKeepDays();

        List<Object[]> l = new ArrayList<>();
        l.add(new Object[] {
                TABLE_ETL_USER_DEVICE_ID, userKeepDays
        });
        l.add(new Object[] {
                TABLE_ETL_USER_PAGE_REFERER, userKeepDays
        });
        l.add(new Object[] {
                TABLE_ETL_USER_TRAFFIC_SOURCE, userKeepDays
        });
        l.add(new Object[] {
                TABLE_ETL_USER_CHANNEL, userKeepDays
        });
        l.add(new Object[] {
                ETLRunner.TableName.USER.name, userKeepDays
        });
        l.add(new Object[] {
                ETLRunner.TableName.ITEM.name, itemKeepDays
        });

        l.forEach(it -> {
            String tableName =(String) it[0];
            int nDays = (int) it[1];
            log.info("start merge table: " + tableName);
            String pathFull = getPathForTable(tableName + FULL_SUFFIX);
            Dataset<Row> datasetFull = readDatasetFromPath(sparkSession, pathFull, nDays);
            String pathIncremental = getPathForTable(tableName + INCREMENTAL_SUFFIX);
            overWriteDataset(pathIncremental, datasetFull);
        });
    }

    private static boolean isDatasetMergedToday(final SparkSession sparkSession) {
        boolean mergedToday = false;
        Date now = new Date();
        DateFormat dateFormatYMD = new SimpleDateFormat(YYYYMMDD);
        String yyyyMMdd = dateFormatYMD.format(now);

        String statePath = getPathForTable("etl_merge_state");
        StructType schema = DataTypes.createStructType(new StructField[]{
                DataTypes.createStructField(UPDATE_DATE, DataTypes.StringType, true),
                DataTypes.createStructField(JOB_NAME_COL, DataTypes.StringType, true),
                DataTypes.createStructField("createAt", DataTypes.TimestampType, true)

        });
        Dataset<Row> existingState;
        try {
            existingState = sparkSession.read().schema(schema).parquet(statePath);
        } catch (Exception e) {
            log.error(e.getMessage());
            if (e.getMessage().toLowerCase().contains("path does not exist")) {
                List<Row> emptyList = new ArrayList<>();
                existingState = sparkSession.createDataFrame(emptyList, schema);
            } else {
                throw e;
            }
        }

        Dataset<Row> mergedState = existingState.filter(col(UPDATE_DATE).equalTo(lit(yyyyMMdd)));

        mergedToday = mergedState.count() > 0;

        if (!mergedToday) {
            List<Row> dataList = new ArrayList<>();
            dataList.add(new GenericRow(new Object[]{
                    yyyyMMdd, ContextUtil.getJobName(), new java.sql.Timestamp(new Date().getTime())
            }));
            Dataset<Row> newState = sparkSession.createDataFrame(dataList, schema);
            newState.coalesce(1).write()
                    .partitionBy(UPDATE_DATE)
                    .option(COMPRESSION, SNAPPY)
                    .mode(SaveMode.Append).parquet(statePath);
        }

        if (mergedToday) {
            log.info("Datasets merged today, detail: " + mergedState.first().json());
        }
        return mergedToday;
    }

}
