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
import org.apache.spark.sql.Dataset;
import org.apache.spark.sql.Row;
import org.apache.spark.sql.functions;
import org.apache.spark.sql.types.ArrayType;
import org.apache.spark.sql.types.DataType;
import org.apache.spark.sql.types.DataTypes;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;

import static org.apache.spark.sql.functions.col;
import static org.apache.spark.sql.functions.from_json;
import static org.apache.spark.sql.functions.explode;
import static org.apache.spark.sql.functions.get_json_object;
import static org.apache.spark.sql.functions.lit;
import static org.apache.spark.sql.functions.regexp_extract;
import static org.apache.spark.sql.functions.to_date;
import static org.apache.spark.sql.functions.timestamp_seconds;
import static org.apache.spark.sql.functions.expr;
import static org.apache.spark.sql.functions.struct;

import static software.aws.solution.clickstream.ContextUtil.PROJECT_ID_PROP;
import static software.aws.solution.clickstream.Transformer.GEO_FOR_ENRICH;
import static software.aws.solution.clickstream.Transformer.TIMESTAMP;
import static software.aws.solution.clickstream.Transformer.PLATFORM;
import static software.aws.solution.clickstream.Transformer.ATTRIBUTES;
import static software.aws.solution.clickstream.Transformer.LOCALE;
import static software.aws.solution.clickstream.Transformer.UA_BROWSER;
import static software.aws.solution.clickstream.Transformer.UA_BROWSER_VERSION;
import static software.aws.solution.clickstream.Transformer.UA_OS;
import static software.aws.solution.clickstream.Transformer.UA_OS_VERSION;
import static software.aws.solution.clickstream.Transformer.UA_DEVICE;
import static software.aws.solution.clickstream.Transformer.UA_DEVICE_CATEGORY;


@Slf4j
public final class TransformerV2 {

    private final Cleaner cleaner = new Cleaner();
    private final EventParamsConverter eventParamsConverter = new EventParamsConverter();
    private final UserPropertiesConverter userPropertiesConverter = new UserPropertiesConverter();
    private final KvConverter kvConverter = new KvConverter();

    private static Column getUserProp(final String propName) {
        Column dataCol = col("data");
        return get_json_object(dataCol.getField("user"), "$." + propName + ".value").cast(DataTypes.StringType);
    }

    public List<Dataset<Row>> transform(final Dataset<Row> dataset) {
        log.info(new ETLMetric(dataset, "transform enter").toString());
        Dataset<Row> cleanedDataset = cleaner.clean(dataset, "/data_schema_v2.json");
        ContextUtil.cacheDataset(cleanedDataset);
        log.info(new ETLMetric(cleanedDataset, "after clean").toString());
        Column dataCol = col("data");

        Dataset<Row> dataset0 = cleanedDataset
                .withColumn("app_id", dataCol.getField("app_id"))
                .withColumn("user_pseudo_id", dataCol.getField("unique_id").cast(DataTypes.StringType))
                .withColumn("event_name", dataCol.getField("event_type"))
                .withColumn("event_date", to_date(timestamp_seconds(dataCol.getItem(TIMESTAMP).$div(1000))));
        Dataset<Row> dataset1 = convertAppInfo(dataset0);


        Dataset<Row> eventDataset = extractEvent(dataset1);
        log.info(new ETLMetric(eventDataset, "eventDataset").toString());

        Dataset<Row> eventParameterDataset = extractEventParameter(dataset1);
        log.info(new ETLMetric(eventParameterDataset, "eventParameterDataset").toString());

        Dataset<Row> itemDataset = extractItem(dataset1);
        log.info(new ETLMetric(itemDataset, "itemDataset").toString());

        Dataset<Row> userDataset = extractUser(dataset1);
        log.info(new ETLMetric(userDataset, "userDataset").toString());

        return Arrays.asList(
                eventDataset,
                eventParameterDataset,
                itemDataset,
                userDataset
        );
    }

    private Dataset<Row> extractEvent(final Dataset<Row> dataset) {
        String projectId = System.getProperty(PROJECT_ID_PROP);
        Column dataCol = col("data");
        Dataset<Row> dataset1 = dataset
                .withColumn("event_id", dataCol.getItem(("event_id")))
                .withColumn("event_timestamp", dataCol.getItem(TIMESTAMP))
                .withColumn("event_previous_timestamp", dataCol.getField("event_previous_timestamp").cast(DataTypes.LongType))

                .withColumn("event_value_in_usd", dataCol.getItem("event_value_in_usd").cast(DataTypes.FloatType))
                .withColumn("ingest_timestamp", col("ingest_time").cast(DataTypes.LongType))
                .withColumn(PLATFORM, dataCol.getItem(PLATFORM))
                .withColumn("project_id", lit(projectId))
                .withColumn("user_id", get_json_object(dataCol.getField("user"), "$._user_id.value").cast(DataTypes.StringType));
        Dataset<Row> dataset2 = convertUri(dataset1, "event_bundle_sequence_id", DataTypes.LongType);
        Dataset<Row> dataset3 = convertDevice(dataset2);
        Dataset<Row> dataset4 = convertGeo(dataset3);
        Dataset<Row> dataset5 = convertTrafficSource(dataset4);
        Dataset<Row> datasetFinal = convertItems(dataset5);
        log.info("extractEvent done");
        return datasetFinal.select(
                "event_id",
                "event_date",
                "event_timestamp",
                "event_previous_timestamp",
                "event_name",
                "event_value_in_usd",
                "event_bundle_sequence_id",
                "ingest_timestamp",
                "device",
                "geo",
                "traffic_source",
                "app_info",
                "platform",
                "project_id",
                "items",
                "user_pseudo_id",
                "user_id",
                "ua",
                GEO_FOR_ENRICH
        );
    }

    private Dataset<Row> extractEventParameter(final Dataset<Row> dataset) {
        Column dataCol = col("data");
        Dataset<Row> dataset1 = eventParamsConverter.transform(dataset);
        return dataset1.select(
                col("app_id"),
                col("event_date"),
                dataCol.getItem("event_id").alias("event_id").cast(DataTypes.StringType),
                col("event_params"));
    }

    private Dataset<Row> extractItem(final Dataset<Row> dataset) {
        Column dataCol = col("data");
        ArrayType itemsType = DataTypes.createArrayType(DataTypes.StringType);
        Dataset<Row> dataset0 = dataset.withColumn("item_json", explode(from_json(dataCol.getField("items"), itemsType)));

        List<String> topFields = Arrays.asList("id", "price", "currency", "creative_name", "creative_slot");
        List<String> ignoreFields = Collections.singletonList("quantity");

        List<String> excludedAttributes = new ArrayList<>();
        excludedAttributes.addAll(topFields);
        excludedAttributes.addAll(ignoreFields);

        Dataset<Row> dataset1 = kvConverter.transform(dataset0, col("item_json"), "properties", excludedAttributes);
        Dataset<Row> dataset2 = dataset1
                .withColumn("id", get_json_object(col("item_json"), "$.id").cast(DataTypes.StringType))
                .withColumn("price", get_json_object(col("item_json"), "$.price").cast(DataTypes.DoubleType))
                .withColumn("currency", get_json_object(col("item_json"), "$.currency").cast(DataTypes.StringType))
                .withColumn("creative_name", get_json_object(col("item_json"), "$.creative_name").cast(DataTypes.StringType))
                .withColumn("creative_slot", get_json_object(col("item_json"), "$.creative_slot").cast(DataTypes.StringType));

        List<String> selectedFields = new ArrayList<>();
        selectedFields.add("app_id");
        selectedFields.add("event_date");
        selectedFields.addAll(topFields);
        selectedFields.add("properties");

        Column[] selectCols = selectedFields.stream().map(functions::col).toArray(Column[]::new);
        return dataset2.select(selectCols).distinct();
    }

    private Dataset<Row> extractUser(final Dataset<Row> dataset) {

        Dataset<Row> dataset0 = dataset.filter(col("event_name").isin("user_profile_set", "_user_profile_set"));
        long setUserProfileEventCount = dataset0.count();

        log.info("setUserProfileEventCount:" + setUserProfileEventCount);

        Dataset<Row> dataset1 = this.userPropertiesConverter.transform(dataset0);
        Column dataCol = col("data");
        Column attributesCol = dataCol.getField(ATTRIBUTES);
        DataType deviceIdListType = DataTypes.createArrayType(DataTypes.StringType);

        return dataset1
                .withColumn("_first_visit_date",
                        to_date(timestamp_seconds(col("user_first_touch_timestamp").$div(1000))))
                .withColumn("_first_referer",
                        getUserProp("_first_referer"))
                .withColumn("_first_traffic_source_type",
                        getUserProp("_first_traffic_source_type"))
                .withColumn("_first_traffic_medium",
                        getUserProp("_first_traffic_medium"))
                .withColumn("_first_traffic_source",
                        getUserProp("_first_traffic_source"))
                .withColumn("device_id_list",
                        from_json(getUserProp("device_id_list"), deviceIdListType))
                .withColumn("_channel",
                        get_json_object(attributesCol, "$._channel").alias("install_source"))
                .select("app_id", "event_date", "user_id",
                        "user_pseudo_id", "user_first_touch_timestamp",
                        "user_properties", "user_ltv", "_first_visit_date", "_first_referer",
                        "_first_traffic_source_type", "_first_traffic_medium", "_first_traffic_source",
                        "device_id_list", "_channel"
                ).distinct();
    }

    private Dataset<Row> convertItems(final Dataset<Row> dataset) {
        DataType itemType = DataTypes.createStructType(Arrays.asList(
                DataTypes.createStructField("id", DataTypes.StringType, true),
                DataTypes.createStructField("quantity", DataTypes.LongType, true),
                DataTypes.createStructField("price", DataTypes.DoubleType, true),
                DataTypes.createStructField("currency", DataTypes.StringType, true),
                DataTypes.createStructField("creative_name", DataTypes.StringType, true),
                DataTypes.createStructField("creative_slot", DataTypes.StringType, true)
        ));
        DataType itemsType = DataTypes.createArrayType(itemType);
        return dataset.withColumn("items",
                from_json(col("data").getField("items"), itemsType));

    }


    private Dataset<Row> convertUri(final Dataset<Row> dataset, final String fileName, final DataType dataType) {
        String tmpStrFileName = fileName + "_tmp";
        return dataset.withColumn(tmpStrFileName,
                        regexp_extract(col("uri"), fileName + "=(\\.*?)&?", 1)
                )
                .withColumn(fileName,
                        expr("nullif (" + tmpStrFileName + ", '')")
                                .cast(dataType))
                .drop(tmpStrFileName);
    }

    private Dataset<Row> convertGeo(final Dataset<Row> dataset) {
        Column dataCol = col("data");
        return dataset.withColumn("geo",
                        struct(
                                lit(null).cast(DataTypes.StringType).alias("country"),
                                lit(null).cast(DataTypes.StringType).alias("continent"),
                                lit(null).cast(DataTypes.StringType).alias("sub_continent"),
                                dataCol.getItem(LOCALE).alias(LOCALE),
                                lit(null).cast(DataTypes.StringType).alias("region"),
                                lit(null).cast(DataTypes.StringType).alias("metro"),
                                lit(null).cast(DataTypes.StringType).alias("city")))
                .withColumn(GEO_FOR_ENRICH, struct(col("ip"), dataCol.getItem(LOCALE).alias(LOCALE)));
    }

    private Dataset<Row> convertTrafficSource(final Dataset<Row> dataset) {
        Column dataCol = col("data");
        Column attributesCol = dataCol.getField(ATTRIBUTES);
        return dataset.withColumn("traffic_source",
                struct(
                        get_json_object(attributesCol, "$._traffic_source_medium").alias("medium"),
                        get_json_object(attributesCol, "$._traffic_source_name").alias("name"),
                        get_json_object(attributesCol, "$._traffic_source_source").alias("source")
                )
        );
    }


    private Dataset<Row> convertAppInfo(final Dataset<Row> dataset) {
        Column dataCol = col("data");
        Column attributesCol = dataCol.getField(ATTRIBUTES);

        return dataset.withColumn("app_info",
                struct(
                        (dataCol.getItem("app_id")).alias("app_id"),
                        (dataCol.getItem("app_package_name")).alias("id"),
                        get_json_object(attributesCol, "$._channel").alias("install_source"),
                        (dataCol.getItem("app_version")).alias("version")));
    }

    private Dataset<Row> convertDevice(final Dataset<Row> dataset) {
        Column dataCol = col("data");
        return dataset.withColumn("device",
                struct(
                        (dataCol.getItem("brand")).alias("mobile_brand_name"),
                        (dataCol.getItem("model")).alias("mobile_model_name"),
                        (dataCol.getItem("make")).alias("manufacturer"),
                        (dataCol.getItem("screen_width")).alias("screen_width"),
                        (dataCol.getItem("screen_height")).alias("screen_height"),
                        (dataCol.getItem("carrier")).alias("carrier"),
                        (dataCol.getItem("network_type")).alias("network_type"),
                        (dataCol.getItem("os_version")).alias("operating_system_version"),
                        (dataCol.getItem(PLATFORM)).alias("operating_system"),

                        // placeholder for ua enrich fields
                        lit(null).cast(DataTypes.StringType).alias(UA_BROWSER),
                        lit(null).cast(DataTypes.StringType).alias(UA_BROWSER_VERSION),
                        lit(null).cast(DataTypes.StringType).alias(UA_OS),
                        lit(null).cast(DataTypes.StringType).alias(UA_OS_VERSION),
                        lit(null).cast(DataTypes.StringType).alias(UA_DEVICE),
                        lit(null).cast(DataTypes.StringType).alias(UA_DEVICE_CATEGORY),

                        (dataCol.getItem("system_language")).alias("system_language"),
                        (dataCol.getItem("zone_offset").$div(1000)).cast(DataTypes.LongType).alias("time_zone_offset_seconds"),
                        (dataCol.getItem("device_id")).alias("vendor_id"),
                        (dataCol.getItem("device_unique_id")).alias("advertising_id"),
                        (dataCol.getItem("host_name")).alias("host_name"),
                        (dataCol.getItem("viewport_width")).cast(DataTypes.LongType).alias("viewport_width"),
                        (dataCol.getItem("viewport_height")).cast(DataTypes.LongType).alias("viewport_height")
                ));
    }

    public Dataset<Row> postTransform(final Dataset<Row> dataset) {
        return dataset.drop("ua", GEO_FOR_ENRICH);
    }
}
