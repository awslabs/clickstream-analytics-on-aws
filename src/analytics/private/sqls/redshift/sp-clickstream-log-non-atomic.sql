CREATE OR REPLACE PROCEDURE {{schema}}.{{sp_clickstream_log_non_atomic}}(name in varchar(50), level in varchar(10), msg in varchar(256))
NONATOMIC AS 
$$ 
BEGIN
INSERT INTO {{schema}}.{{table_clickstream_log}} (log_name, log_level, log_msg) VALUES(name, level, msg);
EXCEPTION WHEN OTHERS THEN
    RAISE INFO 'error message: %', SQLERRM;
END;	  
$$ LANGUAGE plpgsql;