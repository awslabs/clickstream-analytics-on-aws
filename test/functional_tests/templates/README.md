# Basic usage
## Deploy without waiting
./deploy_stack.sh \
    --stack-name my-stack \
    --template-file template.yml \
    --parameters Environment=dev \
    --region us-west-2 \
    --profile myprofile

## Deploy and wait for completion
./deploy_stack.sh \
    --stack-name my-stack \
    --template-file template.yml \
    --parameters Environment=dev \
    --region us-west-2 \
    --profile myprofile \
    --wait