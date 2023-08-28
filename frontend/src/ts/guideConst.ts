/**
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *
 *  Licensed under the Apache License, Version 2.0 (the "License"). You may not use this file except in compliance
 *  with the License. A copy of the License is located at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 *  or in the 'license' file accompanying this file. This file is distributed on an 'AS IS' BASIS, WITHOUT WARRANTIES
 *  OR CONDITIONS OF ANY KIND, express or implied. See the License for the specific language governing permissions
 *  and limitations under the License.
 */

import { ZH_LANGUAGE_LIST } from './const';

export const CLICKSTREAM_IOS_REPO_LINK =
  'https://github.com/awslabs/clickstream-swift';

export const SDK_GUIDE_LINK_EN =
  'https://awslabs.github.io/clickstream-analytics-on-aws/en';
export const SDK_GUIDE_LINK_ZH =
  'https://awslabs.github.io/clickstream-analytics-on-aws/zh';

export const buildSDKDocumentLink = (lang: string, url?: string) => {
  if (ZH_LANGUAGE_LIST.includes(lang)) {
    return SDK_GUIDE_LINK_ZH + (url ?? '');
  }
  return SDK_GUIDE_LINK_EN + (url ?? '');
};

export const DOWNLOAD_FILENAME = 'amplifyconfiguration.json';
export const TEMPLATE_APP_ID = '{{APP_ID}}';
export const TEMPLATE_SERVER_ENDPOINT = '{{SERVER_ENDPOINT}}';
export const TEMPLATE_ANDROID_SDK_VERSION = '{{ANDROID_SDK_VERSION}}';

// Android Guide
export const ANDROID_CONFIG_JSON_TEMPLATE = `{
  "UserAgent": "aws-solution/clickstream",
  "Version": "1.0",
  "analytics": {
    "plugins": {
      "awsClickstreamPlugin": {
        "appId": "${TEMPLATE_APP_ID}",
        "endpoint": "${TEMPLATE_SERVER_ENDPOINT}",
        "isCompressEvents": true,
        "autoFlushEventsInterval": 10000,
        "isTrackAppExceptionEvents": false
      }
    }
  }
}
`;

export const ANDROID_ADD_DEPENDENCY_TEXT = `dependencies {
  implementation 'software.aws.solution:clickstream:${TEMPLATE_ANDROID_SDK_VERSION}'
}`;

export const ANDROID_INIT_SDK_TEXT = `import software.aws.solution.clickstream.ClickstreamAnalytics

public void onCreate() {
    super.onCreate();
    try{
        ClickstreamAnalytics.init(this);
        Log.i("MyApp", "Initialized ClickstreamAnalytics");
    }catch(AmplifyException error){
        Log.e("MyApp", "Could not initialize ClickstreamAnalytics", error);
    } 
}
`;

export const ANDROID_RECODE_EVENT = `import software.aws.solution.clickstream.ClickstreamAnalytics;
import software.aws.solution.clickstream.ClickstreamEvent;

ClickstreamEvent event = ClickstreamEvent.builder()
    .name("PasswordReset")
    .add("Channel", "SMS")
    .add("Successful", true)
    .add("ProcessDuration", 78.2)
    .add("UserAge", 20)
    .build();
ClickstreamAnalytics.recordEvent(event);

// for record an event directly
ClickstreamAnalytics.recordEvent("button_click");
`;

export const ANDROID_ADD_USER_ATTR = `import software.aws.solution.clickstream.ClickstreamAnalytcs;
import software.aws.solution.clickstream.ClickstreamUserAttribute;

// when user login success.
ClickstreamAnalytics.setUserId("UserId");

// when user logout
ClickstreamAnalytics.setUserId(null);

// add user attributes
ClickstreamUserAttribute clickstreamUserAttribute = ClickstreamUserAttribute.builder()
    .add("_user_age", 21)
    .add("_user_name", "carl")
    .build();
ClickstreamAnalytics.addUserAttributes(clickstreamUserAttribute);
`;

// iOS Guide
export const IOS_CONFIG_JSON_TEMPLATE = `{
  "analytics": {
    "plugins": {
      "awsClickstreamPlugin": {
        "appId": "${TEMPLATE_APP_ID}",
        "endpoint": "${TEMPLATE_SERVER_ENDPOINT}",
        "isCompressEvents": true,
        "autoFlushEventsInterval": 10000,
        "isTrackAppExceptionEvents": false
      }
    }
  }
}
`;

export const IOS_INIT_SDK_TEXT = `import Clickstream
...
func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
  // Override point for customization after application launch.
  do {
      try ClickstreamAnalytics.initSDK()
  } catch {
      assertionFailure("Fail to initialize ClickstreamAnalytics: (error)")
  }
  return true
}
`;

export const IOS_RECODE_EVENT = `import Clickstream

let attributes: ClickstreamAttribute = [
    "Channel": "apple",
    "Successful": true,
    "ProcessDuration": 12.33,
    "UserAge": 20,
]
ClickstreamAnalytics.recordEvent(eventName: "testEvent", attributes: attributes)

// for record an event directly
ClickstreamAnalytics.recordEvent(eventName: "button_click")
`;

export const IOS_ADD_USER_ATTR = `import Clickstream

// when user login success.
ClickstreamAnalytics.setUserId(userId: "UserId")

// when user logout
ClickstreamAnalytics.setUserId(userId: nil)

// add user attributes
let clickstreamUserAttribute : ClickstreamAttribute=[
    "_user_age": 21,
    "_user_name": "carl"
]
ClickstreamAnalytics.addUserAttributes(userAttribute: clickstreamUserAttribute)
`;

export const WEB_INSTALL_GUIDE = `// npm
npm install @aws/clickstream-web

// Or yarn
yarn install @aws/clickstream-web`;

export const WEB_INIT_SDK_TEXT = `import { ClickstreamAnalytics } from '@aws/clickstream-web';

ClickstreamAnalytics.init(
  {
    appId: "${TEMPLATE_APP_ID}", // Your application ID
    endpoint: "${TEMPLATE_SERVER_ENDPOINT}" // Your server endpoint
  }
);
`;

export const WEB_RECORD_EVENT = `import { ClickstreamAnalytics } from '@aws/clickstream-web';

ClickstreamAnalytics.record({ name: 'buttonClick' });
ClickstreamAnalytics.record({
  name: 'buttonClick',
  attributes: { _channel: 'SMS', Successful: true }
});
`;

export const WEB_ADD_USER_ATTR = `import { ClickstreamAnalytics } from '@aws/clickstream-web';

// when user login success.
ClickstreamAnalytics.setUserId("UserId");

// when user logout
ClickstreamAnalytics.setUserId(null);
`;
