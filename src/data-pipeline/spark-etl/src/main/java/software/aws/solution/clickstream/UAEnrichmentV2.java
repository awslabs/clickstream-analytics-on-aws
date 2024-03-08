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

import org.apache.spark.sql.*;
import org.apache.spark.sql.expressions.*;
import org.apache.spark.sql.types.*;
import software.aws.solution.clickstream.model.*;

import static org.apache.spark.sql.functions.*;
import static software.aws.solution.clickstream.DatasetUtil.*;
import static software.aws.solution.clickstream.ETLRunner.*;

public class UAEnrichmentV2 {
    public Dataset<Row> transform(final Dataset<Row> dataset) {
        UserDefinedFunction udfEnrichUserAgent = udf(UAEnrichment.enrich(), DataTypes.createStructType(
                new StructField[]{
                        DataTypes.createStructField(UA_BROWSER, DataTypes.StringType, true),
                        DataTypes.createStructField(UA_BROWSER_VERSION, DataTypes.StringType, true),

                        DataTypes.createStructField(UA_OS, DataTypes.StringType, true),
                        DataTypes.createStructField(UA_OS_VERSION, DataTypes.StringType, true),

                        DataTypes.createStructField(UA_DEVICE, DataTypes.StringType, true),
                        DataTypes.createStructField(UA_DEVICE_CATEGORY, DataTypes.StringType, true),
                }
        ));
        Dataset<Row> datasetUa = dataset.withColumn(UA_ENRICH, udfEnrichUserAgent.apply(col(ModelV2.UA)));

        Dataset<Row> enrichedDataset = datasetUa
                .withColumn(ModelV2.DEVICE_UA_BROWSER, col(UA_ENRICH).getField(UA_BROWSER))
                .withColumn(ModelV2.DEVICE_UA_BROWSER_VERSION, col(UA_ENRICH).getField(UA_BROWSER_VERSION))
                .withColumn(ModelV2.DEVICE_UA_DEVICE, col(UA_ENRICH).getField(UA_DEVICE))
                .withColumn(ModelV2.DEVICE_UA_DEVICE_CATEGORY, col(UA_ENRICH).getField(UA_DEVICE_CATEGORY))
                .drop(UA_ENRICH);

        if (ContextUtil.isDebugLocal()) {
            enrichedDataset.write().mode(SaveMode.Overwrite).json(DEBUG_LOCAL_PATH + "/enrich-ua-v2-Dataset/");
        }
        return enrichedDataset;
    }

}
