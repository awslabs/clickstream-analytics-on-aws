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

import lombok.AllArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.spark.sql.Dataset;
import org.apache.spark.sql.Row;
import org.apache.spark.sql.SaveMode;
import org.apache.spark.sql.SparkSession;
import org.sparkproject.guava.annotations.VisibleForTesting;

import javax.validation.constraints.NotEmpty;
import javax.validation.constraints.NotNull;
import java.lang.reflect.InvocationTargetException;
import java.lang.reflect.Method;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.stream.Collectors;

import static java.lang.String.format;
import static org.apache.spark.sql.functions.col;
import static org.apache.spark.sql.functions.substring;

@Slf4j
@AllArgsConstructor
public class ETLRunner {
    public static final String DEBUG_LOCAL_PATH = "/tmp/etl-debug";
    private static final String TRANSFORM_METHOD_NAME = "transform";
    private final SparkSession spark;
    private final ETLRunnerConfig config;


    public void run() {
        String sql = configAndSQL();
        Dataset<Row> dataset = spark.sql(sql);
        int inputDataPartitions = dataset.rdd().getNumPartitions();
        if (config.rePartitions < inputDataPartitions) {
            log.info("inputDataPartitions:" + inputDataPartitions + ", repartition to: " + config.rePartitions);
            dataset = dataset.repartition(config.rePartitions);
        }
        log.info("NumPartitions: " + dataset.rdd().getNumPartitions());
        log.info(new ETLMetric(dataset, "source").toString());
        Dataset<Row> dataset2 = executeTransformers(dataset, config.transformerClassNames);
        writeResult(config.outputPath, dataset2);
        log.info(new ETLMetric(dataset2, "sink").toString());

    }

    public String configAndSQL() {
        System.setProperty("job.data.uri", config.jobDataUri);
        System.setProperty("project.id", config.projectId);
        System.setProperty("app.ids", config.validAppIds);
        System.setProperty("output.path", config.outputPath);
        System.setProperty("data.freshness.hour", String.valueOf(config.dataFreshnessInHour));
        System.setProperty("output.coalesce.partitions", String.valueOf(config.outPartitions));

        List<String[]> partitions = getSourcePartition(config.startTimestamp, config.endTimestamp);
        String partitionsCondition = partitions.stream()
                .map(p -> format("\n(year='%s' AND month='%s' AND day='%s')",
                        p[0], p[1], p[2])).collect(Collectors.joining(" OR "));
        String sql = format("select * from `%s`.%s", config.database, config.sourceTable)
                + format(" where (%s\n)", partitionsCondition)
                + format(" AND ingest_time >= %d AND ingest_time < %d", config.startTimestamp, config.endTimestamp);
        log.info("SQL: " + sql);
        return sql;
    }

    @VisibleForTesting
    public Dataset<Row> executeTransformers(final Dataset<Row> dataset,
                                            final @NotEmpty List<String> transformerClassNames) {
        Dataset<Row> result = dataset;
        for (String transformerClassName : transformerClassNames) {
            result = executeTransformer(result, transformerClassName);
            log.info(new ETLMetric(result, "after " + transformerClassName).toString());
            if (result.count() == 0) {
                break;
            }
        }
        return result.select(
                "app_info", "device", "ecommerce", "event_bundle_sequence_id",
                "event_date", "event_dimensions", "event_id", "event_name",
                "event_params", "event_previous_timestamp", "event_server_timestamp_offset", "event_timestamp",
                "event_value_in_usd", "geo", "ingest_timestamp", "items",
                "platform", "privacy_info", "project_id", "traffic_source",
                "user_first_touch_timestamp", "user_id", "user_ltv", "user_properties",
                "user_pseudo_id"
        );
    }

    @SuppressWarnings("unchecked")
    private Dataset<Row> executeTransformer(final Dataset<Row> dataset, final String transformerClassName) {
        try {
            Class<?> aClass = Class.forName(transformerClassName);
            Object instance = aClass.getDeclaredConstructor().newInstance();
            Method transform = aClass.getMethod(TRANSFORM_METHOD_NAME, Dataset.class);
            Dataset<Row> transformedDataset = (Dataset<Row>) transform.invoke(instance, dataset);
            boolean debugLocal = Boolean.valueOf(System.getProperty("debug.local"));
            if (debugLocal) {
                transformedDataset.write().mode(SaveMode.Overwrite)
                        .json(DEBUG_LOCAL_PATH + "/" + transformerClassName + "/");
            }
            return transformedDataset;
        } catch (ClassNotFoundException | InvocationTargetException | InstantiationException
                 | IllegalAccessException | NoSuchMethodException e) {
            log.error(e.getMessage());
            throw new RuntimeException(e);
        }
    }

    protected void writeResult(final String outputPath, final Dataset<Row> dataset) {
        Dataset<Row> partitionedDataset = prepareForPartition(dataset);
        log.info(new ETLMetric(partitionedDataset, "writeResult").toString());
        log.info("outputPath: " + outputPath);
        String[] partitionBy = new String[]{"partition_app", "partition_year", "partition_month", "partition_day"};
        if ("json".equalsIgnoreCase(config.outPutFormat)) {
            partitionedDataset.write().partitionBy(partitionBy).mode(SaveMode.Append).json(outputPath);
        } else {
            int outPartitions = Integer.parseInt(System.getProperty("output.coalesce.partitions", "-1"));
            int numPartitions = partitionedDataset.rdd().getNumPartitions();
            log.info("outPartitions:" + outPartitions);
            log.info("partitionedDataset.NumPartitions: " + numPartitions);
            if (outPartitions > 0 && numPartitions > outPartitions) {
                partitionedDataset = partitionedDataset.coalesce(outPartitions);
            }
            partitionedDataset.write()
                    .option("compression", "snappy")
                    .partitionBy(partitionBy).mode(SaveMode.Append).parquet(outputPath);
        }
    }

    private Dataset<Row> prepareForPartition(final Dataset<Row> dataset) {
        return dataset.withColumn("partition_app", col("app_info").getItem("app_id"))
                .withColumn("partition_year", substring(col("event_date"), 1, 4))
                .withColumn("partition_month", substring(col("event_date"), 5, 2))
                .withColumn("partition_day", substring(col("event_date"), 7, 2));
    }

    private List<String[]> getSourcePartition(final long milliSecStart, final long milliSecEnd) {
        List<String[]> partitions = new ArrayList<>();
        long milliSec = milliSecStart;
        long oneDayMilliSec = 24 * 3600 * 1000L;
        while (milliSec <= milliSecEnd) {
            Instant startInstant = new Date(milliSec).toInstant();
            String startDate = startInstant.toString().split("T")[0];
            String year = startDate.split("-")[0];
            String month = startDate.split("-")[1];
            String day = startDate.split("-")[2];
            //String hour = startInstant.toString().split("T")[1].split(":")[0];
            partitions.add(new String[]{year, month, day});
            milliSec += oneDayMilliSec;
        }
        return partitions;
    }

    public static class ETLRunnerConfig {
        @NotEmpty
        private final String database;
        @NotEmpty
        private final String sourceTable;
        @NotEmpty
        private final String jobDataUri;
        @NotEmpty
        private final List<String> transformerClassNames;
        @NotEmpty
        private final String outputPath;
        @NotEmpty
        private final String projectId;
        @NotEmpty
        private final String validAppIds;
        @NotNull
        private final String outPutFormat;
        @NotNull
        private final Long startTimestamp;
        @NotNull
        private final Long endTimestamp;
        @NotNull
        private final Long dataFreshnessInHour;
        @NotNull
        private final int outPartitions;
        @NotNull
        private final int rePartitions;

        public ETLRunnerConfig(@NotEmpty final String database,
                               @NotEmpty final String sourceTable,
                               @NotEmpty final String jobDataUri,
                               @NotEmpty final List<String> transformerClassNames,
                               @NotEmpty final String outputPath,
                               @NotEmpty final String projectId,
                               @NotEmpty final String validAppIds,
                               @NotNull final String outPutFormat,
                               @NotNull final Long startTimestamp,
                               @NotNull final Long endTimestamp,
                               @NotNull final Long dataFreshnessInHour,
                               @NotNull final int outPartitions,
                               @NotNull final int rePartitions) {
            this.database = database;
            this.sourceTable = sourceTable;
            this.jobDataUri = jobDataUri;
            this.transformerClassNames = transformerClassNames;
            this.outputPath = outputPath;
            this.projectId = projectId;
            this.validAppIds = validAppIds;
            this.outPutFormat = outPutFormat;
            this.startTimestamp = startTimestamp;
            this.endTimestamp = endTimestamp;
            this.dataFreshnessInHour = dataFreshnessInHour;
            this.outPartitions = outPartitions;
            this.rePartitions = rePartitions;
        }
    }
}


class ETLMetric {

    private final Dataset<Row> dataset;
    private final String info;

    ETLMetric(final Dataset<Row> dataset, final String info) {
        this.dataset = dataset;
        this.info = info;
    }

    @Override
    public String toString() {
        return "[ETLMetric]" + this.info + " dataset count:" + dataset.count();
    }
}
