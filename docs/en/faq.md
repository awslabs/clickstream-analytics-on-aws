# Frequently Asked Questions

## General
**Q:  What is {{ solution_name }}?**<br>
An AWS Solution that enables customers to build clickstream analytic system on AWS easily. This solution automates the data pipeline creation per customers' configurations with a visual pipeline builder, and provides SDKs for web and mobiles apps (including iOS, Android, and Web JS) to help customers to collect and ingest client-side data into the data pipeline on AWS. After data ingestion, the solution allows customers to further enrich and model the event data for business users to query, and provides built-in visualizations (e.g., acquisition, engagement, retention) to help them generate insights faster.

## SDK

**Q: Can I use other SDK to send data to the pipeline created by this solution**<br>
Yes, you can. The solution support users using third-party SDK to send data to the pipeline. Note that, if you want to enable data processing and modeling module when using a third-party SDK to send data, you will need to provide an transformation plugin to map third-party SDK's data structure to solution data schema. Please refer to [Custom plugin](./pipeline-mgmt/data-processing/configure-plugin.md) for more details.

## Analytics Studio

**Q: Why is the Analytics Studio is not available?**</br>
The reason for this prompt is due to the following two situations:

- The version of the pipeline is not v1.1 or higher. You can try upgrading the pipeline and wait for the upgrade to complete before trying again.
- The reporting module is not enabled on the pipeline.

**Q: How can I modify the default dashboard?**</br>
You are not allowed to modify the default dashboard directly, however, you can create a new analysis from the default dashboard and then create a new dashboard from the analysis that you copied. Below are the steps to create analysis from the default dashboard: 
1. In Analytics Studio, open Analyzes module, then click "Dashboards".
2. Open the default dashboard with name of "Clickstream Dashboard - <app-id> - <project-id>"
3. Click the "Share" icon and click "Share Dashboard" at upper right.
4. In the new window, turn on Allow "save as" in the Save as Analysis column for "ClickstreamPublishUser" (scroll the window to the right if you don't see the column)
5. Go back to the Dashboard, refresh the webpage, you should be able to see the Save As button at the upper right.
6. Click Save as button, enter a name for the analysis, and click SAVE, now you should be able to see a new analysis in the Analyzes, with which now you can edit and publish a new dashboard.


## Pricing

**Q: How will I be charged and billed for the use of this solution?**</br>
The solution is free to use, and you are responsible for the cost of AWS services used while running this solution. 
You pay only for what you use, and there are no minimum or setup fees. Refer to the [Cost](./plan-deployment/cost.md) section for detailed cost estimation. 
