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
  AppLayout,
  Box,
  Button,
  ColumnLayout,
  Container,
  ContentLayout,
  FormField,
  Header,
  Input,
  Modal,
  SpaceBetween,
  Spinner,
  StatusIndicator,
} from '@cloudscape-design/components';
import {
  getQuickSightDetail,
  getQuickSightStatus,
  subscribQuickSight,
  unsubscribQuickSight,
} from 'apis/resource';
import CustomBreadCrumb from 'components/layouts/CustomBreadCrumb';
import Navigation from 'components/layouts/Navigation';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ErrorCode } from 'ts/const';
import { alertMsg } from 'ts/utils';

const QuickSight: React.FC = () => {
  const { t } = useTranslation();
  const breadcrumbItems = [
    {
      text: t('breadCrumb.name'),
      href: '/',
    },
    {
      text: t('breadCrumb.quicksight'),
      href: '/',
    },
  ];

  const [loadingUnsub, setLoadingUnsub] = useState(false);
  const [loadingQuickSight, setLoadingQuickSight] = useState(true);
  const [loadingSubscription, setLoadingSubscription] = useState(false);
  const [quickSightEnabled, setQuickSightEnabled] = useState(false);

  const [showSubQuickSight, setShowSubQuickSight] = useState(false);
  const [subscriptionAccountName, setSubscriptionAccountName] = useState('');
  const [subscriptionEmail, setSubscriptionEmail] = useState('');

  const [loadingRefresh, setLoadingRefresh] = useState(false);
  const [quickSightInfo, setQuickSightInfo] =
    useState<QuickSightDetailResponse>();

  // get quicksight details
  const getTheQuickSightDetail = async () => {
    setLoadingRefresh(true);
    try {
      const { success, data }: ApiResponse<QuickSightDetailResponse> =
        await getQuickSightDetail();
      setLoadingQuickSight(false);
      setLoadingRefresh(false);
      if (
        success &&
        data &&
        data.accountSubscriptionStatus === 'ACCOUNT_CREATED'
      ) {
        setQuickSightInfo(data);
        setQuickSightEnabled(true);
      }
    } catch (error) {
      setLoadingRefresh(false);
      setLoadingQuickSight(false);
    }
  };

  // check the QuickSight status
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

  // subscribe quicksight
  const subscribeTheQuickSight = async () => {
    setLoadingSubscription(true);
    try {
      const resDta: ApiResponse<SubscribeQuickSightResponse> =
        await subscribQuickSight({
          email: subscriptionEmail,
          accountName: subscriptionAccountName,
        });
      if (resDta?.success && resDta?.data) {
        setQuickSightEnabled(true);
        setShowSubQuickSight(false);
      } else {
        setLoadingSubscription(false);
      }
    } catch (error: any) {
      setLoadingSubscription(false);
      if (error.toString().trim() === ErrorCode.QuickSightNameExists) {
        alertMsg(t('quicksight.valid.accountExists'), 'error');
      }
      return;
    }
  };

  // unsubscribe quicksight
  const unSubscribeTheQuickSight = async () => {
    setLoadingUnsub(true);
    try {
      const { success }: ApiResponse<string> = await unsubscribQuickSight();
      if (success) {
        setLoadingUnsub(false);
        setQuickSightEnabled(false);
      }
    } catch (error) {
      setLoadingUnsub(false);
    }
  };

  const closeSubQuickSightModal = () => {
    setSubscriptionAccountName('');
    setSubscriptionEmail('');
    setShowSubQuickSight(false);
  };

  useEffect(() => {
    checkTheQuickSightStatus();
  }, []);

  return (
    <AppLayout
      content={
        <ContentLayout
          header={<Header variant="h1">{t('breadCrumb.quicksight')}</Header>}
        >
          <Container
            header={
              <Header
                variant="h2"
                actions={
                  quickSightEnabled && (
                    <SpaceBetween direction="horizontal" size="xs">
                      <Button
                        iconName="refresh"
                        loading={loadingRefresh}
                        onClick={() => {
                          getTheQuickSightDetail();
                        }}
                      />
                      <Button
                        loading={loadingUnsub}
                        onClick={() => {
                          unSubscribeTheQuickSight();
                        }}
                      >
                        {t('button.unsubscribe')}
                      </Button>
                    </SpaceBetween>
                  )
                }
              >
                {t('quicksight.subscription')}
              </Header>
            }
          >
            {loadingQuickSight ? (
              <Spinner />
            ) : !quickSightEnabled ? (
              <Alert
                type="warning"
                action={
                  <SpaceBetween size="xs" direction="horizontal">
                    <Button
                      loading={loadingSubscription}
                      onClick={() => {
                        setShowSubQuickSight(true);
                      }}
                    >
                      {t('button.subscribe')}
                    </Button>
                  </SpaceBetween>
                }
                header={t('pipeline:create.quickSightNotSub')}
              >
                {t('pipeline:create.quickSightNotSubDesc')}
              </Alert>
            ) : (
              <SpaceBetween direction="vertical" size="l">
                <ColumnLayout columns={3} variant="text-grid">
                  <div>
                    <Box variant="awsui-key-label">
                      {t('quicksight.accountName')}
                    </Box>
                    <div>{quickSightInfo?.accountName}</div>
                  </div>
                  <div>
                    <Box variant="awsui-key-label">
                      {t('quicksight.authType')}
                    </Box>
                    <div>{quickSightInfo?.authenticationType}</div>
                  </div>
                  <div>
                    <Box variant="awsui-key-label">
                      {t('quicksight.edition')}
                    </Box>
                    <div>{quickSightInfo?.edition}</div>
                  </div>
                  <div>
                    <Box variant="awsui-key-label">
                      {t('quicksight.notificationEmail')}
                    </Box>
                    <div>{quickSightInfo?.notificationEmail}</div>
                  </div>
                  <div>
                    <Box variant="awsui-key-label">
                      {t('quicksight.status')}
                    </Box>
                    <div>
                      <StatusIndicator>
                        {quickSightInfo?.accountSubscriptionStatus}
                      </StatusIndicator>
                    </div>
                  </div>
                </ColumnLayout>
              </SpaceBetween>
            )}
          </Container>
          {/* Subscription Modal */}
          <Modal
            onDismiss={() => {
              closeSubQuickSightModal();
            }}
            visible={showSubQuickSight}
            footer={
              <Box float="right">
                <SpaceBetween direction="horizontal" size="xs">
                  <Button
                    variant="link"
                    onClick={() => {
                      closeSubQuickSightModal();
                    }}
                  >
                    {t('button.close')}
                  </Button>

                  <Button
                    loading={loadingSubscription}
                    onClick={() => {
                      subscribeTheQuickSight();
                    }}
                  >
                    {t('button.subscribe')}
                  </Button>
                </SpaceBetween>
              </Box>
            }
            header={t('pipeline:create.createQSSub')}
          >
            <FormField
              label={t('pipeline:create.qsAccountName')}
              description={t('pipeline:create.qsAccountNameDesc')}
            >
              <Input
                placeholder="my-quicksight"
                value={subscriptionAccountName}
                onChange={(e) => {
                  setSubscriptionAccountName(e.detail.value);
                }}
              />
            </FormField>
            <FormField
              label={t('pipeline:create.qsUserEmail')}
              description={t('pipeline:create.qsUserEmailDesc')}
            >
              <Input
                placeholder="email@example.com"
                value={subscriptionEmail}
                onChange={(e) => {
                  setSubscriptionEmail(e.detail.value);
                }}
              />
            </FormField>
          </Modal>
        </ContentLayout>
      }
      headerSelector="#header"
      breadcrumbs={<CustomBreadCrumb breadcrumbItems={breadcrumbItems} />}
      navigation={<Navigation activeHref="/quicksight" />}
    />
  );
};

export default QuickSight;
