CREATE TABLE IF NOT EXISTS {{schema}}.segment_user (
    segment_id VARCHAR(255) NOT NULL,
    user_id VARCHAR(255) NOT NULL
) BACKUP YES DISTSTYLE EVEN SORTKEY (segment_id);
