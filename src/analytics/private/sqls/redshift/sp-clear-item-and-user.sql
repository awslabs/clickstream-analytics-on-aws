CREATE OR REPLACE PROCEDURE {{schema}}.sp_clear_item_and_user() 
NONATOMIC AS
$$
DECLARE
    record_number INT; 
    log_name varchar(50) := 'sp_clear_expired_events';
BEGIN
    -- clean table_item
    WITH item_id_rank AS(
	SELECT  id
	       ,ROW_NUMBER() over ( partition by id ORDER BY event_timestamp desc ) AS et_rank
	FROM {{schema}}.{{table_item}})
    delete from {{schema}}.{{table_item}} using item_id_rank  
    where {{schema}}.{{table_item}}.id = item_id_rank.id and item_id_rank.et_rank != 1;

    GET DIAGNOSTICS record_number := ROW_COUNT;
    CALL {{schema}}.{{sp_clickstream_log}}(log_name, 'info', 'delete '||record_number||' from {{schema}}.{{table_item}}');
    ANALYZE {{schema}}.{{table_item}};

    
    -- clean table_user
    WITH user_id_rank AS(
	SELECT  user_id
	       ,ROW_NUMBER() over ( partition by user_id ORDER BY event_timestamp desc ) AS et_rank
	FROM {{schema}}.{{table_user}})
    delete from {{schema}}.{{table_user}} using user_id_rank  
    where {{schema}}.{{table_user}}.user_id = user_id_rank.user_id and user_id_rank.et_rank != 1;

    GET DIAGNOSTICS record_number := ROW_COUNT;
    CALL {{schema}}.{{sp_clickstream_log}}(log_name, 'info', 'delete '||record_number||' from {{schema}}.{{table_user}}');
    ANALYZE {{schema}}.{{table_user}};


EXCEPTION WHEN OTHERS THEN
    CALL {{schema}}.{{sp_clickstream_log}}(log_name, 'error', 'error message:' || SQLERRM);    
END;
$$ LANGUAGE plpgsql;