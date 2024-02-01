#!/bin/bash

# This script is used to run frontend server in local environment.

# Get user pool in the control plane stack
userPoolResource=$(aws cloudformation list-stack-resources --stack-name $CONTROL_PLANE_STACK_NAME --query "StackResourceSummaries[?ResourceType=='AWS::Cognito::UserPool']")
userPoolPhysicalResourceId=$(echo "$userPoolResource" | jq -r '.[].PhysicalResourceId')
echo "userPoolPhysicalResourceId: $userPoolPhysicalResourceId"

# Get control plane s3 bucket 
allBuckets=$(aws cloudformation list-stack-resources --stack-name $CONTROL_PLANE_STACK_NAME --query "StackResourceSummaries[?ResourceType=='AWS::S3::Bucket']")
for bucket in $(echo "$allBuckets" | jq -c '.[]'); do
    logical_resource_id=$(echo "$bucket" | jq -r '.LogicalResourceId')
    physical_resource_id=$(echo "$bucket" | jq -r '.PhysicalResourceId')
    # if logical_resource_id contains ClickstreamSolutionDataBucket
    if [[ "$logical_resource_id" == *"ClickstreamSolutionDataBucket"* ]]; then
        SolutionDataBucket=$physical_resource_id
    fi
done

echo "SolutionDataBucket: $SolutionDataBucket"
if [ -z "$SolutionDataBucket" ]; then
    echo "Error: SolutionDataBucket not found."
    exit 1
fi

# Create new file setupProxy.js and add the content into file
cat > ../../frontend/src/setupProxy.js <<EOF
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function (app) {
  app.use(
    '/api',
    createProxyMiddleware({
      target: 'http://localhost:8080',
      changeOrigin: true,
    })
  );
};
EOF

# Create new file aws-exports.json and add the content into file
cat > ../../frontend/public/aws-exports.json <<EOF
{
    "oidc_provider": "https://cognito-idp.$AWS_REGION.amazonaws.com/$userPoolPhysicalResourceId",
    "oidc_client_id": "75oj7ch4ls3lnhhiglt0bu27k8",
    "oidc_redirect_url": "http://localhost:3000/signin",
    "solution_version": "v1",
    "control_plane_mode": "CLOUDFRONT",
    "solution_data_bucket": "$SolutionDataBucket",
    "solution_plugin_prefix": "plugins/",
    "solution_region": "$AWS_REGION"
}
EOF


# Run the server
cd ../../frontend/ && yarn install && yarn start



