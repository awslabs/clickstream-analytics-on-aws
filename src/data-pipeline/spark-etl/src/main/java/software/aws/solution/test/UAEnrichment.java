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

package software.aws.solution.test;

import org.apache.spark.sql.Dataset;
import org.apache.spark.sql.Row;
import org.apache.spark.sql.SaveMode;
import org.apache.spark.sql.api.java.UDF1;
import org.apache.spark.sql.catalyst.expressions.GenericRow;
import org.apache.spark.sql.expressions.UserDefinedFunction;
import org.apache.spark.sql.types.DataTypes;
import org.apache.spark.sql.types.StructField;
import software.aws.solution.test.util.ContextUtil;
import software.aws.solution.test.util.DatasetUtil;
import ua_parser.Client;
import ua_parser.Parser;

import java.util.Optional;

import static org.apache.spark.sql.functions.col;
import static org.apache.spark.sql.functions.udf;
import static software.aws.solution.test.ETLRunner.DEBUG_LOCAL_PATH;

public class UAEnrichment {

    private static final Parser UA_PARSER = new Parser();

    static UDF1<String, Row> enrich() {
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
                        DataTypes.createStructField(DatasetUtil.UA_BROWSER, DataTypes.StringType, true),
                        DataTypes.createStructField(DatasetUtil.UA_BROWSER_VERSION, DataTypes.StringType, true),

                        DataTypes.createStructField(DatasetUtil.UA_OS, DataTypes.StringType, true),
                        DataTypes.createStructField(DatasetUtil.UA_OS_VERSION, DataTypes.StringType, true),

                        DataTypes.createStructField(DatasetUtil.UA_DEVICE, DataTypes.StringType, true),
                        DataTypes.createStructField(DatasetUtil.UA_DEVICE_CATEGORY, DataTypes.StringType, true),
                }
        ));
        Dataset<Row> datasetUa = dataset.withColumn(DatasetUtil.UA_ENRICH, udfEnrichUserAgent.apply(col("ua")));

        Dataset<Row> enrichedDataset = datasetUa.withColumn("device", datasetUa.col("device")
                .withField(DatasetUtil.UA_BROWSER, col(DatasetUtil.UA_ENRICH).getField(DatasetUtil.UA_BROWSER))
                .withField(DatasetUtil.UA_BROWSER_VERSION, col(DatasetUtil.UA_ENRICH).getField(DatasetUtil.UA_BROWSER_VERSION))
                .withField(DatasetUtil.UA_OS, col(DatasetUtil.UA_ENRICH).getField(DatasetUtil.UA_OS))
                .withField(DatasetUtil.UA_OS_VERSION, col(DatasetUtil.UA_ENRICH).getField(DatasetUtil.UA_OS_VERSION))
                .withField(DatasetUtil.UA_DEVICE, col(DatasetUtil.UA_ENRICH).getField(DatasetUtil.UA_DEVICE))
                .withField(DatasetUtil.UA_DEVICE_CATEGORY, col(DatasetUtil.UA_ENRICH).getField(DatasetUtil.UA_DEVICE_CATEGORY))
        ).drop(DatasetUtil.UA_ENRICH);

        if (ContextUtil.isDebugLocal()) {
            enrichedDataset.write().mode(SaveMode.Overwrite).json(DEBUG_LOCAL_PATH + "/enrich-ua-Dataset/");
        }
        return enrichedDataset;
    }

}
