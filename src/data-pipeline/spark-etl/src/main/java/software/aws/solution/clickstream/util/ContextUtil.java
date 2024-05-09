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
import org.apache.spark.storage.StorageLevel;
import software.aws.solution.clickstream.common.Constant;

import java.util.Arrays;

import static software.aws.solution.clickstream.common.ClickstreamEventParser.ENABLE_EVENT_TIME_SHIFT_PROP;

@Slf4j
public final class ContextUtil {
    public static final String JOB_NAME_PROP= "job.name";
    public static final String WAREHOUSE_DIR_PROP = "warehouse.dir";
    public static final String DEBUG_LOCAL_PROP = "debug.local";
    public static final String OUTPUT_COALESCE_PARTITIONS_PROP = "output.coalesce.partitions";
    public static final String DATA_FRESHNESS_HOUR_PROP = "data.freshness.hour";
    public static final String OUTPUT_PATH_PROP = "output.path";
    public static final String SOURCE_PATH_PROP = "source.path";
    public static final String APP_IDS_PROP = "app.ids";
    public static final String PROJECT_ID_PROP = "project.id";
    public static final String JOB_DATA_DIR_PROP = "job.data.dir";
    public static final String DATABASE_PROP = "database";

    public static final String USER_KEEP_DAYS_PROP = "keep.user.days";

    public static final String ITEM_KEEP_DAYS_PROP =  "keep.item.days";

    public static final String FILTER_BOT_BY_UA_PROP = "filter.bot.by.ua";
    public static final String DISABLE_TRAFFIC_SOURCE_ENRICHMENT = "disable.traffic.source.enrichment";
    public static final String DISABLE_MAX_LENGTH_CHECK = "disable.max.length.check";

    private static Dataset<Row> datasetCached;

    private ContextUtil() {
    }

    public static void cacheDataset(final Dataset<Row> dataset) {
        if (datasetCached == null) {
            datasetCached = dataset.persist(StorageLevel.MEMORY_AND_DISK());
        } else if (dataset != datasetCached) {
            Dataset<Row> oldDatasetCached = datasetCached;
            datasetCached = dataset.persist(StorageLevel.MEMORY_AND_DISK());
            try {
                oldDatasetCached.unpersist();
            } catch (Exception e) {
                //print and ignore error
                log.error(e.getMessage());
            }
        }
    }

    public static void setContextProperties(final ETLRunnerConfig config) {
        System.setProperty(DATABASE_PROP, config.getDatabase());
        System.setProperty(JOB_DATA_DIR_PROP, config.getJobDataDir());
        System.setProperty(PROJECT_ID_PROP, config.getProjectId());
        System.setProperty(APP_IDS_PROP, config.getValidAppIds());
        System.setProperty(SOURCE_PATH_PROP, config.getSourcePath());
        System.setProperty(OUTPUT_PATH_PROP, config.getOutputPath());
        System.setProperty(DATA_FRESHNESS_HOUR_PROP, String.valueOf(config.getDataFreshnessInHour()));
        System.setProperty(OUTPUT_COALESCE_PARTITIONS_PROP, String.valueOf(config.getOutPartitions()));
        System.setProperty(Constant.ETL_RUN_FLAG, String.valueOf(config.getRunFlag()));
        System.setProperty(USER_KEEP_DAYS_PROP, String.valueOf(config.getUserKeepDays()));
        System.setProperty(ITEM_KEEP_DAYS_PROP, String.valueOf(config.getItemKeepDays()));
        System.setProperty(FILTER_BOT_BY_UA_PROP, config.getFilterBotByUa());
    }

    public static void setJobAndWarehouseInfo(final String jobDataDir) {
        String[] dirParts = jobDataDir.split("/");
        String jobName = dirParts[dirParts.length - 1];
        String warehouseDir = String.join("/", Arrays.copyOf(dirParts, dirParts.length - 1));

        System.setProperty(JOB_NAME_PROP, jobName);
        System.setProperty(WAREHOUSE_DIR_PROP, warehouseDir);
    }

    public static boolean isDebugLocal() {
        return Boolean.parseBoolean(System.getProperty(DEBUG_LOCAL_PROP));
    }

    public static String getJobName() {
        return System.getProperty(JOB_NAME_PROP);
    }
    public static String getWarehouseDir() {
        return System.getProperty(WAREHOUSE_DIR_PROP);
    }
    public static String getDatabase() {
        return System.getProperty(DATABASE_PROP);
    }

    public static int getUserKeepDays() {
        return Integer.valueOf(System.getProperty(USER_KEEP_DAYS_PROP));
    }
    public static int getItemKeepDays() {
        return Integer.valueOf(System.getProperty(ITEM_KEEP_DAYS_PROP));
    }

    public static void setEnableEventTimeShift(final boolean enableEventTimeShift) {
        System.setProperty(ENABLE_EVENT_TIME_SHIFT_PROP, String.valueOf(enableEventTimeShift));
    }
    public static String getEtlRunFlag() {
        return System.getProperty(Constant.ETL_RUN_FLAG, "");
    }
}
