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
import org.apache.logging.log4j.Level;
import org.apache.logging.log4j.core.config.Configurator;
import org.apache.spark.sql.SparkSession;
import software.aws.solution.clickstream.util.*;

import java.util.Arrays;

import static com.google.common.collect.Lists.newArrayList;


@Slf4j
public final class DataProcessor {

    private static final String APP_NAME = "ClickStreamDataETL";

    private DataProcessor() {
    }

    /**
     * This job accept input argument with length 19.
     * args[0] means runFlag, e.g. disable.traffic.source.enrichment|disable.max.length.check
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
     * args[15] means nUserKeepDays.
     * args[16] means nItemKeepDays.
     * args[17] means configRuleDir.
     * args[18] means filterBotByUa.
     * @param args input arguments
     */
    public static void main(final String[] args) {
        runWithSpark(args, null);
    }
    public static void runWithSpark(final String[] args, final SparkSession sparkSession){
        int argsLen = 19;
        Preconditions.checkArgument(args.length == argsLen, "This job can only accept input argument with length " + argsLen);
        String runFlag = args[0];
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
        String nUserKeepDays = args[15];
        String nItemKeepDays = args[16];
        String configRuleDir = args[17];
        String filterBotByUa = args[18];

        ETLRunnerConfig runnerConfig;
        runnerConfig = new ETLRunnerConfig(
                new ETLRunnerConfig.TransformationConfig(
                        newArrayList(transformerClassNames.split(",")),
                        projectId,
                        validAppIds,
                        Long.valueOf(dataFreshnessInHour),
                        Integer.valueOf(nUserKeepDays),
                        Integer.valueOf(nItemKeepDays),
                        configRuleDir,
                        filterBotByUa
                        ),
                new ETLRunnerConfig.InputOutputConfig(
                        runFlag,
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
                    .config("spark.sql.mapKeyDedupPolicy", "LAST_WIN")
                    .enableHiveSupport().appName(APP_NAME).getOrCreate();
        }

        Arrays.stream(spark.sparkContext().getConf().getAll()).forEach(c -> log.info(c._1 + " -> " + c._2));
        Configurator.setRootLevel(Level.WARN); // NOSONAR
        Configurator.setLevel("software.aws.solution.clickstream", Level.INFO); // NOSONAR

        ETLRunner etlRunner = new ETLRunner(spark, runnerConfig);
        etlRunner.run();
        spark.stop();
    }
}
