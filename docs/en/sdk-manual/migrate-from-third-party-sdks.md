# Migrate from third-party SDKs

## Introduction

Generally, in order not to affect your normal business analysis, when migrating from a third-party SDK to Clickstream SDK, we recommend that you integrate your existing SDK with Clickstream SDK for a period of time, and then remove it when you think that Clickstream SDK can replace the previous SDK.

This article mainly introduces how to integrate Clickstream SDK and third-party SDK into your application at the same time. After understanding this article, you will be able to synchronously integrate third-party SDKs with the Clickstream SDK with minimal code modifications, which will help you transition your data analytics business from other SDKs to Clickstream more smoothly.

To make it easier to understand, we will use Clickstream Web SDK as an example to introduce, for third-party analytics SDK, we take Firebase SDK as an example to introduce, and assume that you have integrated Firebase Web SDK.

## Step 1: Integrate Clickstream Web SDK

### Include SDK

```bash
npm install @aws/clickstream-web
```

### Initialize the SDK

Copy your configuration code from your clickstream solution web console, we recommended you add the code to your app's root entry point, for example `index.js/app.tsx` in React or `main.ts` in Vue/Angular, the configuration code should look like as follows.

```typescript
import { ClickstreamAnalytics } from '@aws/clickstream-web';

ClickstreamAnalytics.init({
   appId: "your appId",
   endpoint: "https://example.com/collect",
});
```

## Step 2: Encapsulate commonly data logger methods

When integrating multiple data analysis SDKs, it is strongly recommended that you encapsulate event recording methods. Processing data analysis codes of different SDKs in the same place can make the code concise and easy to modify later. Below is an example of our encapsulation that you can copy directly into your project.

```javascript
import { ClickstreamAnalytics } from "@aws/clickstream-web";
import { getAnalytics, logEvent, setUserProperties, setUserId } from "firebase/analytics";

export const AnalyticsLogger = {

  log(eventName, attributes, items) {
    attributes = attributes ?? {}
    const {["items"]: items, ...mAttributes} = attributes;
    
    // Clickstream SDK
    ClickstreamAnalytics.record({
      name: eventName,
      attributes: mAttributes,
      items: items
    })

    //Firebase SDK
    const analytics = getAnalytics();
    logEvent(analytics, eventName, attributes);
  },

  setUserAttributes(attributes) {
    // Clickstream SDK
    ClickstreamAnalytics.setUserAttributes(attributes);

    // Firebase SDK
    const analytics = getAnalytics();
    setUserProperties(analytics, attributes);
  },

  setUserId(userId) {
    //Clickstream SDK
    ClickstreamAnalytics.setUserId(userId)

    //Firebase SDK
    const analytics = getAnalytics();
    setUserId(analytics, userId);
  },
}
```

We need to encapsulate three APIs `log()` 、`setUserAttributes()` and `setUserId()`, that's all. When we invoke the `AnalyticsLogger.log('testEvent')`  method, both Clickstream and Firebase SDK will log the event, so we only need to call the `AnalyticsLogger` api in your business code.

## Step 3: Migrate to common APIs in minutes

### For log events

```javascript
  onSignedUp(user) {
    let attributes = {
      _user_id: user.id,
      username: user.username,
      email: user.email,
    };
--  logEvent(analytics, 'sign_up', attributes);
++  AnalyticsLogger.log('sign_up', attributes);
  }
```

For the events log api, we just need to get the event name, attributes and pass them into the new api. Of course, you can also use the "Replace in File" feature to make quick changes, as shown in the image below.

![replace_in_files](../images/sdk-manual/replace-in-file.png) 

### For user

```javascript
  userSignedIn(user) {
--  setUserId(analytics, user.id);
++  AnalyticsLogger.setUserId(user.id);
    let attributes = {
      _user_id: user.id,
      username: user.username,
      email: user.email,
    };
--  setUserProperties(analytics, attributes);
++  AnalyticsLogger.setUserAttributes(attributes);
  }
```

For user id, replace  `setUserId()` with `AnalyticsLogger.setUserId()` .

For user attributes, replace `setUserProperties()` with `AnalyticsLogger.setUserAttributes()` .

## Summary

As we saw above, it is easy to get Clickstream SDK and Firebase SDK to work together, after these three steps, your data will both upload to Clickstream analytics and Firebase, these two SDKs will work well together, and has no influence with each other, after your analytics business is migrated to clickstream, you only need to modify the `AnalyticsLogger` file to smoothly remove another SDK, and save your costs.
