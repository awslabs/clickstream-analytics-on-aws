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
import { Icon } from '@cloudscape-design/components';
import React, { ReactElement } from 'react';

interface ErrorTextProps {
  text: string | ReactElement;
}
const ErrorText: React.FC<ErrorTextProps> = (props: ErrorTextProps) => {
  const { text } = props;
  return (
    <div className="analytics-error-text">
      <Icon name="status-warning" size="small" />
      <div>{text}</div>
    </div>
  );
};
export default ErrorText;
