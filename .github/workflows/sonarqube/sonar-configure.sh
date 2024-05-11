#!/usr/bin/env bash

set -e

# Constants
if [ -z "$SONARQUBE_URL" ]
then
    SONARQUBE_URL="http://localhost:9000"
fi

QUALITY_GATE_NAME='Solution Gate v1'
QUALITY_CONDITION_FILE='quality-gate.json'

info () {
  printf "\e[1;34m[Configuration]:: %s ::\e[0m\n" "$*"
}

error () {
  printf "\e[1;31m[Configuration.bash]:: %s ::\e[0m\n" "$*"
}


wait_sonarqube_up()
{
    sonar_status="DOWN"
    info  "initiating connection with SonarQube."
    while [ "${sonar_status}" != "UP" ]
    do
        sleep 5
        info  "retrieving SonarQube's service status."
        sonar_status=$(curl -s -X GET "${SONARQUBE_URL}/api/system/status" | jq -r '.status')
        info  "SonarQube is ${sonar_status}, expecting it to be UP."
    done
    info  "SonarQube is ${sonar_status}."
}

add_condition_to_quality_gate()
{
    local gate_name=$1
    local metric_key=$2
    local metric_operator=$3
    local metric_errors=$4

    info  "adding quality gate condition: ${metric_key} ${metric_operator} ${metric_errors}."

    threshold=()
    if [ "${metric_errors}" != "none" ]
    then
        threshold=("--data-urlencode" "error=${metric_errors}")
    fi

    res=$(curl -su "admin:$SONARQUBE_ADMIN_PASSWORD" \
                --data-urlencode "gateName=${gate_name}" \
                --data-urlencode "metric=${metric_key}" \
                --data-urlencode "op=${metric_operator}" \
                "${threshold[@]}" \
                "${SONARQUBE_URL}/api/qualitygates/create_condition")
    if [ "$(echo "${res}" | jq '(.errors | length)')" == "0" ]
    then
        info  "metric ${metric_key} condition successfully added."
    else
        info "Failed to add ${metric_key} condition" "$(echo "${res}" | jq '.errors[].msg')"
    fi
}

create_quality_gate()
{
  local gateName=$1

	info  "creating quality gate ${gateName}."
	#Modify the quality gate name as required
    res=$(curl -su "admin:$SONARQUBE_ADMIN_PASSWORD" \
                --data-urlencode "name=${gateName}" \
                "${SONARQUBE_URL}/api/qualitygates/create")
    if [ "$(echo "${res}" | jq '(.errors | length)')" == "0" ]
    then
        info  "successfully created quality gate... now configuring it."
    else
        info "Failed to create quality gate" "$(echo "${res}" | jq '.errors[].msg')"
    fi

    # Retrieve the existing conditions of quality gate
    info  "retrieving quality gate conditions."
    encoded_name=$(printf %s "$gateName" | jq -s -R -r @uri)
    res=$(curl -X GET -su "admin:$SONARQUBE_ADMIN_PASSWORD" \
                "${SONARQUBE_URL}/api/qualitygates/show?name=${encoded_name}")
    if [ "$(echo "${res}" | jq '(.errors | length)')" == "0" ]
    then
        CONDITION_COUNT="$(echo "${res}" |  jq -r '.conditions | length')"
        info  "successfully retrieved $CONDITION_COUNT conditions from quality gate."
        if [ $CONDITION_COUNT -gt 0 ]
        then
            info  "removing all conditions from quality gate."
            # use jq extracts the id from the array conditions field of json response($res)
            # and use it to delete the condition from the quality gate
            for i in $(echo "${res}" | jq -r '.conditions[].id')
            do
              res2=$(curl -su "admin:$SONARQUBE_ADMIN_PASSWORD" \
                --data-urlencode "id=${i}" \
                --output /dev/null \
                --write-out "%{http_code}" \
                "${SONARQUBE_URL}/api/qualitygates/delete_condition")
              if [ $res2 -eq 204 ]
              then
                info  "successfully removed condition ${i} from quality gate."
              else
                error "Failed to remove condition ${i}"
              fi
            done
        fi
    else
        error "Failed to reach quality gate conditions" "$(echo "${res}" | jq '.errors[].msg')"
    fi

    # Adding all conditions of the JSON file
    SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
    info "adding all conditions of $SCRIPT_DIR/${QUALITY_CONDITION_FILE} to the gate."
    len=$(jq '(.conditions | length)' $SCRIPT_DIR/${QUALITY_CONDITION_FILE})
    quality_gate=$(jq '(.conditions)' $SCRIPT_DIR/${QUALITY_CONDITION_FILE})
    for i in $(seq 0 $((len - 1)))
    do
        metric=$(echo "$quality_gate" | jq -r '(.['"$i"'].metric)')
        op=$(echo "$quality_gate" | jq -r '(.['"$i"'].op)')
        error=$(echo "$quality_gate" | jq -r '(.['"$i"'].error)')
        add_condition_to_quality_gate "${gateName}" "$metric" "$op" "$error"
    done

    # Setting it as default quality gate
    info "setting quality gate as default gate."
    res=$(curl -su "admin:$SONARQUBE_ADMIN_PASSWORD" \
                --data-urlencode "name=${gateName}" \
                "${SONARQUBE_URL}/api/qualitygates/set_as_default")
    if [ -z "$res" ]
    then
        info  "successfully set quality gate '${gateName}' as default gate."
    else
        info "Failed to set quality gate '${gateName}' as default gate" "$(echo "${res}" | jq '.errors[].msg')"
    fi
}


# End of functions definition
# ============================================================================ #
# Start script

# Wait for SonarQube to be up
wait_sonarqube_up

# Make sure the database has not already been populated
status=$(curl -i -su "admin:$SONARQUBE_ADMIN_PASSWORD" \
            "${SONARQUBE_URL}/api/qualitygates/list" \
    | sed -n -r -e 's/^HTTP\/.+ ([0-9]+)/\1/p')
status=${status:0:3} # remove \n
nb_qg=$(curl -su "admin:$SONARQUBE_ADMIN_PASSWORD" \
            "${SONARQUBE_URL}/api/qualitygates/list" \
    | jq '.qualitygates | map(select(.name == "${QUALITY_GATE_NAME}")) | length')
if [ "$status" -eq 200 ] && [ "$nb_qg" -eq 1 ]
then
    # admin password has already been changed and the QG has already been added
    info  "The database has already been filled with ${QUALITY_GATE_NAME} configuration. Not adding anything."
else
    # Change admin password
    STATUS_CODE=$(curl -su "admin:admin" \
        --data-urlencode "login=admin" \
        --data-urlencode "password=$SONARQUBE_ADMIN_PASSWORD" \
        --data-urlencode "previousPassword=admin" \
        -w "%{http_code}" -o /dev/null \
        "$SONARQUBE_URL/api/users/change_password")

    if [ "$STATUS_CODE" -lt 300 ]; then
        info  "admin password changed."

        token_gen_resp=$(curl -su "admin:$SONARQUBE_ADMIN_PASSWORD" \
            --data-urlencode "login=admin" \
            --data-urlencode "expirationDate=$(date -d '+1 day' +%Y-%m-%d)" \
            --data-urlencode "name=admin-ci-token" \
            --write-out "HTTPSTATUS:%{http_code}" \
            --output /dev/stdout \
            "${SONARQUBE_URL}/api/user_tokens/generate")
        # Extract the response body
        response_body=$(echo "$token_gen_resp" | sed 's/HTTPSTATUS:[0-9]*$//')

        # Extract the status code
        status_code=$(echo "$token_gen_resp" | sed 's/^.*HTTPSTATUS://')
        if [ "$status_code" -eq 200 ]; then
            token=$(echo "$response_body" | jq -r '.token')
            echo "SONARQUBE_TOKEN=${token}" >> $GITHUB_ENV
            info  "admin-ci-token generated."
        else
            error "admin-ci-token generation failed."
        fi
    else
        error "admin password change failed."
        exit 1
    fi

    # Add QG
    create_quality_gate "${QUALITY_GATE_NAME}"
fi

# Tell the user, we are ready
info "ready!"

exit 0