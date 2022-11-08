const { awscdk, gitlab } = require('projen');
const project = new awscdk.AwsCdkTypeScriptApp({
  cdkVersion: '2.1.0',
  defaultReleaseBranch: 'main',
  name: 'clickstream-analytics-on-aws',

  // deps: [],                /* Runtime dependencies of this module. */
  // description: undefined,  /* The description is just a string that helps people understand the purpose of the package. */
  // devDeps: [],             /* Build dependencies for this module. */
  // packageName: undefined,  /* The "name" in package.json. */
});

const gitlabMain = new gitlab.GitlabConfiguration(project,
  {
    workflow: {
      rules: [
        {
          if: '$CI_PIPELINE_SOURCE == "merge_request_event"',
          when: 'always',
        },
        {
          if: '$CI_COMMIT_REF_NAME == "main"',
          when: 'always',
        },
        {
          when: 'never',
        },
      ],
    },
    default: {
      image: 'public.ecr.aws/docker/library/node:16-bullseye',
      tags: [
        'size:large',
      ],
    },
    jobs: {
      main: {
        stage: '.pre',
        script: [
          'echo Start PR Validation',
          'env',
        ],
      },
    },
  });
gitlabMain.createNestedTemplates({
  build: {
    stages: [
      'build',
    ],
    variables: {
      variables: {
        CI: 'true',
      },
    },
    jobs: {
      build: {
        stage: 'build',
        variables: {
          AWS_CREDS_TARGET_ROLE: '$AWS_CREDS_TARGET_ROLE',
          AWS_DEFAULT_REGION: 'us-east-1',
          BUCKET_NAME: '$BUCKET_NAME',
        },
        before_script: [
          'apt update',
          'apt install -y zip',
          'zip /tmp/source-$CI_JOB_ID.zip -r9 ./',
          'npm install typescript @aws-sdk/client-s3 @aws-sdk/client-codebuild @aws-sdk/client-sts',
          'mkdir -p output/',
        ],
        script: [
          'npx ts-node scripts/build.ts source-$CI_JOB_ID.zip',
          'mkdir -p build/',
          'unzip output/build_result.zip -d build/',
          'unzip output/test_result.zip -d build/',
        ],
        artifacts: {
          reports: {
            junit: 'build/junit.xml',
          },
          paths: [
            'build/cdk.out/',
          ],
        },
      },
    },
  },
  prlint: {
    stages: [
      '.pre',
    ],
    jobs: {
      lint: {
        rules: [
          {
            if: '$CI_PIPELINE_SOURCE == "merge_request_event"',
          },
        ],
        stage: '.pre',
        script: [
          '[[ "$CI_MERGE_REQUEST_TITLE" =~ ^(feat|fix|chore|docs|tests|ci) ]] || (echo "no commit type is specified in merge request title" && exit 1)',
        ],
      },
    },
  },
});
project.synth();