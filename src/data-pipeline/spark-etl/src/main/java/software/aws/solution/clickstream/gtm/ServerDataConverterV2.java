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
import org.apache.spark.sql.Column;
import org.apache.spark.sql.Dataset;
import org.apache.spark.sql.Row;
import org.apache.spark.sql.expressions.UserDefinedFunction;
import org.apache.spark.sql.types.DataTypes;
import software.aws.solution.clickstream.common.TransformConfig;
import software.aws.solution.clickstream.udfconverter.BaseDataConverter;
import software.aws.solution.clickstream.transformer.TransformerNameEnum;
import software.aws.solution.clickstream.udfconverter.UDFHelper;

import static org.apache.spark.sql.functions.col;
import static org.apache.spark.sql.functions.lit;
import static org.apache.spark.sql.functions.udf;
import static software.aws.solution.clickstream.TransformerV3.INPUT_FILE_NAME;
import static software.aws.solution.clickstream.common.BaseEventParser.UPLOAD_TIMESTAMP;
import static software.aws.solution.clickstream.transformer.TransformerNameEnum.GTM_SERVER_DATA;
import static software.aws.solution.clickstream.util.ContextUtil.PROJECT_ID_PROP;
import static software.aws.solution.clickstream.util.DatasetUtil.DATA;
import static software.aws.solution.clickstream.util.DatasetUtil.hasColumn;


@Slf4j
public class ServerDataConverterV2 extends BaseDataConverter {
    private final TransformConfig transformConfig;

    public ServerDataConverterV2(final TransformConfig transformConfig) {
        this.transformConfig = transformConfig;
    }

    @Override
    public TransformerNameEnum getName() {
        return GTM_SERVER_DATA;
    }

    @Override
    public Column[] getUDFParamsColumns(final Dataset<Row> dataset) {
        Column[] columns = new Column[] {
                col(DATA),
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
        if (!hasColumn(dataset, UPLOAD_TIMESTAMP)) {
          columns[2] = lit(null).cast(DataTypes.LongType);
        }
        return columns;
    }

    @Override
    public UserDefinedFunction getConvertUdf() {
        return udf(UDFHelper.getConvertDataUdf(this.getName(), this.getTransformConfig()), UDFHelper.getUdfOutput());
    }

    @Override
    public TransformConfig getTransformConfig() {
        return this.transformConfig;
    }
}
