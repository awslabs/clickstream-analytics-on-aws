create or replace function {{schema}}.transform_event_custom_props(s varchar(65535))
  returns varchar(65535)
  /*
  this function transforms a list of json objects to a json object
  e.g. input:
"""
{
    "item_id": {
        "type": "string",
        "value": "9a66adca"
    },
    "currency": {
        "type": "string",
        "value": "USD"
    },
    "age": {
        "type": "number",
        "value": "12"
    },
    "first": {
        "type": "boolean",
        "value": "true"
    }
}
"""
output:
""" 
{
    "item_id": "9a66adca",
    "currency": "USD",
    "age": 12,
    "first": true
}
"""
  */
stable
as $$

import json

def transform_event_custom_props(input):
    data = json.loads(input)
    transformed_data = {}
    for key, value in data.items():
        if value['type'] == 'number':
            try :
                transformed_data[key] = int(value['value'])
            except ValueError:
                transformed_data[key] = float(value['value'])
        elif value['type'] == 'boolean':
            transformed_data[key] = value['value'].lower() == 'true'
        else:
            transformed_data[key] = value['value']
    return json.dumps(transformed_data)

return transform_event_custom_props(s)

$$ language plpythonu;
