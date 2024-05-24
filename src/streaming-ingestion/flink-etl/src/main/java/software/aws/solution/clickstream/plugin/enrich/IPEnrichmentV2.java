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

import java.io.File;
import java.io.IOException;

@Slf4j
public final class IPEnrichmentV2 implements ClickstreamEventEnrichment {
    private static IPEnrichmentV2 instance;

    private static final long serialVersionUID = 17054589439690001L;
    private final IPEnrichmentHelper helper;


    private IPEnrichmentV2(final File dbFile) throws IOException {
        this.helper = IPEnrichmentHelper.from(dbFile);
    }

    public static synchronized IPEnrichmentV2 getInstance(final File dbFile) throws IOException {
        if (instance == null) {
            instance = new IPEnrichmentV2(dbFile);
        }
        return instance;
    }


    public void enrich(final ClickstreamEvent event) {
        String ip = event.getIp();
        if (ip == null || ip.isEmpty()) {
            return;
        }
        ClickstreamIPEnrichResult result = this.helper.enrich(ip);
        event.setGeoCity(result.getCity());
        event.setGeoContinent(result.getContinent());
        event.setGeoCountry(result.getCountry());

    }
}
