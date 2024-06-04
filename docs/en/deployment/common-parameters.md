| Admin User Email (`Email`) | `<Requires input>` | Specify the email of the Administrator. This email address will receive a temporary password to access the {{ solution_name }} web console. You can create more users directly in the provisioned Cognito User Pool after launching the solution. |
| IAM Role Prefix (`IamRolePrefix`) | `<Optional input>` | Specify the prefix for the name of IAM roles created in the solution. |
| IAM Role Boundary ARN (`IamRoleBoundaryArn`) | `<Optional input>` | Specify [the permissions boundary for the IAM roles][iam-boundary] created in the solution. |

[iam-boundary]: https://docs.aws.amazon.com/IAM/latest/UserGuide/access_policies_boundaries.html