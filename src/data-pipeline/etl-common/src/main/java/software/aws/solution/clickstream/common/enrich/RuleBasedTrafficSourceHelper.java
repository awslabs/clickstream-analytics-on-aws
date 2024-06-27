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

import com.fasterxml.jackson.core.JsonProcessingException;
import lombok.Getter;
import lombok.extern.slf4j.Slf4j;
import software.aws.solution.clickstream.common.Cache;
import software.aws.solution.clickstream.common.RuleConfig;
import software.aws.solution.clickstream.common.Util;
import software.aws.solution.clickstream.common.enrich.ts.CategoryTrafficSource;
import software.aws.solution.clickstream.common.enrich.ts.SourceMedium;
import software.aws.solution.clickstream.common.enrich.ts.TrafficSourceHelper;
import software.aws.solution.clickstream.common.enrich.ts.TrafficSourceUtm;
import software.aws.solution.clickstream.common.enrich.ts.rule.CategoryListEvaluator;
import software.aws.solution.clickstream.common.enrich.ts.rule.ChannelListEvaluator;
import software.aws.solution.clickstream.common.enrich.ts.rule.ChannelRuleEvaluatorInput;
import software.aws.solution.clickstream.common.enrich.ts.rule.SourceCategoryAndTerms;
import software.aws.solution.clickstream.common.exception.ExtractDataException;

import java.io.IOException;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static software.aws.solution.clickstream.common.Util.getUriParams;
import static software.aws.solution.clickstream.common.Util.objectToJsonString;
import static software.aws.solution.clickstream.common.Util.parseUrl;

@Slf4j
public final class RuleBasedTrafficSourceHelper implements TrafficSourceHelper {
    public static final String GCLID = "gclid";
    public static final String TYPE = "type";
    public static final String VALUE = "value";
    public static final String DIRECT = "Direct";
    public static final String LINKEDIN = "Linkedin";
    public static final String YOUTUBE = "Youtube";
    public static final String TIKTOK = "Tiktok";
    public static final String BAIDU = "Baidu";
    public static final String GOOGLE = "Google";
    public static final String FACEBOOK = "Facebook";
    public static final String TWITTER = "Twitter";
    public static final String MICROSOFT = "Microsoft";
    public static final String PINTEREST = "Pinterest";
    public static final String BING = "Bing";
    public static final String SOCIAL = "Social";
    public static final String VIDEO = "Video";
    public static final String CPC = "CPC";
    public static final String DISPLAY = "Display";
    public static final String CLID = "clid";
    private static final Map<String, SourceMedium> KNOWN_CLID_TO_MEDIUM_MAP;
    private static final Map<String, RuleBasedTrafficSourceHelper> INSTANCES = new HashMap<>();
    public static final String NONE = "None";
    public static final String REFERRAL = "Referral";
    public static final String ORGANIC = "Organic";
    public static final String INTERNAL = "Internal";
    public static final String SEARCH = "Search";
    public static final String SHOPPING = "Shopping";

    public static final String CHANNEL_RULE_FILE = "ts/traffic_source_channel_rule_v0.json";
    public static final String CATEGORY_RULE_FILE = "ts/traffic_source_category_rule_v0.json";

    static {
        KNOWN_CLID_TO_MEDIUM_MAP = getKnownClidTypeToSourceMediumMap();
    }

    private final CategoryListEvaluator categoryListEvaluator;
    private final ChannelListEvaluator channelListEvaluator;

    private final Cache<CategoryTrafficSource> categoryTrafficSourceCache = new Cache<>();
    @Getter
    private final String appId;

    private RuleBasedTrafficSourceHelper(final String appId, final RuleConfig ruleConfig) {
       String categoryRuleFile = CATEGORY_RULE_FILE;
       String channelRuleFile = CHANNEL_RULE_FILE;

        String channelRuleJson = null;
        String categoryRuleJson = null;

        if (ruleConfig != null) {
            channelRuleJson = ruleConfig.getOptChannelRuleJson();
            categoryRuleJson = ruleConfig.getOptCategoryRuleJson();
        }
        this.appId = appId;
        try {
            if (categoryRuleJson == null) {
                log.warn("categoryRuleJson is null, loading from file: {}", categoryRuleFile);
                categoryRuleJson = Util.readResourceFile(categoryRuleFile);
            }
        } catch (IOException e) {
            log.error("Failed to load category or channel rules categoryRuleFile: {}, error: {}", categoryRuleFile, Util.getStackTrace(e));
            throw new ExtractDataException(e);
        }

        try {
            if (channelRuleJson == null) {
                log.warn("channelRuleJson is null, loading from file: {}", channelRuleFile);
                channelRuleJson = Util.readResourceFile(channelRuleFile);
            }
        } catch (IOException e) {
            log.error("Failed to load category or channel rules channelRuleFile: {}, error: {}", channelRuleFile, Util.getStackTrace(e));
            throw new ExtractDataException(e);
        }

        try {
            this.categoryListEvaluator = CategoryListEvaluator.fromJson(categoryRuleJson);
        } catch (JsonProcessingException e) {
            log.error("Failed to load category or channel rules categoryRuleJson: {}, error: {}", categoryRuleJson, Util.getStackTrace(e));
            throw new ExtractDataException(e);
        }

        try {
            this.channelListEvaluator = ChannelListEvaluator.fromJson(channelRuleJson);
        } catch (JsonProcessingException e) {
            log.error("Failed to load category or channel rules  channelRuleJson: {}, error: {}", channelRuleJson, Util.getStackTrace(e));
            throw new ExtractDataException(e);
        }
    }

    public static RuleBasedTrafficSourceHelper getInstance(final String appId, final RuleConfig ruleConfig) {
        if (INSTANCES.containsKey(appId)) {
            return INSTANCES.get(appId);
        }
        RuleBasedTrafficSourceHelper helper = new RuleBasedTrafficSourceHelper(appId, ruleConfig);
        INSTANCES.put(appId, helper);
        return INSTANCES.get(appId);
    }

    public static Map<String, SourceMedium> getKnownClidTypeToSourceMediumMap() {
        Map<String, SourceMedium> clidTypeToSourceMediumMap = new HashMap<>();
        clidTypeToSourceMediumMap.put(GCLID, new SourceMedium(GOOGLE, CPC));
        return clidTypeToSourceMediumMap;
    }

    private static Map<String, String> createClidTypeValueMap(final String gclid, final Map<String, List<String>> params) {
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

        log.debug("clidMap: {}", clidMap);
        return clidMap;
    }

    private static String getFirst(final List<String> list) {
        return list != null && !list.isEmpty() && !list.get(0).isEmpty()? list.get(0) : null;
    }

    private static boolean isEmpty(final String v, final String emtpyValue) {
        return v == null || v.isEmpty() || v.equalsIgnoreCase(emtpyValue);
    }

    private static boolean isEmpty(final String v) {
        return v == null || v.isEmpty();
    }

    @Override
    public CategoryTrafficSource parse(final String pageUrl, final String pageReferrer, final String latestReferrer, final String latestReferrerHost) {
        log.debug("parser() enter pageUrl: {}, pageReferrer: {}, latestReferrer: {}, latestReferrerHost: {}", pageUrl, pageReferrer, latestReferrer, latestReferrerHost);

        String cachedKey = getCachedKey(pageUrl, pageReferrer, latestReferrer);

        if (categoryTrafficSourceCache.containsKey(cachedKey)) {
            return categoryTrafficSourceCache.get(cachedKey);
        }
        TrafficSourceUtm trafficSourceUtm = new TrafficSourceUtm();
        String pageHostName = null;
        if (pageUrl != null && !pageUrl.isEmpty()) {
            trafficSourceUtm = getUtmSourceFromUrl(pageUrl);
            Optional<UrlParseResult> r = parseUrl(pageUrl);
            if (r.isPresent()) {
                pageHostName = r.get().getHostName();
            }
        }
        CategoryTrafficSource result = parse(trafficSourceUtm, pageHostName, pageReferrer, latestReferrer, latestReferrerHost);
        categoryTrafficSourceCache.put(cachedKey, result);
        return result;
    }

    private TrafficSourceUtm getUtmSourceFromUrl(final String urlInput) {
        TrafficSourceUtm trafficSourceUtm = new TrafficSourceUtm();
        if (urlInput == null || urlInput.isEmpty()) {
            return trafficSourceUtm;
        }

        String url = urlInput;
        if (!urlInput.contains("://")) {
            url = "http://" + url;
        }

        Map<String, List<String>> params = getUriParams(url);
        String utmId = getFirst(params.get("utm_id"));
        String utmSource = getFirst(params.get("utm_source"));
        String utmMedium = getFirst(params.get("utm_medium"));
        String utmContent = getFirst(params.get("utm_content"));
        String utmTerm = getFirst(params.get("utm_term"));
        String gclid = getFirst(params.get(GCLID));
        String utmCampaign = getFirst(params.get("utm_campaign"));
        String utmSourcePlatform = getFirst(params.get("utm_source_platform"));

        log.debug("utmSource: {}, utmMedium: {}, utmContent: {}, utmTerm: {}, utmCampaign: {}, utmId: {}, utmSourcePlatform: {}, gclid: {}",
                utmSource, utmMedium, utmContent, utmTerm, utmCampaign, utmId, utmSourcePlatform, gclid);

        Map<String, String> clidMap = createClidTypeValueMap(gclid, params);

        trafficSourceUtm.setSource(utmSource);
        trafficSourceUtm.setMedium(utmMedium);

        String clidType = clidMap.get(TYPE);

        if (utmSource == null && clidType != null) {
           setSourceAndMediumByClid(clidType, trafficSourceUtm);
        }

        trafficSourceUtm.setCampaign(utmCampaign);
        trafficSourceUtm.setContent(utmContent);
        trafficSourceUtm.setTerm(utmTerm);
        trafficSourceUtm.setCampaignId(utmId);
        trafficSourceUtm.setClidPlatform(utmSourcePlatform);
        if (!clidMap.isEmpty()) {
            try {
                trafficSourceUtm.setClid(objectToJsonString(clidMap));
            } catch (JsonProcessingException e) {
                log.error("Error converting clidMap to string", e);
            }
        }
        return trafficSourceUtm;
    }

    private static void setSourceAndMediumByClid(final String clidType,  final TrafficSourceUtm trafficSourceUtm) {
        String utmSource = null;
        String utmMedium = null;
        if (KNOWN_CLID_TO_MEDIUM_MAP.containsKey(clidType)) {
            utmSource = KNOWN_CLID_TO_MEDIUM_MAP.get(clidType).getSource();
            utmMedium = wrapInferMedium(KNOWN_CLID_TO_MEDIUM_MAP.get(clidType).getMedium());
        } else {
            utmSource = clidType;
            utmMedium = wrapInferMedium(CPC);
        }
        trafficSourceUtm.setSource(utmSource);
        if (trafficSourceUtm.getMedium() == null || trafficSourceUtm.getMedium().isEmpty()) {
            trafficSourceUtm.setMedium(utmMedium);
        }
    }

    public CategoryTrafficSource parse(final TrafficSourceUtm trafficSourceUtmInput, final String theReferrer, final String theReferrerHost) {
        log.debug("trafficSourceUtmInput: {}, theReferrer: {}, theReferrerHost: {}", trafficSourceUtmInput, theReferrer, theReferrerHost);
        TrafficSourceUtm trafficSourceUtm = normEmptyInTrafficSourceUtm(trafficSourceUtmInput);

        SourceCategoryAndTerms sourceCategoryAndTerms = this.categoryListEvaluator.evaluate(theReferrer);

        String source = sourceCategoryAndTerms.getSource();
        String terms = sourceCategoryAndTerms.getTerms();
        String category = sourceCategoryAndTerms.getCategory();

        log.debug("categoryListEvaluator source: {}, terms: {}, category: {}", source, terms, category);

        if (trafficSourceUtm.getSource() == null) {
            trafficSourceUtm.setSource(source);
        }
        if (trafficSourceUtm.getTerm() == null) {
            trafficSourceUtm.setTerm(terms);
        }

        if (trafficSourceUtm.getSource() != null
                && (category == null || CategoryListEvaluator.UNASSIGNED.equals(category))) {
            category = this.categoryListEvaluator.getCategoryBySource(trafficSourceUtm.getSource());
            log.debug("category is null/UNASSIGNED, trying to get category from source: {} -> category: {}", trafficSourceUtm.getSource(), category);
        }

        String medium = getMediumByCategory(trafficSourceUtm, category);
        trafficSourceUtm.setMedium(medium);

        String categoryForEval = category;
        if (CategoryListEvaluator.UNASSIGNED.equals(categoryForEval)) {
            categoryForEval = null;
        }

        ChannelRuleEvaluatorInput evalInput = ChannelRuleEvaluatorInput.from(trafficSourceUtm, categoryForEval, theReferrer, theReferrerHost);
        String channel = this.channelListEvaluator.evaluate(evalInput);

        CategoryTrafficSource categoryTrafficSource = new CategoryTrafficSource(trafficSourceUtm, category, channel);

        if (categoryTrafficSource.getSource() == null) {
            if (theReferrer != null && !theReferrer.isEmpty()) {
                categoryTrafficSource.setSource(theReferrerHost);
            } else {
                categoryTrafficSource.setCampaign(DIRECT);
            }
        }
        log.debug("return categoryTrafficSource: {}", categoryTrafficSource);
        return categoryTrafficSource;

    }


    @Override
    public CategoryTrafficSource parse(final TrafficSourceUtm trafficSourceUtmInput,
                                       final String pageHostName,
                                       final String pageReferrer,
                                       final String latestReferrer,
                                       final String latestReferrerHost) {
        log.debug("parse() enter trafficSourceUtmInput: {}, pageHostName: {}, pageReferrer: {}, latestReferrer: {}, latestReferrerHost: {}",
                trafficSourceUtmInput, pageHostName, pageReferrer, latestReferrer, latestReferrerHost);

        String cachedKey = getCachedKey(trafficSourceUtmInput, pageReferrer, latestReferrer);

        if (categoryTrafficSourceCache.containsKey(cachedKey)) {
            return categoryTrafficSourceCache.get(cachedKey);
        }
        TrafficSourceUtm trafficSourceUtm = normEmptyInTrafficSourceUtm(trafficSourceUtmInput);

        if (trafficSourceUtm.getSource() == null) {
            trafficSourceUtm = getUtmSourceFromUrl(latestReferrer);
        }

        if (trafficSourceUtm.getSource() == null) {
            trafficSourceUtm = getUtmSourceFromUrl(pageReferrer);
        }

        String pageReferrerHost = null;
        if (pageReferrer != null && !pageReferrer.isEmpty()) {
             Optional<UrlParseResult> r = parseUrl(pageReferrer);
             if (r.isPresent()) {
                 pageReferrerHost = r.get().getHostName();
             }
        }
        boolean isInternalReferrer = pageHostName != null && pageHostName.equalsIgnoreCase(pageReferrerHost);
        boolean isInternalLatestReferrer = pageHostName != null && pageHostName.equalsIgnoreCase(latestReferrerHost);

        log.debug("isInternalReferrer: {}, isInternalLatestReferrer: {}", isInternalReferrer, isInternalLatestReferrer);

        CategoryTrafficSource categoryTrafficSource = null;

        if (latestReferrer != null && !latestReferrer.isEmpty() && !isInternalLatestReferrer) {
            categoryTrafficSource = parse(trafficSourceUtm, latestReferrer, latestReferrerHost);
        } else if (pageReferrer != null && !pageReferrer.isEmpty() && !isInternalReferrer) {
            categoryTrafficSource = parse(trafficSourceUtm, pageReferrer, pageReferrerHost);
        } else {
            categoryTrafficSource = parse(trafficSourceUtm, null, null);
        }

        handleUnassignedSource(categoryTrafficSource, pageReferrer, latestReferrer, isInternalReferrer, isInternalLatestReferrer);

        categoryTrafficSourceCache.put(cachedKey, categoryTrafficSource);

        return categoryTrafficSource;
    }

    private static String getCachedKey(final TrafficSourceUtm trafficSourceUtmInput, final String pageReferrer, final String latestReferrer) {
        return String.join("|",
                trafficSourceUtmInput.getSource() == null ? "1" : "1:" + trafficSourceUtmInput.getSource(),
                trafficSourceUtmInput.getMedium() == null ? "2" : "2:" + trafficSourceUtmInput.getMedium(),
                trafficSourceUtmInput.getClid() == null ? "3" : "3:" + trafficSourceUtmInput.getClid(),
                trafficSourceUtmInput.getContent() == null ? "4" : "4:" + trafficSourceUtmInput.getContent(),
                trafficSourceUtmInput.getTerm() == null ? "5" : "5:" + trafficSourceUtmInput.getTerm(),
                trafficSourceUtmInput.getCampaignId() == null ? "6" : "6:" + trafficSourceUtmInput.getCampaignId(),
                trafficSourceUtmInput.getCampaign() == null ? "7" : "7:" + trafficSourceUtmInput.getCampaign(),
                trafficSourceUtmInput.getClidPlatform() == null ? "8" : "8:" + trafficSourceUtmInput.getClidPlatform(),
                pageReferrer == null ? "9" : "9:" + pageReferrer,
                latestReferrer == null ? "10" : "10:" + latestReferrer);
    }

    private static String getCachedKey(final String pageUrl, final String pageReferrer, final String latestReferrer) {
      return String.join("|",
                pageUrl == null ? "1" : "1:" + pageUrl,
                pageReferrer == null ? "2" : "2:" + pageReferrer,
                latestReferrer == null ? "3" : "3:" + latestReferrer);
    }

    private void handleUnassignedSource(final CategoryTrafficSource categoryTrafficSource, final String pageReferrer,
                                        final String latestReferrer,
                                        final boolean isInternalReferrer,
                                        final boolean isInternalLatestReferrer
    ) {
        if (categoryTrafficSource.getSource() != null) {
            if (categoryTrafficSource.getCategory() == null) {
                categoryTrafficSource.setCategory(CategoryListEvaluator.UNASSIGNED);
            }
            if (categoryTrafficSource.getChannelGroup() == null) {
                categoryTrafficSource.setChannelGroup(ChannelListEvaluator.UNASSIGNED);
            }
        }
        boolean isFromInternal = false;

        if (!isEmpty(latestReferrer)) {
            isFromInternal = isInternalLatestReferrer;
        } else if (!isEmpty(pageReferrer)) {
            isFromInternal = isInternalReferrer;
        }

        if (categoryTrafficSource.getSource() == null) {
            categoryTrafficSource.setSource(DIRECT);
            categoryTrafficSource.setCategory(DIRECT);
            if (isFromInternal) {
                categoryTrafficSource.setChannelGroup(INTERNAL);
            } else {
                categoryTrafficSource.setChannelGroup(DIRECT);
            }
        }

        if (categoryTrafficSource.getMedium() == null) {
            categoryTrafficSource.setMedium(getMediumByReferrer(pageReferrer, latestReferrer, isFromInternal));
        }
    }

    String getMediumByCategory(final TrafficSourceUtm trafficSourceUtm, final String category) {
        String medium = trafficSourceUtm.getMedium();
        String clidId = trafficSourceUtm.getClid();
        log.debug("getMediumByCategory() enter category: {}, medium: {}, clidId: {}", category, medium, clidId);
        if (isEmpty(medium) && category != null) {
            if (!isEmpty(clidId)) {
                medium = wrapInferMedium(CPC);
            } else if (category.equals(SEARCH)) {
                medium = wrapInferMedium(ORGANIC);
            } else if ((category.equals(SOCIAL) || category.equals(VIDEO) || category.equals(SHOPPING) || category.equals(REFERRAL))) {
                medium = wrapInferMedium(REFERRAL);
            }
            log.debug("medium is null, trying to get medium from category: {} -> medium: {}", category, medium);
        }
        return medium;
    }

    String getMediumByReferrer(final String pageReferrer, final String latestReferrer, final boolean isFromInternal) {
        log.debug("getMediumByReferrer() enter pageReferrer: {}, latestReferrer: {}, isFromInternal: {}", pageReferrer, latestReferrer, isFromInternal);
        if (isAllEmpty(pageReferrer, latestReferrer)) {
            return NONE;
        }
        if (isFromInternal) {
            return NONE;
        }
        return wrapInferMedium(REFERRAL);
    }

    static String wrapInferMedium(final String medium) {
       return "(" +  medium + ")";
    }

    private static boolean isAllEmpty(final String pageReferrer, final String latestReferrer) {
        return (pageReferrer == null || pageReferrer.isEmpty()) && (latestReferrer == null || latestReferrer.isEmpty());
    }

    private TrafficSourceUtm normEmptyInTrafficSourceUtm(final TrafficSourceUtm trafficSourceUtmInput) {

        TrafficSourceUtm trafficSourceUtm = new TrafficSourceUtm();
        if (trafficSourceUtmInput == null) {
            return trafficSourceUtm;
        }

        if (!isEmpty(trafficSourceUtmInput.getSource(), DIRECT)) {
            trafficSourceUtm.setSource(trafficSourceUtmInput.getSource());
        }
        if (!isEmpty(trafficSourceUtmInput.getMedium(), DIRECT)) {
            trafficSourceUtm.setMedium(trafficSourceUtmInput.getMedium());
        }
        if (!isEmpty(trafficSourceUtmInput.getCampaign(), DIRECT)) {
            trafficSourceUtm.setCampaign(trafficSourceUtmInput.getCampaign());
        }
        if (!isEmpty(trafficSourceUtmInput.getContent())) {
            trafficSourceUtm.setContent(trafficSourceUtmInput.getContent());
        }
        if (!isEmpty(trafficSourceUtmInput.getTerm())) {
            trafficSourceUtm.setTerm(trafficSourceUtmInput.getTerm());
        }
        if (!isEmpty(trafficSourceUtmInput.getCampaignId())) {
            trafficSourceUtm.setCampaignId(trafficSourceUtmInput.getCampaignId());
        }
        if (!isEmpty(trafficSourceUtmInput.getClidPlatform())) {
            trafficSourceUtm.setClidPlatform(trafficSourceUtmInput.getClidPlatform());
        }
        if (!isEmpty(trafficSourceUtmInput.getClid(), "{}")) {
            trafficSourceUtm.setClid(trafficSourceUtmInput.getClid());
        }
        return trafficSourceUtm;
    }

}
