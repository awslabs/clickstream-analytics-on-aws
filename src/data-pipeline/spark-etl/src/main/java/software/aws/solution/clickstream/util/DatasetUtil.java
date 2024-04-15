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

package software.aws.solution.clickstream.util;

import lombok.extern.slf4j.Slf4j;
import org.apache.spark.sql.Dataset;
import org.apache.spark.sql.Row;
import org.apache.spark.sql.SaveMode;
import org.apache.spark.sql.SparkSession;
import org.apache.spark.sql.catalyst.expressions.GenericRow;
import org.apache.spark.sql.types.DataTypes;
import org.apache.spark.sql.types.StructField;
import org.apache.spark.sql.types.StructType;
import software.aws.solution.clickstream.exception.ExecuteTransformerException;

import java.nio.file.Paths;
import java.sql.*;
import java.text.DateFormat;
import java.text.SimpleDateFormat;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Date;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.apache.spark.sql.functions.col;
import static org.apache.spark.sql.functions.expr;
import static org.apache.spark.sql.functions.lit;
import static org.apache.spark.sql.functions.max;
import static org.apache.spark.sql.functions.max_by;
import static org.apache.spark.sql.functions.min_by;
import static org.apache.spark.sql.functions.struct;
import static software.aws.solution.clickstream.gtm.GTMServerDataTransformer.GTM_PREVIOUS_SESSION_KEEP_DAYS;
import static software.aws.solution.clickstream.gtm.GTMServerDataTransformer.MAX_SN;

@Slf4j
public final class DatasetUtil {
    public static final int MAX_PARAM_STRING_VALUE_LEN = 2048;
    public static final int MAX_STRING_VALUE_LEN = 255;
    public static final String YYYYMMDD = "yyyyMMdd";
    public static final String UPDATE_DATE = "update_date";
    public static final String SNAPPY = "snappy";
    public static final String COMPRESSION = "compression";

    public static final String GEO_FOR_ENRICH = "geo_for_enrich";
    public static final String TIMESTAMP = "timestamp";
    public static final String PLATFORM = "platform";
    public static final String LOCALE = "locale";
    public static final String ATTRIBUTES = "attributes";
    public static final String DOUBLE_VALUE = "double_value";
    public static final String FLOAT_VALUE = "float_value";
    public static final String INT_VALUE = "int_value";
    public static final String STRING_VALUE = "string_value";

    public static final String UA_BROWSER = "ua_browser";
    public static final String UA_BROWSER_VERSION = "ua_browser_version";
    public static final String UA_OS = "ua_os";
    public static final String UA_OS_VERSION = "ua_os_version";
    public static final String UA_DEVICE = "ua_device";
    public static final String UA_DEVICE_CATEGORY = "ua_device_category";
    public static final String UA_ENRICH = "ua_enrich";

    public static final String CORRUPT_RECORD = "_corrupt_record";
    public static final String JOB_NAME_COL = "jobName";
    public static final String DATA = "data";
    public static final String KEY = "key";
    public static final String VALUE = "value";

    public static final String TABLE_ETL_USER_TRAFFIC_SOURCE = "etl_user_traffic_source";
    public static final String TABLE_ETL_USER_DEVICE_ID = "etl_user_device_id";
    public static final String TABLE_ETL_USER_PAGE_REFERER = "etl_user_page_referer";
    public static final String TABLE_ETL_USER_CHANNEL = "etl_user_channel";
    public static final String INCREMENTAL_SUFFIX = "_incremental";
    public static final String FULL_SUFFIX = "_full";
    public static final String DATA_SCHEMA_V2_FILE_PATH = System.getProperty("data.schema.file.path.v2", "/data_schema_v2.json");
    public static final String PROPERTIES = "properties";
    public static final String TRAFFIC_SOURCE_MEDIUM = "_traffic_source_medium";
    public static final String TRAFFIC_SOURCE_NAME = "_traffic_source_name";
    public static final String TRAFFIC_SOURCE_SOURCE = "_traffic_source_source";
    public static final String EVENT_TIMESTAMP = "event_timestamp";
    public static final String NEW_USER_COUNT = "newUserCount";
    public static final String EVENT_NAME = "event_name";
    public static final String EVENT_DATE = "event_date";
    public static final String USER_FIRST_TOUCH_TIMESTAMP = "user_first_touch_timestamp";

    public static final String USER_PSEUDO_ID = "user_pseudo_id";
    public static final String EVENT_ID = "event_id";
    public static final String EVENT_PREVIOUS_TIMESTAMP = "event_previous_timestamp";
    public static final String FIRST_VISIT_DATE = "_first_visit_date";
    public static final String CHANNEL = "_channel";
    public static final String USER_ID = "user_id";
    public static final String DEVICE_ID = "device_id";

    public static final String EVENT_VALUE_IN_USD = "event_value_in_usd";
    public static final String DEVICE_ID_LIST = "device_id_list";
    public static final String APP_ID = "app_id";
    public static final String REFERRER = "_referrer";
    public static final String PROP_PAGE_REFERRER = "_page" + REFERRER;
    public static final String REFERER = "_referer";
    public static final String COL_PAGE_REFERER = "_page" + REFERER;
    public static final String EVENT_PROFILE_SET = "_profile_set";
    public static final String EVENT_PAGE_VIEW = "_page_view";

    public static final String EVENT_SCREEN_VIEW = "_screen_view";

    public static final String EVENT_FIRST_OPEN = "_first_open";
    public static final String EVENT_FIRST_VISIT = "_first_visit";
    public static final String EVENT_APP_END = "_app_end";
    public static final String EVENT_APP_START = "_app_start";
    public static final String EVENT_SESSION_START = "_session_start";
    public static final String EVENT_USER_ENGAGEMENT = "_user_engagement";
    public static final String EVENT_SCROLL = "_scroll";
    public static final String APP_INFO = "app_info";
    public static final String MOBILE = "mobile";
    public static final String MODEL = "model";
    public static final String PLATFORM_VERSION = "platform_version";
    public static final String ITEM_ID = "item_id";
    public static final String PRICE = "price";
    public static final String CLIENT_ID = "client_id";
    public static final String GA_SESSION_ID = "ga_session_id";
    public static final String GA_SESSION_NUMBER = "ga_session_number";
    public static final String SESSION_NUMBER = "_session_number";
    public static final String X_GA_JS_CLIENT_ID = "x-ga-js_client_id";
    public static final String GTM_SCREEN_WIDTH = "screenWidth";
    public static final String GTM_SCREEN_HEIGHT = "screenHeight";
    public static final String GTM_CLIENT_PLATFORM_VERSION = "clientPlatformVersion";
    public static final String GTM_CLIENT_PLATFORM = "clientPlatform";
    public static final String GTM_REQUEST_START_TIME_MS = "requestStartTimeMs";
    public static final String GTM_LANGUAGE = "language";
    public static final String GTM_UC = "uc";
    public static final String GTM_SESSION_ID = "gtmSessionId";
    public static final String GTM_SESSION_NUM = "gtmSessionNum";
    public static final String GTM_ID = "gtmId";
    public static final String GTM_VERSION = "gtmVersion";
    public static final String EVENT_ITEMS = "eventItems";
    public static final String UA = "ua";
    public static final String IP = "ip";
    public static final String ITEMS = "items";
    public static final String EVENT_PARAM = "eventParam";
    public static final String EVENT_PARAMS = "eventParams";
    public static final String EVENT_PARAM_KEY = "event_param_key";
    public static final String EVENT_PARAM_DOUBLE_VALUE = "event_param_double_value";
    public static final String EVENT_PARAM_FLOAT_VALUE = "event_param_float_value";
    public static final String EVENT_PARAM_INT_VALUE = "event_param_int_value";
    public static final String EVENT_PARAM_STRING_VALUE = "event_param_string_value";
    public static final String USER_PROPERTIES = "user_properties";
    public static final String USER = "user";
    public static final String ITEM = "item";
    public static final String ID = "id";
    public static final String INGEST_TIMESTAMP = "ingest_timestamp";
    public static final String DATA_OUT = "dataOut";
    public static final String PAGE_REFERRER = "pageReferrer";
    public static final String FIRST_TRAFFIC_SOURCE_TYPE = "_first_traffic_source_type";
    public static final String FIRST_TRAFFIC_MEDIUM = "_first_traffic_medium";
    public static final String FIRST_TRAFFIC_SOURCE = "_first_traffic_source";
    public static final String USER_LTV = "user_ltv";
    public static final String FIRST_REFERER = "_first_referer";
    public static final String TABLE_NAME_ETL_GTM_USER_VISIT = "etl_gtm_user_visit";
    public static final String TABLE_NAME_ETL_GTM_USER_REFERRER = "etl_gtm_user_referrer";
    public static final String TABLE_NAME_ETL_GTM_USER_SESSION = "etl_gtm_user_session";
    public static final String TABLE_NAME_ETL_MERGE_STATE = "etl_merge_state";
    public static final String TABLE_VERSION_SUFFIX_V1 = "_v1";
    public static final String GTM_PAGE_TITLE = "page_title";
    public static final String GTM_PAGE_LOCATION = "page_location";
    public static final String GTM_PAGE_REFERRER = "page_referrer";
    public static final String SESSION_ID = "_session_id";
    public static final String PAGE_TITLE = "_page_title";
    public static final String PAGE_URL = "_page_url";
    public static final String GTM_BRANDS = "brands";
    public static final String GTM_BRAND = "brand";
    public static final String GTM_CLIENT_BRAND = "clientBrand";
    public static final String EVENT_BUNDLE_SEQUENCE_ID = "event_bundle_sequence_id";
    public static final String DEVICE = "device";
    public static final String TRAFFIC_SOURCE = "traffic_source";
    public static final String PROJECT_ID = "project_id";
    public static final String GEO = "geo";
    public static final String APP_INF = "app_info";
    public static final String GA_ENGAGEMENT_TIME_MSEC = "engagement_time_msec";
    public static final String ENGAGEMENT_TIME_MSEC = "_engagement_time_msec";
    public static final String SESSION_DURATION = "_session_duration";
    public static final String SESSION_START_TIMESTAMP = "_session_start_timestamp";
    public static final String TRUNCATED = "_truncated";

    public static final String TABLE_REGEX = String.format("^(%s)|((%s|%s|(etl_[^/]+))(%s|%s)_v\\d+)$",
            TABLE_NAME_ETL_MERGE_STATE,
            TableName.ITEM.getTableName(),
            TableName.USER.getTableName(),
            FULL_SUFFIX,
            INCREMENTAL_SUFFIX);
    private static final Map<String, StructType> SCHEMA_MAP = new HashMap<>();
    public static Map<String, StructType> getSchemaMap() {
        return SCHEMA_MAP;
    }

    private DatasetUtil() {

    }

    public static Dataset<Row> getAggUserRefererDataset(final Dataset<Row> allUserRefererDataset) {
        return allUserRefererDataset.groupBy(APP_ID, USER_PSEUDO_ID).agg(min_by(struct(col(COL_PAGE_REFERER), col(EVENT_TIMESTAMP)),
                col(EVENT_TIMESTAMP)).alias("page_referer")).select(col(APP_ID), col(USER_PSEUDO_ID), expr("page_referer.*")).distinct();
    }

    public static Dataset<Row> loadFullUserRefererDataset(final Dataset<Row> newPageReferrerDataset, final PathInfo pathInfo) {
        SparkSession spark = newPageReferrerDataset.sparkSession();
        Dataset<Row> newAggUserRefererDataset = getAggUserRefererDataset(newPageReferrerDataset);
        log.info("newAggUserRefererDataset count:" + newAggUserRefererDataset.count());

        String path = saveIncrementalDatasetToPath(pathInfo.getIncremental(), newAggUserRefererDataset);
        Dataset<Row> allUserRefererDataset = readDatasetFromPath(spark, path, ContextUtil.getUserKeepDays());
        log.info("allUserRefererDataset count:" + allUserRefererDataset.count());

        Dataset<Row> aggUserRefererDataset = getAggUserRefererDataset(allUserRefererDataset);
        log.info("aggTrafficSourceDataset count:" + aggUserRefererDataset.count());
        saveFullDatasetToPath(pathInfo.getFull(), aggUserRefererDataset);
        return aggUserRefererDataset;
    }


    public static Dataset<Row> loadPreviousUserSessionDataset(final Dataset<Row> newUserSessionDataset, final PathInfo pathInfo) {
        SparkSession spark = newUserSessionDataset.sparkSession();
        int sessionKeepDays = Integer.parseInt(System.getProperty(GTM_PREVIOUS_SESSION_KEEP_DAYS, "2"));
        Dataset<Row> allUserSessionDataset = readDatasetFromPath(spark, pathInfo.getIncremental(), sessionKeepDays);
        allUserSessionDataset.cache();
        log.info("allUserSessionDataset count:" + allUserSessionDataset.count());

        Dataset<Row> aggAllUserSessionDataset = getAggUserSessionDataset(allUserSessionDataset);

        saveIncrementalDatasetToPath(pathInfo.getIncremental(), newUserSessionDataset);
        return aggAllUserSessionDataset;
    }

    private static Dataset<Row> getAggUserSessionDataset(final Dataset<Row> allUserSessionDataset) {
        String maxSn = MAX_SN;
        return allUserSessionDataset.groupBy(APP_ID, USER_PSEUDO_ID)
                .agg(max(maxSn).alias(maxSn))
                .select(
                col(APP_ID), col(USER_PSEUDO_ID), col(maxSn)
        );
    }


    public static Dataset<Row> getAggItemDataset(final Dataset<Row> dataset2) {
        return dataset2.groupBy(APP_ID, ID).agg(max_by(struct(expr("*")), col(EVENT_TIMESTAMP)).alias("item")).select(expr("item.*")).distinct();
    }

    private static Dataset<Row> getAggUserDataset(final Dataset<Row> newUserDataset) {
        return newUserDataset.groupBy(APP_ID, USER_PSEUDO_ID)
                .agg(max_by(struct(expr("*")), col(EVENT_TIMESTAMP)).alias("user"))
                .select(expr("user.*"))
                .distinct();
    }

    public static Dataset<Row> loadFullUserDataset(final Dataset<Row> newUserProfileMainDataset, final PathInfo pathInfo) {
        SparkSession spark = newUserProfileMainDataset.sparkSession();
        log.info("newUserProfileMainDataset:" + newUserProfileMainDataset.count());

        Dataset<Row> newAggUserProfileMainDataset = getAggUserDataset(newUserProfileMainDataset);
        log.info("newAggUserProfileMainDataset count " + newAggUserProfileMainDataset.count());

        String path = saveIncrementalDatasetToPath(pathInfo.getIncremental(), newAggUserProfileMainDataset);
        Dataset<Row> fullUsersDataset = readDatasetFromPath(spark, path, ContextUtil.getUserKeepDays());
        Dataset<Row> fullAggUserDataset = getAggUserDataset(fullUsersDataset);
        log.info("fullAggUserDataset count " + fullAggUserDataset.count());
        saveFullDatasetToPath(pathInfo.getFull(), fullAggUserDataset);
        return fullAggUserDataset;
    }


    public static Dataset<Row> loadFullItemDataset(final Dataset<Row> newItemsDataset, final PathInfo pathInfo) {
        SparkSession spark = newItemsDataset.sparkSession();
        Dataset<Row> newAggItemsDataset = getAggItemDataset(newItemsDataset);
        long newCount = newAggItemsDataset.count();
        log.info("newAggItemsDataset count  " + newCount);

        String path = saveIncrementalDatasetToPath(pathInfo.getIncremental(), newAggItemsDataset);

        Dataset<Row> fullItemsDataset = readDatasetFromPath(spark, path,
                ContextUtil.getItemKeepDays()
        );
        Dataset<Row> fullAggItemsDataset = getAggItemDataset(fullItemsDataset);
        log.info("fullAggItemsDataset count " + fullAggItemsDataset.count());
        Dataset<Row> fullAggItemsDatasetRt = fullAggItemsDataset.select(
                APP_ID,
                EVENT_DATE,
                EVENT_TIMESTAMP,
                ID,
                PROPERTIES
        );
        saveFullDatasetToPath(pathInfo.getFull(), fullAggItemsDatasetRt);

        log.info("fullAggItemsDataset count " + fullAggItemsDataset.count());
        return fullAggItemsDataset;
    }


    private static String getPathForTable(final String tableName) {
        if (!tableName.matches(TABLE_REGEX)) {
            throw new ExecuteTransformerException("getPathForTable invalid tableName: " + tableName);
        }
        return Paths.get(ContextUtil.getWarehouseDir(), tableName).toString().replace("s3:/", "s3://");
    }


    public static void saveFullDatasetToPath(final String path, final Dataset<Row> dataset) {
        if (!path.contains(FULL_SUFFIX + "_v")) {
            throw new ExecuteTransformerException("saveFullDatasetToPath invalid path: " + path);
        }
        overWriteDataset(path, dataset);
    }

    private static void overWriteDataset(final String path, final Dataset<Row> dataset) {
        Date now = new Date();
        DateFormat dateFormatYMD = new SimpleDateFormat(YYYYMMDD);
        String yyyyMMdd = dateFormatYMD.format(now);
        Dataset<Row> dataset1 = dataset.withColumn(UPDATE_DATE, lit(yyyyMMdd).cast(DataTypes.StringType));

        int numPartitions = dataset1.rdd().getNumPartitions();
        numPartitions = Math.max(Math.min(numPartitions, 10), 1);

        dataset1.coalesce(numPartitions).write().partitionBy(UPDATE_DATE, APP_ID).option(COMPRESSION, SNAPPY).mode(SaveMode.Overwrite).parquet(path);
    }

    public static String saveIncrementalDatasetToPath(final String path, final Dataset<Row> newItemsDataset) {
        if (!path.contains(INCREMENTAL_SUFFIX + "_v")) {
            throw new ExecuteTransformerException("saveIncrementalDatasetToPath invalid path: " + path);
        }

        log.info("saveIncrementalDataset path=" + path + ", count:" + newItemsDataset.count());
        Date now = new Date();
        DateFormat dateFormatYMD = new SimpleDateFormat(YYYYMMDD);
        String yyyyMMdd = dateFormatYMD.format(now);
        Dataset<Row> newItemsDatasetSave = newItemsDataset.withColumn(UPDATE_DATE, lit(yyyyMMdd).cast(DataTypes.StringType));
        SCHEMA_MAP.put(path, newItemsDatasetSave.schema());
        newItemsDatasetSave.coalesce(1).write().partitionBy(UPDATE_DATE, APP_ID).option(COMPRESSION, SNAPPY).mode(SaveMode.Append).parquet(path);
        return path;
    }

    public static PathInfo addSchemaToMap(final Dataset<Row> newUserProfileMainDataset, final String tableName, final String versionSuffix) {
        StructType schema = newUserProfileMainDataset.schema().add(UPDATE_DATE, DataTypes.StringType, true);
        String pathFull = getPathForTable(tableName + FULL_SUFFIX + versionSuffix);
        String pathIncremental = getPathForTable(tableName + INCREMENTAL_SUFFIX + versionSuffix);
        SCHEMA_MAP.put(pathFull, schema);
        SCHEMA_MAP.put(pathIncremental, schema);
        return new PathInfo(pathFull, pathIncremental);
    }


    public static Dataset<Row> readDatasetFromPath(final SparkSession spark, final String path, final int fromNDays) {
        Date nDaysBeforeDate = Date.from(Instant.now().minusSeconds(fromNDays * 24 * 3600L));
        StructType schemaRead = SCHEMA_MAP.get(path);

        // get the type of EVENT_TIMESTAMP
        StructField eventTimestampField = schemaRead.apply(EVENT_TIMESTAMP);
        boolean isEventTimestampTypeLong = eventTimestampField.dataType() == DataTypes.LongType;

        DateFormat dateFormatYMD = new SimpleDateFormat(YYYYMMDD);
        String nDaysBefore = dateFormatYMD.format(nDaysBeforeDate);
        String pathInfo = "readDatasetFromPath path=" + path;
        log.info(pathInfo + ", nDaysBefore=" + nDaysBefore + ", fromNDays=" + fromNDays + ", isEventTimestampTypeLong=" + isEventTimestampTypeLong);
        Dataset<Row> fullItemsDataset;
        try {
            Dataset<Row> fullItemsDatasetRead = spark.read().schema(schemaRead).parquet(path);
            log.info(pathInfo + ", read count:" + fullItemsDatasetRead.count());
            log.info("schema: {}", fullItemsDatasetRead.schema().treeString());

            if (isEventTimestampTypeLong) {
                log.info("filtered by EVENT_TIMESTAMP >= '{}'", nDaysBeforeDate.getTime());
                fullItemsDataset = fullItemsDatasetRead.filter(
                        expr(String.format("%s >= '%s'", UPDATE_DATE, nDaysBefore))
                        .and(col(EVENT_TIMESTAMP).$greater$eq(nDaysBeforeDate.getTime()))
                );
            } else {
                log.info("filtered by EVENT_TIMESTAMP >= '{}'", new Timestamp(nDaysBeforeDate.getTime()));
                fullItemsDataset = fullItemsDatasetRead.filter(
                        expr(String.format("%s >= '%s'", UPDATE_DATE, nDaysBefore))
                        .and(col(EVENT_TIMESTAMP).$greater$eq(new Timestamp(nDaysBeforeDate.getTime())))
                );
            }

            fullItemsDataset.cache();
            // forces Spark to load the data immediately and cache it in memory
            log.info(pathInfo + ",cache data count:" + fullItemsDataset.count());
        } catch (Exception e) {
            log.error("readDatasetFromPath " + e.getMessage());
            if (e.getMessage().toLowerCase().contains("path does not exist")) {
                List<Row> dataList = new ArrayList<>();
                return spark.createDataFrame(dataList, schemaRead);
            }
            throw e;
        }
        return fullItemsDataset;
    }


    public static void mergeIncrementalTables(final SparkSession sparkSession, final List<TableInfo> tableInfoList) {
        boolean forceMerge = System.getProperty("force.merge", "false").equals("true");

        // run this process daily
        if (!isNeedMergedDataset(sparkSession) && !forceMerge) {
            return;
        }
        log.info("start merging incremental tables");

        tableInfoList.forEach(it -> {
            String tableName = it.getTableName();
            int nDays = it.getKeptDays();
            log.info("start merge table: " + tableName);
            Dataset<Row> datasetFull = readDatasetFromPath(sparkSession, it.getFullPath(), nDays);
            overWriteDataset(it.getIncrementalPath(), datasetFull);
        });
    }


    public static boolean isNeedMergedDataset(final SparkSession sparkSession) {
        boolean mergedToday = false;
        Date now = new Date();
        DateFormat dateFormatYMD = new SimpleDateFormat(YYYYMMDD);
        String yyyyMMdd = dateFormatYMD.format(now);

        String statePath = getPathForTable(TABLE_NAME_ETL_MERGE_STATE);
        StructType schema = DataTypes.createStructType(new StructField[]{
                DataTypes.createStructField(UPDATE_DATE, DataTypes.StringType, true),
                DataTypes.createStructField(JOB_NAME_COL, DataTypes.StringType, true),
                DataTypes.createStructField("createAt", DataTypes.TimestampType, true)

        });
        Dataset<Row> existingState;
        boolean isFirstRun = false;
        try {
            existingState = sparkSession.read().schema(schema).parquet(statePath);
        } catch (Exception e) {
            log.error(e.getMessage());
            if (e.getMessage().toLowerCase().contains("path does not exist")) {
                isFirstRun = true;
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
            dataList.add(new GenericRow(new Object[]{yyyyMMdd, ContextUtil.getJobName(), new java.sql.Timestamp(new Date().getTime())}));
            Dataset<Row> newState = sparkSession.createDataFrame(dataList, schema);
            newState.coalesce(1).write().partitionBy(UPDATE_DATE).option(COMPRESSION, SNAPPY).mode(SaveMode.Append).parquet(statePath);
        }
        log.info("isNeedMergedDataset() isFirstRun: " + isFirstRun + ", mergedToday: " + mergedToday);
        if (mergedToday) {
            log.info("Datasets merged today, detail: " + mergedState.first().json());
        }
        return !mergedToday && !isFirstRun;
    }

    public static class TableInfo {
        private final String tableName;

        private final String versionSuffix;
        private final int keptDays;

        public TableInfo(final String tableName, final String versionSuffix, final int keptDays) {
            this.tableName = tableName;
            this.keptDays = keptDays;
            this.versionSuffix = versionSuffix;
        }

        public String getTableName() {
            return tableName;
        }

        public int getKeptDays() {
            return keptDays;
        }

        public String getVersionSuffix() {
            return versionSuffix;
        }

        public String getFullPath() {
            return getPathForTable(tableName + FULL_SUFFIX + this.getVersionSuffix());
        }

        public String getIncrementalPath() {
            return getPathForTable(tableName + INCREMENTAL_SUFFIX + this.getVersionSuffix());
        }
    }

    public static class PathInfo {
        private final String full;
        private final String incremental;

        public PathInfo(final String full, final String incremental) {
            this.full = full;
            this.incremental = incremental;
        }

        public String getFull() {
            return full;
        }

        public String getIncremental() {
            return incremental;
        }
    }
}



