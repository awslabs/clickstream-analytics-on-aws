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

package software.aws.solution.test.gtm;

import lombok.extern.slf4j.Slf4j;
import org.apache.spark.sql.Column;
import org.apache.spark.sql.Dataset;
import org.apache.spark.sql.Row;
import org.apache.spark.sql.expressions.UserDefinedFunction;
import org.apache.spark.sql.functions;
import org.apache.spark.sql.types.DataTypes;
import software.aws.solution.clickstream.common.RuleConfig;
import software.aws.solution.test.udfconverter.BaseDataConverter;
import software.aws.solution.test.transformer.TransformerNameEnum;
import software.aws.solution.test.udfconverter.UDFHelper;
import software.aws.solution.test.util.DatasetUtil;

import java.util.Map;

import static org.apache.spark.sql.functions.col;
import static org.apache.spark.sql.functions.lit;
import static software.aws.solution.test.TransformerV3.INPUT_FILE_NAME;
import static software.aws.solution.clickstream.common.BaseEventParser.UPLOAD_TIMESTAMP;
import static software.aws.solution.test.util.ContextUtil.PROJECT_ID_PROP;


@Slf4j
public class ServerDataConverterV2 extends BaseDataConverter {
    private final Map<String, RuleConfig> appRuleConfig;

    public ServerDataConverterV2(final Map<String, RuleConfig> appRuleConfig) {
        this.appRuleConfig = appRuleConfig;
    }

    @Override
    public TransformerNameEnum getName() {
        return TransformerNameEnum.GTM_SERVER_DATA;
    }

    @Override
    public Column[] getUDFParamsColumns(final Dataset<Row> dataset) {
        Column[] columns = new Column[] {
                col(DatasetUtil.DATA),
                col("ingest_time"),
                col(UPLOAD_TIMESTAMP).cast(DataTypes.LongType),
                col("rid"),
                lit(null).cast(DataTypes.StringType), // uri
                lit(null).cast(DataTypes.StringType), // ua
                lit(null).cast(DataTypes.StringType), // ip
                lit(System.getProperty(PROJECT_ID_PROP)),
                col(INPUT_FILE_NAME),
                col("appId")
        };
        if (!DatasetUtil.hasColumn(dataset, UPLOAD_TIMESTAMP)) {
          columns[2] = lit(null).cast(DataTypes.LongType);
        }
        return columns;
    }

    @Override
    public UserDefinedFunction getConvertUdf() {
        return functions.udf(UDFHelper.getConvertDataUdf(this.getName(), this.getAppRuleConfig()), UDFHelper.getUdfOutput());
    }

    @Override
    public Map<String, RuleConfig> getAppRuleConfig() {
        return this.appRuleConfig;
    }
}
