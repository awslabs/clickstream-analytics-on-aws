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
import software.aws.solution.clickstream.common.Cache;
import software.aws.solution.clickstream.common.enrich.UAEnrichHelper;
import software.aws.solution.clickstream.common.model.ClickstreamEvent;
import software.aws.solution.clickstream.common.model.ClickstreamUA;

@Slf4j
public class UAEnrichmentV2 implements ClickstreamEventEnrichment {

    private static final long serialVersionUID = 17054589439690001L;
    private final Cache<ClickstreamUA> cache = new Cache();

    public void enrich(final ClickstreamEvent event) {
        String uaString = event.getUa();
        if (uaString == null || uaString.isEmpty()) {
            return;
        }
        ClickstreamUA uaInfo = null;
        if (cache.containsKey(uaString)) {
            uaInfo = cache.get(uaString);
        } else {
            try {
                uaInfo = UAEnrichHelper.parserUA(uaString);
                cache.put(uaString, uaInfo);
            } catch (Exception e) {
                log.warn(e.getMessage(), e);
            }
        }

        if (uaInfo != null) {
            event.setDeviceUa(uaInfo.getUaMap());
            event.setDeviceUaBrowser(uaInfo.getUaBrowser());
            event.setDeviceUaOs(uaInfo.getUaOs());
            event.setDeviceUaBrowserVersion(uaInfo.getUaBrowserVersion());
            event.setDeviceUaDevice(uaInfo.getUaDevice());
            event.setDeviceUaDeviceCategory(uaInfo.getUaDeviceCategory());
            event.setDeviceUaOsVersion(uaInfo.getUaOsVersion());
        }
    }
}
