#!/usr/bin/env bash
set -euxo pipefail

title() {
    echo "------------------------------------------------------------------------------"
    echo $*
    echo "------------------------------------------------------------------------------"
}

run() {
    >&2 echo "[run] $*"
    $*
}

# Update dictionary data
update_dict() {
    local target=$1
    local prefix=$2

    git restore src/control-plane/backend/config/dictionary.json
    sed -i'' -e 's/__SOLUTION_NAME__/'$SOLUTION_NAME'/g' src/control-plane/backend/config/dictionary.json
    sed -i'' -e 's/__DIST_OUTPUT_BUCKET__/'$BUCKET_NAME'/g' src/control-plane/backend/config/dictionary.json
    sed -i'' -e 's~__TARGET__~'$target'~g' src/control-plane/backend/config/dictionary.json
    sed -i'' -e 's~__PREFIX__~'$prefix'~g' src/control-plane/backend/config/dictionary.json
    sed -i'' -e 's/__SOLUTION_VERSION__/'$SOLUTION_VERSION'/g' src/control-plane/backend/config/dictionary.json
    cat src/control-plane/backend/config/dictionary.json
}

__dir="$(cd "$(dirname $0)";pwd)"
SRC_PATH="${__dir}/../"

if [ -z "$1" ] || [ -z "$2" ]; then
    echo "Parameters not enough"
    echo "Example: $(basename $0) <BUCKET_NAME> <SOLUTION_NAME> [VERSION]"
    exit 1
fi

export BUCKET_NAME=$1
export SOLUTION_NAME=$2
export BUILD_VERSION=$3
export GLOBAL_S3_ASSETS_PATH="${__dir}/global-s3-assets"
# assign solution version in template output
export SOLUTION_VERSION=$BUILD_VERSION

title "init env"

run rm -rf ${GLOBAL_S3_ASSETS_PATH} && run mkdir -p ${GLOBAL_S3_ASSETS_PATH}

echo "BUCKET_NAME=${BUCKET_NAME}"
echo "SOLUTION_NAME=${SOLUTION_NAME}"
echo "BUILD_VERSION=${BUILD_VERSION}"
echo "${BUILD_VERSION}" > ${GLOBAL_S3_ASSETS_PATH}/version

title "cdk synth"

run cd ${SRC_PATH}
run yarn install --check-files --frozen-lockfile
run npx projen

export USE_BSS=true
# see https://github.com/aws-samples/cdk-bootstrapless-synthesizer/blob/main/API.md for how to config
export BSS_TEMPLATE_BUCKET_NAME="${BUCKET_NAME}"
export BSS_FILE_ASSET_BUCKET_NAME="${BUCKET_NAME}-\${AWS::Region}"
export FILE_ASSET_PREFIX="${SOLUTION_NAME}/${BUILD_VERSION}/"

# container support
export BSS_IMAGE_ASSET_TAG_PREFIX="${BUILD_VERSION}-"

export BSS_IMAGE_ASSET_ACCOUNT_ID=${AWS_CN_ASSET_ACCOUNT_ID}
export BSS_IMAGE_ASSET_REGION_SET="cn-north-1,cn-northwest-1"
export BSS_FILE_ASSET_REGION_SET="cn-north-1,cn-northwest-1"
run mkdir -p ${GLOBAL_S3_ASSETS_PATH}/${CN_ASSETS}
export BSS_FILE_ASSET_PREFIX="${FILE_ASSET_PREFIX}${CN_ASSETS}"

update_dict $TARGET ${CN_ASSETS}
run npx cdk synth --json --output ${GLOBAL_S3_ASSETS_PATH}/${CN_ASSETS}

export BSS_IMAGE_ASSET_ACCOUNT_ID=${AWS_ASSET_ACCOUNT_ID}
export BSS_FILE_ASSET_REGION_SET="$REGIONS"
export BSS_IMAGE_ASSET_REGION_SET=${BSS_FILE_ASSET_REGION_SET}

if [ ! -z "$AWS_ASSET_PUBLISH_ROLE" ]; then
run export BSS_FILE_ASSET_PUBLISHING_ROLE_ARN="$AWS_ASSET_PUBLISH_ROLE"
run export BSS_IMAGE_ASSET_PUBLISHING_ROLE_ARN="$AWS_ASSET_PUBLISH_ROLE"
fi

IFS=',' read -r -a prefixes <<< "$GLOBAL_ASSETS"
mkdir -p ${GLOBAL_S3_ASSETS_PATH}/${prefixes[0]}

export BSS_FILE_ASSET_PREFIX="${FILE_ASSET_PREFIX}${prefixes[0]}"

update_dict $TARGET ${prefixes[0]}
run npx cdk synth --json --output ${GLOBAL_S3_ASSETS_PATH}/${prefixes[0]}
