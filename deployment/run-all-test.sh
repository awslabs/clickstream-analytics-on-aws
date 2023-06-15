#!/usr/bin/env bash

set -euxo pipefail

cd ${CODEBUILD_SRC_DIR}

rm frontend/src/ts/constant-ln.ts
cp src/common/constant.ts frontend/src/ts/constant-ln.ts
rm src/control-plane/backend/lambda/api/common/*-ln.ts
cp src/common/constant.ts src/control-plane/backend/lambda/api/common/constants-ln.ts
cp src/common/model.ts src/control-plane/backend/lambda/api/common/model-ln.ts
cp src/common/sdk-client-config.ts src/control-plane/backend/lambda/api/common/sdk-client-config-ln.ts 
cp src/common/solution-info.ts src/control-plane/backend/lambda/api/common/solution-info-ln.ts
rm src/control-plane/backend/lambda/api/middle-ware/authorizer.ts 
cp src/control-plane/auth/authorizer.ts src/control-plane/backend/lambda/api/middle-ware/authorizer.ts 


echo "yarn install"
yarn install --check-files --frozen-lockfile

npx projen 
yarn

echo "npx yarn test"
npx yarn test
   