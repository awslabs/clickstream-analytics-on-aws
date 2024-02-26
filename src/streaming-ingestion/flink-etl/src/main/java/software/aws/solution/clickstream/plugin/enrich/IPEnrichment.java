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
import lombok.extern.slf4j.Slf4j;
import org.apache.flink.shaded.jackson2.com.fasterxml.jackson.databind.node.ObjectNode;
import software.aws.solution.clickstream.flink.Utils;

import java.io.ByteArrayInputStream;
import java.net.InetAddress;
import java.util.Map;
import java.util.Optional;

@Slf4j
public class IPEnrichment implements Enrichment {
    public static final String PARAM_KEY_IP = "ip";
    public static final String PARAM_KEY_LOCALE = "locale";
    private static final long serialVersionUID = 17054589439690001L;
    private final String bucket;
    private final String fileName;
    private final String region;
    private transient byte[] geoFileBytes;

    public IPEnrichment(final String bucket, final String fileName, final String region) {
        this.bucket = bucket;
        this.fileName = fileName;
        this.region = region;
    }

    public ObjectNode enrich(final ObjectNode geoNode, final Map<String, String> paramMap) {
        String ip = paramMap.get(PARAM_KEY_IP).split(",")[0];
        String locale = paramMap.get(PARAM_KEY_LOCALE);
        try {

            if (this.geoFileBytes == null) {
                this.geoFileBytes = Utils.getInstance().readS3BinaryFile(this.bucket, this.fileName, this.region);
            }

            try (Reader reader = new Reader(
                    new ByteArrayInputStream(this.geoFileBytes),
                    new CHMCache(1024 * 128))) {
                final InetAddress ipAddress = InetAddress.getByName(ip);
                LookupResult result = reader.get(ipAddress, LookupResult.class);

                String city = Optional.ofNullable(result.getCity()).map(LookupResult.City::getName).orElse(null);
                String continent = Optional.ofNullable(result.getContinent()).map(LookupResult.Continent::getName).orElse(null);
                String country = Optional.ofNullable(result.getCountry()).map(LookupResult.Country::getName).orElse(null);

                geoNode.put("city", city);
                geoNode.put("continent", continent);
                geoNode.put("country", country);
                geoNode.set("metro", null);
                geoNode.set("region", null);
                geoNode.set("sub_continent", null);
                geoNode.put(PARAM_KEY_LOCALE, locale);
            }
        } catch (Exception e) {
            log.warn(e.getMessage(), e);
            geoNode.set("city", null);
            geoNode.set("continent", null);
            geoNode.set("country", null);
            geoNode.set("metro", null);
            geoNode.set("region", null);
            geoNode.set("sub_continent", null);
            geoNode.put(PARAM_KEY_LOCALE, locale);
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
