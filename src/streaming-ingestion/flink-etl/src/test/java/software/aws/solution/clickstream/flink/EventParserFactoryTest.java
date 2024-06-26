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

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import software.aws.solution.clickstream.common.ClickstreamEventParser;
import software.aws.solution.clickstream.common.EventParser;
import software.aws.solution.clickstream.common.TransformConfig;
import software.aws.solution.clickstream.common.gtm.GTMEventParser;
import software.aws.solution.clickstream.common.sensors.SensorsEventParser;

import static org.junit.jupiter.api.Assertions.assertInstanceOf;
import static org.junit.jupiter.api.Assertions.assertThrows;

public class EventParserFactoryTest {

    @Mock
    private TransformConfig transformConfig;

    @BeforeEach
    public void setup() {
        MockitoAnnotations.openMocks(this);
    }

    @Test
    public void returnsSensorsEventParserWhenTransformNameIsSensors() {
        EventParser parser = EventParserFactory.newEventParser(transformConfig, "sensors");
        assertInstanceOf(SensorsEventParser.class, parser);
    }

    @Test
    public void returnsClickstreamEventParser() {
        EventParser parser = EventParserFactory.newEventParser(transformConfig, "clickstream");
        assertInstanceOf(ClickstreamEventParser.class, parser);
    }

    @Test
    public void returnsGtmEventParser() {
        EventParser parser = EventParserFactory.newEventParser(transformConfig, "gtm");
        assertInstanceOf(GTMEventParser.class, parser);
    }

    @Test
    public void throwsExceptionWhenTransformNameIsUnknown() {
        assertThrows(IllegalArgumentException.class, () -> EventParserFactory.newEventParser(transformConfig, "unknown"));
    }
}