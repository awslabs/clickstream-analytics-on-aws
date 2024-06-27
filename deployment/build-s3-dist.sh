#!/bin/bash
######################################################################################################################
#  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.                                                #
#                                                                                                                    #
#  Licensed under the Apache License, Version 2.0 (the "License"). You may not use this file except in compliance    #
#  with the License. A copy of the License is located at                                                             #
#                                                                                                                    #
#      http://www.apache.org/licenses/LICENSE-2.0                                                                    #
#                                                                                                                    #
#  or in the 'license' file accompanying this file. This file is distributed on an 'AS IS' BASIS, WITHOUT WARRANTIES #
#  OR CONDITIONS OF ANY KIND, express or implied. See the License for the specific language governing permissions    #
#  and limitations under the License.                                                                                #
######################################################################################################################

# This script will perform the following tasks:
#   1. Remove any old dist files from previous runs.
#   2. Install dependencies for the cdk-solution-helper; responsible for
#      converting standard 'cdk synth' output into solution assets.
#   3. Build and synthesize your CDK project.
#   4. Run the cdk-solution-helper on template outputs and organize
#      those outputs into the /global-s3-assets folder.
#   5. Organize source code artifacts into the /regional-s3-assets folder.
#   6. Remove any temporary files generated from build
#
# This script should be run from the repo's deployment directory
# cd deployment
# ./build-s3-dist.sh template-bucket-name solution-name version-code 
#
# Parameters:
#  - solution-name: name of the solution for consistency
#  - version-code: version of the package

#-----------------------
# Formatting
bold=$(tput bold)
normal=$(tput sgr0)
#------------------------------------------------------------------------------
# SETTINGS
#------------------------------------------------------------------------------
template_format="json"
run_helper="true"

# run_helper is false for yaml - not supported
[[ $template_format == "yaml" ]] && {
    run_helper="false"
    echo "${bold}Solution_helper disabled:${normal} template format is yaml"
}

#------------------------------------------------------------------------------
# DISABLE OVERRIDE WARNINGS
#------------------------------------------------------------------------------
# Use with care: disables the warning for overridden properties on 
# AWS Solutions Constructs
export overrideWarningsEnabled=false

#------------------------------------------------------------------------------
# Build Functions 
#------------------------------------------------------------------------------
# Echo, execute, and check the return code for a command. Exit if rc > 0
# ex. do_cmd npm run build
usage() 
{
    echo "Usage: $0 bucket solution-name version"
    echo "Please provide the base source bucket name, trademarked solution name, and version." 
    echo "For example: ./build-s3-dist.sh mybucket my-solution v1.0.0" 
    exit 1 
}

do_cmd() 
{
    echo "------ EXEC $*"
    $*
    rc=$?
    if [ $rc -gt 0 ]
    then
            echo "Aborted - rc=$rc"
            exit $rc
    fi
}

sedi()
{
    # cross-platform for sed -i
    sed -i $* 2>/dev/null || sed -i "" $*
}

# use sed to perform token replacement
# ex. do_replace myfile.json %%VERSION%% v1.1.1
do_replace() 
{
    replace="s/$2/$3/g"
    file=$1
    do_cmd sedi $replace $file
}

#handle special case that in $3 has '/'
do_replace_1() 
{
    replace="s#$2#$3#g"
    file=$1
    do_cmd sedi $replace $file
}

create_template_json() 
{
    do_cmd npm install -g pnpm@8.15.3
    do_cmd pnpm nx run-many --target=build
    # Run 'cdk synth' to generate raw solution outputs
    do_cmd npx cdk synth --output=$staging_dist_dir

    # Remove unnecessary output files
    do_cmd cd $staging_dist_dir
    # ignore return code - can be non-zero if any of these does not exist
    rm tree.json manifest.json cdk.out

    # Move outputs from staging to template_dist_dir
    echo "Move outputs from staging to template_dist_dir"
    do_cmd mv $staging_dist_dir/*.template.json $template_dist_dir/

    # Rename all *.template.json files to *.template
    # echo "Rename all *.template.json to *.template"
    # echo "copy templates and rename"
    # for f in $template_dist_dir/*.template.json; do
    #     mv -- "$f" "${f%.template.json}.template"
    # done
}

create_template_yaml() 
{
    # Assumes current working directory is where the CDK is defined
    # Output YAML - this is currently the only way to do this for multiple templates
    maxrc=0
    for template in `cdk list`; do
        echo Create template $template
        npx cdk synth $template > ${template_dist_dir}/${template}.template
        if [[ $? > $maxrc ]]; then
            maxrc=$?
        fi
    done
}

cleanup_temporary_generted_files()
{
    echo "------------------------------------------------------------------------------"
    echo "${bold}[Cleanup] Remove temporary files${normal}"
    echo "------------------------------------------------------------------------------"

    # Delete generated files: CDK Consctruct typescript transcompiled generted files
    do_cmd cd $source_dir/
    #do_cmd npm run cleanup:tsc

    # Delete the temporary /staging folder
    do_cmd rm -rf $staging_dist_dir
}

fn_exists()
{
    exists=`LC_ALL=C type $1`
    return $?
}

update_dict() {
    local target=$1
    local prefix=$2
    currDir=$(pwd);

    cd ${CODEBUILD_SRC_DIR}

    sed -i'' -e 's/__SOLUTION_NAME__/'$SOLUTION_NAME'/g' src/control-plane/backend/lambda/api/config/dictionary.json
    sed -i'' -e 's/__DIST_OUTPUT_BUCKET__/'$TEMPLATE_OUTPUT_BUCKET'/g' src/control-plane/backend/lambda/api/config/dictionary.json
    sed -i'' -e 's~__TARGET__~'$target'~g' src/control-plane/backend/lambda/api/config/dictionary.json
    sed -i'' -e 's~__PREFIX__~'$prefix'~g' src/control-plane/backend/lambda/api/config/dictionary.json
    sed -i'' -e 's/__SOLUTION_VERSION__/'$VERSION'/g' src/control-plane/backend/lambda/api/config/dictionary.json
    cat src/control-plane/backend/lambda/api/config/dictionary.json

    cd $currDir
}

#------------------------------------------------------------------------------
# Validate command line parameters
#------------------------------------------------------------------------------
if [ -z "$1" ] || [ -z "$2" ] || [ -z "$3" ]; then
    usage
    exit 1
fi

export SOLUTION_BUCKET="$1"
solution_name="$2"
export SOLUTION_NAME="$solution_name"
export SOLUTION_TRADEMARKEDNAME="$solution_name"
export VERSION="$3"

#------------------------------------------------------------------------------
# INITIALIZATION
#------------------------------------------------------------------------------
# solution_config must exist in the deployment folder (same folder as this 
# file) . It is the definitive source for solution ID.
#
# Example:
#
# SOLUTION_ID='SO0111'
if [[ -e './solution_config' ]]; then
    source ./solution_config
else
    echo "solution_config is missing from the solution root."
    exit 1
fi

if [[ -z $SOLUTION_ID ]]; then
    echo "SOLUTION_ID is missing from ../solution_config"
    exit 1
else
    export SOLUTION_ID
fi

if [[ -z $SOLUTION_ECR_BUILD_VERSION ]]; then
    echo "SOLUTION_ECR_BUILD_VERSION is missing from ../solution_config"
    exit 1
else 
    export SOLUTION_ECR_BUILD_VERSION
fi

if [[ -z $SOLUTION_ECR_ACCOUNT ]]; then
    echo "SOLUTION_ECR_ACCOUNT is missing from ../solution_config"
    exit 1
else 
    export SOLUTION_ECR_ACCOUNT
fi

if [[ -z $SOLUTION_ECR_REPO_NAME ]]; then
    echo "SOLUTION_ECR_REPO_NAME is missing from ../solution_config"
    exit 1
else 
    export SOLUTION_ECR_REPO_NAME
fi

if [[ -z $SOLUTION_ECR_IMAGE_PLATFORM ]]; then
    echo "SOLUTION_ECR_IMAGE_PLATFORM is missing from ../solution_config"
    exit 1
else 
    export SOLUTION_ECR_IMAGE_PLATFORM
fi

if [[ -z ${SOLUTION_CN_TEMPLATES[@]} ]]; then
    echo "SOLUTION_CN_TEMPLATES is missing from ../solution_config"
    exit 1
else 
    export SOLUTION_CN_TEMPLATES
fi


# Validate command line input - must provide bucket
[[ -z $1 ]] && { usage; exit 1; } || { SOLUTION_BUCKET=$1; }

# Environmental variables for use in CDK
export DIST_OUTPUT_BUCKET=$SOLUTION_BUCKET
# set TARGET based on pipeline type
export PIPELINE_TYPE=${PIPELINE_TYPE:-feature}
export TARGET=$VERSION
if [[ $PIPELINE_TYPE == "release" ]]; then
    TARGET='latest'
fi

update_dict $TARGET ''

#-----------------------------------------------------------------------------------
# Get reference for all important folders
#-----------------------------------------------------------------------------------
template_dir="$PWD"
staging_dist_dir="$template_dir/staging"
template_dist_dir="$template_dir/global-s3-assets"
build_dist_dir="$template_dir/regional-s3-assets"
source_dir="$template_dir/../"

echo "------------------------------------------------------------------------------"
echo "${bold}[Init] Remove any old dist files from previous runs${normal}"
echo "------------------------------------------------------------------------------"

do_cmd rm -rf $template_dist_dir
do_cmd mkdir -p $template_dist_dir
do_cmd rm -rf $build_dist_dir
do_cmd mkdir -p $build_dist_dir
do_cmd rm -rf $staging_dist_dir
do_cmd mkdir -p $staging_dist_dir

echo "------------------------------------------------------------------------------"
echo "${bold}[Init] Install dependencies for the cdk-solution-helper${normal}"
echo "------------------------------------------------------------------------------"

do_cmd cd $template_dir/cdk-solution-helper
do_cmd npm install

echo "------------------------------------------------------------------------------"
echo "${bold}[Synth] CDK Project${normal}"
echo "------------------------------------------------------------------------------"

# Install and build web console asset
# This is done in run-all-tests.sh
# do_cmd cd $source_dir/portal
# do_cmd npm install

# export PATH=$(npm bin):$PATH
# do_cmd npm run build


# Install the global aws-cdk package
# Note: do not install using global (-g) option. This makes build-s3-dist.sh difficult
# for customers and developers to use, as it globally changes their environment.
do_cmd npm install -g pnpm@8.15.3
do_cmd cd $source_dir/
do_cmd pnpm install --frozen-lockfile
do_cmd pnpm projen

# Add local install to PATH
export PATH=$(npm bin):$PATH
# do_cmd npm run build       # build javascript from typescript to validate the code
                           # cdk synth doesn't always detect issues in the typescript
                           # and may succeed using old build files. This ensures we
                           # have fresh javascript from a successful build


echo "------------------------------------------------------------------------------"
echo "copy ecr image to the deployment folder"
echo "------------------------------------------------------------------------------"
image_root_dir="$template_dir/ecr"
do_cmd mkdir -p $image_root_dir

# copy nginx image to the deployment folder
nginx_image_source_path="$source_dir/src/ingestion-server/server/images/nginx"
nginx_image_dist_path="$image_root_dir/clickstream-nginx"
do_cmd cp -rf $nginx_image_source_path $nginx_image_dist_path
do_replace $nginx_image_dist_path/Dockerfile \$PLATFORM_ARG ${SOLUTION_ECR_IMAGE_PLATFORM}

# copy vector image to the deployment folder
vector_image_source_path="$source_dir/src/ingestion-server/server/images/vector"
vector_image_dist_path="$image_root_dir/clickstream-vector"
do_cmd cp -rf $vector_image_source_path $vector_image_dist_path
do_replace $vector_image_dist_path/Dockerfile \$PLATFORM_ARG ${SOLUTION_ECR_IMAGE_PLATFORM}

echo "------------------------------------------------------------------------------"
echo "${bold}[Create] Templates${normal}"
echo "------------------------------------------------------------------------------"

if fn_exists create_template_${template_format}; then
    create_template_${template_format}
else
    echo "Invalid setting for \$template_format: $template_format"
    exit 255
fi

echo "------------------------------------------------------------------------------"
echo "${bold}[Packing] Template artifacts${normal}"
echo "------------------------------------------------------------------------------"

# Run the helper to clean-up the templates and remove unnecessary CDK elements
echo "Run the helper to clean-up the templates and remove unnecessary CDK elements"
[[ $run_helper == "true" ]] && {
    echo "node $template_dir/cdk-solution-helper/index"
    node $template_dir/cdk-solution-helper/index
    if [ "$?" = "1" ]; then
    	echo "(cdk-solution-helper) ERROR: there is likely output above." 1>&2
    	exit 1
    fi
} || echo "${bold}Solution Helper skipped: ${normal}run_helper=false"

# Find and replace bucket_name, solution_name, and version
echo "Find and replace bucket_name, solution_name, and version"
cd $template_dist_dir
do_replace "*.template.json" %%BUCKET_NAME%% ${SOLUTION_BUCKET}
do_replace "*.template.json" %%SOLUTION_NAME%% ${SOLUTION_TRADEMARKEDNAME}
do_replace "*.template.json" %%VERSION%% ${VERSION}
do_replace "*.template.json" %%TEMPLATE_OUTPUT_BUCKET%% ${TEMPLATE_OUTPUT_BUCKET}
do_replace_1 "*.template.json" %%PUBLIC_ECR_REGISTRY%% ${PUBLIC_ECR_REGISTRY}
do_replace "*.template.json" %%PUBLIC_ECR_TAG%% ${PUBLIC_ECR_TAG}


for cn_template in ${SOLUTION_CN_TEMPLATES[@]}; do 
   echo $cn_template
   template_name=$(basename $cn_template)
   if [[ $(echo $template_name | grep 'stack.template.json') ]]; then
       template_name=$(echo $template_name | sed 's/stack.template.json/stack-cn.template.json/')
   fi 
   echo $template_name
   do_cmd curl -s $cn_template -o ./$template_name
done
 
echo "------------------------------------------------------------------------------"
echo "${bold}[Packing] Source code artifacts${normal}"
echo "------------------------------------------------------------------------------"

# ... For each asset.* source code artifact in the temporary /staging folder...
cd $staging_dist_dir
for d in `find . -mindepth 1 -maxdepth 1 -type d`; do

    # pfname = asset.<key-name>
    pfname="$(basename -- $d)"

    # zip folder
    echo "zip -rq $pfname.zip $pfname"
    cd $pfname
    zip -rq $pfname.zip *
    mv $pfname.zip ../
    cd ..

    # Remove the old, unzipped artifact from /staging
    echo "rm -rf $pfname"
    rm -rf $pfname

    # ... repeat until all source code artifacts are zipped and placed in the /staging
done


# ... For each asset.*.zip code artifact in the temporary /staging folder...
cd $staging_dist_dir
for f in `find . -iname \*.zip`; do
    # Rename the artifact, removing the period for handler compatibility
    # pfname = asset.<key-name>.zip
    pfname="$(basename -- $f)"
    echo $pfname
    # fname = <key-name>.zip
    fname="$(echo $pfname | sed -e 's/asset\.//g')"
    mv $pfname $fname

    # Copy the zipped artifact from /staging to /regional-s3-assets
    echo "cp $fname $build_dist_dir"
    cp $fname $build_dist_dir

    # Remove the old, zipped artifact from /staging
    echo "rm $fname"
    rm $fname
done

# cleanup temporary generated files that are not needed for later stages of the build pipeline
cleanup_temporary_generted_files

# Return to original directory from when we started the build
cd $template_dir