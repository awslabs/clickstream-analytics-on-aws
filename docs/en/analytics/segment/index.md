# Segments
A segment is a subset of your users. For example, of your entire set of users, one segment might be users who come from a same traffic source. Another segment might be users who trigger certain events, for example, made a purchase.

## Access Segments
To access Segments, follow below steps:

1. Go to **Clickstream Analytics on AWS Console**, in the **Navigation Bar**, click on "**Analytics Studio**", a new tab will be opened in your browser.
2. In the Analytics Studio page, click the **Segments** icon in the left navigation panel.

## Create a segment
1. Click on **Create Segment +** button
2. Input **Segment name** and **Description**
3. Specify a **Refresh method**
    - Manual - Segment will be refreshed when user manually triggers refresh
    - Automatic - Segment will be refreshed periodically. You can configure interval (e.g., Daily, Weekly, Monthly) and timing (e.g., 8AM). 
4. Specify **Expirations settings**. If you specified Automatically as refresh method, you will need to set an expiration date for a segment after which the segment will stop auto refresh.
5. Define the segment by adding **Filter group**.
    - You can have multiple filter groups, you can provide a short description for each filter group. Click **+ Filter group** to add filter group.
    - Specify time range for your filter group, you can choose relative date range or absolute date range.
    - Set up filter by selecting filter type, specifying filter scope,  comparison operator, and then provide a value or range of values. For example, to filter users who had made two purchases, you would add a filter and select `User has done` as filter type, `purchase` as event and `Total number(PV)` as filter scope,  `=` as comparison operator, `2` a value.
    - Within a filter group, filters can be evaluated with `AND` or `OR` logic, Click on **And** or **+OR** to add filter per your need. 
6. Click **Save**.

## View segment details
1. Select a segment, click on the segment name or click on **Actions>View Details**.
2. In the segment details page, you can view the segment settings, user number, and percentage of total user, segment history, and user samples.
3. You can download the user list of a segment as a csv file by click on the **Export** button per each run history.

## Filters
Below table describes the available filters to create a segment.

|Filter type | Description |Filter scope| Comparison operator | 
|----------|--------------------|------------------|-------------------|
|**User has done**| Select users had done certain event.| <li>Total number: total number of the selected event occurred </li> <li>Number of times per day: The total number of times this event occurred per day </li> <li>Number of consecutive days: The number of consecutive days this event occurred </li> <li>Distribution of days: The number of days on which users triggered this event </li> <li> Sum/Max/Min/Average/Distinct count by numerical event attributes</li>|<li>=</li><li>!=</li><li>></li><li><</li> <li>>=</li><li><=</li><li>>=</li><li>between</li>|
|**User has not done**| Select users had NOT done certain event.| <li>Total number: total number of the selected event occurred </li> <li>Number of times per day: The total number of times this event occurred per day </li> <li>Number of consecutive days: The number of consecutive days this event occurred </li> <li>Distribution of days: The number of days on which users triggered this event </li> <li> Sum/Max/Min/Average/Distinct count by numerical event attributes</li>|<li>=</li><li>!=</li><li>></li><li><</li> <li>>=</li><li><=</li><li>>=</li><li>between</li>|
|**User has done in sequence**| Specify an event behavior sequence. Users will only be selected if they trigger these events in the specified order.| <li>Within a session: user must done the selected events within a session </li> <li>Across sessions: user has done the selected events in one or multiple sessions</li> <li>Directly followed: The next event needs to be immediately after the previous one</li> <li> Indirectly followed: There can be other events between the specified step sequence</li>||
|**User is**/**User is not**|Select users by user attributes.| User attributes|<li>is null</li><li>is not null</li><li>=</li><li>!=</li> <li>in</li><li>not in</li><li>contains</li><li>not contains</li> |
|**User in segment/User not in segment**| Select users based on whether user belong to a segment or not.| Segments||
