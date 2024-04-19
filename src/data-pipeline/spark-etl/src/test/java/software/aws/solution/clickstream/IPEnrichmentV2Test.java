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
import org.junit.jupiter.api.*;
import software.aws.solution.clickstream.common.Constant;
import software.aws.solution.clickstream.model.*;

import java.io.*;

import static java.util.Objects.*;
import static software.aws.solution.clickstream.util.ContextUtil.*;

class IPEnrichmentV2Test extends BaseSparkTest {

    private final IPEnrichmentV2 ipEnrichment = new IPEnrichmentV2();

    @Test
    public void test_enrich_ip_v2() throws IOException {
        // DOWNLOAD_FILE=1 ./gradlew clean test --info --tests software.aws.solution.clickstream.IPEnrichmentV2Test.test_enrich_ip_v2
        System.setProperty(APP_IDS_PROP, "uba-app");
        System.setProperty(PROJECT_ID_PROP, "test_project_id_01");

        spark.sparkContext().addFile(requireNonNull(getClass().getResource("/GeoLite2-City.mmdb")).getPath());

        Dataset<Row> dataset =
                spark.read().schema(ModelV2.EVENT_TYPE).json(requireNonNull(getClass().getResource("/event_v2/transformed_data_event_v2.json")).getPath());
        Dataset<Row> outDataset = ipEnrichment.transform(dataset);

        outDataset = outDataset.select(
                Constant.IP,
                Constant.GEO_CITY,
                Constant.GEO_CONTINENT,
                Constant.GEO_COUNTRY,
                Constant.GEO_METRO,
                Constant.GEO_REGION,
                Constant.GEO_SUB_CONTINENT,
                Constant.GEO_LOCALE
        );

        String expectedJson = this.resourceFileAsString("/event_v2/expected/test_enrich_ip_v2.json");

        Assertions.assertEquals(expectedJson, outDataset.first().prettyJson());

    }

}