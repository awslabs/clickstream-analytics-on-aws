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

import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static software.aws.solution.clickstream.transformer.TransformerNameEnum.CLICKSTREAM;
import static software.aws.solution.clickstream.transformer.TransformerNameEnum.GTM_SERVER_DATA;
import static software.aws.solution.clickstream.transformer.TransformerNameEnum.SENSORS_DATA;

import software.aws.solution.clickstream.common.ClickstreamEventParser;
import software.aws.solution.clickstream.common.EventParser;
import software.aws.solution.clickstream.common.TransformConfig;
import software.aws.solution.clickstream.common.gtm.GTMEventParser;
import software.aws.solution.clickstream.common.sensors.SensorsEventParser;
import software.aws.solution.clickstream.udfconverter.EventParserFactory;

import java.util.HashMap;

public class EventParserFactoryTest {

    @Test
    public void shouldReturnGTMEventParser() {
        TransformConfig transformConfig = new TransformConfig();

        EventParser parser = EventParserFactory.getEventParser(GTM_SERVER_DATA, transformConfig);
        assertTrue(parser instanceof GTMEventParser);
    }

    @Test
    public void shouldReturnFakeSensorEventParser() {
        TransformConfig transformConfig = new TransformConfig();
        EventParser parser = EventParserFactory.getEventParser(SENSORS_DATA, transformConfig);
        assertTrue(parser instanceof SensorsEventParser);
    }

    @Test
    public void shouldReturnClickstreamEventParser() {
        EventParser parser = EventParserFactory.getEventParser(CLICKSTREAM, null);
        assertTrue(parser instanceof ClickstreamEventParser);
    }
}