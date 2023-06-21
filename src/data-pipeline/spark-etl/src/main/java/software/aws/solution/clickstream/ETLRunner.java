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
import org.apache.spark.sql.types.DataTypes;
import org.apache.spark.sql.types.StructField;
import org.apache.spark.sql.types.StructType;
import org.sparkproject.guava.annotations.VisibleForTesting;

import javax.validation.constraints.NotEmpty;
import java.lang.reflect.InvocationTargetException;
import java.lang.reflect.Method;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

import static org.apache.spark.sql.functions.*;

@Slf4j
@AllArgsConstructor
public class ETLRunner {
    public static final String DEBUG_LOCAL_PATH = "/tmp/etl-debug";
    private static final String TRANSFORM_METHOD_NAME = "transform";
    private final SparkSession spark;
    private final ETLRunnerConfig config;


    public void run() {
        ContextUtil.setContextProperties(this.config);

        log.info("job.name:"  + System.getProperty("job.name"));
        log.info("warehouse.dir:"  + System.getProperty("warehouse.dir"));

        Dataset<Row> dataset = readInputDataset(true);
        int inputDataPartitions = dataset.rdd().getNumPartitions();
        if (config.getRePartitions() < inputDataPartitions) {
            log.info("inputDataPartitions:" + inputDataPartitions + ", repartition to: " + config.getRePartitions());
            dataset = dataset.repartition(config.getRePartitions());
        }
        log.info("NumPartitions: " + dataset.rdd().getNumPartitions());
        dataset.cache();
        log.info(new ETLMetric(dataset, "source").toString());

        Dataset<Row> dataset2 = executeTransformers(dataset, config.getTransformerClassNames());
        writeResult(config.getOutputPath(), dataset2);
        log.info(new ETLMetric(dataset2, "sink").toString());

    }

    public Dataset<Row> readInputDataset(final boolean checkModifiedTime) {

        String jobName = ContextUtil.getJobName();

        List<String[]> partitions = getSourcePartition(config.getStartTimestamp(), config.getEndTimestamp());
        List<String> sourcePaths = getSourcePaths(config.getSourcePath(), partitions);

        String[] sourcePathsArray = sourcePaths.toArray(new String[]{});

        DateTimeFormatter dateTimeFormatter = DateTimeFormatter.ofPattern("YYYY-MM-dd'T'HH:mm:ss");
        ZoneId utc = ZoneId.of("UTC");

        ZonedDateTime modifiedAfterDatetime = Instant.ofEpochMilli(config.getStartTimestamp())
                .atZone(utc);
        // add one second to endTimestamp here to change range from inclusive to exclusive
        // (startTimestamp, endTimestamp] ==> (modifiedAfter, modifiedBefore)
        ZonedDateTime modifiedBeforeDatetime = Instant.ofEpochMilli(config.getEndTimestamp() + 1000L)
                .atZone(utc);

        String modifiedAfter = dateTimeFormatter.format(modifiedAfterDatetime);
        String modifiedBefore = dateTimeFormatter.format(modifiedBeforeDatetime);

        log.info("startTimestamp:" + config.getStartTimestamp() + ", endTimestamp:" + config.getEndTimestamp());
        log.info("modifiedAfter:" + modifiedAfter + ", modifiedBefore:" + modifiedBefore);
        log.info("sourcePathsArray:" + String.join(",", sourcePathsArray));

        StructType inputDataSchema = DataTypes.createStructType(
                new StructField[]{
                        DataTypes.createStructField("_corrupt_record", DataTypes.StringType, true),
                        DataTypes.createStructField("date", DataTypes.StringType, true),
                        DataTypes.createStructField("data", DataTypes.StringType, true),
                        DataTypes.createStructField("ip", DataTypes.StringType, true),
                        DataTypes.createStructField("source_type", DataTypes.StringType, true),
                        DataTypes.createStructField("rid", DataTypes.StringType, true),
                        DataTypes.createStructField("ua", DataTypes.StringType, true),
                        DataTypes.createStructField("m", DataTypes.StringType, true),
                        DataTypes.createStructField("uri", DataTypes.StringType, true),
                        DataTypes.createStructField("platform", DataTypes.StringType, true),
                        DataTypes.createStructField("path", DataTypes.StringType, true),
                        DataTypes.createStructField("appId", DataTypes.StringType, true),
                        DataTypes.createStructField("compression", DataTypes.StringType, true),
                        DataTypes.createStructField("ingest_time", DataTypes.LongType, true),
                        DataTypes.createStructField("server_ingest_time", DataTypes.LongType, true)
                }
        );

        Map<String, String> options = new HashMap<>();
        options.put("timeZone", "UTC");
        options.put("mode", "PERMISSIVE");
        options.put("columnNameOfCorruptRecord", "_corrupt_record");
        if (checkModifiedTime) {
            //note the range is exclusive (modifiedAfter, modifiedBefore)
            options.put("modifiedAfter", modifiedAfter);
            options.put("modifiedBefore", modifiedBefore);
        }
        Dataset<Row> dataset = spark.read()
                .options(options)
                .schema(inputDataSchema)
                .json(sourcePathsArray[0]);
        log.info("read source " + 0 + ", path:" + sourcePathsArray[0]);
        for (int i = 1; i < sourcePathsArray.length; i++) {
            Dataset<Row> datasetTemp = spark.read()
                    .options(options)
                    .schema(inputDataSchema)
                    .json(sourcePathsArray[i]);
            log.info("read source " + i + ", path:" + sourcePathsArray[i]);
            dataset = dataset.unionAll(datasetTemp);
        }

        if (config.isSaveInfoToWarehouse()) {
            Dataset<Row> readFileDataset = spark.read().format("binaryFile").options(options).load(sourcePathsArray[0]);
            for (int i = 1; i < sourcePathsArray.length; i++) {
                Dataset<Row> fileDatasetTemp = spark.read().format("binaryFile").options(options).load(sourcePathsArray[i]);
                readFileDataset.unionAll(fileDatasetTemp);
            }

            readFileDataset = readFileDataset.select(col("path"), col("modificationTime"), col("length"));
            log.info(new ETLMetric(readFileDataset, "loaded files").toString());
            readFileDataset = readFileDataset.withColumn("jobName", lit(jobName));
            readFileDataset.cache();
            readFileDataset.takeAsList(Integer.MAX_VALUE).stream()
                    .sorted(Comparator.comparing(r -> r.getAs("modificationTime"))).forEach(r -> {
                        log.info("path: " + r.getAs("path"));
                    });
            String path = System.getProperty("warehouse.dir") + "/etl_load_files";
            readFileDataset.coalesce(1).write().mode(SaveMode.Append).partitionBy("jobName")
                    .option("path", path).saveAsTable(config.getDatabase() + ".etl_load_files");
        }
        return dataset;
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
            if (ContextUtil.isDebugLocal()) {
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
        if ("json".equalsIgnoreCase(config.getOutPutFormat())) {
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
                .withColumn("partition_year", date_format(col("event_date"), "yyyy"))
                .withColumn("partition_month", date_format(col("event_date"), "MM"))
                .withColumn("partition_day", date_format(col("event_date"), "dd"));
    }

    private List<String[]> getSourcePartition(final long milliSecStart, final long milliSecEnd) {
        long oneHourMilliSec = 3600 * 1000L;
        long oneDayMilliSec = 24 * oneHourMilliSec;

        String[] endDayParts = getUTCYearMonthDay(milliSecEnd);
        List<String[]> partitions = new ArrayList<>();
        long milliSec = milliSecStart;

        while (milliSec <= milliSecEnd) {
            String[] tempDayParts = getUTCYearMonthDay(milliSec);
            if (!isDayEqual(endDayParts, tempDayParts)) {
                partitions.add(tempDayParts);
            }
            milliSec += oneDayMilliSec;
        }
        partitions.add(endDayParts);
        return partitions;
    }

    private List<String> getSourcePaths(final String sourceDir, final List<String[]> partitions) {
        return partitions.stream().map((String[] p) -> sourceDir + String.join("/",
                "year=" + p[0], "month=" + p[1], "day=" + p[2])).collect(Collectors.toList());
    }

    private String[] getUTCYearMonthDay(final long timestamp) {
        ZonedDateTime endDateDatetime = Instant.ofEpochMilli(timestamp).atZone(ZoneId.of("UTC"));
        String year = String.valueOf(endDateDatetime.getYear());
        // change month=9 -> 09
        String month = String.valueOf(endDateDatetime.getMonth().getValue() + 100).substring(1, 3);
        // change day=5 -> 05
        String day = String.valueOf(endDateDatetime.getDayOfMonth() + 100).substring(1, 3);

        return new String[] {
                year, month, day,
        };
    }

    private boolean isDayEqual(final String[] day1, final String[] day2) {
        return String.join("-", day1).equals(String.join("-", day2));
    }

}


