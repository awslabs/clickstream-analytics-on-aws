CREATE OR REPLACE PROCEDURE {{schema}}.{{sp_clickstream_log}}(name in varchar(50), level in varchar(10), msg in varchar(256))
NONATOMIC AS 
$$ 
DECLARE 
    log_id INT;
BEGIN
EXECUTE 'SELECT COUNT(1) FROM {{schema}}.{{table_clickstream_log}}' INTO log_id;
INSERT INTO {{schema}}.{{table_clickstream_log}} VALUES(log_id, name, level, msg);
EXCEPTION WHEN OTHERS THEN
    RAISE INFO 'error message: %', SQLERRM;
END;	  
$$ LANGUAGE plpgsql;