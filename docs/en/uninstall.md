# Uninstall the Clickstream Analytics on AWS

!!! warning "Warning"
    You will encounter an IAM role missing error if you delete {{ solution_name }} main stack before you delete the stacks created for Clickstream projects. {{ solution_name }} console launches additional CloudFormation stacks for the Clickstream pipelines.
    We recommend you delete projects before uninstalling the solution.

## Step 1. Delete projects

1. Go to the {{ solution_name }} console. 
2. In the left sidebar, choose **Projects**.
3. Select the project to be deleted.
4. Choose the **Delete** button in the upper right corner.
5. Repeat steps 3 and 4 to delete all your projects.

## Step 2. Delete {{ solution_name }} stack

1. Go to the [CloudFormation console][cloudformation].
2. Find the CloudFormation stack of the solution.
3. Delete the CloudFormation Stack of the solution.
4. (Optional) Delete the S3 bucket created by the solution.
    1. Choose the CloudFormation stack of the solution, and select the **Resources** tab.
    2. In the search bar, enter `DataBucket`. It shows all resources with the name `DataBucket` created by the solution. You can find the resource type **AWS::S3::Bucket**, and the **Physical ID** field is the S3 bucket name.
    3. Go to the S3 console, and find the S3 bucket with the bucket name. **Empty** and **Delete** the S3 bucket.

[cloudformation]: https://console.aws.amazon.com/cloudfromation/
