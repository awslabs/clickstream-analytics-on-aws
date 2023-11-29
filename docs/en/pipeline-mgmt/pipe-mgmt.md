# Data pipeline management 
This solution provides three features to help you manage and operate the data pipeline after it gets created.

## Monitoring and Alarms
The solution collects metrics from each resource in the data pipeline and creates monitoring dashboards in CloudWatch, which provides you a comprehensive view into the pipeline status. It also provides a set of alarms that will notify project owner if anything goes abnormal. 

Following are steps to view monitoring dashboards and alarms.

### Monitoring dashboards
To view monitoring dashboard for a data pipeline, follows below steps:

1. Go to project detail page
2. Click on `project id` or **View Details** button, which will direct to the pipeline detail page.
3. Click the tab of "**Monitoring**"
4. In the tab, click on the **View in CloudWatch** button, which will direct you to the monitoring dashboard.


### Alarms
To view alarms for a data pipeline, follows below steps:

1. Go to project detail page
2. Click on `project id` or **View Details** button, which will direct to the pipeline detail page.
3. Click the tab of "**Alarms**"
4. In the tab, you can view all the alarms. You can also click on the **View in CloudWatch** button, which will direct you to CloudWatch alarm pages to view alarm details.
5. You can also enable or disable an alarm by select the alarm then click on the **Enable** or **Disable** buttons.

## Pipeline modification
You are able to modify some configuration the data pipeline after it created, follow below steps to update a pipeline.

1. Go to project detail page
2. Click on `project id` or **View Details** button, which will direct to the pipeline detail page.
3. In the project details page, click on the **Edit** button, which will bring you to the pipeline creation wizard page.
4. You will notice some configuration are in disable mode, which means they cannot be updated after creation.
5. For those configuration options are editable, you can update them.
6. After you edit the configuration, click **Next** until you reach last page, click **Save**.
7. You will see pipeline is in `Updating` status.

## Pipeline upgrade
See [Upgrade the solution][upgrade] for the detailed procedures.

[upgrade]: ../upgrade.md
