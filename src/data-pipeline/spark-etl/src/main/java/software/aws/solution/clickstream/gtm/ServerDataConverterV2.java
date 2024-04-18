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

package software.aws.solution.clickstream.gtm;

import lombok.extern.slf4j.Slf4j;
import org.apache.spark.sql.Dataset;
import org.apache.spark.sql.Row;
import org.apache.spark.sql.expressions.UserDefinedFunction;
import org.apache.spark.sql.types.DataTypes;
import org.apache.spark.sql.types.DateType;
import software.aws.solution.clickstream.common.RuleConfig;
import software.aws.solution.clickstream.transformer.BaseDataConverter;
import software.aws.solution.clickstream.transformer.EventParserFactory;
import software.aws.solution.clickstream.transformer.UDFHelper;

import java.util.Map;

import static org.apache.spark.sql.functions.col;
import static org.apache.spark.sql.functions.explode;
import static org.apache.spark.sql.functions.lit;
import static org.apache.spark.sql.functions.udf;
import static software.aws.solution.clickstream.TransformerV3.INPUT_FILE_NAME;
import static software.aws.solution.clickstream.common.BaseEventParser.UPLOAD_TIMESTAMP;
import static software.aws.solution.clickstream.util.ContextUtil.PROJECT_ID_PROP;
import static software.aws.solution.clickstream.util.DatasetUtil.DATA;
import static software.aws.solution.clickstream.util.DatasetUtil.DATA_OUT;
import static software.aws.solution.clickstream.util.DatasetUtil.hasColumn;


@Slf4j
public class ServerDataConverterV2 extends BaseDataConverter {
    private final Map<String, RuleConfig> appRuleConfig;

    public ServerDataConverterV2(final Map<String, RuleConfig> appRuleConfig) {
        this.appRuleConfig = appRuleConfig;
    }

    @Override
    public String getName() {
        return EventParserFactory.GTM_SERVER_DATA;
    }

    @Override
    public Dataset<Row> convertByUDF(final Dataset<Row> dataset) {
        String projectId = System.getProperty(PROJECT_ID_PROP);
        UserDefinedFunction convertGTMServerDataUdf = udf(UDFHelper.getConvertDataUdf(this.getName(), this.getAppRuleConfig()), UDFHelper.getUdfOutput());
        String appId = "appId";
        if (hasColumn(dataset, UPLOAD_TIMESTAMP)) {
            return filterEmptyAppId(dataset, appId)
                    .withColumn(DATA_OUT, explode(convertGTMServerDataUdf.apply(
                                    col(DATA),
                                    col("ingest_time"),
                                    col(UPLOAD_TIMESTAMP).cast(DataTypes.LongType),
                                    col("rid"),
                                    lit(null).cast(DataTypes.StringType), // uri
                                    lit(null).cast(DataTypes.StringType), // ua
                                    lit(null).cast(DataTypes.StringType), // ip
                                    lit(projectId),
                                    col(INPUT_FILE_NAME),
                                    col(appId)
                            )
                    ));
        } else {
            return filterEmptyAppId(dataset, appId)
                    .withColumn(DATA_OUT, explode(convertGTMServerDataUdf.apply(
                                    col(DATA),
                                    col("ingest_time"),
                                    lit(null).cast(DataTypes.LongType), // upload_timestamp
                                    col("rid"),
                                    lit(null).cast(DataTypes.StringType), // uri
                                    lit(null).cast(DataTypes.StringType), // ua
                                    lit(null).cast(DataTypes.StringType), // ip
                                    lit(projectId),
                                    col(INPUT_FILE_NAME),
                                    col(appId)
                            )
                    ));
        }
    }

    @Override
    public UserDefinedFunction getConvertUdf() {
        return udf(UDFHelper.getConvertDataUdf(this.getName(), this.getAppRuleConfig()), UDFHelper.getUdfOutput());
    }

    @Override
    public Map<String, RuleConfig> getAppRuleConfig() {
        return this.appRuleConfig;
    }
}
