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

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;

import java.nio.file.Paths;

import static com.google.common.collect.Lists.newArrayList;
import static software.aws.solution.clickstream.ContextUtil.DEBUG_LOCAL_PROP;

public class ContextUtilTest {
    @Test
    public void testSetContextProperties() {
        String database = "default";
        String sourceTable = "fakeSourceTable";
        String sourcePath = Paths.get(getClass().getResource("/original_data.json").getPath()).getParent().toString() + "/partition_data/";
        String jobDataDir = "/tmp/job-data";
        String transformerClassNames = String.join(",");
        String outputPath = "/tmp/test-output";
        String projectId = "projectId1";
        String validAppIds = "id1,id2,uba-app";
        String outPutFormat = "json";
        String startTimestamp = "1667963966000"; // 2022-11-09T03:19:26.000Z
        String endTimestamp = "1668136766000"; // 2022-11-11T03:19:26.000Z
        String dataFreshnessInHour = "72";
        String outputPartitions = "-1";

        ETLRunnerConfig runnerConfig = new ETLRunnerConfig(
                new ETLRunnerConfig.TransformationConfig(
                        newArrayList(transformerClassNames.split(",")),
                        projectId, validAppIds,
                        Long.valueOf(dataFreshnessInHour),
                        360 * 30, 360 * 30
                ),
                new ETLRunnerConfig.InputOutputConfig(
                        "true",
                        database,
                        sourceTable,
                        sourcePath,
                        jobDataDir,
                        outputPath,
                        outPutFormat
                ),
                new ETLRunnerConfig.TimestampConfig(
                        Long.valueOf(startTimestamp),
                        Long.valueOf(endTimestamp)
                ),
                new ETLRunnerConfig.PartitionConfig(
                        Integer.valueOf(outputPartitions), -1
                ));

        System.setProperty(DEBUG_LOCAL_PROP, "false");

        ContextUtil.setContextProperties(runnerConfig);
        ContextUtil.setJobAndWarehouseInfo("/root/data/test/jobname001");
        String warehouseDir = ContextUtil.getWarehouseDir();
        String jobName = ContextUtil.getJobName();
        Assertions.assertEquals("/root/data/test", warehouseDir);
        Assertions.assertEquals("jobname001", jobName);
        Assertions.assertFalse(ContextUtil.isDebugLocal());
        Assertions.assertTrue(ContextUtil.isSaveToWarehouse());
    }
}
