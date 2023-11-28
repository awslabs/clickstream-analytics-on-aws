# 身份管理

## 用户

{{ solution_name }} 支持内置 Cognito 用户池或第三方 OpenID Connect (OIDC)，以便根据您的[部署方式][deployment]进行用户管理。

### 用户管理

如果您使用内置 Cognito 进行用户管理，您可以在部署区域中找到以 `userPoolDC9497E0` 开头的 [Cognito 用户池][user-pool]。 当您部署解决方案的 Web 控制台时，将创建具有所需电子邮件地址的用户作为第一个具有管理员权限的用户。 按照[本文档][cognito-users]，您可以管理其他用户。 您还可以按照[本文档][cognito-federated-users]添加联合第三方登录，例如 SAML 和 OIDC。

如果您使用 OIDC 提供商进行用户管理，则需要按照 OIDC 提供商的文档来管理用户。

## 用户身份

您可以向用户分配四种不同类型的角色：

| 角色 | 描述 |
| :---------- | :---------- |
| 管理员         | 对解决方案的完全访问权限，包括身份管理 |
| 操作员         | 管理项目、告警和插件 |
| 分析师           | 在分析工作坊中查看和更新 |
| 分析师读者        | 在分析工作坊中查看 |

角色的具体功能如下表所示：

| 功能 | 管理员 | 操作员 | 分析师 | 分析师读者 |
|-------|-------|-------|-------|-------|
| 项目管理          | Yes | Yes | No | No |
| 运维和告警         | Yes | Yes | No | No |
| 插件管理           | Yes | Yes | No | No |
| 身份管理             | Yes | No  | No | No |
| 分析工作坊 - 仪表板  | Yes  | No | Yes | Yes |
| 分析工作坊 - 探索    | Yes | No  | Yes | Yes |
| 分析工作坊 - 分析    | Yes | No | Yes | No |
| 分析工作坊 - 数据管理 | Yes | No | Yes | Yes |

### 用户角色管理

默认情况下，经过身份验证的用户在解决方案中没有角色。 您可以通过以下两种方式来管理解决方案中的用户角色：

1. 用“管理员”用户在解决方案的 Web 控制台中选择**系统** - **用户**，添加、更新或删除用户角色。 此设置优先于其他设置。
2. 在解决方案的 Web 控制台中，以“管理员”用户身份单击**系统** - **用户**中的**设置**。 配置映射到 OIDC 提供商中的组或角色的解决方案角色。

默认情况下，该解决方案支持将 [Cognito 用户池中的组信息][cognito-user-group] 映射到解决方案中的多个角色，规则如下：

| Cognito 中的组名称 | 解决方案角色 |
|-------|-------|
| ClickstreamAdmin | 管理员 |
| ClickstreamOperator | 操作员 |
| ClickstreamAnalyst | 分析师 |
| ClickstreamAnalystReader | 分析师读者 |

例如，您创建一个名为“ClickstreamAnalyst”的组，然后将用户池中的用户添加到该组。 这些用户登录到解决方案后，该用户将具有分析师角色来访问分析工作坊。

支持将多个组映射到单个系统角色，各个组名称以逗号分隔。 例如，通过修改**操作员角色名称**：`Group1,Group2`，即可将两个用户组映射到系统的**操作员**角色。

如果需要支持其他OIDC提供商，请修改**用户角色Json路径**。

示例：修改**用户角色的Json Path**为`$.payload.realm_access.roles`，可以支持[Keycloak][odic-keycloak]角色到解决方案角色的映射，其中 Keycloak 的 token 格式如下 ：

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
