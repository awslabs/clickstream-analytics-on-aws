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

package software.aws.solution.clickstream.common.enrich.ts.rule;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;

import java.util.Arrays;

public class ChannelRuleConditionItemTest {

    @Test
    void shouldReturnCorrectField() {
        ChannelRuleConditionItem item = new ChannelRuleConditionItem();
        item.setField("field1");
        Assertions.assertEquals("field1", item.getField());
        Assertions.assertTrue(item.toString().contains("field1"));
    }

    @Test
    void shouldReturnCorrectOp() {
        ChannelRuleConditionItem item = new ChannelRuleConditionItem();
        item.setOp("op1");
        Assertions.assertEquals("op1", item.getOp());
    }

    @Test
    void shouldReturnCorrectValue() {
        ChannelRuleConditionItem item = new ChannelRuleConditionItem();
        item.setValue("value1");
        Assertions.assertEquals("value1", item.getValue());
    }

    @Test
    void shouldReturnCorrectValues() {
        ChannelRuleConditionItem item = new ChannelRuleConditionItem();
        item.setValues(Arrays.asList("value1", "value2"));
        Assertions.assertEquals(Arrays.asList("value1", "value2"), item.getValues());
    }

    @Test
    void shouldReturnCorrectOpAndList() {
        ChannelRuleConditionItem item1 = new ChannelRuleConditionItem();
        item1.setField("field1");

        ChannelRuleConditionItem item = new ChannelRuleConditionItem();
        item.setOpAndList(Arrays.asList(item1));
        Assertions.assertEquals(Arrays.asList(item1), item.getOpAndList());
    }

    @Test
    void shouldReturnCorrectOpOrList() {
        ChannelRuleConditionItem item1 = new ChannelRuleConditionItem();
        item1.setField("field1");

        ChannelRuleConditionItem item = new ChannelRuleConditionItem();
        item.setOpOrList(Arrays.asList(item1));
        Assertions.assertEquals(Arrays.asList(item1), item.getOpOrList());
    }
}
