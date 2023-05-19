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

import java.util.Arrays;

public class ContextUtil {

    public static void setContextProperties(final ETLRunnerConfig config) {
        System.setProperty("database", config.getDatabase());
        System.setProperty("job.data.dir", config.getJobDataDir());
        System.setProperty("project.id", config.getProjectId());
        System.setProperty("app.ids", config.getValidAppIds());
        System.setProperty("source.path", config.getSourcePath());
        System.setProperty("output.path", config.getOutputPath());
        System.setProperty("data.freshness.hour", String.valueOf(config.getDataFreshnessInHour()));
        System.setProperty("output.coalesce.partitions", String.valueOf(config.getOutPartitions()));
        System.setProperty("save.info.to.warehouse", String.valueOf(config.isSaveInfoToWarehouse()));
    }

    public static void setJobAndWarehouseInfo(final String jobDataDir) {
        String[] dirParts = jobDataDir.split("/");
        String jobName = dirParts[dirParts.length -1];
        String warehouseDir = String.join("/", Arrays.copyOf(dirParts, dirParts.length - 1));

        System.setProperty("job.name", jobName);
        System.setProperty("warehouse.dir", warehouseDir);
    }

    public static boolean isDebugLocal() {
       return Boolean.parseBoolean(System.getProperty("debug.local"));
    }

    public static boolean isSaveToWarehouse() {
        return Boolean.parseBoolean(System.getProperty("save.info.to.warehouse", "false"));
    }

    public static String getJobName() {
       return System.getProperty("job.name");
    }
    public static String getWarehouseDir() {
        return System.getProperty("warehouse.dir");
    }

}
