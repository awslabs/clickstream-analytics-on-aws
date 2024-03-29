# 用户标识

当您进行数据分析时，通常您需要根据您业务分析的场景来选择合适的的用户标识来进行分析。这将有助于您提升分析的准确性，尤其是在漏斗、留存、会话等分析场景。

{{ solution_name }}解决方案中主要包含三种类型的 ID，分别是：

- 用户 ID
- 设备 ID
- 访客 ID

下面我们分别来介绍下这三种 ID，同时您将会详细了解我们是如何使用用户 ID 和访客 ID 来进行用户行为的关联。

## 用户 ID

用户 ID 通常是您业务数据库里描述用户的唯一标识，相对来说更准确和唯一。

* 当用户未注册或未登录时，用户 ID 的值为空。
* SDK提供 `ClickstreamAnalytics.setUserId("your user id")` 方法来进行设置用户 ID，退出登录时通过设置 `null/nil` 来清空用户 ID。
* 用户 ID 存在 user 表里的 user_id 字段中。

## 设备 ID

我们通过设备 ID 来对用户设备进行标识。

* 设备 ID 将在集成 SDK 后的第一次启动时自动生成。
* 设备 ID 有可能不是设备的唯一标识符，通常用户在卸载App，或者在网页中清除缓存后设备 ID 将可能重新生成。
* 设备 ID 存在 user 表里的 `device_id_list` 字段中。

下表将介绍各端SDK如何生成设备 ID。

| SDK 类型       | 生成规则                                                                       | 存储位置                    | 是否唯一                                                              |
|--------------|----------------------------------------------------------------------------|-------------------------|-------------------------------------------------------------------|
| Android SDK  | 默认使用 AndroidId 作为设备 ID，如果 AndroidId 获取不到则使用随机 UUID 代替                      | SharedPreference 键值对文件中 | 通常 AndroidId 不会因为 App 卸载而改变。 <br>如果获取的是 UUID，则用户卸载 App 后设备 ID 会改变 |
| Swift SDK    | 如果用户已授权获取 IDFA 则使用 IDFA 作为设备 ID，否则默认使用 IDFV 作为设备 ID，如果 IDFV 获取不到则使用随机 UUID | UserDefault 键值对文件中      | 通常 IDFA 不会因为 App 卸载而改变。 <br> IDFV 和 UUID 当用户卸载 App 后，设备 ID 都会改变   |
| Web SDK      | 默认使用随机 UUID 来作为设备 ID                                                       | 浏览器的 localStorage 中     | 用户清除浏览器缓存后将会重新生成设备 ID                                             |

## 访客 ID

{{ solution_name }}解决方案使用访客 ID 来对同一个设备上用户登录与未登录的行为进行关联。

* 访客 ID 在所有 SDK 中 都是通过随机 UUID 生成。
* 访客 ID 只有在当前设备上登录新用户时才会重新赋值，当切换到当前设备之前已登录过的用户时将恢复为之前用户的访客 ID。
* 访客 ID 存储在 user 表的 `user_pseudo_id` 字段中。

下表列出了各种情况下设备 ID，用户 ID，访客 ID 的对应关系。

| 序列  | 事件      | 设备 ID | 用户 ID  | 访客 ID   |
|-----|---------|-------|--------|---------|
| 1   | 安装 App  | S     | --     | 1       |
| 2   | 使用 App  | S     | --     | 1       |
| 3   | 登录用户 A  | S     | A      | 1       |
| 4   | 使用 App  | S     | A      | 1       |
| 5   | 退出登录，浏览 | S     | --     | 1       |
| 6   | 登录用户 B  | S     | B      | 2       |
| 7   | 使用 App  | S     | B      | 2       |
| 8   | 退出登录，浏览 | S     | --     | 2       |
| 9   | 登录用户 A  | S     | A      | 1       |
| 10  | 使用App   | S     | A      | 1       |
| 11  | 退出登录，浏览 | S     | --     | 1       |
| 12  | 登录用户 C  | S     | C      | 3       |
| 13  | 使用App   | S     | C      | 3       |

通过上表您可以看到，我们可以通过查找访客 ID=1 来统计到设备 S 上用户 A 两次使用过程中未登录和登录之后的所有行为事件。此外，您也可以使用用户 ID 将用户的点击流数据与您业务系统中的数据进行联合分析，从而构建更完整的客户数据平台。

!!! info "提示"

    当用户卸载 App 或清除浏览器缓存后，原有的访客 ID 与用户 ID 的关联关系在设备端将清空，同时在设备上会生成新的访客 ID。
