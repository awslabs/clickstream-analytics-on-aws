#!/bin/bash
set -e

curr_dir=$(pwd)

echo $curr_dir

echo "Build custom-enrich ...."

cd $curr_dir/custom-enrich

./gradlew clean build

ls -l  ./build/libs/*.jar

echo ""
echo "Build custom-sdk-transformer ...."

cd $curr_dir/custom-sdk-transformer

./gradlew clean build

ls -l  ./build/libs/*.jar
