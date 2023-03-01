import { Spinner } from '@cloudscape-design/components';
import React from 'react';

const Loading: React.FC = () => {
  return (
    <div className="content-loading">
      <Spinner />
    </div>
  );
};

export default Loading;
