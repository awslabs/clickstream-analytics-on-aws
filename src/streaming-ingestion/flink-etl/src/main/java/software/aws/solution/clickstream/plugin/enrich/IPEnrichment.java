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

package software.aws.solution.clickstream.plugin.enrich;

import com.maxmind.db.CHMCache;
import com.maxmind.db.MaxMindDbConstructor;
import com.maxmind.db.MaxMindDbParameter;
import com.maxmind.db.Reader;
import lombok.Getter;
import org.apache.flink.shaded.jackson2.com.fasterxml.jackson.databind.node.ObjectNode;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import software.amazon.awssdk.core.ResponseBytes;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.model.GetObjectResponse;

import java.io.ByteArrayInputStream;
import java.net.InetAddress;
import java.util.Map;
import java.util.Optional;

public class IPEnrichment implements Enrichment {
    public static final String PARAM_KEY_IP = "ip";
    public static final String PARAM_KEY_LOCALE = "locale";
    public static final String PARAM_KEY_REGION = "region";
    public static final String PARAM_KEY_BUCKET = "geoBucketName";
    public static final String PARAM_KEY_FILE_NAME = "geoFileKey";
    private static final Logger LOG = LoggerFactory.getLogger(IPEnrichment.class);
    public ObjectNode enrich(ObjectNode geoNode, Map<String,String> paramMap) {
        String ip = paramMap.get(PARAM_KEY_IP);
        String locale = paramMap.get(PARAM_KEY_LOCALE);
        String bucket = paramMap.get(PARAM_KEY_BUCKET);
        String fileName = paramMap.get(PARAM_KEY_FILE_NAME);
        LOG.info("IPEnrichment transform begin enrich. ip={}, locale={}, bucket={}, fileName={}, region={}",
                ip, locale, bucket, fileName, paramMap.get(PARAM_KEY_REGION));
        Region region = Region.of(paramMap.get(PARAM_KEY_REGION));
        S3Client s3 = S3Client.builder().region(region).build();
        try {
            GetObjectRequest getObjectRequest = GetObjectRequest.builder()
                    .bucket(bucket)
                    .key(fileName)
                    .build();
            ResponseBytes<GetObjectResponse> objectBytes = s3.getObjectAsBytes(getObjectRequest);
            try (Reader reader = new Reader(
                    new ByteArrayInputStream(objectBytes.asByteArray()),
                    new CHMCache(1024 * 128))) {
                final InetAddress ipAddress = InetAddress.getByName(ip);
                LookupResult result = reader.get(ipAddress, LookupResult.class);
                geoNode.put("city", Optional.ofNullable(result.getCity()).map(LookupResult.City::getName).orElse(null));
                geoNode.put("continent", Optional.ofNullable(result.getContinent()).map(LookupResult.Continent::getName).orElse(null));
                geoNode.put("country", Optional.ofNullable(result.getCountry()).map(LookupResult.Country::getName).orElse(null));
                geoNode.set("metro", null);
                geoNode.set("region", null);
                geoNode.set("sub_continent", null);
                geoNode.put("locale", locale);
            }
        } catch (Exception e) {
            LOG.warn(e.getMessage(), e);
            geoNode.set("city", null);
            geoNode.set("continent", null);
            geoNode.set("country", null);
            geoNode.set("metro", null);
            geoNode.set("region", null);
            geoNode.set("sub_continent", null);
            geoNode.put("locale", locale);
        }
        return geoNode;
    }

    public static class LookupResult {

        @Getter
        private final Country country;
        @Getter
        private final Continent continent;
        @Getter
        private final City city;
        @Getter
        private final Location location;

        @MaxMindDbConstructor
        public LookupResult(final @MaxMindDbParameter(name = "country") Country country,
                            final @MaxMindDbParameter(name = "continent") Continent continent,
                            final @MaxMindDbParameter(name = "city") City city,
                            final @MaxMindDbParameter(name = "location") Location location) {
            this.country = country;
            this.continent = continent;
            this.city = city;
            this.location = location;
        }

        public static class Country {
            @Getter
            private final String name;
            @Getter
            private final String isoCode;

            @MaxMindDbConstructor
            public Country(final @MaxMindDbParameter(name = "names") Map<String, String> names,
                           final @MaxMindDbParameter(name = "iso_code") String isoCode) {
                this.name = names.getOrDefault("en", null);
                this.isoCode = isoCode;
            }
        }

        public static class Continent {
            @Getter
            private final String name;

            @MaxMindDbConstructor
            public Continent(final @MaxMindDbParameter(name = "names") Map<String, String> names) {
                this.name = names.getOrDefault("en", null);
            }
        }

        public static class City {
            @Getter
            private final String name;

            @MaxMindDbConstructor
            public City(final @MaxMindDbParameter(name = "names") Map<String, String> names) {
                this.name = names.getOrDefault("en", null);
            }
        }

        public static class Location {
            @Getter
            private final double latitude;
            @Getter
            private final double longitude;

            @MaxMindDbConstructor
            public Location(final @MaxMindDbParameter(name = "latitude") double latitude,
                            final @MaxMindDbParameter(name = "longitude") double longitude) {
                this.latitude = latitude;
                this.longitude = longitude;
            }
        }
    }
}
