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

import lombok.Getter;
import lombok.extern.slf4j.Slf4j;
import software.aws.solution.clickstream.common.Constant;

import java.util.List;

@Slf4j
public final class ChannelRuleEvaluator {
    public static final String EMPTY_VALUE_FLAG = "__empty__";

    @Getter
    private static ChannelRuleEvaluator instance = new ChannelRuleEvaluator();

    private ChannelRuleEvaluator() {
    }

    public boolean evaluate(final ChannelRule channelRule, final ChannelRuleEvaluatorInput channelRuleEvaluatorInput) {

        List<ChannelRuleConditionItem> andList = channelRule.getCondition().getOpAndList();

        List<ChannelRuleConditionItem> orList = channelRule.getCondition().getOpOrList();

        if (andList == null && orList == null) {
            log.error("Channel rule condition is empty");
            throw new IllegalArgumentException("Channel rule condition is empty");
        }

        if (andList != null && orList != null) {
            log.error("Channel rule condition has both AND and OR conditions");
            throw new IllegalArgumentException("Channel rule condition has both AND and OR conditions");
        }

        if (andList != null) {
            return evaluateAndList(channelRuleEvaluatorInput, andList);
        }

        return evaluateOrList(channelRuleEvaluatorInput, orList);

    }

    private boolean evaluateOrList(final ChannelRuleEvaluatorInput channelRuleEvaluatorInput, final List<ChannelRuleConditionItem> orList) {
        for (ChannelRuleConditionItem item : orList) {
            if (evaluateConditionItem(item, channelRuleEvaluatorInput)) {
                log.debug("evaluateOrList rule matched: {}", item);
                return true;
            }
        }
        log.debug("evaluateOrList rule not matched");
        return false;
    }

    private boolean evaluateAndList(final ChannelRuleEvaluatorInput channelRuleEvaluatorInput, final List<ChannelRuleConditionItem> andList) {
        for (ChannelRuleConditionItem item : andList) {
            if (!evaluateConditionItem(item, channelRuleEvaluatorInput)) {
                log.debug("evaluateAndList rule not matched: {}", item);
                return false;
            }
        }
        log.debug("evaluateAndList rule matched");
        return true;
    }

    private boolean evaluateConditionItem(final ChannelRuleConditionItem item, final ChannelRuleEvaluatorInput channelRuleEvaluatorInput) {

        if (item.getField() == null && item.getOpAndList() == null && item.getOpOrList() == null) {
            throw new IllegalArgumentException("Channel rule condition item is empty");
        }

        if (item.getField() != null && item.getOpAndList() != null) {
            throw new IllegalArgumentException("Channel rule condition item has both field and AND conditions");
        }

        if (item.getField() != null && item.getOpOrList() != null) {
            throw new IllegalArgumentException("Channel rule condition item has both field and OR conditions");
        }

        if (item.getOpAndList() != null && item.getOpOrList() != null) {
            throw new IllegalArgumentException("Channel rule condition item has both AND and OR conditions");
        }

        if (item.getField() != null) {
            return evaluateConditionItemField(item, channelRuleEvaluatorInput);
        }

        if (item.getOpAndList() != null) {
            return evaluateAndList(channelRuleEvaluatorInput, item.getOpAndList());
        }

        return evaluateOrList(channelRuleEvaluatorInput, item.getOpOrList());

    }

    private boolean evaluateConditionItemField(final ChannelRuleConditionItem item, final ChannelRuleEvaluatorInput channelRuleEvaluatorInput) {
        String field = item.getField();
        String op = item.getOp();
        String value = item.getValue();
        List<String> values = item.getValues();

        validateInput(field, op, value, values);

        String actualValue = null;

        if (field.equals(Constant.TRAFFIC_SOURCE_CATEGORY)) {
            actualValue = channelRuleEvaluatorInput.getTrafficSourceCategory();
        } else if (field.equals(Constant.TRAFFIC_SOURCE_SOURCE)) {
            actualValue = channelRuleEvaluatorInput.getTrafficSourceSource();
        } else if (field.equals(Constant.TRAFFIC_SOURCE_MEDIUM)) {
            actualValue = channelRuleEvaluatorInput.getTrafficSourceMedium();
        } else if (field.equals(Constant.TRAFFIC_SOURCE_CAMPAIGN)) {
            actualValue = channelRuleEvaluatorInput.getTrafficSourceCampaign();
        } else if (field.equals(Constant.TRAFFIC_SOURCE_CAMPAIGN_ID)) {
            actualValue = channelRuleEvaluatorInput.getTrafficSourceCampaignId();
        } else if (field.equals(Constant.TRAFFIC_SOURCE_CONTENT)) {
            actualValue = channelRuleEvaluatorInput.getTrafficSourceContent();
        } else if (field.equals(Constant.TRAFFIC_SOURCE_TERM)) {
            actualValue = channelRuleEvaluatorInput.getTrafficSourceTerm();
        } else if (field.equals(Constant.TRAFFIC_SOURCE_CLID)) {
            actualValue = channelRuleEvaluatorInput.getTrafficSourceClid();
        } else if (field.equals(Constant.TRAFFIC_SOURCE_CLID_PLATFORM)) {
            actualValue = channelRuleEvaluatorInput.getTrafficSourceClidPlatform();
        } else if (field.equals(Constant.PAGE_VIEW_LATEST_REFERRER)) {
            actualValue = channelRuleEvaluatorInput.getPageViewLatestReferrer();
        } else if (field.equals(Constant.PAGE_VIEW_LATEST_REFERRER_HOST)) {
            actualValue = channelRuleEvaluatorInput.getPageViewLatestReferrerHost();
        } else {
            throw new IllegalArgumentException("Config Error::Channel rule condition item field has unknown field: " + field + ", config detail: " + item);
        }

        if ((op.equals(OpEnum.IN.getOp()) || op.equals(OpEnum.NOT_IN.getOp()))) {
            return compareIn(actualValue, op, values);
        } else {
            return compare(actualValue, op, value);
        }

    }

    private void validateInput(final String field, final String op, final String value, final List<String> values) {
        if (field == null || op == null) {
            throw new IllegalArgumentException("Channel rule condition item field has no field or operator");
        }

        if (!(op.equals(OpEnum.IN.getOp()) || op.equals(OpEnum.NOT_IN.getOp())) && value == null) {
            throw new IllegalArgumentException("Channel rule condition item field has no value, operator " + op);
        }

        if ((op.equals(OpEnum.IN.getOp()) || op.equals(OpEnum.NOT_IN.getOp())) && (values == null || values.isEmpty())) {
            throw new IllegalArgumentException("Channel rule condition item field has IN operator but no values");
        }
    }

    private boolean compare(final String actualValueInput, final String op, final String valueInput) {
        String actualValue = actualValueInput;
        String value = valueInput;

        if (actualValue == null) {
            actualValue = "";
        }
        if (value.equals(EMPTY_VALUE_FLAG)) {
            value = "";
        }
        if (op.equals(OpEnum.EQ.getOp())) {
            return actualValue.equals(value);
        } else if (op.equals(OpEnum.NOT_EQ.getOp())) {
            return !actualValue.equals(value);
        } else if (op.equals(OpEnum.CONTAIN.getOp())) {
            return actualValue.contains(value);
        } else if (op.equals(OpEnum.NOT_CONTAIN.getOp())) {
            return !actualValue.contains(value);
        } else if (op.equals(OpEnum.START_WITH.getOp())) {
            return actualValue.startsWith(value);
        } else if (op.equals(OpEnum.NOT_START_WITH.getOp())) {
            return !actualValue.startsWith(value);
        } else if (op.equals(OpEnum.END_WITH.getOp())) {
            return actualValue.endsWith(value);
        } else if (op.equals(OpEnum.NOT_END_WITH.getOp())) {
            return !actualValue.endsWith(value);
        } else if (op.equals(OpEnum.MATCH.getOp())) {
            return compareMatch(actualValue, value);
        } else if (op.equals(OpEnum.NOT_MATCH.getOp())) {
            return !compareMatch(actualValue, value);
        }
        throw new IllegalArgumentException("Channel rule condition item field has unknown operator " + op);
    }

    private boolean compareIn(final String expectedValue, final String op, final List<String> values) {
        if (op.equals(OpEnum.IN.getOp())) {
            return values.contains(expectedValue);
        } else if (op.equals(OpEnum.NOT_IN.getOp())) {
            return !values.contains(expectedValue);
        }
        return false;
    }

    private boolean compareMatch(final String actualValue, final String regex) {
        return actualValue.matches(regex);
    }
}
