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
import com.fasterxml.jackson.databind.*;
import lombok.*;
import lombok.extern.slf4j.*;
import software.aws.solution.clickstream.model.*;

import java.net.*;
import java.nio.charset.*;
import java.util.*;


@Slf4j
public class TrafficSourceParser {
    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();
    public static final String GCLID = "gclid";
    public static final String TYPE = "type";
    public static final String VALUE = "value";
    public static final String CLID = "clid";
    public static final String DIRECT = "direct";
    public static final String PAID_SEARCH = "Paid Search";
    public static final String PAID_SOCIAL = "Paid Social";
    public static final String PAID_SHOPPING = "Paid Shopping";
    public static final String ORGANIC_LOWCASE = "organic";
    public static final String SEARCH = "search";
    public static final String SOCIAL = "social";
    public static final String SHOPPING = "shopping";
    public static final String SCOCIAL = "scocial";
    public static final String VIDEO = "video";
    public static final String CPC = "cpc";
    public static final String DISPLAY = "display";
    public static final String LINKEDIN = "linkedin";
    public static final String YOUTUBE = "youtube";
    public static final String TIKTOK = "tiktok";
    public static final String BAIDU = "baidu";
    public static final String GOOGLE = "google";
    public static final String FACEBOOK = "facebook";
    public static final String TWITTER = "twitter";
    public static final String MICROSOFT = "microsoft";
    public static final String PINTEREST = "pinterest";
    public static final String BING = "bing";
    public static final String TRIPADVISOR = "tripadvisor";
    public static final String ANGIESLIST = "angieslist";
    public static final String NEXTDOOR = "nextdoor";

    public ParserResult parse(final String inputUrl, final String referrer) throws URISyntaxException, JsonProcessingException {
        String url = inputUrl;
        if (url == null) {
            url = "";
        }

        if (!url.isEmpty() && !url.substring(0, Math.min(10, url.length())).contains("://")) {
            url = "http://" + url;
        }

        URI uri = new URI(url);
        String host = uri.getHost();
        String path = uri.getPath();
        String query = uri.getQuery();
        String protocol = uri.getScheme();

        Map<String, List<String>> params = splitQuery(uri);

        log.info("params: {}", params);

        // Extract the UTM parameters from the params map
        String utmId = getFirst(params.get("utm_id"));
        String utmSource = getFirst(params.get("utm_source"));
        String utmMedium = getFirst(params.get("utm_medium"));
        String utmContent = getFirst(params.get("utm_content"));
        String utmTerm = getFirst(params.get("utm_term"));
        String gclid = getFirst(params.get(GCLID));
        String utmCampaign = getFirst(params.get("utm_campaign"));
        String utmSourcePlatform = getFirst(params.get("utm_source_platform"));
        String queryQ = null;
        if (params.containsKey("q")) {
            queryQ = String.join(",", params.get("q"));
        }

       log.info("utmSource: {}, utmMedium: {}, utmContent: {}, utmTerm: {}, utmCampaign: {}, utmId: {}, utmSourcePlatform: {}, queryQ: {}, gclid: {}",
         utmSource, utmMedium, utmContent, utmTerm, utmCampaign, utmId, utmSourcePlatform, queryQ, gclid);


        Map<String, String> clidMap = getClidTypeValueMap(gclid, params);

        String clidType = clidMap.get(TYPE);
        Map<String, SourceMedium> clidToMediumMap = getClidTypeToSourceMediumMap();


        if (utmSource == null && clidType != null && clidToMediumMap.containsKey(clidType)) {
            utmSource = clidToMediumMap.get(clidType).getSource();
            utmMedium = clidToMediumMap.get(clidType).getMedium();
        }

        if (utmSource != null && utmTerm == null) {
            utmTerm = queryQ;
        }

        if (utmSource == null && referrer != null) {
            String[] sourceMediumContent = getSourceMediumContentFromReferrer(referrer);
            utmSource = sourceMediumContent[0];
            utmMedium = sourceMediumContent[1];
            utmContent = sourceMediumContent[2];
        }

        if (utmSource == null) {
            utmSource = DIRECT;
            utmCampaign = DIRECT;
        }

        Map<String, String> sourceToCategoryMap = getSourceToCategoryMap();
        String category = sourceToCategoryMap.get(utmSource);

        String channelGroup = getChannelGroup(utmSource, utmCampaign, utmMedium);

        TrafficSource trafficSource = new TrafficSource();
        trafficSource.setSource(utmSource);
        trafficSource.setMedium(utmMedium);
        trafficSource.setCampaign(utmCampaign);
        trafficSource.setContent(utmContent);
        trafficSource.setTerm(utmTerm);
        trafficSource.setCampaignId(utmId);
        trafficSource.setClidPlatform(utmSourcePlatform);
        if (!clidMap.isEmpty()) {
            trafficSource.setClid(OBJECT_MAPPER.writeValueAsString(clidMap));
        }
        trafficSource.setChannelGroup(channelGroup);
        trafficSource.setCategory(category);

        UriInfo uriInfo = new UriInfo();
        uriInfo.setProtocol(protocol);
        uriInfo.setHost(host);
        if (path != null && !path.isEmpty() && !path.equals("/")) {
            uriInfo.setPath(path);
        }
        uriInfo.setQuery(query);
        if (!params.isEmpty()) {
            uriInfo.setParameters(convertToStringMap(params));
        }

        log.info("trafficSource: {}", trafficSource);
        log.info("uriInfo: {}", uriInfo);

        return new ParserResult(trafficSource, uriInfo);
    }

    private String[] getSourceMediumContentFromReferrer(final String referrer) throws URISyntaxException {
        String utmSource = null;
        String utmMedium = null;
        String utmContent = null;

        Map<String, SourceMedium> hostSuffixToMediumMap = getHostSuffixToSourceMediumMap();

        URI referrerUri = new URI(referrer);
        String referrerHost = referrerUri.getHost();
        if (referrerHost != null) {
            for (Map.Entry<String, SourceMedium> entry : hostSuffixToMediumMap.entrySet()) {
                String hostSuffix = entry.getKey();
                if (referrerHost.contains(hostSuffix)) {
                    utmSource = hostSuffixToMediumMap.get(hostSuffix).getSource();
                    utmMedium = hostSuffixToMediumMap.get(hostSuffix).getMedium();
                    break;
                }
            }
            if (utmSource == null) {
                utmSource = referrerHost;
                utmMedium = "referral";
                utmContent = referrer;
            }
        }

        return new String[] {
                utmSource, utmMedium, utmContent
        };

    }

    private static Map<String, String> getClidTypeValueMap(final String gclid, final Map<String, List<String>> params) {
        Map<String, String> clidMap = new HashMap<>();

        if (gclid != null) {
            clidMap.put(TYPE, GCLID);
            clidMap.put(VALUE, gclid);
        } else {
            for (Map.Entry<String, List<String>> entry : params.entrySet()) {
                if (entry.getKey().endsWith(CLID)) {
                    clidMap.put(TYPE, entry.getKey());
                    clidMap.put(VALUE, getFirst(entry.getValue()));
                    break;
                }
            }
        }

        log.info("clidMap: {}", clidMap);
        return clidMap;
    }

    private static Map<String, String> convertToStringMap(final Map<String, List<String>> params) {
        Map<String, String> stringMap = new HashMap<>();
        for (Map.Entry<String, List<String>> entry : params.entrySet()) {
            stringMap.put(entry.getKey(), String.join(",", entry.getValue()));
        }
        return stringMap;
    }

    protected String getChannelGroup(final String utmSource, final String utmCampaign, final String utmMedium) {
        List<String> paidSearchSites = getPaidSearchSites();
        List<String> paidSocialSites = getPaidSocialSites();
        List<String> paidShoppingSites = getPaidShoppingSites();

        log.info("getChannelGroup - utmSource: {}, utmCampaign: {}, utmMedium: {}", utmSource, utmCampaign, utmMedium);

        // 'cpc', 'ppc', 'retargeting', 'paid'
        List<String> mediumList = Arrays.asList("cpc", "ppc", "retargeting", "paid");


        String channelGroup = null;
        if (paidShoppingSites.contains(utmSource)
                || (utmCampaign != null && utmCampaign.toLowerCase().contains("shop")
                && mediumList.contains(utmMedium.toLowerCase()))) {
            channelGroup = PAID_SHOPPING;
        } else if (paidSearchSites.contains(utmSource) && mediumList.contains(utmMedium.toLowerCase())) {
            channelGroup = PAID_SEARCH;
        } else if (paidSocialSites.contains(utmSource) && mediumList.contains(utmMedium.toLowerCase())) {
            channelGroup = PAID_SOCIAL;
        }
        return channelGroup;
    }

    private static Map<String, List<String>> splitQuery(final URI uri) {
        final Map<String, List<String>> queryPairs = new LinkedHashMap<>();
        if (uri.getQuery() == null) {
            return queryPairs;
        }
        final String[] pairs = uri.getQuery().split("&");
        for (String pair : pairs) {
            final int idx = pair.indexOf("=");
            final String key = idx > 0 ? URLDecoder.decode(pair.substring(0, idx), StandardCharsets.UTF_8) : pair;
            if (!queryPairs.containsKey(key)) {
                queryPairs.put(key, new LinkedList<>());
            }
            final String value = idx > 0 && pair.length() > idx + 1 ? URLDecoder.decode(pair.substring(idx + 1), StandardCharsets.UTF_8) : null;
            queryPairs.get(key).add(value);
        }
        return queryPairs;
    }

    private static String getFirst(final List<String> list) {
        return list != null && !list.isEmpty() ? list.get(0) : null;
    }

    private static Map<String, SourceMedium> getClidTypeToSourceMediumMap() {
        Map<String, SourceMedium> clidTypeToSourceMediumMap = new HashMap<>();
        clidTypeToSourceMediumMap.put(GCLID, new SourceMedium(GOOGLE, CPC));
        clidTypeToSourceMediumMap.put("dclid", new SourceMedium(GOOGLE, DISPLAY));
        clidTypeToSourceMediumMap.put("fbclid", new SourceMedium(FACEBOOK, SCOCIAL));
        clidTypeToSourceMediumMap.put("msclid", new SourceMedium(MICROSOFT, CPC));
        clidTypeToSourceMediumMap.put("twclid", new SourceMedium(TWITTER, CPC));
        clidTypeToSourceMediumMap.put("pintclid", new SourceMedium(PINTEREST, CPC));
        clidTypeToSourceMediumMap.put("linclid", new SourceMedium(LINKEDIN, CPC));
        clidTypeToSourceMediumMap.put("ytclid", new SourceMedium(YOUTUBE, VIDEO));
        clidTypeToSourceMediumMap.put("tikclid", new SourceMedium(TIKTOK, VIDEO));
        clidTypeToSourceMediumMap.put("bingclid", new SourceMedium(BING, CPC));
        clidTypeToSourceMediumMap.put("baiduclid", new SourceMedium(BAIDU, CPC));
        return clidTypeToSourceMediumMap;
    }

    private static Map<String, SourceMedium> getHostSuffixToSourceMediumMap() {
        Map<String, SourceMedium> hostToSourceMediumMap = new HashMap<>();
        hostToSourceMediumMap.put("google.com", new SourceMedium(GOOGLE, ORGANIC_LOWCASE));
        hostToSourceMediumMap.put("facebook.com", new SourceMedium(FACEBOOK, ORGANIC_LOWCASE));
        hostToSourceMediumMap.put("microsoft.com", new SourceMedium(MICROSOFT, ORGANIC_LOWCASE));
        hostToSourceMediumMap.put("twitter.com", new SourceMedium(TWITTER, ORGANIC_LOWCASE));
        hostToSourceMediumMap.put("pinterest.com", new SourceMedium(PINTEREST, ORGANIC_LOWCASE));
        hostToSourceMediumMap.put("linkedin.com", new SourceMedium(LINKEDIN, ORGANIC_LOWCASE));
        hostToSourceMediumMap.put("youtube.com", new SourceMedium(YOUTUBE, ORGANIC_LOWCASE));
        hostToSourceMediumMap.put("tiktok.com", new SourceMedium(TIKTOK, ORGANIC_LOWCASE));
        hostToSourceMediumMap.put("bing.com", new SourceMedium(BING, ORGANIC_LOWCASE));
        hostToSourceMediumMap.put("baidu.com", new SourceMedium(BAIDU, ORGANIC_LOWCASE));
        return hostToSourceMediumMap;
    }

    private static Map<String, String> getSourceToCategoryMap() {
        Map<String, String> sourceToCategoryMap = new HashMap<>();
        sourceToCategoryMap.put(GOOGLE, SEARCH);
        sourceToCategoryMap.put(BING, SEARCH);
        sourceToCategoryMap.put("yahoo", SEARCH);
        sourceToCategoryMap.put(BAIDU, SEARCH);
        sourceToCategoryMap.put("yandex", SEARCH);
        sourceToCategoryMap.put("naver", SEARCH);
        sourceToCategoryMap.put("daum", SEARCH);
        sourceToCategoryMap.put("sogou", SEARCH);
        sourceToCategoryMap.put("duckduckgo", SEARCH);
        sourceToCategoryMap.put("ecosia", SEARCH);
        sourceToCategoryMap.put("aol", SEARCH);
        sourceToCategoryMap.put("ask", SEARCH);
        sourceToCategoryMap.put(FACEBOOK, SOCIAL);
        sourceToCategoryMap.put("instagram", SOCIAL);
        sourceToCategoryMap.put(TWITTER, SOCIAL);
        sourceToCategoryMap.put(LINKEDIN, SOCIAL);
        sourceToCategoryMap.put(PINTEREST, SOCIAL);
        sourceToCategoryMap.put(TIKTOK, SOCIAL);
        sourceToCategoryMap.put("snapchat", SOCIAL);
        sourceToCategoryMap.put(YOUTUBE, SOCIAL);
        sourceToCategoryMap.put("vimeo", SOCIAL);
        sourceToCategoryMap.put("flickr", SOCIAL);
        sourceToCategoryMap.put("tumblr", SOCIAL);
        sourceToCategoryMap.put("reddit", SOCIAL);
        sourceToCategoryMap.put("quora", SOCIAL);
        sourceToCategoryMap.put("digg", SOCIAL);
        sourceToCategoryMap.put("delicious", SOCIAL);
        sourceToCategoryMap.put("stumbleupon", SOCIAL);
        sourceToCategoryMap.put("myspace", SOCIAL);
        sourceToCategoryMap.put("hi5", SOCIAL);
        sourceToCategoryMap.put("tagged", SOCIAL);
        sourceToCategoryMap.put("meetup", SOCIAL);
        sourceToCategoryMap.put("meetme", SOCIAL);
        sourceToCategoryMap.put("vk", SOCIAL);
        sourceToCategoryMap.put("weibo", SOCIAL);
        sourceToCategoryMap.put("wechat", SOCIAL);
        sourceToCategoryMap.put("qq", SOCIAL);
        sourceToCategoryMap.put("renren", SOCIAL);
        sourceToCategoryMap.put("kaixin", SOCIAL);
        sourceToCategoryMap.put("douban", SOCIAL);
        sourceToCategoryMap.put("mixi", SOCIAL);
        sourceToCategoryMap.put("cyworld", SOCIAL);
        sourceToCategoryMap.put("orkut", SOCIAL);
        sourceToCategoryMap.put("bebo", SOCIAL);
        sourceToCategoryMap.put("friendster", SOCIAL);
        sourceToCategoryMap.put("xanga", SOCIAL);
        sourceToCategoryMap.put("livejournal", SOCIAL);
        sourceToCategoryMap.put("plurk", SOCIAL);
        sourceToCategoryMap.put("foursquare", SOCIAL);
        sourceToCategoryMap.put("yelp", SOCIAL);
        sourceToCategoryMap.put(TRIPADVISOR, SOCIAL);
        sourceToCategoryMap.put(ANGIESLIST, SOCIAL);
        sourceToCategoryMap.put(NEXTDOOR, SOCIAL);
        sourceToCategoryMap.put("amazon", SHOPPING);
        sourceToCategoryMap.put("ebay", SHOPPING);
        sourceToCategoryMap.put("etsy", SHOPPING);
        sourceToCategoryMap.put("aliexpress", SHOPPING);
        sourceToCategoryMap.put("walmart", SHOPPING);
        sourceToCategoryMap.put("bestbuy", SHOPPING);
        sourceToCategoryMap.put("target", SHOPPING);
        sourceToCategoryMap.put("overstock", SHOPPING);
        sourceToCategoryMap.put("wayfair", SHOPPING);
        sourceToCategoryMap.put("homedepot", SHOPPING);
        return sourceToCategoryMap;

    }


    public static List<String> getPaidShoppingSites() {
        return Arrays.asList("amazon", "ebay", "etsy", "aliexpress", "walmart", "bestbuy", "target", "overstock", "wayfair", "homedepot", "lowes", "costco",
                "sears", "kmart", "macys", "nordstrom");
    }

    public static List<String> getPaidSearchSites() {
        return Arrays.asList(GOOGLE, BING, "yahoo", BAIDU, "yandex", "naver", "daum", "sogou", "duckduckgo", "ecosia", "aol", "ask", "dogpile",
                "excite", "lycos", "webcrawler", "info",
                "infospace", SEARCH, "searchlock", "searchencrypt", "searchy");
    }

    public static List<String> getPaidSocialSites() {
        return Arrays.asList(FACEBOOK, "instagram", TWITTER, LINKEDIN, PINTEREST, TIKTOK, "snapchat", YOUTUBE, "vimeo", "flickr", "tumblr", "reddit", "quora",
                "digg", "delicious", "stumbleupon", "myspace", "hi5", "tagged", "meetup", "meetme", "vk", "weibo", "wechat", "qq", "renren", "kaixin", "douban", "mixi",
                "cyworld", "orkut", "bebo", "friendster", "xanga", "livejournal", "plurk", "foursquare", "yelp", TRIPADVISOR, ANGIESLIST, NEXTDOOR,
                "yelp", TRIPADVISOR, ANGIESLIST, NEXTDOOR);
    }


    @Getter
    @Setter
    @AllArgsConstructor
    public static class ParserResult {
        TrafficSource trafficSource;
        UriInfo uriInfo;
    }

    @Getter
    @AllArgsConstructor
    private static class SourceMedium {
        String source;
        String medium;
    }
}
