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


package com.example.clickstream.transformer.v2;

import com.example.clickstream.transformer.v2.model.AttributeTypeValue;
import com.example.clickstream.transformer.v2.model.Event;
import com.example.clickstream.transformer.v2.model.EventParameter;
import com.example.clickstream.transformer.v2.model.Item;
import com.example.clickstream.transformer.v2.model.User;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.extern.slf4j.Slf4j;
import org.apache.spark.sql.Dataset;
import org.apache.spark.sql.Row;
import org.apache.spark.sql.api.java.UDF3;
import org.apache.spark.sql.catalyst.expressions.GenericRow;
import org.apache.spark.sql.expressions.UserDefinedFunction;
import org.apache.spark.sql.types.DataTypes;
import org.apache.spark.sql.types.StructField;

import java.util.ArrayList;
import java.util.Iterator;
import java.util.List;

import static org.apache.spark.sql.functions.col;
import static org.apache.spark.sql.functions.udf;


@Slf4j
public class TransformerUdf {
    public static UDF3<String, Long, String, Row[]> convertData() {
        return (String value, Long ingestTimestamp, String ip) -> {
            try {
                return getGenericRows(value, ingestTimestamp, ip);
            } catch (Exception e) {
                log.error("cannot convert data: " + value + ", error: " + e.getMessage());
                return null;
            }
        };
    }

    private static Row[] getGenericRows(final String jsonString, final Long ingestTimestamp, final String ip) throws JsonProcessingException {
        List<Row> rows = new ArrayList<>();

        ObjectMapper objectMapper = new ObjectMapper();
        JsonNode jsonNode = objectMapper.readTree(jsonString);
        int index = 0;
        if (jsonNode.isArray()) {
            for (Iterator<JsonNode> elementsIt = jsonNode.elements(); elementsIt.hasNext(); ) {
                rows.add(getGenericRow(elementsIt.next(), ingestTimestamp, ip, index));
                index++;
            }
        } else {
            rows.add(getGenericRow(jsonNode, ingestTimestamp, ip, index));
        }
        return rows.toArray(new Row[0]);
    }

    private static Row getGenericRow(final JsonNode jsonNode, final Long ingestTimestamp, final String ip, final int index) {

        com.example.clickstream.transformer.v2.RowResult result = parseJsonNode(jsonNode, ingestTimestamp, ip, index);

        Event event = result.getEvent();
        List<EventParameter> eventParameters = result.getEventParameters();
        User user = result.getUser();
        List<Item> items = result.getItems();

        // eventRow
        GenericRow eventRow = getEventGenericRow(event);

        // eventParameterRow
        GenericRow[] eventParametersRow = eventParameters.stream().map(e -> new GenericRow(new Object[]{
                        e.getAppId(),
                        e.getEventTimestamp(),
                        e.getEventId(),
                        e.getEventName(),
                        e.getEventParamKey(),
                        e.getEventParamDoubleValue(),
                        e.getEventParamFloatValue(),
                        e.getEventParamIntValue(),
                        e.getEventParamStringValue()
                })
        ).toArray(GenericRow[]::new);

        // userRow
        GenericRow userRow = getUserGenericRow(user);

        // itemsRow
        GenericRow[] itemsRow = items.stream().map(it -> new GenericRow(new Object[]{
                it.getAppId(),
                it.getEventTimestamp(),
                it.getId(),
                getItemPropList(it)
        })).toArray(GenericRow[]::new);

        return new GenericRow(new Object[]{
                eventRow,
                eventParametersRow,
                itemsRow,
                userRow
        });
    }

    private static GenericRow getUserGenericRow(final User user) {
        GenericRow[] userPropertiesRow = user.getUserProperties().stream().map(u -> new GenericRow(new Object[]{
                u.getKey(),
                new GenericRow(new Object[]{
                        u.getValue().getDoubleValue(),
                        u.getValue().getFloatValue(),
                        u.getValue().getIntValue(),
                        u.getValue().getStringValue(),
                        u.getValue().getSetTimestampMicros()
                })

        })).toArray(GenericRow[]::new);

        GenericRow userLtvRow = null;
        if (user.getUserLtv() != null) {
            userLtvRow = new GenericRow(new Object[]{
                    user.getUserLtv().getRevenue(),
                    user.getUserLtv().getCurrency(),
            });
        }

        String[] deviceIds = new String[]{};
        if (user.getDeviceIdList() != null) {
            deviceIds = user.getDeviceIdList().toArray(new String[0]);
        }

        return new GenericRow(new Object[]{
                user.getAppId(),
                user.getEventTimestamp(),
                user.getUserId(),
                user.getUserPseudoId(),
                user.getUserFirstTouchTimestamp(),
                userPropertiesRow,
                userLtvRow,
                user.getFirstReferer(),
                user.getFirstTrafficSourceType(),
                user.getFirstTrafficMedium(),
                user.getFirstTrafficSource(),
                deviceIds,
                user.getChannel()
        });
    }


    private static GenericRow getEventGenericRow(final Event event) {
        Event.Device eventDevice = event.getDevice();
        GenericRow eventDeviceRow = null;
        if (eventDevice != null) {
            eventDeviceRow = new GenericRow(new Object[]{
                    eventDevice.getMobileBrandName(),
                    eventDevice.getMobileModelName(),
                    eventDevice.getManufacturer(),
                    eventDevice.getScreenWidth(),
                    eventDevice.getScreenHeight(),
                    eventDevice.getCarrier(),
                    eventDevice.getNetworkType(),
                    eventDevice.getOperatingSystemVersion(),
                    eventDevice.getOperatingSystem(),
                    eventDevice.getUaBrowser(),
                    eventDevice.getUaBrowserVersion(),
                    eventDevice.getUaOs(),
                    eventDevice.getUaOsVersion(),
                    eventDevice.getUaDevice(),
                    eventDevice.getUaDeviceCategory(),
                    eventDevice.getSystemLanguage(),
                    eventDevice.getTimeZoneOffsetSeconds(),
                    eventDevice.getVendorId(),
                    eventDevice.getAdvertisingId(),
                    eventDevice.getHostName(),
                    eventDevice.getViewportWidth(),
                    eventDevice.getViewportHeight()
            });
        }

        Event.Geo eventGeo = event.getGeo();
        GenericRow geoRow = null;
        if (eventGeo != null) {
            geoRow = new GenericRow(new Object[]{
                    eventGeo.getCountry(),
                    eventGeo.getContinent(),
                    eventGeo.getSubContinent(),
                    eventGeo.getLocale(),
                    eventGeo.getRegion(),
                    eventGeo.getMetro(),
                    eventGeo.getCity()
            });
        }

        GenericRow trafficSourceRow = null;
        if (event.getTrafficSource() != null) {
            trafficSourceRow = new GenericRow(new Object[]{
                    event.getTrafficSource().getMedium(),
                    event.getTrafficSource().getName(),
                    event.getTrafficSource().getSource()
            });
        }

        Event.AppInfo appInfo = event.getAppInfo();
        GenericRow appInfoRow = null;
        if (appInfo != null) {
            appInfoRow = new GenericRow(new Object[]{
                    appInfo.getAppId(),
                    appInfo.getId(),
                    appInfo.getInstallSource(),
                    appInfo.getVersion(),
                    appInfo.getSdkVersion(),
                    appInfo.getSdkName()
            });
        }

        GenericRow geoForEnrichRow = new GenericRow(new Object[]{
                event.getGeoForEnrich().getIp(),
                event.getGeoForEnrich().getLocale()
        });

        GenericRow[] eventItems = event.getEventItems().stream().map(
                item -> new GenericRow(new Object[]{
                        item.getId(),
                        item.getQuantity(),
                        item.getPrice(),
                        item.getCurrency(),
                        item.getCreativeName(),
                        item.getCreativeSlot()
                })
        ).toArray(GenericRow[]::new);

        return new GenericRow(new Object[]{
                event.getEventId(),
                event.getEventTimestamp(),
                event.getEventPreviousTimestamp(),
                event.getEventName(),
                event.getEventValueInUsd(),
                event.getEventBundleSequenceId(),
                event.getIngestTimestamp(),
                eventDeviceRow,
                geoRow,
                trafficSourceRow,
                appInfoRow,
                event.getPlatform(),
                event.getProjectId(),
                eventItems,
                event.getUserPseudoId(),
                event.getUserId(),
                event.getUa(),
                geoForEnrichRow
        });
    }

    private static GenericRow[] getItemPropList(final Item it) {
        if (it.getProperties() == null) {
            return new GenericRow[]{};
        }
        return it.getProperties().stream().map(p -> new GenericRow(new Object[]{
                p.getKey(),
                new GenericRow(new Object[]{
                        p.getValue().getDoubleValue(),
                        p.getValue().getFloatValue(),
                        p.getValue().getIntValue(),
                        p.getValue().getStringValue()
                })

        })).toArray(GenericRow[]::new);
    }


    private static RowResult parseJsonNode(final JsonNode jsonNode, final Long ingestTimestamp, final String ip, final int index) {
        log.info("parseJsonNode index: " + index);

        String projectId = System.getProperty("project.id");

        Result1 result1 = getResultFromJson(jsonNode);

        Event event = result1.event;
        List<EventParameter> eventParameters = result1.eventParameters;
        User user = result1.user;
        List<ItemResult> itemResults = result1.itemResults;

        event.getGeoForEnrich().setIp(ip);
        event.setIngestTimestamp(ingestTimestamp);
        event.setProjectId(projectId);

        eventParameters.forEach(eventParameter -> {
            eventParameter.setAppId(event.getAppInfo().getAppId());
            eventParameter.setEventTimestamp(event.getEventTimestamp());
            eventParameter.setEventId(event.getEventId());
            eventParameter.setEventName(event.getEventName());
        });

        user.setAppId(event.getAppInfo().getAppId());
        user.setEventTimestamp(event.getEventTimestamp());
        user.setUserId(event.getUserId());
        user.setUserPseudoId(event.getUserPseudoId());

        List<Event.EventItem> eventItems = new ArrayList<>();
        event.setEventItems(eventItems);
        List<Item> items = new ArrayList<>();

        itemResults.forEach(r -> {
                    Item item = r.getItem();
                    Event.EventItem eventItem = r.getEventItem();

                    item.setAppId(event.getEventId());
                    item.setEventTimestamp(event.getEventTimestamp());

                    items.add(item);
                    eventItems.add(eventItem);

                }
        );
        RowResult rowResult = new RowResult();
        rowResult.setEvent(event);
        rowResult.setEventParameters(result1.eventParameters);
        rowResult.setUser(result1.user);
        rowResult.setItems(items);

        return rowResult;
    }


    private static Result1 getResultFromJson(final JsonNode jsonNode) {
        Event event = new Event();

        Event.TrafficSource trafficSource = new Event.TrafficSource();
        event.setTrafficSource(trafficSource);

        Event.Device device = new Event.Device();
        event.setDevice(device);

        Event.Geo geo = new Event.Geo();
        event.setGeo(geo);

        Event.GeoForEnrich geoForEnrich = new Event.GeoForEnrich();
        event.setGeoForEnrich(geoForEnrich);

        Event.AppInfo appInfo = new Event.AppInfo();
        event.setAppInfo(appInfo);

        List<ItemResult> itemResults = new ArrayList<>();
        List<EventParameter> eventParameters = new ArrayList<>();
        User user = new User();

        for (Iterator<String> it = jsonNode.fieldNames(); it.hasNext(); ) {
            String attrName = it.next();
            JsonNode attrValue = jsonNode.get(attrName);
            switch (attrName) {
                case "event_id": {
                    event.setEventId(attrValue.asText());
                    break;
                }
                case "timestamp": {
                    event.setEventTimestamp(attrValue.asLong());
                    user.setEventTimestamp(attrValue.asLong());
                    break;
                }
                case "event_previous_timestamp": {
                    event.setEventPreviousTimestamp(attrValue.asLong());
                    break;
                }
                case "event_name": {
                    event.setEventName(attrValue.asText());
                    break;
                }
                case "event_value_in_usd": {
                    event.setEventValueInUsd(attrValue.asDouble());
                    break;
                }
                case "event_bundle_sequence_id": {
                    event.setEventBundleSequenceId(attrValue.asLong());
                    break;
                }
                case "platform": {
                    event.setPlatform(attrValue.asText());
                    break;
                }
                case "unique_id": {
                    event.setUserPseudoId(attrValue.asText());
                    user.setUserPseudoId(attrValue.asText());
                    break;
                }
                case "user_id": {
                    event.setUserId(attrValue.asText());
                    user.setUserId(attrValue.asText());
                    break;
                }
                case "ua": {
                    event.setUa(attrValue.asText());
                    break;
                }
                case "locale": {
                    geoForEnrich.setLocale(attrValue.asText());
                    break;
                }

                case "attributes": {
                    appInfo.setInstallSource(attrValue.get("_channel").asText());
                    user.setChannel(attrValue.get("_channel").asText());

                    trafficSource.setSource(attrValue.get("_traffic_source_source").asText());
                    trafficSource.setMedium(attrValue.get("_traffic_source_medium").asText());
                    trafficSource.setName(attrValue.get("_traffic_source_name").asText());

                    eventParameters = parseEventParameter(attrValue);
                    break;
                }

                case "user": {
                    List<User.UserProperty> userProperties = parseUserProperties(attrValue);
                    user.setUserProperties(userProperties);
                    break;
                }
                case "items": {
                    itemResults = parseItems(attrValue);
                    break;
                }
                case "user_first_touch_timestamp": {
                    user.setUserFirstTouchTimestamp(attrValue.asLong());
                    break;
                }
                case "_first_referer": {
                    user.setFirstReferer(attrValue.asText());
                    break;
                }
                case "_first_traffic_source_type": {
                    user.setFirstTrafficSourceType(attrValue.asText());
                    break;
                }
                case "_first_traffic_medium": {
                    user.setFirstTrafficMedium(attrValue.asText());
                    break;
                }
                case "_first_traffic_source": {
                    user.setFirstTrafficSource(attrValue.asText());
                    break;
                }
                case "device_id_list": {
                    setDeviceList(user, attrValue);
                    break;
                }

                default: {
                    setAppInfoAndDeviceProp(appInfo, device, attrName, attrValue);
                }
            }
        }
        return new Result1(event, eventParameters, itemResults, user);
    }

    private static void setDeviceList(final User user, final JsonNode attrValue) {
        List<String> dlist = new ArrayList<>();
        if (attrValue.isArray()) {
            for (Iterator<JsonNode> iterator = attrValue.elements(); iterator.hasNext(); ) {
                dlist.add(iterator.next().asText());
            }
        } else {
            dlist.add(attrValue.asText());
        }
        user.setDeviceIdList(dlist);
    }

    private static void setAppInfoAndDeviceProp(final Event.AppInfo appInfo, final Event.Device device, final String attrName, final JsonNode attrValue) {
        switch (attrName) {
            case "app_id": {
                appInfo.setAppId(attrValue.asText());
                break;
            }
            case "app_package_name": {
                appInfo.setId(attrValue.asText());
                break;
            }
            case "app_version": {
                appInfo.setVersion(attrValue.asText());
                break;
            }
            case "sdk_version": {
                appInfo.setSdkVersion(attrValue.asText());
                break;
            }
            case "sdk_name": {
                appInfo.setSdkName(attrValue.asText());
                break;
            }

            case "brand": {
                device.setMobileBrandName(attrValue.asText());
                break;
            }
            case "model": {
                device.setMobileModelName(attrValue.asText());
                break;
            }
            case "make": {
                device.setManufacturer(attrValue.asText());
                break;
            }
            case "screen_height": {
                device.setScreenHeight(attrValue.asLong());
                break;
            }
            case "screen_width": {
                device.setScreenWidth(attrValue.asLong());
                break;
            }
            case "carrier": {
                device.setCarrier(attrValue.asText());
                break;
            }
            case "network_type": {
                device.setNetworkType(attrValue.asText());
                break;
            }
            case "os_version": {
                device.setOperatingSystemVersion(attrValue.asText());
                break;
            }
            case "operating_system": {
                device.setOperatingSystem(attrValue.asText());
                break;
            }
            case "system_language": {
                device.setSystemLanguage(attrValue.asText());
                break;
            }
            case "zone_offset": {
                device.setTimeZoneOffsetSeconds(attrValue.asLong());
                break;
            }
            case "device_id": {
                device.setVendorId(attrValue.asText());
                break;
            }
            case "device_unique_id": {
                device.setAdvertisingId(attrValue.asText());
                break;
            }
            case "host_name": {
                device.setHostName(attrValue.asText());
                break;
            }
            case "viewport_width": {
                device.setViewportWidth(attrValue.asLong());
                break;
            }
            case "viewport_height": {
                device.setViewportHeight(attrValue.asLong());
                break;
            }
            default: {
                log.info("no mapping for attrName:" + attrName + ", attrValue:" + attrValue.toString());
            }
        }
    }

    private static List<EventParameter> parseEventParameter(final JsonNode attrValue) {
        List<EventParameter> paramList = new ArrayList<>();
        if (!attrValue.isObject()) {
            return paramList;
        }
        for (Iterator<String> propNames = attrValue.fieldNames(); propNames.hasNext(); ) {
            String propName = propNames.next();
            JsonNode propValue = attrValue.get(propName);
            AttributeTypeValue value = AttributeTypeValue.fromValue(propValue);

            EventParameter eventParameter = new EventParameter();
            eventParameter.setEventParamKey(propName);
            eventParameter.setEventParamDoubleValue(value.getDoubleValue());
            eventParameter.setEventParamFloatValue(value.getFloatValue());
            eventParameter.setEventParamIntValue(value.getIntValue());
            eventParameter.setEventParamStringValue(value.getStringValue());

            paramList.add(eventParameter);
        }
        return paramList;

    }

    private static List<ItemResult> parseItems(final JsonNode itemsValue) {
        List<ItemResult> items = new ArrayList<>();
        if (itemsValue.isArray()) {
            for (Iterator<JsonNode> it = itemsValue.elements(); it.hasNext(); ) {
                items.add(parseItem(it.next()));
            }
        } else {
            items.add(parseItem(itemsValue));
        }
        return items;
    }

    private static ItemResult parseItem(final JsonNode itemValue) {
        Item item = new Item();
        Event.EventItem eventItem = new Event.EventItem();
        if (!itemValue.isObject()) {
            return new ItemResult(item, eventItem);
        }

        List<Item.ItemProperty> itemProperties = new ArrayList<>();
        item.setProperties(itemProperties);
        for (Iterator<String> propNames = itemValue.fieldNames(); propNames.hasNext(); ) {
            String propName = propNames.next();
            JsonNode propValue = itemValue.get(propName);
            Item.ItemProperty itemProperty = new Item.ItemProperty();
            if ("id".equals(propName)) {
                item.setId(propValue.asText());
                eventItem.setId(propValue.asText());
            } else {
                itemProperties.add(itemProperty);
                itemProperty.setKey(propName);
                itemProperty.setValue(Item.ItemPropertyValue.fromValue(propValue));
                switch (propName) {
                    case "quantity": {
                        eventItem.setQuantity(propValue.asLong());
                        break;
                    }
                    case "price": {
                        eventItem.setPrice(propValue.asDouble());
                        break;
                    }
                    case "currency": {
                        eventItem.setCurrency(propValue.asText());
                        break;
                    }
                    case "creative_name": {
                        eventItem.setCreativeName(propValue.asText());
                        break;
                    }
                    case "creative_slot": {
                        eventItem.setCreativeSlot(propValue.asText());
                        break;
                    }
                    default: {
                        log.info("parseItem unmapped propName: " + propName);
                    }
                }

            }
        }
        return new ItemResult(item, eventItem);
    }

    public static List<User.UserProperty> parseUserProperties(final JsonNode userValue) {
        List<User.UserProperty> userProperties = new ArrayList<>();
        if (!userValue.isObject()) {
            return userProperties;
        }

        for (Iterator<String> propNames = userValue.fieldNames(); propNames.hasNext(); ) {
            String propName = propNames.next();
            JsonNode propValue = userValue.get(propName);

            User.UserProperty userProperty = new User.UserProperty();
            userProperty.setKey(propName);
            userProperty.setValue(User.UserPropertyValue.fromUserValue(propValue));
            userProperties.add(userProperty);
        }
        return userProperties;
    }

    private static class Result1 {
        public final Event event;
        public final List<ItemResult> itemResults;
        public final List<EventParameter> eventParameters;
        public final User user;

        Result1(final Event event, final List<EventParameter> eventParameters, final List<ItemResult> itemResults, final User user) {
            this.event = event;
            this.itemResults = itemResults;
            this.eventParameters = eventParameters;
            this.user = user;
        }
    }

    @AllArgsConstructor
    @Getter
    static class ItemResult {
        private Item item;
        private Event.EventItem eventItem;
    }

    public Dataset<Row> transform(final Dataset<Row> dataset) {

        UserDefinedFunction convertDataUdf = udf(convertData(), DataTypes.createArrayType(
                DataTypes.createStructType(
                        new StructField[]{
                                DataTypes.createStructField("event", ClickStreamDataTypes.EVENT_TYPE, true),
                                DataTypes.createStructField("event_parameters", DataTypes.createArrayType(ClickStreamDataTypes.EVENT_PARAMETER_TYPE), true),
                                DataTypes.createStructField("items", DataTypes.createArrayType(ClickStreamDataTypes.ITEM_TYPE), true),
                                DataTypes.createStructField("user", ClickStreamDataTypes.USER_TYPE, true),
                        }
                )));

        Dataset<Row> newDataset = dataset.withColumn("new_data", convertDataUdf.apply(col("data"), col("ingest_time"), col("ip")));
        log.info("newDataset count: " + newDataset.count());
        return newDataset;
    }

}
