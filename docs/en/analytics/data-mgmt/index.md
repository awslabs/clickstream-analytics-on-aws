# Data management 
The Data Management module automatically scans the data in your clickstream to generate metadata, making it convenient for you to view and manage all events, event properties, and user properties. You can also modify the display names, descriptions, and data dictionaries of events and properties, making it easy for you to use them in the Exploration Analysis module.

## Accessing Data Management
To access Explorations, follow below steps:

1. Go to **Clickstream Analytics on AWS Console**, in the **Navigation Bar**, click on "**Analytics Studio**", a new tab will be opened in your browser.
2. In the Analytics Studio page, click the **Data Management** icon in the left navigation panel.

!!! note "Note"

    Only the user with `Administrator` or `Analyst` role can modify the metadata, such as display name, description.


## How it works
The solution automatically scans clickstream data to generate metadata and then stored them in Redshift on a daily basis. There are three type of metadata:

1. **Event**: metadata describes clickstream events, which are stored in `event_metadata` table in Redshift.
2. **Event Parameter**: metadata describes clickstream event parameters, which are stored in `event_parameter_metadata` table in Redshift.
3. **User Attribute**: metadata describes user attributes, which are stored in `user_attribute_metadata` table in Redshift.

## Metadata dimensions
Below tables list all the dimensions included in each type of the metadata.

### Event 
| Dimension name | What it is |
|-------------|------------|
| Event name | The name of the event reported from SDK |
| Display name | The display name of the event. By default, it is the same as Event name, user can customize the display name. |
| Description | The description name of the event reported from SDK. User can customize the display name. For the event automatically collected by the clickstream SDK, the solution has pre-populated description |
| Source | Describe how the event was collected, `Preset` indicates the event is automatically collected by SDK, `Custom` indicates the event is defined and collected by app owner |
| Platform | Describe which platform the event was collected from, i.e., from Android, Web or iOS  |
| Data volume last day | Describe how much data was collected in last day (in UTC timezone) |
| SDK version | Describe the version of the SDK that collected the event |
| Associate preset parameters | The preset event parameters associated with the event |
| Associate custom parameters | The custom event parameters associated with the event |

### Event Parameters
| Dimension name | What it is |
|-------------|------------|
| Parameter name | The name of the event event parameter reported from SDK |
| Display name | The display name of the event parameter. By default, it is the same as Parameter name, user can customize the display name. |
| Description | The description name of the event parameter reported from SDK. User can customize the display name. For the event automatically collected by the clickstream SDK, the solution has pre-populated description |
| Source | Describe how the event parameter was collected, `Preset` indicates the event parameter is automatically collected by SDK, `Custom` indicates the event parameter is defined and collected by app owner |
| Data type | Describe the data type of the event parameter value, e.g., int, string,  |
| Associate event | The event that the event parameters associated with. |
| Dictionary| The unique value for the event parameters, user can customize the display value. |


### User Attribute
| Dimension name | What it is |
|-------------|------------|
| Attribute name | The name of the user attribute reported from SDK |
| Display name | The display name of the user attribute. By default, it is the same as Attribute name, user can customize the display name. |
| Description | The description name of the user attribute reported from SDK. User can customize the display name. For the user attribute automatically collected by the clickstream SDK, the solution has pre-populated description |
| Source | Describe how the event parameter was collected, `Preset` indicates the user attribute is automatically collected by SDK, `Custom` indicates the user attribute is defined and collected by app owner |
| Data type | Describe the data type of the user attribute value, e.g., int, string,  |


## Update event display name and description

1. Click on the **Events** page, select any event, e.g., `view_item`.
2. Click on the column labeled **Display Name**, enter a name, such as `View Product Details`, and then click confirm.
3. Go back to Exploration, and in the filter dropdown, you can see `view_item` now displayed as `View Product Details`.

Follow the same steps to update display name and description for Event Parameters and User Attributes.

## Customize data dictionary for Event Parameter values

1. Click on the **Event Properties** page, and in the search box, select an event parameter, such as `_entrances`.
2. The detailed information for the property should open automatically, choose the **Dictionary** page.
3. Click on the column labeled **Display Value**, enter a new value, such as `Non-First Entry` for `0`, and enter `First Entry` for `1`, then click confirm.
4. Go back to Exploration, and in the filter dropdown, you can see `_entrances` displayed as `Non-First Entry` and `First Entry`.

Follow the same steps to customize data dictionary for User Attributes values.

## Trigger the workflow to scan metadata manually
You can choose **Scan metadata** at the top right corner of the page to start a workflow to scan the past seven days metadata of the current app.