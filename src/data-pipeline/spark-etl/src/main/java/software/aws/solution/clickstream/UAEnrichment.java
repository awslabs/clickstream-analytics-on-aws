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

import org.apache.spark.sql.Dataset;
import org.apache.spark.sql.Row;
import org.apache.spark.sql.SaveMode;
import org.apache.spark.sql.api.java.UDF1;
import org.apache.spark.sql.catalyst.expressions.GenericRow;
import org.apache.spark.sql.expressions.UserDefinedFunction;
import org.apache.spark.sql.types.DataTypes;
import org.apache.spark.sql.types.StructField;
import ua_parser.Client;
import ua_parser.Parser;

import java.util.Optional;

import static org.apache.spark.sql.functions.col;
import static org.apache.spark.sql.functions.udf;
import static software.aws.solution.clickstream.ETLRunner.DEBUG_LOCAL_PATH;

public class UAEnrichment {

    private static final Parser UA_PARSER = new Parser();

    private static UDF1<String, Row> enrich() {
        return value -> {
            Client client = UA_PARSER.parse(value);
            String uaBrowser = Optional.ofNullable(client.userAgent).map(a -> a.family).orElse(null);
            String uaBrowserVersion = Optional.ofNullable(client.userAgent)
                    .map(a -> getVersion(a.major, a.major, a.patch)).orElse(null);

            String uaOs = Optional.ofNullable(client.os).map(a -> a.family).orElse(null);
            String uaOsVersion = Optional.ofNullable(client.os)
                    .map(a -> getVersion(a.major, a.major, a.patch)).orElse(null);

            String uaDevice = Optional.ofNullable(client.device).map(a -> a.family).orElse(null);
            String uaDeviceCategory = null; // PC|Tablet|Mobile|Bot|Other
            return new GenericRow(
                    new String[]{uaBrowser, uaBrowserVersion, uaOs, uaOsVersion, uaDevice, uaDeviceCategory}
            );
        };
    }

    private static String getVersion(final String major, final String minor, final String patch) {
        if (major != null && minor != null && patch != null) {
            return String.format("%s.%s.%s", major, minor, patch);
        } else {
            return null;
        }
    }

    public Dataset<Row> transform(final Dataset<Row> dataset) {
        UserDefinedFunction udfEnrichUserAgent = udf(enrich(), DataTypes.createStructType(
                new StructField[]{
                        DataTypes.createStructField("ua_browser", DataTypes.StringType, true),
                        DataTypes.createStructField("ua_browser_version", DataTypes.StringType, true),

                        DataTypes.createStructField("ua_os", DataTypes.StringType, true),
                        DataTypes.createStructField("ua_os_version", DataTypes.StringType, true),

                        DataTypes.createStructField("ua_device", DataTypes.StringType, true),
                        DataTypes.createStructField("ua_device_category", DataTypes.StringType, true),
                }
        ));
        Dataset<Row> datasetUa = dataset.withColumn("ua_enrich", udfEnrichUserAgent.apply(col("ua")));

        Dataset<Row> enrichedDataset = datasetUa.withColumn("device", datasetUa.col("device")
                .withField("ua_browser", col("ua_enrich").getField("ua_browser"))
                .withField("ua_browser_version", col("ua_enrich").getField("ua_browser_version"))
                .withField("ua_os", col("ua_enrich").getField("ua_os"))
                .withField("ua_os_version", col("ua_enrich").getField("ua_os_version"))
                .withField("ua_device", col("ua_enrich").getField("ua_device"))
                .withField("ua_device_category", col("ua_enrich").getField("ua_device_category"))
        ).drop("ua_enrich");

        if (ContextUtil.isDebugLocal()) {
            enrichedDataset.write().mode(SaveMode.Overwrite).json(DEBUG_LOCAL_PATH + "/enrich-ua-Dataset/");
        }
        return enrichedDataset;
    }

}
