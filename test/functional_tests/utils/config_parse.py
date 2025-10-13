# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import yaml
import json
from yaml.loader import SafeLoader


def config_parser(config_path):
    with open(config_path, 'r', encoding='utf-8') as fin:
        config = yaml.safe_load(fin)
    return config


def multi_document_yaml_parser(config_path):
    with open(config_path, 'r', encoding='utf-8') as fin:
        data = list(yaml.load_all(fin, Loader=SafeLoader))
    return data


def json_parser(json_file):
    with open(json_file) as j:
        json_file = json.load(j)
    return json_file







