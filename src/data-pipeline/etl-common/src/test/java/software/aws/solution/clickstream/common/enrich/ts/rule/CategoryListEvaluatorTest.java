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
import software.aws.solution.clickstream.BaseTest;
import software.aws.solution.clickstream.common.Util;

import java.io.FileNotFoundException;
import java.io.IOException;

public class CategoryListEvaluatorTest extends BaseTest {

    @Test
    void shouldReturnCategoryBySource() throws IOException {
        //  ./gradlew clean test --info --tests software.aws.solution.clickstream.common.enrich.ts.rule.CategoryListEvaluatorTest.shouldReturnCategoryBySource

        CategoryListEvaluator categoryListEvaluator = CategoryListEvaluator.fromJsonFile("ts/traffic_source_category_rule_test.json");
        String category = categoryListEvaluator.getCategoryBySource("wechat search");
        Assertions.assertEquals("Social", category);
    }


    @Test
    void shouldReturnCategoryAndTermsForFullUrl1() throws IOException {
        //  ./gradlew clean test --info --tests software.aws.solution.clickstream.common.enrich.ts.rule.CategoryListEvaluatorTest.shouldReturnCategoryAndTermsForFullUrl1

        CategoryListEvaluator categoryListEvaluator = CategoryListEvaluator.fromJsonFile("ts/traffic_source_category_rule_test.json");

        // Call getCategoryAndTerms
        SourceCategoryAndTerms result = categoryListEvaluator.evaluate("http://search.comcast.net?q=hello&query=world");

        // Assert the results
        Assertions.assertEquals("Search", result.getCategory());
        Assertions.assertEquals("hello,world", result.getTerms());
        Assertions.assertEquals("Comcast", result.getSource());
    }

    @Test
    void shouldReturnCategoryAndTermsForFullUrl2() throws IOException {
        //  ./gradlew clean test --info --tests software.aws.solution.clickstream.common.enrich.ts.rule.CategoryListEvaluatorTest.shouldReturnCategoryAndTermsForFullUrl1
        CategoryListEvaluator categoryListEvaluator = CategoryListEvaluator.fromJsonFile("ts/traffic_source_category_rule_test.json");

        // Call getCategoryAndTerms
        SourceCategoryAndTerms result = categoryListEvaluator.evaluate("http://search.comcast.net/searchme?q=hello&query=world");

        // Assert the results
        Assertions.assertEquals("Search", result.getCategory());
        Assertions.assertEquals("hello,world", result.getTerms());
        Assertions.assertEquals("Comcast", result.getSource());
    }

    @Test
    void shouldReturnCategoryAndTermsForFullUrl3() throws IOException {
        //  ./gradlew clean test --info --tests software.aws.solution.clickstream.common.enrich.ts.rule.CategoryListEvaluatorTest.shouldReturnCategoryAndTermsForFullUrl3
        CategoryListEvaluator categoryListEvaluator = CategoryListEvaluator.fromJsonFile("ts/traffic_source_category_rule_test.json");

        // Call getCategoryAndTerms
        SourceCategoryAndTerms result = categoryListEvaluator.evaluate("http://wechat.com/search?q=hello&query=world");

        // Assert the results
        Assertions.assertEquals("Social", result.getCategory());
        Assertions.assertNull(result.getTerms());
        Assertions.assertEquals("wechat search", result.getSource());
    }


    @Test
    void shouldReturnCategoryAndTermsForFullUrl4() throws IOException {
        //  ./gradlew clean test --info --tests software.aws.solution.clickstream.common.enrich.ts.rule.CategoryListEvaluatorTest.shouldReturnCategoryAndTermsForFullUrl4
        CategoryListEvaluator categoryListEvaluator = CategoryListEvaluator.fromJsonFile("ts/traffic_source_category_rule_test.json");

        // Call getCategoryAndTerms
        SourceCategoryAndTerms result = categoryListEvaluator.evaluate("http://wechat.com?q=hello&query=world");

        // Assert the results
        Assertions.assertEquals(CategoryListEvaluator.UNASSIGNED, result.getCategory());
        Assertions.assertNull(result.getTerms());
        Assertions.assertEquals("wechat.com", result.getSource());
    }

    @Test
    void shouldReturnCategoryAndTermsForFullUrl5() throws IOException {
        //  ./gradlew clean test --info --tests software.aws.solution.clickstream.common.enrich.ts.rule.CategoryListEvaluatorTest.shouldReturnCategoryAndTermsForFullUrl5

        String content = Util.readResourceFile("ts/traffic_source_category_rule_test.json");

        String tmpFile = "/tmp/shouldReturnCategoryAndTermsForFullUrl5.json";
        writeStringToFile(tmpFile, content);

        CategoryListEvaluator categoryListEvaluator = CategoryListEvaluator.fromJsonFile(tmpFile);

        // Call getCategoryAndTerms
        SourceCategoryAndTerms result = categoryListEvaluator.evaluate("http://www.wx.com");

        // Assert the results
        Assertions.assertEquals(CategoryListEvaluator.UNASSIGNED, result.getCategory());
        Assertions.assertNull(result.getTerms());
        Assertions.assertEquals("www.wx.com", result.getSource());
    }

    @Test
    void shouldReturnCategoryAndTermsForFullUrl6() throws IOException {
        //  ./gradlew clean test --info --tests software.aws.solution.clickstream.common.enrich.ts.rule.CategoryListEvaluatorTest.shouldReturnCategoryAndTermsForFullUrl6

        String content = Util.readResourceFile("ts/traffic_source_category_rule_test.json");

        CategoryListEvaluator categoryListEvaluator = CategoryListEvaluator.fromJson(content);

        // Call getCategoryAndTerms
        SourceCategoryAndTerms result = categoryListEvaluator.evaluate("za.pinterest.com");

        // Assert the results
        Assertions.assertEquals("Social", result.getCategory());
        Assertions.assertNull(result.getTerms());
        Assertions.assertEquals("za.pinterest", result.getSource());
    }

    @Test
    void shouldReturnCategoryAndTermsForFullUrl7() throws IOException {
        //  ./gradlew clean test --info --tests software.aws.solution.clickstream.common.enrich.ts.rule.CategoryListEvaluatorTest.shouldReturnCategoryAndTermsForFullUrl7

        String content = Util.readResourceFile("ts/traffic_source_category_rule_v0.json");
        CategoryListEvaluator categoryListEvaluator = CategoryListEvaluator.fromJson(content);

        // Call getCategoryAndTerms
        SourceCategoryAndTerms result = categoryListEvaluator.evaluate("https://www.toile.com?q=2hello&q=1world");

        // Assert the results
        Assertions.assertEquals("Search", result.getCategory());
        Assertions.assertEquals("1world,2hello", result.getTerms());
        Assertions.assertEquals("La Toile Du Qu\u00e9bec (Google)", result.getSource());
    }

    @Test
    void shouldReturnCategoryAndTermsForFullUrl8() throws IOException {
        //  ./gradlew clean test --info --tests software.aws.solution.clickstream.common.enrich.ts.rule.CategoryListEvaluatorTest.shouldReturnCategoryAndTermsForFullUrl8

        Assertions.assertThrows(FileNotFoundException.class, ()  -> {
            CategoryListEvaluator.fromJsonFile("_not_exist_file.json");} );

    }

}