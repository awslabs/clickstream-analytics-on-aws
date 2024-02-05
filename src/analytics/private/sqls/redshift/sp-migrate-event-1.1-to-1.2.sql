CREATE
OR REPLACE PROCEDURE {{schema}}.sp_migrate_event_1_1_to_1_2() 
NONATOMIC 
AS 
$$ 

DECLARE 

log_name VARCHAR(50) := 'sp_migrate_event_1_1_to_1_2';

BEGIN

WITH event_session AS
(
	SELECT  event_id
	       ,ANY_VALUE(event_param_string_value) AS session_id
	FROM {{schema}}.{{table_event_parameter}}(
	WHERE event_param_key = '_session_id'
	GROUP BY event_id
) 
UPDATE {{schema}}.{{table_event}}(
SET session_id = event_session.session_id
FROM event_session
WHERE event_session.event_id = event.event_id
AND event.session_id IS NULL
);

EXCEPTION
WHEN OTHERS THEN CALL {{schema}}.{{sp_clickstream_log_non_atomic}}(log_name, 'error', 'error message:' || SQLERRM);

END;

$$ LANGUAGE plpgsql;

