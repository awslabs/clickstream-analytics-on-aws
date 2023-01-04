import { AppLayout, Wizard } from '@cloudscape-design/components';
import CustomBreadCrumb from 'components/layouts/CustomBreadCrumb';
import Navigation from 'components/layouts/Navigation';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import BasicInformation from './steps/BasicInformation';
import ConfigEnrichment from './steps/ConfigEnrichment';
import ConfigIngestion from './steps/ConfigIngestion';
import DataModeling from './steps/DataModeling';
import ReviewAndLaunch from './steps/ReviewAndLaunch';

const Content: React.FC = () => {
  const { t } = useTranslation();
  const [activeStepIndex, setActiveStepIndex] = React.useState(0);
  const navigate = useNavigate();

  return (
    <Wizard
      i18nStrings={{
        stepNumberLabel: (stepNumber) => `${t('step')} ${stepNumber}`,
        collapsedStepsLabel: (stepNumber, stepsCount) =>
          `${t('step')} ${stepNumber} ${t('of')} ${stepsCount}`,
        navigationAriaLabel: t('steps') || 'Steps',
        cancelButton: t('button.cancel'),
        previousButton: t('button.previous'),
        nextButton: t('button.next'),
        submitButton: t('button.launch'),
        optional: t('optional') || 'optional',
      }}
      onNavigate={({ detail }) => {
        setActiveStepIndex(detail.requestedStepIndex);
      }}
      onSubmit={() => {
        navigate('/pipelines');
      }}
      activeStepIndex={activeStepIndex}
      allowSkipTo
      steps={[
        {
          title: t('pipeline:create.basicInfo'),
          content: <BasicInformation />,
        },
        {
          title: t('pipeline:create.configIngestion'),
          content: <ConfigIngestion />,
        },
        {
          title: t('pipeline:create.configEnrich'),
          content: <ConfigEnrichment />,
        },
        {
          title: t('pipeline:create.dataModeling'),
          content: <DataModeling />,
        },
        {
          title: t('pipeline:create.reviewLaunch'),
          content: <ReviewAndLaunch />,
        },
      ]}
    />
  );
};

const CreatePipeline: React.FC = () => {
  const { t } = useTranslation();
  const breadcrumbItems = [
    {
      text: t('breadCrumb.name'),
      href: '/',
    },
    {
      text: t('breadCrumb.pipelines'),
      href: '/',
    },
    {
      text: t('breadCrumb.createPipeline'),
      href: '/',
    },
  ];

  return (
    <AppLayout
      content={<Content />}
      headerSelector="#header"
      breadcrumbs={<CustomBreadCrumb breadcrumbItems={breadcrumbItems} />}
      navigation={<Navigation activeHref="/pipelines" />}
      // navigationOpen={false}
    />
  );
};

export default CreatePipeline;
