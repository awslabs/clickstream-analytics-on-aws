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

import lombok.Getter;
import lombok.extern.slf4j.Slf4j;
import org.apache.spark.sql.Column;
import org.apache.spark.sql.Dataset;
import org.apache.spark.sql.Row;
import org.apache.spark.sql.types.DataTypes;
import software.aws.solution.clickstream.common.Constant;
import software.aws.solution.clickstream.exception.ExecuteTransformerException;
import software.aws.solution.clickstream.model.ModelV2;
import software.aws.solution.clickstream.transformer.BaseTransformerV3;
import software.aws.solution.clickstream.transformer.Cleaner;
import software.aws.solution.clickstream.udfconverter.ClickstreamDataConverterV3;
import software.aws.solution.clickstream.udfconverter.DatasetConverter;
import software.aws.solution.clickstream.common.TransformConfig;
import software.aws.solution.clickstream.transformer.TransformerNameEnum;
import software.aws.solution.clickstream.util.ContextUtil;
import software.aws.solution.clickstream.util.DatasetUtil;

import static org.apache.spark.sql.functions.col;
import static org.apache.spark.sql.functions.expr;
import static org.apache.spark.sql.functions.first;
import static org.apache.spark.sql.functions.lit;
import static org.apache.spark.sql.functions.map;
import static org.apache.spark.sql.functions.max;
import static org.apache.spark.sql.functions.max_by;
import static org.apache.spark.sql.functions.min_by;
import static org.apache.spark.sql.functions.struct;
import static software.aws.solution.clickstream.model.ModelV2.toColumnArray;
import static software.aws.solution.clickstream.transformer.MaxLengthTransformerV2.runMaxLengthTransformerForUserV2;
import static software.aws.solution.clickstream.transformer.TransformerNameEnum.CLICKSTREAM;
import static software.aws.solution.clickstream.util.ContextUtil.DEBUG_LOCAL_PROP;
import static software.aws.solution.clickstream.util.DatasetUtil.DATA;
import static software.aws.solution.clickstream.util.DatasetUtil.DATA_SCHEMA_V2_FILE_PATH;
import static software.aws.solution.clickstream.util.DatasetUtil.EVENT_FIRST_OPEN;
import static software.aws.solution.clickstream.util.DatasetUtil.EVENT_FIRST_VISIT;
import static software.aws.solution.clickstream.util.DatasetUtil.EVENT_PROFILE_SET;
import static software.aws.solution.clickstream.util.DatasetUtil.EVENT_SCREEN_VIEW;
import static software.aws.solution.clickstream.util.DatasetUtil.EVENT_SESSION_START;
import static software.aws.solution.clickstream.util.DatasetUtil.addSchemaToMap;
import static software.aws.solution.clickstream.util.DatasetUtil.readDatasetFromPath;
import static software.aws.solution.clickstream.util.DatasetUtil.saveFullDatasetToPath;
import static software.aws.solution.clickstream.util.DatasetUtil.saveIncrementalDatasetToPath;


@Slf4j
public class TransformerV3 extends BaseTransformerV3 {
    public static final String ETL_USER_V2_PROPS = "etl_user_v2_props";
    public static final String INPUT_FILE_NAME = "input_file_name";
    public static final String PLATFORM_WEB = "Web";
    public static final String USER_FIRST_EVENT_NAME = "first_event_name";
    public static final String USER_LATEST_EVENT_NAME = "latest_event_name";
    public static final String CLIENT_TIMESTAMP = "client_timestamp";
    public static final String DATA_STR = "data_str";
    private final Cleaner cleaner = new Cleaner();
    @Getter
    private TransformConfig transformConfig;

    public TransformerV3() {
    }

    public TransformerV3(final TransformConfig transformConfig) {
        config(transformConfig);
    }

    public static Dataset<Row> aggUserDataset(final Dataset<Row> userDataSet, final String info) {
        Dataset<Row> userIdDataset = userDataSet
                .select(Constant.APP_ID,
                        Constant.USER_PSEUDO_ID,
                        Constant.USER_ID,
                        Constant.EVENT_TIMESTAMP,
                        Constant.PROCESS_INFO)
                .groupBy(Constant.APP_ID, Constant.USER_PSEUDO_ID)
                .agg(
                        max(Constant.USER_ID).alias(Constant.USER_ID),
                        max(Constant.EVENT_TIMESTAMP).alias(Constant.EVENT_TIMESTAMP),
                        first(Constant.PROCESS_INFO).alias(Constant.PROCESS_INFO)
                );

        log.info("aggUserDataset() userIdDataset count: {}, info: {}", userIdDataset.count(), info);

        boolean debugLocal = Boolean.parseBoolean(System.getProperty(DEBUG_LOCAL_PROP));

        if (debugLocal && userDataSet.count() > 0) {
            log.info("{} userDataSet: {}", info, userDataSet.first().prettyJson());
        }

        String latest = "latest.";
        String latestEventName = USER_LATEST_EVENT_NAME;
        Dataset<Row> profileSetUserPropsDataset = userDataSet.filter(
                col(Constant.USER_PROPERTIES).isNotNull()
                        .and(col(latestEventName).equalTo(EVENT_PROFILE_SET))
        );

        log.info("aggUserDataset() profileSetUserPropsDataset count: {}, info: {}", profileSetUserPropsDataset.count(), info);

        Dataset<Row> latestUserPropsDataset1 = profileSetUserPropsDataset
                .groupBy(Constant.APP_ID, Constant.USER_PSEUDO_ID)
                .agg(
                        max_by(struct(
                                Constant.USER_PROPERTIES,
                                Constant.USER_PROPERTIES_JSON_STR,
                                latestEventName
                        ), col(Constant.EVENT_TIMESTAMP)).alias("latest")
                );

        Dataset<Row> latestUserPropsDataset = latestUserPropsDataset1.select(
                col(Constant.APP_ID).alias("app_id_1"),
                col(Constant.USER_PSEUDO_ID).alias("user_pseudo_id_1"),
                col(latest + Constant.USER_PROPERTIES).alias(Constant.USER_PROPERTIES),
                col(latest + Constant.USER_PROPERTIES_JSON_STR).alias(Constant.USER_PROPERTIES_JSON_STR),
                col(latest + latestEventName).alias(latestEventName)
        );

        log.info("aggUserDataset() latestUserPropsDataset count: {}, info: {}", latestUserPropsDataset.count(), info);
        if (debugLocal && latestUserPropsDataset.count() > 0) {
            log.info("{} - latestUserPropsDataset: {}", info, latestUserPropsDataset.first().prettyJson());
        }

        String first = "first.";
        String firstEventName = USER_FIRST_EVENT_NAME;
        Dataset<Row> userFirstDataSet = userDataSet.filter(
                col(firstEventName).isin(
                        EVENT_FIRST_OPEN,
                        EVENT_FIRST_VISIT,
                        EVENT_SESSION_START,
                        EVENT_SCREEN_VIEW));
        log.info("aggUserDataset() userFirstDataSet count: {}, info: {}", userFirstDataSet.count(), info);

        Dataset<Row> firstUserPropsDataset1 = userFirstDataSet
                .groupBy(Constant.APP_ID, Constant.USER_PSEUDO_ID)
                .agg(
                        min_by(struct(
                                firstEventName,
                                Constant.FIRST_TOUCH_TIME_MSEC,
                                Constant.FIRST_VISIT_DATE,
                                Constant.FIRST_REFERRER,
                                Constant.FIRST_TRAFFIC_SOURCE,
                                Constant.FIRST_TRAFFIC_MEDIUM,
                                Constant.FIRST_TRAFFIC_CAMPAIGN,
                                Constant.FIRST_TRAFFIC_CONTENT,
                                Constant.FIRST_TRAFFIC_TERM,
                                Constant.FIRST_TRAFFIC_CAMPAIGN_ID,
                                Constant.FIRST_TRAFFIC_CLID_PLATFORM,
                                Constant.FIRST_TRAFFIC_CLID,
                                Constant.FIRST_TRAFFIC_CHANNEL_GROUP,
                                Constant.FIRST_TRAFFIC_CATEGORY,
                                Constant.FIRST_APP_INSTALL_SOURCE
                        ), col(Constant.EVENT_TIMESTAMP)).alias("first"));

        Dataset<Row> firstUserPropsDataset = firstUserPropsDataset1.select(
                col(Constant.APP_ID).alias("app_id_2"),
                col(Constant.USER_PSEUDO_ID).alias("user_pseudo_id_2"),
                col(first + firstEventName).alias(firstEventName),
                col(first + Constant.FIRST_TOUCH_TIME_MSEC).alias(Constant.FIRST_TOUCH_TIME_MSEC),
                col(first + Constant.FIRST_VISIT_DATE).alias(Constant.FIRST_VISIT_DATE),
                col(first + Constant.FIRST_REFERRER).alias(Constant.FIRST_REFERRER),
                col(first + Constant.FIRST_TRAFFIC_SOURCE).alias(Constant.FIRST_TRAFFIC_SOURCE),
                col(first + Constant.FIRST_TRAFFIC_MEDIUM).alias(Constant.FIRST_TRAFFIC_MEDIUM),
                col(first + Constant.FIRST_TRAFFIC_CAMPAIGN).alias(Constant.FIRST_TRAFFIC_CAMPAIGN),
                col(first + Constant.FIRST_TRAFFIC_CONTENT).alias(Constant.FIRST_TRAFFIC_CONTENT),
                col(first + Constant.FIRST_TRAFFIC_TERM).alias(Constant.FIRST_TRAFFIC_TERM),
                col(first + Constant.FIRST_TRAFFIC_CAMPAIGN_ID).alias(Constant.FIRST_TRAFFIC_CAMPAIGN_ID),
                col(first + Constant.FIRST_TRAFFIC_CLID_PLATFORM).alias(Constant.FIRST_TRAFFIC_CLID_PLATFORM),
                col(first + Constant.FIRST_TRAFFIC_CLID).alias(Constant.FIRST_TRAFFIC_CLID),
                col(first + Constant.FIRST_TRAFFIC_CHANNEL_GROUP).alias(Constant.FIRST_TRAFFIC_CHANNEL_GROUP),
                col(first + Constant.FIRST_TRAFFIC_CATEGORY).alias(Constant.FIRST_TRAFFIC_CATEGORY),
                col(first + Constant.FIRST_APP_INSTALL_SOURCE).alias(Constant.FIRST_APP_INSTALL_SOURCE)
        );

        log.info("aggUserDataset() firstUserPropsDataset count: {}, info: {}", firstUserPropsDataset.count(), info);
        if (debugLocal && firstUserPropsDataset.count() > 0) {
            log.info("{} - firstUserPropsDataset: {}", info, firstUserPropsDataset.first().prettyJson());
        }
        Dataset<Row> userFinalDataset = joinUserDatasets(userIdDataset, latestUserPropsDataset, firstUserPropsDataset, latestEventName, firstEventName);

        log.info("aggUserDataset() return count: {}, info: {}", userFinalDataset.count(), info);
        if (debugLocal && userFinalDataset.count() > 0) {
            log.info("{} - userFinalDataset: {}", info, userFinalDataset.first().prettyJson());
        }
        return userFinalDataset;
    }

    private static Dataset<Row> joinUserDatasets(final Dataset<Row> userIdDataset,
                                                 final Dataset<Row> latestUserPropsDataset,
                                                 final Dataset<Row> firstUserPropsDataset,
                                                 final String latestEventName, final String firstEventName) {
        Column joinCondition1 = col(Constant.APP_ID).equalTo(col("app_id_1"))
                .and(col(Constant.USER_PSEUDO_ID).equalTo(col("user_pseudo_id_1")));

        Column joinCondition2 = col(Constant.APP_ID).equalTo(col("app_id_2"))
                .and(col(Constant.USER_PSEUDO_ID).equalTo(col("user_pseudo_id_2")));

        Dataset<Row> userFinalDatasetJoined = userIdDataset
                .join(latestUserPropsDataset, joinCondition1, "left")
                .join(firstUserPropsDataset, joinCondition2, "left");

        return userFinalDatasetJoined.select(
                col(Constant.APP_ID),
                col(Constant.USER_PSEUDO_ID),
                col(Constant.EVENT_TIMESTAMP),
                col(Constant.USER_ID),
                col(Constant.USER_PROPERTIES),
                col(Constant.USER_PROPERTIES_JSON_STR),
                col(Constant.FIRST_TOUCH_TIME_MSEC),
                col(Constant.FIRST_VISIT_DATE),
                col(Constant.FIRST_REFERRER),
                col(Constant.FIRST_TRAFFIC_SOURCE),
                col(Constant.FIRST_TRAFFIC_MEDIUM),
                col(Constant.FIRST_TRAFFIC_CAMPAIGN),
                col(Constant.FIRST_TRAFFIC_CONTENT),
                col(Constant.FIRST_TRAFFIC_TERM),
                col(Constant.FIRST_TRAFFIC_CAMPAIGN_ID),
                col(Constant.FIRST_TRAFFIC_CLID_PLATFORM),
                col(Constant.FIRST_TRAFFIC_CLID),
                col(Constant.FIRST_TRAFFIC_CHANNEL_GROUP),
                col(Constant.FIRST_TRAFFIC_CATEGORY),
                col(Constant.FIRST_APP_INSTALL_SOURCE),
                col(latestEventName),
                col(firstEventName),
                mapConcatSafe(
                        col(Constant.PROCESS_INFO),
                        map(
                                lit(latestEventName), col(latestEventName),
                                lit(firstEventName), col(firstEventName)
                        )).alias(Constant.PROCESS_INFO)
        );
    }

    @Override
    public void config(final TransformConfig transformConfig) {
        this.transformConfig = transformConfig;
        log.info("TransformConfig is set");
    }

    @Override
    public DatasetConverter getDatasetTransformer() {
        if (this.getTransformConfig() == null) {
            throw new ExecuteTransformerException("Transform config is not set");
        }
        return new ClickstreamDataConverterV3(this.transformConfig);
    }


    @Override
    public Dataset<Row> extractUser(final Dataset<Row> eventDataset, final Dataset<Row> convertedDataset) {
        Dataset<Row> userDataset = convertedDataset.select(expr("dataOut.user.*"))
                .select(toColumnArray(ModelV2.getUserFields()));

        userDataset = userDataset.withColumn(USER_FIRST_EVENT_NAME, col(Constant.EVENT_NAME))
                .withColumn(USER_LATEST_EVENT_NAME, col(Constant.EVENT_NAME))
                .drop(Constant.EVENT_NAME);

        // agg new
        Dataset<Row> newUserAggDataset = aggUserDataset(userDataset, "newUserAggDataset");
        log.info("newUserAggDataset count: {}", newUserAggDataset.count());

        String tableName = getUserPropsTableName();
        DatasetUtil.PathInfo pathInfo = addSchemaToMap(newUserAggDataset, tableName, TABLE_VERSION_SUFFIX_V3);
        log.info("tableName: {}", tableName);
        log.info("pathInfo - incremental: " + pathInfo.getIncremental() + ", full: " + pathInfo.getFull());

        if (userDataset.count() == 0) {
            log.info("extractUser return empty dataset");
            return userDataset;
        }

        // save new (append)
        String path = saveIncrementalDatasetToPath(pathInfo.getIncremental(), newUserAggDataset);

        // read back full from incremental path
        Dataset<Row> fullUserDataset = readDatasetFromPath(eventDataset.sparkSession(), path, ContextUtil.getUserKeepDays());
        log.info("fullUserDataset count: {}", +fullUserDataset.count());

        // agg full
        Dataset<Row> fullUserAggDataset = aggUserDataset(fullUserDataset, "fullUserAggDataset");

        // save full(overwrite) to full path
        saveFullDatasetToPath(pathInfo.getFull(), fullUserAggDataset);

        // get new updated
        Dataset<Row> newUserIdDataset = newUserAggDataset.select(Constant.APP_ID, Constant.USER_PSEUDO_ID);
        Column jonCondition = newUserIdDataset.col(Constant.APP_ID).equalTo(fullUserAggDataset.col(Constant.APP_ID))
                .and(newUserIdDataset.col(Constant.USER_PSEUDO_ID).equalTo(fullUserAggDataset.col(Constant.USER_PSEUDO_ID)));

        Dataset<Row> userDatasetFinal = newUserIdDataset.join(fullUserAggDataset, jonCondition, "left")
                .select(
                        newUserIdDataset.col(Constant.APP_ID),
                        newUserIdDataset.col(Constant.USER_PSEUDO_ID),
                        col(Constant.EVENT_TIMESTAMP),
                        col(Constant.USER_ID),
                        col(Constant.USER_PROPERTIES),
                        col(Constant.USER_PROPERTIES_JSON_STR),
                        col(Constant.FIRST_TOUCH_TIME_MSEC),
                        col(Constant.FIRST_VISIT_DATE),
                        col(Constant.FIRST_REFERRER),
                        col(Constant.FIRST_TRAFFIC_SOURCE),
                        col(Constant.FIRST_TRAFFIC_MEDIUM),
                        col(Constant.FIRST_TRAFFIC_CAMPAIGN),
                        col(Constant.FIRST_TRAFFIC_CONTENT),
                        col(Constant.FIRST_TRAFFIC_TERM),
                        col(Constant.FIRST_TRAFFIC_CAMPAIGN_ID),
                        col(Constant.FIRST_TRAFFIC_CLID_PLATFORM),
                        col(Constant.FIRST_TRAFFIC_CLID),
                        col(Constant.FIRST_TRAFFIC_CHANNEL_GROUP),
                        col(Constant.FIRST_TRAFFIC_CATEGORY),
                        col(Constant.FIRST_APP_INSTALL_SOURCE),
                        col(Constant.PROCESS_INFO),
                        lit(null).cast(DataTypes.StringType).alias(Constant.EVENT_NAME)
                );

        log.info("extractUser return userDatasetFinal count: {}", userDatasetFinal.count());

        return addProcessInfo(runMaxLengthTransformerForUserV2(userDatasetFinal));
    }

    @Override
    public  Dataset<Row> getCleanedDataset(final Dataset<Row> dataset) {
        Dataset<Row> cleanedDataset = this.cleaner.clean(dataset, DATA_SCHEMA_V2_FILE_PATH);
        cleanedDataset = cleanedDataset.drop(DATA)
                .withColumnRenamed(DATA_STR, DATA);

        log.info("getCleanedDataset() count: {}", dataset.count());
        return cleanedDataset;
    }

    @Override
    public TransformerNameEnum getName() {
        return CLICKSTREAM;
    }

}
