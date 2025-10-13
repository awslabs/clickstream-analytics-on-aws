# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

py.test -s -m "smoke" \
 --region ap-northeast-2 \
 --environment autotest \
 --maxfail=999 \
 --continue-on-collection-errors \
 --log-format="%(asctime)s %(levelname)s %(message)s" \
 --log-date-format="%Y-%m-%d %H:%M:%S" \
 --html=report.html cases/