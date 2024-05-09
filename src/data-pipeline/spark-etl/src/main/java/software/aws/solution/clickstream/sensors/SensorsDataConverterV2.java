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

package software.aws.solution.clickstream.sensors;

import lombok.extern.slf4j.Slf4j;
import software.aws.solution.clickstream.common.TransformConfig;
import software.aws.solution.clickstream.udfconverter.BaseDataConverter;
import software.aws.solution.clickstream.transformer.TransformerNameEnum;

import static software.aws.solution.clickstream.transformer.TransformerNameEnum.SENSORS_DATA;
@Slf4j
public class SensorsDataConverterV2 extends BaseDataConverter {
    private final TransformConfig transformConfig;

    public SensorsDataConverterV2(final TransformConfig transformConfig) {
        this.transformConfig = transformConfig;
    }

    @Override
    public TransformerNameEnum getName() {
        return SENSORS_DATA;
    }

    @Override
    public TransformConfig getTransformConfig() {
        return this.transformConfig;
    }
}
