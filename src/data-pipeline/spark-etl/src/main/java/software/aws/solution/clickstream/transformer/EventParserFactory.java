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

package software.aws.solution.clickstream.transformer;

import software.aws.solution.clickstream.common.ClickstreamEventParser;
import software.aws.solution.clickstream.common.EventParser;
import software.aws.solution.clickstream.common.RuleConfig;
import software.aws.solution.clickstream.common.gtm.GTMEventParser;
import software.aws.solution.clickstream.sensordata.FakeSensorEventParser;

import java.util.Map;

public class EventParserFactory {

    public static final String GTM_SERVER_DATA = "gtm_server_data";
    public static final String SENSOR_DATA = "sensor_data";
    public static final String CLICKSTREAM = "clickstream";

    public static EventParser getEventParser(final String parserName, final Map<String, RuleConfig> appRuleConfig) {
        switch (parserName) {
            case GTM_SERVER_DATA:
                return GTMEventParser.getInstance(appRuleConfig);
            case SENSOR_DATA:
                return FakeSensorEventParser.getInstance(appRuleConfig);
            case CLICKSTREAM:
                return ClickstreamEventParser.getInstance(appRuleConfig);
            default:
                throw new IllegalArgumentException("Unknown parser name: " + parserName);
        }
    }
}
