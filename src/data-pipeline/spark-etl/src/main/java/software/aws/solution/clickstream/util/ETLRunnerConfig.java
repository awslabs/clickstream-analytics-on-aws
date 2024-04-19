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


package software.aws.solution.clickstream.util;

import lombok.AllArgsConstructor;
import lombok.Getter;

import javax.validation.constraints.NotEmpty;
import javax.validation.constraints.NotNull;
import java.util.List;


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

    @NotNull
    private final int userKeepDays;

    @NotNull
    private final int itemKeepDays;

    private final String configRuleDir;

    public ETLRunnerConfig(
            @NotNull final TransformationConfig transformationConfig,
            @NotNull final InputOutputConfig inputOutputConfig,
            @NotNull final TimestampConfig timestampConfig,
            @NotNull final PartitionConfig partitionConfig
    ) {
        this.saveInfoToWarehouse = Boolean.valueOf(inputOutputConfig.getSaveInfoToWarehouse());
        this.database = inputOutputConfig.getDatabase();
        this.sourceTable = inputOutputConfig.getSourceTable();
        this.jobDataDir = inputOutputConfig.getJobDataUri();
        this.transformerClassNames = transformationConfig.getTransformerClassNames();
        this.outputPath = inputOutputConfig.getOutputPath();
        this.projectId = transformationConfig.getProjectId();
        this.validAppIds = transformationConfig.getValidAppIds();
        this.outPutFormat = inputOutputConfig.getOutPutFormat();
        this.startTimestamp = timestampConfig.getStartTimestamp();
        this.endTimestamp = timestampConfig.getEndTimestamp();
        this.dataFreshnessInHour = transformationConfig.getDataFreshnessInHour();
        this.outPartitions = partitionConfig.getOutPartitions();
        this.rePartitions = partitionConfig.getRePartitions();
        this.sourcePath = inputOutputConfig.getSourcePath();
        this.userKeepDays = transformationConfig.getUserKeepDays();
        this.itemKeepDays = transformationConfig.getItemKeepDays();
        this.configRuleDir = transformationConfig.getConfigRuleDir();
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

    public int getUserKeepDays() {
        return userKeepDays;
    }

    public int getItemKeepDays() {
        return itemKeepDays;
    }

    public String getConfigRuleDir() {
        return configRuleDir;
    }

    @AllArgsConstructor
    @Getter
    public static class PartitionConfig {
        @NotNull
        private final int outPartitions;
        @NotNull
        private final int rePartitions;
    }

    @AllArgsConstructor
    @Getter
    public static class TimestampConfig {
        @NotNull
        private final long startTimestamp;
        @NotNull
        private final long endTimestamp;
    }

    @AllArgsConstructor
    @Getter
    public static class InputOutputConfig {
        @NotNull
        private final String saveInfoToWarehouse;
        @NotNull
        private final String database;
        @NotNull
        private final String sourceTable;
        @NotNull
        private final String sourcePath;
        @NotNull
        private final String jobDataUri;
        @NotNull
        private final String outputPath;
        @NotNull
        private final String outPutFormat;
    }

    @AllArgsConstructor
    @Getter
    public static class TransformationConfig {
        @NotEmpty
        final List<String> transformerClassNames;
        @NotEmpty
        final String projectId;
        @NotEmpty
        final String validAppIds;
        @NotNull
        final Long dataFreshnessInHour;
        @NotNull
        final Integer userKeepDays;
        @NotNull
        final Integer itemKeepDays;
        @NotNull
        final String configRuleDir;
    }
}



