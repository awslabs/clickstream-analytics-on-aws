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

import com.clearspring.analytics.util.Lists;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;

import java.nio.file.Paths;
import java.util.List;

public class DataProcessorTest extends BaseSparkTest{
    @Test
    public void testMain() {
        List<String> transformers = Lists.newArrayList();

        transformers.add("software.aws.solution.clickstream.Transformer");
        transformers.add("software.aws.solution.clickstream.UAEnrichment");
        transformers.add("software.aws.solution.clickstream.IPEnrichment");

        String database = "default";
        String sourceTable = "fakeSourceTable";
        String sourcePath = Paths.get(getClass().getResource("/original_data.json").getPath()).getParent().toString() + "/partition_data/";
        String jobDataDir = "/tmp/job-data/jobName0001";
        String transformerClassNames = String.join(",", transformers);
        String outputPath = "/tmp/test-output";
        String projectId = "projectId1";
        String validAppIds = "id1,id2,uba-app";
        String outPutFormat = "json";
        String startTimestamp = "1668128460000"; // '2022-11-11T01:01:00Z'
        String endTimestamp = "1668153660000"; // '2022-11-11T08:01:00Z'
        String dataFreshnessInHour = "72";
        String outputPartitions = "-1";
        String rePartitions = "-1";
        String nUserKeepDays = "10";
        String nItemKeepDays = "20";
        DataProcessor.runWithSpark(
                new String[] {
                        "false", // String debug = args[0];
                        database, //String database = args[1];
                        sourceTable, // String sourceTable = args[2];
                        startTimestamp, // String startTimestamp = args[3];
                        endTimestamp, //String endTimestamp = args[4];
                        sourcePath,//String sourcePath = args[5];
                        jobDataDir,//String jobDataDir = args[6];
                        transformerClassNames, //String transformerClassNames = args[7];
                        outputPath, //String outputPath = args[8];
                        projectId, //String projectId = args[9];
                        validAppIds, //String validAppIds = args[10];
                        dataFreshnessInHour, //String dataFreshnessInHour = args[11];
                        outPutFormat, //String outPutFormat = args[12];
                        outputPartitions, //String outputPartitions = args[13];
                        rePartitions,//String rePartitions = args[14];
                        nUserKeepDays, //String nUserKeepDays = args[15];
                        nItemKeepDays //String nItemKeepDays = args[16];
                },
                spark
        );
        Assertions.assertEquals("jobName0001", ContextUtil.getJobName());
    }
}
