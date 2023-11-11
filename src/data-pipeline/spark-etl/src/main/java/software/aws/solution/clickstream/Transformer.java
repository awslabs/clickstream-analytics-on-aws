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

import java.util.List;
import java.util.stream.Collectors;
import java.util.stream.Stream;

import static org.apache.spark.sql.functions.col;
import static org.apache.spark.sql.functions.lit;
import static org.apache.spark.sql.functions.to_date;
import static org.apache.spark.sql.functions.timestamp_seconds;
import static org.apache.spark.sql.functions.struct;
import static org.apache.spark.sql.functions.array;
import static org.apache.spark.sql.functions.regexp_extract;
import static org.apache.spark.sql.functions.expr;
import static org.apache.spark.sql.functions.get_json_object;

import static software.aws.solution.clickstream.ContextUtil.PROJECT_ID_PROP;
import static software.aws.solution.clickstream.DatasetUtil.ATTRIBUTES;
import static software.aws.solution.clickstream.DatasetUtil.DATA;
import static software.aws.solution.clickstream.DatasetUtil.DOUBLE_VALUE;
import static software.aws.solution.clickstream.DatasetUtil.FLOAT_VALUE;
import static software.aws.solution.clickstream.DatasetUtil.GEO_FOR_ENRICH;
import static software.aws.solution.clickstream.DatasetUtil.INT_VALUE;
import static software.aws.solution.clickstream.DatasetUtil.KEY;
import static software.aws.solution.clickstream.DatasetUtil.LOCALE;
import static software.aws.solution.clickstream.DatasetUtil.PLATFORM;
import static software.aws.solution.clickstream.DatasetUtil.STRING_VALUE;
import static software.aws.solution.clickstream.DatasetUtil.TIMESTAMP;
import static software.aws.solution.clickstream.DatasetUtil.UA_BROWSER;
import static software.aws.solution.clickstream.DatasetUtil.UA_BROWSER_VERSION;
import static software.aws.solution.clickstream.DatasetUtil.UA_DEVICE;
import static software.aws.solution.clickstream.DatasetUtil.UA_DEVICE_CATEGORY;
import static software.aws.solution.clickstream.DatasetUtil.UA_OS;
import static software.aws.solution.clickstream.DatasetUtil.UA_OS_VERSION;
import static software.aws.solution.clickstream.DatasetUtil.VALUE;
import static software.aws.solution.clickstream.ETLRunner.DEBUG_LOCAL_PATH;
import static software.aws.solution.clickstream.ETLRunner.getDistFields;

@Slf4j
public final class Transformer {


    public static final String DATA_SCHEMA_FILE_PATH = System.getProperty("data.schema.file.path", "/data_schema.json");

    private final Cleaner cleaner = new Cleaner();
    private final UserPropertiesConverter userPropertiesConverter = new UserPropertiesConverter();
    private final EventParamsConverter eventParamsConverter = new EventParamsConverter();

    public Dataset<Row> transform(final Dataset<Row> dataset) {
        log.info(new ETLMetric(dataset, "transform enter").toString());
        Dataset<Row> cleanedDataset = cleaner.clean(dataset, DATA_SCHEMA_FILE_PATH);
        ContextUtil.cacheDataset(cleanedDataset);
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

        if (ContextUtil.isDebugLocal()) {
            dataset10.write().mode(SaveMode.Overwrite).json(DEBUG_LOCAL_PATH + "/transformed/");
        }
        Column[] distCol = getDistFields();
        List<Column> transformOutFields = Stream.of(distCol).collect(Collectors.toList());

        transformOutFields.add(col("ua"));
        transformOutFields.add(col(GEO_FOR_ENRICH));
        Dataset<Row> dataset11= dataset10.select(
                transformOutFields.toArray(new Column[]{})
        );
        log.info(new ETLMetric(dataset11, "transform return").toString());
        return dataset11;
    }

    private Dataset<Row> convertUri(final Dataset<Row> dataset) {
        return dataset.withColumn("event_bundle_sequence_id_str",
                        regexp_extract(col("uri"), "event_bundle_sequence_id=(\\d+)", 1)
                )
                .withColumn("event_bundle_sequence_id",
                        expr("if (event_bundle_sequence_id_str = '', 0, event_bundle_sequence_id_str)")
                                .cast(DataTypes.LongType))
                .drop("event_bundle_sequence_id_str");
    }

    private Dataset<Row> convertUserProperties(final Dataset<Row> dataset) {
        Dataset<Row> userDataset = dataset
                .withColumn("user_pseudo_id", col(DATA).getItem("unique_id"));
        userDataset = this.userPropertiesConverter.transform(userDataset);
        return userDataset;
    }

    private Dataset<Row> convertDateProperties(final Dataset<Row> dataset) {
        return dataset
                .withColumn("event_date", to_date(timestamp_seconds(col(DATA).getItem(TIMESTAMP).$div(1000))))
                .withColumn("ingest_timestamp", col("ingest_time").cast(DataTypes.LongType))
                .withColumn("event_server_timestamp_offset", (col("ingest_time").$minus(col(DATA).getItem(TIMESTAMP))).cast(DataTypes.LongType))

                .withColumn("event_previous_timestamp", lit(0).cast(DataTypes.LongType))
                .withColumn(PLATFORM, col(DATA).getItem(PLATFORM));
    }

    private Dataset<Row> convertEventProperties(final Dataset<Row> dataset) {
        String projectId = System.getProperty(PROJECT_ID_PROP);
        Dataset<Row> dataset1 = dataset.withColumn("event_id", col(DATA).getItem(("event_id")))
                .withColumn("event_name", col(DATA).getItem("event_type"))
                .withColumn("event_timestamp", col(DATA).getItem(TIMESTAMP))
                .withColumn("ecommerce", col(DATA).getField("ecommerce"))
                .withColumn("items", col(DATA).getField("items"))
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
                                col(DATA).getItem(LOCALE).alias(LOCALE),
                                lit(null).cast(DataTypes.StringType).alias("region"),
                                lit(null).cast(DataTypes.StringType).alias("metro"),
                                lit(null).cast(DataTypes.StringType).alias("city")))
                .withColumn(GEO_FOR_ENRICH, struct(col("ip"), col(DATA).getItem(LOCALE).alias(LOCALE)));
    }

    private Dataset<Row> convertPrivacyInfo(final Dataset<Row> dataset) {
        Column attributesCol = col(DATA).getField(ATTRIBUTES);
        String keyName = KEY;
        String valueName = VALUE;
        return dataset.withColumn("privacy_info",
                array(
                        struct(
                                lit("ads_storage").alias(keyName),
                                struct(lit(null).cast(DataTypes.DoubleType).alias(DOUBLE_VALUE),
                                        lit(null).cast(DataTypes.FloatType).alias(FLOAT_VALUE),
                                        lit(null).cast(DataTypes.LongType).alias(INT_VALUE),
                                        get_json_object(attributesCol, "$._privacy_info_ads_storage").cast(DataTypes.StringType).alias(STRING_VALUE)
                                ).alias(valueName)),

                        struct(
                                lit("analytics_storage").alias(keyName),
                                struct(lit(null).cast(DataTypes.DoubleType).alias(DOUBLE_VALUE),
                                        lit(null).cast(DataTypes.FloatType).alias(FLOAT_VALUE),
                                        lit(null).cast(DataTypes.LongType).alias(INT_VALUE),
                                        get_json_object(attributesCol, "$._privacy_info_analytics_storage").cast(DataTypes.StringType).alias(STRING_VALUE)
                                ).alias(valueName)),

                        struct(
                                lit("uses_transient_token").alias(keyName),
                                struct(lit(null).cast(DataTypes.DoubleType).alias(DOUBLE_VALUE),
                                        lit(null).cast(DataTypes.FloatType).alias(FLOAT_VALUE),
                                        lit(null).cast(DataTypes.LongType).alias(INT_VALUE),
                                        get_json_object(attributesCol, "$._privacy_info_uses_transient_token").cast(DataTypes.StringType).alias(STRING_VALUE)
                                ).alias(valueName))

                )
        );
    }


    private Dataset<Row> convertTrafficSource(final Dataset<Row> dataset) {
        Column attributesCol = col(DATA).getField(ATTRIBUTES);
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
        Column attributesCol = col(DATA).getField(ATTRIBUTES);

        return dataset.withColumn("app_info",
                struct(
                        (col(DATA).getItem("app_id")).alias("app_id"),
                        (col(DATA).getItem("app_package_name")).alias("id"),
                        get_json_object(attributesCol, "$._channel").alias("install_source"),
                        (col(DATA).getItem("app_version")).alias("version")));
    }

    private Dataset<Row> convertDevice(final Dataset<Row> dataset) {
        return dataset.withColumn("device",
                struct(
                        (col(DATA).getItem("brand")).alias("mobile_brand_name"),
                        (col(DATA).getItem("model")).alias("mobile_model_name"),
                        (col(DATA).getItem("make")).alias("manufacturer"),
                        (col(DATA).getItem("screen_width")).alias("screen_width"),
                        (col(DATA).getItem("screen_height")).alias("screen_height"),
                        (col(DATA).getItem("carrier")).alias("carrier"),
                        (col(DATA).getItem("network_type")).alias("network_type"),
                        (col(DATA).getItem("os_version")).alias("operating_system_version"),
                        (col(DATA).getItem(PLATFORM)).alias("operating_system"),

                        // placeholder for ua enrich fields
                        lit(null).cast(DataTypes.StringType).alias(UA_BROWSER),
                        lit(null).cast(DataTypes.StringType).alias(UA_BROWSER_VERSION),
                        lit(null).cast(DataTypes.StringType).alias(UA_OS),
                        lit(null).cast(DataTypes.StringType).alias(UA_OS_VERSION),
                        lit(null).cast(DataTypes.StringType).alias(UA_DEVICE),
                        lit(null).cast(DataTypes.StringType).alias(UA_DEVICE_CATEGORY),

                        (col(DATA).getItem("system_language")).alias("system_language"),
                        (col(DATA).getItem("zone_offset").$div(1000)).cast(DataTypes.LongType).alias("time_zone_offset_seconds"),
                        (col(DATA).getItem("device_id")).alias("vendor_id"),
                        (col(DATA).getItem("device_unique_id")).alias("advertising_id"),
                        (col(DATA).getItem("host_name")).alias("host_name"),
                        (col(DATA).getItem("viewport_width")).cast(DataTypes.LongType).alias("viewport_width"),
                        (col(DATA).getItem("viewport_height")).cast(DataTypes.LongType).alias("viewport_height")

                ));
    }
}
