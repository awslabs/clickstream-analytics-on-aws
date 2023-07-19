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

package software.aws.solution.sesnorsdata;

import com.google.common.base.Charsets;
import com.google.common.collect.Maps;
import com.google.common.io.Resources;
import lombok.extern.slf4j.Slf4j;
import org.apache.spark.api.java.function.FilterFunction;
import org.apache.spark.sql.Column;
import org.apache.spark.sql.Dataset;
import org.apache.spark.sql.Row;
import org.apache.spark.sql.SaveMode;
import org.apache.spark.sql.types.DataType;
import org.apache.spark.sql.types.DataTypes;
import org.apache.spark.sql.types.StructField;
import org.apache.spark.sql.types.StructType;
import scala.collection.JavaConverters;
import scala.collection.immutable.Seq;
import software.aws.solution.clickstream.ContextUtil;
import software.aws.solution.clickstream.ETLMetric;

import java.io.IOException;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import java.util.stream.Stream;

import static org.apache.spark.sql.functions.*;
import static software.aws.solution.clickstream.ETLRunner.getDistFields;

@Slf4j
public final class SensorsDataTransformer {
    private final List<String> transformedProps = Arrays.asList(
            "$app_id", "$app_name", "$app_version",
            "$brand", "$model", "$manufacturer",
            "$screen_width", "$screen_height", "$carrier",
            "$network_type", "$os_version", "$os",
            "$browser", "$browser_version", "$timezone_offset",
            "$device_id", "$country", "$city"
    );
    private final PropsConverter propsConverter = new PropsConverter();

    public Dataset<Row> transform(final Dataset<Row> dataset) {
        log.info(new ETLMetric(dataset, "transform enter").toString());
        Dataset<Row> dataset1 = processSchema(dataset);
        ContextUtil.cacheDataset(dataset1);
        log.info(new ETLMetric(dataset1, "after processSchema").toString());

        Dataset<Row> dataset2 = filterByFreshness(dataset1);
        log.info(new ETLMetric(dataset2, "after filterByFreshness").toString());

        Dataset<Row> dataset3 = filterByEvents(dataset2);
        log.info(new ETLMetric(dataset3, "after filterByEvents").toString());

        Dataset<Row> dataset4 = movePropertiesToTop(dataset3);
        Dataset<Row> dataset5 = transformAppInfo(dataset4);
        Dataset<Row> dataset6 = transformMisc(dataset5);
        Dataset<Row> dataset7 = transformDevice(dataset6);
        Dataset<Row> dataset8 = transformGeo(dataset7);
        Dataset<Row> dataset9 = transformProps(dataset8);

        Column[] distCol = getDistFields();
        List<Column> transformOutFields = Stream.of(distCol).collect(Collectors.toList());

        transformOutFields.add(col("ua"));
        transformOutFields.add(col("geo_for_enrich"));
        Dataset<Row> dataset10 = dataset9.select(
                transformOutFields.toArray(new Column[]{})
        );
        return dataset10;
    }

    private Dataset<Row> processSchema(final Dataset<Row> dataset1) {
        String schemaString;
        try {
            schemaString = Resources.toString(getClass().getResource("/sensors_data_schema.json"), Charsets.UTF_8);
        } catch (IOException e) {
            throw new RuntimeException(e);
        }
        DataType dataType = DataType.fromJson(schemaString);

        Map<String, String> options = Maps.newHashMap();
        options.put("mode", "PERMISSIVE");
        options.put("columnNameOfCorruptRecord", "_corrupt_record");
        Dataset<Row> dataset2 = dataset1.withColumn("data", from_json(col("data"), dataType, options));

        Dataset<Row> corruptedDataset = dataset2.filter(col("data").getField("_corrupt_record").isNotNull());
        long corruptedDatasetCount = corruptedDataset.count();
        log.info(new ETLMetric(corruptedDatasetCount, "corruptedDatasetCount").toString());
        if (corruptedDatasetCount > 0) {
            saveTempDataset(corruptedDataset, "corrupted_dataset");
        }
        Dataset<Row> dataset3 = dataset2.filter(col("data").getField("_corrupt_record").isNull());
        return dataset3;
    }

    private void saveTempDataset(final Dataset<Row> tempDataset, final String name) {
        Dataset<Row> tempSaveDataset = tempDataset.withColumn("jobName", lit(ContextUtil.getJobName()));
        String s3FilePath = System.getProperty("warehouse.dir") + "/" + name;
        log.info("save tempDataset to " + s3FilePath);
        tempSaveDataset.write().partitionBy("jobName")
                .option("compression", "gzip")
                .mode(SaveMode.Append).json(s3FilePath);
    }

    private Dataset<Row> filterByFreshness(final Dataset<Row> dataset1) {
        long dataFreshnessInHour = Long.parseLong(System.getProperty("data.freshness.hour", "72"));
        return dataset1.filter((FilterFunction<Row>) row -> {
            Row data = row.getStruct(row.fieldIndex("data"));
            long ingestTimestamp = row.getAs("ingest_time");
            if (data.isNullAt(data.fieldIndex("time"))) {
                return true;
            }

            long eventTime = data.getLong(data.fieldIndex("time"));
            boolean isDataInFreshness = ingestTimestamp - eventTime <= dataFreshnessInHour * 3600 * 1000L;
            return data.getBoolean(data.fieldIndex("time_free")) && isDataInFreshness;
        });
    }

    private Dataset<Row> filterByEvents(final Dataset<Row> dataset1) {
        String[] ignoreEvents = new String[]{
                "profile_increment",
                "profile_delete",
                "profile_append",
                "profile_unset",
                "item_delete"
        };
        Dataset<Row> ignoreEventsDataset = dataset1.filter(col("data").getField("event").isin(ignoreEvents));
        long ignoreEventsDatasetCount = ignoreEventsDataset.count();
        log.info(new ETLMetric(ignoreEventsDatasetCount, "ignoredEventsDatasetCount").toString());
        if (ignoreEventsDatasetCount > 0) {
            saveTempDataset(ignoreEventsDataset, "ignored_events_dataset");
        }

        return dataset1.filter(not(col("data").getField("event").isin(ignoreEvents)));
    }


    private Dataset<Row> movePropertiesToTop(final Dataset<Row> dataset1) {
        Dataset<Row> dataset2 = dataset1.withColumn("properties", dataset1.col("data").getField("properties"));
        List<String> dropColList = Collections.singletonList("properties");
        Seq<String> dropColSeq = JavaConverters.asScalaIteratorConverter(dropColList.listIterator()).asScala().toSeq();
        return dataset2.withColumn("data", dataset2.col("data").dropFields(dropColSeq));
    }

    private Dataset<Row> transformAppInfo(final Dataset<Row> dataset1) {
        Column propertiesCol = col("properties");
        Dataset<Row> dataset2 = dataset1.withColumn("app_info",
                struct(
                        get_json_object(propertiesCol, "$.$app_name").alias("app_id"),
                        get_json_object(propertiesCol, "$.$app_id").alias("id"),
                        get_json_object(propertiesCol, "$.$ios_install_source").alias("install_source"),
                        get_json_object(propertiesCol, "$.$app_version").alias("version")
                ));
        return dataset2;
    }

    private Dataset<Row> transformMisc(final Dataset<Row> dataset1) {
        String projectId = System.getProperty("project.id");

        StructType userValueType = DataTypes.createStructType(new StructField[]{
                DataTypes.createStructField("double_value", DataTypes.DoubleType, true),
                DataTypes.createStructField("float_value", DataTypes.FloatType, true),
                DataTypes.createStructField("int_value", DataTypes.LongType, true),
                DataTypes.createStructField("string_value", DataTypes.StringType, true),
                DataTypes.createStructField("set_timestamp_micros", DataTypes.LongType, true),
        });

        StructType commonValueType = DataTypes.createStructType(new StructField[]{
                DataTypes.createStructField("double_value", DataTypes.DoubleType, true),
                DataTypes.createStructField("float_value", DataTypes.FloatType, true),
                DataTypes.createStructField("int_value", DataTypes.LongType, true),
                DataTypes.createStructField("string_value", DataTypes.StringType, true),
        });

        StructType userItemType = DataTypes.createStructType(new StructField[]{
                DataTypes.createStructField("key", DataTypes.StringType, true),
                DataTypes.createStructField("value", userValueType, true),
        });

        StructType commonItemType = DataTypes.createStructType(new StructField[]{
                DataTypes.createStructField("key", DataTypes.StringType, true),
                DataTypes.createStructField("value", commonValueType, true),
        });

        StructType userLtvType = DataTypes.createStructType(new StructField[]{
                DataTypes.createStructField("revenue", DataTypes.DoubleType, true),
                DataTypes.createStructField("currency", DataTypes.StringType, true),
        });

        StructType trafficSourceType = DataTypes.createStructType(new StructField[]{
                DataTypes.createStructField("medium", DataTypes.StringType, true),
                DataTypes.createStructField("name", DataTypes.StringType, true),
                DataTypes.createStructField("source", DataTypes.StringType, true),
        });

        return dataset1.withColumn("user_pseudo_id", col("data").getItem("distinct_id"))
                .withColumn("user_id", coalesce(col("data").getField("original_id"),
                        col("data").getField("distinct_id")))
                .withColumn("event_timestamp", col("data").getItem("time"))
                .withColumn("ingest_timestamp", col("ingest_time"))
                .withColumn("event_date", to_date(timestamp_seconds(col("data").getItem("time").$div(1000))))
                .withColumn("ingest_timestamp", col("ingest_time").cast(DataTypes.LongType))
                .withColumn("event_server_timestamp_offset", (col("ingest_time").$minus(col("data").getItem("time"))).cast(DataTypes.LongType))
                .withColumn("event_previous_timestamp", lit(null).cast(DataTypes.LongType))
                .withColumn("platform", lit(null).cast(DataTypes.StringType))
                .withColumn("event_id", lit(null).cast(DataTypes.StringType))
                .withColumn("event_name",
                        concat_ws("-",
                                col("data").getItem("type"),
                                coalesce(col("data").getItem("event"), lit(""))))
                .withColumn("ecommerce", col("data").getField("ecommerce"))
                .withColumn("items", col("data").getField("items"))
                .withColumn("project_id", lit(projectId))
                .withColumn("event_value_in_usd", lit(null).cast(DataTypes.FloatType))
                .withColumn("event_bundle_sequence_id", lit(null).cast(DataTypes.LongType))
                .withColumn("user_first_touch_timestamp", lit(null).cast(DataTypes.LongType))
                .withColumn("user_ltv", lit(null).cast(userLtvType))
                .withColumn("traffic_source", lit(null).cast(trafficSourceType))
                .withColumn("privacy_info", lit(null).cast(DataTypes.createArrayType(commonItemType)))
                .withColumn("event_dimensions", lit(null).cast(DataTypes.createArrayType(commonItemType)))
                .withColumn("event_params", lit(null).cast(DataTypes.createArrayType(commonItemType)))
                .withColumn("user_properties", lit(null).cast(DataTypes.createArrayType(userItemType)));
    }

    private Dataset<Row> transformDevice(final Dataset<Row> dataset1) {
        Column propertiesCol = col("properties");

        return dataset1.withColumn("device",
                struct(
                        (get_json_object(propertiesCol, "$.$brand")).cast(DataTypes.StringType).alias("mobile_brand_name"),
                        (get_json_object(propertiesCol, "$.$model")).cast(DataTypes.StringType).alias("mobile_model_name"),
                        (get_json_object(propertiesCol, "$.$manufacturer")).cast(DataTypes.StringType).alias("manufacturer"),
                        (get_json_object(propertiesCol, "$.$screen_width")).cast(DataTypes.LongType).alias("screen_width"),
                        (get_json_object(propertiesCol, "$.$screen_height")).cast(DataTypes.LongType).alias("screen_height"),
                        (get_json_object(propertiesCol, "$.$carrier")).cast(DataTypes.StringType).alias("carrier"),
                        (get_json_object(propertiesCol, "$.$network_type")).cast(DataTypes.StringType).alias("network_type"),
                        (get_json_object(propertiesCol, "$.$os_version")).cast(DataTypes.StringType).alias("operating_system_version"),
                        (get_json_object(propertiesCol, "$.$os")).cast(DataTypes.StringType).alias("operating_system"),
                        (get_json_object(propertiesCol, "$.$browser")).cast(DataTypes.StringType).alias("ua_browser"),
                        (get_json_object(propertiesCol, "$.$browser_version")).cast(DataTypes.StringType).alias("ua_browser_version"),
                        lit(null).cast(DataTypes.StringType).alias("ua_os"),
                        lit(null).cast(DataTypes.StringType).alias("ua_os_version"),
                        lit(null).cast(DataTypes.StringType).alias("ua_device"),
                        lit(null).cast(DataTypes.StringType).alias("ua_device_category"),
                        lit(null).cast(DataTypes.StringType).alias("system_language"),
                        (get_json_object(propertiesCol, "$timezone_offset").multiply(60)).cast(DataTypes.LongType).alias("time_zone_offset_seconds"),
                        (get_json_object(propertiesCol, "$device_id")).cast(DataTypes.StringType).alias("vendor_id"),
                        lit(null).cast(DataTypes.StringType).alias("advertising_id"),
                        lit(null).cast(DataTypes.StringType).alias("host_name")
                ));
    }

    private Dataset<Row> transformGeo(final Dataset<Row> dataset) {
        Column propertiesCol = col("properties");
        return dataset.withColumn("geo",
                        struct(
                                (get_json_object(propertiesCol, "$.$country")).cast(DataTypes.StringType).alias("country"),
                                lit(null).cast(DataTypes.StringType).alias("continent"),
                                lit(null).cast(DataTypes.StringType).alias("sub_continent"),
                                lit(null).cast(DataTypes.StringType).alias("locale"),
                                lit(null).cast(DataTypes.StringType).alias("region"),
                                lit(null).cast(DataTypes.StringType).alias("metro"),
                                (get_json_object(propertiesCol, "$.$city")).cast(DataTypes.StringType).alias("city")
                        ))
                .withColumn("geo_for_enrich", struct(col("ip"), lit(null).cast(DataTypes.StringType).alias("locale")));
    }

    private Dataset<Row> transformProps(final Dataset<Row> dataset) {
        return propsConverter.transform(dataset, transformedProps);
    }

}
