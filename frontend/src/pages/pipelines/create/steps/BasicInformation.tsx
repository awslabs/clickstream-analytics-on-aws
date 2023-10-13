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
  Alert,
  Autosuggest,
  AutosuggestProps,
  Button,
  Container,
  FormField,
  Header,
  Select,
  SelectProps,
  SpaceBetween,
  StatusIndicator,
  TagEditorProps,
} from '@cloudscape-design/components';
import { getRegionList, getS3BucketList, getVPCList } from 'apis/resource';
import Tags from 'pages/common/Tags';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AWS_REGION_MAP, SDK_LIST } from 'ts/const';
import { isDisabled } from 'ts/utils';

interface BasicInformationProps {
  update?: boolean;
  pipelineInfo: IExtPipeline;
  changeRegion: (region: SelectProps.Option) => void;
  changeVPC: (vpc: SelectProps.Option) => void;
  changeSDK: (sdk: SelectProps.Option) => void;
  changeTags: (tag: TagEditorProps.Tag[]) => void;
  changeS3Bucket: (bucket: string) => void;
  regionEmptyError: boolean;
  vpcEmptyError: boolean;
  sdkEmptyError: boolean;
  assetsS3BucketEmptyError: boolean;
  loadingServiceAvailable: boolean;
  unSupportedServices: string;
}

const BasicInformation: React.FC<BasicInformationProps> = (
  props: BasicInformationProps
) => {
  const { t } = useTranslation();
  const {
    update,
    pipelineInfo,
    changeRegion,
    changeVPC,
    changeSDK,
    changeTags,
    changeS3Bucket,
    regionEmptyError,
    vpcEmptyError,
    sdkEmptyError,
    assetsS3BucketEmptyError,
    loadingServiceAvailable,
    unSupportedServices,
  } = props;
  const [loadingRegion, setLoadingRegion] = useState(false);
  const [loadingVPC, setLoadingVPC] = useState(false);
  const [loadingBucket, setLoadingBucket] = useState(false);
  const [regionOptionList, setRegionOptionList] = useState<SelectProps.Options>(
    []
  );
  const [vpcOptionList, setVPCOptionList] = useState<SelectProps.Options>([]);
  const [s3BucketOptionList, setS3BucketOptionList] =
    useState<AutosuggestProps.Options>([]);

  const sortRegions = (data: RegionResponse[]) => {
    return data.sort((a, b) => a.id.localeCompare(b.id));
  };

  // get all region list
  const getAllRegionList = async () => {
    setLoadingRegion(true);
    try {
      const { success, data }: ApiResponse<RegionResponse[]> =
        await getRegionList();
      if (success) {
        const sortedRegions = sortRegions(data);
        const regionOptions: SelectProps.Options = sortedRegions.map(
          (element) => ({
            label: AWS_REGION_MAP[element.id]?.RegionName
              ? t(AWS_REGION_MAP[element.id].RegionName) || ''
              : '-',
            labelTag: element.id,
            value: element.id,
          })
        );
        setRegionOptionList(regionOptions);
        setLoadingRegion(false);
      }
    } catch (error) {
      setLoadingRegion(false);
    }
  };

  // get vpc list after change region
  const getVPCListByRegion = async (region: string) => {
    setLoadingVPC(true);
    setVPCOptionList([]);
    try {
      const { success, data }: ApiResponse<VPCResponse[]> = await getVPCList({
        region: region,
      });
      if (success) {
        const vpcOptions: SelectProps.Options = data.map((element) => ({
          label: `${element.name}(${element.id})`,
          value: element.id,
          description: element.cidr,
        }));
        setVPCOptionList(vpcOptions);
        setLoadingVPC(false);
      }
    } catch (error) {
      setLoadingVPC(false);
    }
  };

  // get all s3 bucket
  const getAllS3BucketList = async (region: string) => {
    setLoadingBucket(true);
    setS3BucketOptionList([]);
    try {
      const { success, data }: ApiResponse<S3Response[]> =
        await getS3BucketList(region);
      if (success) {
        const s3Options: AutosuggestProps.Options = data.map((element) => ({
          label: `${element.name}`,
          value: `${element.name}`,
        }));
        setS3BucketOptionList(s3Options);
        setLoadingBucket(false);
      }
    } catch (error) {
      setLoadingBucket(false);
    }
  };

  // Monitor region change
  useEffect(() => {
    if (
      !update &&
      pipelineInfo.selectedRegion &&
      pipelineInfo.selectedRegion.value
    ) {
      getVPCListByRegion(pipelineInfo.selectedRegion.value);
      getAllS3BucketList(pipelineInfo.selectedRegion.value);
    }
  }, [pipelineInfo.selectedRegion]);

  useEffect(() => {
    if (!update) {
      getAllRegionList();
    }
  }, []);

  return (
    <Container
      header={<Header variant="h2">{t('pipeline:create.pipeline')}</Header>}
    >
      <SpaceBetween direction="vertical" size="l">
        <FormField
          label={t('pipeline:create.awsRegion')}
          description={t('pipeline:create.awsRegionDesc')}
          errorText={regionEmptyError ? t('pipeline:valid.regionEmpty') : ''}
        >
          <Select
            disabled={
              loadingServiceAvailable || isDisabled(update, pipelineInfo)
            }
            filteringType="auto"
            placeholder={t('pipeline:create.awsRegionPlaceholder') ?? ''}
            selectedOption={pipelineInfo.selectedRegion}
            options={regionOptionList}
            selectedAriaLabel="Selected"
            statusType={loadingRegion ? 'loading' : 'finished'}
            onChange={(e) => {
              changeRegion(e.detail.selectedOption);
            }}
          />
          {loadingServiceAvailable && (
            <StatusIndicator type="loading">
              {t('checkingAvailable')}
            </StatusIndicator>
          )}

          {pipelineInfo.showServiceStatus && unSupportedServices && (
            <div className="mt-10">
              <Alert type="warning">
                {t('pipeline:create.notSupportedServices', {
                  unSupportedServices: unSupportedServices,
                })}
              </Alert>
            </div>
          )}
        </FormField>

        <FormField
          label={t('pipeline:create.vpc')}
          description={t('pipeline:create.vpcDesc')}
          secondaryControl={
            !update || pipelineInfo.status?.status === 'Failed' ? (
              <Button
                disabled={!pipelineInfo.region}
                loading={loadingVPC}
                iconName="refresh"
                onClick={() => {
                  getVPCListByRegion(pipelineInfo.region);
                }}
              />
            ) : null
          }
          errorText={vpcEmptyError ? t('pipeline:valid.vpcEmpty') : ''}
        >
          <Select
            filteringType="auto"
            disabled={isDisabled(update, pipelineInfo)}
            placeholder={t('pipeline:create.vpcPlaceholder') ?? ''}
            selectedOption={pipelineInfo.selectedVPC}
            options={vpcOptionList}
            selectedAriaLabel="Selected"
            statusType={loadingVPC ? 'loading' : 'finished'}
            onChange={(e) => {
              changeVPC(e.detail.selectedOption);
            }}
          />
        </FormField>

        <FormField
          label={t('pipeline:create.dataSDK')}
          description={t('pipeline:create.dataSDKDesc')}
          errorText={sdkEmptyError ? t('pipeline:valid.sdkEmpty') : ''}
        >
          <Select
            disabled={isDisabled(update, pipelineInfo)}
            placeholder={t('pipeline:create.dataSDKPlaceholder') ?? ''}
            selectedOption={pipelineInfo.selectedSDK}
            options={SDK_LIST}
            selectedAriaLabel="Selected"
            onChange={(e) => {
              changeSDK(e.detail.selectedOption);
            }}
          />
        </FormField>

        <FormField
          label={t('pipeline:create.s3Assets')}
          description={t('pipeline:create.s3AssetsDesc')}
          secondaryControl={
            !update || pipelineInfo.status?.status === 'Failed' ? (
              <Button
                disabled={!pipelineInfo.region}
                loading={loadingBucket}
                iconName="refresh"
                onClick={() => {
                  getAllS3BucketList(pipelineInfo.region);
                }}
              />
            ) : null
          }
          errorText={
            assetsS3BucketEmptyError ? t('pipeline:valid.s3BucketEmpty') : ''
          }
        >
          <Autosuggest
            disabled={isDisabled(update, pipelineInfo)}
            placeholder={t('pipeline:create.selectS3') ?? ''}
            statusType={loadingBucket ? 'loading' : 'finished'}
            onChange={({ detail }) => changeS3Bucket(detail.value)}
            value={pipelineInfo.ingestionServer.loadBalancer.logS3Bucket.name}
            options={s3BucketOptionList}
            enteredTextLabel={(value) => `${t('use')}: "${value}"`}
          />
        </FormField>

        <Tags
          tags={pipelineInfo.tags}
          changeTags={(tags) => {
            changeTags(tags);
          }}
        />
      </SpaceBetween>
    </Container>
  );
};

export default BasicInformation;
