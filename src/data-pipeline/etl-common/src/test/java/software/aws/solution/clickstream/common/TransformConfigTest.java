package software.aws.solution.clickstream.common;

import org.junit.jupiter.api.Test;

import java.util.HashMap;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

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
        transformConfig.setTrafficSourceEnrichmentDisabled(true);

        assertNotNull(transformConfig.getAppRuleConfig());
        assertEquals(ruleConfig, transformConfig.getAppRuleConfig().get("testRule"));
        assertTrue(transformConfig.isTrafficSourceEnrichmentDisabled());
    }

    @Test
    public void shouldReturnNullForNonExistentRule() {
        TransformConfig transformConfig = new TransformConfig();
        HashMap<String, RuleConfig> ruleConfigMap = new HashMap<>();
        RuleConfig ruleConfig = new RuleConfig();
        ruleConfigMap.put("testRule", ruleConfig);

        transformConfig.setAppRuleConfig(ruleConfigMap);

        assertNull(transformConfig.getAppRuleConfig().get("nonExistentRule"));
        assertFalse(transformConfig.isTrafficSourceEnrichmentDisabled());
    }
}
