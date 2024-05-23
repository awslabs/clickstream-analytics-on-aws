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
import software.aws.solution.clickstream.common.RuleConfig;
import software.aws.solution.clickstream.common.Util;
import software.aws.solution.clickstream.common.enrich.ts.CategoryTrafficSource;

import java.io.IOException;


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
                "  \"medium\" : \"CPC\",\n" +
                "  \"campaign\" : \"shopping\",\n" +
                "  \"content\" : \"content\",\n" +
                "  \"term\" : null,\n" +
                "  \"campaignId\" : \"shopping_id\",\n" +
                "  \"clidPlatform\" : \"clidPlatform\",\n" +
                "  \"clid\" : \"{\\\"type\\\":\\\"gclid\\\",\\\"value\\\":\\\"gcidxxxx\\\"}\",\n" +
                "  \"channelGroup\" : \"Organic Shopping\",\n" +
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
                "  \"medium\" : \"Organic\",\n" +
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
                "  \"medium\" : \"Organic\",\n" +
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
                "  \"medium\" : \"Organic\",\n" +
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
                "  \"medium\" : \"Referral\",\n" +
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
                "  \"medium\" : \"Referral\",\n" +
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
        //./gradlew clean test --info --tests software.aws.solution.clickstream.common.enrich.RuleBasedTrafficSourceHelperTest.testGetMediumByReferrer1

        RuleBasedTrafficSourceHelper parser = RuleBasedTrafficSourceHelper.getInstance("testApp", getRuleConfigV0());
        String pageReferrer = "https://example.com";
        String latestReferrer = "https://www.google.com/search?q=flowers&hl=en&biw=1366&bih=667&source=lnms&tbm=isch&sa=X&ei=0f8yU5r6E8mSyAGFhoGwDw&ved=0CAcQ_AUoAg";
        boolean internalReferrer = false;

        String medium = parser.getMediumByReferrer(pageReferrer, latestReferrer, internalReferrer);
        Assertions.assertEquals(RuleBasedTrafficSourceHelper.ORGANIC, medium);

    }

    @Test
    void testGetMediumByReferrer2() throws IOException {
        //./gradlew clean test --info --tests software.aws.solution.clickstream.common.enrich.RuleBasedTrafficSourceHelperTest.testGetMediumByReferrer2

        RuleBasedTrafficSourceHelper parser = RuleBasedTrafficSourceHelper.getInstance("testApp", getRuleConfigV0());
        String pageReferrer = "https://example.com";
        String latestReferrer = "https://www.abc.com/search?q=flowers&hl=en&biw=1366&bih=667&source=lnms&tbm=isch&sa=X&ei=0f8yU5r6E8mSyAGFhoGwDw&ved=0CAcQ_AUoAg";
        boolean internalReferrer = false;

        String medium = parser.getMediumByReferrer(pageReferrer, latestReferrer, internalReferrer);
        Assertions.assertEquals(RuleBasedTrafficSourceHelper.REFERRAL, medium);

    }

    @Test
    void testGetMediumByReferrer3() throws IOException {
        //./gradlew clean test --info --tests software.aws.solution.clickstream.common.enrich.RuleBasedTrafficSourceHelperTest.testGetMediumByReferrer3

        RuleBasedTrafficSourceHelper parser = RuleBasedTrafficSourceHelper.getInstance("testApp", getRuleConfigV0());
        String pageReferrer = "https://example.com";
        String latestReferrer = null;
        boolean internalReferrer = false;

        String medium = parser.getMediumByReferrer(pageReferrer, latestReferrer, internalReferrer);
        Assertions.assertEquals(RuleBasedTrafficSourceHelper.REFERRAL, medium);

    }

    @Test
    void testGetMediumByReferrer4() throws IOException {
        // ./gradlew clean test --info --tests software.aws.solution.clickstream.common.enrich.RuleBasedTrafficSourceHelperTest.testGetMediumByReferrer4

        RuleBasedTrafficSourceHelper parser = RuleBasedTrafficSourceHelper.getInstance("testApp", getRuleConfigV0());
        String pageReferrer = "https://example.com";
        String latestReferrer = null;
        boolean internalReferrer = true;

        String medium = parser.getMediumByReferrer(pageReferrer, latestReferrer, internalReferrer);
        Assertions.assertEquals(RuleBasedTrafficSourceHelper.NONE, medium);

    }

    @Test
    void testGetMediumByReferrer5() throws IOException {
        //./gradlew clean test --info --tests software.aws.solution.clickstream.common.enrich.RuleBasedTrafficSourceHelperTest.testGetMediumByReferrer5

        RuleBasedTrafficSourceHelper parser = RuleBasedTrafficSourceHelper.getInstance("testApp", getRuleConfigV0());
        String pageReferrer = null;
        String latestReferrer = null;
        boolean internalReferrer = false;

        String medium = parser.getMediumByReferrer(pageReferrer, latestReferrer, internalReferrer);
        Assertions.assertEquals(RuleBasedTrafficSourceHelper.NONE, medium);

    }


    @Test
    void testGetMediumByReferrer6() throws IOException {
        //./gradlew clean test --info --tests software.aws.solution.clickstream.common.enrich.RuleBasedTrafficSourceHelperTest.testGetMediumByReferrer6

        RuleBasedTrafficSourceHelper parser = RuleBasedTrafficSourceHelper.getInstance("testApp", getRuleConfigV0());
        String pageReferrer = "https://www.baidu.com";
        String latestReferrer = null;
        boolean internalReferrer = false;

        String medium = parser.getMediumByReferrer(pageReferrer, latestReferrer, internalReferrer);
        Assertions.assertEquals(RuleBasedTrafficSourceHelper.ORGANIC, medium);
    }

    @Test
    void testGetMediumByReferrer7() throws IOException {
        //./gradlew clean test --info --tests software.aws.solution.clickstream.common.enrich.RuleBasedTrafficSourceHelperTest.testGetMediumByReferrer7

        RuleBasedTrafficSourceHelper parser = RuleBasedTrafficSourceHelper.getInstance("testApp", getRuleConfigV0());
        String pageReferrer = "https://example.com";
        String latestReferrer = "https://www.google.com/search?q=flowers&hl=en&biw=1366&bih=667&source=lnms&tbm=isch&sa=X&ei=0f8yU5r6E8mSyAGFhoGwDw&ved=0CAcQ_AUoAg";
        boolean internalReferrer = false;

        String medium = parser.getMediumByReferrer(pageReferrer, latestReferrer, internalReferrer);
        Assertions.assertEquals(RuleBasedTrafficSourceHelper.ORGANIC, medium);

    }


    @Test
    void testGetMediumByReferrer8() throws IOException {
        // ./gradlew clean test --info --tests software.aws.solution.clickstream.common.enrich.RuleBasedTrafficSourceHelperTest.testGetMediumByReferrer8

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
    void testGetMediumByReferrer9() throws IOException {
        // ./gradlew clean test --info --tests software.aws.solution.clickstream.common.enrich.RuleBasedTrafficSourceHelperTest.testGetMediumByReferrer9

        RuleBasedTrafficSourceHelper parser = RuleBasedTrafficSourceHelper.getInstance("testApp", getRuleConfigV0());
        String pageUrl = "https://example.com/posts/2022/build-serverless-app-on-aws/protect-website-with-cognito/";
        String pageReferrer = null;
        String latestReferrer = "https://i.search.google.se";
        String latestReferrerHost = "i.search.google.se";

        CategoryTrafficSource cts = parser.parse(pageUrl, pageReferrer, latestReferrer, latestReferrerHost);

        String expectedValue = "{\n" +
                "      \"source\" : \"Google\",\n" +
                "      \"medium\" : \"Organic\",\n" +
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
    void testGetMediumByReferrer10() throws IOException {
        // ./gradlew clean test --info --tests software.aws.solution.clickstream.common.enrich.RuleBasedTrafficSourceHelperTest.testGetMediumByReferrer10

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
    void testGetMediumByReferrer11() throws IOException {
        //./gradlew clean test --info --tests software.aws.solution.clickstream.common.enrich.RuleBasedTrafficSourceHelperTest.testGetMediumByReferrer11

        RuleBasedTrafficSourceHelper parser = RuleBasedTrafficSourceHelper.getInstance("testApp", getRuleConfigV0());
        String pageReferrer = "https://example.com";
        String latestReferrer = "https://www.example.com/search?q=flowers&hl=en&biw=1366&bih=667&source=lnms&tbm=isch&sa=X&ei=0f8yU5r6E8mSyAGFhoGwDw&ved=0CAcQ_AUoAg";
        boolean internalReferrer = true;

        String medium = parser.getMediumByReferrer(pageReferrer, latestReferrer, internalReferrer);
        Assertions.assertEquals(RuleBasedTrafficSourceHelper.NONE, medium);

    }


    @Test
    void testGetMediumByReferrer12() throws IOException {
        // ./gradlew clean test --info --tests software.aws.solution.clickstream.common.enrich.RuleBasedTrafficSourceHelperTest.testGetMediumByReferrer12

        RuleBasedTrafficSourceHelper parser = RuleBasedTrafficSourceHelper.getInstance("testApp", getRuleConfigV0());
        String pageUrl = "https://example.com/posts/2024/redshift-serverless-cost-deep-dive/";
        String pageReferrer = "https://example.com";
        String latestReferrer = "https://www.google.com/";
        String latestReferrerHost = "google.com";

        CategoryTrafficSource cts = parser.parse(pageUrl, pageReferrer, latestReferrer, latestReferrerHost);

        String expectedValue = "{\n" +
                "      \"source\" : \"Google\",\n" +
                "      \"medium\" : \"Organic\",\n" +
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

}
