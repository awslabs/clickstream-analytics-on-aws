# Basic configuration

For the clickstream project, you can specify the basic configuration of the data pipeline and set the following configurations:

* **AWS Region**: select a region at which the pipeline will be created. If you select a region where some AWS services are not available, the corresponding feature will be disabled by default. Check [the region table][region-table] for feature availability.
* **VPC**: specify the VPC where the compute resources of the pipeline will be located. The VPC needs to meet the below criteria for running the pipeline workload.
    {%
      include-markdown "./vpc-prerequisites.md"
    %}
* **Data collection SDK**: specify the SDK type that the client uses.

    - If you choose **Clickstream SDK**, please refer to [SDK manual][clickstream-sdks] for the available Clickstream SDKs and integration guides.
    - If you choose **Third-Party SDK**, you need to follow up on [this step][custom-plugin] to add a custom transformer plug-in to map the data to solution schema (if data modeling & reporting are needed). Note that the solution has built-in support for Google Tag Manager for server-side tagging, you can follow up on [Guidance for Using Google Tag Manager for Server-Side Website Analytics on AWS][gtm-guidance] to set up the GTM server-side servers on AWS.

* **Data location**: specify the S3 bucket where the clickstream data is stored.
    
    !!! info "Note"
        The bucket encrypted with AWS KMS keys (SSE-KMS) is not supported.

* **Tags**: specify the additional tags for the AWS resources created by the solution.

    !!! info "Note"
        Three built-in tags managed by the solution cannot be changed or removed.

[region-table]: ../plan-deployment/regions.md
[clickstream-sdks]: ../sdk-manual/index.md
[gtm-guidance]: https://aws.amazon.com/solutions/guidance/using-google-tag-manager-for-server-side-website-analytics-on-aws/
[custom-plugin]: ./data-processing/configure-plugin.md#custom-plugins
