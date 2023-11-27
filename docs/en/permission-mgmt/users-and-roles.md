# Users and roles

{{ solution_name }} divides users into four roles for management, namely: **Administrator**, **Operator**, **Analyst** and **Analyst Reader**. The specific permissions are shown in the following table:

| Feature | Administrator | Operator | Analyst | Analyst Reader |
|-------|-------|-------|-------|-------|
| Project management          | Yes | Yes | No | No |
| Operation and Alarm         | Yes | Yes | No | No |
| Plugin Management           | Yes | Yes | No | No |
| User Management             | Yes | No  | No | No |
| Analytics Studio - Dashboards  | No  | No | Yes | Yes |
| Analytics Studio - Explore    | Yes | No  | Yes | Yes |
| Analytics Studio - Analyzes    | Yes | No | Yes | No |
| Analytics Studio - Data Management | Yes | No | Yes | Yes |

## Role acquisition process
The flowchart for obtaining roles after login into the system is as follows:

![get-user-roles](../images/permission-mgmt/get-user-roles.png)

1. User login through OIDC authentication.
2. The system reads the corresponding user information from DynamoDB.
    * If the user exists, proceed to step 3.
    * If the user does not exist, parse the role or user group information configured in the OIDC from the requested token, and then map it to the system's role according to the rules.
3. Assign user roles and return them to the front-end.

## User configuration

By default, it supports mapping Group information from **Cognito** to multiple roles in the system, with the following rules:

| Group name in Cognito | System roles for mapping |
|-------|-------|
| ClickstreamAdmin | Administrator |
| ClickstreamOperator | Operator |
| ClickstreamAnalyst | Analyst |
| ClickstreamAnalystReader | Analyst Reader |

Support mapping multiple groups to a single system role, with multiple group names separated by commas. For example, by modifying the **Operator Role Name**: `Group1,Group2`, both user groups can be mapped to the **Operator** role of the system.

Additionally, if you need to support other types of OIDC providers, simply modify **User Role Json Path**.

Example: Modify **User Role Json Path** to `$.payload.realm_access.roles`, It can support the mapping of **keycloak** roles to system roles, where the token format of keycloak is as follows:

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
  "preferred_username": "fake",
  "email": "fake@example.com"
}
```

