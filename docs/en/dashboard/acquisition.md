# Acquisition report
You can use the User acquisition report to get insights into how new users find your website or app for the first time. This report also allows you view the detail user profile.

Note: This article describes the default report. You can customize the report by applying filters or comparisons or by changing the dimensions, metrics, or charts in QuickSight. [Learn more](https://docs.aws.amazon.com/quicksight/latest/user/working-with-visuals.html)


## View the report
1. Access the dashboard for your application. Refer to [Access dashboard](index.md)
2. In the dashboard, click on the sheet with name of **`Acquisition`**.

## Where the data comes from
Acquisistion report are created based on the QuickSight dataset of `Clickstream_User_Acquisition`, which connects to the `clickstream-user-acquisition` view in analytics engine (i.e., Redshift or Athena). Below is the SQL command that generates the view.
??? SQL Commands
    === "Redshift"
        ```sql
            SELECT 
                upid.*,
                (case when uid.user_id_count > 0 then 'Registered' else 'Non-registered' end) as is_registered from 
                (SELECT
                    user_pseudo_id
                    , user_id
                    , event_date as first_visit_date
                    , app_info.install_source::varchar as first_visit_install_source
                    , device.system_language::varchar as first_visit_device_language
                    , platform as first_platform
                    , geo.country::varchar as first_visit_country
                    , geo.city::varchar as first_visit_city
                    , (case when nullif(traffic_source.source::varchar,'') is null then '(direct)' else traffic_source.source::varchar end) as first_traffic_source_source
                    , traffic_source.medium::varchar as first_traffic_source_medium
                    , traffic_source.name::varchar as first_traffic_source_name
                FROM {{shema}}.ods_events e
                where e.event_name in ('_first_open','_first_visit')) upid left outer join 
                (select user_pseudo_id, count(distinct user_id) as user_id_count from {{shema}}.ods_events ods where event_name not in ('_first_open','_first_visit') group by 1 ) uid on upid.user_pseudo_id=uid.user_pseudo_id
            ;
        ```
    === "Athena"
        ```sql
        with base as (
            select 
                *
            from {{database}}.{{eventTable}}
            where partition_app = ? 
                and partition_year >= ?
                and partition_month >= ?
                and partition_day >= ?
            ),
            clickstream_user_dim_mv_1 as (
            SELECT
                user_pseudo_id
                , user_id
                , event_date as first_visit_date
                , app_info.install_source as first_visit_install_source
                , device.system_language as first_visit_device_language
                , platform as first_platform
                , geo.country as first_visit_country
                , geo.city as first_visit_city
                , (case when nullif(traffic_source.source,'') is null then '(direct)' else traffic_source.source end) as first_traffic_source_source
                , traffic_source.medium as first_traffic_source_medium
                , traffic_source.name as first_traffic_source_name
            from base
            where event_name in ('_first_open','_first_visit')
            ),

            clickstream_user_dim_mv_2 AS (
            select user_pseudo_id,
                count
                (
                    distinct user_id
                ) as user_id_count
            from base ods
            where event_name not in 
                (
                    '_first_open',
                    '_first_visit'
                ) group by 1
            )

            SELECT upid.*,
            (
                case when uid.user_id_count>0 then 'Registered' else 'Non-registered' end
            ) as is_registered
            from clickstream_user_dim_mv_1 as upid left outer join 
            clickstream_user_dim_mv_2 as uid on upid.user_pseudo_id=uid.user_pseudo_id

        ```

## Dimensions and metrics
The report includes the following dimensions and metrics. You can add more dimensions or metrics by creating `calculated field` in QuickSight dateset. [Learn more](https://docs.aws.amazon.com/quicksight/latest/user/adding-a-calculated-field-analysis.html). 

|Field | Type| What is it | How it's populated|
|----------|---|---------|--------------------|
|`user_pseudo_id`| Dimension | A SDK-generated unique id for the user | Query from analytics engine|
|`user_id`| Dimension | The user ID set via the setUserId API in SDK  | Query from analytics engine|
|`first_visit_date`| Dimension | The date that the user first visited your website or first opened the app  | Query from analytics engine|
|`first_install_source`| Dimension | The installation source when user first opened your app. Blank for web  | Query from analytics engine|
|`first_visit_device_language`| Dimension | The system language of the device user used when they first opened your app or first visited your website.  | Query from analytics engine|
|`first_visit_device_language`| Dimension | The system language of the device user used when they first opened your app or first visited your website.  | Query from analytics engine|
|`first_platform`| Dimension | The platform when user first visited your website or first opened your app  | Query from analytics engine|
|`first_visit_country`| Dimension | The country where user first visited your website or first opened your app.  | Query from analytics engine|
|`first_visit_city`| Dimension | The city where user first visited your website or first opened your app.  | Query from analytics engine|
|`custom_attr_key`| Dimension | The name of the custom attribute key of the user.  | Query from analytics engine|
|`custom_attr_value`| Dimension | The value of the custom attribute key of the user.  | Query from analytics engine|
|`is_registered`| Dimension | If user had registed or not  | Query from analytics engine|
  

















