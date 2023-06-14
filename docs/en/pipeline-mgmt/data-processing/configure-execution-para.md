# Configure Execution Parameters
Execution parameters control how the transformation and enrichment jobs are orchestrated.

## Parameters
You can configure the following **Execution parameters** after you toggle on **Enable data processing**.

| Parameter| Description | Values |
| --- | --- | --- |
| Data processing interval/Fixed Rate | Specify the interval to batch the data for ETL processing by fixed rate | 1 hour </br>12 hours</br>1 day |
| Data processing interval/Cron Expression | Specify the interval to batch the data for ETL processing by cron expression| `cron(0 * * ? *)` </br>`cron(0 0,12 * ? *)`</br>`cron(0 0 * ? *)` |
| Event freshness | Specify the days after which the solution will ignore the event data. For example, if you specify 3 days for this parameter, the solution will ignore any event which arrived more than 3 days after the events are triggered | 3 days </br>5 days </br>30 days |

## Cron Expression Syntax

 Syntax
 
  `cron(minutes hours day-of-month month day-of-week year)`
 
 For more information, refer to [Cron-based schedules](https://docs.aws.amazon.com/scheduler/latest/UserGuide/schedule-types.html?icmpid=docs_console_unmapped#cron-based).
