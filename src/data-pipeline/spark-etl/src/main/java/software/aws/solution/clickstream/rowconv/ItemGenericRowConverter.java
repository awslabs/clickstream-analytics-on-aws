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

import org.apache.spark.sql.catalyst.expressions.*;
import software.aws.solution.clickstream.common.model.*;

public final class ItemGenericRowConverter {
    private ItemGenericRowConverter() {
    }
    public static GenericRow toGenericRow(final ClickstreamItem item) {
        return new GenericRow(new Object[]{
                item.getEventTimestamp(),
                item.getEventId(),
                item.getEventName(),
                item.getPlatform(),
                item.getUserPseudoId(),
                item.getUserId(),
                item.getItemId(),
                item.getName(),
                item.getBrand(),
                item.getCurrency(),
                item.getPrice(),
                item.getQuantity(),
                item.getCreativeName(),
                item.getCreativeSlot(),
                item.getLocationId(),
                item.getCategory(),
                item.getCategory2(),
                item.getCategory3(),
                item.getCategory4(),
                item.getCategory5(),
                EventGenericRowConverter.eventParametersToJsonString(item.getCustomParameters()),
                EventGenericRowConverter.eventParametersToGenericRowMap(item.getCustomParameters()),
                item.getProcessInfo(),
                item.getAppId()
        });
    }
}
