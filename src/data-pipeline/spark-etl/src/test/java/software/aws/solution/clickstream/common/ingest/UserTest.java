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

package software.aws.solution.clickstream.common.ingest;

import com.fasterxml.jackson.core.*;
import com.fasterxml.jackson.databind.*;
import org.junit.jupiter.api.*;

public class UserTest {

    @Test
    void testUserDeSerFromJsonString() throws JsonProcessingException {

        // ./gradlew clean test --info --tests software.aws.solution.clickstream.common.ingest.UserTest.testUserDeSerFromJsonString

        // Arrange
        String jsonString = "{\"_user_id\":{\"value\":\"user1\",\"set_timestamp\":null},\"_user_last_name\":{\"value\":\"user last name\",\"set_timestamp\":null},\"_user_age\":{\"value\":30,\"set_timestamp\":null},\"_user_first_touch_timestamp\":{\"value\":1626825600000,\"set_timestamp\":null}}";
        // Act
        ObjectMapper objectMapper = new ObjectMapper();
        User user = objectMapper.readValue(jsonString, User.class);

        Assertions.assertEquals("user last name", user.getCustomProperties().get("_user_last_name").getValue());
        Assertions.assertEquals("user1", user.getUserId().getValue());
        Assertions.assertNull(user.getUserName());
        Assertions.assertEquals(30, user.getUserAge().getValue());
        Assertions.assertEquals(1626825600000L, user.getUserFirstTouchTimestamp().getValue());

    }

    @Test
    void testUserDeSerFromJsonString_custom_prop_non_map() throws JsonProcessingException {

        // ./gradlew clean test --info --tests software.aws.solution.clickstream.common.ingest.UserTest.testUserDeSerFromJsonString_custom_prop_non_map

        // Arrange
        String jsonString = "{\"_user_id\":{\"value\":\"user1\",\"set_timestamp\":null},\"_user_last_name\":\"user last name\",\"_user_age\":{\"value\":30,\"set_timestamp\":null},\"_user_first_touch_timestamp\":{\"value\":1626825600000,\"set_timestamp\":null}}";
        // Act
        ObjectMapper objectMapper = new ObjectMapper();
        User user = objectMapper.readValue(jsonString, User.class);

        Assertions.assertEquals("user last name", user.getCustomProperties().get("_user_last_name").getValue());
        Assertions.assertEquals("user1", user.getUserId().getValue());
        Assertions.assertNull(user.getUserName());
        Assertions.assertEquals(30, user.getUserAge().getValue());
        Assertions.assertEquals(1626825600000L, user.getUserFirstTouchTimestamp().getValue());

    }
}
