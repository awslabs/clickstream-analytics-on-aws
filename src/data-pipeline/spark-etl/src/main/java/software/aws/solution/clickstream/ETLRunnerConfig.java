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

import javax.validation.constraints.NotEmpty;
import javax.validation.constraints.NotNull;
import java.util.*;


public class ETLRunnerConfig {
    @NotEmpty
    private final boolean saveInfoToWarehouse;
    @NotEmpty
    private final String database;
    @NotEmpty
    private final String sourceTable;
    @NotEmpty
    private final String sourcePath;
    @NotEmpty
    private final String jobDataDir;
    @NotEmpty
    private final List<String> transformerClassNames;
    @NotEmpty
    private final String outputPath;
    @NotEmpty
    private final String projectId;
    @NotEmpty
    private final String validAppIds;
    @NotNull
    private final String outPutFormat;
    @NotNull
    private final Long startTimestamp;
    @NotNull
    private final Long endTimestamp;
    @NotNull
    private final Long dataFreshnessInHour;
    @NotNull
    private final int outPartitions;
    @NotNull
    private final int rePartitions;

    public ETLRunnerConfig(@NotEmpty final String saveInfoToWarehouse,
                           @NotEmpty final String database,
                           @NotEmpty final String sourceTable,
                           @NotEmpty final String sourcePath,
                           @NotEmpty final String jobDataUri,
                           @NotEmpty final List<String> transformerClassNames,
                           @NotEmpty final String outputPath,
                           @NotEmpty final String projectId,
                           @NotEmpty final String validAppIds,
                           @NotNull final String outPutFormat,
                           @NotNull final Long startTimestamp,
                           @NotNull final Long endTimestamp,
                           @NotNull final Long dataFreshnessInHour,
                           @NotNull final int outPartitions,
                           @NotNull final int rePartitions) {
        this.saveInfoToWarehouse = Boolean.valueOf(saveInfoToWarehouse);
        this.database = database;
        this.sourceTable = sourceTable;
        this.jobDataDir = jobDataUri;
        this.transformerClassNames = transformerClassNames;
        this.outputPath = outputPath;
        this.projectId = projectId;
        this.validAppIds = validAppIds;
        this.outPutFormat = outPutFormat;
        this.startTimestamp = startTimestamp;
        this.endTimestamp = endTimestamp;
        this.dataFreshnessInHour = dataFreshnessInHour;
        this.outPartitions = outPartitions;
        this.rePartitions = rePartitions;
        this.sourcePath = sourcePath;
    }

    public boolean isSaveInfoToWarehouse() {
        return saveInfoToWarehouse;
    }

    public String getDatabase() {
        return database;
    }

    public String getSourceTable() {
        return sourceTable;
    }

    public String getSourcePath() {
        return sourcePath;
    }

    public String getJobDataDir() {
        return jobDataDir;
    }

    public List<String> getTransformerClassNames() {
        return transformerClassNames;
    }

    public String getOutputPath() {
        return outputPath;
    }

    public String getProjectId() {
        return projectId;
    }

    public String getValidAppIds() {
        return validAppIds;
    }

    public String getOutPutFormat() {
        return outPutFormat;
    }

    public Long getStartTimestamp() {
        return startTimestamp;
    }

    public Long getEndTimestamp() {
        return endTimestamp;
    }

    public Long getDataFreshnessInHour() {
        return dataFreshnessInHour;
    }

    public int getOutPartitions() {
        return outPartitions;
    }

    public int getRePartitions() {
        return rePartitions;
    }
}



