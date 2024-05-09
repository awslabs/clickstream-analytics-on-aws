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

package software.aws.solution.clickstream.udfconverter;

import software.aws.solution.clickstream.common.ClickstreamEventParser;
import software.aws.solution.clickstream.common.EventParser;
import software.aws.solution.clickstream.common.gtm.GTMEventParser;
import software.aws.solution.clickstream.exception.ExecuteTransformerException;
import software.aws.solution.clickstream.common.sensors.SensorsEventParser;
import software.aws.solution.clickstream.transformer.TransformerNameEnum;
import software.aws.solution.clickstream.common.TransformConfig;

public final class EventParserFactory {
    private EventParserFactory() {
    }

    public static EventParser getEventParser(final TransformerNameEnum parserName, final TransformConfig transformConfig) {
        switch (parserName) {
            case GTM_SERVER_DATA:
                return GTMEventParser.getInstance(transformConfig);
            case SENSORS_DATA:
                return SensorsEventParser.getInstance(transformConfig);
            case CLICKSTREAM:
                return ClickstreamEventParser.getInstance(transformConfig);
            default:
                throw new ExecuteTransformerException("Unknown parser name: " + parserName);
        }

    }
}
