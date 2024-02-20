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
  Container,
  FormField,
  Header,
  Link,
  SpaceBetween,
  Spinner,
  Toggle,
} from '@cloudscape-design/components';
import { getQuickSightDetail, getQuickSightStatus } from 'apis/resource';
import { useEffect, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import {
  buildDocumentLink,
  buildQuickSightSubscriptionLink,
  PIPELINE_QUICKSIGHT_LEARNMORE_LINK_EN,
  PIPELINE_QUICKSIGHT_LEARNMORE_LINK_CN,
  PIPELINE_QUICKSIGHT_GUIDE_LINK_EN,
  PIPELINE_QUICKSIGHT_GUIDE_LINK_CN,
} from 'ts/url';
import { isDisabled } from 'ts/utils';

interface ReportingProps {
  update?: boolean;
  pipelineInfo: IExtPipeline;
  changeEnableReporting: (enable: boolean) => void;
  changeQuickSightDisabled: (disabled: boolean) => void;
  changeQuickSightAccountName: (accountName: string) => void;
  changeLoadingQuickSight?: (loading: boolean) => void;
}

const Reporting: React.FC<ReportingProps> = (props: ReportingProps) => {
  const { t, i18n } = useTranslation();
  const {
    update,
    pipelineInfo,
    changeEnableReporting,
    changeQuickSightDisabled,
    changeQuickSightAccountName,
    changeLoadingQuickSight,
  } = props;
  const [loadingQuickSight, setLoadingQuickSight] = useState(false);
  const [quickSightEnabled, setQuickSightEnabled] = useState(false);
  const [quickSightEnterprise, setQuickSightEnterprise] = useState(false);

  // get quicksight details
  const getTheQuickSightDetail = async () => {
    try {
      const { success, data }: ApiResponse<QuickSightDetailResponse> =
        await getQuickSightDetail();
      setLoadingQuickSight(false);
      if (
        success &&
        data &&
        data.accountSubscriptionStatus === 'ACCOUNT_CREATED'
      ) {
        setQuickSightEnabled(true);
        changeQuickSightDisabled(false);
        changeQuickSightAccountName(data.accountName);
      } else {
        changeEnableReporting(false);
        setQuickSightEnabled(false);
        changeQuickSightDisabled(true);
      }
      if (success && data && data.edition.includes('ENTERPRISE')) {
        setQuickSightEnterprise(true);
      }
    } catch (error) {
      setLoadingQuickSight(false);
    }
  };

  // get quicksight status
  const checkTheQuickSightStatus = async () => {
    setLoadingQuickSight(true);
    try {
      const { success, data }: ApiResponse<boolean> =
        await getQuickSightStatus();
      if (success && data) {
        getTheQuickSightDetail();
      } else {
        setLoadingQuickSight(false);
      }
    } catch (error) {
      setLoadingQuickSight(false);
    }
  };

  useEffect(() => {
    if (changeLoadingQuickSight) {
      changeLoadingQuickSight(loadingQuickSight);
    }
  }, [loadingQuickSight]);

  useEffect(() => {
    if (pipelineInfo.enableDataProcessing && pipelineInfo.enableReporting) {
      checkTheQuickSightStatus();
    }
  }, [pipelineInfo.enableReporting]);

  return (
    <Container
      header={
        <Header
          variant="h2"
          description={t('pipeline:create.reportSettingsDesc')}
        >
          {t('pipeline:create.reportSettings')}
        </Header>
      }
    >
      {pipelineInfo.enableDataProcessing && pipelineInfo.enableRedshift ? (
        <>
          {loadingQuickSight ? (
            <Spinner />
          ) : (
            <>
              <SpaceBetween direction="vertical" size="l">
                <FormField>
                  <Toggle
                    controlId="test-quicksight-id"
                    disabled={
                      isDisabled(update, pipelineInfo) ??
                      (!pipelineInfo.serviceStatus?.QUICK_SIGHT ||
                        !pipelineInfo.enableRedshift)
                    }
                    onChange={({ detail }) =>
                      changeEnableReporting(detail.checked)
                    }
                    checked={pipelineInfo.enableReporting}
                    description={
                      <div>
                        <Trans
                          i18nKey="pipeline:create.createSampleQuickSightDesc"
                          components={{
                            learnmore_anchor: (
                              <Link
                                external
                                href={buildDocumentLink(
                                  i18n.language,
                                  PIPELINE_QUICKSIGHT_LEARNMORE_LINK_EN,
                                  PIPELINE_QUICKSIGHT_LEARNMORE_LINK_CN
                                )}
                              />
                            ),
                            guide_anchor: (
                              <Link
                                external
                                href={buildDocumentLink(
                                  i18n.language,
                                  PIPELINE_QUICKSIGHT_GUIDE_LINK_EN,
                                  PIPELINE_QUICKSIGHT_GUIDE_LINK_CN
                                )}
                              />
                            ),
                          }}
                        />
                      </div>
                    }
                  >
                    <b>{t('pipeline:create.createSampleQuickSight')}</b>
                  </Toggle>
                </FormField>

                {pipelineInfo.enableReporting &&
                  (loadingQuickSight ? (
                    <Spinner />
                  ) : (
                    <>
                      {!quickSightEnabled && (
                        <Alert
                          type="warning"
                          header={t('pipeline:create.quickSightNotSub')}
                        >
                          {t('pipeline:create.quickSightNotSubDesc1')}
                          <Link
                            external
                            href={buildQuickSightSubscriptionLink()}
                          >
                            {t('pipeline:create.quickSightSubscription')}
                          </Link>
                          {t('pipeline:create.quickSightNotSubDesc2')}
                        </Alert>
                      )}

                      {quickSightEnabled && !quickSightEnterprise && (
                        <Alert
                          type="warning"
                          header={t('pipeline:create.quickSightNotEnterprise')}
                        >
                          {t('pipeline:create.quickSightNotEnterpriseDesc')}
                        </Alert>
                      )}
                    </>
                  ))}
              </SpaceBetween>
            </>
          )}
        </>
      ) : (
        <Alert header={t('pipeline:create.reportNotSupported')}>
          {t('pipeline:create.reportNotSupportedDesc')}
        </Alert>
      )}
    </Container>
  );
};

export default Reporting;
