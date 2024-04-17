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

import com.fasterxml.jackson.core.JsonProcessingException;
import software.aws.solution.clickstream.common.EventParser;
import software.aws.solution.clickstream.common.ExtraParams;
import software.aws.solution.clickstream.common.ParseDataResult;
import software.aws.solution.clickstream.common.ParseRowResult;
import software.aws.solution.clickstream.common.RuleConfig;

import java.util.Map;

public class FakeSensorEventParser implements EventParser {

    @Override
    public ParseRowResult parseLineToDBRow(final String s, final String s1, final String s2) throws JsonProcessingException {
        return null;
    }

    @Override
    public ParseDataResult parseData(final String s, final ExtraParams extraParams, final int i) throws JsonProcessingException {
        return null;
    }

    public static FakeSensorEventParser getInstance(final Map<String, RuleConfig> appRuleConfig) {
        return new FakeSensorEventParser();
    }
}
