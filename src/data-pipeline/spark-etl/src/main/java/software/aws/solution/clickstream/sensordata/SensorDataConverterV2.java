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

package software.aws.solution.clickstream.sensordata;

import lombok.extern.slf4j.Slf4j;
import software.aws.solution.clickstream.common.RuleConfig;
import software.aws.solution.clickstream.transformer.AppRuleConfigurable;
import software.aws.solution.clickstream.transformer.BaseDataConverter;
import software.aws.solution.clickstream.transformer.DatasetTransformer;
import software.aws.solution.clickstream.transformer.EventParserFactory;

import java.util.Map;

@Slf4j
public class SensorDataConverterV2 extends BaseDataConverter implements DatasetTransformer, AppRuleConfigurable {
    private final Map<String, RuleConfig> appRuleConfig;

    public SensorDataConverterV2(final Map<String, RuleConfig> appRuleConfig) {
        this.appRuleConfig = appRuleConfig;
    }

    @Override
    public String getName() {
        return EventParserFactory.SENSOR_DATA;
    }

    @Override
    public Map<String, RuleConfig> getAppRuleConfig() {
        return this.appRuleConfig;
    }
}
