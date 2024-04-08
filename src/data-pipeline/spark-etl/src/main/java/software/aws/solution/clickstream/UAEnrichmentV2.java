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

import lombok.extern.slf4j.*;
import org.apache.spark.sql.*;
import org.apache.spark.sql.api.java.*;
import org.apache.spark.sql.catalyst.expressions.*;
import org.apache.spark.sql.expressions.*;
import org.apache.spark.sql.types.*;
import software.aws.solution.clickstream.common.Constant;
import software.aws.solution.clickstream.common.enrich.*;
import software.aws.solution.clickstream.common.model.*;
import software.aws.solution.clickstream.util.*;

import static org.apache.spark.sql.functions.*;
import static software.aws.solution.clickstream.common.Util.convertStringObjectMapToStringStringMap;
import static software.aws.solution.clickstream.util.DatasetUtil.UA_ENRICH;
import static software.aws.solution.clickstream.ETLRunner.*;
import static software.aws.solution.clickstream.model.ModelV2.STR_TO_STR_MAP_TYPE;

@Slf4j
public class UAEnrichmentV2 {
    static UDF1<String, Row> enrich() {
        return uaString -> {
           ClickstreamUA clickstreamUA = UAEnrichHelper.parserUA(uaString);
            return new GenericRow(
                    new Object[]{
                            clickstreamUA.getUaBrowser(),
                            clickstreamUA.getUaBrowserVersion(),
                            clickstreamUA.getUaOs(),
                            clickstreamUA.getUaOsVersion(),
                            clickstreamUA.getUaDevice(),
                            clickstreamUA.getUaDeviceCategory(),
                            convertStringObjectMapToStringStringMap(clickstreamUA.getUaMap())
                    });
        };
    }

    public Dataset<Row> transform(final Dataset<Row> dataset) {
        UserDefinedFunction udfEnrichUserAgent = udf(enrich(), DataTypes.createStructType(
                new StructField[]{
                        DataTypes.createStructField(Constant.DEVICE_UA_BROWSER, DataTypes.StringType, true),
                        DataTypes.createStructField(Constant.DEVICE_UA_BROWSER_VERSION, DataTypes.StringType, true),

                        DataTypes.createStructField(Constant.DEVICE_UA_OS, DataTypes.StringType, true),
                        DataTypes.createStructField(Constant.DEVICE_UA_OS_VERSION, DataTypes.StringType, true),

                        DataTypes.createStructField(Constant.DEVICE_UA_DEVICE, DataTypes.StringType, true),
                        DataTypes.createStructField(Constant.DEVICE_UA_DEVICE_CATEGORY, DataTypes.StringType, true),

                        DataTypes.createStructField(Constant.DEVICE_UA, STR_TO_STR_MAP_TYPE, true),
                }
        ));
        Dataset<Row> datasetUa = dataset.withColumn(UA_ENRICH, udfEnrichUserAgent.apply(col(Constant.UA)));

        Dataset<Row> enrichedDataset = datasetUa
                .withColumn(Constant.DEVICE_UA_BROWSER, col(UA_ENRICH).getField(Constant.DEVICE_UA_BROWSER))
                .withColumn(Constant.DEVICE_UA_BROWSER_VERSION, col(UA_ENRICH).getField(Constant.DEVICE_UA_BROWSER_VERSION))
                .withColumn(Constant.DEVICE_UA_OS, col(UA_ENRICH).getField(Constant.DEVICE_UA_OS))
                .withColumn(Constant.DEVICE_UA_OS_VERSION, col(UA_ENRICH).getField(Constant.DEVICE_UA_OS_VERSION))
                .withColumn(Constant.DEVICE_UA_DEVICE, col(UA_ENRICH).getField(Constant.DEVICE_UA_DEVICE))
                .withColumn(Constant.DEVICE_UA_DEVICE_CATEGORY, col(UA_ENRICH).getField(Constant.DEVICE_UA_DEVICE_CATEGORY))
                .withColumn(Constant.DEVICE_UA, col(UA_ENRICH).getField(Constant.DEVICE_UA))
                .drop(UA_ENRICH);

        if (ContextUtil.isDebugLocal()) {
            enrichedDataset.write().mode(SaveMode.Overwrite).json(DEBUG_LOCAL_PATH + "/enrich-ua-v2-Dataset/");
        }
        return enrichedDataset;
    }

}
