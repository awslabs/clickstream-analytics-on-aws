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

package software.aws.solution.clickstream.flink;

import software.aws.solution.clickstream.common.ClickstreamEventParser;
import software.aws.solution.clickstream.common.EventParser;
import software.aws.solution.clickstream.common.TransformConfig;
import software.aws.solution.clickstream.common.gtm.GTMEventParser;
import software.aws.solution.clickstream.common.sensors.SensorsEventParser;

public class EventParserFactory {
    public static EventParser newEventParser(final TransformConfig transformConfig, final String transformName) {
        if (transformName.equalsIgnoreCase("clickstream")) {
            return ClickstreamEventParser.getInstance(transformConfig, true);
        } else if (transformName.equalsIgnoreCase("gtm")) {
            return GTMEventParser.getInstance(transformConfig, true);
        } else if (transformName.equalsIgnoreCase("sensors")) {
            return SensorsEventParser.getInstance(transformConfig, true);
        } else {
            throw new IllegalArgumentException("Unknown transform name: " + transformName);
        }
    }
}
