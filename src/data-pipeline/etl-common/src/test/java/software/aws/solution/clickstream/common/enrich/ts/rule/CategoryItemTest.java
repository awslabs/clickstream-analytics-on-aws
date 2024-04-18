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

public class CategoryItemTest {

    @Test
    void shouldReturnCorrectUrl() {
        CategoryItem categoryItem = new CategoryItem();
        categoryItem.setUrl("http://example.com");
        Assertions.assertEquals("http://example.com", categoryItem.getUrl());
    }

    @Test
    void shouldReturnCorrectSource() {
        CategoryItem categoryItem = new CategoryItem();
        categoryItem.setSource("Source1");
        Assertions.assertEquals("Source1", categoryItem.getSource());
    }

    @Test
    void shouldReturnCorrectCategory() {
        CategoryItem categoryItem = new CategoryItem();
        categoryItem.setCategory("Category1");
        Assertions.assertEquals("Category1", categoryItem.getCategory());
    }

    @Test
    void shouldReturnCorrectParams() {
        CategoryItem categoryItem = new CategoryItem();
        categoryItem.setParams(Arrays.asList("param1", "param2"));
        Assertions.assertEquals(Arrays.asList("param1", "param2"), categoryItem.getParams());
    }
}