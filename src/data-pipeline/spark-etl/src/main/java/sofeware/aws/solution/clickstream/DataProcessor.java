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

package sofeware.aws.solution.clickstream;

import com.google.common.base.Preconditions;
import lombok.extern.slf4j.Slf4j;
import org.apache.spark.sql.SparkSession;

import static com.google.common.collect.Lists.newArrayList;


@Slf4j
public final class DataProcessor {

    private static final String APP_NAME = "ClickStream-Data-ETL";

    private DataProcessor() {
    }

    /**
     * This job accept input argument with length 6.
     * args[0] means glue catalog database.
     * args[1] means glue catalog source table name.
     * args[2] means start timestamp of event.
     * args[3] means end timestamp of event.
     * args[4] means job data path, you can write files into this path while job running.
     * args[5] represents a list of transformer class names with comma-separated.
     * args[6] means output path.
     * args[7] means projectId.
     * args[8] means valid app_ids .
     * args[9] means dataFreshnessInHour.
     * args[10] means outputFormat.
     *
     * @param args input arguments
     */
    public static void main(final String[] args) {
        Preconditions.checkArgument(args.length == 11, "This job can only accept input argument with length 11");

        SparkSession spark = SparkSession.builder().config("spark.hadoop.hive.metastore.client.factory.class",
                "com.amazonaws.glue.catalog.metastore.AWSGlueDataCatalogHiveClientFactory")
                .enableHiveSupport().appName(APP_NAME).getOrCreate();


        String database = args[0];
        String sourceTable = args[1];
        String jobDataUri = args[4];
        String transformerClassNames = args[5];
        String outputPath = args[6];
        String projectId = args[7];
        String validAppIds = args[8];
        String outPutFormat = args[10];
        String startTimestamp = args[2];
        String endTimestamp = args[3];
        String dataFreshnessInHour = args[9];

        ETLRunner.ETLRunnerConfig runnerConfig = new ETLRunner.ETLRunnerConfig(database, sourceTable, jobDataUri,
                newArrayList(transformerClassNames.split(",")),
                outputPath, projectId, validAppIds, outPutFormat, Long.valueOf(startTimestamp),
                Long.valueOf(endTimestamp), Long.valueOf(dataFreshnessInHour));

        ETLRunner etlRunner = new ETLRunner(spark, runnerConfig);
        etlRunner.run();
        spark.stop();
    }
}
