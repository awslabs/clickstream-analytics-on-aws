
----

*By submitting this pull request, I confirm that my contribution is made under the terms of the Apache-2.0 license*

## Summary

(describe what this merge request does)

## Implementation highlights

(describe how the merge request does for feature changes, share the RFC link if it has)

## Test checklist

- [ ] add new test cases
- [ ] all code changes are covered by unit tests
- [ ] end-to-end tests
  - [ ] deploy control plane with CloudFront + S3 + API gateway
  - [ ] deploy control plane within VPC
  - [ ] deploy ingestion server
    - [ ] with MSK sink
    - [ ] with KDS sink
    - [ ] with S3 sink
  - [ ] deploy data processing
  - [ ] deploy data modeling
    - [ ] new Redshift Serverless
    - [ ] provisioned Redshift
    - [ ] Athena
  - [ ] deploy with reporting

## Is it a breaking change

- [ ] add parameters without default value in stack
- [ ] introduce new service permission in stack
- [ ] introduce new top level stack module