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

public class SourceCategoryAndTermsTest {

    @Test
    void shouldReturnCorrectSource() {
        SourceCategoryAndTerms item = new SourceCategoryAndTerms();
        item.setSource("source1");
        Assertions.assertEquals("source1", item.getSource());
        Assertions.assertTrue(item.toString().contains("source1"));
    }

    @Test
    void shouldReturnCorrectCategory() {
        SourceCategoryAndTerms item = new SourceCategoryAndTerms();
        item.setCategory("category1");
        Assertions.assertEquals("category1", item.getCategory());
    }

    @Test
    void shouldReturnCorrectTerms() {
        SourceCategoryAndTerms item = new SourceCategoryAndTerms();
        item.setTerms("terms1");
        Assertions.assertEquals("terms1", item.getTerms());
    }
}