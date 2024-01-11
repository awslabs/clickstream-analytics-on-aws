# Clickstream web SDK sample project

Creating a monorepo project with Vue2.x and Express.JS using Yarn Workspaces for Clickstream Analytics on AWS solution web SDK sample.

Read the article: [Yarn Workspaces](https://classic.yarnpkg.com/lang/en/docs/workspaces/)

## Project structure

We have 2 packages inside the project:

- **Vue2:** Vue2.x application.
- **Server:** Express.JS application.

Each of the packages have their own `package.json` file, so they define their dependencies as well as they have fully autonomy to publish a new version of the package into NPM or Yarn registry.

```
|- package.json => root workspace (private package used by yarn workspaces)
|--- packages
|------ vue2
|-------- package.json  => Vue2.x project
|------ server
|-------- package.json => Express.js project
```

## How to install and execute

> Important! The node version for the project is 18. Make sure you have that version installed in your computer. If you have NVM installed, run `nvm use 18`. If not, install it here: https://github.com/nvm-sh/nvm#install--update-script

1. Clone this repository locally `$ git clone https://github.com/awslabs/clickstream-analytics-on-aws.git`
2. Go to this example directory. `$ cd examples/web-sdk-sample/`
3. Copy `.env.example` to `.env` in `packages/vue2` folder and update your **AppId** and **Endpoint** which you created in Clickstream Analytics on AWS solution
4. Install the dependencies. Inside the root `$ yarn install`
5. Start sample applications:

```
// Vue2 Project with server
$ yarn start-vue2
```

## Feature Integration

### Tracking HTTP Requests

Intercept all HTTP requests in your Vue application and record relevant information with the Clickstream SDK:

```javascript
// Add request interceptor
Service.interceptors.request.use((config) => {
  // Record the information sent to the request
  ClickstreamAnalytics.record({
    name: 'http_request',
    attributes: {
      request_url: config.url,
      request_config: JSON.stringify(config),
    },
  });
  return config;
});
```

### Capturing Global Vue Errors

Use Vue's global error handler to catch and log errors:

```javascript
// Send vue Runtime Error
Vue.config.errorHandler = function (err, vm, info) {
  // Handle error
  ClickstreamAnalytics.record({
    name: 'runtime_exception',
    attributes: {
      error_message: err.toString(),
      vm: vm.toString(),
      info: info,
    },
  });
};
```

### Utilizing the Performance API

Capture page performance data using the Performance API:

```javascript
function sendPerformanceData() {
  const tmpPerf = {
    jsHeapSizeLimit: performance.memory.jsHeapSizeLimit,
    totalJSHeapSize: performance.memory.jsHeapSizeLimit,
    usedJSHeapSize: performance.memory.usedJSHeapSize,
  };
  ClickstreamAnalytics.record({
    name: 'app_performance',
    attributes: { ...tmpPerf, ...performance.getEntriesByType('navigation') },
  });
}
```

### WebSocket Communication Tracking

Record data sent and received during WebSocket communication:

```javascript
  // Init Websocket connection
  this.socket = io(process.env.VUE_APP_SERVER_API);

  // Listen for disconnect events
  this.socket.on('disconnect', (reason) => {
    ClickstreamAnalytics.record({
    name: 'websocket_disconnect',
    attributes: { message: reason },
    });
  });

  // Record send message event
  sendMessage(msg) {
    ClickstreamAnalytics.record({
      name: 'send_websocket',
      attributes: { message: msg },
    });
    this.socket.emit('client message', msg);
  }

```

### Upload files to S3 bucket

Clickstream SDK is mainly used for the collection of business attributes. When you need to associate files, we recommend uploading the file to S3 bucket and then setting the file S3 url into the event attribute to link to the file.

Prerequisite: Please follow the steps outlined in this [documentation](https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/loading-browser-credentials-cognito.html) to create a Cognito identity pool with guest access.

```javascript
  // Config your S3 client
  const REGION = 'your bucket region';
  const s3Client = new S3Client({
      region: REGION,
      credentials: fromCognitoIdentityPool({
        clientConfig: { region: REGION },
        identityPoolId: 'your identityPoolId with S3 bucket access permission'
      })
  });
  
  // Create put object command
  const command = new PutObjectCommand({
    Bucket: 'your S3 bucket',
    Key: file.name,
    Body: file
  });
  
  // Upload file
  try {
    const response = await s3Client.send(command);
    console.log(response);
    if (response.$metadata.httpStatusCode === 200) {
      console.log('upload success');
    }
  } catch (err) {
    console.error(err);
  }
```

Learn more Clickstream Web SDK usage examples please refer to this [document](https://awslabs.github.io/clickstream-analytics-on-aws/en/latest/sdk-manual/web/).
