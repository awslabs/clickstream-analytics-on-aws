export AWS_URL_SUFFIX=amazonaws.com
export WITH_AUTH_MIDDLEWARE=false
export LOG_LEVEL=INFO
export POWERTOOLS_LOGGER_LOG_EVENT=true
export POWERTOOLS_LOGGER_SAMPLE_RATE=1
export POWERTOOLS_SERVICE_NAME=ClickStreamAnalyticsOnAWS
export PREFIX_TIME_GSI_NAME=prefix-time-index
export S3_MAIN_REGION=us-east-1
export AWS_ACCOUNT_ID=451426793911
export AWS_REGION=us-east-1
export API_ROLE_NAME=cloudfront-s3-control-pla-ClickStreamApiClickStrea-1UZPOV0RIJ1VQ
export CLICK_STREAM_TABLE_NAME=cloudfront-s3-control-plane-stack-global-ClickStreamApiClickstreamMetadataEC136DD8-7TGG55UCB02E
export DICTIONARY_TABLE_NAME=cloudfront-s3-control-plane-stack-global-ClickStreamApiClickstreamDictionaryFDA4AD32-7DD5T6AHYIIA
export STACK_ACTION_SATE_MACHINE=arn:aws:states:us-east-1:451426793911:stateMachine:ClickStreamApiStackActionStateMachine21A0158C-H403KzuPsrfD
export STACK_WORKFLOW_S3_BUCKET=cloudfront-s3-control-pl-clickstreamsolutiondatab-1mhkmxpeoeamt
export STACK_WORKFLOW_SATE_MACHINE=arn:aws:states:us-east-1:451426793911:stateMachine:clickstream-stack-workflow-088acc00
export STS_UPLOAD_ROLE_ARN=arn:aws:iam::451426793911:role/cloudfront-s3-control-pla-ClickStreamApiUploadRole-1R71ZAX32J1SC
export PORT=7777
cd ./src/control-plane/backend/lambda/api
yarn dev
