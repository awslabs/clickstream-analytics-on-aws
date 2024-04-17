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
import org.junit.jupiter.api.*;
import software.aws.solution.clickstream.util.*;

import java.net.URISyntaxException;
import java.nio.file.*;
import java.util.*;

import static com.google.common.collect.Lists.newArrayList;

@Slf4j
public class ETLRunnerBaseTest extends BaseSparkTest {


    public ETLRunnerConfig getRunnerConfig(List<String> transformers, String name) {
        String sourcePath = getClass().getResource("/original_data.json").getPath();
        String startTimestamp = "1667963966000"; // 2022-11-09T03:19:26.000Z
        String endTimestamp = "1668136766000"; // 2022-11-11T03:19:26.000Z
        return getRunnerConfig(transformers, name, sourcePath, startTimestamp, endTimestamp);
    }

    public ETLRunnerConfig getRunnerConfigForPartitionData(List<String> transformers, String name,
                                                           String startTimestamp, String endTimestamp) {
        String sourcePath = Paths.get(getClass().getResource("/original_data.json").getPath())
                .getParent().toString() + "/partition_data/";
        return getRunnerConfig(transformers, name, sourcePath, startTimestamp, endTimestamp);
    }

    public ETLRunnerConfig getRunnerConfig(List<String> transformers, String name, String sourcePath,
                                           String startTimestamp, String endTimestamp) {
        String database = "default";
        String sourceTable = "fakeSourceTable";
        String jobDataDir = "/tmp/etl-debug/";
        String transformerClassNames = String.join(",", transformers);
        String outputPath = "/tmp/test-output/" + name + new Date().getTime() + "/";
        String projectId = "projectId1";
        String validAppIds = "id1,id2,uba-app";
        String outPutFormat = "json";
        String dataFreshnessInHour = "72";
        int nDaysUser = 360 * 30;
        int nDaysItem = 360 * 30;

        if (name.contains("parquet")) {
            outPutFormat = "parquet";
        }
        Path configDirPath = null;
        try {
            configDirPath = Paths.get(Objects.requireNonNull(getClass().getResource("/rule_config/")).toURI());
        } catch (URISyntaxException e) {
            throw new RuntimeException(e);
        }
        log.info("configDirPath: {}", configDirPath);

        ETLRunnerConfig runnerConfig = new ETLRunnerConfig(
                new ETLRunnerConfig.TransformationConfig(
                        newArrayList(transformerClassNames.split(",")),
                        projectId, validAppIds,
                        Long.valueOf(dataFreshnessInHour),
                        nDaysUser, nDaysItem, configDirPath.toString()
                ),
                new ETLRunnerConfig.InputOutputConfig(
                        "false",
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
                        1, 1
                ));
        return runnerConfig;
    }
    @Test
    void testGetConfig() {
        this.getRunnerConfig(newArrayList("software.aws.solution.clickstream.transformer.FakeTransformer"), "test");
    }
}
