# Traffic source
Traffic source describes the channel through which the users arrive at your website or application, such as paid ads, marketing campaigns, search engines, and social networks. This article describes how {{solution_name}} collects and processes traffic-source data.

## Traffic-source data fields
Traffic source includes the following key dimension to describe how the users arrives at your website or app.

1. Source -  where the traffic originates (e.g., google, baidu, bing)
2. Medium - the methods by which users arrive at your site/app (medium, e.g., organic, cpc/ppc, email)
3. Campaign - the specific marketing efforts you use to drive that traffic (e.g., campaign, creative format, keywords).
4. Auto-tagged Click ID - the parameter generated and appended by ad platform automatically when ad are showed and clicked. (e.g., gclid)

{{ solution_name }} uses below dimensions and fields to track traffic-source data when sending events:

| Dimension | Clickstream SDK preserved attributes |UTM parameters in page_url (Web only) | Field in data schema |
|-------------|------------|------------|--------------|
|Source | _traffic_source_source | utm_source | traffic_source_source |
|Medium | _traffic_source_medium | utm_medium | traffic_source_medium |
|Campaign Name | _traffic_source_campaign | utm_campaign | traffic_source_campaign |
|Campaign ID | _traffic_source_id | utm_id | traffic_source_id |
|Campaign Term | _traffic_source_term | utm_term | traffic_source_term |
|Campaign Content | _traffic_source_content | utm_content | traffic_source_content |
|Auto-tagged Click ID | _traffic_source_clid | (*)clid | traffic_source_clid |
|Auto-tagged Click ID Platform | _traffic_source_clid_platform | N/A | traffic_source_clid_platform |
|App Install Source | _app_install_channel | N/A | app_install_source |

Below two dimensions are enriched from above traffic-source data fields and added to each event:

| Dimension | Field in data schema | Description |
|-------------|-----|-----------|
|Source Category | _traffic_source_category | Categories based on traffic_source_source and referral domain, including Search, Social, Shopping, Video, and Internal |
|Channel Group | _traffic_source_channel_group | A channel group is a set of channels, which are rule-based categories of your traffic sources, for example, paid search, paid social.|


## Processing
During data processing, traffic-source field values are populated into dimension values for each event and attributed to users and sessions. Below describes the details steps.

### Step 1 - Extract traffic-source data

1. If the preset traffic-source attributes are set with values, data process module will map their values them into corresponding traffic-source data fields. For example, map the value of _traffic_source_source to traffic_source_source field.
2. (For web only) If the preset traffic-source attributes have no values, data processing module will map the utm_parameters (e.g., utm_source) and auto-tagged click id in the page_url fields into corresponding traffic-source data fields. For example, map the value of utm_source to traffic_source_source field.
3. (For web only) If the source dimension are still blank after above steps, data processing module will check if there is value in page_view_latest_referrer field, and look up source value from the Source Category mapping table ([learn more](#source-category-mapping-table)) based on the domain of the referrer, if no source is matched, it will use the top-level domain name as the value of the traffic_source_source dimension.

### Step 2 - Derive source category
Data processing module uses a Source Category mapping table ([learn more](#source-category-mapping-table)) to classify the source into different categories (i.e., search, shopping, video, social). For example, source with values of "google" or "bing" will be classified into Search category.

### Step 3 - Derive channel group
Data processing module uses a set of predefined rules ([learn more](#channel-group-definitions-and-rules)) to categorize the traffics into different groups (e.g., direct, paid search, organic search) based on the key traffic-source dimensions (mainly the source. medium, and campaign). 

### Step 4 - Populate traffic source dimensions for user and session tables
While process the traffic-source for each events, the data processing module populate traffic source dimension for each user and session.

1. User: If there are traffic-source data in the first meaningful events (e.g., first_open, page_view, app_start, app_end) for the first time user visit your website or apps, those traffic-source dimension will be assigned to corresponding user traffic-source attributes, i.e., first_traffic_source, first_traffic_medium.
2. Session: When user initiate a new session, the data processing module derives traffic-source dimension for the session from the traffic-source dimensions of the first meaningful events in the session (e.g., first_open, page_view, app_start, app_end).

## Configurations
{{ solution_name }} allows you to configure the channel group rules and source category mapping to customize the traffic source processing to meet your analytics needs.

### Channel group definitions and rules
Below are the default channel groups and the rules that the solution uses to categorize the traffics. 

| Order | Channel                  | Description                  | Evaluation Rules      |
|-------|------------|:--------------------------|:--------------------------------|
| 1     | Direct                   | Direct is the channel by which users arrive at your site/app via a saved link or by entering your URL.| 1. traffic_source_category, traffic_source_source,traffic_source_medium,traffic_source_campaign,traffic_source_content,traffic_source_term/\,traffic_source_campaign_id,traffic_source_clid are all blank/(not set), (none) <br> AND <br> 2. latest_referrer is blank  |
| 2     | Paid Search  | Paid Search is the channel by which users arrive at your site/app via ads on search-engine sites like Bing, Baidu, or Google.    | 1. traffic_source_category is Search <br> AND <br> (2. traffic_source_medium matches regex ^(.*cp.*\|ppc\|retargeting\|paid.*)$ <br> OR clid is not none/blank). |
| 3     | Organic Search | Organic Search is the channel by which users arrive at your site/app via non-ad links in organic-search results.  | 1. traffic_source_category is Search <br> AND <br> (2. medium is blank or none or exactly matches organic).    |
| 4     | Paid Social  | Paid Social is the channel by which users arrive at your site/app via ads on social sites like Facebook and Twitter.  | 1. traffic_source_category is Social <br> AND <br> 2. traffic_source_medium matches regex ^(.*cp.*\|ppc\|retargeting\|paid.*)$ <br> OR clid is not none/blank.  |
| 5     | Organic Social  | Organic Social is the channel by which users arrive at your site/app via non-ad links on social sites like Facebook or Twitter.            | 1. traffic_source_category is Social <br> OR <br> 2. traffic_source_medium is one of ("social", "social-network", "social-media", "sm", "social network", "social media")  |
| 6     | Paid Video  | Paid Video is the channel by which users arrive at your site/app via ads on video sites like TikTok, Vimeo, and YouTube.  | 1. traffic_source_category is Video (i.e., traffic_source_source OR latest_referrer_host matches a list of video sites ) <br> AND <br> (2. traffic_source_medium matches regex ^(.*cp.*\|ppc\|retargeting\|paid.*)$ <br> OR clid is not none/blank).   |
| 7     | Organic Video   | Organic Video is the channel by which users arrive at your site/app via non-ad links on video sites like YouTube, TikTok, or Vimeo. | 1. traffic_source_category is Video <br> OR <br> 2. traffic_source_medium matches regex ^(.*video.*)$. |
| 8     | Paid Shopping   | Paid Shopping is the channel by which users arrive at your site/app via paid ads on shopping sites like Amazon or ebay or on individual retailer sites. | 1. traffic_source_category is Shopping <br> AND <br> (2. traffic_source_medium matches regex ^(.*cp.*\|ppc\|retargeting\|paid.*)$ <br> OR clid is not none/blank <br> OR traffic_source_campaign matches regex ^(.*(([\^a-df-z]\|^)shop\|shopping).*)$). |
| 9     | Organic Shopping  | Organic Shopping is the channel by which users arrive at your site/app via non-ad links on shopping sites like Amazon or ebay. | 1. traffic_source_category is Shopping <br> OR <br> 2. traffic_source_campaign matches regex ^(.*(([\^a-df-z]\|^)shop\|shopping).*)$ . |
| 10    | Paid Other| Paid Other is the channel by which users arrive at your site/app via ads, but not through an ad identified as Search, Social, Shopping, or Video. | 1. traffic_source_category is none <br> AND <br> 2. traffic_source_medium matches regex ^(.*cp.*\|ppc\|retargeting\|paid.*)$.|
| 11    | Email | Email is the channel by which users arrive at your site/app via links in email.  | 1. traffic_source_source contains "mail" <br> OR <br> 2. traffic_source_medium contains "mail" <br> OR <br> 3. latest_referrer_host start with "mail". |
| 12    | SMS   | SMS is the channel by which users arrive at your site/app via links from text messages.  | 1. traffic_source_source exactly matches sms <br> OR <br> 2. traffic_source_medium exactly matches "sms" . |
| 13    | Audio  | Audio is the channel by which users arrive at your site/app via ads on audio platforms (e.g., podcast platforms).   | 1.traffic_source_medium exactly matches audio |
| 14    | Mobile Push Notifications | Mobile Push Notifications is the channel by which users arrive at your site/app via links in mobile-device messages when they're not actively using the app. | 1. traffic_source_medium ends with "push" <br> OR <br> 2.traffic_source_medium contains "mobile" or "notification"  . |
| 15    | Referral | Referral is the channel by which users arrive at your site via non-ad links on other sites/apps (e.g., blogs, news sites).  | 1. latest_referrer is not none AND traffic_source_category is none <br> AND <br> 2. latest referrer_host is not Internal Domain . |
| 16    | Internal   | Traffic from specified internal domain  | 1. latest_referrer_host is one of the Internal domains .|
| 17    | Unassigned               | Traffic that can not be assigned to a channel group  | All others           |


To create and edit channel group, go to the Data Management > Traffic Source tab > Channel group.

1. Create a new group. 
    - Click on the `Add new group` button.
    - Fill in the `Group name`, `Description`, and `Condition`.
    - Click on `Reorder`, adjust the evaluation sequence to by clicking on the Upper arrow or Down arrow, then click the Apply.
2. Edit a channel group
    - Select a channel group
    - Click the action button, and select `View details`
    - Update the channel group then click on `Confirm`.
    - Click on the `Reorder` 
    - Adjust the sequence of the channel group by clicking on the Upper arrow and Down arrow.
    - Click `Apply` to save the order.


### Source category mapping table
{{ solution_name }} uses a source category mapping table to classify some known sources into the categories of Search, Social, Shopping, and Video. You can also add Internal category for the traffic source coming from internal source. Below are the description for the columns in the mapping table.

|Column | Description| Example|
|------|---------------|---------|
|Domain| The host name of the referral URL.| google.com, baidu.com|
|Source name| The name for the traffic source. | google, baidu | 
|Category| Category for the source.| Search, Shopping, Social, Video, and Internal|
|Keyword pattern| The keyword parameter name in the referral url, only for Search domain. | q, query, keyword|

To create and edit source category, go to the Data Management > Traffic Source tab > Source category.

1. Create a new category. 
    - Click on the `Add new category` button. Or you can select an existing category, then click on Action>`Copy to new `.
    - Fill in the `Domain`, `Source name`, and `Category`.
    - If it is `Search`, fill in keyword pattern, you can add multiple.
    - Click on `Confirm `.
2. Edit a category record
    - Select a category record
    - Click the action button, and select `View details`
    - Update the record then click on `Confirm`.
