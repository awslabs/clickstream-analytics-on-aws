# Clickstream Analytics on AWS Functional Test

The main testing content is to verify whether the solution can create projects and apps normally through function testing after the deployment test is completed.

## Getting started

It is necessary to create a **VPC** in the region where function testing is executed.
- We create a VPC through CloudFormation, and the stack name is: `clickstream-workshop-new`.
- The testing program will retrieve the VPC information of the current region through the stack resource(`cases/conftest.py`) each time, and write it into the configuration file(`cases/config.yml`).
- Subsequently, as API parameters for creating projects and apps.


## Run Test

```shell
bash run_test.sh \
  --profile default \
  --region ap-northeast-2 \
  --environment autotest \
```

```shell
bash run_test.sh --help

Usage: run_test.sh --profile PROFILE --region REGION --environment ENV --stack-name STACK

Required Parameters if environment is 'local':
--stack-name      CloudFormation stack name

Optional Parameters:
--use-default-config  Use default config file instead of generating one
--environment     Environment name, e.g autotest, nightswatch. defaults to 'local'.
--extras          Append more commands to pytest run
-h, --help        Show this message
-v, --verbose     Verbose output
```

**--environment**: The stack name may vary after deploying solutions in different environments
 - autotest: Test with stack: `clickstream-develop`
 - nightswatch: Main stack name start with `tCaT-cs-cloudfront-s3`
 - local: Custom stack name
