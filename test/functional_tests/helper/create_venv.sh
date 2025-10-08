#!/bin/bash
###############################################################################
# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0
#
# PURPOSE:
#  Check a temporary Python virtualenv to run tests
###############################################################################

create_venv() {
  # Get the directory where this script is located
  script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

  # Check if the virtual environment already exists
  venv_check_status=$(python3 "$script_dir/venv_check.py"; echo $?)

  # If the virtual environment doesn't exist, create it
  if [[ "$venv_check_status" == 1 ]]; then
    echo "------------------------------------------------------------------------------"
    echo "Creating a temporary Python virtualenv for this run test script"
    echo "------------------------------------------------------------------------------"
    VENV=$(mktemp -d) && echo "$VENV"
    command -v python3 >/dev/null
    if [ $? -ne 0 ]; then
      echo "ERROR: install Python3 before running this script"
      exit 1
    fi
    python3 -m venv "$VENV"
    source "$VENV"/bin/activate
    pip install --upgrade pip
    pip install wheel
    pip install -q -r requirements.txt
  else
    echo "------------------------------------------------------------------------------"
    echo "[Env] Using active virtual environment for tests"
    echo "------------------------------------------------------------------------------"
  fi
}
