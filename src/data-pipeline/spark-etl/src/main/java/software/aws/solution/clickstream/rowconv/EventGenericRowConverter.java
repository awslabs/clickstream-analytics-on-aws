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

package software.aws.solution.clickstream.rowconv;

import com.fasterxml.jackson.core.*;
import com.fasterxml.jackson.databind.*;
import com.fasterxml.jackson.databind.module.*;
import lombok.extern.slf4j.*;
import org.apache.spark.sql.catalyst.expressions.*;
import software.aws.solution.clickstream.common.model.*;
import software.aws.solution.clickstream.exception.ExecuteTransformerException;

import java.util.*;

import static software.aws.solution.clickstream.common.Util.convertStringObjectMapToStringStringMap;
import static software.aws.solution.clickstream.common.Util.getStackTrace;

@Slf4j
public final class EventGenericRowConverter {
    private EventGenericRowConverter() {
    }

    public static Map<String, GenericRow> eventParametersToGenericRowMap(final Map<String, ClickstreamEventPropValue> customParameters) {
        if (customParameters == null || customParameters.isEmpty()) {
            return null; //NOSONAR
        }
        Map<String, GenericRow> rowsMap = new HashMap<>();
        for (Map.Entry<String, ClickstreamEventPropValue> entry : customParameters.entrySet()) {
            rowsMap.put(entry.getKey(), toGenericRow(entry.getValue()));
        }
        return rowsMap;
    }

    private static GenericRow toGenericRow(final ClickstreamEventPropValue value) {
        return new GenericRow(new String[]{
                value.getValue(),
                value.getType().getTypeName()
        });
    }

    public static String eventParametersToJsonString(final Map<String, ClickstreamEventPropValue> customParameters) {
        if (customParameters == null || customParameters.isEmpty()) {
            return null;
        }
        ObjectMapper objectMapper = new ObjectMapper();
        // ClickstreamEventPropValueSerializer is used to serialize ClickstreamEventPropValue
        objectMapper.registerModule(new SimpleModule().addSerializer(ClickstreamEventPropValue.class, new ClickstreamEventPropValueSerializer()));

        try {
            return objectMapper.writeValueAsString(customParameters);
        } catch (JsonProcessingException e) {
            log.error("Failed to serialize customParameters to JSON string {}", getStackTrace(e));
            throw new ExecuteTransformerException(e);
        }
    }

    public static GenericRow toGenericRow(final ClickstreamEvent clickstreamEvent) {
        return new GenericRow(new Object[]{
                clickstreamEvent.getEventTimestamp(),
                clickstreamEvent.getEventId(),
                clickstreamEvent.getEventTimeMsec(),
                clickstreamEvent.getEventName(),
                clickstreamEvent.getEventValue(),
                clickstreamEvent.getEventValueCurrency(),
                clickstreamEvent.getEventBundleSequenceId(),
                clickstreamEvent.getIngestTimeMsec(),
                clickstreamEvent.getDeviceMobileBrandName(),
                clickstreamEvent.getDeviceMobileModelName(),
                clickstreamEvent.getDeviceManufacturer(),
                clickstreamEvent.getDeviceCarrier(),
                clickstreamEvent.getDeviceNetworkType(),
                clickstreamEvent.getDeviceOperatingSystem(),
                clickstreamEvent.getDeviceOperatingSystemVersion(),
                clickstreamEvent.getDeviceVendorId(),
                clickstreamEvent.getDeviceAdvertisingId(),
                clickstreamEvent.getDeviceSystemLanguage(),
                clickstreamEvent.getDeviceTimeZoneOffsetSeconds(),
                clickstreamEvent.getDeviceUaBrowser(),
                clickstreamEvent.getDeviceUaBrowserVersion(),
                clickstreamEvent.getDeviceUaOs(),
                clickstreamEvent.getDeviceUaOsVersion(),
                clickstreamEvent.getDeviceUaDevice(),
                clickstreamEvent.getDeviceUaDeviceCategory(),
                convertStringObjectMapToStringStringMap(clickstreamEvent.getDeviceUa()),
                clickstreamEvent.getDeviceScreenWidth(),
                clickstreamEvent.getDeviceScreenHeight(),
                clickstreamEvent.getDeviceViewportWidth(),
                clickstreamEvent.getDeviceViewportHeight(),
                clickstreamEvent.getGeoContinent(),
                clickstreamEvent.getGeoSubContinent(),
                clickstreamEvent.getGeoCountry(),
                clickstreamEvent.getGeoRegion(),
                clickstreamEvent.getGeoMetro(),
                clickstreamEvent.getGeoCity(),
                clickstreamEvent.getGeoLocale(),
                clickstreamEvent.getTrafficSourceSource(),
                clickstreamEvent.getTrafficSourceMedium(),
                clickstreamEvent.getTrafficSourceCampaign(),
                clickstreamEvent.getTrafficSourceContent(),
                clickstreamEvent.getTrafficSourceTerm(),
                clickstreamEvent.getTrafficSourceCampaignId(),
                clickstreamEvent.getTrafficSourceClidPlatform(),
                clickstreamEvent.getTrafficSourceClid(),
                clickstreamEvent.getTrafficSourceChannelGroup(),
                clickstreamEvent.getTrafficSourceCategory(),
                clickstreamEvent.getUserFirstTouchTimeMsec(),
                clickstreamEvent.getAppPackageId(),
                clickstreamEvent.getAppVersion(),
                clickstreamEvent.getAppTitle(),
                clickstreamEvent.getAppInstallSource(),
                clickstreamEvent.getPlatform(),
                clickstreamEvent.getProjectId(),
                clickstreamEvent.getAppId(),
                clickstreamEvent.getScreenViewScreenName(),
                clickstreamEvent.getScreenViewScreenId(),
                clickstreamEvent.getScreenViewScreenUniqueId(),
                clickstreamEvent.getScreenViewPreviousScreenName(),
                clickstreamEvent.getScreenViewPreviousScreenId(),
                clickstreamEvent.getScreenViewPreviousScreenUniqueId(),
                clickstreamEvent.getScreenViewPreviousTimeMsec(),
                clickstreamEvent.getScreenViewEngagementTimeMsec(),
                clickstreamEvent.getScreenViewEntrances(),
                clickstreamEvent.getPageViewPageReferrer(),
                clickstreamEvent.getPageViewPageReferrerTitle(),
                clickstreamEvent.getPageViewPreviousTimeMsec(),
                clickstreamEvent.getPageViewEngagementTimeMsec(),
                clickstreamEvent.getPageViewPageTitle(),
                clickstreamEvent.getPageViewPageUrl(),
                clickstreamEvent.getPageViewPageUrlPath(),
                clickstreamEvent.getPageViewPageUrlQueryParameters(),
                clickstreamEvent.getPageViewHostname(),
                clickstreamEvent.getPageViewLatestReferrer(),
                clickstreamEvent.getPageViewLatestReferrerHost(),
                clickstreamEvent.getPageViewEntrances(),
                clickstreamEvent.getAppStartIsFirstTime(),
                clickstreamEvent.getUpgradePreviousAppVersion(),
                clickstreamEvent.getUpgradePreviousOsVersion(),
                clickstreamEvent.getSearchKey(),
                clickstreamEvent.getSearchTerm(),
                clickstreamEvent.getOutboundLinkClasses(),
                clickstreamEvent.getOutboundLinkDomain(),
                clickstreamEvent.getOutboundLinkId(),
                clickstreamEvent.getOutboundLinkUrl(),
                clickstreamEvent.getOutboundLink(),
                clickstreamEvent.getUserEngagementTimeMsec(),
                clickstreamEvent.getUserId(),
                clickstreamEvent.getUserPseudoId(),
                clickstreamEvent.getSessionId(),
                clickstreamEvent.getSessionStartTimeMsec(),
                clickstreamEvent.getSessionDuration(),
                clickstreamEvent.getSessionNumber(),
                clickstreamEvent.getScrollEngagementTimeMsec(),
                clickstreamEvent.getSdkErrorCode(),
                clickstreamEvent.getSdkErrorMessage(),
                clickstreamEvent.getSdkVersion(),
                clickstreamEvent.getSdkName(),
                clickstreamEvent.getAppExceptionMessage(),
                clickstreamEvent.getAppExceptionStack(),
                eventParametersToJsonString(clickstreamEvent.getCustomParameters()),
                eventParametersToGenericRowMap(clickstreamEvent.getCustomParameters()),
                clickstreamEvent.getProcessInfo(),
                clickstreamEvent.getUa(),
                clickstreamEvent.getIp(),
        });
    }
}
