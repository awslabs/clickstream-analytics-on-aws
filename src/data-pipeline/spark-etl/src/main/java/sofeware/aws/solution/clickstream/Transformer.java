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

import com.google.common.collect.Lists;
import lombok.extern.slf4j.Slf4j;
import org.apache.spark.sql.Column;
import org.apache.spark.sql.Dataset;
import org.apache.spark.sql.Row;
import org.apache.spark.sql.types.DataTypes;

import java.util.stream.Collectors;

import static org.apache.spark.sql.functions.*;

@Slf4j
public final class Transformer {

    private final Cleaner cleaner = new Cleaner();

    public Dataset<Row> transform(final Dataset<Row> dataset) {
        log.info(new ETLMetric(dataset, "transform enter").toString());
        Dataset<Row> cleanedDataset = cleaner.clean(dataset);
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
        Dataset<Row> dataset10 = dataset9
                .withColumn("event_params", col("event_params_kv"))
                .withColumn("user_properties", col("user_properties_kv"));
        log.info(new ETLMetric(dataset10, "transform return").toString());
        return dataset10;
    }

    private static Dataset<Row> convertUserProperties(final Dataset<Row> dataset) {
        Dataset<Row> userDataset =  dataset.withColumn("user_id", col("data").getItem("user").getItem("_user_id"))
                .withColumn("user_first_touch_timestamp", col("data").getItem("user").getItem(
                        "_user_first_touch_timestamp"))
                .withColumn("user_pseudo_id", col("data").getItem("unique_id"))
                .withColumn("user_ltv",
                        concat(
                                (col("data").getItem("user").getItem("_user_Itv_revenue")),
                                lit(" "),
                                (col("data").getItem("user").getItem("_user_Itv_currency"))
                        ));

        String[][] attrNameTypeMapping = new String[][] {
                new String[] {"_user_id", "string_value"},
                new String[] {"_user_Itv_revenue", "float_value"},
                new String[] {"_user_Itv_currency", "string_value"},
                new String[] {"_user_name", "string_value"},
                new String[] {"_user_age", "int_value"},
                new String[] {"_user_first_touch_timestamp", "double_value"},
        };
        Column[] usersKV = buildKVColumns("user", attrNameTypeMapping);

        userDataset = userDataset.withColumn("user_properties", col("data").getItem("user"));
        userDataset = userDataset.withColumn("user_properties_kv", array(usersKV));
        return userDataset;
    }

    private static Column[] buildKVColumns(final String colName, final String[][] attrNameTypeMapping) {
        String[] valueKeys = new String[] {
                "double_value",
                "float_value",
                "int_value",
                "string_value",
        };

        Column[] newKvAttributes =  Lists.newArrayList(attrNameTypeMapping).stream().map(attAndType -> {
            String attName = attAndType[0];
            String attType = attAndType[1];
            Column[] kvArrayColumn = Lists.newArrayList(valueKeys).stream().map(kk -> {
                if (kk.equals(attType)) {
                    return col("data").getItem(colName).getItem(attName).cast(DataTypes.StringType).alias(attType);
                }
                return lit("").alias(kk);
            }).collect(Collectors.toList()).toArray(new Column[] {lit("")});

            return struct(
                    lit(attName).alias("key"),
                    struct(kvArrayColumn).alias("value")
            );
        }).collect(Collectors.toList()).toArray(new Column[]{lit("")});
        return newKvAttributes;
    }

    private static Dataset<Row> convertDateProperties(final Dataset<Row> dataset) {
        return dataset.withColumn("event_date",
                        date_format(from_unixtime(col("data").getItem("timestamp").$div(1000)
                                .$plus(col("data").getItem("zone_offset").$div(1000))), "yyyMMdd")
                )
                .withColumn("ingest_timestamp", col("ingest_time"))
                .withColumn("event_server_timestamp_offset", col("ingest_time").$minus(col("data").getItem(
                        "timestamp")))
                .withColumn("event_previous_timestamp", lit(0))
                .withColumn("platform", col("data").getItem("platform"));
    }

    private static Dataset<Row> convertEventProperties(final Dataset<Row> dataset) {
        String projectId = System.getProperty("project.id");

        Column emptyValues = struct(
                lit("0").alias("double_value"),
                lit("0").alias("float_value"),
                lit("0").alias("int_value"),
                lit("").alias("string_value")
        ).alias("value");

        return dataset.withColumn("event_id", col("data").getItem(("event_id")))
                .withColumn("event_name", col("data").getItem("event_type"))
                .withColumn("event_timestamp", col("data").getItem("timestamp"))
                .withColumn("ecommerce", array(struct(
                        lit("").alias("key"),
                        emptyValues
                )))
                .withColumn("event_dimensions", lit(""))
                .withColumn("items", array(struct(
                        lit("").alias("key"),
                        emptyValues
                )))
                .withColumn("project_id", lit(projectId))
                .withColumn("event_bundle_sequence_id", lit(0))
                .withColumn("event_value_in_usd", lit("0"));
    }

    private static Dataset<Row> convertGeo(final Dataset<Row> dataset) {
        return dataset.withColumn("geo",
                struct(
                        lit("").alias("city"),
                        lit("").alias("continent"),
                        lit("").alias("country"),
                        lit("").alias("metro"),
                        lit("").alias("region"),
                        lit("").alias("sub_continent")

                )).withColumn("geo_for_enrich",
                struct(
                        col("ip"),
                        col("data").getItem("locale").alias("locale")
                ));
    }

    private static Dataset<Row> convertPrivacyInfo(final Dataset<Row> dataset) {
        return dataset.withColumn("privacy_info",
                struct(
                        (col("event_params").getItem("_privacy_info_ads_storage")).alias("ads_storage"),
                        (col("event_params").getItem("_privacy_info_analytics_storage")).alias(
                                "analytics_storage"),
                        (col("event_params").getItem("_privacy_info_uses_transient_token")).alias(
                                "uses_transient_token")
                ));
    }

    private static Dataset<Row> convertTrafficSource(final Dataset<Row> dataset) {
        return dataset.withColumn("traffic_source",
                struct(
                        (col("event_params").getItem("_traffic_source_medium")).alias("medium"),
                        (col("event_params").getItem("_traffic_source_name")).alias("name"),
                        (col("event_params").getItem("_traffic_source_source")).alias("source")
                ));
    }

    private static Dataset<Row> retrieveEventParams(final Dataset<Row> dataset) {

       String[][] attrNameTypeMapping = new String[][] {
               new String[] {"Channel", "string_value"},
               new String[] {"Price", "float_value"},
               new String[] {"ProcessDuration", "int_value"},
               new String[] {"Successful", "string_value"},
               new String[] {"_channel", "string_value"},
               new String[] {"_error_attribute_name", "string_value"},
               new String[] {"_error_attribute_value", "string_value"},
               new String[] {"_install_time", "double_value"},
               new String[] {"_ios_advertising_id", "string_value"},
               new String[] {"_ios_vendor_id", "string_value"},
               new String[] {"_is_first_day", "string_value"},
               new String[] {"_is_first_time", "string_value"},
               new String[] {"_privacy_info_ads_storage", "string_value"},
               new String[] {"_privacy_info_analytics_storage", "string_value"},
               new String[] {"_privacy_info_uses_transient_token", "string_value"},
               new String[] {"_session_duration", "int_value"},
               new String[] {"_session_id", "string_value"},
               new String[] {"_session_start_timestamp", "double_value"},
               new String[] {"_traffic_source_medium", "string_value"},
               new String[] {"_traffic_source_name", "string_value"},
               new String[] {"_traffic_source_source", "string_value"},
       };

        Column[] newKvAttributes = buildKVColumns("attributes", attrNameTypeMapping);
        Dataset<Row> datasetTransformed = dataset.withColumn("event_params", col("data").getItem("attributes"));
        datasetTransformed = datasetTransformed.withColumn("event_params_kv", array(newKvAttributes));

        return datasetTransformed;
    }

    private static Dataset<Row> convertAppInfo(final Dataset<Row> dataset) {
        return dataset.withColumn("app_info",
                struct(
                        (col("data").getItem("app_id")).alias("app_id"),
                        (col("event_params").getItem("_channel")).alias("install_source"),
                        lit("").alias("install_store"),
                        (col("data").getItem("app_version_name")).alias("version")
                ));
    }

    private static Dataset<Row> convertDevice(final Dataset<Row> dataset) {
        return dataset.withColumn("device",
                struct(
                        (col("event_params").getItem("_ios_advertising_id")).alias("advertising_id"),
                        lit("").alias("browser"),
                        lit("").alias("browser_version"),
                        lit("").alias("category"),
                        lit("").alias("is_limited_ad_tracking"),
                        (col("data").getItem("system_language")).alias("language"),
                        (col("data").getItem("brand")).alias("mobile_brand_name"),
                        lit("").alias("mobile_marketing_name"),
                        (col("data").getItem("model")).alias("mobile_model_name"),
                        lit("").alias("mobile_os_hardware_model"),
                        (col("data").getItem("platform")).alias("operating_system"),
                        (col("data").getItem("platform_version")).alias("operating_system_version"),
                        (col("data").getItem("zone_offset").$div(1000)).alias("time_zone_offset_seconds"),
                        (col("event_params").getItem("_ios_vendor_id")).alias("vendor_id"),
                        col("ua").alias("web_info")

                        //(col("ua")).alias("user_agent")
                ));
    }
}
