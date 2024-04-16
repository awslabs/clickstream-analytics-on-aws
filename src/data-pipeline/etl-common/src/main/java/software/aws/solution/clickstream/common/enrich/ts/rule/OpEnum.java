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

@Getter
public enum OpEnum {
    IN("in"),
    EQ("eq"),
    CONTAIN("contain"),
    START_WITH("start_with"),
    MATCH("match"),
    END_WITH("end_with"),

    // NOT
    NOT_IN("not_in"),
    NOT_EQ("not_eq"),
    NOT_CONTAIN("not_contain"),
    NOT_START_WITH("not_start_with"),
    NOT_MATCH("not_match"),
    NOT_END_WITH("not_end_with")
    ;

    private String op;
    OpEnum(final String op) {
        this.op = op;
    }
}
