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

package software.aws.solution.clickstream.util;

public enum TableName {
    ODS_EVENTS("ods_events"),
    ITEM("item"),
    USER("user"),
    EVENT("event"),
    EVEN_PARAMETER("event_parameter"),
    ITEM_V2("item_v2"),
    USER_V2("user_v2"),
    EVENT_V2("event_v2"),
    SESSION("session");
    private final String name;

    TableName(final String name) {
        this.name = name;
    }

    public String getTableName() {
        return this.name;
    }
}
