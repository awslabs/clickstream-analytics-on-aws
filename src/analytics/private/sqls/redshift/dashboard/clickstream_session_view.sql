CREATE OR REPLACE VIEW {{schema}}.clickstream_session_view 
AS
with 
tmp_data as (
select 
    event_id
    ,max(
      case 
        when (event_param_key = '_screen_name' or event_param_key = '_page_title')
          then event_param_string_value 
        else null 
      end
    ) as view
from {{schema}}.clickstream_event_parameter_view
group by 1

),
session_f_sv_view as (
    select 
      session_f_l_sv.*,
      t.view as  first_sv_view
    from {{schema}}.clickstream_session_mv_2 as session_f_l_sv 
    left outer join tmp_data t 
      on session_f_l_sv.first_sv_event_id = t.event_id
), session_f_l_sv_view as (
    select 
      session_f_sv_view.*,
      t.view as last_sv_view
    from session_f_sv_view left outer join
    tmp_data t on session_f_sv_view.last_sv_event_id=t.event_id
)
select 
    CASE
      WHEN session.session_id IS NULL THEN CAST('#' AS VARCHAR)
      WHEN session.session_id = '' THEN CAST('#' AS VARCHAR)
      ELSE session.session_id END AS session_id
    ,user_pseudo_id
    ,platform
    ,session_duration::BIGINT
    ,session_views::BIGINT
    ,engaged_session::BIGINT
    ,bounced_session
    ,session_start_timestamp
    ,CASE
       WHEN session.session_engagement_time IS NULL THEN CAST(0 AS BIGINT)
       ELSE session.session_engagement_time 
    END::BIGINT AS session_engagement_time
    ,DATE_TRUNC('day', TIMESTAMP 'epoch' + session_start_timestamp/1000 * INTERVAL '1 second') as session_date
    ,DATE_TRUNC('hour', TIMESTAMP 'epoch' + session_start_timestamp/1000 * INTERVAL '1 second') as session_date_hour
    ,first_sv_view::varchar as entry_view
    ,last_sv_view::varchar as exit_view
from {{schema}}.clickstream_session_mv_1 as session 
left outer join session_f_l_sv_view 
  on session.session_id = session_f_l_sv_view.session_id;