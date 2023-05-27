## Summary

(Summarize the bug encountered concisely)

## Test checklist

- [ ] add new test cases
- [ ] all code changes are covered by unit tests
- [ ] end-to-end tests
  - [ ] deploy with control plane
  - [ ] deploy with ingestion server
    - [ ] with MSK sink
    - [ ] with KDS sink
    - [ ] with S3 sink
  - [ ] deploy with data processing - etl
  - [ ] deploy with data processing - data modeling
    - [ ] new Redshift Serverless
    - [ ] provisioned Redshift
    - [ ] Athena
  - [ ] deploy with reporting
 
## Is it a breaking change
- [ ] add parameters without default value in stack
- [ ] introduce new service permissions in stack
 
/label ~Bug