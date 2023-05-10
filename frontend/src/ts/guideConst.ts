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

export const CLICKSTREAM_IOS_REPO_LINK =
  'https://github.com/awslabs/clickstream-swift';
export const GUIDE_LINK_ANDROID_SDK = '/'; // TODO
export const GUIDE_LINK_IOS_SDK = '/'; // TODO
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
        "isCompressEvents": false,
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

export const ANDROID_CONFIG_SDK_TEXT = `import software.aws.solution.clickstream.ClickstreamAnalytics

// config the sdk after initialize.
ClickstreamAnalytics.getClickStreamConfiguration()
            .withAppId("${TEMPLATE_APP_ID}")
            .withEndpoint("${TEMPLATE_SERVER_ENDPOINT}")
            .withAuthCookie("your authentication cookie")
            .withSendEventsInterval(10000)
            .withSessionTimeoutDuration(1800000)
            .withTrackAppExceptionEvents(false)
            .withLogEvents(true)
            .withCustomDns(CustomOkhttpDns.getInstance())
            .withCompressEvents(true);
`;

export const ANDROID_RECODE_EVENT = `import software.aws.solution.clickstream.ClickstreamAnalytics;
import com.amplifyframework.analytics.AnalyticsEvent;

AnalyticsEvent event = AnalyticsEvent.builder()
    .name("PasswordReset")
    .add("Channel", "SMS")
    .add("Successful", true)
    .add("ProcessDuration", 78.2)
    .add("UserAge", 20)
    .build();
ClickstreamAnalytics.recordEvent(event);
`;

export const ANDROID_ADD_USER_ATTR = `import software.aws.solution.clickstream.ClickstreamAnalytcs;
import software.aws.solution.clickstream.ClickstreamUserAttribute;

// when user login usccess.
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
      "awsClickstreamPlugin ": {
        "appId": "${TEMPLATE_APP_ID}",
        "endpoint": "${TEMPLATE_SERVER_ENDPOINT}",
        "isCompressEvents": false,
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
        ClickstreamAnalytics.initSDK()
        print("Initialized ClickstreamAnalytics")
    } catch {
        print("Failed to initialize ClickstreamAnalytics with (error)")
    }
    return true
}
`;

export const IOS_CONFIG_SDK_TEXT = `import Clickstream

var configuration = ClickstreamConfiguration()
configuration.isCompressEvents = true
configuration.authCookie = "your auth cookie"
configuration.appId = "${TEMPLATE_APP_ID}"
configuration.endPoint = "${TEMPLATE_SERVER_ENDPOINT}"
configuration.isLogEvents = true
ClickstreamAnalytics.updateConfiguration(configuration: configuration)
`;

export const IOS_RECODE_EVENT = `iimport Clickstream

let myProp: ClickstreamAttribute = [
    "stringKey": "stringValue",
    "intKey": "123",
    "doubleKey": 12.33,
    "boolKey": true,
]
let event = BaseClickstreamEvent(name: "eventName", properties: myProp)
ClickstreamAnalytics.recordEvent(event)
`;

export const IOS_ADD_USER_ATTR = `import Clickstream

// when user login usccess.
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
