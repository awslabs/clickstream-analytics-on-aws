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
import software.aws.solution.clickstream.transformer.TransformConfig;
import software.aws.solution.clickstream.util.TableName;

import java.util.Map;

public interface TransformerInterfaceV3 {
    void config(TransformConfig transformConfig);
    Map<TableName, Dataset<Row>> transform(Dataset<Row> dataset);
    Dataset<Row> postTransform(Dataset<Row> dataset);
}
