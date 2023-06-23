# 配置转换和增强插件

插件有两种类型：**转换器** 或 **增强**。 当选择插件时，一个流水线只能有一个**转换器**和零个或多个**增强**。

## 内置插件

以下插件由 {{solution_name}} 提供。

| 插件名称 | 类型 |  描述 |
| --- | --- |  --- | 
| UAEnrichment | 增强 |用户代理增强，使用 `ua_parser` Java库将HTTP头部的 `User-Agent` 增强为 `ua_browser`,`ua_browser_version`,`ua_os`,`ua_os_version`,`ua_device` | 
| IpEnrichment | 增强 |IP地址增强，使用MaxMind的GeoLite2数据将 `IP` 增强为 `city`, `continent`, `country` | 

UAEnrichment 使用 [UA Parser](https://mvnrepository.com/artifact/ua_parser/ua-parser) 来解析Http头部的用户代理。

IpEnrichment 插件使用由MaxMind创建的 [GeoLite2-City 数据](https://cdn.jsdelivr.net/npm/geolite2-city@1.0.0/GeoLite2-City.mmdb.gz)，可从 [https://www.maxmind.com](https://www.maxmind.com) 获取。

## 自定义插件

您可以添加自定义插件来转换原始事件数据或根据您的需求丰富数据。

!!! note "注意"

    要添加自定义插件，您必须首先开发您自己的插件，请参阅 [开发自定义插件](#开发自定义插件)


您可以通过点击 **添加插件** 按钮来添加您的插件，这将打开一个新窗口，在其中您可以上传您的插件。

1. 给插件提供 **名称** 和 **描述**。
2. 选择 **插件类型**，
   - **增强**：用于向SDK（无论是Clickstream SDK还是第三方SDK）收集的事件数据中添加字段的插件
   - **转换**：用于将第三方SDK的原始数据转换为解决方案内置模式的插件

3. 上传插件的java JAR文件。

4. (可选)如果有的话，上传依赖文件。

5. **主要功能类**：填写您的插件类名的完整类名，例如 `com.company.sol.CustomTransformer`。


## 开发自定义插件

开发自定义插件的最简单方式是基于我们的示例项目进行更改。

1. 克隆/派生示例项目。

```sh

git clone {{ git_repo }}

cd examples/custom-plugins

```

 - 对于增强插件，请参考示例：`custom-enrich/`
 - 对于转换器插件，请参考示例：`custom-sdk-transformer/`

2. 根据您的需要更改包和类的名称。

3. 实现方法 `public Dataset<row> transform(Dataset<row> dataset)` 来进行转换或增强。

4. （可选）编写测试代码。

5. 运行gradle将代码打包成jar `./gradlew clean build`。

6. 在构建输出目录 `./build/libs/` 中获取jar文件。

