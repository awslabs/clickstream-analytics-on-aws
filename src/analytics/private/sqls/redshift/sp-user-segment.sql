CREATE OR REPLACE PROCEDURE {{schema}}.sp_user_segment(segment_id IN VARCHAR(50), sql IN VARCHAR(65535), s3_path IN VARCHAR(255), iam_role IN VARCHAR(255))
AS $$
BEGIN
    -- Step 1: Create temporary table and insert segment user IDs
    DROP TABLE IF EXISTS temp_segment_user;
    CREATE TEMP TABLE temp_segment_user (user_id VARCHAR(255));
    EXECUTE 'INSERT INTO temp_segment_user (user_id) ' || sql;

    -- Step 2: Refresh segment in segment_user table
    EXECUTE 'DELETE FROM {{schema}}.segment_user WHERE segment_id = ' || QUOTE_LITERAL(segment_id);
    EXECUTE 'INSERT INTO {{schema}}.segment_user (segment_id, user_id) SELECT ' || QUOTE_LITERAL(segment_id) || ', user_id FROM temp_segment_user';

    -- Step 3: UNLOAD full segment user info to S3
    EXECUTE '
        UNLOAD (''SELECT * FROM {{schema}}.user_m_view_v2 WHERE user_pseudo_id IN (SELECT * FROM temp_segment_user)'')
        TO ' || QUOTE_LITERAL(s3_path || 'segment_')
        || 'IAM_ROLE ' || QUOTE_LITERAL(iam_role)
        || 'PARALLEL OFF ALLOWOVERWRITE HEADER EXTENSION ''csv'' FORMAT AS CSV
    ';

    -- Step 4: UNLOAD segment summary to S3
    EXECUTE '
        UNLOAD (''
          WITH
          segment_user AS (
            SELECT
              COUNT(DISTINCT user_id) AS segment_user_number
            FROM
              temp_segment_user
          ),
          total_user AS (
            SELECT
              COUNT(DISTINCT user_pseudo_id) AS total_user_number
            FROM
              {{schema}}.user_m_view_v2
          )
          SELECT
            segment_user_number,
            total_user_number,
            CAST(EXTRACT(EPOCH FROM CURRENT_TIMESTAMP) * 1000 AS BIGINT) AS job_end_time
          FROM
            segment_user,
            total_user
        '')
        TO ' || QUOTE_LITERAL(s3_path || 'segment-summary_')
        || 'IAM_ROLE ' || QUOTE_LITERAL(iam_role)
        || 'PARALLEL OFF ALLOWOVERWRITE HEADER EXTENSION ''csv'' FORMAT AS CSV
    ';
EXCEPTION WHEN OTHERS THEN
    RAISE INFO 'error message: %', SQLERRM;
END;
$$ LANGUAGE plpgsql;
