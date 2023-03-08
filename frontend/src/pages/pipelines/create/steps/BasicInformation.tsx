import {
  Container,
  FormField,
  Header,
  Input,
  Select,
  SelectProps,
  SpaceBetween,
  TagEditorProps,
  Textarea,
} from '@cloudscape-design/components';
import { getSDKTypeList } from 'apis/dictionary';
import { getRegionList, getVPCList } from 'apis/resource';
import InfoLink from 'components/common/InfoLink';
import Tags from 'pages/common/Tags';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

interface BasicInformationProps {
  pipelineInfo: IExtPipeline;
  changePipelineName: (name: string) => void;
  changeDescription: (desc: string) => void;
  changeRegion: (region: SelectProps.Option) => void;
  changeVPC: (vpc: SelectProps.Option) => void;
  changeSDK: (sdk: SelectProps.Option) => void;
  changeTags: (tag: TagEditorProps.Tag[]) => void;
  nameEmptyError: boolean;
  regionEmptyError: boolean;
  vpcEmptyError: boolean;
  sdkEmptyError: boolean;
}

const BasicInformation: React.FC<BasicInformationProps> = (
  props: BasicInformationProps
) => {
  const { t } = useTranslation();
  const {
    pipelineInfo,
    changePipelineName,
    changeDescription,
    changeRegion,
    changeVPC,
    changeSDK,
    changeTags,
    nameEmptyError,
    regionEmptyError,
    vpcEmptyError,
    sdkEmptyError,
  } = props;
  const [loadingRegion, setLoadingRegion] = useState(false);
  const [loadingVPC, setLoadingVPC] = useState(false);
  const [loadingSDK, setLoadingSDK] = useState(false);
  const [regionOptionList, setRegionOptionList] = useState<SelectProps.Options>(
    []
  );
  const [vpcOptionList, setVPCOptionList] = useState<SelectProps.Options>([]);
  const [sdkOptionList, setSDKOptionList] = useState<SelectProps.Options>([]);

  // get all region list
  const getAllRegionList = async () => {
    setLoadingRegion(true);
    try {
      const { success, data }: ApiResponse<RegionResponse[]> =
        await getRegionList();
      if (success) {
        const regionOptions: SelectProps.Options = data.map((element) => ({
          label: element.id,
          value: element.id,
        }));
        setRegionOptionList(regionOptions);
        setLoadingRegion(false);
      }
    } catch (error) {
      setLoadingRegion(false);
    }
  };

  // get all supported sdks
  const getALlSDKList = async () => {
    setLoadingSDK(true);
    try {
      const { success, data }: ApiResponse<SDKResponse> =
        await getSDKTypeList();
      if (success) {
        const sdkOptions: SelectProps.Options = data.data.map((element) => ({
          label: element.name,
          value: element.value,
          iconName: 'settings',
        }));
        setSDKOptionList(sdkOptions);
        setLoadingSDK(false);
      }
    } catch (error) {
      setLoadingSDK(false);
    }
  };

  // get vpc list after change region
  const getVPCListByRegion = async (region: string) => {
    setLoadingVPC(true);
    try {
      const { success, data }: ApiResponse<VPCResponse[]> = await getVPCList(
        region
      );
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

  // Monitor region change
  useEffect(() => {
    if (pipelineInfo.selectedRegion && pipelineInfo.selectedRegion.value) {
      getVPCListByRegion(pipelineInfo.selectedRegion.value);
    }
  }, [pipelineInfo.selectedRegion]);

  useEffect(() => {
    getAllRegionList();
    getALlSDKList();
  }, []);

  return (
    <Container
      header={
        <Header variant="h2" info={<InfoLink />}>
          {t('pipeline:create.pipeline')}
        </Header>
      }
    >
      <SpaceBetween direction="vertical" size="l">
        <FormField
          label={t('pipeline:create.name')}
          description={t('pipeline:create.nameDesc')}
          constraintText={t('pipeline:create.nameConstraint')}
          errorText={nameEmptyError ? t('pipeline:valid.nameEmpty') : ''}
        >
          <Input
            value={pipelineInfo.name}
            onChange={(e) => {
              changePipelineName(e.detail.value);
            }}
            placeholder="my-pipeline"
          />
        </FormField>

        <FormField label={t('pipeline:create.desc')}>
          <Textarea
            value={pipelineInfo.description}
            placeholder={t('pipeline:create.descPlaceholder') || ''}
            onChange={(e) => {
              changeDescription(e.detail.value);
            }}
          />
        </FormField>

        <FormField
          label={t('pipeline:create.awsRegion')}
          description={t('pipeline:create.awsRegionDesc')}
          errorText={regionEmptyError ? t('pipeline:valid.regionEmpty') : ''}
        >
          <Select
            placeholder={t('pipeline:create.awsRegionPlaceholder') || ''}
            selectedOption={pipelineInfo.selectedRegion}
            options={regionOptionList}
            selectedAriaLabel="Selected"
            statusType={loadingRegion ? 'loading' : 'finished'}
            onChange={(e) => {
              changeRegion(e.detail.selectedOption);
            }}
          />
        </FormField>

        <FormField
          label={t('pipeline:create.vpc')}
          description={t('pipeline:create.vpcDesc')}
          errorText={vpcEmptyError ? t('pipeline:valid.vpcEmpty') : ''}
        >
          <Select
            placeholder={t('pipeline:create.vpcPlaceholder') || ''}
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
            placeholder={t('pipeline:create.dataSDKPlaceholder') || ''}
            selectedOption={pipelineInfo.selectedSDK}
            options={sdkOptionList}
            selectedAriaLabel="Selected"
            statusType={loadingSDK ? 'loading' : 'finished'}
            onChange={(e) => {
              changeSDK(e.detail.selectedOption);
            }}
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
