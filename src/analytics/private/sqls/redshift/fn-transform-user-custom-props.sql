create or replace function {{schema}}.transform_user_custom_props(s varchar(65535))
  returns varchar(65535)
  /*
  this function transforms a list of json objects to a json object
  e.g. input:
"""
{
  "gender": {
    "type": "string",
    "set_time_msec": 1708282081550,
    "value": "female"
  },
  "age": {
    "type": "number",
    "set_time_msec": 1708282081550,
    "value": "33"
  },
  "_user_name": {
    "type": "string",
    "set_time_msec": 1708282081550,
    "value": "Madison Allen"
  },
}
"""
output:
""" 
{
  "gender": {
    "set_time_msec": 1708282081550,
    "value": "female"
  },
  "age": {
    "set_time_msec": 1708282081550,
    "value": 33
  },
  "_user_name": {
    "set_time_msec": 1708282081550,
    "value": "Madison Allen"
  },
}
"""
  */
stable
as $$

import json

def transform_user_custom_props(input):
    data = json.loads(input)
    transformed_data = {}
    for key, value in data.items():
        if value['type'] == 'number':
            try :
                transformed_data[key] = {'value': int(value['value']), 'set_time_msec': value['set_time_msec']}
            except ValueError:
                transformed_data[key] = {'value': float(value['value']), 'set_time_msec': value['set_time_msec']}
        elif value['type'] == 'boolean':
            transformed_data[key] = {'value': True if str(value['value'].lower()) == 'true' else False, 'set_time_msec': value['set_time_msec']}
        else:
            transformed_data[key] = {'value': value['value'], 'set_time_msec': value['set_time_msec']}
    return json.dumps(transformed_data)

return transform_user_custom_props(s)

$$ language plpythonu;
