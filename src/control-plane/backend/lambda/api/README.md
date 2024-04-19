# Backend Api Server

This server is an [Express](https://expressjs.com/) application. 

Using [AWS Lambda Adapter](https://github.com/awslabs/aws-lambda-web-adapter), can package this application into Docker image, push to ECR, and deploy to Lambda, ECS/EKS, or EC2.

And server can adapter `ApiGateway Event` && `ALB Event`, meet different deployment requirements.

The application can be deployed in an AWS account using the [Serverless Application Model](https://github.com/awslabs/serverless-application-model). 
The `sam-dev-template.yaml` file in the root folder contains the application definition.

## Pre-requisites

The following tools should be installed and configured. 
* [AWS CLI](https://aws.amazon.com/cli/)
* [SAM CLI](https://github.com/awslabs/aws-sam-cli)
* [Node](https://nodejs.org/en/)
* [Docker](https://www.docker.com/products/docker-desktop)

## Deploy to Lambda with SAM
Navigate to the sample's folder and use the SAM CLI to build a container image
```shell
aws ecr-public get-login-password --region us-east-1 | docker login --username AWS --password-stdin public.ecr.aws
sam build --use-container -t sam-dev-template.yaml
```

This command compiles the application and prepares a deployment package in the `.aws-sam` sub-directory.

To deploy the application in your AWS account, you can use the SAM CLI's guided deployment process and follow the instructions on the screen

```shell
$ sam deploy --guided
```
Please take note of the container image name.
Once the deployment is completed, the SAM CLI will print out the stack's outputs, including the new application URL. You can use `curl` or a web browser to make a call to the URL

```shell
...
---------------------------------------------------------------------------------------------------------
Outputs
---------------------------------------------------------------------------------------------------------
Key                 ExpressApi                                                                                                                                                                                                      
Description         API Gateway endpoint URL for Prod stage for Express function                                                                                                                                                    
Value               https://xxxxxxxxxx.execute-api.us-east-1.amazonaws.com/ 
---------------------------------------------------------------------------------------------------------
...

$ curl https://xxxxxxxxxx.execute-api.us-east-1.amazonaws.com/ 
```

Clean Lambda
```shell
sam delete
```

## Run the docker locally

We can run the same docker image locally, so that we know it can be deployed to ECS Fargate and EKS EC2 without code changes.

```shell
$ docker run -d -p 8080:8080 {ECR Image}

```

Use curl to verify the docker container works.

```shell
$ curl localhost:8080/ 
```

## Local Deployment
Installation dependency
```shell
pnpm install
```

Local running
```shell
pnpm dev
```

Use curl to verify the server works.

```shell
curl http://localhost:8080/
```

Build server
```shell
pnpm build
```

