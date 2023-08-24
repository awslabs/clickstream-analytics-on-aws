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

import com.google.common.base.Preconditions;
import lombok.extern.slf4j.Slf4j;
import org.apache.spark.sql.SparkSession;

import java.util.Arrays;

import static com.google.common.collect.Lists.newArrayList;


@Slf4j
public final class DataProcessor {

    private static final String APP_NAME = "ClickStream-Data-ETL";

    private DataProcessor() {
    }

    /**
     * This job accept input argument with length 6.
     * args[0] means save info to warehouse flag 'true' or 'false'
     * args[1] means glue catalog database.
     * args[2] means glue catalog source table name.
     * args[3] means start timestamp of event.
     * args[4] means end timestamp of event.
     * args[5] means source path.
     * args[6] means job data path, you can write files into this path while job running.
     * args[7] represents a list of transformer class names with comma-separated.
     * args[8] means output path.
     * args[9] means projectId.
     * args[10] means valid app_ids .
     * args[11] means dataFreshnessInHour.
     * args[12] means outputFormat.
     * args[13] means outputPartitions.
     * args[14] means rePartitions.
     * @param args input arguments
     */
    public static void main(final String[] args) {
        runWithSpark(args, null);
    }
    public static void runWithSpark(final String[] args, final SparkSession sparkSession){
        Preconditions.checkArgument(args.length == 15, "This job can only accept input argument with length 15");
        String debug = args[0];
        String database = args[1];
        String sourceTable = args[2];
        String startTimestamp = args[3];
        String endTimestamp = args[4];
        String sourcePath = args[5];
        String jobDataDir = args[6];
        String transformerClassNames = args[7];
        String outputPath = args[8];
        String projectId = args[9];
        String validAppIds = args[10];
        String dataFreshnessInHour = args[11];
        String outPutFormat = args[12];
        String outputPartitions = args[13];
        String rePartitions = args[14];

        ETLRunnerConfig runnerConfig;
        runnerConfig = new ETLRunnerConfig(
                new ETLRunnerConfig.TransformationConfig(
                        newArrayList(transformerClassNames.split(",")),
                        projectId,
                        validAppIds,
                        Long.valueOf(dataFreshnessInHour)
                ),
                new ETLRunnerConfig.InputOutputConfig(
                        debug,
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
                        Integer.valueOf(outputPartitions),
                        Integer.valueOf(rePartitions)
                )
        );
        ContextUtil.setJobAndWarehouseInfo(jobDataDir);
        SparkSession spark = sparkSession;
        if (sparkSession == null) {
            spark = SparkSession.builder()
                    .config("spark.sql.session.timeZone", "UTC")
                    .config("spark.hadoop.hive.metastore.client.factory.class",
                            "com.amazonaws.glue.catalog.metastore.AWSGlueDataCatalogHiveClientFactory")
                    .config("spark.sql.warehouse.dir", ContextUtil.getWarehouseDir())
                    .enableHiveSupport().appName(APP_NAME).getOrCreate();
        }

        Arrays.stream(spark.sparkContext().getConf().getAll()).forEach(c -> {
            log.info(c._1 + " -> " + c._2);
        });

        ETLRunner etlRunner = new ETLRunner(spark, runnerConfig);
        etlRunner.run();
        spark.stop();
    }
}
