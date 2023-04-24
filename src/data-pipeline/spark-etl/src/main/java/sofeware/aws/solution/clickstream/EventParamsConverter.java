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

import lombok.extern.slf4j.Slf4j;
import org.apache.spark.sql.Dataset;
import org.apache.spark.sql.Row;

import java.util.Arrays;

@Slf4j
public class EventParamsConverter {
    public Dataset<Row> transform(final Dataset<Row> dataset) {
        return new KvConverter().transform(dataset, "attributes", "event_params",
                Arrays.asList(
                        "_privacy_info_ads_storage",
                        "_privacy_info_analytics_storage",
                        "_privacy_info_uses_transient_token",
                        "_traffic_source_medium",
                        "_traffic_source_name",
                        "_traffic_source_source",
                        "_channel"
                )
        );
    }
}
