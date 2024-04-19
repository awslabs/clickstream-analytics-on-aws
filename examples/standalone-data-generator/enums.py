"""
Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.

Licensed under the Apache License, Version 2.0 (the "License"). You may not use this file except in compliance
with the License. A copy of the License is located at

    http://www.apache.org/licenses/LICENSE-2.0

or in the 'license' file accompanying this file. This file is distributed on an 'AS IS' BASIS, WITHOUT WARRANTIES
OR CONDITIONS OF ANY KIND, express or implied. See the License for the specific language governing permissions
and limitations under the License.
"""
import random

from weighted.weighted import WeightedArray


class Platform:
    Android = "Android"
    iOS = "iOS"
    Web = "Web"
    All = "All"


class Application:
    NotePad = "NotePad"
    Shopping = "Shopping"


class Feature:
    popular = "popular"
    featured = "featured"
    similar = "similar"
    search = "search"
    cart = "cart"
    category = "category"
    live = "live"


random_platform = WeightedArray([(Platform.Android, 35), (Platform.iOS, 45), (Platform.Web, 20)])

is_switch_to_web = WeightedArray([(True, 1), (False, 9)])

# visit time weight
visit_hour = WeightedArray([(0, 10), (1, 5), (2, 1), (3, 1), (4, 2), (5, 5),
                            (6, 8), (7, 10), (8, 15), (9, 20), (10, 25), (11, 20),
                            (12, 19), (13, 30), (14, 35), (15, 40), (16, 45), (17, 50),
                            (18, 55), (19, 60), (20, 105), (21, 50), (22, 30), (23, 20)])
visit_minutes = range(0, 59)

# Device enums
zone_offset = WeightedArray(
    [(28800000, 26.7), (18000000, 16.7), (-14400000, 6.7), (-25200000, 2.7), (-21600000, 3.7), (-28800000, 7),
     (3600000, 10.7), (7200000, 3.7)])
locale = WeightedArray(
    [(('en_US', 'United States', ("100.0.0.0", "100.42.19.255")), 16.7),
     (('zh_CN', 'China', ("1.24.0.0", "1.31.255.255")), 22.3),
     (('fr_FR', 'France', ("104.108.32.0", "104.108.63.255")), 6.87),
     (('es_ES', 'Spain', ("109.167.0.0", "109.167.127.255")), 5.3),
     (('de_DE', 'Germany', ("104.101.236.0", "104.102.23.255")), 4.8),
     (('pt_BR', 'Brazil', ("104.41.0.0", "104.41.63.255")), 4.0),
     (('ja_JP', 'Japan', ("1.112.0.0", "1.115.255.255")), 2.2),
     (('ko_KR', 'South Korea', ("1.208.0.0", "1.255.255.255")), 1.2),
     (('ru_RU', 'Russia', ("109.123.128.0", "109.123.191.255")), 0.8),
     (('ar_SA', 'Saudi Arabia', ("139.64.0.0", "139.64.127.255")), 0.6)])
sdk_version = WeightedArray([('0.2.0', 15), ('0.2.1', 20), ('0.3.0', 3), ('0.3.1', 5), ('0.4.0', 7),
                             ('0.5.0', 10), ('0.6.0', 12), ('0.6.1', 5), ('0.7.0', 20), ('0.7.1', 50)])

# App enums
carrier = WeightedArray(
    [('China Mobile', 26.7), ('Verizon', 22.3), ('China Unicom', 10.87), ('AT&T', 15.3), ('China Unicom', 14.8),
     ('China Telecom', 4.0), ('T-Mobile', 2.2), ('US Cellular', 1.2), ('CBN', 0.8), ('Cricket Wireless', 0.6),
     ('UNKNOWN', 1)])
network_type = WeightedArray([('Mobile', 46), ('WIFI', 53), ('UNKNOWN', 2)])
app_version = WeightedArray([('2.2.0', 2), ('2.3.0', 1), ('2.4.0', 3), ('2.5.0', 5), ('2.5.1', 7),
                             ('2.6.0', 10), ('2.7.0', 12), ('2.8.1', 5), ('2.9.0', 20), ('3.0.0', 50)])

# Android device enums
android_os_version = WeightedArray([('5', 1), ('6', 1), ('7', 2), ('8', 5), ('9', 7),
                                    ('10', 14), ('11', 18), ('12', 32), ('13', 20)])
android_brand = WeightedArray(
    [('Samsung', 26.7), ('Xiaomi', 12.3), ('Oppo', 6.87), ('Vivo', 5.3), ('Huawei', 4.8), ('Realme', 4.0),
     ('Motorola', 2.2), ('Oneplus', 1.2), ('Honor', 0.8), ('Meizu', 0.6)])
android_screens = WeightedArray(
    [((1080, 2160), 26.7), ((1080, 1920), 22.3), ((1440, 2560), 10.87), ((2160, 3840), 1.3), ((1080, 2340), 14.8),
     ((1080, 2316), 14.0), ((1080, 2400), 12.2), ((1440, 2960), 2.2), ((2160, 3840), 0.8), ((720, 1280), 5.6)])

# iOS device enums
ios_version = WeightedArray([('13', 1), ('14', 2), ('15', 10), ('16', 20), ('17', 5)])
ios_brand = "apple"
ios_screens = WeightedArray(
    [((750, 1334), 2.7), ((1080, 2340), 6.7), ((1242, 2688), 9.3), ((1170, 2532), 22.3), ((1284, 2778), 15.87)])
ios_model = WeightedArray(
    [('iPhone XR', 1.0), ('iPhone 11', 1.5), ('iPhone 11 Pro', 1.87),
     ('iPhone 11 Pro Max', 1.3), ('iPhone 12', 2.8), ('iPhone 12 mini', 2.0),
     ('iPhone 12 Pro', 2.8), ('iPhone 12 Pro Max', 3.2), ('iPhone 13', 4.8),
     ('iPhone 13 mini', 2.6), ('iPhone 13 Pro', 4.2), ('iPhone 13 Pro Max', 4.2), ('iPhone 14', 6.2),
     ('iPhone 14 Plus', 6.2), ('iPhone 14 Pro', 7.2), ('iPhone 14 Pro Max', 8.2), ('iPhone 15', 2.2),
     ('iPhone 15 Plus', 1.2), ('iPhone 15 Pro', 3.2), ('iPhone 15 Pro Max', 2.2)])

# Web browser enums
host_name = 'shopping.example.com'
browser_ua = WeightedArray([
    ('Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) '
     'AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Mobile Safari/537.36', 30),
    ('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Firefox/97.0', 5),
    ('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) '
     'AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Safari/605.1.15', 20),
    ('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)'
     ' Chrome/97.0.4692.71 Safari/537.36 OPR/97.0.4692.71', 2),
    ('Mozilla/5.0 (Windows NT 10.0; Win64; x64; Trident/7.0; AS; rv:11.0) like Gecko', 10),
    ('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)'
     ' Chrome/97.0.4692.71 Safari/537.36 Edg/97.0.1072.76', 8),
    ('Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)', 5)])

browser_make = WeightedArray([('Chrome', 30), ('Safari', 20), ('Firefox', 10), ('Opera', 2), ('Edge', 8), ('IE', 5)])
web_screens = WeightedArray(
    [((1080, 1920), 26.7), ((1600, 2560), 20.3), ((1920, 3072), 12.3), ((1440, 2560), 8.3), ((2160, 3840), 3.87),
     ((768, 1366), 1.3), ((900, 1600), 2.3)])
web_viewport = WeightedArray(
    [((980, 1920), 26.7), ((1500, 2560), 20.3), ((1820, 3072), 12.3), ((1340, 2560), 8.3), ((2060, 3840), 3.87),
     ((668, 1366), 1.3), ((800, 1600), 2.3)])

is_from_other_site = WeightedArray([(True, 30), (False, 0)])
utm_source = WeightedArray(
    [(('google', 'google_search'), 28), (('amazon', 'amazon_video_ads'), 20), (('facebook', 'facebook_newsfeed'), 13),
     (('twitter', 'twitter_timeline'), 10), (('linkedin', 'linkedin_profile'), 9),
     (('instagram', 'instagram_story'), 7), (('youtube', 'youtube_video'), 6), (('bing', 'bing_search'), 4),
     (('pinterest', 'pinterest_board'), 2), (('baidu', 'baidu_search'), 1)])

utm_medium = WeightedArray(
    [('cpc', 28), ('banner', 20), ('email', 15), ('social', 12), ('affiliate', 10), ('retargeting', 6),
     ('display', 4), ('native', 3), ('video', 1), ('sponsored', 1)])

utm_campaign = WeightedArray(
    [('summer_sale', 25), ('new_product_launch', 19), ('holiday_specials', 16), ('newsletter_signup', 13),
     ('brand_awareness', 10), ('black_friday_deals', 7), ('welcome_offer', 4), ('customer_loyalty_program', 3),
     ('webinar_promotion', 2), ('year_end_clearance', 1)])

utm_term = WeightedArray(
    [('consumer_analytics_software', 23), ('luxury_handbags', 18), ('online_certification_courses', 16),
     ('fitness_trackers', 13), ('sustainable_clothing', 11), ('smart_home_devices', 8), ('car_rental', 5),
     ('organic_coffee_beans', 3), ('travel_insurance', 2), ('vegan_snacks', 1)])

utm_content = WeightedArray(
    [('logo_link', 24), ('textlink', 17), ('cta_button', 15), ('banner_img', 13), ('sidebar_ad', 11),
     ('footer_link', 9), ('email_header', 5), ('video_ad', 3), ('text_ad', 2), ('product_image', 1)])

utm_id = WeightedArray(
    [('20786192103', 24), ('1000000234', 17), ('campaign_12345', 15), ('ad_56789', 13), ('promo_98765', 11),
     ('event_54321', 9), ('abc_123', 5), ('abcdefghij', 3), ('unique_id_001', 2), ('9988776655', 1)])


def get_latest_referrer():
    from_other_site = is_from_other_site.get_random_item()
    if from_other_site:
        random_utm_source = utm_source.get_random_item()
        referrer_host = random_utm_source[0] + ".com"
        referrer_url = "https://" + referrer_host + "?utm_id=" + utm_id.get_random_item() \
                       + "&utm_source=" + random_utm_source[0] \
                       + "&utm_source_platform=" + random_utm_source[1] \
                       + "&utm_medium=" + utm_medium.get_random_item() \
                       + "&utm_campaign=" + utm_campaign.get_random_item() \
                       + "&utm_term=" + utm_term.get_random_item() \
                       + "&utm_content=" + utm_content.get_random_item()
        return referrer_url, referrer_host
    else:
        return "", ""


def get_model_for_brand(brand):
    model = None
    if brand == 'Samsung':
        model = WeightedArray(
            [('Galaxy S23 Ultra', 16.7), ('Galaxy S23', 12.3), ('Galaxy Z Fold 4', 6.87),
             ('Galaxy Z Flip 4', 5.3), ('Galaxy S22+', 4.8), ('Galaxy S22', 4.0),
             ('Galaxy S21 Ultra', 2.2), ('Galaxy S20+', 1.2), ('Galaxy Note 10+', 0.8),
             ('Galaxy S10', 0.6)])
    elif brand == 'Xiaomi':
        model = WeightedArray(
            [('Redmi Note 12 Pro+ 5G', 16.7), ('Xiaomi 13 Pro', 12.3), ('Xiaomi 12 Pro', 6.87),
             ('Xiaomi 11T Pro', 5.3), ('Mi 11X Pro', 4.8), ('Mi 11 Ultra', 4.0),
             ('Mi 10', 2.2), ('Redmi K20 Pro', 1.2), ('RedmiNote 7 Pro', 0.8),
             ('Redmi Note 10', 0.6)])
    elif brand == 'Oppo':
        model = WeightedArray(
            [('Reno 8 Pro', 16.7), ('Reno 5 Pro 5G', 12.3), ('Oppo K3', 6.87),
             ('Reno 10x Zoom', 5.3), ('Reno 8', 4.8), ('Reno 7 5G', 4.0),
             ('Reno 6 Pro', 2.2), ('Reno 6', 1.2), ('Reno 4 Pro', 0.8),
             ('Oppo Reno 3 Pro', 0.6)])
    elif brand == 'Vivo':
        model = WeightedArray(
            [('Vivo X80 Pro', 16.7), ('Vivo X80', 12.3), ('Vivo X70 Pro+', 6.87),
             ('Vivo X60 Pro+', 5.3), ('Vivo X50 Pro', 4.8), ('Vivo V27 Pro', 4.0),
             ('Vivo V25 Pro', 2.2), ('Vivo T1', 1.2), ('Vivo V20 SE', 0.8),
             ('Vivo V20', 0.6)])
    elif brand == 'Huawei':
        model = WeightedArray(
            [('Huawei P60 Art', 16.7), ('Huawei P60 Pro', 12.3), ('Huawei P60', 6.87),
             ('Huawei Mate X3', 5.3), ('Nova 10 Youth Edition', 4.8), ('Huawei Pocket S', 4.0),
             ('Huawei Nova Y61', 2.2), ('Huawei Nova 10 SE', 1.2), ('Huawei Mate 50e', 0.8),
             ('Huawei Mate 50', 0.6)])
    elif brand == 'Realme':
        model = WeightedArray(
            [('Realme 10T 5G', 16.7), ('Realme C33 2023', 12.3), ('Realme C55', 6.87),
             ('Realme V23i', 5.3), ('Realme 10 Pro', 4.8), ('Realme 10 Pro+', 4.0),
             ('Realme 10 5G', 2.2), ('Realme 10 4G', 1.2), ('Realme C30s', 0.8),
             ('Realme C33', 0.6)])
    elif brand == 'Oneplus':
        model = WeightedArray(
            [('OnePlus Ace 2V', 16.7), ('OnePlus Ace 2', 12.3), ('OnePlus 11R', 6.87),
             ('OnePlus 11 5G', 5.3), ('OnePlus Nord N20 SE', 4.8), ('OnePlus Nord N300 5G', 4.0),
             ('OnePlus Ace Pro', 2.2), ('OnePlus Ace Pro', 1.2), ('OnePlus 9 Pro', 0.8),
             ('OnePlus 10 Pro', 0.6)])
    elif brand == 'Honor':
        model = WeightedArray(
            [('Honor Magic 5 Pro', 16.7), ('Honor Honor Magic Vs', 12.3), ('Honor Magic5 Ultimate', 6.87),
             ('Honor 70 Lite 5G', 5.3), ('Honor Magic 5', 4.8), ('Honor Magic 5 Lite', 4.0),
             ('Honor X9a', 2.2), ('Honor X40', 1.2), ('Honor 70 5G', 0.8),
             ('Honor X8 5G', 0.6)])
    elif brand == 'Motorola':
        model = WeightedArray(
            [('Motorola Edge 30 Pro', 16.7), ('Motorola Moto Z2 Force', 12.3), ('Motorola Moto X Force', 6.87),
             ('Moto E13', 5.3), ('Motorola Moto G72', 4.8), ('Moto G82 5G', 4.0),
             ('Motorola Edge 30', 2.2), ('Motorola Edge 20 Pro', 1.2), ('Motorola Moto G60', 0.8),
             ('Motorola Moto G9', 0.6)])
    elif brand == 'Meizu':
        model = WeightedArray(
            [('Meizu M16th', 16.7), ('Meizu m2', 12.3), ('Meizu M5', 6.87),
             ('Meizu 10', 5.3), ('Meizu 18X', 4.8), ('Meizu 18s Pro', 4.0),
             ('Meizu 18s', 2.2), ('Meizu 18 Pro', 1.2), ('Meizu 17', 0.8),
             ('Meizu 15', 0.6)])
    return model.get_random_item()


# event enum
class Category:
    BOOK = "books"
    TOOLS = "tools"
    FOOD_SERVICE = "food service"
    CODE_DISPENSED = "cold dispensed"
    BEAUTY = "beauty"
    FOOTWEAR = "footwear"
    OUTDOORS = "outdoors"
    JEWELRY = "jewelry"


product_category = WeightedArray(
    [(Category.BOOK, 5), (Category.TOOLS, 3), (Category.FOOD_SERVICE, 2), (Category.CODE_DISPENSED, 1),
     (Category.BEAUTY, 1), (Category.FOOTWEAR, 1), (Category.OUTDOORS, 2), (Category.JEWELRY, 1)])

main_page_scroll_times = WeightedArray([(0, 50), (1, 15), (2, 5)])
detail_page_scroll_times = WeightedArray([(0, 50), (1, 10)])
category_page_scroll_times = WeightedArray([(0, 50), (1, 15), (2, 5)])
search_times = WeightedArray([(1, 50), (2, 10), (3, 2)])
add_to_cart_times = WeightedArray([(0, 60), (1, 30), (2, 10), (3, 1)])
remove_from_cart_times = WeightedArray([(0, 60), (1, 30), (2, 10), (3, 1)])

screen_view_times = WeightedArray([(0, 50), (10, 20), (20, 10), (30, 5), (40, 2), (50, 1)])


# user enum
def get_random_user_name():
    return random.choices(first_names)[0] + " " + random.choices(last_names)[0]


first_names = ['Emma', 'Olivia', 'Ava', 'Isabella', 'Sophia', 'Charlotte', 'Mia', 'Amelia', 'Harper', 'Evelyn',
               'Abigail', 'Emily', 'Ella', 'Elizabeth', 'Camila', 'Luna', 'Sofia', 'Avery', 'Mila', 'Aria', 'Scarlett',
               'Penelope', 'Layla', 'Chloe', 'Victoria', 'Madison', 'Eleanor', 'Grace', 'Nora', 'Riley', 'Zoey',
               'Hannah', 'Hazel', 'Lily', 'Ellie', 'Violet', 'Lillian', 'Aurora', 'Natalie', 'Stella', 'Maya', 'Audrey',
               'Leah', 'Savannah', 'Bella', 'Alexa', 'Aaliyah', 'Lucy', 'Anna', 'Caroline', 'Nova', 'Genesis', 'Emilia',
               'Kennedy', 'Samantha', 'Maya', 'Genesis', 'Rebecca', 'Zoe', 'Makayla', 'Madelyn', 'Aubrey', 'Harmony',
               'Addison', 'Jasmine', 'Kinsley', 'Delilah', 'Sienna', 'Arianna', 'Katherine', 'Peyton', 'Melanie',
               'Autumn', 'Maria', 'Eva', 'Sadie', 'Ruby', 'Alyssa', 'Naomi', 'Nevaeh', 'Kylie', 'Gabriella', 'Molly',
               'Jocelyn', 'Gianna', 'Eliana', 'Aria', 'Madeline', 'Aubree', 'Brielle', 'Ariel', 'Faith', 'Cora',
               'Mckenzie', 'Adalynn', 'Raelynn', 'Elaina', 'Isabelle', 'Everly']
last_names = ['Smith', 'Johnson', 'Williams', 'Jones', 'Brown', 'Davis', 'Miller', 'Wilson', 'Moore', 'Taylor',
              'Anderson', 'Thomas', 'Jackson', 'White', 'Harris', 'Martin', 'Thompson', 'Garcia', 'Martinez',
              'Robinson', 'Clark', 'Rodriguez', 'Lewis', 'Lee', 'Walker', 'Hall', 'Allen', 'Young', 'King', 'Wright',
              'Scott', 'Green', 'Baker', 'Adams', 'Nelson', 'Carter', 'Mitchell', 'Perez', 'Roberts', 'Turner',
              'Phillips', 'Campbell', 'Parker', 'Evans', 'Edwards', 'Collins', 'Stewart', 'Sanchez', 'Morris', 'Rogers',
              'Reed', 'Cook', 'Morgan', 'Bell', 'Murphy', 'Bailey', 'Rivera', 'Cooper', 'Richardson', 'Cox', 'Howard',
              'Ward', 'Torres', 'Peterson', 'Gray', 'Ramirez', 'James', 'Watson', 'Brooks', 'Kelly', 'Sanders', 'Price',
              'Bennett', 'Wood', 'Barnes', 'Ross', 'Henderson', 'Coleman', 'Jenkins', 'Perry', 'Powell', 'Long',
              'Patterson', 'Hughes', 'Flores', 'Washington', 'Butler', 'Simmons', 'Foster', 'Gonzalez', 'Bryant',
              'Alexander', 'Russell', 'Griffin', 'Diaz', 'Hayes', 'Myers', 'Ford', 'Hamilton', 'Graham', 'Sullivan',
              'Wallace']
is_login_user = WeightedArray([(True, 55), (False, 45)])
user_gender = WeightedArray([('male', 45), ('female', 55)])
age_range = WeightedArray([(10, 5), (20, 45), (30, 35), (40, 10), (50, 3)])

# other enum
channel = WeightedArray(
    [('Google play', 50), ('Amazon Appstore', 5), ('F-Droid', 10), ('Galaxy Store', 15), ('QQ Store', 8),
     ('Huawei Store', 12), ('Xiaomi Store', 7), ('Oppo Store', 6), ('Vivo Store', 5), ('360 Store', 2)])

traffic_source = WeightedArray(
    [(('email', "Search"), 1), (('baidu', "Recommendations"), 2), (('google', "Paid search"), 3),
     (('douyin', "App Referral"), 5), (('bytedance', "Search"), 4), (('', ""), 90)])
