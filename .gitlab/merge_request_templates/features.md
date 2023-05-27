## Summary

(describe what the feature does)

## Implementation highlights

(describe how the feature does, share the RFC link if it has)

## Test checklist

- [ ] add new test cases
- [ ] all code changes are covered by unit tests
- [ ] end-to-end tests
  - [ ] deploy control plane without error
  - [ ] deploy ingestion server without error
    - [ ] with MSK sink
    - [ ] with KDS sink
    - [ ] with S3 sink
  - [ ] deploy data processing - etl
  - [ ] deploy data processing - data modeling
    - [ ] new Redshift Serverless
    - [ ] provisioned Redshift
    - [ ] Athena
  - [ ] deploy with reporting
 
## Is it a breaking change
- [ ] add parameters without default value in stack
- [ ] introduce new service permission in stack
 
/label ~Feature
