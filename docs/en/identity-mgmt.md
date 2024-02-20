# Identity Management

## Users Introduction

{{ solution_name }} supports a built-in Cognito user pool or third-party OpenID Connect (OIDC) for user management based on your [deployment type][deployment].

### User management

If you use built-in Cognito for user management, you can find the [Cognito user pool][user-pool] starting with `userPoolDC9497E0` in your deployment region. When you deploy the web console of the solution, a user with the required email address will be created as the first user with administrator permission. Following [this documentation][cognito-users], you can manage other users. You can also follow [this documentation][cognito-federated-users] to add federated third-party providers, such as SAML and OIDC.

If you are using an OIDC provider for user management, you need to follow the documentation of the OIDC provider to manage the users.

## User roles

There are four different types of Roles that you can assign to Users:

| Role | Description |
| :---------- | :---------- |
| Administrator         | Full access to the solution, including identity management |
| Operator         | Manage projects, alarms, and plug-ins |
| Analyst           | View and update in Analytics Studio |
| Analyst Reader             | View in Analytics Studio |

The specific features for roles are shown in the following table:

| Feature | Administrator | Operator | Analyst | Analyst Reader |
|-------|-------|-------|-------|-------|
| Project management          | Yes | Yes | No | No |
| Operation and Alarm         | Yes | Yes | No | No |
| Plugin Management           | Yes | Yes | No | No |
| Identity Management             | Yes | No  | No | No |
| Analytics Studio - Dashboards  | Yes  | No | Yes | Yes |
| Analytics Studio - Explore    | Yes | No  | Yes | Yes |
| Analytics Studio - Analyzes    | Yes | No | Yes | No |
| Analytics Studio - Data Management | Yes | No | Yes | Yes |

### User roles management

By default, the authenticated users do not have a role in the solution. You have below two ways to manage the user roles in the solution:

1. Choose **System** - **Users** in the web console of the solution as `Administrator` user, add, update, or remove the user roles. This setting has precedence over other settings.
2. Click the **Setting** in **System** - **Users** in the web console of the solution as `Administrator` user. Configure the roles of the solution mapping to the groups or roles in your OIDC provider.

By default, the solution supports mapping [group information from the Cognito user pool][cognito-user-group] to multiple roles in the solution with the following rules:

| Group name in Cognito | Solution roles |
|-------|-------|
| ClickstreamAdmin | Administrator |
| ClickstreamOperator | Operator |
| ClickstreamAnalyst | Analyst |
| ClickstreamAnalystReader | Analyst Reader |

For example, you create a group named `ClickstreamAnalyst`, then add users in the user pool to that group. After those users log in to the solution, the user has an analyst role to access Analyst Studio.

Support mapping multiple groups to a single system role, with various group names separated by commas. For example, by modifying the **Operator Role Name**: `Group1,Group2`, both user groups can be mapped to the **Operator** role of the system.

If you need to support other OIDC providers, modify **User Role Json Path**.

Example: Modify **User Role Json Path** to `$.payload.realm_access.roles`, It can support the mapping of [Keycloak][odic-keycloak] roles to solution roles, where the token format of Keycloak is as follows:

```json
{
  "exp": 1701070445,
  "iat": 1701063245,
  "auth_time": 1701062050,
  "jti": "4a892061-56e1-4997-a5f3-84a5d38215f0",
  "iss": "https://keycloak.xxxx.cn/auth/realms/xxx",
  "aud": "P****************Y",
  "sub": "29563a2d-****-43bb-b861-c163da7fe984",
  "typ": "ID",
  "azp": "P****************Y",
  "session_state": "4df36df4-****-4e53-9c1a-43e6d27ffbb9",
  "at_hash": "P****************Y",
  "acr": "0",
  "sid": "4df36df4-****-4e53-9c1a-43e6d27ffbb9",
  "email_verified": false,
  "realm_access": {
    "roles": [
      "role1",
      "role2",
      "role3",
    ]
  },
  "preferred_username": "your name",
  "email": "your-name@example.com"
}
```

[deployment]: ./deployment/index.md
[user-pool]: https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-identity-pools.html
[cognito-users]: https://docs.aws.amazon.com/cognito/latest/developerguide/managing-users.html
[cognito-federated-users]: https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-pools-identity-federation.html
[cognito-user-group]: https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-pools-user-groups.html
[odic-keycloak]: ./deployment/with-oidc.md#option-3-keycloak-oidc-client
