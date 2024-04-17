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

export const CHANNEL_RULE = [{
  id: 'rule#1',
  channel: 'Direct',
  displayName: {
    'en-US': 'Direct',
    'zh-CN': '直接访问',

  },
  description: {
    'en-US': 'Direct traffic is the most common type of traffic. It is the traffic that comes to your website by typing your website URL into the browser or clicking on a bookmark. Direct traffic is not only the most common type of traffic, but it is also the most valuable.',
    'zh-CN': '直接访问是最常见的流量类型。它是通过在浏览器中键入您的网站 URL 或单击书签来访问您的网站的流量。直接访问不仅是最常见的流量类型，而且也是最有价值的。',
  },
  condition: {
    'op::and': [{
      field: 'traffic_source_category',
      op: 'eq',
      value: '__empty__',
    },
    {
      field: 'traffic_source_source',
      op: 'eq',
      value: '__empty__',
    },
    {
      field: 'traffic_source_medium',
      op: 'eq',
      value: '__empty__',
    },
    {
      field: 'traffic_source_campaign',
      op: 'eq',
      value: '__empty__',
    },
    {
      field: 'traffic_source_content',
      op: 'eq',
      value: '__empty__',
    },
    {
      field: 'traffic_source_term',
      op: 'eq',
      value: '__empty__',
    },
    {
      field: 'traffic_source_campaign_id',
      op: 'eq',
      value: '__empty__',
    },
    {
      field: 'traffic_source_clid_platform',
      op: 'eq',
      value: '__empty__',
    },
    {
      field: 'traffic_source_clid',
      op: 'eq',
      value: '__empty__',
    }],
  },
},
{
  id: 'rule#2',
  channel: 'Paid Search',
  displayName: {
    'en-US': 'Paid Search',
    'zh-CN': '付费搜索',
  },
  description: {
    'en-US': 'Paid search is a form of digital marketing where search engines such as Google and Bing allow advertisers to show ads on their search engine results pages (SERPs). Paid search works on a pay-per-click model, meaning you do exactly that – until someone clicks on your ad, you don’t pay.',
    'zh-CN': '付费搜索是数字营销的一种形式，搜索引擎（如 Google 和必应）允许广告商在其搜索引擎结果页面（SERP）上显示广告。付费搜索采用按点击付费的模式运作，这意味着您确实如此 - 直到有人点击您的广告，您才需要支付费用。',
  },
  condition: {
    'op::and': [{
      field: 'traffic_source_category',
      op: 'eq',
      value: 'Search',
    },
    {
      'op::or': [{
        field: 'traffic_source_medium',
        op: 'match',
        value: '^(.*cp.*|ppc|retargeting|paid.*)$',
      },
      {
        field: 'traffic_source_clid',
        op: 'not_eq',
        value: '__empty__',
      }],
    }],
  },
},
{
  id: 'rule#3',
  channel: 'Organic Search',
  displayName: {
    'en-US': 'Organic Search',
    'zh-CN': '自然搜索',
  },
  description: {
    'en-US': 'Organic search is a method for entering one or several search terms as a single string of text into a search engine. Organic search results are listings on search engine results pages that appear because of their relevance to the search terms, as opposed to their being advertisements.',
    'zh-CN': '自然搜索是一种将一个或多个搜索词作为单个文本字符串输入搜索引擎的方法。自然搜索结果是出现在搜索引擎结果页面上的列表，这些列表是因为与搜索词的相关性而出现的，而不是因为它们是广告。',
  },
  condition: {
    'op::and': [{
      field: 'traffic_source_category',
      op: 'eq',
      value: 'Search',
    },
    {
      'op::or': [{
        field: 'traffic_source_medium',
        op: 'eq',
        value: '__empty__',
      },
      {
        field: 'traffic_source_medium',
        op: 'eq',
        value: 'organic',
      }],
    }],
  },
},
{
  id: 'rule#4',
  channel: 'Paid Social',
  displayName: {
    'en-US': 'Paid Social',
    'zh-CN': '付费社交',
  },
  description: {
    'en-US': 'Paid social media is a method of displaying advertisements or sponsored marketing messages on popular social media platforms, and targeting a specific sub-audience. Social media advertising is a perfect channel for marketers because it allows them to target specific audiences.',
    'zh-CN': '付费社交媒体是在流行的社交媒体平台上显示广告或赞助营销信息，并针对特定的子受众的一种方法。社交媒体广告是营销人员的理想渠道，因为它允许他们针对特定受众。',
  },
  condition: {
    'op::and': [{
      field: 'traffic_source_category',
      op: 'eq',
      value: 'Social',
    },
    {
      'op::or': [{
        field: 'traffic_source_medium',
        op: 'match',
        value: '^(.*cp.*|ppc|retargeting|paid.*)$',
      },
      {
        field: 'traffic_source_clid',
        op: 'not_eq',
        value: '__empty__',
      }],
    }],
  },
},
{
  id: 'rule#5',
  channel: 'Organic Social',
  displayName: {
    'en-US': 'Organic Social',
    'zh-CN': '自然社交',
  },
  description: {
    'en-US': 'Organic social media is the use of social media platforms to promote a product or service organically, without the need for paid advertising. It is a way to engage with your audience, build your brand, and increase sales.',
    'zh-CN': '自然社交媒体是利用社交媒体平台有机地推广产品或服务，而无需付费广告。这是一种与您的受众互动、建立品牌和增加销售的方式。',
  },
  condition: {
    'op::or': [{
      field: 'traffic_source_category',
      op: 'eq',
      value: 'Social',
    },
    {
      field: 'traffic_source_medium',
      op: 'in',
      values: [
        'social',
        'social-network',
        'social-media',
        'sm',
        'social network',
        'social media',
      ],
    }],
  },
},
{
  id: 'rule#6',
  channel: 'Paid Video',
  displayName: {
    'en-US': 'Paid Video',
    'zh-CN': '付费视频',
  },
  description: {
    'en-US': 'Paid video advertising is a form of digital advertising that uses video content to promote a product or service. Video ads are displayed before, during, or after the video content is played. Video advertising is a popular way to reach a target audience.',
    'zh-CN': '付费视频广告是一种利用视频内容推广产品或服务的数字广告形式。视频广告在播放视频内容之前、期间或之后显示。视频广告是一种流行的触达目标受众的方式。',
  },
  condition: {
    'op::and': [{
      field: 'traffic_source_category',
      op: 'eq',
      value: 'Video',
    },
    {
      'op::or': [{
        field: 'traffic_source_medium',
        op: 'match',
        value: '^(.*cp.*|ppc|retargeting|paid.*)$',
      },
      {
        field: 'traffic_source_clid',
        op: 'not_eq',
        value: '__empty__',
      }],
    }],
  },
},
{
  id: 'rule#7',
  channel: 'Organic Video',
  displayName: {
    'en-US': 'Organic Video',
    'zh-CN': '自然视频',
  },
  description: {
    'en-US': 'Organic video is a type of video content that is created and shared by users on social media platforms. Organic video content is not paid for or sponsored by a brand or company. It is a way for users to share their experiences and opinions with others.',
    'zh-CN': '自然视频是用户在社交媒体平台上创建和分享的视频内容类型。自然视频内容不是由品牌或公司支付或赞助的。这是用户与他人分享他们的经验和意见的一种方式。',
  },
  condition: {
    'op::or': [{
      field: 'traffic_source_category',
      op: 'eq',
      value: 'Video',
    },
    {
      field: 'traffic_source_medium',
      op: 'match',
      value: '^(.*video.*)$',
    }],
  },
},
{
  id: 'rule#8',
  channel: 'Paid Shopping',
  displayName: {
    'en-US': 'Paid Shopping',
    'zh-CN': '付费购物',
  },
  description: {
    'en-US': 'Paid shopping is a form of digital advertising that uses shopping ads to promote products or services. Shopping ads are displayed on search engine results pages (SERPs) and are designed to help users find products to purchase.',
    'zh-CN': '付费购物是一种利用购物广告推广产品或服务的数字广告形式。购物广告显示在搜索引擎结果页面（SERP）上，旨在帮助用户找到要购买的产品。',
  },
  condition: {
    'op::and': [{
      field: 'traffic_source_category',
      op: 'eq',
      value: 'Shopping',
    },
    {
      'op::or': [{
        field: 'traffic_source_medium',
        op: 'match',
        value: '^(.*cp.*|ppc|retargeting|paid.*)$',
      },
      {
        field: 'traffic_source_clid',
        op: 'not_eq',
        value: '__empty__',
      },
      {
        field: 'traffic_source_campaign',
        op: 'match',
        value: '^(.*(([^a-df-z]|^)shop|shopping).*)$',
      }],
    }],
  },
},
{
  id: 'rule#9',
  channel: 'Organic Shopping',
  displayName: {
    'en-US': 'Organic Shopping',
    'zh-CN': '自然购物',
  },
  description: {
    'en-US': 'Organic shopping is a type of shopping that is done without the use of paid advertising. Organic shopping is a way to find products and services that are not promoted through paid advertising. It is a way to discover new products and services.',
    'zh-CN': '自然购物是一种无需使用付费广告的购物方式。自然购物是一种发现未通过付费广告推广的产品和服务的方式。这是一种发现新产品和服务的方式。',
  },
  condition: {
    'op::or': [{
      field: 'traffic_source_category',
      op: 'eq',
      value: 'Shopping',
    },
    {
      field: 'traffic_source_campaign',
      op: 'match',
      value: '^(.*(([^a-df-z]|^)shop|shopping).*)$',
    }],
  },
},
{
  id: 'rule#10',
  channel: 'Paid Other',
  displayName: {
    'en-US': 'Paid Other',
    'zh-CN': '付费其他',
  },
  description: {
    'en-US': 'Paid other is a form of digital advertising that uses other types of ads to promote products or services. Other ads are displayed on websites, social media platforms, and other digital channels. Paid other is a way to reach a target audience.',
    'zh-CN': '付费其他是一种利用其他类型的广告推广产品或服务的数字广告形式。其他广告显示在网站、社交媒体平台和其他数字渠道上。付费其他是一种触达目标受众的方式。',
  },
  condition: {
    'op::and': [{
      field: 'traffic_source_category',
      op: 'eq',
      value: '__empty__',
    },
    {
      field: 'traffic_source_medium',
      op: 'match',
      value: '^(.*cp.*|ppc|retargeting|paid.*)$',
    }],
  },
},
{
  id: 'rule#11',
  channel: 'Email',
  displayName: {
    'en-US': 'Email',
    'zh-CN': '电子邮件',
  },
  description: {
    'en-US': 'Email marketing is a form of digital marketing that uses email to promote products or services. Email marketing is a way to reach a target audience and build relationships with customers. Email marketing is a cost-effective way to reach a large audience.',
    'zh-CN': '电子邮件营销是一种利用电子邮件推广产品或服务的数字营销形式。电子邮件营销是一种触达目标受众并与客户建立关系的方式。电子邮件营销是一种成本效益高的触达大众的方式。',
  },
  condition: {
    'op::or': [{
      field: 'traffic_source_source',
      op: 'contain',
      value: 'mail',
    },
    {
      field: 'traffic_source_medium',
      op: 'contain',
      value: 'mail',
    },
    {
      field: 'page_view_latest_referrer_host',
      op: 'start_with',
      value: 'mail',
    }],
  },
},
{
  id: 'rule#12',
  channel: 'SMS',
  displayName: {
    'en-US': 'SMS',
    'zh-CN': '短信',
  },
  description: {
    'en-US': 'SMS marketing is a form of digital marketing that uses text messages to promote products or services. SMS marketing is a way to reach a target audience and build relationships with customers. SMS marketing is a cost-effective way to reach a large audience.',
    'zh-CN': '短信营销是一种利用短信推广产品或服务的数字营销形式。短信营销是一种触达目标受众并与客户建立关系的方式。短信营销是一种成本效益高的触达大众的方式。',
  },

  condition: {
    'op::or': [{
      field: 'traffic_source_source',
      op: 'eq',
      value: 'sms',
    },
    {
      field: 'traffic_source_medium',
      op: 'eq',
      value: 'sms',
    }],
  },
},
{
  id: 'rule#13',
  channel: 'Audio',
  displayName: {
    'en-US': 'Audio',
    'zh-CN': '音频',
  },
  description: {
    'en-US': 'Audio marketing is a form of digital marketing that uses audio content to promote products or services. Audio marketing is a way to reach a target audience and build relationships with customers. Audio marketing is a cost-effective way to reach a large audience.',
    'zh-CN': '音频营销是一种利用音频内容推广产品或服务的数字营销形式。音频营销是一种触达目标受众并与客户建立关系的方式。音频营销是一种成本效益高的触达大众的方式。',
  },
  condition: {
    'op::and': [{
      field: 'traffic_source_medium',
      op: 'eq',
      value: 'audio',
    }],
  },
},
{
  id: 'rule#14',
  channel: 'Mobile Push Notifications',
  displayName: {
    'en-US': 'Mobile Push Notifications',
    'zh-CN': '移动推送通知',
  },
  description: {
    'en-US': "Mobile push notifications are messages that pop up on a mobile device. App publishers can send them at any time; users don't have to be in the app or using their devices to receive them. They can do a lot of things; for example, they can show the latest sports scores, get a user to take an action, such as downloading a coupon, or let a user know about an event, such as a flash sale.",
    'zh-CN': '移动推送通知是弹出在移动设备上的消息。应用程序发布者可以随时发送它们；用户不必在应用程序中或使用其设备才能接收它们。它们可以做很多事情；例如，它们可以显示最新的体育比分，让用户采取行动，例如下载优惠券，或者让用户了解事件，例如闪购。',
  },
  condition: {
    'op::or': [{
      field: 'traffic_source_medium',
      op: 'end_with',
      value: 'push',
    },
    {
      field: 'traffic_source_medium',
      op: 'contain',
      value: 'mobile',
    },
    {
      field: 'traffic_source_medium',
      op: 'contain',
      value: 'notification',
    }],
  },
},
{
  id: 'rule#15',
  channel: 'Referral',
  displayName: {
    'en-US': 'Referral',
    'zh-CN': '推荐',
  },
  description: {
    'en-US': 'Referral traffic is a type of web traffic that is directed to your website from another website. Referral traffic is a valuable source of traffic because it comes from a trusted source. Referral traffic is a way to reach a target audience.',
    'zh-CN': '推荐流量是指从另一个网站引导到您的网站的一种网站流量。推荐流量是一种有价值的流量来源，因为它来自可信赖的来源。推荐流量是一种触达目标受众的方式。',
  },

  condition: {
    'op::and': [{
      field: 'page_view_latest_referrer',
      op: 'not_eq',
      value: '__empty__',
    },
    {
      field: 'traffic_source_category',
      op: 'eq',
      value: '__empty__',
    },
    {
      field: 'page_view_latest_referrer_host',
      op: 'not_match',
      value: '^.*internal.*$',
    }],
  },
},
{
  id: 'rule#16',
  channel: 'Internal',
  displayName: {
    'en-US': 'Internal',
    'zh-CN': '内部',
  },
  description: {
    'en-US': 'Internal traffic is a type of web traffic that is directed to your website from another page on your website. Internal traffic is a valuable source of traffic because it comes from a trusted source. Internal traffic is a way to reach a target audience.',
    'zh-CN': '内部流量是指从您网站上的另一页引导到您的网站的一种网站流量。内部流量是一种有价值的流量来源，因为它来自可信赖的来源。内部流量是一种触达目标受众的方式。',
  },
  condition: {
    'op::and': [{
      field: 'page_view_latest_referrer_host',
      op: 'match',
      value: '^.*internal.*$',
    }],
  },
}];