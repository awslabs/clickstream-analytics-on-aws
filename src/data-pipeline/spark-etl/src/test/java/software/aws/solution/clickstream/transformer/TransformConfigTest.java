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
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.HashMap;
import software.aws.solution.clickstream.common.RuleConfig;

public class TransformConfigTest {

    @Test
    public void shouldInitializeEmptyAppRuleConfig() {
        TransformConfig transformConfig = new TransformConfig();
        assertNull(transformConfig.getAppRuleConfig());
    }

    @Test
    public void shouldSetAndGetAppRuleConfig() {
        TransformConfig transformConfig = new TransformConfig();
        HashMap<String, RuleConfig> ruleConfigMap = new HashMap<>();
        RuleConfig ruleConfig = new RuleConfig();
        ruleConfigMap.put("testRule", ruleConfig);

        transformConfig.setAppRuleConfig(ruleConfigMap);

        assertNotNull(transformConfig.getAppRuleConfig());
        assertEquals(ruleConfig, transformConfig.getAppRuleConfig().get("testRule"));
        assertTrue(transformConfig.toString().contains("testRule"));
    }

    @Test
    public void shouldReturnNullForNonExistentRule() {
        TransformConfig transformConfig = new TransformConfig();
        HashMap<String, RuleConfig> ruleConfigMap = new HashMap<>();
        RuleConfig ruleConfig = new RuleConfig();
        ruleConfigMap.put("testRule", ruleConfig);

        transformConfig.setAppRuleConfig(ruleConfigMap);

        assertNull(transformConfig.getAppRuleConfig().get("nonExistentRule"));
    }
}