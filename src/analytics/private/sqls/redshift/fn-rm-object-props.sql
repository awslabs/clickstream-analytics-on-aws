create or replace function {{schema}}.rm_object_props(o varchar(65535), props_list varchar(65535))
  returns varchar(65535)
stable
as $$

import json
d = json.loads(o)
for prop in props_list.split(","):
    if prop in d:
        del d[prop]
return json.dumps(d)

$$ language plpythonu;

