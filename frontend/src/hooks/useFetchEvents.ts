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

import {
  IMetadataBuiltInList,
  MetadataParameterType,
} from '@aws/clickstream-base-lib';
import {
  getBuiltInMetadata,
  getMetadataEventsList,
  getMetadataParametersList,
  getMetadataUserAttributesList,
} from 'apis/analytics';
import { CategoryItemType } from 'components/eventselect/AnalyticsType';
import {
  metadataEventsConvertToCategoryItemType,
  parametersConvertToCategoryItemType,
} from 'pages/analytics/analytics-utils';
import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { defaultStr } from 'ts/utils';

export interface EventDataType {
  metaDataEvents: IMetadataEvent[];
  categoryEvents: CategoryItemType[];
  metaDataEventParameters: IMetadataEventParameter[];
  metaDataUserAttributes: IMetadataUserAttribute[];
  presetParameters: CategoryItemType[];
  groupParameters: CategoryItemType[];
  builtInMetaData?: IMetadataBuiltInList;
}

const getAllBuiltInMetadata = async () => {
  try {
    const { success, data }: ApiResponse<IMetadataBuiltInList> =
      await getBuiltInMetadata();
    if (success) {
      return data;
    }
  } catch (error) {
    console.log(error);
  }
};

const listMetadataEvents = async (projectId, appId) => {
  try {
    const { success, data }: ApiResponse<ResponseTableData<IMetadataEvent>> =
      await getMetadataEventsList({
        projectId: defaultStr(projectId),
        appId: defaultStr(appId),
        attribute: true,
      });
    if (success) {
      const events = metadataEventsConvertToCategoryItemType(data.items);
      return { metaDataEvents: data.items, categoryEvents: events };
    }
  } catch (error) {
    console.log(error);
  }
};

const getAllParameters = async (projectId, appId) => {
  try {
    const {
      success,
      data,
    }: ApiResponse<ResponseTableData<IMetadataEventParameter>> =
      await getMetadataParametersList({
        projectId: defaultStr(projectId),
        appId: defaultStr(appId),
      });
    if (success) {
      return data.items;
    }
  } catch (error) {
    console.log(error);
    return [];
  }
};

const getUserAttributes = async (projectId, appId) => {
  try {
    const {
      success,
      data,
    }: ApiResponse<ResponseTableData<IMetadataUserAttribute>> =
      await getMetadataUserAttributesList({
        projectId: defaultStr(projectId),
        appId: defaultStr(appId),
      });
    if (success) {
      return data.items;
    }
    return [];
  } catch (error) {
    return [];
  }
};

const listAllAttributes = async (projectId, appId) => {
  try {
    const parameters = await getAllParameters(projectId, appId);
    const publicParameters = parameters?.filter(
      (item) => item.parameterType === MetadataParameterType.PUBLIC
    );
    const userAttributes = await getUserAttributes(projectId, appId);
    const conditionOptions = parametersConvertToCategoryItemType(
      userAttributes,
      publicParameters ?? []
    );
    const groupOptions = parametersConvertToCategoryItemType(
      userAttributes,
      parameters ?? []
    );
    return {
      metaDataEventParameters: parameters,
      metaDataUserAttributes: userAttributes,
      presetParameters: conditionOptions,
      groupParameters: groupOptions,
    };
  } catch (error) {
    console.log(error);
  }
};

function useFetchEvents() {
  const { projectId, appId } = useParams();
  const [data, setData] = useState<EventDataType>({
    metaDataEvents: [],
    categoryEvents: [],
    metaDataEventParameters: [],
    metaDataUserAttributes: [],
    presetParameters: [],
    groupParameters: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [eventData, attributeData, builtInMetaData] =
        await Promise.all([
          listMetadataEvents(projectId, appId),
          listAllAttributes(projectId, appId),
          getAllBuiltInMetadata(),
        ]);
      setData({
        metaDataEvents: eventData?.metaDataEvents ?? [],
        categoryEvents: eventData?.categoryEvents ?? [],
        metaDataEventParameters: attributeData?.metaDataEventParameters ?? [],
        metaDataUserAttributes: attributeData?.metaDataUserAttributes ?? [],
        presetParameters: attributeData?.presetParameters ?? [],
        groupParameters: attributeData?.groupParameters ?? [],
        builtInMetaData: builtInMetaData,
      });
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return { data, loading, error };
}

export default useFetchEvents;
