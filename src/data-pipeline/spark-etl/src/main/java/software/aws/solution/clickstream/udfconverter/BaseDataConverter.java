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

package software.aws.solution.clickstream.udfconverter;

import org.apache.spark.sql.Column;
import org.apache.spark.sql.Dataset;
import org.apache.spark.sql.Row;
import org.apache.spark.sql.SaveMode;
import org.apache.spark.sql.expressions.UserDefinedFunction;
import org.apache.spark.sql.functions;
import org.apache.spark.sql.types.DataTypes;
import software.aws.solution.clickstream.transformer.TransformConfigurable;
import software.aws.solution.clickstream.transformer.TransformerNameEnum;
import software.aws.solution.clickstream.util.DatasetUtil;

import static org.apache.spark.sql.functions.col;
import static org.apache.spark.sql.functions.explode;
import static org.apache.spark.sql.functions.lit;
import static org.apache.spark.sql.functions.udf;
import static software.aws.solution.clickstream.ETLRunner.DEBUG_LOCAL_PATH;
import static software.aws.solution.clickstream.TransformerV3.INPUT_FILE_NAME;
import static software.aws.solution.clickstream.common.BaseEventParser.UPLOAD_TIMESTAMP;
import static software.aws.solution.clickstream.util.ContextUtil.DEBUG_LOCAL_PROP;
import static software.aws.solution.clickstream.util.ContextUtil.PROJECT_ID_PROP;
import static software.aws.solution.clickstream.util.DatasetUtil.CORRUPT_RECORD;
import static software.aws.solution.clickstream.util.DatasetUtil.DATA;
import static software.aws.solution.clickstream.util.DatasetUtil.DATA_OUT;
import static software.aws.solution.clickstream.util.DatasetUtil.hasColumn;

public abstract class BaseDataConverter implements DatasetConverter, TransformConfigurable {

    public static final String INGEST_APPID = "appId";

    public abstract TransformerNameEnum getName();

    @Override
    public Dataset<Row> transform(final Dataset<Row> dataset) {

        Dataset<Row> convertedDataset = convertByUDF(dataset);

        boolean debugLocal = Boolean.parseBoolean(System.getProperty(DEBUG_LOCAL_PROP));
        if (debugLocal) {
            convertedDataset.write().mode(SaveMode.Overwrite).json(DEBUG_LOCAL_PATH + "/" + getName());
        }
        Dataset<Row> okDataset = convertedDataset.filter(col(DATA_OUT).getField(CORRUPT_RECORD).isNull());
        Dataset<Row> corruptDataset = convertedDataset.filter(col(DATA_OUT).getField(CORRUPT_RECORD).isNotNull());
        long corruptDatasetCount = corruptDataset.count();
        if (corruptDatasetCount > 0) {
            DatasetUtil.saveCorruptDataset(corruptDataset, corruptDatasetCount, "etl_corrupted_json_" + getName().toString().toLowerCase());
        }
        return okDataset;
    }

    public Dataset<Row> convertByUDF(final Dataset<Row> dataset) {
        UserDefinedFunction convertGTMServerDataUdf = udf(UDFHelper.getConvertDataUdf(this.getName(), this.getTransformConfig()), UDFHelper.getUdfOutput());
        return filterEmptyAppId(dataset)
                .withColumn(DATA_OUT, explode(convertGTMServerDataUdf.apply(
                                getUDFParamsColumns(dataset)
                        )
                ));
    }

    public Column[] getUDFParamsColumns(final Dataset<Row> dataset) {
        String projectId = System.getProperty(PROJECT_ID_PROP);
        Column[] columns = new Column[]{
                col(DATA),
                col("ingest_time"),
                col(UPLOAD_TIMESTAMP).cast(DataTypes.LongType),
                col("rid"),
                col("uri"),
                col("ua"),
                col("ip"),
                lit(projectId),
                col(INPUT_FILE_NAME),
                col(INGEST_APPID)
        };
        if (!hasColumn(dataset, UPLOAD_TIMESTAMP)) {
           columns[2] = lit(null).cast(DataTypes.LongType);
        }
        return columns;
    }

    public UserDefinedFunction getConvertUdf() {
        return functions.udf(UDFHelper.getConvertDataUdf(this.getName(), this.getTransformConfig()), UDFHelper.getUdfOutput());
    }

    public static Dataset<Row> filterEmptyAppId(final Dataset<Row> dataset) {
        return dataset
                .filter(col(INGEST_APPID).isNotNull().and(col(INGEST_APPID).notEqual("")));
    }
}
