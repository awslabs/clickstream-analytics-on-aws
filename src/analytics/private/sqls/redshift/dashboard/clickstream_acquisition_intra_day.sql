CREATE TABLE IF NOT EXISTS {{database_name}}.{{schema}}.{{viewName}}(
    event_date date,
    "Active User" varchar(255),
    "New User" varchar(255),
    update_timestamp timestamp DEFAULT getdate()
)
BACKUP YES
SORTKEY(event_date)