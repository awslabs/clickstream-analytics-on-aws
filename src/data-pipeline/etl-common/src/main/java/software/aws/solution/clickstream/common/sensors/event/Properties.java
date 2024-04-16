/**
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * <p>
 * Licensed under the Apache License, Version 2.0 (the "License"). You may not use this file except in compliance
 * with the License. A copy of the License is located at
 * <p>
 * http://www.apache.org/licenses/LICENSE-2.0
 * <p>
 * or in the 'license' file accompanying this file. This file is distributed on an 'AS IS' BASIS, WITHOUT WARRANTIES
 * OR CONDITIONS OF ANY KIND, express or implied. See the License for the specific language governing permissions
 * and limitations under the License.
 */

package software.aws.solution.clickstream.common.sensors.event;

import com.fasterxml.jackson.annotation.JsonAnyGetter;
import com.fasterxml.jackson.annotation.JsonAnySetter;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Getter;
import lombok.Setter;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Getter
@Setter
public class Properties {

    private final Map<String, Object> unknownProperties = new HashMap<>();

    @JsonProperty("is_login_id")
    private boolean is_login_id;

    @JsonProperty("ip")
    private String ip;

    @JsonProperty("province")
    private String province;

    @JsonProperty("city")
    private String city;

    @JsonProperty("user_agent")
    private String user_agent;

    @JsonProperty("url")
    private String url;

    @JsonProperty("screen_name")
    private String screen_name;

    @JsonProperty("title")
    private String title;

    @JsonProperty("lib_method")
    private String lib_method;

    @JsonProperty("is_first_day")
    private boolean is_first_day;

    @JsonProperty("os")
    private String os;

    @JsonProperty("os_version")
    private String os_version;

    @JsonProperty("lib")
    private String lib;

    @JsonProperty("manufacturer")
    private String manufacturer;

    @JsonProperty("model")
    private String model;

    @JsonProperty("brand")
    private String brand;

    @JsonProperty("app_version")
    private String app_version;

    @JsonProperty("screen_width")
    private int screen_width;

    @JsonProperty("screen_height")
    private int screen_height;

    @JsonProperty("carrier")
    private String carrier;

    @JsonProperty("timezone_offset")
    private int timezone_offset;

    @JsonProperty("app_id")
    private String app_id;

    @JsonProperty("app_name")
    private String app_name;

    @JsonProperty("wifi")
    private boolean wifi;

    @JsonProperty("network_type")
    private String network_type;

    @JsonProperty("lib_plugin_version")
    private List<String> lib_plugin_version;

    @JsonProperty("device_id")
    private String device_id;

    @JsonProperty("x_test_user")
    private String x_test_user;

    @JsonProperty("product_id")
    private int product_id;

    @JsonProperty("product_name")
    private String product_name;

    @JsonProperty("product_classify")
    private String product_classify;

    @JsonProperty("product_price")
    private double product_price;

    @JsonProperty("item_price")
    private double item_price;

    @JsonProperty("event_duration")
    private long event_duration;

    @JsonProperty("referrer")
    private String referrer;

    @JsonProperty("referrer_title")
    private String referrer_title;

    @JsonProperty("resume_from_background")
    private boolean resume_from_background;

    @JsonProperty("is_first_time")
    private boolean is_first_time;

    @JsonProperty("age")
    private int age;

    @JsonProperty("name")
    private String name;

    @JsonProperty("user_id")
    private String user_id;

    @JsonProperty("user_name")
    private String user_name;

    @JsonProperty("browser")
    private String browser;

    @JsonProperty("browser_language")
    private String browser_language;

    @JsonProperty("browser_version")
    private String browser_version;

    @JsonAnySetter
    public void setUnknownProperty(final String name, final Object value) {
        unknownProperties.put(name, value);
    }

    @JsonAnyGetter
    public Map<String, Object> getUnknownProperties() {
        return unknownProperties;
    }
}
