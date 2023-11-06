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
const version = '1.0.0';
const cdkVersion = '2.81.0';
const minNodeVersion = '18.17.0';

const cdkAlphaModules = [
  '@aws-cdk/aws-glue-alpha',
  '@aws-cdk/aws-servicecatalogappregistry-alpha',
].map(m => `${m}@^${cdkVersion}-alpha.0`);

const commonDeps = [
  'uuid@^9.0.0',
  '@types/aws-lambda@^8.10.110',
  '@aws-lambda-powertools/logger@^1.8.0',
  '@aws-lambda-powertools/metrics@^1.8.0',
  'jsonwebtoken@^9.0.0',
  'jwks-rsa@^3.0.1',
  'mustache@^4.2.0',
  'node-fetch@^2.6.4',
  'node-cache@^5.1.2',
  'cron-parser@^4.8.1',
  'jsonpath-plus@^7.2.0',
];

const commonDevDeps = [
  '@types/uuid@^9.0.0',
  'aws-sdk-client-mock@^2.1.1',
  'aws-sdk-client-mock-jest@^2.1.1',
  '@types/mustache@^4.2.2',
  'mock-fs@^5.2.0',
  '@types/mock-fs@^4.13.1',
  '@types/node-fetch@^2.6.4',
  '@types/jsonpath-plus@^5.0.2',
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
  '@aws-sdk/client-athena',
  '@aws-sdk/client-iam',
  '@aws-sdk/client-acm',
  '@aws-sdk/client-secrets-manager',
  '@aws-sdk/client-sts',
  '@aws-sdk/client-cloudwatch',
  '@aws-sdk/lib-dynamodb',
  '@aws-sdk/client-emr-serverless',
  '@aws-sdk/client-kafkaconnect',
].map(dep => `${dep}@^${awsSDKServicesVersion}`);

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
  ...smithyPackagesDeps,
  ...awsSDKPackagesDeps,
  ...awsSDKPackagesDepsForApiProject,
  ...awsSDKServicesDepsForApiProject,
];

const devDepsForApiProject = [
  ...commonDevDeps,
  'supertest@^6.3.3',
  'nodemon@^2.0.20',
  'ts-node@^10.9.1',
  '@types/express@^4.17.16',
  '@types/supertest@^2.0.12',
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
project.addFields({ version });

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
  uses: 'aws-actions/amazon-ecr-login@v1',
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

project.upgradeWorkflow.workflows[0].jobs.upgrade.steps.splice(4, 0, {
  name: 'Upgrade frontend dependencies',
  run: 'yarn upgrade --cwd frontend',
});
project.upgradeWorkflow.workflows[0].jobs.upgrade.steps.splice(4, 0, {
  name: 'Upgrade API dependencies',
  run: 'cd src/control-plane/backend/lambda/api/ && npx projen upgrade && cd ../../../../../',
});
project.github.actions.set('actions/checkout', 'actions/checkout@v4');
project.github.actions.set('actions/setup-node', 'actions/setup-node@v4');
project.github.actions.set('amannn/action-semantic-pull-request', 'amannn/action-semantic-pull-request@v5');

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
          'yarn install',
          'yarn run build',
          'yarn run test',
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
          name: 'public.ecr.aws/docker/library/gradle:7.6-jdk11',
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
          name: 'public.ecr.aws/docker/library/gradle:7.6-jdk11',
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
          'yarn install --check-files',
          'npx projen',
          'npx projen eslint',
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

project.synth();