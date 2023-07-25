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
  AppLayout,
  Box,
  Cards,
  Link,
  Pagination,
} from '@cloudscape-design/components';
import { getAnalyticsDashboardList } from 'apis/analytics';
import Navigation from 'components/layouts/Navigation';
import moment from 'moment';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { TIME_FORMAT } from 'ts/const';
import DashboardHeader from '../comps/DashboardHeader';

const AnalyticsDashboardCard: React.FC<any> = () => {
  const { t } = useTranslation();
  const { pid, appid } = useParams();
  const [pageSize] = useState(12);
  const [loadingData, setLoadingData] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [analyticsDashboardList, setAnalyticsDashboardList] = useState<
    IAnalyticsDashboard[]
  >([]);
  const CARD_DEFINITIONS = {
    header: (item: IAnalyticsDashboard) => (
      <div>
        <Link
          fontSize="heading-m"
          href={`/analytics/${pid}/app/${appid}/dashboard/${item.id}`}
        >
          {item.name}
        </Link>
      </div>
    ),
    sections: [
      {
        id: 'description',
        header: '',
        content: (item: IAnalyticsDashboard) => item.description,
      },
      {
        id: 'id',
        header: t('analytics:list.id'),
        content: (item: IAnalyticsDashboard) => item.id,
      },
      {
        id: 'createAt',
        header: t('analytics:list.createAt'),
        content: (item: IAnalyticsDashboard) =>
          moment(item?.createAt).format(TIME_FORMAT) || '-',
      },
    ],
  };

  const listAnalyticsDashboards = async () => {
    setLoadingData(true);
    try {
      const {
        success,
        data,
      }: ApiResponse<ResponseTableData<IAnalyticsDashboard>> =
        await getAnalyticsDashboardList({
          pageNumber: currentPage,
          pageSize: pageSize,
        });
      if (success) {
        setAnalyticsDashboardList(data.items);
        setTotalCount(data.totalCount);
        setLoadingData(false);
      }
    } catch (error) {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    console.log(pid, appid);
    if (pid && appid) {
      listAnalyticsDashboards();
    }
  }, [currentPage]);

  return (
    <div className="pb-30">
      <Cards
        loading={loadingData}
        stickyHeader={false}
        cardDefinition={CARD_DEFINITIONS}
        loadingText={t('analytics:list.loading') || ''}
        items={analyticsDashboardList}
        variant="full-page"
        empty={
          <Box textAlign="center" color="inherit">
            <Box padding={{ bottom: 's' }} variant="p" color="inherit">
              <b>{t('analytics:list.noDashboard')}</b>
            </Box>
          </Box>
        }
        header={<DashboardHeader totalNum={totalCount} />}
        pagination={
          <Pagination
            currentPageIndex={currentPage}
            pagesCount={Math.ceil(totalCount / pageSize)}
            onChange={(e) => {
              setCurrentPage(e.detail.currentPageIndex);
            }}
          />
        }
      />
    </div>
  );
};

const AnalyticsHome: React.FC = () => {
  return (
    <AppLayout
      toolsHide
      content={<AnalyticsDashboardCard />}
      headerSelector="#header"
      navigation={<Navigation activeHref="/analytics" />}
    />
  );
};

export default AnalyticsHome;
