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

public class ETLMetric {
    private final Long count;
    private final String info;

    public ETLMetric(final Dataset<Row> dataset, final String info) {
        this.info = info;
        this.count  = dataset.count();
    }

    public ETLMetric(final long count, final String info) {
        this.count = count;
        this.info = info;
    }


    @Override
    public String toString() {
        return "[ETLMetric]" + this.info + " dataset count:" + this.count;
    }
}
