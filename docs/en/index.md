---
title: "Clickstream Analytics on AWS"
weight: 0
---

Clickstream Analytics on AWS is an AWS solution that makes it easy for customers to collect, ingest, process, and analyze event data from their website and mobile apps, enabling them to measure and track user behaviors to improve website and app’s performance. This solution provides modularized and configurable components of a data pipeline for customer to choose and customize, shorten the process of building a Well-Architected data pipeline from months to days. The solution also provides purpose-built SDKs and guidance for customers to collect client-side data from different app platforms (e.g., Android, iOS, JavaScript) to AWS, as well as ready-to-use metrics and visualization templates to generate actionable business insights faster. With Clickstream Analytics on AWS solution, customers not only can quickly spin up an analytics platform that fits their organizational needs, but also maintain 100% ownership and control over their valuable user behavior data.
## Features and benefits
This solution includes the following key features:

- **Visual data pipeline builder**. Customers can simply define the data pipeline from a web-based UI console and the solution will take care of the creation of underlining infrastructures creation, required security setup, and data integrations. Each pipeline module is built with various features and designed to be loosely-coupled, making it very flexible for customers to customize for their use cases. 
- **Purposed-built SDKs**. The provided SDKs are optimized for collecting data from Android, iOS, and JavaScript platforms, which automatically collects common events (e.g., first visit, screen view), supports built-in local cache, retry, and verification mechanisms to ensure high completeness of data transmission
- **Out-of-the-box dashboard**. The solution offers a dozen of built-in visualizations (e.g., acquisition, engagement, retention, user demographic) and explorative reporting templates (e.g., user details, event details), powering various critical business analytics use cases such as user behavior analytics, marketing analytics, and product analytics.

## Use cases
Clickstream data plays a pivotal role in numerous online business analytics use cases, and the following are among the most prevalent ones: 

- **User behavoir analytics**: Clickstream data in user behavior analytics provides insights into the sequential and chronological patterns of user interactions on a website or application, helping businesses understand user navigation, preferences, and engagement levels to enhance the overall product experience and drive product innovation.
- **First-party customer data platform (CDP)**: Clickstream data, together with other business data sources (e.g., order history, user profile), allow customers to create a first-party customer data platform that offers a comprehensive 360-degree view of their users, enabling businesses to personalize customer experiences, optimize customer journeys, and deliver targeted marketing messages.
- **Marketing analytics**: Clickstream data in marketing analytics offers detailed information about users' click paths and interactions with marketing campaigns, enabling businesses to measure campaign effectiveness, optimize marketing strategies, and enhance conversion rates.


## Architecture overview
[![soln-overview]][soln-overview]     
Figure 1: Solution Overview

This guide includes a [Getting Started](getting-started/index.md) chapter to help get started with the solution quickly, in which you'll build an end-to-end data pipeline, send data into the pipeline, and then view the out-of-the-box dashboards. This guide also includes the solution architecture design, user manuals of pipeline management and SDK integration, as well as built-in metrics and dashboards explainations. We recommend you start with it the Getting Started chapter.

The guide is intended for IT architects, data engineers, developers, DevOps, and data product managers with practical experience architecting in the AWS Cloud.

[cloudformation]: https://aws.amazon.com/en/cloudformation/

[soln-overview]: ./images/solution-overview.webp