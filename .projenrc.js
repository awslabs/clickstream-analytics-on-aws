const { awscdk, gitlab, typescript } = require('projen');
const version = '1.0.0';

const commonDeps = [
  'uuid@^9.0.0',
  '@types/aws-lambda@^8.10.110',
  '@aws-lambda-powertools/logger@^1.5.1',
];

const commonDevDeps = [
  '@types/uuid@^9.0.0',
];

const awsSDKDeps = [
  '@aws-sdk/client-kafkaconnect',
  '@aws-sdk/client-s3',
].map(dep => `${dep}@^3.267.0`);

const awsSDKDepsForApiProject = [
  '@aws-sdk/types',
  '@aws-sdk/client-ec2',
  '@aws-sdk/client-s3',
  '@aws-sdk/client-sfn',
  '@aws-sdk/client-kafka',
  '@aws-sdk/client-redshift',
  '@aws-sdk/client-quicksight',
  '@aws-sdk/client-account',
  '@aws-sdk/client-dynamodb',
  '@aws-sdk/lib-dynamodb',
  '@aws-sdk/util-dynamodb',
].map(dep => `${dep}@^3.267.0`);

const depsForApiProject = [
  ...commonDeps,
  'express@^4.18.2',
  'express-validator@^6.14.3',
  ...awsSDKDepsForApiProject,
];

const devDepsForApiProject = [
  ...commonDevDeps,
  'aws-sdk-client-mock@^2.0.1',
  'supertest@^6.3.3',
  'nodemon@^2.0.20',
  'ts-node@^10.9.1',
  '@types/express@^4.17.16',
  '@types/supertest@^2.0.12',
];
const project = new awscdk.AwsCdkTypeScriptApp({
  version,
  cdkVersion: '2.1.0',
  defaultReleaseBranch: 'main',
  name: 'clickstream-analytics-on-aws',
  gitignore: [
    '.idea/',
    '.vscode/',
    'cdk.context.json',
    '.DS_Store',
    'docs/site/',
    'frontend/amplify',
    'test-deploy*.sh',
  ] /* Additional entries to .gitignore. */,

  deps: [
    ...commonDeps,
    'cdk-nag@^2.20.6',
    'cdk-bootstrapless-synthesizer@^2.2.7',
    ...depsForApiProject,
    ...awsSDKDeps,
  ], /* Runtime dependencies of this module. */
  // description: undefined,  /* The description is just a string that helps people understand the purpose of the package. */
  // devDeps: [],             /* Build dependencies for this module. */
  // packageName: undefined,  /* The "name" in package.json. */

  devDeps: [
    ...commonDevDeps,
  ],
  minNodeVersion: '16.18.0',
});


project.eslint?.addRules({
  'import/no-namespace': [
    'error', { ignore: ['*.ext'] },
  ],
});
project.eslint?.addRules({
  'import/order': [
    'error',
    {
      groups: [
        'builtin',
        'external',
      ],
      alphabetize: {
        order: 'asc',
        caseInsensitive: true,
      },
    },
  ],
});

const apiProject = new typescript.TypeScriptProject({
  deps: [
    ...depsForApiProject,
  ],
  devDeps: [
    ...devDepsForApiProject,
  ],
  gitignore: [
    'src/aws-exports.js',
    'build/',
  ],
  description: 'Backend api service of control plane.',
  version,
  name: 'control-plane-api',
  license: 'Apache-2.0',
  licensed: true,
  outdir: 'src/control-plane/backend/lambda/api/',
  libdir: 'dist/',
  readme: undefined,
  defaultReleaseBranch: 'main',
  entrypoint: 'index.js',
  parent: project,
  sampleCode: false,
  srcdir: './',
  testdir: 'test/',
  eslint: false,
  minNodeVersion: '16.18.0',
});
apiProject.setScript('dev', 'nodemon --watch \'src\' -e ts --exec \'ts-node\' ./index.ts');
apiProject.setScript('start', 'node dist/index.js');

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
  'build': {
    stages: [
      'build',
    ],
    variables: {
      CI: 'true',
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
          'unzip output/coverage_result.zip -d build/',
          'zcat output/logs.gz',
        ],
        artifacts: {
          reports: {
            junit: 'build/junit.xml',
            coverage_report: {
              coverage_format: 'cobertura',
              path: 'build/coverage/cobertura-coverage.xml',
            },
          },
          paths: [
            'build/cdk.out/',
          ],
        },
        coverage: '/All files[^|]*\\|[^|]*\\s+([\\d\\.]+)/',
      },
      buildFrontend: {
        stage: 'build',
        variables: {},
        before_script: [
          'cd $CI_PROJECT_DIR/frontend',
        ],
        script: [
          'npm install',
          'npm run test',
          'npm run build',
        ],
        artifacts: {
          paths: [
            '$CI_PROJECT_DIR/frontend/build/',
          ],
        },
      },
    },
  },
  'git-secrets-scan': {
    stages: [
      'build',
    ],
    jobs: {
      'secrets-scan': {
        stage: 'build',
        image: {
          name: 'public.ecr.aws/docker/library/debian:bullseye',
        },
        before_script: [
          'apt update',
          'apt install -y git git-secrets',
        ],
        script: [
          'git secrets --scan',
        ],
      },
    },
  },
  'prlint': {
    stages: [
      'build',
    ],
    jobs: {
      lint: {
        rules: [
          {
            if: '$CI_PIPELINE_SOURCE == "merge_request_event"',
          },
        ],
        stage: 'build',
        script: [
          '[[ "$CI_MERGE_REQUEST_TITLE" =~ ^(feat|fix|chore|docs|tests|ci): ]] || (echo "no commit type is specified in merge request title" && exit 1)',
        ],
      },
    },
  },
  'docs': {
    stages: [
      'build',
    ],
    jobs: {
      mkdocs: {
        stage: 'build',
        image: {
          name: 'public.ecr.aws/docker/library/python:3.9',
        },
        before_script: [
          'python3 -m pip install \'mkdocs<1.5\' \'mkdocs-material<10\' \'mkdocs-material-extensions<1.2\' \'mkdocs-include-markdown-plugin<5\' \'mkdocs-macros-plugin<1\'',
        ],
        script: [
          'mkdocs build -f ./docs/mkdocs.en.yml -s',
          'mkdocs build -f ./docs/mkdocs.zh.yml -s',
        ],
      },
    },
  },
  'cfn-nag': {
    stages: [
      'qa',
    ],
    needs: [
      'build',
    ],
    jobs: {
      'cfn-nag': {
        tags: [
          'arch:amd64',
        ],
        image: {
          name: 'stelligent/cfn_nag',
          entrypoint: [
            '/bin/sh',
            '-c',
          ],
        },
        stage: 'qa',
        script: [
          'set -x; cfn_nag -f -b .cfnnag_global_suppress_list build/cdk.out/*.template.json',
        ],
      },
    },
  },
});

project.synth();