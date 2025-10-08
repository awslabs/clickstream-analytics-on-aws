
# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0


import pytest


def pytest_addoption(parser):
    parser.addoption("--region", action="store", default='ap-northeast-2', help="the region main stack deployed")
    parser.addoption("--environment", action="store", default='autotest', help="the test environment: autotest OR nightswatch ")
    parser.addoption("--stack_name", action="store", default='clickstream-develop', help="stack name") 