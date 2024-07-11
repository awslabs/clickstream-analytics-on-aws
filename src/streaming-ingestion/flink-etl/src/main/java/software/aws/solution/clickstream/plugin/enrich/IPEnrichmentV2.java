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

import lombok.extern.slf4j.Slf4j;
import software.aws.solution.clickstream.common.enrich.IPEnrichmentHelper;
import software.aws.solution.clickstream.common.model.ClickstreamEvent;
import software.aws.solution.clickstream.common.model.ClickstreamIPEnrichResult;
import software.aws.solution.clickstream.flink.ClickstreamException;

import java.io.File;
import java.io.IOException;
import java.util.Map;

import static software.aws.solution.clickstream.flink.StreamingJob.CACHED_FILE_GEO_LITE_2_CITY_MMDB;

@Slf4j
public final class IPEnrichmentV2 implements ClickstreamEventEnrichment {

    private static final long serialVersionUID = 17054589439690001L;
    private IPEnrichmentHelper helper;
    private File dbFile;

    @Override
    public void config(final Map<String, Object> config) {
       this.dbFile = (File) config.get(CACHED_FILE_GEO_LITE_2_CITY_MMDB);
    }

    public void enrich(final ClickstreamEvent event) {
        String ip = event.getIp();
        if (ip == null || ip.isEmpty()) {
            return;
        }
        if (this.helper == null) {
            try {
                this.helper = IPEnrichmentHelper.from(dbFile);
            } catch (IOException e) {
                log.error("Failed to load IP enrichment database", e);
                throw new ClickstreamException(e);
            }
        }

        ClickstreamIPEnrichResult result = this.helper.enrich(ip);
        event.setGeoCity(result.getCity());
        event.setGeoContinent(result.getContinent());
        event.setGeoCountry(result.getCountry());
    }
}
