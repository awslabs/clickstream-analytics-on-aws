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

package com.example.clickstream.transformer.v2;


import lombok.extern.slf4j.Slf4j;
import org.apache.spark.sql.Dataset;
import org.apache.spark.sql.Row;

import java.util.Arrays;
import java.util.List;

import static org.apache.spark.sql.functions.col;
import static org.apache.spark.sql.functions.explode;
import static org.apache.spark.sql.functions.expr;
import static org.apache.spark.sql.functions.timestamp_seconds;
import static org.apache.spark.sql.functions.to_date;

@Slf4j
public final class MyTransformerV2 {
    public static final String EVENT_TIMESTAMP = "event_timestamp";
    public static final String EVENT_DATE = "event_date";
    public static final String APP_ID = "app_id";
    public static final String GEO_FOR_ENRICH = "geo_for_enrich";
    TransformerUdf transformerUdf = new TransformerUdf();

    public List<Dataset<Row>> transform(final Dataset<Row> dataset) {
        Dataset<Row> dataset1 = transformerUdf.transform(dataset);

        Dataset<Row> newDataset = dataset1.select(explode(col("new_data")).alias("data"));

        Dataset<Row> eventDataset = newDataset.select(expr("data.event.*"));
        eventDataset = eventDataset.withColumn(EVENT_DATE, to_date(timestamp_seconds(col(EVENT_TIMESTAMP).$div(1000))))
                .select(
                     "event_id",
                        EVENT_DATE,
                        EVENT_TIMESTAMP,
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
                        "items",
                        "user_pseudo_id",
                        "user_id",
                        "ua",
                        GEO_FOR_ENRICH
                );

        Dataset<Row> eventParameterDataset = newDataset.select(explode(expr("data.event_parameters")).alias("ep")).select(expr("ep.*"));
        eventParameterDataset = eventParameterDataset.withColumn(EVENT_DATE, to_date(timestamp_seconds(col(EVENT_TIMESTAMP).$div(1000))))
                .select(
                        APP_ID,
                        EVENT_DATE,
                        EVENT_TIMESTAMP,
                        "event_id",
                        "event_name",
                        "event_param_key",
                        "event_param_double_value",
                        "event_param_float_value",
                        "event_param_int_value",
                        "event_param_string_value"
                );

        Dataset<Row> itemDataset = newDataset.select(explode(expr("data.items")).alias("item")).select(expr("item.*"));
        itemDataset = itemDataset.withColumn(EVENT_DATE, to_date(timestamp_seconds(col(EVENT_TIMESTAMP).$div(1000))))
                .select(
                        APP_ID,
                        EVENT_DATE,
                        EVENT_TIMESTAMP,
                        "id",
                        "properties"
                );


        Dataset<Row> userDataset = newDataset.select(expr("data.user.*"));
        userDataset = userDataset
                .withColumn(EVENT_DATE, to_date(timestamp_seconds(col(EVENT_TIMESTAMP).$div(1000))))
                .withColumn("_first_visit_date",  to_date(timestamp_seconds(col("user_first_touch_timestamp").$div(1000))))
                .select(
                        APP_ID,
                        EVENT_DATE,
                        EVENT_TIMESTAMP,
                        "user_id",
                        "user_pseudo_id",
                        "user_first_touch_timestamp",
                        "user_properties",
                        "user_ltv",
                        "_first_visit_date",
                        "_first_referer",
                        "_first_traffic_source_type",
                        "_first_traffic_medium",
                        "_first_traffic_source"
                );


        return Arrays.asList(eventDataset,
                eventParameterDataset,
                itemDataset,
                userDataset);
    }

    public Dataset<Row> postTransform(final Dataset<Row> dataset) {
        Dataset<Row> dataset1 = dataset;
        if (Arrays.asList(dataset.columns()).contains("ua")) {
            dataset1 = dataset.drop("ua");
        }

        if (Arrays.asList(dataset.columns()).contains(GEO_FOR_ENRICH)) {
            dataset1 = dataset.drop(GEO_FOR_ENRICH);
        }
        return dataset1;
    }

}
