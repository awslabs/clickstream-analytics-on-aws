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

import lombok.extern.slf4j.*;
import software.aws.solution.clickstream.common.enrich.*;
import software.aws.solution.clickstream.common.exception.*;

import java.io.*;
import java.net.*;
import java.nio.charset.*;
import java.util.*;
import java.util.zip.*;

@Slf4j
public final class Util {

    public static final String ERROR_LOG = ", error: ";
    public static final String VALUE_LOG = ", value: ";

    private Util() {
    }

    public static String decompress(final byte[] str) {
        if (str == null) {
            return "";
        }
        GZIPInputStream gis;
        try {
            gis = new GZIPInputStream(new ByteArrayInputStream(str));
            BufferedReader bf = new BufferedReader(new InputStreamReader(gis, StandardCharsets.UTF_8));
            StringBuilder outStr = new StringBuilder();
            String line;
            while ((line = bf.readLine()) != null) {
                outStr.append(line);
            }
            return outStr.toString();
        } catch (IOException e) {
            log.error("decompress error:" + e.getMessage());
            throw new ExtractDataException(e);
        }
    }


    public static Map<String, List<String>> getUriParams(final String uri) {
        Map<String, List<String>> params = new HashMap<>();
        try {
            URI uriObj = new URI(uri);
            String query = uriObj.getQuery();
            if (query != null) {
                String[] pairs = query.split("&");
                for (String pair : pairs) {
                    int idx = pair.indexOf("=");
                    String key = idx > 0 ? pair.substring(0, idx) : pair;
                    if (!params.containsKey(key)) {
                        params.put(key, new ArrayList<>());
                    }
                    String value = idx > 0 && pair.length() > idx + 1 ? pair.substring(idx + 1) : null;
                    params.get(key).add(deCodeUri(value));
                }
            }
        } catch (URISyntaxException e) {
            log.warn("cannot parse uri: " + uri + ERROR_LOG + e.getMessage());
        }
        return params;
    }

    public static UrlParseResult parseUrl(final String url) {
        if (url == null) {
            return null;
        }
        UrlParseResult result = new UrlParseResult();
        try {
            URI uri = new URI(url);
            result.setHostName(uri.getHost());
            result.setPath(uri.getPath());
            result.setQueryString(deCodeUri(uri.getQuery()));
            result.setQueryParameters(getUriParams(url));
        } catch (URISyntaxException e) {
            log.warn("cannot parse url: " + url + ERROR_LOG + e.getMessage());
        }
        return result;
    }

    public static String deCodeUri(final String uri) {
        if (uri == null) {
            return null;
        }
        try {
            return URLDecoder.decode(uri, "utf-8");
        } catch (Exception e) {
            log.warn(e.getMessage() + ", uri:" + uri);
            return uri;
        }
    }

    public static Map<String, String> convertUriParamsToStrMap(final Map<String, List<String>> uriParams) {
        Map<String, String> result = new HashMap<>();
        for (Map.Entry<String, List<String>> entry : uriParams.entrySet()) {
            result.put(entry.getKey(), String.join(",", entry.getValue()));
        }
        return result;
    }
}
