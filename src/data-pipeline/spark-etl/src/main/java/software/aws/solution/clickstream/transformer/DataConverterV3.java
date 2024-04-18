/**
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * <p>
 * Licensed under the Apache License, Version 2.0 (the "License"). You may not use this file except in compliance
 * with the License. A copy of the License is located at
 * <p>
 * http://www.apache.org/licenses/LICENSE-2.0
 * <p>
 * or in the 'license' file accompanying this file. This file is distributed on an 'AS IS' BASIS, WITHOUT WARRANTIES
 * OR CONDITIONS OF ANY KIND, express or implied. See the License for the specific language governing permissions
 * and limitations under the License.
 */

package software.aws.solution.clickstream.transformer;

import lombok.extern.slf4j.Slf4j;
import software.aws.solution.clickstream.common.RuleConfig;

import java.util.Map;


@Slf4j
public class DataConverterV3 extends BaseDataConverter {
    private final Map<String, RuleConfig> appRuleConfig;

    public DataConverterV3(final Map<String, RuleConfig> appRuleConfig) {
        this.appRuleConfig = appRuleConfig;
    }

    @Override
    public String getName() {
        return EventParserFactory.CLICKSTREAM;
    }

    @Override
    public Map<String, RuleConfig> getAppRuleConfig() {
        return this.appRuleConfig;
    }

}
