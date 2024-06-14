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

package software.aws.solution.clickstream.common.enrich;

import lombok.extern.slf4j.Slf4j;
import org.apache.logging.log4j.Level;
import org.apache.logging.log4j.core.config.Configurator;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import software.aws.solution.clickstream.BaseTest;
import software.aws.solution.clickstream.common.Util;
import software.aws.solution.clickstream.common.enrich.ts.CategoryTrafficSource;
import software.aws.solution.clickstream.common.enrich.ts.TrafficSourceUtm;
import software.aws.solution.clickstream.common.enrich.ts.rule.CategoryListEvaluator;

import java.io.IOException;

import static software.aws.solution.clickstream.common.enrich.RuleBasedTrafficSourceHelper.CPC;
import static software.aws.solution.clickstream.common.enrich.RuleBasedTrafficSourceHelper.DIRECT;
import static software.aws.solution.clickstream.common.enrich.RuleBasedTrafficSourceHelper.ORGANIC;
import static software.aws.solution.clickstream.common.enrich.RuleBasedTrafficSourceHelper.REFERRAL;
import static software.aws.solution.clickstream.common.enrich.RuleBasedTrafficSourceHelper.SEARCH;
import static software.aws.solution.clickstream.common.enrich.RuleBasedTrafficSourceHelper.SHOPPING;
import static software.aws.solution.clickstream.common.enrich.RuleBasedTrafficSourceHelper.SOCIAL;
import static software.aws.solution.clickstream.common.enrich.RuleBasedTrafficSourceHelper.VIDEO;


@Slf4j
public class RuleBasedTrafficSourceHelperTest extends BaseTest {

    @BeforeEach
    public void init() {
        Configurator.setRootLevel(Level.WARN);
        Configurator.setLevel("software.aws.solution.clickstream", Level.DEBUG);
    }

    @Test
    void testParse() throws IOException {
        //./gradlew clean test --info --tests software.aws.solution.clickstream.common.enrich.RuleBasedTrafficSourceHelperTest.testParse
        RuleBasedTrafficSourceHelper parser = RuleBasedTrafficSourceHelper.getInstance("testApp", null);
        CategoryTrafficSource trafficSource = parser.parse("https://www.example.com?utm_source=source&utm_medium=medium&utm_campaign=campaign&utm_content=content&utm_term=term&utm_id=campaignId&utm_source_platform=clidPlatform&xclid=xcidxxxx",
                null, null, null);

        String expectedValue = "{\n" +
                "  \"source\" : \"source\",\n" +
                "  \"medium\" : \"medium\",\n" +
                "  \"campaign\" : \"campaign\",\n" +
                "  \"content\" : \"content\",\n" +
                "  \"term\" : \"term\",\n" +
                "  \"campaignId\" : \"campaignId\",\n" +
                "  \"clidPlatform\" : \"clidPlatform\",\n" +
                "  \"clid\" : \"{\\\"type\\\":\\\"xclid\\\",\\\"value\\\":\\\"xcidxxxx\\\"}\",\n" +
                "  \"channelGroup\" : \"Unassigned\",\n" +
                "  \"category\" : \"Unassigned\"\n" +
                "}";
        String value = prettyJson(Util.objectToJsonString(trafficSource));

        Assertions.assertEquals(prettyJson(expectedValue), value);

    }

    @Test
    void testParse2() throws IOException {
        //./gradlew clean test --info --tests software.aws.solution.clickstream.common.enrich.RuleBasedTrafficSourceHelperTest.testParse2
        RuleBasedTrafficSourceHelper parser = RuleBasedTrafficSourceHelper.getInstance("testApp", null);
        CategoryTrafficSource trafficSource = parser.parse("https://www.example.com/search?q=abc&q=food" +
                        "&utm_campaign=shopping&utm_content=content&utm_id=shopping_id&utm_source_platform=clidPlatform&gclid=gcidxxxx",
                null, null, null);

        String expectedValue = "{\n" +
                "  \"source\" : \"Google\",\n" +
                "  \"medium\" : \"(CPC)\",\n" +
                "  \"campaign\" : \"shopping\",\n" +
                "  \"content\" : \"content\",\n" +
                "  \"term\" : null,\n" +
                "  \"campaignId\" : \"shopping_id\",\n" +
                "  \"clidPlatform\" : \"clidPlatform\",\n" +
                "  \"clid\" : \"{\\\"type\\\":\\\"gclid\\\",\\\"value\\\":\\\"gcidxxxx\\\"}\",\n" +
                "  \"channelGroup\" : \"Paid Search\",\n" +
                "  \"category\" : \"Search\"\n" +
                "}";
        String value = prettyJson(Util.objectToJsonString(trafficSource));

        Assertions.assertEquals(prettyJson(expectedValue), value);

    }

    @Test
    void testParseWithoutProtocol() throws IOException {
        //./gradlew clean test --info --tests software.aws.solution.clickstream.common.enrich.RuleBasedTrafficSourceHelperTest.testParseWithoutProtocol
        RuleBasedTrafficSourceHelper parser = RuleBasedTrafficSourceHelper.getInstance("testApp", null);
        CategoryTrafficSource trafficSource = parser.parse("example.com?utm_source=source&utm_medium=medium&utm_campaign=campaign&utm_content=content&utm_term=term&utm_id=campaignId&utm_source_platform=clidPlatform&xclid=xcidxxxx",
                null, null, null);

        String expectedValue = "{\n" +
                "  \"source\" : \"source\",\n" +
                "  \"medium\" : \"medium\",\n" +
                "  \"campaign\" : \"campaign\",\n" +
                "  \"content\" : \"content\",\n" +
                "  \"term\" : \"term\",\n" +
                "  \"campaignId\" : \"campaignId\",\n" +
                "  \"clidPlatform\" : \"clidPlatform\",\n" +
                "  \"clid\" : \"{\\\"type\\\":\\\"xclid\\\",\\\"value\\\":\\\"xcidxxxx\\\"}\",\n" +
                "  \"channelGroup\" : \"Unassigned\",\n" +
                "  \"category\" : \"Unassigned\"\n" +
                "}";
        String value = prettyJson(Util.objectToJsonString(trafficSource));

        Assertions.assertEquals(prettyJson(expectedValue), value);

    }

    @Test
    void testParseAllNullParams() throws IOException {
        //./gradlew clean test --info --tests software.aws.solution.clickstream.common.enrich.RuleBasedTrafficSourceHelperTest.testParseAllNullParams
        RuleBasedTrafficSourceHelper parser = RuleBasedTrafficSourceHelper.getInstance("testApp", null);
        String url = null;
        CategoryTrafficSource trafficSource = parser.parse(url, null, null, null);

        String expectedValue = "{\n" +
                "  \"source\" : \"Direct\",\n" +
                "  \"medium\" : \"None\",\n" +
                "  \"campaign\" : \"Direct\",\n" +
                "  \"content\" : null,\n" +
                "  \"term\" : null,\n" +
                "  \"campaignId\" : null,\n" +
                "  \"clidPlatform\" : null,\n" +
                "  \"clid\" : null,\n" +
                "  \"channelGroup\" : \"Direct\",\n" +
                "  \"category\" : \"Direct\"\n" +
                "}";
        String value = prettyJson(Util.objectToJsonString(trafficSource));

        Assertions.assertEquals(prettyJson(expectedValue), value);

    }

    @Test
    void testParseAllEmptyParams() throws IOException {
        //./gradlew clean test --info --tests software.aws.solution.clickstream.common.enrich.RuleBasedTrafficSourceHelperTest.testParseAllEmptyParams
        RuleBasedTrafficSourceHelper parser = RuleBasedTrafficSourceHelper.getInstance("testApp", null);
        CategoryTrafficSource trafficSource = parser.parse("", "", "", "");
        String expectedValue = "{\n" +
                "  \"source\" : \"Direct\",\n" +
                "  \"medium\" : \"None\",\n" +
                "  \"campaign\" : \"Direct\",\n" +
                "  \"content\" : null,\n" +
                "  \"term\" : null,\n" +
                "  \"campaignId\" : null,\n" +
                "  \"clidPlatform\" : null,\n" +
                "  \"clid\" : null,\n" +
                "  \"channelGroup\" : \"Direct\",\n" +
                "  \"category\" : \"Direct\"\n" +
                "}";
        String value = prettyJson(Util.objectToJsonString(trafficSource));
        Assertions.assertEquals(prettyJson(expectedValue), value);
    }

    @Test
    void testParseWithReferrer() throws IOException {
        //./gradlew clean test --info --tests software.aws.solution.clickstream.common.enrich.RuleBasedTrafficSourceHelperTest.testParseWithReferrer
        RuleBasedTrafficSourceHelper parser = RuleBasedTrafficSourceHelper.getInstance("testApp", null);
        CategoryTrafficSource trafficSource = parser.parse("https://www.example.com/query_path",
                "https://google.com/search?q=flowers&hl=en&biw=1366&bih=667&source=lnms&tbm=isch&sa=X&ei=0f8yU5r6E8mSyAGFhoGwDw&ved=0CAcQ_AUoAg", null, null);
        String expectedValue = "{\n" +
                "  \"source\" : \"Google\",\n" +
                "  \"medium\" : \"(Organic)\",\n" +
                "  \"campaign\" : null,\n" +
                "  \"content\" : null,\n" +
                "  \"term\" : null,\n" +
                "  \"campaignId\" : null,\n" +
                "  \"clidPlatform\" : null,\n" +
                "  \"clid\" : null,\n" +
                "  \"channelGroup\" : \"Organic Search\",\n" +
                "  \"category\" : \"Search\"\n" +
                "}";
        String value = prettyJson(Util.objectToJsonString(trafficSource));
        Assertions.assertEquals(prettyJson(expectedValue), value);
    }

    @Test
    void testParseWithReferrer2() throws IOException {
        //./gradlew clean test --info --tests software.aws.solution.clickstream.common.enrich.RuleBasedTrafficSourceHelperTest.testParseWithReferrer2
        RuleBasedTrafficSourceHelper parser = RuleBasedTrafficSourceHelper.getInstance("testApp", null);
        CategoryTrafficSource trafficSource = parser.parse("https://www.example.com/query_path/abc?q=flowers&q=food&hl=en&biw=1366&bih=667&source=lnms&tbm=isch&sa=X&ei=0f8yU5r6E8mSyAGFhoGwDw&ved=0CAcQ_AUoAg",
                null, "https://video.google.com/search?q=flowers&q=football&hl=en&biw=1366&bih=667&source=lnms&tbm=isch&sa=X&ei=0f8yU5r6E8mSyAGFhoGwDw&ved=0CAcQ_AUoAg", null);
        String expectedValue = "{\n" +
                "  \"source\" : \"Google Video\",\n" +
                "  \"medium\" : \"(Organic)\",\n" +
                "  \"campaign\" : null,\n" +
                "  \"content\" : null,\n" +
                "  \"term\" : \"flowers,football\",\n" +
                "  \"campaignId\" : null,\n" +
                "  \"clidPlatform\" : null,\n" +
                "  \"clid\" : null,\n" +
                "  \"channelGroup\" : \"Organic Search\",\n" +
                "  \"category\" : \"Search\"\n" +
                "}";
        String value = prettyJson(Util.objectToJsonString(trafficSource));
        Assertions.assertEquals(prettyJson(expectedValue), value);
    }


    @Test
    void testParseWithReferrer3() throws IOException {
        //./gradlew clean test --info --tests software.aws.solution.clickstream.common.enrich.RuleBasedTrafficSourceHelperTest.testParseWithReferrer3
        RuleBasedTrafficSourceHelper parser = RuleBasedTrafficSourceHelper.getInstance("testApp", null);

        String referrerUrl = "https://video.google.com/search?q=flowers&q=football&hl=en&biw=1366&bih=667&source=lnms&tbm=isch&sa=X&ei=0f8yU5r6E8mSyAGFhoGwDw&ved=0CAcQ_AUoAg";
        String referrerUrl2 = "https://video.google.com/search?q=flowers2&q=football2&hl=en&biw=1366&bih=667&source=lnms&tbm=isch&sa=X&ei=0f8yU5r6E8mSyAGFhoGwDw&ved=0CAcQ_AUoAg";

        CategoryTrafficSource trafficSource = parser.parse("https://www.example.com/query_path/abc?q=flowers&q=food&hl=en&biw=1366&bih=667&source=lnms&tbm=isch&sa=X&ei=0f8yU5r6E8mSyAGFhoGwDw&ved=0CAcQ_AUoAg",
                referrerUrl, referrerUrl2, "video.google.com");

        String expectedValue = "{\n" +
                "  \"source\" : \"Google Video\",\n" +
                "  \"medium\" : \"(Organic)\",\n" +
                "  \"campaign\" : null,\n" +
                "  \"content\" : null,\n" +
                "  \"term\" : \"flowers2,football2\",\n" +
                "  \"campaignId\" : null,\n" +
                "  \"clidPlatform\" : null,\n" +
                "  \"clid\" : null,\n" +
                "  \"channelGroup\" : \"Organic Search\",\n" +
                "  \"category\" : \"Search\"\n" +
                "}";
        String value = prettyJson(Util.objectToJsonString(trafficSource));
        Assertions.assertEquals(prettyJson(expectedValue), value);

        trafficSource = parser.parse("https://www.example.com/query_path",
                referrerUrl, referrerUrl2, null);

        value = prettyJson(Util.objectToJsonString(trafficSource));
        Assertions.assertEquals(prettyJson(expectedValue), value);
    }


    @Test
    void testParseWithRuleConfig1() throws IOException {
        //./gradlew clean test --info --tests software.aws.solution.clickstream.common.enrich.RuleBasedTrafficSourceHelperTest.testParseWithRuleConfig1

        RuleBasedTrafficSourceHelper parser = RuleBasedTrafficSourceHelper.getInstance("testApp", getRuleConfigV0());
        CategoryTrafficSource trafficSource = parser.parse("https://www.example.com/query_path",
                "https://search.imesh.com/search?q=flowers&si=foo&hl=en&biw=1366&bih=667&source=lnms&tbm=isch&sa=X&ei=0f8yU5r6E8mSyAGFhoGwDw&ved=0CAcQ_AUoAg", null, null);
        String expectedValue = "{\n" +
                "  \"source\" : \"iMesh\",\n" +
                "  \"medium\" : \"(Organic)\",\n" +
                "  \"campaign\" : null,\n" +
                "  \"content\" : null,\n" +
                "  \"term\" : \"flowers,foo\",\n" +
                "  \"campaignId\" : null,\n" +
                "  \"clidPlatform\" : null,\n" +
                "  \"clid\" : null,\n" +
                "  \"channelGroup\" : \"Organic Search\",\n" +
                "  \"category\" : \"Search\"\n" +
                "}";
        String value = prettyJson(Util.objectToJsonString(trafficSource));
        Assertions.assertEquals(prettyJson(expectedValue), value);
    }

    @Test
    void testParseWithRuleConfig2() throws IOException {
        //./gradlew clean test --info --tests software.aws.solution.clickstream.common.enrich.RuleBasedTrafficSourceHelperTest.testParseWithRuleConfig2

        RuleBasedTrafficSourceHelper parser = RuleBasedTrafficSourceHelper.getInstance("testApp", getRuleConfigV0());
        CategoryTrafficSource trafficSource = parser.parse("https://www.example.com/query_path?utm_term=abc,123",
                "https://search.imesh.com/search?q=flowers&si=foo&hl=en&biw=1366&bih=667&source=lnms&tbm=isch&sa=X&ei=0f8yU5r6E8mSyAGFhoGwDw&ved=0CAcQ_AUoAg", null, null);
        String expectedValue = "{\n" +
                "  \"source\" : \"iMesh\",\n" +
                "  \"medium\" : \"(Organic)\",\n" +
                "  \"campaign\" : null,\n" +
                "  \"content\" : null,\n" +
                "  \"term\" : \"flowers,foo\",\n" +
                "  \"campaignId\" : null,\n" +
                "  \"clidPlatform\" : null,\n" +
                "  \"clid\" : null,\n" +
                "  \"channelGroup\" : \"Organic Search\",\n" +
                "  \"category\" : \"Search\"\n" +
                "}";
        String value = prettyJson(Util.objectToJsonString(trafficSource));
        Assertions.assertEquals(prettyJson(expectedValue), value);
    }

    @Test
    void testGetMediumByReferrer1() throws IOException {
        //./gradlew clean test --info --tests software.aws.solution.clickstream.common.enrich.RuleBasedTrafficSourceHelperTest.testGetMediumByReferrer2

        RuleBasedTrafficSourceHelper parser = RuleBasedTrafficSourceHelper.getInstance("testApp", getRuleConfigV0());
        String pageReferrer = "https://example.com";
        String latestReferrer = "https://www.abc.com/search?q=flowers&hl=en&biw=1366&bih=667&source=lnms&tbm=isch&sa=X&ei=0f8yU5r6E8mSyAGFhoGwDw&ved=0CAcQ_AUoAg";
        boolean internalReferrer = false;

        String medium = parser.getMediumByReferrer(pageReferrer, latestReferrer, internalReferrer);
        Assertions.assertEquals("(" + REFERRAL + ")", medium);

    }

    @Test
    void testGetMediumByReferrer2() throws IOException {
        //./gradlew clean test --info --tests software.aws.solution.clickstream.common.enrich.RuleBasedTrafficSourceHelperTest.testGetMediumByReferrer3

        RuleBasedTrafficSourceHelper parser = RuleBasedTrafficSourceHelper.getInstance("testApp", getRuleConfigV0());
        String pageReferrer = "https://example.com";
        String latestReferrer = null;
        boolean internalReferrer = false;

        String medium = parser.getMediumByReferrer(pageReferrer, latestReferrer, internalReferrer);
        Assertions.assertEquals("(" +REFERRAL+ ")", medium);

    }

    @Test
    void testGetMediumByReferrerInternal() throws IOException {
        // ./gradlew clean test --info --tests software.aws.solution.clickstream.common.enrich.RuleBasedTrafficSourceHelperTest.testGetMediumByReferrerInternal

        RuleBasedTrafficSourceHelper parser = RuleBasedTrafficSourceHelper.getInstance("testApp", getRuleConfigV0());
        String pageReferrer = "https://example.com";
        String latestReferrer = null;
        boolean internalReferrer = true;

        String medium = parser.getMediumByReferrer(pageReferrer, latestReferrer, internalReferrer);
        Assertions.assertEquals(RuleBasedTrafficSourceHelper.NONE, medium);

    }

    @Test
    void testGetMediumByReferrerNull() throws IOException {
        //./gradlew clean test --info --tests software.aws.solution.clickstream.common.enrich.RuleBasedTrafficSourceHelperTest.testGetMediumByReferrer5

        RuleBasedTrafficSourceHelper parser = RuleBasedTrafficSourceHelper.getInstance("testApp", getRuleConfigV0());
        String pageReferrer = null;
        String latestReferrer = null;
        boolean internalReferrer = false;

        String medium = parser.getMediumByReferrer(pageReferrer, latestReferrer, internalReferrer);
        Assertions.assertEquals(RuleBasedTrafficSourceHelper.NONE, medium);

    }

    @Test
    void testParseDirectInternal() throws IOException {
        // ./gradlew clean test --info --tests software.aws.solution.clickstream.common.enrich.RuleBasedTrafficSourceHelperTest.testParseDirectInternal

        RuleBasedTrafficSourceHelper parser = RuleBasedTrafficSourceHelper.getInstance("testApp", getRuleConfigV0());
        String pageUrl = "https://example.com/posts/2022/build-serverless-app-on-aws/protect-website-with-cognito/";
        String pageReferrer = "https://example.com/posts/2022/build-serverless-app-on-aws/federated-oidc-login-with-cognito-and-amplify/";
        String latestReferrer = "https://example.com/posts/2022/build-serverless-app-on-aws/federated-oidc-login-with-cognito-and-amplify/";
        String latestReferrerHost = "example.com";

        CategoryTrafficSource cts = parser.parse(pageUrl, pageReferrer, latestReferrer, latestReferrerHost);

        String expectedValue = "{\n" +
                "      \"source\" : \"Direct\",\n" +
                "      \"medium\" : \"None\",\n" +
                "      \"campaign\" : \"Direct\",\n" +
                "      \"content\" : null,\n" +
                "      \"term\" : null,\n" +
                "      \"campaignId\" : null,\n" +
                "      \"clidPlatform\" : null,\n" +
                "      \"clid\" : null,\n" +
                "      \"channelGroup\" : \"Internal\",\n" +
                "      \"category\" : \"Direct\"\n" +
                "    }";
        String value = prettyJson(Util.objectToJsonString(cts));
        Assertions.assertEquals(prettyJson(expectedValue), value);
    }


    @Test
    void testParseGoogleSearch() throws IOException {
        // ./gradlew clean test --info --tests software.aws.solution.clickstream.common.enrich.RuleBasedTrafficSourceHelperTest.testParseGoogleSearch

        RuleBasedTrafficSourceHelper parser = RuleBasedTrafficSourceHelper.getInstance("testApp", getRuleConfigV0());
        String pageUrl = "https://example.com/posts/2022/build-serverless-app-on-aws/protect-website-with-cognito/";
        String pageReferrer = null;
        String latestReferrer = "https://i.search.google.se";
        String latestReferrerHost = "i.search.google.se";

        CategoryTrafficSource cts = parser.parse(pageUrl, pageReferrer, latestReferrer, latestReferrerHost);

        String expectedValue = "{\n" +
                "      \"source\" : \"Google\",\n" +
                "      \"medium\" : \"(Organic)\",\n" +
                "      \"campaign\" : null,\n" +
                "      \"content\" : null,\n" +
                "      \"term\" : null,\n" +
                "      \"campaignId\" : null,\n" +
                "      \"clidPlatform\" : null,\n" +
                "      \"clid\" : null,\n" +
                "      \"channelGroup\" : \"Organic Search\",\n" +
                "      \"category\" : \"Search\"\n" +
                "    }";
        String value = prettyJson(Util.objectToJsonString(cts));
        Assertions.assertEquals(prettyJson(expectedValue), value);
    }

    @Test
    void testParseDirect() throws IOException {
        // ./gradlew clean test --info --tests software.aws.solution.clickstream.common.enrich.RuleBasedTrafficSourceHelperTest.testParseDirect

        RuleBasedTrafficSourceHelper parser = RuleBasedTrafficSourceHelper.getInstance("testApp", getRuleConfigV0());
        String pageUrl = "https://example.com/posts/2024/redshift-serverless-cost-deep-dive/";
        String pageReferrer = null;
        String latestReferrer = "https://example.com/";
        String latestReferrerHost = "example.com";

        CategoryTrafficSource cts = parser.parse(pageUrl, pageReferrer, latestReferrer, latestReferrerHost);

        String expectedValue = "{\n" +
                "      \"source\" : \"Direct\",\n" +
                "      \"medium\" : \"None\",\n" +
                "      \"campaign\" : \"Direct\",\n" +
                "      \"content\" : null,\n" +
                "      \"term\" : null,\n" +
                "      \"campaignId\" : null,\n" +
                "      \"clidPlatform\" : null,\n" +
                "      \"clid\" : null,\n" +
                "      \"channelGroup\" : \"Internal\",\n" +
                "      \"category\" : \"Direct\"\n" +
                "    }";
        String value = prettyJson(Util.objectToJsonString(cts));
        Assertions.assertEquals(prettyJson(expectedValue), value);
    }


    @Test
    void testGetMediumByReferrer8() throws IOException {
        //./gradlew clean test --info --tests software.aws.solution.clickstream.common.enrich.RuleBasedTrafficSourceHelperTest.testGetMediumByReferrer8

        RuleBasedTrafficSourceHelper parser = RuleBasedTrafficSourceHelper.getInstance("testApp", getRuleConfigV0());
        String pageReferrer = "https://example.com";
        String latestReferrer = "https://www.example.com/search?q=flowers&hl=en&biw=1366&bih=667&source=lnms&tbm=isch&sa=X&ei=0f8yU5r6E8mSyAGFhoGwDw&ved=0CAcQ_AUoAg";
        boolean internalReferrer = true;

        String medium = parser.getMediumByReferrer(pageReferrer, latestReferrer, internalReferrer);
        Assertions.assertEquals(RuleBasedTrafficSourceHelper.NONE, medium);

    }


    @Test
    void testParseGoogleOrganic() throws IOException {
        // ./gradlew clean test --info --tests software.aws.solution.clickstream.common.enrich.RuleBasedTrafficSourceHelperTest.testParseGoogleOrganic

        RuleBasedTrafficSourceHelper parser = RuleBasedTrafficSourceHelper.getInstance("testApp", getRuleConfigV0());
        String pageUrl = "https://example.com/posts/2024/redshift-serverless-cost-deep-dive/";
        String pageReferrer = "https://example.com";
        String latestReferrer = "https://www.google.com/";
        String latestReferrerHost = "google.com";

        CategoryTrafficSource cts = parser.parse(pageUrl, pageReferrer, latestReferrer, latestReferrerHost);

        String expectedValue = "{\n" +
                "      \"source\" : \"Google\",\n" +
                "      \"medium\" : \"(Organic)\",\n" +
                "      \"campaign\" : null,\n" +
                "      \"content\" : null,\n" +
                "      \"term\" : null,\n" +
                "      \"campaignId\" : null,\n" +
                "      \"clidPlatform\" : null,\n" +
                "      \"clid\" : null,\n" +
                "      \"channelGroup\" : \"Organic Search\",\n" +
                "      \"category\" : \"Search\"\n" +
                "    }";
        String value = prettyJson(Util.objectToJsonString(cts));
        Assertions.assertEquals(prettyJson(expectedValue), value);
    }

    @Test
    void testParseCNChars() throws IOException {
        // ./gradlew clean test --info --tests software.aws.solution.clickstream.common.enrich.RuleBasedTrafficSourceHelperTest.testParseCNChars

        RuleBasedTrafficSourceHelper parser = RuleBasedTrafficSourceHelper.getInstance("testApp", getRuleConfigV0());
        String pageUrl = "https://www.example.com/travel/航空-786138/?utm_source=feedYahoo{{1|||{[}]]][[<,,,,>M<$#@~^\\;`#~;/:+, }AA_【中文测试 | 中文 测试 @test&utm_medium=referral&utm_campaign=nmgYahoo";
        String pageReferrer = "https://hk.news.yahoo.com/借錢-{[}]]][[-test-070840890.html";

        CategoryTrafficSource cts = parser.parse(pageUrl, pageReferrer, null, null);

        String expectedValue = "{\n" +
                "  \"source\" : \"feedYahoo{{1|||{[}]]][[<,,,,>M<$#@~^\\\\;`#~;/:+, }AA_【中文测试 | 中文 测试 @test\",\n" +
                "  \"medium\" : \"referral\",\n" +
                "  \"campaign\" : \"nmgYahoo\",\n" +
                "  \"content\" : null,\n" +
                "  \"term\" : null,\n" +
                "  \"campaignId\" : null,\n" +
                "  \"clidPlatform\" : null,\n" +
                "  \"clid\" : null,\n" +
                "  \"channelGroup\" : \"Referral\",\n" +
                "  \"category\" : \"Unassigned\"\n" +
                "}";
        String value = prettyJson(Util.objectToJsonString(cts));
        Assertions.assertEquals(prettyJson(expectedValue), value);
    }

    @Test
    void testParseCNChars2() throws IOException {
        // ./gradlew clean test --info --tests software.aws.solution.clickstream.common.enrich.RuleBasedTrafficSourceHelperTest.testParseCNChars2

        RuleBasedTrafficSourceHelper parser = RuleBasedTrafficSourceHelper.getInstance("testApp", getRuleConfigV0());
        String pageUrl = "https://www.example.com/travel/航空-786138/中 文 测 试/?utm_source=feedYahoo{{1|||{[}]]][[<,,,,>M<$#@~^\\;`#~;/:+, }AA_【中文测试 | 中文 测试 @test&utm_medium=referral&utm_campaign=nmgYahoo";
        String pageReferrer = "https://hk.news.yahoo.com/借錢-中 文 测 试/{[}]]][[-test-070840890.html";

        CategoryTrafficSource cts = parser.parse(pageUrl, pageReferrer, null, null);

        String expectedValue = "{\n" +
                "  \"source\" : \"feedYahoo{{1|||{[}]]][[<,,,,>M<$#@~^\\\\;`#~;/:+, }AA_【中文测试 | 中文 测试 @test\",\n" +
                "  \"medium\" : \"referral\",\n" +
                "  \"campaign\" : \"nmgYahoo\",\n" +
                "  \"content\" : null,\n" +
                "  \"term\" : null,\n" +
                "  \"campaignId\" : null,\n" +
                "  \"clidPlatform\" : null,\n" +
                "  \"clid\" : null,\n" +
                "  \"channelGroup\" : \"Referral\",\n" +
                "  \"category\" : \"Unassigned\"\n" +
                "}";
        String value = prettyJson(Util.objectToJsonString(cts));
        Assertions.assertEquals(prettyJson(expectedValue), value);
    }


    @Test
    void testParseFacebookReferral() throws IOException {
        // ./gradlew clean test --info --tests software.aws.solution.clickstream.common.enrich.RuleBasedTrafficSourceHelperTest.testParseFacebookReferral

        RuleBasedTrafficSourceHelper parser = RuleBasedTrafficSourceHelper.getInstance("testApp", getRuleConfigV0());
        String pageUrl = "https://www.example.com/entertainment/中文--plt6/14?method=lazyload";
        String pageReferrer = "http://m.facebook.com/";

        CategoryTrafficSource cts = parser.parse(pageUrl, pageReferrer, null, null);

        String expectedValue = "{\n" +
                "  \"source\" : \"Facebook\",\n" +
                "  \"medium\" : \"(Referral)\",\n" +
                "  \"campaign\" : null,\n" +
                "  \"content\" : null,\n" +
                "  \"term\" : null,\n" +
                "  \"campaignId\" : null,\n" +
                "  \"clidPlatform\" : null,\n" +
                "  \"clid\" : null,\n" +
                "  \"channelGroup\" : \"Organic Social\",\n" +
                "  \"category\" : \"Social\"\n" +
                "}";
        String value = prettyJson(Util.objectToJsonString(cts));
        Assertions.assertEquals(prettyJson(expectedValue), value);
    }

    @Test
    void testGetMediumByCategory() throws IOException {
        // ./gradlew clean test --info --tests software.aws.solution.clickstream.common.enrich.RuleBasedTrafficSourceHelperTest.testGetMediumByCategory

        RuleBasedTrafficSourceHelper parser = RuleBasedTrafficSourceHelper.getInstance("testApp", getRuleConfigV0());
        TrafficSourceUtm trafficSourceUtm1 = new TrafficSourceUtm();

        String medium = parser.getMediumByCategory(trafficSourceUtm1, SOCIAL);
        Assertions.assertEquals("(" + REFERRAL + ")", medium);

        medium = parser.getMediumByCategory(trafficSourceUtm1, SOCIAL);
        Assertions.assertEquals("(" + REFERRAL + ")", medium);

        medium = parser.getMediumByCategory(trafficSourceUtm1, VIDEO);
        Assertions.assertEquals("(" + REFERRAL + ")", medium);

        medium = parser.getMediumByCategory(trafficSourceUtm1, SHOPPING);
        Assertions.assertEquals("(" + REFERRAL + ")", medium);

        medium = parser.getMediumByCategory(trafficSourceUtm1, REFERRAL);
        Assertions.assertEquals("(" + REFERRAL + ")", medium);

        medium = parser.getMediumByCategory(trafficSourceUtm1, SEARCH);
        Assertions.assertEquals("(" + ORGANIC + ")", medium);

        // clid is not emtpy
        TrafficSourceUtm trafficSourceUtm2 = new TrafficSourceUtm();
        trafficSourceUtm2.setClid("clid");

        medium = parser.getMediumByCategory(trafficSourceUtm2, SOCIAL);
        Assertions.assertEquals("(" + CPC + ")", medium);

        medium = parser.getMediumByCategory(trafficSourceUtm2, SEARCH);
        Assertions.assertEquals("(" + CPC + ")", medium);

        // Medium is not empty
        TrafficSourceUtm trafficSourceUtm3 = new TrafficSourceUtm();
        trafficSourceUtm3.setMedium("medium1");

        medium = parser.getMediumByCategory(trafficSourceUtm3, SOCIAL);
        Assertions.assertEquals("medium1", medium);

        medium = parser.getMediumByCategory(trafficSourceUtm3, SEARCH);
        Assertions.assertEquals("medium1", medium);

        // Category is not empty, DIRECT, UNASSIGNED
        TrafficSourceUtm trafficSourceUtm4 = new TrafficSourceUtm();
        medium = parser.getMediumByCategory(trafficSourceUtm4, null);
        Assertions.assertNull(medium);

        medium = parser.getMediumByCategory(trafficSourceUtm4, DIRECT);
        Assertions.assertNull(medium);

        medium = parser.getMediumByCategory(trafficSourceUtm4, CategoryListEvaluator.UNASSIGNED);
        Assertions.assertNull(medium);
    }

    @Test
    void testParseIllegalCharInPath1() throws IOException {
        // ./gradlew clean test --info --tests software.aws.solution.clickstream.common.enrich.RuleBasedTrafficSourceHelperTest.testParseIllegalCharInPath1
        RuleBasedTrafficSourceHelper parser = RuleBasedTrafficSourceHelper.getInstance("testApp", getRuleConfigV0());
        String pageUrl = "https://www.example.com/keyword/太古 食乜^$@()[- #]%好/";
        String pageReferrer = "https://www.example.com/dining/太古-著數 推介-snoopy-669390/";

        CategoryTrafficSource cts = parser.parse(pageUrl, pageReferrer, null, null);

        String expectedValue = "{\n" +
                "      \"source\" : \"Direct\",\n" +
                "      \"medium\" : \"None\",\n" +
                "      \"campaign\" : \"Direct\",\n" +
                "      \"content\" : null,\n" +
                "      \"term\" : null,\n" +
                "      \"campaignId\" : null,\n" +
                "      \"clidPlatform\" : null,\n" +
                "      \"clid\" : null,\n" +
                "      \"channelGroup\" : \"Internal\",\n" +
                "      \"category\" : \"Direct\"\n" +
                "    }";
        String value = prettyJson(Util.objectToJsonString(cts));
        Assertions.assertEquals(prettyJson(expectedValue), value);
    }

    @Test
    void testParseIllegalCharInPath2() throws IOException {
        // ./gradlew clean test --info --tests software.aws.solution.clickstream.common.enrich.RuleBasedTrafficSourceHelperTest.testParseIllegalCharInPath2

        RuleBasedTrafficSourceHelper parser = RuleBasedTrafficSourceHelper.getInstance("testApp", getRuleConfigV0());
        String pageUrl = "https://www.example.com/keyword/太古%/";
        String pageReferrer = "https://www.example.com/dining/%/";

        CategoryTrafficSource cts = parser.parse(pageUrl, pageReferrer, null, null);

        String expectedValue = "{\n" +
                "      \"source\" : \"Direct\",\n" +
                "      \"medium\" : \"None\",\n" +
                "      \"campaign\" : \"Direct\",\n" +
                "      \"content\" : null,\n" +
                "      \"term\" : null,\n" +
                "      \"campaignId\" : null,\n" +
                "      \"clidPlatform\" : null,\n" +
                "      \"clid\" : null,\n" +
                "      \"channelGroup\" : \"Internal\",\n" +
                "      \"category\" : \"Direct\"\n" +
                "    }";
        String value = prettyJson(Util.objectToJsonString(cts));
        Assertions.assertEquals(prettyJson(expectedValue), value);
    }

    @Test
    void testParseIllegalCharInPath3() throws IOException {
        // ./gradlew clean test --info --tests software.aws.solution.clickstream.common.enrich.RuleBasedTrafficSourceHelperTest.testParseIllegalCharInPath3

        RuleBasedTrafficSourceHelper parser = RuleBasedTrafficSourceHelper.getInstance("testApp", getRuleConfigV0());
        String pageUrl = "www.example.com/keyword/太古 /";
        String pageReferrer = "www.example.com/dining/%/";

        CategoryTrafficSource cts = parser.parse(pageUrl, pageReferrer, null, null);

        String expectedValue = "{\n" +
                "      \"source\" : \"Direct\",\n" +
                "      \"medium\" : \"None\",\n" +
                "      \"campaign\" : \"Direct\",\n" +
                "      \"content\" : null,\n" +
                "      \"term\" : null,\n" +
                "      \"campaignId\" : null,\n" +
                "      \"clidPlatform\" : null,\n" +
                "      \"clid\" : null,\n" +
                "      \"channelGroup\" : \"Internal\",\n" +
                "      \"category\" : \"Direct\"\n" +
                "    }";
        String value = prettyJson(Util.objectToJsonString(cts));
        Assertions.assertEquals(prettyJson(expectedValue), value);
    }

    @Test
    void testParseIllegalCharInPath4() throws IOException {
        // ./gradlew clean test --info --tests software.aws.solution.clickstream.common.enrich.RuleBasedTrafficSourceHelperTest.testParseIllegalCharInPath4

        RuleBasedTrafficSourceHelper parser = RuleBasedTrafficSourceHelper.getInstance("testApp", getRuleConfigV0());
        String pageUrl = "https://www.example.com/mbti/istp测试istj测试-16型人格-mbti-cplt1-1697502/3?method=lazyload";
        String pageReferrer = "https://www.example.com/mbti/isfp测试-isfp性格-16型人格-mbti-cplt1-1684248/";

        CategoryTrafficSource cts = parser.parse(pageUrl, pageReferrer, null, null);

        String expectedValue = "{\n" +
                "      \"source\" : \"Direct\",\n" +
                "      \"medium\" : \"None\",\n" +
                "      \"campaign\" : \"Direct\",\n" +
                "      \"content\" : null,\n" +
                "      \"term\" : null,\n" +
                "      \"campaignId\" : null,\n" +
                "      \"clidPlatform\" : null,\n" +
                "      \"clid\" : null,\n" +
                "      \"channelGroup\" : \"Internal\",\n" +
                "      \"category\" : \"Direct\"\n" +
                "    }";
        String value = prettyJson(Util.objectToJsonString(cts));
        Assertions.assertEquals(prettyJson(expectedValue), value);
    }

}
