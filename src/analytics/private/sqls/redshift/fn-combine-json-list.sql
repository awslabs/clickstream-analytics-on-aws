create or replace function {{schema}}.combine_json_list(s varchar(65535))
  returns varchar(65535)
  /*
  this function combines a list of json objects to a json object
  e.g. input: [{"a":1},{"b":2}] => output: {"a":1,"b":2}
  */
stable
as $$

import json
list_of_dicts = json.loads(s)
combined_dict = {}
for d in list_of_dicts:
  combined_dict.update(d)

return json.dumps(combined_dict)

$$ language plpythonu;

