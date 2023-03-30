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

import com.clearspring.analytics.util.Lists;
import org.apache.spark.sql.Dataset;
import org.apache.spark.sql.Row;
import org.junit.jupiter.api.Test;

import static com.google.common.collect.Lists.newArrayList;
import static java.util.Objects.requireNonNull;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.nio.file.Paths;
import java.util.Date;
import java.util.List;

class ETLRunnerTest extends BaseSparkTest {

    @Test
    public void should_executeTransformers() {
        spark.sparkContext().addFile(requireNonNull(getClass().getResource("/GeoLite2-City.mmdb")).getPath());

        List<String> transformers = Lists.newArrayList();

        transformers.add("sofeware.aws.solution.clickstream.Transformer");
        transformers.add("sofeware.aws.solution.clickstream.UAEnrichment");
        transformers.add("sofeware.aws.solution.clickstream.IPEnrichment");

        String database = "fakeDatabase";
        String sourceTable = "fakeSourceTable";
        String jobDataUri = "/tmp/job-data";
        String transformerClassNames = String.join(",");
        String outputPath = "/tmp/test-output";
        String projectId = "projectId1";
        String validAppIds = "id1,id2,uba-app";
        String outPutFormat = "json";
        String startTimestamp = "1667963966000";
        String endTimestamp = "1667969999000";
        String dataFreshnessInHour ="72";

        ETLRunner.ETLRunnerConfig runnerConfig = new ETLRunner.ETLRunnerConfig(database, sourceTable, jobDataUri,
                newArrayList(transformerClassNames.split(",")),
                outputPath, projectId, validAppIds, outPutFormat, Long.valueOf(startTimestamp),
                Long.valueOf(endTimestamp), Long.valueOf(dataFreshnessInHour));

        ETLRunner runner = new ETLRunner(spark, runnerConfig);
        String sql = runner.configAndSQL();

        String expectedSql= "select * from `fakeDatabase`.fakeSourceTable where (\n" +
                "(year='2022' AND month='11' AND day='09')\n" +
                ") AND ingest_time >= 1667963966000 AND ingest_time <= 1667969999000";

        assertEquals(expectedSql, sql);
        Dataset<Row> sourceDataset =
                spark.read().json(requireNonNull(getClass().getResource("/original_data.json")).getPath());

        Dataset<Row> dataset  = runner.executeTransformers(sourceDataset, transformers);
        Row row = dataset.first();

        Row geo = row.getStruct(row.fieldIndex("geo"));
        assertEquals(geo.getString(geo.fieldIndex("country")), "Singapore");
        assertEquals(geo.getString(geo.fieldIndex("continent")), "Asia");
        assertEquals(geo.getString(geo.fieldIndex("city")), "Singapore");

        Row device = row.getStruct(row.fieldIndex("device"));
        String web_info = device.getString(device.fieldIndex("web_info"));
        String browser =  device.getString(device.fieldIndex("browser"));
        String browser_version =  device.getString(device.fieldIndex("browser_version"));

        assertEquals(web_info, "Apache-HttpClient/4.5.12 (Java/11.0.15)");
        assertEquals(browser, "Apache-HttpClient");
        assertEquals(browser_version, "4.5.12");

        String outPath = "/tmp/test-spark-etl" + new Date().getTime();
        runner.writeResult(outPath, dataset);
        assertTrue(Paths.get(outPath + "/partition_app=uba-app/partition_year=2023" +
                        "/partition_month=03/partition_day=23")
                .toFile().isDirectory());
    }



    // ./gradlew test --tests  sofeware.aws.solution.clickstream.ETLRunnerTest.should_executeTransformers_debug_local
    @Test()
    public void should_executeTransformers_debug_local() {
        System.setProperty("debug.local", "true");
        spark.sparkContext().addFile(requireNonNull(getClass().getResource("/GeoLite2-City.mmdb")).getPath());

        List<String> transformers = Lists.newArrayList();

        transformers.add("sofeware.aws.solution.clickstream.Transformer");
        transformers.add("sofeware.aws.solution.clickstream.UAEnrichment");
        transformers.add("sofeware.aws.solution.clickstream.IPEnrichment");

        String database = "fakeDatabase";
        String sourceTable = "fakeSourceTable";
        String jobDataUri = "/tmp/job-data";
        String transformerClassNames = String.join(",");
        String outputPath = "/tmp/test-output";
        String projectId = "projectId1";
        String validAppIds = "id1,id2,uba-app";
        String outPutFormat = "json";
        String startTimestamp = "1667963966000";
        String endTimestamp = "1667969999000";
        String dataFreshnessInHour ="72";

        ETLRunner.ETLRunnerConfig runnerConfig = new ETLRunner.ETLRunnerConfig(database, sourceTable, jobDataUri,
                newArrayList(transformerClassNames.split(",")),
                outputPath, projectId, validAppIds, outPutFormat, Long.valueOf(startTimestamp),
                Long.valueOf(endTimestamp), Long.valueOf(dataFreshnessInHour));

        ETLRunner runner = new ETLRunner(spark, runnerConfig);
        runner.configAndSQL();

        Dataset<Row> sourceDataset =
                spark.read().json(requireNonNull(getClass().getResource("/data/raw-input-data.json")).getPath());
        sourceDataset.count();
        Dataset<Row> dataset  = runner.executeTransformers(sourceDataset, transformers);
        String outPath = ETLRunner.DEBUG_LOCAL_PATH + "/"+ new Date().getTime();
        runner.writeResult(outPath, dataset);
        System.out.println(outPath);
        System.setProperty("debug.local", "false");
    }

    @Test
    public void should_executeTransformers_with_error() {
        spark.sparkContext().addFile(requireNonNull(getClass().getResource("/GeoLite2-City.mmdb")).getPath());
        List<String> transformers = Lists.newArrayList();

        transformers.add("sofeware.aws.solution.clickstream.Transformer");
        transformers.add("sofeware.aws.solution.clickstream.UAEnrichment");
        transformers.add("sofeware.aws.solution.clickstream.IPEnrichment");

        String database = "fakeDatabase";
        String sourceTable = "fakeSourceTable";
        String jobDataUri = "/tmp/job-data";
        String transformerClassNames = String.join(",");
        String outputPath = "/tmp/test-output";
        String projectId = "projectId1";
        String validAppIds = "id1,id2,uba-app";
        String outPutFormat = "json";
        String startTimestamp = "1667963966000";
        String endTimestamp = "1667969999000";
        String dataFreshnessInHour ="72";

        ETLRunner.ETLRunnerConfig runnerConfig = new ETLRunner.ETLRunnerConfig(database, sourceTable, jobDataUri,
                newArrayList(transformerClassNames.split(",")),
                outputPath, projectId, validAppIds, outPutFormat, Long.valueOf(startTimestamp),
                Long.valueOf(endTimestamp), Long.valueOf(dataFreshnessInHour));

        ETLRunner runner = new ETLRunner(spark, runnerConfig);
        runner.configAndSQL();
        Dataset<Row> sourceDataset =
                spark.read().json(requireNonNull(getClass().getResource("/original_data_with_error.json")).getPath());
        assertEquals(sourceDataset.count(), 2);
        Dataset<Row> dataset  = runner.executeTransformers(sourceDataset, transformers);
        assertEquals(dataset.count(), 1);
        runner.writeResult("/tmp/test-err", dataset);
    }
}