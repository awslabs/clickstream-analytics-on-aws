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

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.*;
import com.fasterxml.jackson.databind.node.*;
import lombok.extern.slf4j.*;
import org.apache.spark.sql.Dataset;
import org.apache.spark.sql.Encoders;
import org.apache.spark.sql.Row;
import org.apache.spark.sql.SparkSession;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
import software.aws.solution.clickstream.common.Constant;
import software.aws.solution.clickstream.common.RuleConfig;
import software.aws.solution.clickstream.transformer.TransformConfig;
import software.aws.solution.clickstream.util.*;

import java.io.*;
import java.net.URISyntaxException;
import java.net.URL;
import java.net.URLConnection;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Date;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;
import java.util.zip.GZIPInputStream;

import static java.util.Objects.requireNonNull;
import static org.apache.spark.sql.functions.col;
import static org.apache.spark.sql.functions.decode;
import static software.aws.solution.clickstream.util.ContextUtil.*;

@Slf4j
public class BaseSparkTest extends BaseTest {
    public static final String PROCESS_INFO = "process_info";
    public static final String PROCESS_TIME = "process_time";
    public static final String INPUT_FILE_NAME = "input_file_name";
    protected SparkSession spark;

    @BeforeAll
    public static void downloadResources() {
       if (!needDownloadFile()) {
           return;
       }
        System.out.println("download GeoLite2-City.mmdb.gz...");
        String dbFile = downloadFile("https://cdn.jsdelivr.net/npm/geolite2-city@1.0.0/GeoLite2-City.mmdb.gz");
        System.out.println("download completed, " + dbFile);
    }

    public static String downloadFile(String urlStr) {
        String dbFile = new File(BaseSparkTest.class.getResource("/original_data.json").getPath())
                .getParent() + "/GeoLite2-City.mmdb";
        System.out.println(dbFile);

        String fileInTmp = "/tmp/GeoLite2-City.mmdb";
        File fileInTmpObj = new File(fileInTmp);

        if (fileInTmpObj.exists()) {
            System.out.println("file already exists, skip download");
           // copy file to dbFile
            return copyFile(fileInTmp, dbFile);
        }

        try (
                FileOutputStream fs = new FileOutputStream(dbFile)
        ) {
            URL url = new URL(urlStr);
            URLConnection conn = url.openConnection();
            InputStream inStream = conn.getInputStream();
            GZIPInputStream gis = new GZIPInputStream(inStream);
            BufferedInputStream bufferedInputStream = new BufferedInputStream(gis);

            byte[] buffer = new byte[1024];
            int byteRead;
            while ((byteRead = bufferedInputStream.read(buffer)) != -1) {
                fs.write(buffer, 0, byteRead);
            }
        } catch (Exception e) {
            e.printStackTrace();
            throw new RuntimeException(e);
        }
        copyFile(dbFile, fileInTmp);
        return dbFile;
    }

    private static String copyFile(String srcFile, String dbFile) {
        System.out.println("copy file from " + srcFile + " to " + dbFile);
        try {
            InputStream in = new FileInputStream(srcFile);
            OutputStream out = new FileOutputStream(dbFile);
            byte[] buf = new byte[1024];
            int len;
            while ((len = in.read(buf)) > 0) {
                out.write(buf, 0, len);
            }
            in.close();
            out.close();
        } catch (IOException e) {
            e.printStackTrace();
            throw new RuntimeException(e);
        }
        return dbFile;
    }

    @BeforeEach
    public void init() {
        System.setProperty(JOB_NAME_PROP, "test-job");
        System.setProperty(WAREHOUSE_DIR_PROP, "/tmp/warehouse");
        String dbName = "test_db";
        System.setProperty(DATABASE_PROP, dbName);
        System.setProperty(USER_KEEP_DAYS_PROP, String.valueOf(365 * 100));
        System.setProperty(ITEM_KEEP_DAYS_PROP, String.valueOf(365 * 100));

        spark = SparkSession.builder()
                .appName("Test Spark App")
                .master("local[*]")
                .config("spark.driver.bindAddress", "127.0.0.1")
                .config("spark.sql.warehouse.dir", ContextUtil.getWarehouseDir())
                .config("spark.sql.mapKeyDedupPolicy", "LAST_WIN")
                .config("spark.sql.session.timeZone", "UTC")
                .enableHiveSupport()
                .getOrCreate();
        spark.sql("DROP DATABASE IF EXISTS " + dbName + " CASCADE");
        spark.sql("CREATE DATABASE IF NOT EXISTS " + dbName);
    }

    @AfterEach
    public void clear() {
        spark.stop();
    }

    public static boolean needDownloadFile(){
       String dfile = System.getenv("DOWNLOAD_FILE");
       if ("false".equals(dfile) || "0".equals(dfile)) {
           return false;
       }
        return true;
    }

    public String datasetToPrettyJson(Dataset<Row> dataset) throws JsonProcessingException {
        String rowsJson = dataset.collectAsList().stream().map(Row::prettyJson).collect(Collectors.joining(",\n"));
        rowsJson = "[" + rowsJson + "]";
        ObjectMapper om = new ObjectMapper();
        rowsJson = om.readTree(rowsJson).toPrettyString();
        return rowsJson;
    }

    public String replaceDynData(String jsonStr) throws JsonProcessingException {
        return replaceProcessInfo(replaceInputFileName(jsonStr));
    }
    public String replaceInputFileName(String jsonStr) {
        // replace  "input_file_name" : .*, with "input_file_name" : "_TEST_INPUT_FILE_NAME_"
        return jsonStr.replaceAll("\"input_file_name\"\\s*:\\s*\".*?\",", "\"input_file_name\" : \"_TEST_INPUT_FILE_NAME_\",");
    }

    public String replaceSchemaString(String schemaStr) {
       return schemaStr.replaceAll("\"nullable\" : false,", "\"nullable\" : true,");
    }

    public String replaceProcessInfo(String jsonStr) throws JsonProcessingException {
        ObjectMapper om = new ObjectMapper();
        JsonNode node = om.readTree(jsonStr);
        if (node.hasNonNull(PROCESS_INFO)) {
            ObjectNode processInfo = (ObjectNode) node.get(PROCESS_INFO);
            if (processInfo.hasNonNull(PROCESS_TIME)) {
                processInfo.put(PROCESS_TIME, "_PROCESS_TIME_");
            }
            if (processInfo.hasNonNull(INPUT_FILE_NAME)) {
                String fileFullPath = processInfo.get(INPUT_FILE_NAME).asText();
                processInfo.put(INPUT_FILE_NAME, Paths.get(fileFullPath).getFileName().toString());
            }
        }
        if (node.has(Constant.CREATED_TIME)) {
            ((ObjectNode)node).put(Constant.CREATED_TIME, "_CREATED_TIME_");
        }
        return node.toPrettyString();
    }

    public Dataset<Row> readJsonDataset(String filePath) {
        Dataset<Row> dataset =
                spark.read().json(requireNonNull(getClass().getResource(filePath)).getPath());
        return dataset;
    }

    public String setWarehouseDir(String testName) {
        String testWarehouseDir = "/tmp/warehouse/" + testName + "/" + new Date().getTime();
        System.setProperty(WAREHOUSE_DIR_PROP, testWarehouseDir);
        return testWarehouseDir;
    }

    public TransformConfig getTestTransformConfig(String... appIds) {
        Path ruleConfigDir = null;
        try {
            ruleConfigDir = Paths.get(Objects.requireNonNull(getClass().getResource("/rule_config/")).toURI());
        } catch (URISyntaxException e) {
            throw new RuntimeException(e);
        }

        log.info("ruleConfigDir: " + ruleConfigDir);
        Dataset<Row> configFileDataset = this.spark.read().format("binaryFile")
                .option("pathGlobFilter", "*.json")
                .option("recursiveFileLookup", "true")
                .load(ruleConfigDir.toString());

        List<PathContent> configFileList = configFileDataset.select(col("path"), decode(col("content"), "utf8").alias("content"))
                .as(Encoders.bean(PathContent.class)).collectAsList();

        Map<String, RuleConfig> appRuleConfig = new HashMap<>();
        for (PathContent pathContent : configFileList) {
            log.info("path: " + pathContent.getPath());
            String path = pathContent.getPath();
            String content = pathContent.getContent();

            String[] pathParts = path.split("/");
            String fileName = pathParts[pathParts.length - 1];
            String appId = pathParts[pathParts.length - 2];

            RuleConfig ruleConfig = null;
            if (appRuleConfig.containsKey(appId)) {
                ruleConfig = appRuleConfig.get(appId);
            } else {
                ruleConfig = new RuleConfig();
                appRuleConfig.put(appId, ruleConfig);
            }

            String categoryRuleFileNameV1 = "traffic_source_category_rule_v1.json";
            String channelRuleFileNameV1 = "traffic_source_channel_rule_v1.json";

            if (categoryRuleFileNameV1.equalsIgnoreCase(fileName)) {
                ruleConfig.setOptCategoryRuleJson(content);
            }
            if (channelRuleFileNameV1.equalsIgnoreCase(fileName)) {
                ruleConfig.setOptChannelRuleJson(content);
            }
        }

        appRuleConfig.put("testApp", appRuleConfig.get("app1"));
        appRuleConfig.put("uba-app", appRuleConfig.get("app1"));
        appRuleConfig.put("gtmTest", appRuleConfig.get("app1"));
        for (String appId : appIds) {
            appRuleConfig.put(appId, appRuleConfig.get("app1"));
        }

        TransformConfig transformRuleConfig = new TransformConfig();
        transformRuleConfig.setAppRuleConfig(appRuleConfig);
        return transformRuleConfig;
    }
}
