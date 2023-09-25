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
import org.apache.spark.sql.Column;
import org.apache.spark.sql.SaveMode;
import org.apache.spark.sql.Row;
import org.apache.spark.sql.Dataset;
import org.apache.spark.sql.SparkSession;
import org.apache.spark.sql.functions;
import org.apache.spark.sql.types.DataTypes;
import org.apache.spark.sql.types.StructField;
import org.apache.spark.sql.types.StructType;
import org.sparkproject.guava.annotations.VisibleForTesting;
import software.aws.solution.clickstream.exception.ExecuteTransformerException;

import javax.validation.constraints.NotEmpty;
import java.lang.reflect.InvocationTargetException;
import java.lang.reflect.Method;
import java.nio.file.Paths;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;
import java.util.HashMap;
import java.util.Arrays;
import java.util.ArrayList;
import java.util.Comparator;

import java.util.stream.Collectors;
import java.util.stream.Stream;

import static org.apache.spark.sql.functions.col;
import static org.apache.spark.sql.functions.input_file_name;
import static org.apache.spark.sql.functions.lit;
import static org.apache.spark.sql.functions.date_format;

import static software.aws.solution.clickstream.ContextUtil.JOB_NAME_PROP;
import static software.aws.solution.clickstream.ContextUtil.WAREHOUSE_DIR_PROP;
import static software.aws.solution.clickstream.ContextUtil.OUTPUT_COALESCE_PARTITIONS_PROP;
import static software.aws.solution.clickstream.Transformer.JOB_NAME_COL;

@Slf4j
public class ETLRunner {
    public static final String PARTITION_APP = "partition_app";
    public static final String PARTITION_YEAR = "partition_year";
    public static final String PARTITION_MONTH = "partition_month";
    public static final String PARTITION_DAY = "partition_day";

    public enum TableName {
        ODS_EVENTS("ods_events"),
        ITEM("item"),
        USER("user"),
        EVENT("event"),
        EVEN_PARAMETER("event_parameter");
        final String tableName;
        TableName(final String name) {
            this.tableName = name;
        }
    }
    public static final String DEBUG_LOCAL_PATH = "/tmp/etl-debug";
    public static final String TRANSFORM_METHOD_NAME = "transform";
    public static final String EVENT_DATE = "event_date";
    private final SparkSession spark;
    private final ETLRunnerConfig config;

    private boolean multipleOutDataset = false;
    public ETLRunner(final SparkSession spark, final ETLRunnerConfig config) {
        this.spark = spark;
        this.config = config;
    }

    public void run() {
        ContextUtil.setContextProperties(this.config);

        log.info(JOB_NAME_PROP + ":"  + System.getProperty(JOB_NAME_PROP));
        log.info(WAREHOUSE_DIR_PROP + ":"  + System.getProperty(WAREHOUSE_DIR_PROP));

        Dataset<Row> dataset = readInputDataset(true);
        ContextUtil.cacheDataset(dataset);
        log.info(new ETLMetric(dataset, "source").toString());

        Dataset<Row> dataset2 = executeTransformers(dataset, config.getTransformerClassNames());

        long resultCount = writeResultDataset(dataset2);
        log.info(new ETLMetric(resultCount, "sink").toString());
    }

    private Dataset<Row> rePartitionInputDataset(final Dataset<Row> dataset) {
        int inputDataPartitions = dataset.rdd().getNumPartitions();
        Dataset<Row> repDataset = dataset;
        if (config.getRePartitions() > 0
                && (inputDataPartitions > 200 || config.getRePartitions() < inputDataPartitions)
        ) {
            log.info("inputDataPartitions:" + inputDataPartitions + ", repartition to: " + config.getRePartitions());
            repDataset = repDataset.repartition(config.getRePartitions(),
                    col("ingest_time"), col("rid"));
        }
        log.info("NumPartitions: " + repDataset.rdd().getNumPartitions());
        return repDataset;
    }

    public long writeResultDataset(final Dataset<Row> dataset2) {
        String outPath = config.getOutputPath();
        TableName tableName = TableName.ODS_EVENTS;
        if (this.multipleOutDataset) {
            tableName = TableName.EVENT;
        }
        return writeResult(outPath, dataset2, tableName);
    }

    public Dataset<Row> readInputDataset(final boolean checkModifiedTime) {

        String jobName = ContextUtil.getJobName();

        List<String[]> partitions = getSourcePartition(config.getStartTimestamp(), config.getEndTimestamp());
        List<String> sourcePaths = getSourcePaths(config.getSourcePath(), partitions);

        String[] sourcePathsArray = sourcePaths.toArray(new String[]{});

        DateTimeFormatter dateTimeFormatter = DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss");
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
                        DataTypes.createStructField("server_ingest_time", DataTypes.LongType, true),
                        DataTypes.createStructField("hour", DataTypes.IntegerType   , true)
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
                readFileDataset = readFileDataset.unionAll(fileDatasetTemp);
            }

            readFileDataset = readFileDataset.select(col("path"), col("modificationTime"), col("length"));
            log.info(new ETLMetric(readFileDataset, "loaded files").toString());
            readFileDataset = readFileDataset.withColumn(JOB_NAME_COL, lit(jobName));
            readFileDataset.cache();
            readFileDataset.takeAsList(Integer.MAX_VALUE).stream()
                    .sorted(Comparator.comparing(r -> r.getAs("modificationTime"))).forEach(r -> {
                        log.info("path: " + r.getAs("path"));
                    });
            String path = System.getProperty(WAREHOUSE_DIR_PROP) + "/etl_load_files";
            readFileDataset.coalesce(1).write().mode(SaveMode.Append).partitionBy(JOB_NAME_COL)
                    .option("path", path).saveAsTable(config.getDatabase() + ".etl_load_files");
        }

        List<Row> inputFiles = dataset.select(input_file_name().alias("fileName")).distinct().collectAsList();
        inputFiles.forEach(row -> {
            log.info(row.getAs("fileName"));
        });
        long fileNameCount = inputFiles.size();
        log.info(new ETLMetric(fileNameCount, "loaded input files").toString());

        return rePartitionInputDataset(dataset);
    }

    @VisibleForTesting
    public Dataset<Row> executeTransformers(final Dataset<Row> dataset,
                                            final @NotEmpty List<String> transformerClassNames) {
        Dataset<Row> result = dataset;
        for (String transformerClassName : transformerClassNames) {
            log.info("executeTransformer: " + transformerClassName);
            result = executeTransformer(result, transformerClassName);
        }
        return execPostTransform(result, transformerClassNames.get(0));
    }

    public static Dataset<Row> execPostTransform(final Dataset<Row> dataset, final String transformerClassName) {
        List<String> colList = Arrays.asList(dataset.columns());
        log.info("Columns:" + String.join(",", dataset.columns()));
        if (colList.contains("event_params") && colList.contains("event_bundle_sequence_id")
                && colList.contains("items") && colList.contains("user_properties")) {
            return dataset.select(getDistFields());
        } else {
            return postTransform(dataset, transformerClassName);
        }
    }

    private static Dataset<Row> postTransform(final Dataset<Row> dataset, final String transformerClassName) {
        try {
            Class<?> transformClass = Class.forName(transformerClassName);
            return tryToExecPostTransform(dataset, transformClass);
        } catch (Exception e) {
            log.error(e.getMessage());
            throw new ExecuteTransformerException(e);
        }
    }

    @SuppressWarnings("unchecked")
    private static Dataset<Row> tryToExecPostTransform(final Dataset<Row> dataset,
                                                       final Class<?> transformClass) throws InstantiationException, IllegalAccessException, InvocationTargetException {
        String mName = "postTransform";
        Dataset<Row> resultDataset = dataset;
        try {
            Method postTransform = transformClass.getDeclaredMethod(mName, Dataset.class);
            log.info("find method: " + postTransform.getName());
            Object instance = transformClass.getDeclaredConstructor().newInstance();
            resultDataset = (Dataset<Row>) postTransform.invoke(instance, dataset);
        } catch (NoSuchMethodException ignored) {
            log.info("did not find method: " + mName);
        }
        return resultDataset;
    }

    @SuppressWarnings("unchecked")
    private Dataset<Row> executeTransformer(final Dataset<Row> dataset, final String transformerClassName) {
        try {
            Class<?> aClass = Class.forName(transformerClassName);
            Object instance = aClass.getDeclaredConstructor().newInstance();
            Method transform = aClass.getMethod(TRANSFORM_METHOD_NAME, Dataset.class);
            Dataset<Row> eventDataset;

            if (List.class.getCanonicalName().equals(transform.getReturnType().getCanonicalName())) {
                // V2 transform
                List<Dataset<Row>> transformedDatasets = (List<Dataset<Row>>) transform.invoke(instance, dataset);
                eventDataset = transformedDatasets.get(0);
                saveTransformedDatasets(transformedDatasets);
            } else {
                eventDataset = (Dataset<Row>) transform.invoke(instance, dataset);
            }

            if (ContextUtil.isDebugLocal()) {
                eventDataset.write().mode(SaveMode.Overwrite)
                        .json(DEBUG_LOCAL_PATH + "/" + transformerClassName + "-eventDataset/");
            }
            return eventDataset;
        } catch (ClassNotFoundException | InvocationTargetException | InstantiationException
                 | IllegalAccessException | NoSuchMethodException e) {
            log.error(e.getMessage());
            throw new ExecuteTransformerException(e);
        }
    }

    private void saveTransformedDatasets(final List<Dataset<Row>> transformedDatasets) {
        if (transformedDatasets.size() != 4) {
            return;
        }

        this.multipleOutDataset = true;
        Dataset<Row> evenParamDataset = transformedDatasets.get(1);
        Dataset<Row> itemDataset = transformedDatasets.get(2);
        Dataset<Row> userDataset = transformedDatasets.get(3);
        String outPath = config.getOutputPath();
        long evenParamDatasetCount = writeResult(outPath, evenParamDataset, TableName.EVEN_PARAMETER);
        log.info(new ETLMetric(evenParamDatasetCount, "sink " + TableName.EVEN_PARAMETER.tableName).toString());

        if (itemDataset != null) {
            long itemDatasetCount = writeResult(outPath, itemDataset, TableName.ITEM);
            log.info(new ETLMetric(itemDatasetCount, "sink " + TableName.ITEM.tableName).toString());
        }
        if (userDataset != null) {
            long userDatasetCount = writeResult(outPath, userDataset, TableName.USER);
            log.info(new ETLMetric(userDatasetCount, "sink " + TableName.USER.tableName).toString());
        }
    }

    protected long writeResult(final String outputPath, final Dataset<Row> dataset, final TableName tbName) {
        Dataset<Row> partitionedDataset = prepareForPartition(dataset, tbName);
        long resultCount = partitionedDataset.count();
        log.info(new ETLMetric(resultCount, "writeResult for table " + tbName).toString());
        log.info("outputPath: " + outputPath);
        if (resultCount == 0) {
            return 0L;
        }
        String saveOutputPath = outputPath;
        if (!(saveOutputPath.endsWith(tbName.tableName + "/")
                || saveOutputPath.endsWith(tbName.tableName))) {
            saveOutputPath = Paths.get(outputPath, tbName.tableName).toString()
                    .replace("s3:/", "s3://");
        }
        log.info("saveOutputPath: " + saveOutputPath);

        SaveMode saveMode = SaveMode.Append;
        if (tbName == TableName.ITEM || tbName == TableName.USER) {
            saveMode = SaveMode.Overwrite;
        }
        log.info("saveMode: " + saveMode);

        String[] partitionBy = new String[]{PARTITION_APP, PARTITION_YEAR, PARTITION_MONTH, PARTITION_DAY};
        if ("json".equalsIgnoreCase(config.getOutPutFormat())) {
            partitionedDataset.write().partitionBy(partitionBy).mode(saveMode).json(saveOutputPath);
        } else {
            if (saveMode == SaveMode.Overwrite) {
                partitionedDataset = partitionedDataset.coalesce(1);
            } else {
                int outPartitions = Integer.parseInt(System.getProperty(OUTPUT_COALESCE_PARTITIONS_PROP, "-1"));
                int numPartitions = partitionedDataset.rdd().getNumPartitions();
                log.info("outPartitions:" + outPartitions);
                log.info("partitionedDataset.NumPartitions: " + numPartitions);
                if (outPartitions > 0 && numPartitions > outPartitions) {
                    partitionedDataset = partitionedDataset.coalesce(outPartitions);
                }
            }
            partitionedDataset.write()
                    .option("compression", "snappy")
                    .partitionBy(partitionBy).mode(saveMode).parquet(saveOutputPath);
        }
        return resultCount;
    }

    private Dataset<Row> prepareForPartition(final Dataset<Row> dataset, final TableName tbName) {
        List<String> colNames = Arrays.asList(dataset.columns());
        String appId = "app_id";
        Column appIdCol = col("app_info").getItem(appId);
        if (colNames.contains(appId)) {
            appIdCol = col(appId);
        }
        Dataset<Row> dataset1 = dataset.withColumn(PARTITION_APP, appIdCol)
                .withColumn(PARTITION_YEAR, date_format(col(EVENT_DATE), "yyyy"))
                .withColumn(PARTITION_MONTH, date_format(col(EVENT_DATE), "MM"))
                .withColumn(PARTITION_DAY, date_format(col(EVENT_DATE), "dd"));
        if (Arrays.asList(TableName.USER, TableName.EVEN_PARAMETER, TableName.ITEM).contains(tbName)) {
            return dataset1.drop(EVENT_DATE, appId);
        }
        return dataset1;

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

    public static Column[] getDistFields() {
       List<Column> cols = Stream.of(new String[]{
                "app_info", "device", "ecommerce", "event_bundle_sequence_id",
                EVENT_DATE, "event_dimensions", "event_id", "event_name",
                "event_params", "event_previous_timestamp", "event_server_timestamp_offset", "event_timestamp",
                "event_value_in_usd", "geo", "ingest_timestamp", "items",
                "platform", "privacy_info", "project_id", "traffic_source",
                "user_first_touch_timestamp", "user_id", "user_ltv", "user_properties",
                "user_pseudo_id"
        }).map(functions::col).collect(Collectors.toList());
       return cols.toArray(new Column[] {});
    }

}


