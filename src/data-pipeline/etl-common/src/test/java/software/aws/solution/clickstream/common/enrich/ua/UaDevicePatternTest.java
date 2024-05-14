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

package software.aws.solution.clickstream.common.enrich.ua;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import software.aws.solution.clickstream.BaseTest;

import java.util.regex.Pattern;
import static org.junit.jupiter.api.Assertions.*;

class UaDevicePatternTest extends BaseTest {
    private UaDevicePattern uaDevicePattern;

    @BeforeEach
    void setUp() {
        uaDevicePattern = new UaDevicePattern(
                // "Android Application[^\\-]{0,300} - (Sony) ?(Ericsson|) (.{1,200}) \\w{1,20} -"
                Pattern.compile("Android Application[^\\-]{0,300} - (Sony) ?(Ericsson|) (.{1,200}) \\w{1,20} -"),
                "$1 $2",
                "$1$2",
                "$3");
    }

    @Test
    void shouldReturnUaDeviceWhenMatchFound() {
        // ./gradlew clean test --info --tests software.aws.solution.clickstream.common.enrich.ua.UaDevicePatternTest.shouldReturnUaDeviceWhenMatchFound
        UaDevice result = uaDevicePattern.match("Android Application - Sony Ericsson Xperia Z1 Compact D5503 -");
        assertEquals("Sony Ericsson", result.getFamily());
        assertEquals("SonyEricsson", result.getBrand());
        assertEquals("Xperia Z1 Compact", result.getModel());
    }

    @Test
    void shouldReturnNullWhenNoMatchFound() {
        uaDevicePattern = new UaDevicePattern(Pattern.compile("(abc)"), "device", "brand", "model");
        UaDevice result = uaDevicePattern.match("test");
        assertNull(result);
    }

    @Test
    void shouldReturnUaDeviceWithOtherWhenNoGroupMatchFound() {
        uaDevicePattern = new UaDevicePattern(Pattern.compile("(.*)"), null, null, null);
        UaDevice result = uaDevicePattern.match("test");
        assertEquals("Other", result.getFamily());
        assertNull(result.getBrand());
        assertNull(result.getModel());
    }

    @Test
    void shouldReturnUaDeviceWithGroupMatchWhenNoReplacementProvided() {
        uaDevicePattern = new UaDevicePattern(Pattern.compile("(.*)"), "test device $1", null, null);
        UaDevice result = uaDevicePattern.match("testMe");
        assertEquals("test device testMe", result.getFamily());
        assertNull(result.getBrand());
        assertNull(result.getModel());
    }
}