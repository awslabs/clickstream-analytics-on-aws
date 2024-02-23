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

const { awscdk, gitlab, javascript, typescript, JsonPatch } = require('projen');
const Nx = require('./projenrc/nx');
const PnpmWorkspace = require('./projenrc/pnpm');
const version = '1.2.0';
const cdkVersion = '2.81.0';
const minNodeVersion = '18.17.0';
const pnpmVersion = '8.15.3';

const cdkAlphaModules = [
  '@aws-cdk/aws-glue-alpha',
  '@aws-cdk/aws-servicecatalogappregistry-alpha',
].map(m => `${m}@^${cdkVersion}-alpha.0`);

const commonDeps = [
  'uuid@^9.0.0',
  '@aws-lambda-powertools/logger@^1.17.0',
  '@aws-lambda-powertools/metrics@^1.17.0',
  'jsonwebtoken@^9.0.0',
  'jwks-rsa@^3.0.1',
  'mustache@^4.2.0',
  'node-fetch@^2.6.4',
  'node-cache@^5.1.2',
  'cron-parser@^4.8.1',
  'jsonpath-plus@^7.2.0',
  'hpagent@^1.2.0',
];

const commonDevDeps = [
  '@types/aws-lambda@^8.10.110',
  '@types/uuid@^9.0.0',
  'aws-sdk-client-mock@^3.0.1',
  'aws-sdk-client-mock-jest@^3.0.1',
  '@types/mustache@^4.2.2',
  'mock-fs@^5.2.0',
  '@types/mock-fs@^4.13.1',
  '@types/node-fetch@^2.6.4',
  '@types/jsonpath-plus@^5.0.2',
  '@types/jsonwebtoken@^9.0.0',
];

const smithyPackagesVersion = '2.0.7';
const smithyPackagesDeps = [
  '@smithy/node-http-handler',
  '@smithy/util-stream-node',
].map(dep => `${dep}@^${smithyPackagesVersion}`);
const awsSDKPackagesVersion = '3.398.0';
const awsSDKPackagesDeps = [
  '@aws-sdk/types',
  '@aws-sdk/credential-providers',
].map(dep => `${dep}@^${awsSDKPackagesVersion}`);
const awsSDKServicesVersion = '3.405.0';
const awsSDKServicesDeps = [
  '@aws-sdk/client-kafkaconnect',
  '@aws-sdk/client-s3',
  '@aws-sdk/client-glue',
  '@aws-sdk/client-redshift-data',
  '@aws-sdk/client-cloudwatch',
  '@aws-sdk/client-redshift',
  '@aws-sdk/client-redshift-serverless',
  '@aws-sdk/client-emr-serverless',
  '@aws-sdk/client-sqs',
  '@aws-sdk/client-ssm',
  '@aws-sdk/client-lambda',
  '@aws-sdk/client-sns',
  '@aws-sdk/client-elastic-load-balancing-v2',
  '@aws-sdk/client-ecs',
  '@aws-sdk/client-emr-serverless',
  '@aws-sdk/client-sfn',
].map(dep => `${dep}@^${awsSDKServicesVersion}`);

const awsSDKPackagesDepsForApiProject = [
  '@aws-sdk/util-dynamodb',
].map(dep => `${dep}@^${awsSDKPackagesVersion}`);
const awsSDKServicesDepsForApiProject = [
  '@aws-sdk/client-ec2',
  '@aws-sdk/client-s3',
  '@aws-sdk/client-sfn',
  '@aws-sdk/client-kafka',
  '@aws-sdk/client-redshift',
  '@aws-sdk/client-redshift-data',
  '@aws-sdk/client-redshift-serverless',
  '@aws-sdk/client-quicksight',
  '@aws-sdk/client-dynamodb',
  '@aws-sdk/client-cloudformation',
  '@aws-sdk/client-route-53',
  '@aws-sdk/client-iam',
  '@aws-sdk/client-acm',
  '@aws-sdk/client-secrets-manager',
  '@aws-sdk/client-sts',
  '@aws-sdk/client-sns',
  '@aws-sdk/client-cloudwatch',
  '@aws-sdk/client-cloudwatch-events',
  '@aws-sdk/lib-dynamodb',
].map(dep => `${dep}@^${awsSDKServicesVersion}`);

const depsForFrontendProject = [
  '@aws-sdk/client-s3@^3.353.0',
  '@aws-sdk/lib-storage@^3.353.0',
  '@aws-sdk/xhr-http-handler@^3.353.0',
  '@babel/core@^7.16.0',
  '@cloudscape-design/components@^3.0.294',
  '@cloudscape-design/design-tokens@^3.0.22',
  '@cloudscape-design/global-styles@^1.0.7',
  '@cloudscape-design/collection-hooks@^1.0.7',
  '@pmmmwh/react-refresh-webpack-plugin@^0.5.3',
  '@svgr/webpack@^5.5.0',
  '@testing-library/jest-dom@^5.16.5',
  '@testing-library/react@^13.4.0',
  '@testing-library/user-event@^13.5.0',
  '@types/jest@^27.5.2',
  '@types/node@^16.18.36',
  '@types/react@^18.0.25',
  '@types/react-dom@^18.0.8',
  'amazon-quicksight-embedding-sdk@^2.4.0',
  'axios@^1.4.0',
  'babel-jest@^27.4.2',
  'babel-loader@^8.2.3',
  'babel-plugin-named-asset-import@^0.3.8',
  'babel-preset-react-app@^10.0.1',
  'bfj@^7.0.2',
  'browserslist@^4.21.7',
  'camelcase@^6.2.1',
  'case-sensitive-paths-webpack-plugin@^2.4.0',
  'classnames@^2.3.2',
  'css-loader@^6.5.1',
  'css-minimizer-webpack-plugin@^3.2.0',
  'dotenv@^10.0.0',
  'dotenv-expand@^5.1.0',
  'file-loader@^6.2.0',
  'fs-extra@^10.0.0',
  'html-webpack-plugin@^5.5.0',
  'http-proxy-middleware@^2.0.6',
  'i18next@^22.4.6',
  'i18next-browser-languagedetector@^7.0.1',
  'i18next-http-backend@^2.1.1',
  'identity-obj-proxy@^3.0.0',
  'jest@^27.4.3',
  'jest-junit@^15',
  'jest-resolve@^27.4.2',
  'jest-watch-typeahead@^1.0.0',
  'lodash@^4.17.21',
  'mini-css-extract-plugin@^2.4.5',
  'moment@^2.29.4',
  'oidc-client-ts@^2.2.2',
  'postcss@^8.4.31',
  'postcss-flexbugs-fixes@^5.0.2',
  'postcss-loader@^6.2.1',
  'postcss-normalize@^10.0.1',
  'postcss-preset-env@^7.0.1',
  'prompts@^2.4.2',
  'react@^18.2.0',
  'react-app-polyfill@^3.0.0',
  'react-dev-utils@^12.0.1',
  'react-dom@^18.2.0',
  'react-i18next@^12.1.1',
  'react-oidc-context@^2.2.2',
  'react-refresh@^0.11.0',
  'react-router-dom@^6.4.3',
  'resolve@^1.20.0',
  'resolve-url-loader@^5.0.0',
  'sass@^1.71.0',
  'sass-loader@^12.3.0',
  'semver@^7.3.5',
  'source-map-loader@^3.0.0',
  'style-loader@^3.3.1',
  'tailwindcss@^3.3.2',
  'terser-webpack-plugin@^5.2.5',
  'uuid@^9.0.0',
  'web-vitals@^3.3.2',
  'webpack@^5.85.0',
  'webpack-dev-server@^4.15.0',
  'webpack-manifest-plugin@^4.0.2',
  'workbox-webpack-plugin@^6.4.1',
];

const devDepsForFrontendProject = [
  '@babel/plugin-proposal-private-property-in-object@^7.21.11',
  '@types/lodash@^4.14.191',
  '@types/uuid@^9.0.0',
  '@typescript-eslint/eslint-plugin@^5.42.0',
  'esbuild@^0.17.12',
  'esbuild-plugin-inline-image@^0.0.9',
  'esbuild-plugin-sass@^1.0.1',
  'eslint@^8.26.0',
  'eslint-config-prettier@^8.5.0',
  'eslint-config-react-app@^7.0.1',
  'eslint-config-standard-with-typescript@^23.0.0',
  'eslint-plugin-import@^2.26.0',
  'eslint-plugin-n@^15.4.0',
  'eslint-plugin-promise@^6.1.1',
  'eslint-plugin-react@^7.31.10',
  'eslint-webpack-plugin@^3.1.1',
  'html-minifier@^4.0.0',
  'prettier@^2.7.1',
  'typescript@^4.8.4',
];

const depsForApiProject = [
  ...commonDeps,
  'express@^4.18.2',
  'express-validator@^6.14.3',
  'p-limit@3.1.0',
  'jsonwebtoken@^9.0.0',
  'jwks-rsa@^3.0.1',
  'ts-json-object@^0.4.0',
  'cidr-block@^1.3.2',
  'json-difference@^1.9.1',
  'sql-formatter@^13.0.0',
  'i18next@^22.4.6',
  'i18next-fs-backend@^2.2.0',
  'fast-memoize@^2.5.1',
  ...smithyPackagesDeps,
  ...awsSDKPackagesDeps,
  ...awsSDKPackagesDepsForApiProject,
  ...awsSDKServicesDepsForApiProject,
];

const devDepsForApiProject = [
  ...commonDevDeps,
  'lodash@^4.17.21',
  'nodemon@^2.0.20',
  'supertest@^6.3.3',
  'ts-node@^10.9.1',
  '@types/express@^4.17.16',
  '@types/lodash@^4.14.202',
  '@types/supertest@^2.0.12',
  '@types/jsonwebtoken@^9.0.0',
];
const defaultBranch = 'main';
const project = new awscdk.AwsCdkTypeScriptApp({
  version,
  cdkVersion,
  defaultReleaseBranch: defaultBranch,
  name: 'clickstream-analytics-on-aws',
  description: 'Clickstream Analytics on AWS',
  majorVersion: 1,
  minMajorVersion: 0,
  packageManager: 'pnpm',
  projenCommand: 'pnpm dlx projen',
  gitignore: [
    '.idea/',
    '.vscode/',
    'cdk.context.json',
    '.DS_Store',
    'docs/site/',
    'frontend/amplify',
    'test-deploy*',
    'deployment/global-s3-assets/',
    'deployment/regional-s3-assets/',
    'deployment/open-source/',
    '.viperlightrc',
    'codescan-funcs.sh',
    'codescan-*-default.sh',
    '*.iml',
    '*.ipr',
    '*.iws',
    'src/data-pipeline/spark-etl/.gradle',
    'src/data-pipeline/spark-etl/build',
    'src/data-pipeline/spark-etl/bin',
    'src/data-pipeline/spark-etl/?/',
    'code-coverage-results.md',
    'metastore_db',
    'nohup.out',
  ] /* Additional entries to .gitignore. */,

  deps: [
    ...commonDeps,
    'cdk-nag@^2.20.6',
    'cdk-bootstrapless-synthesizer@^2.2.11',
    ...cdkAlphaModules,
    ...depsForApiProject,
    ...awsSDKServicesDeps,
  ], /* Runtime dependencies of this module. */
  // description: undefined,  /* The description is just a string that helps people understand the purpose of the package. */
  // devDeps: [],             /* Build dependencies for this module. */
  // packageName: undefined,  /* The "name" in package.json. */

  pullRequestTemplate: false /* Include a GitHub pull request template. */,
  devDeps: [
    ...commonDevDeps,
  ],
  minNodeVersion,
  jestOptions: {
    jestConfig: {
      setupFiles: ['./test/jestEnv.js'],
    },
  },
  tsconfig: {
    compilerOptions: {
      emitDecoratorMetadata: true,
    },
  },
  tsconfigDev: {
    compilerOptions: {
      emitDecoratorMetadata: true,
    },
  },
  githubOptions: {
    pullRequestLintOptions: {
      semanticTitleOptions: {
        types: [
          'feat',
          'fix',
          'chore',
          'docs',
          'ci',
          'tests',
        ],
      },
    },
  },
  depsUpgradeOptions: {
    workflowOptions: {
      schedule: javascript.UpgradeDependenciesSchedule.WEEKLY,
    },
  },
});

project.eslint?.addRules({
  'import/no-namespace': [
    'error', { ignore: ['*.ext'] },
  ],
  'import/no-extraneous-dependencies': ['error', { devDependencies: true }],
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
project.addFields({ version });


const baseProject = new typescript.TypeScriptProject({
  parent: project,
  name: '@clickstream/base-lib',
  outdir: './src/base-lib',
  description: 'Base project for shared library.',
  version,
  license: 'Apache-2.0',
  licensed: true,
  defaultReleaseBranch: defaultBranch,
  readme: undefined,
  eslint: false,
  sampleCode: false,
  packageManager: project.package.packageManager,
  projenCommand: project.projenCommand,
});
baseProject.addFields({ version });

const frontendTSConfig = {
  include: ['src'],
  compilerOptions: {
    moduleResolution: 'node',
    alwaysStrict: false,
    declaration: false,
    noImplicitAny: false,
    noUnusedParameters: false,
    allowJs: true,
    skipLibCheck: true,
    allowSyntheticDefaultImports: true,
    forceConsistentCasingInFileNames: true,
    isolatedModules: true,
    noImplicitReturns: false,
    noEmit: true,
    module: 'esnext',
    target: 'ESNext',
    baseUrl: 'src',
    jsx: 'react-jsx',
    lib: [
      'dom',
      'dom.iterable',
      'esnext',
    ],
  },
};

const frontendProject = new typescript.TypeScriptProject({
  parent: project,
  name: '@clickstream/portal',
  outdir: './frontend',
  defaultReleaseBranch: defaultBranch,
  readme: undefined,
  eslint: false,
  sampleCode: false,
  deps: [
    ...depsForFrontendProject,
    '@clickstream/base-lib@workspace:*',
  ],
  devDeps: [
    ...devDepsForFrontendProject,
  ],
  gitignore: [
    'aws-exports.json',
    'src/setupProxy.js',
    'build/',
  ],
  tsconfig: {
    ...frontendTSConfig,
  },
  minNodeVersion,
  jestOptions: {
    jestConfig: {
      roots: ['<rootDir>/src'],
      testEnvironment: 'jsdom',
      moduleDirectories: ['node_modules', 'src'],
      testMatch: [
        '<rootDir>/src/**/__tests__/**/*.{js,jsx,ts,tsx}',
        '<rootDir>/src/**/*.{spec,test}.{js,jsx,ts,tsx}',
      ],
      setupFiles: [
        'react-app-polyfill/jsdom',
      ],
      setupFilesAfterEnv: [
        '<rootDir>/src/setupTests.ts',
      ],
    },
  },
  packageManager: project.package.packageManager,
  projenCommand: project.projenCommand,
});
frontendProject.package.addField('browserslist', {
  production: [
    '>0.2%',
    'not dead',
    'not op_mini all',
  ],
  development: [
    'last 1 chrome version',
    'last 1 firefox version',
    'last 1 safari version',
  ],
});
frontendProject.package.addField('babel', {
  presets: [
    'react-app',
  ],
});
frontendProject.package.addField('eslintConfig', {
  extends: [
    'react-app',
    'react-app/jest',
  ],
});
frontendProject.addFields({ version });
frontendProject.setScript('start', 'node scripts/start.js');
frontendProject.setScript('build', 'node scripts/build.js');
frontendProject.setScript('crabuild', 'node scripts/build.js');
frontendProject.setScript('lint', 'eslint --ext .js,.ts,.jsx,.tsx src');
frontendProject.setScript('format', 'npm run lint --fix & prettier --write \'src/**/*.{js,jsx,ts,tsx}\'');
frontendProject.setScript('test', 'node scripts/test.js --transformIgnorePatterns');

const apiProject = new typescript.TypeScriptProject({
  deps: [
    ...depsForApiProject,
    '@clickstream/base-lib@workspace:*',
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
  defaultReleaseBranch: defaultBranch,
  entrypoint: 'index.js',
  parent: project,
  sampleCode: false,
  srcdir: './',
  testdir: 'test/',
  eslint: false,
  minNodeVersion,
  tsconfig: {
    exclude: ['dist'],
    compilerOptions: {
      emitDecoratorMetadata: true,
    },
  },
  tsconfigDev: {
    compilerOptions: {
      emitDecoratorMetadata: true,
    },
  },
  packageManager: project.package.packageManager,
  projenCommand: project.projenCommand,
});
apiProject.setScript('dev', 'nodemon --watch \'src\' -e ts --exec \'ts-node\' ./index.ts');
apiProject.setScript('start', 'node dist/index.js');
apiProject.addFields({ version });

project.buildWorkflow.buildTask._env = {
  NODE_OPTIONS: '--max_old_space_size=6144',
};

project.buildWorkflow.workflow.file?.addOverride(
  'jobs.build.permissions.checks',
  'write',
);
project.buildWorkflow.workflow.file?.addOverride(
  'jobs.build.permissions.pull-requests',
  'write',
);
project.buildWorkflow.workflow.file?.addOverride(
  'jobs.build.permissions.id-token',
  'write',
);
project.buildWorkflow.workflow.file?.addOverride(
  'jobs.build.env.iam_role_to_assume',
  '${{ secrets.ROLE_ARN }}',
);
project.buildWorkflow.preBuildSteps.push({
  name: 'Configure AWS Credentials',
  if: '${{ env.iam_role_to_assume != \'\' }}',
  uses: 'aws-actions/configure-aws-credentials@v4',
  with: {
    'role-to-assume': '${{ env.iam_role_to_assume }}',
    'aws-region': 'us-east-1',
  },
});
project.buildWorkflow.preBuildSteps.push({
  name: 'Login to Amazon ECR Public',
  if: '${{ env.iam_role_to_assume != \'\' }}',
  uses: 'aws-actions/amazon-ecr-login@v2',
  with: {
    'registry-type': 'public',
  },
});
project.buildWorkflow.addPostBuildSteps({
  name: 'Publish Test Report',
  uses: 'mikepenz/action-junit-report@v4',
  with: {
    check_name: 'Test results',
    report_paths: './test-reports/junit.xml',
    fail_on_failure: true,
    require_tests: true,
    detailed_summary: true,
    job_name: 'build',
    update_check: true,
    include_passed: true,
  },
});
project.buildWorkflow.addPostBuildSteps({
  name: 'Code Coverage Summary Report',
  uses: 'irongut/CodeCoverageSummary@v1.3.0',
  with: {
    filename: 'coverage/cobertura-coverage.xml',
    badge: 'true',
    fail_below_min: 'true',
    format: 'markdown',
    hide_branch_rate: 'false',
    hide_complexity: 'true',
    indicators: 'true',
    output: 'both',
    thresholds: '60 80',
  },
});
project.buildWorkflow.addPostBuildSteps({
  name: 'Add Coverage PR Comment',
  uses: 'marocchino/sticky-pull-request-comment@v2',
  if: 'github.event_name == \'pull_request\' && github.event.pull_request.head.repo.full_name == github.event.pull_request.base.repo.full_name',
  with: {
    recreate: true,
    path: 'code-coverage-results.md',
  },
});
const runner = 'LARGE_RUNNER_L';
project.buildWorkflow.workflow.file?.patch(
  JsonPatch.replace('/jobs/build/runs-on', `$\{\{ vars.${runner} || 'ubuntu-latest' }}`),
);
project.buildWorkflow.workflow.file?.patch(
  JsonPatch.replace('/on/merge_group', {}),
);

project.upgradeWorkflow.workflows[0].jobs.upgrade.steps.splice(4, 0, {
  name: 'Upgrade frontend dependencies',
  run: 'pnpm upgrade --dir frontend',
});
project.upgradeWorkflow.workflows[0].jobs.upgrade.steps.splice(4, 0, {
  name: 'Upgrade API dependencies',
  run: 'cd src/control-plane/backend/lambda/api/ && pnpm dlx projen upgrade && cd ../../../../../',
});

project.github.actions.set('actions/checkout', 'actions/checkout@v4');
project.github.actions.set('actions/setup-node', 'actions/setup-node@v4');
project.github.actions.set('actions/setup-python', 'actions/setup-python@v5');
project.github.actions.set('actions/upload-artifact', 'actions/upload-artifact@v4');
project.github.actions.set('actions/download-artifact', 'actions/download-artifact@v4');
project.github.actions.set('amannn/action-semantic-pull-request', 'amannn/action-semantic-pull-request@v5');
project.github.actions.set('peter-evans/create-pull-request', 'peter-evans/create-pull-request@v5');

const provisionViperlightScripts = [
  'curl -sL https://deb.nodesource.com/setup_16.x | bash -',
  'curl -sL https://dl.yarnpkg.com/debian/pubkey.gpg | gpg --dearmor | tee /usr/share/keyrings/yarnkey.gpg >/dev/null',
  'echo "deb [signed-by=/usr/share/keyrings/yarnkey.gpg] https://dl.yarnpkg.com/debian stable main" | tee /etc/apt/sources.list.d/yarn.list',
  'apt-get update && apt-get install -y nodejs npm yarn',
  'curl https://viperlight-scanner.s3.us-east-1.amazonaws.com/latest/.viperlightrc -o .viperlightrc',
  'curl https://viperlight-scanner.s3.us-east-1.amazonaws.com/latest/codescan-funcs.sh -o codescan-funcs.sh',
  'curl https://viperlight-scanner.s3.us-east-1.amazonaws.com/latest/viperlight.zip -o viperlight.zip',
  'unzip -q viperlight.zip -d ../viperlight && rm viperlight.zip',
];

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
          `yarn add typescript @aws-sdk/client-s3@${awsSDKServicesVersion} @aws-sdk/client-codebuild@${awsSDKServicesVersion} @aws-sdk/client-sts@${awsSDKServicesVersion}`,
          'mkdir -p output/',
        ],
        script: [
          'npx ts-node scripts/build.ts source-$CI_JOB_ID.zip',
          'mkdir -p build/',
          'unzip output/build_result.zip -d build/',
          'unzip output/test_result.zip -d build/',
          'unzip output/coverage_result.zip -d build/',
          'unzip output/deployment_assets.zip -d build/',
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
            'build/deployment/',
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
          'npm install -g pnpm',
          'pnpm install',
          'pnpm run build',
          'pnpm run test',
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
          'git secrets --register-aws',
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
      'deploy',
    ],
    jobs: {
      'doc-build': {
        stage: 'build',
        image: {
          name: 'public.ecr.aws/docker/library/python:3.9',
        },
        before_script: [
          'python3 -m pip install \'mkdocs<1.5\' \'mkdocs-material<10\' \'mkdocs-material-extensions<1.2\' \'mkdocs-include-markdown-plugin<5\' \'mkdocs-macros-plugin<1\' \'mkdocs-glightbox<1\'',
        ],
        script: [
          'mkdocs build -f ./docs/mkdocs.en.yml -s',
          'mkdocs build -f ./docs/mkdocs.zh.yml -s',
        ],
        rules: [
          {
            if: '$CI_COMMIT_REF_NAME != $DOC_BRANCH',
          },
        ],
      },
      'pages': {
        stage: 'deploy',
        image: {
          name: 'public.ecr.aws/docker/library/python:3.9',
        },
        before_script: [
          'python3 -m pip install \'mkdocs<1.5\' \'mkdocs-material<10\' \'mkdocs-material-extensions<1.2\' \'mkdocs-include-markdown-plugin<5\' \'mkdocs-macros-plugin<1\' \'mkdocs-glightbox<1\'',
        ],
        script: [
          'mkdocs build -f ./docs/mkdocs.en.yml -s --site-dir ../public/en',
          'mkdocs build -f ./docs/mkdocs.zh.yml -s --site-dir ../public/zh',
          'cp -av ./docs/index.html ./public',
        ],
        artifacts: {
          paths: [
            'public',
          ],
        },
        rules: [
          {
            if: '$CI_COMMIT_REF_NAME == $DOC_BRANCH',
          },
        ],
      },
    },
  },
  'semgrep': {
    stages: [
      'build',
    ],
    jobs: {
      semgrep: {
        tags: [
          'arch:amd64',
        ],
        stage: 'build',
        image: {
          name: 'returntocorp/semgrep',
        },
        rules: [
          {
            if: '$CI_MERGE_REQUEST_IID',
          },
          {
            if: '$CI_COMMIT_BRANCH == $CI_DEFAULT_BRANCH',
          },
        ],
        variables: {
          SEMGREP_RULES: 'p/default',
          SEMGREP_GITLAB_JSON: '1',
        },
        script: [
          'semgrep ci --gitlab-sast > gl-sast-report.json || true',
        ],
        artifacts: {
          reports: {
            sast: 'gl-sast-report.json',
          },
        },
      },
    },
  },
  'license-check': {
    stages: [
      'build',
    ],
    jobs: {
      'license header': {
        stage: 'build',
        image: {
          name: 'public.ecr.aws/amazonlinux/amazonlinux:2',
        },
        rules: [
          {
            if: '$CI_MERGE_REQUEST_IID',
          },
          {
            if: '$CI_COMMIT_BRANCH == $CI_DEFAULT_BRANCH',
          },
        ],
        variables: {
          LICENSE_FILE: '/tmp/license-check/license-header.txt',
        },
        before_script: [
          'yum install -y tar gzip git',
          'mkdir -p /tmp/license-check && curl -s https://raw.githubusercontent.com/lluissm/license-header-checker/master/install.sh | bash -s -- -b /tmp/license-check',
          'sed -n 1,12p .projenrc.js > $LICENSE_FILE && cat $LICENSE_FILE',
        ],
        script: [
          '/tmp/license-check/license-header-checker -a -r -i node_modules,cdk.out,coverage $LICENSE_FILE . ts tsx js java && ([[ -z `git status -s` ]] || (echo "Found files violdate with license header" && exit 1))',
        ],
      },
    },
  },
  'viperlight': {
    stages: [
      'build',
    ],
    jobs: {
      viperlight: {
        stage: 'build',
        image: {
          name: 'public.ecr.aws/docker/library/python:3.11',
        },
        rules: [
          {
            if: '$CI_MERGE_REQUEST_IID',
          },
          {
            if: '$CI_COMMIT_BRANCH == $CI_DEFAULT_BRANCH',
          },
        ],
        before_script: provisionViperlightScripts,
        script: [
          './codescan-prebuild-custom.sh',
        ],
      },
    },
  },

  'data-pipeline-spark-etl': {
    stages: [
      'build',
    ],
    jobs: {
      'etl-unit-test': {
        stage: 'build',
        image: {
          name: 'public.ecr.aws/docker/library/gradle:7.6-jdk17',
        },
        variables: {
        },
        rules: [
          {
            if: '$CI_MERGE_REQUEST_IID',
          },
          {
            if: '$CI_COMMIT_BRANCH == $CI_DEFAULT_BRANCH',
          },
        ],
        before_script: [
          'cd ./src/data-pipeline/spark-etl',
        ],

        script: [
          'gradle clean build',
          'gradle jacocoAggregatedReport',
        ],

        artifacts: {
          reports: {
            junit: './src/data-pipeline/spark-etl/build/test-results/test/TEST-*.xml',
            coverage_report: {
              coverage_format: 'cobertura',
              path: './src/data-pipeline/spark-etl/build/reports/jacoco/jacocoAggregatedReport/jacocoAggregatedReport.xml',
            },
          },
        },
        // coverage: '/    - Instruction Coverage: ([0-9.]+)%/',
      },
    },
  },


  'etl-plugin-samples': {
    stages: [
      'build',
    ],
    jobs: {
      'etl-plugin-samples-unit-test': {
        stage: 'build',
        image: {
          name: 'public.ecr.aws/docker/library/gradle:7.6-jdk17',
        },
        variables: {
        },
        rules: [
          {
            if: '$CI_MERGE_REQUEST_IID',
          },
          {
            if: '$CI_COMMIT_BRANCH == $CI_DEFAULT_BRANCH',
          },
        ],
        before_script: [
          'cd ./examples/custom-plugins',
        ],
        script: [
          './build.sh',
        ],
      },
    },
  },

  'mutations-check': {
    stages: [
      'build',
    ],
    jobs: {
      'mutations-check': {
        stage: 'build',
        rules: [
          {
            if: '$CI_MERGE_REQUEST_IID',
          },
          {
            if: '$CI_COMMIT_BRANCH == $CI_DEFAULT_BRANCH',
          },
        ],
        script: [
          'npm install -g pnpm',
          'pnpm install',
          'pnpm projen',
          'pnpm projen eslint',
          'git add .',
          'git diff --staged --patch --exit-code > .repo.patch || export mutations_happened=true',
          'if [ "$mutations_happened" = "true" ]; then cat .repo.patch && exit 1; fi;',
        ],
      },
    },
  },
  'postbuild-scan': {
    stages: [
      'qa',
    ],
    needs: [
      'build',
    ],
    jobs: {
      'postbuild-viperlight': {
        stage: 'qa',
        image: {
          name: 'public.ecr.aws/docker/library/python:3.11',
        },
        rules: [
          {
            if: '$CI_MERGE_REQUEST_IID',
          },
          {
            if: '$CI_COMMIT_BRANCH == $CI_DEFAULT_BRANCH',
          },
        ],
        before_script: provisionViperlightScripts,
        script: [
          'mv build/deployment/global-s3-assets ./deployment/',
          './codescan-prebuild-custom.sh',
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
  'cfn-lint': {
    stages: [
      'qa',
    ],
    needs: [
      'build',
    ],
    jobs: {
      'cfn-lint': {
        image: {
          name: 'public.ecr.aws/docker/library/python:3.9',
        },
        stage: 'qa',
        before_script: [
          'python3 -m pip install cfn-lint',
        ],
        script: [
          'cd build',
          'cfn-lint -i W3005 -e -r us-east-1,ap-northeast-1 -t cdk.out/*.template.json',
          'cfn-lint -i W3005 -e -r ap-east-1 --ignore-templates cdk.out/data-reporting-quicksight-stack.template.json --ignore-templates cdk.out/*NewServerlessRedshift*.nested.template.json --ignore-templates cdk.out/data-pipeline-stack.template.json --ignore-templates cdk.out/datapipeline*.nested.template.json --ignore-templates cdk.out/cloudfront-s3-control-plane-stack-global* --ignore-templates cdk.out/*cognito-control-plane-stack.template.json --ignore-templates cdk.out/public-exist-vpc-custom-domain-control-plane-stack.template.json -t cdk.out/*.template.json',
          'cfn-lint -i W3005 -e -r cn-north-1,cn-northwest-1 --ignore-templates cdk.out/data-reporting-quicksight-stack.template.json --ignore-templates cdk.out/*NewServerlessRedshift*.nested.template.json --ignore-templates cdk.out/data-pipeline-stack.template.json --ignore-templates cdk.out/datapipeline*.nested.template.json --ignore-templates cdk.out/cloudfront-s3-control-plane-stack-global*.json --ignore-templates cdk.out/*cognito-control-plane-stack.template.json --ignore-templates cdk.out/public-exist-vpc-custom-domain-control-plane-stack.template.json --ignore-templates cdk.out/ingestionserver*.nested.template.json  -t cdk.out/*.template.json',
        ],
      },
    },
  },
});

project.package.addField('packageManager', `pnpm@${pnpmVersion}`);
project.npmrc.addConfig('auto-install-peers', 'true');

new PnpmWorkspace(project);
new Nx(project);
project.synth();