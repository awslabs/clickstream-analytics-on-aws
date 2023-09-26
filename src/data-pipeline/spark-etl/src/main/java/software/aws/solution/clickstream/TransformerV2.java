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
    public static final String UPDATE_DATE = "update_date";
    public static final String INCREMENTAL_SUFFIX = "_incremental";
    public static final String FULL_SUFFIX = "_full";
    public static final String DATA_SCHEMA_V2_FILE_PATH = "/data_schema_v2.json";
    private final Cleaner cleaner = new Cleaner();
    private final EventParamsConverter eventParamsConverter = new EventParamsConverter();
    private final UserPropertiesConverter userPropertiesConverter = new UserPropertiesConverter();
    private final KvConverter kvConverter = new KvConverter();
    private static Map<String, StructType> scheamMap = new HashMap<>();

    private static Dataset<Row> getUserTrafficSourceDataset(final Dataset<Row> userDataset, final long newUserCount) {
        Column dataCol = col("data");
        Column attributesCol = dataCol.getField(ATTRIBUTES);
        SparkSession spark = userDataset.sparkSession();
        String tableName = TABLE_ETL_USER_TRAFFIC_SOURCE;

        Dataset<Row> newUserTrafficSourceDataset = userDataset
                .withColumn("_traffic_source_medium", get_json_object(attributesCol, "$._traffic_source_medium").cast(DataTypes.StringType))
                .withColumn("_traffic_source_name", get_json_object(attributesCol, "$._traffic_source_name").cast(DataTypes.StringType))
                .withColumn("_traffic_source_source", get_json_object(attributesCol, "$._traffic_source_source").cast(DataTypes.StringType))
                .filter(col("_traffic_source_source").isNotNull())
                .select("app_id",
                        "user_id",
                        "_traffic_source_medium",
                        "_traffic_source_name",
                        "_traffic_source_source",
                        "event_timestamp");

        long newTrafficSourceCount = newUserTrafficSourceDataset.count();
        log.info("newUserCount=" + newUserCount + ", newTrafficSourceCount=" + newTrafficSourceCount);

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
        return allTrafficSourceDataset.groupBy("app_id", "user_id")
                .agg(min_by(struct(col("_traffic_source_medium"),
                        col("_traffic_source_name"),
                        col("_traffic_source_source"),
                        col("event_timestamp")),
                        col("event_timestamp")).alias("traffic_source_source"))
                .select(col("app_id"), col("user_id"), expr("traffic_source_source.*"));
    }

    private static Dataset<Row> getPageRefererDataset(final Dataset<Row> userDataset,
                                                      final long newUserCount) {
        Column dataCol = col("data");
        Column attributesCol = dataCol.getField(ATTRIBUTES);
        SparkSession spark = userDataset.sparkSession();
        String tableName = TABLE_ETL_USER_PAGE_REFERER;

        Dataset<Row> newUserRefererDataset = userDataset.filter(col("event_name").isin("_page_view", "page_view", "pageView", "PageView"))
                .withColumn("_page_referer",
                        coalesce(get_json_object(attributesCol, "$._page_referer").cast(DataTypes.StringType),
                        get_json_object(attributesCol, "$._referer").cast(DataTypes.StringType)))
                .filter(col("_page_referer").isNotNull())
                .select("app_id", "user_id", "_page_referer", "event_timestamp");

        long newRefererCount = newUserRefererDataset.count();
        log.info("newUserCount=" + newUserCount + ", newRefererCount=" + newRefererCount);

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
        Dataset<Row> aggUserRefererDataset = allUserRefererDataset.groupBy("app_id", "user_id")
                .agg(min_by(struct(
                        col("_page_referer"),
                                col("event_timestamp")),
                        col("event_timestamp")).alias("page_referer"))
                .select(col("app_id"), col("user_id"), expr("page_referer.*"));
        return aggUserRefererDataset;
    }

    private static Dataset<Row> getUserDeviceIdDataset(final Dataset<Row> userDataset, final long newUserCount) {
        Column dataCol = col("data");
        SparkSession spark = userDataset.sparkSession();
        String tableName = TABLE_ETL_USER_DEVICE_ID;

        Dataset<Row> newUserDeviceIdDataset = userDataset
                .withColumn("device_id", dataCol.getItem("device_id").cast(DataTypes.StringType))
                .filter(col("device_id").isNotNull())
                .withColumn("device_id_list", array(col("device_id")))
                .select("app_id", "user_id", "device_id_list", "event_timestamp");

        long newDeviceIdCount = newUserDeviceIdDataset.count();
        log.info("newUserCount=" + newUserCount + ", newDeviceIdCount=" + newDeviceIdCount);
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

    private static Dataset<Row> getAggUserDeviceIdDataset(final Dataset<Row> allUserDeviceIdDataset) {
        Map<String, String> aggMap = new HashMap<>();
        aggMap.put("device_id_list", "collect_set");
        aggMap.put("event_timestamp", "max");

        Dataset<Row> aggUserDeviceIdDataset = allUserDeviceIdDataset
                .groupBy(col("app_id"), col("user_id"))
                .agg(aggMap)
                .withColumnRenamed("max(event_timestamp)", "event_timestamp")
                .withColumnRenamed("collect_set(device_id_list)", "device_id_list_list")
                .withColumn("device_id_list", array_sort(array_distinct(flatten(col("device_id_list_list")))))
                .select("app_id", "user_id", "device_id_list", "event_timestamp");
        return aggUserDeviceIdDataset;
    }



    private static void saveFullDataset(final String tbName, final Dataset<Row> dataset) {
        String path = getPathForTable(tbName + FULL_SUFFIX);
        overWriteDataset(path, dataset);
    }

    private static void overWriteDataset(final String path, final Dataset<Row> dataset) {
        Date now = new Date();
        DateFormat dateFormatYMD = new SimpleDateFormat("yyyyMMdd");
        String yyyyMMdd = dateFormatYMD.format(now);
        Dataset<Row> dataset1 = dataset.withColumn(UPDATE_DATE, lit(yyyyMMdd).cast(DataTypes.StringType));

        dataset1.coalesce(1).write()
                .partitionBy(UPDATE_DATE, "app_id")
                .option("compression", "snappy")
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
        String path = getPathForTable(tableName.tableName + INCREMENTAL_SUFFIX);
        saveIncrementalDataset(path, newItemsDataset);
        return path;
    }

    private static String saveIncrementalDatasetWithTableName(final String tableName, final Dataset<Row> newItemsDataset) {
        String path = getPathForTable(tableName + INCREMENTAL_SUFFIX);
        saveIncrementalDataset(path, newItemsDataset);
        return path;
    }

    private static String saveIncrementalDataset(final String path, final Dataset<Row> newItemsDataset) {
        log.info("saveIncrementalDataset path=" + path);
        Date now = new Date();
        DateFormat dateFormatYMD = new SimpleDateFormat("yyyyMMdd");
        String yyyyMMdd = dateFormatYMD.format(now);
        Dataset<Row> newItemsDatasetSave = newItemsDataset.withColumn(UPDATE_DATE, lit(yyyyMMdd).cast(DataTypes.StringType));
        scheamMap.put(path, newItemsDatasetSave.schema());

        newItemsDatasetSave.coalesce(1).write()
                .partitionBy(UPDATE_DATE, "app_id")
                .option("compression", "snappy")
                .mode(SaveMode.Append).parquet(path);
        return path;
    }

    private static Dataset<Row> readDatasetFromPath(final SparkSession spark, final String path,
                                                    final int fromNDays) {
        log.info("readDatasetFromPath path=" + path);
        Date nDaysBeforeDate = Date.from(Instant.now().minusSeconds(fromNDays * 24 * 3600L));
        StructType schemaRead = scheamMap.get(path);
        DateFormat dateFormatYMD = new SimpleDateFormat("yyyyMMdd");
        String nDaysBefore = dateFormatYMD.format(nDaysBeforeDate);
        Dataset<Row> fullItemsDataset;
        try {
            fullItemsDataset = spark.read().schema(schemaRead).parquet(path)
                    .filter(
                            expr(String.format("%s >= '%s'", UPDATE_DATE, nDaysBefore)).and(
                                    expr(String.format("%s >= %s", "event_timestamp", nDaysBeforeDate.getTime()))
                            ));
        } catch (Exception e) {
            log.error(e.getMessage());
            if (e.getMessage().toLowerCase().contains("path does not exist")) {
                List<Row> dataList = new ArrayList<>();
                return spark.createDataFrame(dataList, schemaRead);
            }
            throw e;
        }
        return fullItemsDataset;
    }

    private static Dataset<Row> getAggItemDataset(final Dataset<Row> dataset2) {
        return dataset2.groupBy("app_id", "id")
                .agg(max_by(struct(expr("*")), col("event_timestamp"))
                        .alias("item"))
                .select(expr("item.*"));

    }

    public List<Dataset<Row>> transform(final Dataset<Row> dataset) {
        log.info(new ETLMetric(dataset, "transform enter").toString());
        Dataset<Row> cleanedDataset = cleaner.clean(dataset, DATA_SCHEMA_V2_FILE_PATH);
        ContextUtil.cacheDataset(cleanedDataset);
        log.info(new ETLMetric(cleanedDataset, "after clean").toString());
        Column dataCol = col("data");

        Dataset<Row> dataset0 = cleanedDataset.withColumn("app_id", dataCol.getField("app_id"))
                .withColumn("user_pseudo_id", dataCol.getField("unique_id").cast(DataTypes.StringType))
                .withColumn("event_name", dataCol.getField("event_type"))
                .withColumn("event_date", to_date(timestamp_seconds(dataCol.getItem(TIMESTAMP).$div(1000))))
                .withColumn("event_timestamp", dataCol.getItem(TIMESTAMP))
                .withColumn("user_id", get_json_object(dataCol.getField("user"), "$._user_id.value").cast(DataTypes.StringType));
        Dataset<Row> dataset1 = convertAppInfo(dataset0);
        Dataset<Row> eventDataset = extractEvent(dataset1);
        log.info(new ETLMetric(eventDataset, "eventDataset").toString());

        Dataset<Row> eventParameterDataset = extractEventParameter(dataset1);
        log.info(new ETLMetric(eventParameterDataset, "eventParameterDataset").toString());

        Optional<Dataset<Row>> itemDataset = extractItem(dataset1);
        itemDataset.ifPresent(rowDataset -> log.info(new ETLMetric(rowDataset, "itemDataset").toString()));

        Optional<Dataset<Row>> userDataset = extractUser(dataset1);
        itemDataset.ifPresent(rowDataset -> log.info(new ETLMetric(rowDataset, "userDataset").toString()));

        return Arrays.asList(eventDataset,
                eventParameterDataset,
                itemDataset.orElse(null),
                userDataset.orElse(null));
    }

    private Dataset<Row> extractEvent(final Dataset<Row> dataset) {
        String projectId = System.getProperty(PROJECT_ID_PROP);
        Column dataCol = col("data");
        Dataset<Row> dataset1 = dataset.withColumn("event_id", dataCol.getItem(("event_id")))
                .withColumn("event_previous_timestamp", dataCol.getField("event_previous_timestamp").cast(DataTypes.LongType))
                .withColumn("event_value_in_usd", dataCol.getItem("event_value_in_usd").cast(DataTypes.FloatType))
                .withColumn(PLATFORM, dataCol.getItem(PLATFORM)).withColumn("project_id", lit(projectId))
                .withColumn("ingest_timestamp", col("ingest_time"));

        Dataset<Row> dataset2 = convertUri(dataset1, "event_bundle_sequence_id", DataTypes.LongType);
        Dataset<Row> dataset3 = convertDevice(dataset2);
        Dataset<Row> dataset4 = convertGeo(dataset3);
        Dataset<Row> dataset5 = convertTrafficSource(dataset4);
        Dataset<Row> datasetFinal = convertItems(dataset5);
        log.info("extractEvent done");
        return datasetFinal.select("event_id",
                "event_date",
                "event_timestamp",
                "event_previous_timestamp",
                "event_name",
                "event_value_in_usd",
                "event_bundle_sequence_id",
                "ingest_timestamp",
                "device",
                "geo",
                "traffic_source",
                "app_info",
                "platform",
                "project_id",
                "items",
                "user_pseudo_id",
                "user_id",
                "ua",
                GEO_FOR_ENRICH);
    }

    private Dataset<Row> extractEventParameter(final Dataset<Row> dataset) {
        Column dataCol = col("data");
        Dataset<Row> dataset1 = eventParamsConverter.transform(dataset);
        Dataset<Row> dataset2 = dataset1.select(
                col("app_id"),
                col("event_date"),
                dataCol.getItem("event_id").cast(DataTypes.StringType).alias("event_id"),
                col("event_params"));

        return explodeKeyValue(dataset2, "event_params", "event_param_");

    }

    private Optional<Dataset<Row>> extractItem(final Dataset<Row> dataset) {
        SparkSession spark = dataset.sparkSession();
        Column dataCol = col("data");
        ArrayType itemsType = DataTypes.createArrayType(DataTypes.StringType);
        Dataset<Row> datasetItems = dataset
                .withColumn("item_json", explode(from_json(dataCol.getField("items"), itemsType)))
                .filter(col("item_json").isNotNull());

        List<String> topFields = Collections.singletonList("id");
        List<String> ignoreFields = Collections.singletonList("quantity");

        List<String> excludedAttributes = new ArrayList<>();
        excludedAttributes.addAll(topFields);
        excludedAttributes.addAll(ignoreFields);

        Dataset<Row> dataset1 = kvConverter.transform(datasetItems, col("item_json"), "properties", excludedAttributes);
        Dataset<Row> dataset2 = dataset1
                .withColumn("id", get_json_object(col("item_json"), "$.id").cast(DataTypes.StringType))
                .filter(col("id").isNotNull())
                .select(
                        "app_id",
                        "event_date",
                        "event_timestamp",
                        "id",
                        "properties"
                );

        String tableName = ETLRunner.TableName.ITEM.tableName;
        setSchemaMap(dataset2, tableName);

        if (dataset2.count() == 0) {
            return Optional.empty();
        }

        List<String> selectedFields = new ArrayList<>();
        selectedFields.add("app_id");
        selectedFields.add("event_date");
        selectedFields.add("event_timestamp");
        selectedFields.addAll(topFields);
        selectedFields.add("properties");

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
        Dataset<Row>  fullAggItemsDatasetRt = fullAggItemsDataset.select(
                "app_id",
                "event_date",
                "event_timestamp",
                "id",
                "properties"
        );
        saveFullDataset(ETLRunner.TableName.ITEM.tableName, fullAggItemsDatasetRt);
        return Optional.of(fullAggItemsDatasetRt);
    }

    private Optional<Dataset<Row>> extractUser(final Dataset<Row> dataset) {
        SparkSession spark = dataset.sparkSession();
        Column dataCol = col("data");
        Column attributesCol = dataCol.getField(ATTRIBUTES);
        Dataset<Row> userDataset = dataset.filter(col("user_id").isNotNull());
        Dataset<Row> profileSetDataset = userDataset
                .filter(col("event_name")
                        .isin("user_profile_set", "_user_profile_set", "_profile_set"));

        long newUserCount = profileSetDataset.count();
        log.info("newUserCount:" + newUserCount);

        Dataset<Row> userReferrerDataset = getPageRefererDataset(userDataset, newUserCount);
        Dataset<Row> userDeviceIdDataset = getUserDeviceIdDataset(userDataset, newUserCount);
        Dataset<Row> userTrafficSourceDataset = getUserTrafficSourceDataset(userDataset, newUserCount);

        Dataset<Row> profileSetDataset1 = this.userPropertiesConverter.transform(profileSetDataset);

        Dataset<Row> newUserProfileMainDataset = profileSetDataset1
                .withColumn("_first_visit_date", to_date(timestamp_seconds(col("user_first_touch_timestamp").$div(1000))))
                .withColumn("_channel", get_json_object(attributesCol, "$._channel").alias("install_source"))
                .select(
                        "app_id",
                        "event_date",
                        "event_timestamp",
                        "user_id",
                        "user_pseudo_id",
                        "user_first_touch_timestamp",
                        "user_properties",
                        "user_ltv",
                        "_first_visit_date",
                        "_channel"
                ).distinct();

        String tableName = ETLRunner.TableName.USER.tableName;
        setSchemaMap(newUserProfileMainDataset, tableName);
        if (newUserCount == 0) {
            return Optional.empty();
        }

        // newUserCount > 0, below dataset should not null
        Objects.requireNonNull(userReferrerDataset);
        Objects.requireNonNull(userDeviceIdDataset);
        Objects.requireNonNull(userTrafficSourceDataset);

        log.info("newUserProfileMainDataset:" + newUserProfileMainDataset.count());

        Dataset<Row> newAggUserProfileMainDataset = getAggUserDataset(newUserProfileMainDataset);
        log.info("newAggUserProfileMainDataset count " + newAggUserProfileMainDataset.count());

        String path = saveIncrementalDataset(ETLRunner.TableName.USER, newAggUserProfileMainDataset);
        Dataset<Row> fullUsersDataset = readDatasetFromPath(spark, path, ContextUtil.getUserKeepDays());
        Dataset<Row> fullAggUserDataset = getAggUserDataset(fullUsersDataset);
        log.info("fullAggUserDataset count " + fullAggUserDataset.count());
        saveFullDataset(ETLRunner.TableName.USER.tableName, fullAggUserDataset);

        Column userIdCol = fullAggUserDataset.col("user_id");
        Column appIdCol = fullAggUserDataset.col("app_id");
        Column eventTimestampCol =  fullAggUserDataset.col("event_timestamp");

        Column userIdJoinForDeviceId = userIdCol.equalTo(userDeviceIdDataset.col("user_id")).and(appIdCol.equalTo(userDeviceIdDataset.col("app_id")));
        Column userIdJoinForTrafficSource = userIdCol.equalTo(userTrafficSourceDataset.col("user_id")).and(appIdCol.equalTo(userTrafficSourceDataset.col("app_id")));
        Column userIdJoinForPageReferrer = userIdCol.equalTo(userReferrerDataset.col("user_id")).and(appIdCol.equalTo(userReferrerDataset.col("app_id")));

        Dataset<Row> joinedFullUserDataset = fullAggUserDataset
                .join(userDeviceIdDataset, userIdJoinForDeviceId, "left")
                .join(userTrafficSourceDataset, userIdJoinForTrafficSource, "left")
                .join(userReferrerDataset, userIdJoinForPageReferrer, "left");

        log.info("joinedFullUserDataset:" + joinedFullUserDataset.count());
        Dataset<Row> joinedFullUserDatasetRt = joinedFullUserDataset.select(appIdCol,
                        col("event_date"),
                        eventTimestampCol,
                        userIdCol,
                        col("user_pseudo_id"),
                        col("user_first_touch_timestamp"),
                        col("user_properties"),
                        col("user_ltv"),
                        col("_first_visit_date"),
                        col("_page_referer").alias("_first_referer"),
                        col("_traffic_source_name").alias("_first_traffic_source_type"),
                        col("_traffic_source_medium").alias("_first_traffic_medium"),
                        col("_traffic_source_source").alias("_first_traffic_source"),
                        col("device_id_list"),
                        col("_channel"));

        return Optional.of(joinedFullUserDatasetRt);
    }

    private static void setSchemaMap(final Dataset<Row> newUserProfileMainDataset, final String tableName) {
        StructType schema = newUserProfileMainDataset.schema().add(UPDATE_DATE, DataTypes.StringType, true);
        String pathFull = getPathForTable(tableName + FULL_SUFFIX);
        String pathIncremental = getPathForTable(tableName + INCREMENTAL_SUFFIX);
        scheamMap.put(pathFull, schema);
        scheamMap.put(pathIncremental, schema);
    }

    private Dataset<Row> getAggUserDataset(final Dataset<Row> newUserDataset) {
        return newUserDataset.groupBy("app_id", "user_id")
                .agg(max_by(struct(expr("*")), col("event_timestamp")).alias("user"))
                .select(expr("user.*"));
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
        return dataset.withColumn("items",
                from_json(col("data").getField("items"), itemsType));

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
                        (dataCol.getItem("app_id")).alias("app_id"),
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
                (dataCol.getItem("device_id")).alias("vendor_id"),
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
                ETLRunner.TableName.USER.tableName, userKeepDays
        });
        l.add(new Object[] {
                ETLRunner.TableName.ITEM.tableName, itemKeepDays
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
        DateFormat dateFormatYMD = new SimpleDateFormat("yyyyMMdd");
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
                    .option("compression", "snappy")
                    .mode(SaveMode.Append).parquet(statePath);
        }

        if (mergedToday) {
            log.info("Datasets merged today, detail: " + mergedState.first().json());
        }
        return mergedToday;
    }

}
