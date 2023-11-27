# 用户与角色

{{ solution_name }}解决方案将用户分4个角色管理，分别是：管理员、IT运维、分析师、分析师读者，具体权限见以下表格：

| 功能 | 管理员 | IT运维 | 分析师 | 分析师读者 |
|-------|-------|-------|-------|-------|
| 项目管理          | Yes | Yes | No | No |
| 运维告警          | Yes | Yes | No | No |
| 插件管理          | Yes | Yes | No | No |
| 用户管理          | Yes | No  | No | No |
| 分析工作坊-仪表板  | No  | No | Yes | Yes |
| 分析工作坊-探索    | Yes | No  | Yes | Yes |
| 分析工作坊-分析    | Yes | No | Yes | No |
| 分析工作坊-数据管理 | Yes | No | Yes | Yes |

## 角色获取流程
用户登录系统后获取角色的流程图如下：

![get-user-roles](../images/permission-mgmt/get-user-roles.png)

1. 用户通过OIDC认证登录
2. 系统从DynamoDB读取对应用户的信息
    * 如果用户存在，进入步骤3
    * 如果用户不存在，从请求的token中解析出用户在OIDC中配制的角色或者用户组信息，然后根据规则映射成系统的角色
3. 赋予用户角色并返回给前端

## 用户配置

默认情况下，支持从Cognito的Group信息映射为系统的多个角色，规则如下：

| Cognito的Group名称 | 对映的系统角色 |
|-------|-------|
| ClickstreamAdmin | 管理员 |
| ClickstreamOperator | IT运维 |
| ClickstreamAnalyst | 分析师 |
| ClickstreamAnalystReader | 分析师读者 |

支持多个Group映射为一个系统角色，多个Group名称用逗号分隔，例如修改**操作员角色名称**：`Group1,Group2`，即可把两个用户组的用户都映射到系统的IT运维角色。

另外，如果需要支持其它类型的OIDC provider，只需修改**获取用户角色的JsonPath**。

例子：修改**获取用户角色的JsonPath**为：`$.payload.realm_access.roles`即可支持keycloak的角色映射为系统角色，其中keycloak的token格式如下：

```
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

