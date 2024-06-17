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

import com.maxmind.db.CHMCache;
import com.maxmind.db.MaxMindDbConstructor;
import com.maxmind.db.MaxMindDbParameter;
import com.maxmind.db.Reader;
import lombok.Getter;
import lombok.extern.slf4j.Slf4j;
import software.aws.solution.clickstream.common.Cache;
import software.aws.solution.clickstream.common.model.ClickstreamIPEnrichResult;

import java.io.ByteArrayInputStream;
import java.io.File;
import java.io.IOException;
import java.io.Serializable;
import java.net.InetAddress;
import java.nio.file.Files;
import java.util.Map;
import java.util.Optional;

@Slf4j
public final class IPEnrichmentHelper implements Serializable {
    private static final long serialVersionUID = 17054589439690001L;
    private final byte[] dbFileBytes;
    private static IPEnrichmentHelper instance;
    private static final Cache<ClickstreamIPEnrichResult> CACHED_IP = new Cache<>(1024 * 1024 * 256);

    private IPEnrichmentHelper(final byte[] dbFileBytes) {
        this.dbFileBytes = dbFileBytes;
    }

   public static IPEnrichmentHelper from(final File dbFile) throws IOException {
        if (instance == null) {
            byte[] dbFileBytes = Files.readAllBytes(dbFile.toPath());
            instance = new IPEnrichmentHelper(dbFileBytes);
        }
       return instance;
    }

    public ClickstreamIPEnrichResult enrich(final String ip) {
        log.debug("Enriching IP: {}", ip);
        String firstIp = ip.split(",")[0];

        if (CACHED_IP.containsKey(firstIp)) {
            return CACHED_IP.get(firstIp);
        }
        try {
            try (Reader reader = new Reader(
                    new ByteArrayInputStream(dbFileBytes),
                    new CHMCache(1024 * 128))) {
                final InetAddress ipAddress = InetAddress.getByName(firstIp);
                LookupResult result = reader.get(ipAddress, LookupResult.class);

                String city = Optional.ofNullable(result.getCity()).map(LookupResult.City::getName).orElse(null);
                String continent = Optional.ofNullable(result.getContinent()).map(LookupResult.Continent::getName).orElse(null);
                String country = Optional.ofNullable(result.getCountry()).map(LookupResult.Country::getName).orElse(null);
                ClickstreamIPEnrichResult ipEnriched = new ClickstreamIPEnrichResult(city, continent, country);
                CACHED_IP.put(firstIp, ipEnriched);
                return ipEnriched;
            }
        } catch (Exception e) {
            log.warn(e.getMessage(), e);
        }
        return new ClickstreamIPEnrichResult(null, null, null);
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
