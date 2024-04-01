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


package software.aws.solution.clickstream.common;

import com.fasterxml.jackson.core.*;
import lombok.extern.slf4j.*;
import org.apache.logging.log4j.*;
import org.apache.logging.log4j.core.config.*;

import org.junit.jupiter.api.*;
import software.aws.solution.clickstream.common.enrich.*;
import software.aws.solution.clickstream.common.model.*;

import java.net.*;


@Slf4j
public class DefaultTrafficSourceHelperTest {

    @BeforeEach
    public void init() {
        Configurator.setRootLevel(Level.WARN);
        Configurator.setLevel("software.aws.solution.clickstream", Level.DEBUG);
    }

    @Test
    void testParse() throws URISyntaxException, JsonProcessingException {
        //./gradlew clean test --info --tests software.aws.solution.clickstream.TrafficSourceParserTest.testParse
        DefaultTrafficSourceHelper parser = DefaultTrafficSourceHelper.getInstance();
        DefaultTrafficSourceHelper.ParserResult result = parser.parse("https://www.example.com?utm_source=source&utm_medium=medium&utm_campaign=campaign&utm_content=content&utm_term=term&utm_id=campaignId&utm_source_platform=clidPlatform&xclid=xcidxxxx", null);
        TrafficSource trafficSource = result.getTrafficSource();

        UriInfo uriInfo = result.getUriInfo();

        Assertions.assertEquals("source", trafficSource.getSource());
        Assertions.assertEquals("medium", trafficSource.getMedium());
        Assertions.assertEquals("campaign", trafficSource.getCampaign());
        Assertions.assertEquals("content", trafficSource.getContent());
        Assertions.assertEquals("term", trafficSource.getTerm());
        Assertions.assertEquals("campaignId", trafficSource.getCampaignId());
        Assertions.assertEquals("clidPlatform", trafficSource.getClidPlatform());
        Assertions.assertEquals("{\"type\":\"xclid\",\"value\":\"xcidxxxx\"}", trafficSource.getClid());
        Assertions.assertNull(trafficSource.getChannelGroup());
        Assertions.assertNull(trafficSource.getCategory());

        Assertions.assertEquals("https", uriInfo.getProtocol());
        Assertions.assertEquals("www.example.com", uriInfo.getHost());
        Assertions.assertNull(uriInfo.getPath());
        Assertions.assertEquals("utm_source=source&utm_medium=medium&utm_campaign=campaign&utm_content=content&utm_term=term&utm_id=campaignId&utm_source_platform=clidPlatform&xclid=xcidxxxx", uriInfo.getQuery());
        Assertions.assertEquals("{utm_term=term, utm_id=campaignId, utm_source_platform=clidPlatform, utm_campaign=campaign, xclid=xcidxxxx, utm_medium=medium, utm_source=source, utm_content=content}",
                uriInfo.getParameters().toString());

    }

    @Test
    void testParse2() throws URISyntaxException, JsonProcessingException {
        //./gradlew clean test --info --tests software.aws.solution.clickstream.TrafficSourceParserTest.testParse2
        DefaultTrafficSourceHelper parser = DefaultTrafficSourceHelper.getInstance();
        DefaultTrafficSourceHelper.ParserResult result = parser.parse("https://www.example.com/search?q=abc&q=food" +
                "&utm_campaign=shopping&utm_content=content&utm_id=shopping_id&utm_source_platform=clidPlatform&gclid=gcidxxxx", null);
        TrafficSource trafficSource = result.getTrafficSource();

        log.info("trafficSource: {}", trafficSource);

        Assertions.assertEquals("google", trafficSource.getSource());
        Assertions.assertEquals("cpc", trafficSource.getMedium());
        Assertions.assertEquals("shopping", trafficSource.getCampaign());
        Assertions.assertEquals("content", trafficSource.getContent());
        Assertions.assertEquals("abc,food", trafficSource.getTerm());
        Assertions.assertEquals("shopping_id", trafficSource.getCampaignId());
        Assertions.assertEquals("clidPlatform", trafficSource.getClidPlatform());
        Assertions.assertEquals("{\"type\":\"gclid\",\"value\":\"gcidxxxx\"}", trafficSource.getClid());
        Assertions.assertEquals("Paid Shopping", trafficSource.getChannelGroup());
        Assertions.assertEquals("search", trafficSource.getCategory());
    }

    @Test
    void testParseWithoutProtocol() throws URISyntaxException, JsonProcessingException {
        //./gradlew clean test --info --tests software.aws.solution.clickstream.TrafficSourceParserTest.testParseWithoutProtocol
        DefaultTrafficSourceHelper parser = DefaultTrafficSourceHelper.getInstance();
        DefaultTrafficSourceHelper.ParserResult result = parser.parse("example.com?utm_source=source&utm_medium=medium&utm_campaign=campaign&utm_content=content&utm_term=term&utm_id=campaignId&utm_source_platform=clidPlatform&xclid=xcidxxxx", null);
        TrafficSource trafficSource = result.getTrafficSource();

        UriInfo uriInfo = result.getUriInfo();

        Assertions.assertEquals("source", trafficSource.getSource());
        Assertions.assertEquals("medium", trafficSource.getMedium());
        Assertions.assertEquals("campaign", trafficSource.getCampaign());
        Assertions.assertEquals("content", trafficSource.getContent());
        Assertions.assertEquals("term", trafficSource.getTerm());
        Assertions.assertEquals("campaignId", trafficSource.getCampaignId());
        Assertions.assertEquals("clidPlatform", trafficSource.getClidPlatform());
        Assertions.assertEquals("{\"type\":\"xclid\",\"value\":\"xcidxxxx\"}", trafficSource.getClid());
        Assertions.assertNull(trafficSource.getChannelGroup());
        Assertions.assertNull(trafficSource.getCategory());

        Assertions.assertEquals("http", uriInfo.getProtocol());
        Assertions.assertEquals("example.com", uriInfo.getHost());
        Assertions.assertNull(uriInfo.getPath());


    }

    @Test
    void testParseWithReferrer() throws URISyntaxException, JsonProcessingException {
        //./gradlew clean test --info --tests software.aws.solution.clickstream.TrafficSourceParserTest.testParseWithReferrer
        DefaultTrafficSourceHelper parser = DefaultTrafficSourceHelper.getInstance();
        DefaultTrafficSourceHelper.ParserResult result = parser.parse("https://www.example.com/query_path/abc?utm_source=source&utm_medium=medium&utm_campaign=campaign&utm_content=content&utm_term=term&utm_id=campaignId&utm_source_platform=clidPlatform&xclid=xcidxxxx&q=flowers&q=food&hl=en&biw=1366&bih=667&source=lnms&tbm=isch&sa=X&ei=0f8yU5r6E8mSyAGFhoGwDw&ved=0CAcQ_AUoAg",
                "http://www.google.com/search?q=flowers&hl=en&biw=1366&bih=667&source=lnms&tbm=isch&sa=X&ei=0f8yU5r6E8mSyAGFhoGwDw&ved=0CAcQ_AUoAg");
        TrafficSource trafficSource = result.getTrafficSource();

        Assertions.assertEquals("source", trafficSource.getSource());
        Assertions.assertEquals("medium", trafficSource.getMedium());
        Assertions.assertEquals("campaign", trafficSource.getCampaign());
        Assertions.assertEquals("content", trafficSource.getContent());
        Assertions.assertEquals("term", trafficSource.getTerm());
        Assertions.assertEquals("campaignId", trafficSource.getCampaignId());
        Assertions.assertEquals("clidPlatform", trafficSource.getClidPlatform());
        Assertions.assertEquals("{\"type\":\"xclid\",\"value\":\"xcidxxxx\"}", trafficSource.getClid());
        Assertions.assertNull(trafficSource.getChannelGroup());
        Assertions.assertNull(trafficSource.getCategory());

        UriInfo uriInfo = result.getUriInfo();

        Assertions.assertEquals("{bih=667, hl=en, ei=0f8yU5r6E8mSyAGFhoGwDw, utm_campaign=campaign, utm_medium=medium, source=lnms, sa=X, utm_term=term, utm_id=campaignId, " +
                        "q=flowers,food, " +
                        "biw=1366, utm_source_platform=clidPlatform, ved=0CAcQ_AUoAg, xclid=xcidxxxx, tbm=isch, utm_source=source, utm_content=content}",
                uriInfo.getParameters().toString());

    }


    @Test
    void testParseWithReferrer2() throws URISyntaxException, JsonProcessingException {
        //./gradlew clean test --info --tests software.aws.solution.clickstream.TrafficSourceParserTest.testParseWithReferrer2
        DefaultTrafficSourceHelper parser = DefaultTrafficSourceHelper.getInstance();
        DefaultTrafficSourceHelper.ParserResult result = parser.parse("https://www.example.com/query_path/abc?q=flowers&q=food&hl=en&biw=1366&bih=667&source=lnms&tbm=isch&sa=X&ei=0f8yU5r6E8mSyAGFhoGwDw&ved=0CAcQ_AUoAg",
                "http://www.google.com/search?q=flowers&hl=en&biw=1366&bih=667&source=lnms&tbm=isch&sa=X&ei=0f8yU5r6E8mSyAGFhoGwDw&ved=0CAcQ_AUoAg");
        TrafficSource trafficSource = result.getTrafficSource();

        Assertions.assertEquals("google", trafficSource.getSource());
        Assertions.assertEquals("organic", trafficSource.getMedium());
        Assertions.assertNull(trafficSource.getCampaign());
        Assertions.assertNull(trafficSource.getContent());
        Assertions.assertNull(trafficSource.getTerm());
        Assertions.assertNull(trafficSource.getCampaignId());
        Assertions.assertNull(trafficSource.getClidPlatform());
        Assertions.assertNull(trafficSource.getClid());
        Assertions.assertNull(trafficSource.getChannelGroup());
        Assertions.assertEquals("search", trafficSource.getCategory());

    }

    @Test
    void testGetChannelGroup() {
        //./gradlew clean test --info --tests software.aws.solution.clickstream.TrafficSourceParserTest.testGetChannelGroup
        DefaultTrafficSourceHelper parser = DefaultTrafficSourceHelper.getInstance();
        // "cpc", "ppc", "retargeting", "paid"
        Assertions.assertEquals("Paid Shopping", parser.getChannelGroup("other", "shop",  "paid"));
        Assertions.assertEquals("Paid Shopping", parser.getChannelGroup("other", "shopping",  "ppc"));
        Assertions.assertEquals("Paid Shopping", parser.getChannelGroup("amazon", null, "cpc"));
        Assertions.assertEquals("Paid Shopping", parser.getChannelGroup("walmart", null, "other"));

        Assertions.assertEquals("Paid Social", parser.getChannelGroup("facebook", null, "retargeting"));
        Assertions.assertEquals(null, parser.getChannelGroup("facebook", null, "xxx"));

        Assertions.assertEquals("Paid Search", parser.getChannelGroup("bing", null,  "paid"));
        Assertions.assertEquals(null, parser.getChannelGroup("bing", null,  "xxx"));

        Assertions.assertEquals(null, parser.getChannelGroup("other", "other",  "cpc"));
    }
}
