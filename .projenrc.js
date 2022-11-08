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
        script: [
          'yarn install --check-files',
          'npx projen build',
          'git add .',
          'git diff --staged --patch --exit-code > .repo.patch || (echo "::error::Files were changed during build (see build log). If this was triggered from a fork, you will need to update your branch." && exit 1)',
        ],
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