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
  Header,
  HeaderProps,
  Link,
  Popover,
} from '@cloudscape-design/components';
import { useTranslation } from 'react-i18next';

interface MetadataTableHeaderProps extends HeaderProps {
  title?: string;
  selectedItemsCount: number;
  infoContent?: string;
}

export function MetadataTableHeader({
  title = '',
  selectedItemsCount,
  infoContent,
  ...props
}: MetadataTableHeaderProps) {
  const { t } = useTranslation();
  return (
    <Header
      variant="awsui-h1-sticky"
      info={
        <Popover triggerType="custom" content={infoContent}>
          <Link variant="info">{t('info')}</Link>
        </Popover>
      }
      {...props}
    >
      {title}
    </Header>
  );
}
