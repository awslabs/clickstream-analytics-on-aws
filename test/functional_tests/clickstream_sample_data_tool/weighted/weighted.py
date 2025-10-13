# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import random


class WeightedArray:
    def __init__(self, items_with_weights):
        self.items, self.weights = zip(*items_with_weights)

    def get_random_item(self):
        return random.choices(self.items, weights=self.weights)[0]
