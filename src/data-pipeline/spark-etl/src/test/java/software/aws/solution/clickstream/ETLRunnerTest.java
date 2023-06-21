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

import com.clearspring.analytics.util.Lists;
import org.apache.spark.sql.Dataset;
import org.apache.spark.sql.Row;
import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.net.URISyntaxException;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.util.Date;
import java.util.List;

import static com.google.common.collect.Lists.newArrayList;
import static java.util.Objects.requireNonNull;
import static org.junit.jupiter.api.Assertions.*;

class ETLRunnerTest extends BaseSparkTest {

    @Test
    public void should_read_dataset_cross_multi_days() {
        String database = "default";
        String sourceTable = "fakeSourceTable";
        String sourcePath = Paths.get(getClass().getResource("/original_data.json").getPath()).getParent().toString() + "/partition_data/";
        String jobDataDir = "/tmp/job-data";
        String transformerClassNames = String.join(",");
        String outputPath = "/tmp/test-output";
        String projectId = "projectId1";
        String validAppIds = "id1,id2,uba-app";
        String outPutFormat = "json";
        String startTimestamp = "1667963966000"; // 2022-11-09T03:19:26.000Z
        String endTimestamp = "1668136766000"; // 2022-11-11T03:19:26.000Z
        String dataFreshnessInHour = "72";
        String outputPartitions = "-1";

        ETLRunnerConfig runnerConfig = new ETLRunnerConfig(
                "true",
                database,
                sourceTable,
                sourcePath,
                jobDataDir,
                newArrayList(transformerClassNames.split(",")),
                outputPath, projectId, validAppIds, outPutFormat, Long.valueOf(startTimestamp),
                Long.valueOf(endTimestamp), Long.valueOf(dataFreshnessInHour), Integer.valueOf(outputPartitions), -1);

        ETLRunner runner = new ETLRunner(spark, runnerConfig);
        Dataset<Row> dataset = runner.readInputDataset(false);
        assertEquals(9, dataset.count());
    }

    @Test
    public void should_readDataset() {
        String database = "default";
        String sourceTable = "fakeSourceTable";
        String sourcePath = Paths.get(getClass().getResource("/original_data.json").getPath()).getParent().toString() + "/partition_data/";
        String jobDataDir = "/tmp/job-data";
        String transformerClassNames = String.join(",");
        String outputPath = "/tmp/test-output";
        String projectId = "projectId1";
        String validAppIds = "id1,id2,uba-app";
        String outPutFormat = "json";
        String startTimestamp = "1667963966000"; // 2022-11-09T03:19:26.000Z
        String endTimestamp = "1667969999000"; // 2022-11-09T07:46:39.000Z
        String dataFreshnessInHour = "72";
        String outputPartitions = "-1";

      ETLRunnerConfig runnerConfig = new ETLRunnerConfig(
                "true",
                database, 
                sourceTable,
                sourcePath,
                jobDataDir,
                newArrayList(transformerClassNames.split(",")),
                outputPath, projectId, validAppIds, outPutFormat, Long.valueOf(startTimestamp),
                Long.valueOf(endTimestamp), Long.valueOf(dataFreshnessInHour), Integer.valueOf(outputPartitions), -1);

        ETLRunner runner = new ETLRunner(spark, runnerConfig);
        Dataset<Row> dataset = runner.readInputDataset(true);
        assertEquals(0, dataset.count());
        dataset = runner.readInputDataset(false);
        assertEquals(2, dataset.count());
    }


    @Test
    public void should_read_corrupt_dataset() {
        String database = "default";
        String sourceTable = "fakeSourceTable";
        String sourcePath = Paths.get(getClass().getResource("/original_data.json").getPath()).getParent().toString() + "/partition_data/";
        String jobDataDir = "/tmp/job-data";
        String transformerClassNames = String.join(",");
        String outputPath = "/tmp/test-output";
        String projectId = "projectId1";
        String validAppIds = "id1,id2,uba-app";
        String outPutFormat = "json";
        String startTimestamp = "1668128460000"; // '2022-11-11T01:01:00Z'
        String endTimestamp = "1668153660000"; // '2022-11-11T08:01:00Z'
        String dataFreshnessInHour = "72";
        String outputPartitions = "-1";

        ETLRunnerConfig runnerConfig = new ETLRunnerConfig(
                "true",
                database,
                sourceTable,
                sourcePath,
                jobDataDir,
                newArrayList(transformerClassNames.split(",")),
                outputPath, projectId, validAppIds, outPutFormat, Long.valueOf(startTimestamp),
                Long.valueOf(endTimestamp), Long.valueOf(dataFreshnessInHour), Integer.valueOf(outputPartitions), -1);

        ETLRunner runner = new ETLRunner(spark, runnerConfig);
        Dataset<Row> dataset = runner.readInputDataset(true);
        assertEquals(0, dataset.count());
        dataset = runner.readInputDataset(false);
        assertEquals("\"abc\"", dataset.first().getAs("_corrupt_record"));
    }

    @Test
    public void should_executeTransformers() throws IOException {
        System.setProperty("debug.local", "true");
        System.setProperty("app.ids", "id1,id2,uba-app");
        System.setProperty("project.id", "projectId1");
        System.setProperty("save.info.to.warehouse", "true");

        spark.sparkContext().addFile(requireNonNull(getClass().getResource("/GeoLite2-City.mmdb")).getPath());

        List<String> transformers = Lists.newArrayList();

        transformers.add("software.aws.solution.clickstream.Transformer");
        transformers.add("software.aws.solution.clickstream.UAEnrichment");
        transformers.add("software.aws.solution.clickstream.IPEnrichment");

        String database = "default";
        String sourceTable = "fakeSourceTable";
        String sourcePath = getClass().getResource("/original_data.json").getPath();
        String jobDataDir = "/tmp/job-data";
        String transformerClassNames = String.join(",");
        String outputPath = "/tmp/test-output";
        String projectId = "projectId1";
        String validAppIds = "id1,id2,uba-app";
        String outPutFormat = "json";
        String startTimestamp = "1667963966000"; // 2022-11-09T03:19:26.000Z
        String endTimestamp = "1667969999000"; // 2022-11-09T07:46:39.000Z
        String dataFreshnessInHour = "72";
        String outputPartitions = "-1";

        ETLRunnerConfig runnerConfig = new ETLRunnerConfig(
                "false",
                database,
                sourceTable,
                sourcePath,
                jobDataDir,
                newArrayList(transformerClassNames.split(",")),
                outputPath, projectId, validAppIds, outPutFormat, Long.valueOf(startTimestamp),
                Long.valueOf(endTimestamp), Long.valueOf(dataFreshnessInHour), Integer.valueOf(outputPartitions), -1);

        ETLRunner runner = new ETLRunner(spark, runnerConfig);

        Dataset<Row> sourceDataset =
                spark.read().json(requireNonNull(getClass().getResource("/original_data.json")).getPath());

        Dataset<Row> dataset = runner.executeTransformers(sourceDataset, transformers);
        checkSchema(dataset);

        Row row = dataset.first();
        assertEquals(111L, row.getLong(row.fieldIndex("event_bundle_sequence_id")));
        String outPath = "/tmp/test-spark-etl/" + new Date().getTime();
        runner.writeResult(outPath, dataset);
        assertTrue(Paths.get(outPath + "/partition_app=uba-app/partition_year=2023" +
                        "/partition_month=04/partition_day=24")
                .toFile().isDirectory());
    }

    private void checkSchema(Dataset<Row> dataset) throws IOException {
        dataset.printSchema();
        System.out.println(dataset.schema().toDDL());
        // app_info: STRUCT<app_id: STRING, id: STRING, install_source: STRING, version: STRING>
        // `app_info` struct<app_id:string,id:string,install_source:string,version:string>,

        String path = this.getClass().getResource("/ods_event.sql").getPath();
        String sqlContent = String.join("\n", Files.readAllLines(Paths.get(path)));
        String normalSqlContent = sqlContent.replaceAll("[``]", "");
        dataset.schema().foreach(d -> {
            // change 'app_info: STRUCT<app_id: STRING>' to 'app_info struct<app_id:string>'
            String fieldSql = d.sql().toLowerCase().replaceAll(" ", "")
                    .replaceAll("^" + d.name() + ":", d.name() + " ");
            boolean matchColDef = normalSqlContent.contains(fieldSql + ",") || normalSqlContent.contains(fieldSql + ")");
            if (matchColDef) {
                System.out.println(d.name() + " OK");
            } else {
                System.err.println(fieldSql);
                System.err.println(d.name() + " is mismatch");
                System.out.println("cannot find below sql\n" + fieldSql + "\nin\n" + normalSqlContent);
            }
            assertTrue(matchColDef);
            return "";
        });

        System.out.println(dataset.schema().fieldNames());
        assertEquals(String.join(" ", dataset.schema().fieldNames()), String.join(" ", new String[]{
                "app_info",
                "device",
                "ecommerce",
                "event_bundle_sequence_id",
                "event_date",
                "event_dimensions",
                "event_id",
                "event_name",
                "event_params",
                "event_previous_timestamp",
                "event_server_timestamp_offset",
                "event_timestamp",
                "event_value_in_usd",
                "geo",
                "ingest_timestamp",
                "items",
                "platform",
                "privacy_info",
                "project_id",
                "traffic_source",
                "user_first_touch_timestamp",
                "user_id",
                "user_ltv",
                "user_properties",
                "user_pseudo_id",
        }));
    }


    @Test
    public void should_executeTransformers_with_error() {
        spark.sparkContext().addFile(requireNonNull(getClass().getResource("/GeoLite2-City.mmdb")).getPath());
        List<String> transformers = Lists.newArrayList();

        transformers.add("software.aws.solution.clickstream.Transformer");
        transformers.add("software.aws.solution.clickstream.UAEnrichment");
        transformers.add("software.aws.solution.clickstream.IPEnrichment");

        String database = "default";
        String sourceTable = "fakeSourceTable";
        String sourcePath = getClass().getResource("/original_data.json").getPath();

        String jobDataDir = "/tmp/etl-debug/";
        String transformerClassNames = String.join(",");
        String outputPath = "/tmp/test-output";
        String projectId = "projectId1";
        String validAppIds = "id1,id2,uba-app";
        String outPutFormat = "json";
        String startTimestamp = "1667963966000";
        String endTimestamp = "1667969999000";
        String dataFreshnessInHour = "72";

        ETLRunnerConfig runnerConfig = new ETLRunnerConfig(
                "false",
                database,
                sourceTable,
                sourcePath,
                jobDataDir,
                newArrayList(transformerClassNames.split(",")),
                outputPath, projectId, validAppIds, outPutFormat, Long.valueOf(startTimestamp),
                Long.valueOf(endTimestamp), Long.valueOf(dataFreshnessInHour), -1, -1);

        ETLRunner runner = new ETLRunner(spark, runnerConfig);
        Dataset<Row> sourceDataset =
                spark.read().json(requireNonNull(getClass().getResource("/original_data_with_error.json")).getPath());
        assertEquals(sourceDataset.count(), 1);
        Dataset<Row> dataset = runner.executeTransformers(sourceDataset, transformers);
        assertEquals(dataset.count(), 0);
    }
}