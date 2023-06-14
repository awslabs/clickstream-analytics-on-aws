# Configure transformation and enrichment plugins

There are two types of plugins: **transformer** or **enrichment**.  When choose plugins, you can only have one **transformer** and zero or multiple **enrichment** for a pipeline.

## Built-in Plugins

Below plugins are provided by {{solution_name}}.

| Plugin name | Type |  Description |
| --- | --- |  --- | 
| UAEnrichment | enrichment |User-agent enrichment, use `ua_parser` Java library to enrich `User-Agent` in the HTTP header to `ua_browser`,`ua_browser_version`,`ua_os`,`ua_os_version`,`ua_device` | 
| IpEnrichment | enrichment |IP address enrichment, use GeoLite2 data by MaxMind to enrich `IP` to `city`, `continent`, `country` | 

The UAEnrichment uses [UA Parser](https://mvnrepository.com/artifact/ua_parser/ua-parser) to parse user-agent in Http header.

The IpEnrichment plugin uses [GeoLite2-City data](https://cdn.jsdelivr.net/npm/geolite2-city@1.0.0/GeoLite2-City.mmdb.gz) created by MaxMind, available from [https://www.maxmind.com](https://www.maxmind.com).


## Custom Plugins

You can add custom plugins to transform raw event data or enrich the data for your need.

!!! note "Note"

    To add custom plugins, you must develop your own plugins firstly, see [Develop Custom Plugins](#develop-custom-plugins)


You can add your plugins by click **Add Plugin** buttion, which will open a new window, in which you can upload your plugins.

1. Give the plugin **Name** and **Description**.
2. Chose **Plugin Type**,
   - **Enrichment**: Plugin to add fields into event data collected by SDK (both Clickstream SDK or third-party SDK)
   - **Transformation**: A plugin used to transform a third-party SDK’s raw data into solution built-in schema

3. Upload plugin java JAR file.

4. (Optional) Upload the dependency files if any.

5. **Main function class**: fill the full class name of your plugin class name, e.g. `com.company.sol.CustomTransformer`.


## Develop Custom Plugins

The simplest way to develop custom plugins is making changes based on our example project.

1. Clone/Fork the example project.

```sh

git clone {{ git_repo }}

cd examples/custom-plugins

```

 - For enrichment plugin, please refer to the example: `custom-enrich/`
 - For transformer plugin, please refer to the example: `custom-sdk-transformer/`

2. Change packages and classes name as your desired.

3. Implement the method `public Dataset<row> transform(Dataset<row> dataset)` to do transformation or enrichment.

4. (Optional) Write test code.

5. Run gradle to package code to jar `./gradlew clean build`.

6. Get the jar file in build ouput directory `./build/libs/`.
