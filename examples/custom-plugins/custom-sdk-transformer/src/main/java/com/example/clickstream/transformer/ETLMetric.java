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

package com.example.clickstream.transformer;

import org.apache.spark.sql.Dataset;
import org.apache.spark.sql.Row;



public class ETLMetric {

    private final Dataset<Row> dataset;
    private final String info;

    ETLMetric(final Dataset<Row> dataset, final String info) {
        this.dataset = dataset;
        this.info = info;
    }

    @Override
    public String toString() {
        return "[ETLMetric]" + this.info + " dataset count:" + dataset.count();
    }
}
