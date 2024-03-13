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


package software.aws.solution.clickstream;

import com.fasterxml.jackson.core.*;
import lombok.extern.slf4j.*;
import org.apache.logging.log4j.*;
import org.apache.logging.log4j.core.config.*;
import org.junit.jupiter.api.*;
import software.aws.solution.clickstream.model.*;

import java.net.*;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

@Slf4j
public class TrafficSourceParserTest {

    @BeforeEach
    public void init() {
        Configurator.setRootLevel(Level.WARN);
        Configurator.setLevel("software.aws.solution.clickstream", Level.DEBUG);
    }

    @Test
    void testParse() throws URISyntaxException, JsonProcessingException {
        //./gradlew clean test --info --tests software.aws.solution.clickstream.TrafficSourceParserTest.testParse
        TrafficSourceParser parser = new TrafficSourceParser();
        TrafficSourceParser.ParserResult result = parser.parse("https://www.example.com?utm_source=source&utm_medium=medium&utm_campaign=campaign&utm_content=content&utm_term=term&utm_id=campaignId&utm_source_platform=clidPlatform&xclid=xcidxxxx", null);
        TrafficSource trafficSource = result.getTrafficSource();

        UriInfo uriInfo = result.getUriInfo();

        assertEquals("source", trafficSource.getSource());
        assertEquals("medium", trafficSource.getMedium());
        assertEquals("campaign", trafficSource.getCampaign());
        assertEquals("content", trafficSource.getContent());
        assertEquals("term", trafficSource.getTerm());
        assertEquals("campaignId", trafficSource.getCampaignId());
        assertEquals("clidPlatform", trafficSource.getClidPlatform());
        assertEquals("{\"type\":\"xclid\",\"value\":\"xcidxxxx\"}", trafficSource.getClid());
        assertNull(trafficSource.getChannelGroup());
        assertNull(trafficSource.getCategory());

        assertEquals("https", uriInfo.getProtocol());
        assertEquals("www.example.com", uriInfo.getHost());
        assertNull(uriInfo.getPath());
        assertEquals("utm_source=source&utm_medium=medium&utm_campaign=campaign&utm_content=content&utm_term=term&utm_id=campaignId&utm_source_platform=clidPlatform&xclid=xcidxxxx", uriInfo.getQuery());
        assertEquals("{utm_term=term, utm_id=campaignId, utm_source_platform=clidPlatform, utm_campaign=campaign, xclid=xcidxxxx, utm_medium=medium, utm_source=source, utm_content=content}",
                uriInfo.getParameters().toString());

    }

    @Test
    void testParse2() throws URISyntaxException, JsonProcessingException {
        //./gradlew clean test --info --tests software.aws.solution.clickstream.TrafficSourceParserTest.testParse2
        TrafficSourceParser parser = new TrafficSourceParser();
        TrafficSourceParser.ParserResult result = parser.parse("https://www.example.com/search?q=abc&q=food" +
                "&utm_campaign=shopping&utm_content=content&utm_id=shopping_id&utm_source_platform=clidPlatform&gclid=gcidxxxx", null);
        TrafficSource trafficSource = result.getTrafficSource();

        log.info("trafficSource: {}", trafficSource);

        assertEquals("google", trafficSource.getSource());
        assertEquals("cpc", trafficSource.getMedium());
        assertEquals("shopping", trafficSource.getCampaign());
        assertEquals("content", trafficSource.getContent());
        assertEquals("abc,food", trafficSource.getTerm());
        assertEquals("shopping_id", trafficSource.getCampaignId());
        assertEquals("clidPlatform", trafficSource.getClidPlatform());
        assertEquals("{\"type\":\"gclid\",\"value\":\"gcidxxxx\"}", trafficSource.getClid());
        assertEquals("Paid Shopping", trafficSource.getChannelGroup());
        assertEquals("search", trafficSource.getCategory());
    }

    @Test
    void testParseWithoutProtocol() throws URISyntaxException, JsonProcessingException {
        //./gradlew clean test --info --tests software.aws.solution.clickstream.TrafficSourceParserTest.testParseWithoutProtocol
        TrafficSourceParser parser = new TrafficSourceParser();
        TrafficSourceParser.ParserResult result = parser.parse("example.com?utm_source=source&utm_medium=medium&utm_campaign=campaign&utm_content=content&utm_term=term&utm_id=campaignId&utm_source_platform=clidPlatform&xclid=xcidxxxx", null);
        TrafficSource trafficSource = result.getTrafficSource();

        UriInfo uriInfo = result.getUriInfo();

        assertEquals("source", trafficSource.getSource());
        assertEquals("medium", trafficSource.getMedium());
        assertEquals("campaign", trafficSource.getCampaign());
        assertEquals("content", trafficSource.getContent());
        assertEquals("term", trafficSource.getTerm());
        assertEquals("campaignId", trafficSource.getCampaignId());
        assertEquals("clidPlatform", trafficSource.getClidPlatform());
        assertEquals("{\"type\":\"xclid\",\"value\":\"xcidxxxx\"}", trafficSource.getClid());
        assertNull(trafficSource.getChannelGroup());
        assertNull(trafficSource.getCategory());

        assertEquals("http", uriInfo.getProtocol());
        assertEquals("example.com", uriInfo.getHost());
        assertNull(uriInfo.getPath());


    }

    @Test
    void testParseWithReferrer() throws URISyntaxException, JsonProcessingException {
        //./gradlew clean test --info --tests software.aws.solution.clickstream.TrafficSourceParserTest.testParseWithReferrer
        TrafficSourceParser parser = new TrafficSourceParser();
        TrafficSourceParser.ParserResult result = parser.parse("https://www.example.com/query_path/abc?utm_source=source&utm_medium=medium&utm_campaign=campaign&utm_content=content&utm_term=term&utm_id=campaignId&utm_source_platform=clidPlatform&xclid=xcidxxxx&q=flowers&q=food&hl=en&biw=1366&bih=667&source=lnms&tbm=isch&sa=X&ei=0f8yU5r6E8mSyAGFhoGwDw&ved=0CAcQ_AUoAg",
                "http://www.google.com/search?q=flowers&hl=en&biw=1366&bih=667&source=lnms&tbm=isch&sa=X&ei=0f8yU5r6E8mSyAGFhoGwDw&ved=0CAcQ_AUoAg");
        TrafficSource trafficSource = result.getTrafficSource();

        assertEquals("source", trafficSource.getSource());
        assertEquals("medium", trafficSource.getMedium());
        assertEquals("campaign", trafficSource.getCampaign());
        assertEquals("content", trafficSource.getContent());
        assertEquals("term", trafficSource.getTerm());
        assertEquals("campaignId", trafficSource.getCampaignId());
        assertEquals("clidPlatform", trafficSource.getClidPlatform());
        assertEquals("{\"type\":\"xclid\",\"value\":\"xcidxxxx\"}", trafficSource.getClid());
        assertNull(trafficSource.getChannelGroup());
        assertNull(trafficSource.getCategory());

        UriInfo uriInfo = result.getUriInfo();

        assertEquals("{bih=667, hl=en, ei=0f8yU5r6E8mSyAGFhoGwDw, utm_campaign=campaign, utm_medium=medium, source=lnms, sa=X, utm_term=term, utm_id=campaignId, " +
                        "q=flowers,food, " +
                        "biw=1366, utm_source_platform=clidPlatform, ved=0CAcQ_AUoAg, xclid=xcidxxxx, tbm=isch, utm_source=source, utm_content=content}",
                uriInfo.getParameters().toString());

    }


    @Test
    void testParseWithReferrer2() throws URISyntaxException, JsonProcessingException {
        //./gradlew clean test --info --tests software.aws.solution.clickstream.TrafficSourceParserTest.testParseWithReferrer2
        TrafficSourceParser parser = new TrafficSourceParser();
        TrafficSourceParser.ParserResult result = parser.parse("https://www.example.com/query_path/abc?q=flowers&q=food&hl=en&biw=1366&bih=667&source=lnms&tbm=isch&sa=X&ei=0f8yU5r6E8mSyAGFhoGwDw&ved=0CAcQ_AUoAg",
                "http://www.google.com/search?q=flowers&hl=en&biw=1366&bih=667&source=lnms&tbm=isch&sa=X&ei=0f8yU5r6E8mSyAGFhoGwDw&ved=0CAcQ_AUoAg");
        TrafficSource trafficSource = result.getTrafficSource();

        assertEquals("google", trafficSource.getSource());
        assertEquals("organic", trafficSource.getMedium());
        assertNull(trafficSource.getCampaign());
        assertNull(trafficSource.getContent());
        assertNull(trafficSource.getTerm());
        assertNull(trafficSource.getCampaignId());
        assertNull(trafficSource.getClidPlatform());
        assertNull(trafficSource.getClid());
        assertNull(trafficSource.getChannelGroup());
        assertEquals("search", trafficSource.getCategory());

    }

    @Test
    void testGetChannelGroup() {
        //./gradlew clean test --info --tests software.aws.solution.clickstream.TrafficSourceParserTest.testGetChannelGroup
        TrafficSourceParser parser = new TrafficSourceParser();
        // "cpc", "ppc", "retargeting", "paid"
        assertEquals("Paid Shopping", parser.getChannelGroup("other", "shop",  "paid"));
        assertEquals("Paid Shopping", parser.getChannelGroup("other", "shopping",  "ppc"));
        assertEquals("Paid Shopping", parser.getChannelGroup("amazon", null, "cpc"));
        assertEquals("Paid Shopping", parser.getChannelGroup("walmart", null, "other"));

        assertEquals("Paid Social", parser.getChannelGroup("facebook", null, "retargeting"));
        assertEquals(null, parser.getChannelGroup("facebook", null, "xxx"));

        assertEquals("Paid Search", parser.getChannelGroup("bing", null,  "paid"));
        assertEquals(null, parser.getChannelGroup("bing", null,  "xxx"));

        assertEquals(null, parser.getChannelGroup("other", "other",  "cpc"));
    }
}
