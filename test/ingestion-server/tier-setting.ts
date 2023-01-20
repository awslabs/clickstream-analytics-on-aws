import { DefaultFleetProps, FleetProps, TierType } from '../../src/ingestion-server/ingestion-server';

/*
Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

export function getDefaultFleetPropsByTier(tier: TierType): FleetProps {
  const commonProps = DefaultFleetProps;
  return {
    LARGE: {
      ...commonProps,
      serverMin: 8,
      serverMax: 8,
      taskMin: 8,
      taskMax: 8,
    },
    MEDIUM: {
      ...commonProps,
      serverMin: 4,
      serverMax: 4,
      taskMin: 4,
      taskMax: 4,
    },
    SMALL: {
      ...commonProps,
      serverMin: 2,
      serverMax: 2,
      taskMin: 2,
      taskMax: 2,
    },
  }[tier];
}
