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

package com.example.clickstream;

import lombok.extern.slf4j.Slf4j;
import org.apache.spark.sql.Dataset;
import org.apache.spark.sql.Row;
import org.apache.spark.sql.types.DataTypes;

import static org.apache.spark.sql.functions.*;

@Slf4j
public final class CustomUriEnrich {
    public Dataset<Row> transform(final Dataset<Row> dataset) {

        // `event_params` array<struct<key:string,value:struct<double_value:double,float_value:float,int_value:long,string_value:string>>>,
        return dataset
                .withColumn("customAppNameStr",
                        regexp_extract(col("uri"), "customAppName=(\\w+)", 1))
                .withColumn("customAppName",
                        expr("if (customAppNameStr = '', null, customAppNameStr)").cast(DataTypes.StringType))
                .withColumn("customAppNameArr", array(struct(
                        lit("customAppName").alias("key"),
                        struct(
                                lit(null).cast(DataTypes.DoubleType).alias("double_value"),
                                lit(null).cast(DataTypes.FloatType).alias("float_value"),
                                lit(null).cast(DataTypes.LongType).alias("int_value"),
                                col("customAppName").cast(DataTypes.StringType).alias("string_value")
                        ).alias("value"))))
                .withColumn("event_params", array_union(col("event_params"), col("customAppNameArr")))
                .drop("customAppName", "customAppNameArr", "customAppNameStr");
    }

}
