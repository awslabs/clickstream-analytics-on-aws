# Frequently Asked Questions

## General
**Q:  What is {{ solution_name }}?**<br>
An AWS Solution that enables customers to build clickstream analytic system on AWS easily. This solution automates the data pipeline creation per customers’ configurations with a visual pipeline builder, and provides SDKs for web and mobiles apps (including iOS, Android, and Web JS) to help customers to collect and ingest client-side data into the data pipeline on AWS. After data ingestion, the solution allows customers to further enrich and model the event data for business users to query, and provides built-in visualizations (e.g., acquisition, engagement, retention) to help them generate insights faster.

## SDK

**Q: Can I use other SDK to send data to the pipeline created by this solution**<br>
Yes, you can. The solution support users using third-party SDK to send data to the pipeline. Note that, if you want to enable data procesing and modeling module when using a third-party SDK to send data, you will need to provide an transformation plugin to map thrid-party SDK's data structure to solution data schema. Please refer to [Custom plugin](./pipeline-mgmt/data-processing/configure-plugin.md) for more details.

## Setup and configuration
**Q: How can I create more users for this solution?**</br>
If you launched the solution with Cognito User Pool, go to the AWS console, find the user pool created by the solution,
and you can create more users. If you launched the solution with OpenID Connect (OIDC), you should add more users in the
user pool managed by the OIDC provider. Note that all users have the same privileges. 


## Pricing

**Q: How will I be charged and billed for the use of this solution?**</br>
The solution is free to use, and you are responsible for the cost of AWS services used while running this solution. 
You pay only for what you use, and there are no minimum or setup fees. Refer to the [Cost](./plan-deployment/cost.md) section for detailed cost estimation. 
