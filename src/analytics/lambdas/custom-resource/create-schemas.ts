/**
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *
 *  Licensed under the Apache License, Version 2.0 (the "License"). You may not use this file except in compliance
 *  with the License. A copy of the License is located at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 *  or in the 'license' file accompanying this file. This file is distributed on an 'AS IS' BASIS, WITHOUT WARRANTIES
 *  OR CONDITIONS OF ANY KIND, express or implied. See the License for the specific language governing permissions
 *  and limitations under the License.
 */

import { RedshiftDataClient } from '@aws-sdk/client-redshift-data';
import { CdkCustomResourceHandler, CdkCustomResourceEvent, CdkCustomResourceResponse } from 'aws-lambda';
import { logger } from '../../../common/powertools';
import { CreateDatabaseAndSchemas } from '../../private/model';
import { getRedshiftClient, executeStatementsWithWait } from '../redshift-data';

type ResourcePropertiesType = CreateDatabaseAndSchemas & {
  readonly ServiceToken: string;
}

export const handler: CdkCustomResourceHandler = async (event) => {
  logger.info(JSON.stringify(event));
  const response: CdkCustomResourceResponse = {
    PhysicalResourceId: 'create-redshift-db-schemas-custom-resource',
    Data: {
      DatabaseName: event.ResourceProperties.databaseName,
    },
    Status: 'SUCCESS',
  };

  try {
    await _handler(event);
  } catch (e) {
    if (e instanceof Error) {
      logger.error('Error when creating database and schema in redshift', e);
    }
    throw e;
  }
  return response;
};

async function _handler(event: CdkCustomResourceEvent) {
  const requestType = event.RequestType;

  logger.info('RequestType: ' + requestType);
  if (requestType == 'Create') {
    await onCreate(event);
  }

  if (requestType == 'Update') {
    await onUpdate(event);
  }

  if (requestType == 'Delete') {
    await onDelete(event);
  }
}

async function onCreate(event: CdkCustomResourceEvent) {
  logger.info('onCreate()');

  const props = event.ResourceProperties as ResourcePropertiesType;
  // 1. create database in Redshift
  const client = getRedshiftClient(props.dataAPIRole);
  if (props.serverlessRedshiftProps || props.provisionedRedshiftProps) {
    await createDatabaseInRedshift(client, props.databaseName, props);
  } else {
    throw new Error('Can\'t identity the mode Redshift cluster!');
  }

  // 2. create schemas in Redshift for applications
  await createSchemas(props);
}

async function onUpdate(event: CdkCustomResourceEvent) {
  logger.info('onUpdate()');

  const props = event.ResourceProperties as ResourcePropertiesType;
  await createSchemas(props);
}

async function onDelete(_event: CdkCustomResourceEvent) {
  logger.info('onDelete()');
  logger.info('doNothing to keep the database and schema');
}

function splitString(str: string): string[] {
  if (!str.trim()) { // checks if string is blank or only whitespace characters
    return []; // return an empty array
  } else {
    return str.split(','); // split the string by comma
  }
}

async function createSchemas(props: ResourcePropertiesType) {
  const odsTableName = props.odsTableName;

  const appIds = splitString(props.appIds);
  const sqlStatements : string[] = [];
  appIds.forEach(app => {
    sqlStatements.push(`CREATE SCHEMA IF NOT EXISTS ${app}`);
    const createTblStatement = `CREATE TABLE IF NOT EXISTS ${app}.${odsTableName}(`
      + '    app_info SUPER, '
      + '    device SUPER, '
      + '    ecommerce SUPER,'
      + '    event_bundle_sequence_id BIGINT,'
      + '    event_date VARCHAR(255), '
      + '    event_dimensions SUPER,'
      + '    event_id VARCHAR(255)  DEFAULT RANDOM(),'
      + '    event_name VARCHAR(255),'
      + '    event_params SUPER,'
      + '    event_previous_timestamp BIGINT,'
      + '    event_server_timestamp_offset BIGINT,'
      + '    event_timestamp BIGINT,'
      + '    event_value_in_usd VARCHAR(255),'
      + '    geo SUPER, '
      + '    ingest_timestamp BIGINT,'
      + '    items SUPER,'
      + '    platform VARCHAR(255),'
      + '    privacy_info SUPER,'
      + '    project_id VARCHAR(255),'
      + '    traffic_source SUPER,'
      + '    user_first_touch_timestamp BIGINT,'
      + '    user_id VARCHAR(255),'
      + '    user_ltv SUPER,'
      + '    user_properties SUPER,'
      + '    user_pseudo_id VARCHAR(255)'
      + ') DISTSTYLE AUTO '
      + 'SORTKEY AUTO';
    sqlStatements.push(createTblStatement);
    const createSpLogStatement = `CREATE OR REPLACE PROCEDURE ${app}.sp_clickstream_log(name in varchar(50), level in varchar(10), msg in varchar(256))`
      + 'AS '
      + '$$ '
      + 'DECLARE '
      + '    log_id INT;'
      + 'BEGIN '
      + `CREATE TABLE IF NOT EXISTS ${app}.clickstream_log (id varchar(256), log_name varchar(50), log_level varchar(10), log_msg varchar(256), log_date TIMESTAMP default getdate());`
      + `EXECUTE \'SELECT COUNT(1) FROM ${app}.clickstream_log\' INTO log_id;`
      + `INSERT INTO ${app}.clickstream_log VALUES(log_id, name, level, msg);`
      + 'EXCEPTION WHEN OTHERS THEN'
      + '    RAISE INFO \'error message: %\', SQLERRM;'
      + 'END;	  '
      + '$$ LANGUAGE plpgsql;';
    sqlStatements.push(createSpLogStatement);
    createUpsertUsersSchemas(app).forEach(s => sqlStatements.push(s));
  });

  if (sqlStatements.length == 0) {
    logger.info('Ignore creating schema in Redshift due to there is no application.');
  } else {
    const redShiftClient = getRedshiftClient(props.dataAPIRole);
    await createSchemasInRedshift(redShiftClient, sqlStatements, props);
  }
}

const createDatabaseInRedshift = async (redshiftClient: RedshiftDataClient, databaseName: string,
  props: CreateDatabaseAndSchemas, owner?: string) => {
  try {
    await executeStatementsWithWait(redshiftClient, [`CREATE DATABASE ${databaseName}${owner ? ` WITH OWNER "${owner}"` : ''};`],
      props.serverlessRedshiftProps, props.provisionedRedshiftProps);
  } catch (err) {
    if (err instanceof Error) {
      logger.error('Error when creating database in serverless Redshift.', err);
    }
    throw err;
  }
};

const createSchemasInRedshift = async (redshiftClient: RedshiftDataClient, sqlStatements: string[], props: CreateDatabaseAndSchemas) => {
  try {
    await executeStatementsWithWait(redshiftClient, sqlStatements,
      props.serverlessRedshiftProps, props.provisionedRedshiftProps, props.databaseName);
  } catch (err) {
    if (err instanceof Error) {
      logger.error('Error when creating schema in serverless Redshift.', err);
    }
    throw err;
  }
};

function createUpsertUsersSchemas(app: string) {
  const sqlStatements : string[] = [];
  const createDimUserStatement = `CREATE TABLE IF NOT EXISTS ${app}.dim_users( `
    +'    event_timestamp BIGINT,'
    +'    user_id VARCHAR(255),'
    +'    user_properties SUPER,'
    +'    user_pseudo_id VARCHAR(255),'
    +'    create_date TIMESTAMP default getdate()'
    +') sortkey(user_pseudo_id, event_timestamp)';
  sqlStatements.push(createDimUserStatement);
  const createSpStatement = `CREATE OR REPLACE PROCEDURE ${app}.sp_upsert_users() `
    +'AS '
    +'$$ '
    +'DECLARE '
    +'  record_number INT; '
    +'  begin_update_timestamp_record RECORD; '
    +'  begin_update_timestamp TIMESTAMP; '
    +'  log_name varchar(50);'
    +'BEGIN '
    +'log_name = \'sp_upsert_users\';'
    +'CREATE TEMP TABLE IF NOT EXISTS ods_users( '
    +'    event_timestamp BIGINT,'
    +'    user_id VARCHAR(255),'
    +'    user_properties SUPER,'
    +'    user_pseudo_id VARCHAR(255),'
    +'    create_date TIMESTAMP default getdate()'
    +') sortkey(user_pseudo_id, event_timestamp);'
    +`EXECUTE 'SELECT event_timestamp FROM ${app}.dim_users ORDER BY event_timestamp DESC LIMIT 1' INTO begin_update_timestamp_record;`
    +`CALL ${app}.sp_clickstream_log(log_name, 'info', 'get event_timestamp = ' || begin_update_timestamp_record.event_timestamp || ' from ${app}.dim_users');`
    +'IF begin_update_timestamp_record.event_timestamp is null THEN'
    +`  EXECUTE 'SELECT event_timestamp FROM ${app}.ods_events ORDER BY event_timestamp ASC LIMIT 1' INTO begin_update_timestamp_record;`
    +`  CALL ${app}.sp_clickstream_log(log_name, 'info', 'get event_timestamp = ' || begin_update_timestamp_record.event_timestamp || ' from ${app}.ods_events');`
    +'END IF;'
    +`CALL ${app}.sp_clickstream_log(log_name, 'info', 'begin='||begin_update_timestamp_record.event_timestamp);`
    +'IF begin_update_timestamp_record.event_timestamp is NULL or record_number = 0 THEN '
    +`    CALL ${app}.sp_clickstream_log(log_name, 'info', 'nothing to upsert users');`
    +'ELSE '
    +'    INSERT INTO ods_users'
    +'    ('
    +'        SELECT event_timestamp, user_id, user_properties, user_pseudo_id'
    +'        FROM'
    +'        ('
    +'            SELECT e.event_timestamp, e.user_id, e.user_properties, e.user_pseudo_id,'
    +'            sum(1) OVER (PARTITION BY e.user_pseudo_id ORDER BY e.event_timestamp DESC ROWS UNBOUNDED PRECEDING) AS row_number'
    +`            FROM ${app}.ods_events e, e.user_properties u`
    +'            WHERE e.event_timestamp > begin_update_timestamp_record.event_timestamp'
    +'            AND u.key IS NOT NULL'
    +'        )'
    +'        WHERE row_number = 1'
    +'    );'
    +'    GET DIAGNOSTICS record_number := ROW_COUNT;'
    +`    CALL ${app}.sp_clickstream_log(log_name, 'info', 'rows add in ods_users = ' || record_number);`
    +`    LOCK ${app}.dim_users;`
    +`    DELETE FROM ${app}.dim_users`
    +'    WHERE user_pseudo_id NOT IN'
    +'    ('
    +'        WITH'
    +'            current_users AS ('
    +'                SELECT ce.user_pseudo_id, cu.key, '
    +'                cu.value.double_value, cu.value.float_value, cu.value.int_value, cu.value.string_value, cu.value.set_timestamp_micros'
    +`                FROM ${app}.dim_users ce, ce.user_properties cu`
    +'            )'
    +'            ,latest_users AS ('
    +'                SELECT e.user_pseudo_id, u.key, '
    +'                u.value.double_value, u.value.float_value, u.value.int_value, u.value.string_value, u.value.set_timestamp_micros'
    +'                FROM ods_users e, e.user_properties u'
    +'            )'
    +'        SELECT current_users.user_pseudo_id'
    +'        FROM latest_users, current_users'
    +'        WHERE current_users.user_pseudo_id = latest_users.user_pseudo_id'
    +'        AND current_users.key = latest_users.key'
    +'        AND current_users.double_value = latest_users.double_value'
    +'        AND current_users.float_value = latest_users.float_value'
    +'        AND current_users.int_value = latest_users.int_value'
    +'        AND current_users.string_value = latest_users.string_value'
    +'        AND current_users.set_timestamp_micros = latest_users.set_timestamp_micros'
    +'    );'
    +'    GET DIAGNOSTICS record_number := ROW_COUNT;'
    +`    CALL ${app}.sp_clickstream_log(log_name, 'info', 'rows deleted in dim_users = ' || record_number);`
    +`    INSERT INTO ${app}.dim_users`
    +'    ('
    +'        event_timestamp,'
    +'        user_id,'
    +'        user_pseudo_id,'
    +'        user_properties'
    +'    )'
    +'    ('
    +'        SELECT '
    +'            event_timestamp,'
    +'            user_id,'
    +'            user_pseudo_id,'
    +'            user_properties'
    +'        FROM ods_users'
    +'    );'
    +'    GET DIAGNOSTICS record_number := ROW_COUNT;'
    +`    CALL ${app}.sp_clickstream_log(log_name, 'info', 'rows inserted into dim_users = ' || record_number);`
    +'    TRUNCATE TABLE ods_users;'
    +'END IF;'
    +'EXCEPTION WHEN OTHERS THEN'
    +`    CALL ${app}.sp_clickstream_log(log_name, 'error', 'error message:' || SQLERRM);`
    +'END;'
    +'$$ LANGUAGE plpgsql';
  sqlStatements.push(createSpStatement);
  return sqlStatements;

}