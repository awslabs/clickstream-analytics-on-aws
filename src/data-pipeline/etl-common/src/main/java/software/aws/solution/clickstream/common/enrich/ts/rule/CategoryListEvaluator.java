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

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.Getter;
import lombok.Setter;
import lombok.extern.slf4j.Slf4j;
import software.aws.solution.clickstream.common.Util;
import software.aws.solution.clickstream.common.enrich.UrlParseResult;

import java.io.File;
import java.io.FileNotFoundException;
import java.io.IOException;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import static software.aws.solution.clickstream.common.Util.readResourceFile;
import static software.aws.solution.clickstream.common.Util.readTextFile;


@Slf4j
@Getter
public final class CategoryListEvaluator {
    public static  final  Pattern HOST_NAME_AND_CONNTRY_PATTERN = Pattern.compile("(.*\\.[a-z]{2,3})\\.[a-z]{2}");

    public static final String UNASSIGNED = "Unassigned";
    @Setter
    Map<String, CategoryItem> categoryMap;

    @Setter
    Map<String, String> sourceCategoryMap;

    private CategoryListEvaluator() {
    }

    public static CategoryListEvaluator fromJson(final String jsonArray) throws JsonProcessingException {
        ObjectMapper objectMapper = new ObjectMapper();
        List<CategoryItem> categoryItems;
        categoryItems = objectMapper.readValue(jsonArray, new TypeReference<List<CategoryItem>>() {
        });
        log.debug("Category rules read: {}", categoryItems.size());

        Map<String, CategoryItem> categoryMap = new HashMap<>();
        Map<String, String> sourceCategoryMap = new HashMap<>();
        for (CategoryItem categoryItem : categoryItems) {
            categoryMap.put(categoryItem.getUrl(), categoryItem);
            sourceCategoryMap.put(categoryItem.getSource(), categoryItem.getCategory());
        }

        log.debug("Category rules map size: {}", categoryMap.size());

        CategoryListEvaluator categoryListEvaluator = new CategoryListEvaluator();
        categoryListEvaluator.setCategoryMap(categoryMap);
        categoryListEvaluator.setSourceCategoryMap(sourceCategoryMap);
        return categoryListEvaluator;
    }


    public static CategoryListEvaluator fromJsonFile(final String fileName) throws IOException {
        File f = new File(fileName);
        if (f.exists() && !f.isDirectory()) {
            log.debug("Reading category rules from file: {}", fileName);
            return fromJson(readTextFile(fileName));
        }

        if (CategoryListEvaluator.class.getClassLoader().getResource(fileName) != null) {
            log.debug("Reading category rules from resource file: {}", fileName);
            return fromJson(readResourceFile(fileName));
        }

        log.error("category rules file not found: {}", fileName);
        throw new FileNotFoundException("category rules file not found: " + fileName);
    }

    public String getCategoryBySource(final String source) {
      return this.sourceCategoryMap.get(source);
    }
    public SourceCategoryAndTerms evaluate(final String theReferrerUrl) {
        log.debug("evaluate() enter theReferrerUrl: {}", theReferrerUrl);
        SourceCategoryAndTerms categoryAndTerms = new SourceCategoryAndTerms();

        if (theReferrerUrl == null || theReferrerUrl.isEmpty()) {
            return categoryAndTerms;
        }

        Optional<UrlParseResult> r = Util.parseUrl(theReferrerUrl);
        String hostName = "";
        String path = "";
        Map<String, List<String>> urlParams = new HashMap<>();

        if (r.isPresent()) {
             hostName = r.get().getHostName();
             path = r.get().getPath();
             urlParams = r.get().getQueryParameters();
        }

        List<String> candidateUrls = getCandidateUrls(theReferrerUrl, hostName, path);

        CategoryItem categoryItem = null;
        for (String candidateUrl : candidateUrls) {
            categoryItem = this.categoryMap.get(candidateUrl);
            if (categoryItem != null) {
                log.debug("Category found for url: {}", theReferrerUrl);
                break;
            }
        }

        if (categoryItem != null) {
            categoryAndTerms.setCategory(categoryItem.getCategory());
            List<String> terms = new ArrayList<>();

            for (String paramKey : categoryItem.getParams()) {
                List<String> values = urlParams.get(paramKey);
                if (values != null) {
                    terms.addAll(values);
                }
            }
            if (!terms.isEmpty()) {
                terms = new ArrayList<>(new HashSet<>(terms));
                terms.sort(Comparator.naturalOrder());
                categoryAndTerms.setTerms(String.join(",", terms));
            }
            categoryAndTerms.setSource(categoryItem.getSource());
        } else {
            categoryAndTerms.setCategory(UNASSIGNED);
            categoryAndTerms.setSource(hostName);
            log.debug("No category found for url: {}", theReferrerUrl);
        }
        log.debug("evaluate() return: {}", categoryAndTerms);
        return categoryAndTerms;
    }

   static List<String> getCandidateUrls(final String theReferrerUrl, final String hostNameInput, final String pathInput) {
        List<String> candidateUrls = new ArrayList<>();
        if (theReferrerUrl.contains("://")) {
            candidateUrls.add(theReferrerUrl.split("://")[1]);
        } else {
            candidateUrls.add(theReferrerUrl);
        }
        boolean hasPath = pathInput != null && !pathInput.isEmpty() && !pathInput.equals("/");
        String path = pathInput;

        if (hasPath && !path.startsWith("/")){
            path = "/" + path; // NOSONAR
        }
        String hostName = hostNameInput;
        if (hostNameInput == null) {
            hostName = "";
        }
        if (hasPath){
            String hostNameAndPath = hostName + path;
            candidateUrls.add(hostNameAndPath);
        }
        candidateUrls.add(hostName);
        if (hostName.startsWith("www.")) {
            String hostNameWithout3w = hostName.substring(4);
            candidateUrls.add(hostNameWithout3w);
            if (hasPath){
                String hostNameWithout3wAndPath = hostNameWithout3w + path;
                candidateUrls.add(hostNameWithout3wAndPath);
            }
        }
        Matcher m = HOST_NAME_AND_CONNTRY_PATTERN.matcher(hostName);
        if (m.matches()) {
            candidateUrls.add(m.group(1));
        }
        if (hostName.startsWith("www.")) {
            Matcher m2 = HOST_NAME_AND_CONNTRY_PATTERN.matcher(hostName.substring(4));
            if (m2.matches()) {
                candidateUrls.add(m2.group(1));
            }
        }

       if (theReferrerUrl.contains(".google.")) {
           candidateUrls.add("google.com");
       }

        List<String> resultList = new ArrayList<>(new HashSet<>(candidateUrls));
        resultList.sort((o1, o2) -> o2.length() - o1.length());
        return resultList;
    }

}
