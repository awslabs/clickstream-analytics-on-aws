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
import org.apache.spark.sql.SaveMode;
import org.apache.spark.sql.types.DataTypes;
import org.apache.spark.storage.StorageLevel;

import static org.apache.spark.sql.functions.*;
import static software.aws.solution.clickstream.ETLRunner.DEBUG_LOCAL_PATH;

@Slf4j
public final class Transformer {

    private final Cleaner cleaner = new Cleaner();
    private final UserPropertiesConverter userPropertiesConverter = new UserPropertiesConverter();
    private final EventParamsConverter eventParamsConverter = new EventParamsConverter();

    public Dataset<Row> transform(final Dataset<Row> dataset) {
        log.info(new ETLMetric(dataset, "transform enter").toString());
        Dataset<Row> cleanedDataset = cleaner.clean(dataset);
        cleanedDataset.persist(StorageLevel.MEMORY_AND_DISK());
        log.info(new ETLMetric(cleanedDataset, "after clean").toString());

        Dataset<Row> dataset1 = retrieveEventParams(cleanedDataset);
        Dataset<Row> dataset2 = convertAppInfo(dataset1);
        Dataset<Row> dataset3 = convertDevice(dataset2);
        Dataset<Row> dataset4 = convertTrafficSource(dataset3);
        Dataset<Row> dataset5 = convertPrivacyInfo(dataset4);
        Dataset<Row> dataset6 = convertGeo(dataset5);
        Dataset<Row> dataset7 = convertEventProperties(dataset6);
        Dataset<Row> dataset8 = convertDateProperties(dataset7);
        Dataset<Row> dataset9 = convertUserProperties(dataset8);
        Dataset<Row> dataset10 = convertUri(dataset9);

        log.info(new ETLMetric(dataset10, "transform return").toString());

        if (ContextUtil.isDebugLocal()) {
            dataset10.write().mode(SaveMode.Overwrite).json(DEBUG_LOCAL_PATH + "/transformed/");
        }
        cleanedDataset.unpersist();
        dataset10.persist(StorageLevel.MEMORY_AND_DISK());
        return dataset10;
    }

    private Dataset<Row> convertUri(final Dataset<Row> dataset) {
        Dataset<Row> userDataset = dataset.withColumn("event_bundle_sequence_id_str",
                        regexp_extract(col("uri"), "event_bundle_sequence_id=(\\d+)", 1)
                )
                .withColumn("event_bundle_sequence_id",
                        expr("if (event_bundle_sequence_id_str = '', 0, event_bundle_sequence_id_str)")
                                .cast(DataTypes.LongType))
                .drop("event_bundle_sequence_id_str");
        return userDataset;
    }

    private Dataset<Row> convertUserProperties(final Dataset<Row> dataset) {
        Dataset<Row> userDataset = dataset
                .withColumn("user_pseudo_id", col("data").getItem("unique_id"));
        userDataset = this.userPropertiesConverter.transform(userDataset);
        return userDataset;
    }

    private Dataset<Row> convertDateProperties(final Dataset<Row> dataset) {
        return dataset
                .withColumn("event_date", to_date(timestamp_seconds(col("data").getItem("timestamp").$div(1000))))
                .withColumn("ingest_timestamp", col("ingest_time").cast(DataTypes.LongType))
                .withColumn("event_server_timestamp_offset", (col("ingest_time").$minus(col("data").getItem("timestamp"))).cast(DataTypes.LongType))

                .withColumn("event_previous_timestamp", lit(0).cast(DataTypes.LongType))
                .withColumn("platform", col("data").getItem("platform"));
    }

    private Dataset<Row> convertEventProperties(final Dataset<Row> dataset) {
        String projectId = System.getProperty("project.id");
        Dataset<Row> dataset1 = dataset.withColumn("event_id", col("data").getItem(("event_id")))
                .withColumn("event_name", col("data").getItem("event_type"))
                .withColumn("event_timestamp", col("data").getItem("timestamp"))
                .withColumn("ecommerce", col("data").getField("ecommerce"))
                .withColumn("items", col("data").getField("items"))
                .withColumn("project_id", lit(projectId))
                .withColumn("event_value_in_usd", lit(null).cast(DataTypes.FloatType));

        return new KvConverter().transform(dataset1, "event_dimensions", "event_dimensions");
    }

    private Dataset<Row> convertGeo(final Dataset<Row> dataset) {
        return dataset.withColumn("geo",
                        struct(
                                lit(null).cast(DataTypes.StringType).alias("country"),
                                lit(null).cast(DataTypes.StringType).alias("continent"),
                                lit(null).cast(DataTypes.StringType).alias("sub_continent"),
                                col("data").getItem("locale").alias("locale"),
                                lit(null).cast(DataTypes.StringType).alias("region"),
                                lit(null).cast(DataTypes.StringType).alias("metro"),
                                lit(null).cast(DataTypes.StringType).alias("city")))
                .withColumn("geo_for_enrich", struct(col("ip"), col("data").getItem("locale").alias("locale")));
    }

    private Dataset<Row> convertPrivacyInfo(final Dataset<Row> dataset) {
        Column attributesCol = col("data").getField("attributes");

        return dataset.withColumn("privacy_info",
                array(
                        struct(
                                lit("ads_storage").alias("key"),
                                struct(lit(null).cast(DataTypes.DoubleType).alias("double_value"),
                                        lit(null).cast(DataTypes.FloatType).alias("float_value"),
                                        lit(null).cast(DataTypes.LongType).alias("int_value"),
                                        get_json_object(attributesCol, "$._privacy_info_ads_storage").cast(DataTypes.StringType).alias("string_value")
                                ).alias("value")),

                        struct(
                                lit("analytics_storage").alias("key"),
                                struct(lit(null).cast(DataTypes.DoubleType).alias("double_value"),
                                        lit(null).cast(DataTypes.FloatType).alias("float_value"),
                                        lit(null).cast(DataTypes.LongType).alias("int_value"),
                                        get_json_object(attributesCol, "$._privacy_info_analytics_storage").cast(DataTypes.StringType).alias("string_value")
                                ).alias("value")),

                        struct(
                                lit("uses_transient_token").alias("key"),
                                struct(lit(null).cast(DataTypes.DoubleType).alias("double_value"),
                                        lit(null).cast(DataTypes.FloatType).alias("float_value"),
                                        lit(null).cast(DataTypes.LongType).alias("int_value"),
                                        get_json_object(attributesCol, "$._privacy_info_uses_transient_token").cast(DataTypes.StringType).alias("string_value")
                                ).alias("value"))

                )
        );
    }


    private Dataset<Row> convertTrafficSource(final Dataset<Row> dataset) {
        Column attributesCol = col("data").getField("attributes");
        return dataset.withColumn("traffic_source",
                struct(
                        get_json_object(attributesCol, "$._traffic_source_medium").alias("medium"),
                        get_json_object(attributesCol, "$._traffic_source_name").alias("name"),
                        get_json_object(attributesCol, "$._traffic_source_source").alias("source")
                )
        );
    }

    private Dataset<Row> retrieveEventParams(final Dataset<Row> dataset) {
        return eventParamsConverter.transform(dataset);
    }

    private Dataset<Row> convertAppInfo(final Dataset<Row> dataset) {
        Column attributesCol = col("data").getField("attributes");

        return dataset.withColumn("app_info",
                struct(
                        (col("data").getItem("app_id")).alias("app_id"),
                        (col("data").getItem("app_package_name")).alias("id"),
                        get_json_object(attributesCol, "$._channel").alias("install_source"),
                        (col("data").getItem("app_version")).alias("version")));
    }

    private Dataset<Row> convertDevice(final Dataset<Row> dataset) {
        return dataset.withColumn("device",
                struct(
                        (col("data").getItem("brand")).alias("mobile_brand_name"),
                        (col("data").getItem("model")).alias("mobile_model_name"),
                        (col("data").getItem("make")).alias("manufacturer"),
                        (col("data").getItem("screen_width")).alias("screen_width"),
                        (col("data").getItem("screen_height")).alias("screen_height"),
                        (col("data").getItem("carrier")).alias("carrier"),
                        (col("data").getItem("network_type")).alias("network_type"),
                        (col("data").getItem("os_version")).alias("operating_system_version"),
                        (col("data").getItem("platform")).alias("operating_system"),

                        // placeholder for ua enrich fields
                        lit(null).cast(DataTypes.StringType).alias("ua_browser"),
                        lit(null).cast(DataTypes.StringType).alias("ua_browser_version"),
                        lit(null).cast(DataTypes.StringType).alias("ua_os"),
                        lit(null).cast(DataTypes.StringType).alias("ua_os_version"),
                        lit(null).cast(DataTypes.StringType).alias("ua_device"),
                        lit(null).cast(DataTypes.StringType).alias("ua_device_category"),

                        (col("data").getItem("system_language")).alias("system_language"),
                        (col("data").getItem("zone_offset").$div(1000)).cast(DataTypes.LongType).alias("time_zone_offset_seconds"),
                        (col("data").getItem("device_id")).alias("vendor_id"),
                        (col("data").getItem("device_unique_id")).alias("advertising_id")

                ));
    }
}
