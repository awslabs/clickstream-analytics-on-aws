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

import org.apache.spark.sql.Dataset;
import org.apache.spark.sql.Row;
import org.apache.spark.sql.api.java.UDF1;
import org.apache.spark.sql.catalyst.expressions.GenericRow;
import org.apache.spark.sql.expressions.UserDefinedFunction;
import org.apache.spark.sql.types.DataTypes;
import org.apache.spark.sql.types.StructField;
import ua_parser.Client;
import ua_parser.Parser;
import ua_parser.UserAgent;

import java.util.Optional;

import static org.apache.spark.sql.functions.col;
import static org.apache.spark.sql.functions.udf;

public class UAEnrichment {

    private static final Parser UA_PARSER = new Parser();

    private static UDF1<String, Row> enrich() {
        return value -> {
            Client client = UA_PARSER.parse(value);
            return Optional.ofNullable(client.userAgent)
                    .filter(userAgent -> !userAgent.family.equals("Other"))
                    .map(userAgent -> new GenericRow(new String[]{
                            userAgent.family,
                            getVersion(userAgent),
                            userAgent.family + ":" + getVersion(userAgent)}))
                    .orElse(new GenericRow(new String[]{"", "", ""}));
        };
    }

    private static String getVersion(final UserAgent userAgent) {
        return String.format("%s.%s.%s", userAgent.major, userAgent.minor, userAgent.patch);
    }

    public Dataset<Row> transform(final Dataset<Row> dataset) {
        UserDefinedFunction udfEnrichUserAgent = udf(enrich(), DataTypes.createStructType(
                new StructField[]{
                        DataTypes.createStructField("browser", DataTypes.StringType, true),
                        DataTypes.createStructField("browser_version", DataTypes.StringType, true),
                        DataTypes.createStructField("web_info_value", DataTypes.StringType, true)
                }
        ));
        return dataset.withColumn("web_info_obj", udfEnrichUserAgent.apply(col("device").getField("web_info")))
                .withColumn("device",
                        col("device")
                                .withField("browser", col("web_info_obj").getField("browser"))
                                .withField("browser_version", col("web_info_obj").getField("browser_version"))
        );
    }

}
