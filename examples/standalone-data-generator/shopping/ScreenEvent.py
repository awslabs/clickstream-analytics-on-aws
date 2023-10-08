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

import enums
from shopping.ShoppingEventType import EventType
from shopping.ShoppingScreen import Page
from shopping import Products, ShoppingEvent, ShoppingScreen

purchase_products = []
cart_products = []

clicked_product = {}
current_feature = ''


def clear():
    global purchase_products, cart_products, clicked_product, current_feature
    purchase_products = []
    cart_products = []
    clicked_product = {}
    current_feature = ''


# generate user engagement event and screen_view event
def get_enter_new_screen_events(user, event, page):
    events = []
    # user engagement
    engagement_time = 0
    if user.current_page_type != '':
        engagement_time = user.current_timestamp - user.current_page_start_time
        if engagement_time > 1000:
            engagement_event = ShoppingEvent.clean_event(event)
            engagement_event['attributes']['_engagement_time_msec'] = engagement_time
            events.append(ShoppingEvent.get_final_event(user, EventType.USER_ENGAGEMENT, engagement_event))
    # screen view
    screen_view_event = ShoppingEvent.clean_event(event)
    # page_info = ShoppingScreen.get_page_by_platform(page, user.platform)
    gen_screen_view_attribute(user, screen_view_event, engagement_time)
    user.current_page = ShoppingScreen.get_page_by_platform(page, user.platform)
    user.current_page_type = page
    user.current_page_start_time = user.current_timestamp
    if user.platform == enums.Platform.Web:
        event_type = EventType.PAGE_VIEW
    else:
        event_type = EventType.SCREEN_VIEW
    events.append(ShoppingEvent.get_final_event(user, event_type, screen_view_event))
    return events


# generate screen view attribute
def gen_screen_view_attribute(user, event, engagement_time):
    is_entrance = user.current_page_type == ''
    if is_entrance:
        event['attributes']['_entrances'] = 1
    else:
        event['attributes']['_entrances'] = 0

    if not is_entrance:
        page_info = user.current_page
        if user.platform == enums.Platform.Web:
            event['attributes']['_page_referrer_title'] = page_info[0]
            event['attributes']['_page_referrer'] = page_info[1]
        else:
            event['attributes']['_previous_screen_name'] = page_info[0]
            event['attributes']['_previous_screen_id'] = page_info[1]
        event['attributes']['_engagement_time_msec'] = engagement_time


# generate user engagement and app end event when app exit
def get_exit_app_events(user, event):
    events = []
    # user engagement
    engagement_time = user.current_timestamp - user.current_page_start_time
    if engagement_time > 1000:
        event = ShoppingEvent.clean_event(event)
        event['attributes']['_engagement_time_msec'] = engagement_time
        events.append(ShoppingEvent.get_final_event(user, EventType.USER_ENGAGEMENT, event))
    # app end
    event = ShoppingEvent.clean_event(event)
    events.append(ShoppingEvent.get_final_event(user, EventType.APP_END, event))
    return events


def get_page_events(user, event, page_name):
    if page_name == Page.MAIN:
        return get_main_page_events(event, user)
    if page_name == Page.CATEGORY:
        return get_category_page_events(event, user)
    if page_name == Page.CART:
        return get_cart_page_events(event, user)
    if page_name == Page.SEARCH:
        return get_search_page_events(event, user)
    if page_name == Page.DETAIL:
        return get_detail_page_events(event, user)
    if page_name == Page.CHECKOUT:
        return get_checkout_page_events(event, user)
    if page_name == Page.RESULT:
        return get_result_page_events(event, user)
    if page_name == Page.PROFILE:
        return get_profile_page_events(event, user)
    if page_name == Page.LOGIN:
        return get_login_page_events(event, user)
    if page_name == Page.SIGN_UP:
        return get_sign_up_page_events(event, user)


def get_main_page_events(event, user):
    events = []
    next_page = ShoppingScreen.get_next_page(Page.MAIN)
    scroll_times = enums.main_page_scroll_times.get_random_item()
    # popular product exposure
    global clicked_product, current_feature
    popular_products = Products.get_random_product(8)
    featured_products = []
    events.extend(Products.get_exposure_events(user, popular_products, event, enums.Feature.popular))
    user.current_timestamp += random.randint(3, 10) * 1000
    # scroll for more
    if scroll_times > 0:
        popular_products = Products.get_random_product(4)
        events.extend(Products.get_exposure_events(user, popular_products, event, enums.Feature.popular))
        user.current_timestamp += random.randint(3, 5) * 1000
    # scroll for Featured products exposure and record scroll event
    if scroll_times > 1:
        if user.prefer_category != '':
            featured_products = Products.get_random_category_product(user.prefer_category, 4)
        else:
            featured_products = Products.get_random_product(4)
        events.append(ShoppingEvent.get_final_event(user, EventType.SCROLL, ShoppingEvent.clean_event(event)))
        events.extend(Products.get_exposure_events(user, featured_products, event, enums.Feature.featured))
        user.current_timestamp += random.randint(3, 5) * 1000
    if next_page == Page.DETAIL:
        if scroll_times > 1:
            clicked_product = random.sample(featured_products, 1)[0]
            current_feature = enums.Feature.featured
        else:
            clicked_product = random.sample(popular_products, 1)[0]
            current_feature = enums.Feature.popular
    return events, next_page


def get_category_page_events(event, user):
    events = []
    next_page = ShoppingScreen.get_next_page(Page.CATEGORY)
    global clicked_product, current_feature
    current_category = enums.product_category.get_random_item()
    if user.prefer_category == '':
        user.prefer_category = current_category
    category_products = Products.get_random_category_product(user.prefer_category, 4)
    events.extend(Products.get_exposure_events(user, category_products, event, enums.Feature.category))
    user.current_timestamp += random.randint(3, 60) * 1000
    scroll_times = enums.category_page_scroll_times.get_random_item()
    if scroll_times > 0:
        events.append(ShoppingEvent.get_final_event(user, EventType.SCROLL, ShoppingEvent.clean_event(event)))
        category_products = Products.get_random_category_product(user.prefer_category, 4)
        events.extend(Products.get_exposure_events(user, category_products, event, enums.Feature.category))
    user.current_timestamp += random.randint(3, 60) * 1000
    if next_page == Page.DETAIL:
        clicked_product = random.sample(category_products, 1)[0]
        current_feature = enums.Feature.featured
    return events, next_page


def get_search_page_events(event, user):
    events = []
    next_page = ShoppingScreen.get_next_page(Page.SEARCH)
    global clicked_product, current_feature
    search_times = enums.search_times.get_random_item()
    search_products = []
    for i in range(search_times):
        search_category = enums.product_category.get_random_item()
        search_event = ShoppingEvent.clean_event(event)
        search_event['_search_key'] = 's'
        search_event['_search_term'] = search_category
        events.append(ShoppingEvent.get_final_event(user, EventType.SEARCH, search_event))
        search_products = Products.get_random_category_product(search_category, 4)
        events.extend(Products.get_exposure_events(user, search_products, event, enums.Feature.search))
        user.current_timestamp += random.randint(15, 60) * 1000
    user.current_timestamp += random.randint(10, 30) * 1000
    if next_page == Page.DETAIL:
        clicked_product = random.sample(search_products, 1)[0]
        current_feature = enums.Feature.search
    return events, next_page


def get_detail_page_events(event, user):
    events = []

    global clicked_product, current_feature, purchase_products
    # view item
    if clicked_product != {}:
        events.append(Products.get_view_item_event(user, clicked_product, event, current_feature))
    # add to cart in 30% rate
    user.current_timestamp += random.randint(3, 30) * 1000
    add_to_cart_times = enums.add_to_cart_times.get_random_item()
    for i in range(add_to_cart_times):
        events.append(Products.get_add_to_cart_event(user, clicked_product, event, current_feature))
        user.current_timestamp += random.randint(3, 10) * 1000
        cart_products.append(clicked_product)
    # scroll event in 50% rate
    scroll_times = enums.detail_page_scroll_times.get_random_item()
    similar_products = []
    if scroll_times > 0:
        events.append(ShoppingEvent.get_final_event(user, EventType.SCROLL, ShoppingEvent.clean_event(event)))
        similar_products = Products.get_random_category_product(clicked_product['category'], 4)
        events.extend(Products.get_exposure_events(user, similar_products, event, enums.Feature.similar))
        next_page = ShoppingScreen.get_next_page(Page.DETAIL)
    else:
        next_page = ShoppingScreen.next_page_of_detail_without_scroll.get_random_item()
    if next_page == Page.DETAIL:
        clicked_product = random.sample(similar_products, 1)[0]
        current_feature = enums.Feature.similar
    elif next_page == Page.CHECKOUT:
        purchase_products = [clicked_product]
        events.append(ShoppingEvent.get_final_event(user, EventType.BEGIN_CHECKOUT, ShoppingEvent.clean_event(event)))
    return events, next_page


def get_cart_page_events(event, user):
    events = []
    global cart_products, clicked_product, current_feature, purchase_products
    # view cart
    events.append(Products.get_view_cart_event(user, cart_products, event))
    # remove from cart
    remove_times = enums.remove_from_cart_times.get_random_item()
    for i in range(remove_times):
        if len(cart_products) > 0:
            removed_product = random.sample(cart_products, 1)[0]
            events.append(Products.get_remove_from_cart_event(user, removed_product, event))
            user.current_timestamp += random.randint(3, 10) * 1000
            cart_products.remove(removed_product)
    if len(cart_products) > 0:
        next_page = ShoppingScreen.get_next_page(Page.CART)
    else:
        next_page = ShoppingScreen.next_page_of_empty_cart.get_random_item()
    if next_page == Page.DETAIL:
        clicked_product = random.sample(cart_products, 1)[0]
        current_feature = enums.Feature.cart
    elif next_page == Page.CHECKOUT:
        purchase_products = cart_products
        events.append(ShoppingEvent.get_final_event(user, EventType.BEGIN_CHECKOUT, ShoppingEvent.clean_event(event)))
    user.current_timestamp += random.randint(3, 10) * 1000
    return events, next_page


def get_checkout_page_events(event, user):
    events = []
    next_page = ShoppingScreen.get_next_page(Page.CHECKOUT)
    global cart_products
    if next_page == Page.RESULT:
        events.append(Products.get_purchase_event(user, cart_products, event))
    user.current_timestamp = random.randint(3, 60) * 1000
    return events, next_page


def get_result_page_events(event, user):
    events = []
    next_page = ShoppingScreen.get_next_page(Page.RESULT)
    user.current_timestamp = random.randint(3, 10) * 1000
    return events, next_page


def get_profile_page_events(event, user):
    events = []
    next_page = ShoppingScreen.get_next_page(Page.PROFILE)
    # logout event
    if next_page == Page.LOGIN:
        if user.is_login:
            user.is_login = False
            del event["user"]["_user_id"]
            events.append(ShoppingEvent.get_final_event(user, EventType.LOGOUT, ShoppingEvent.clean_event(event)))
    user.current_timestamp += random.randint(3, 10) * 1000
    return events, next_page


def get_login_page_events(event, user):
    events = []
    if user.is_login:
        next_page = ShoppingScreen.Page.MAIN
        return events, next_page
    user.current_timestamp += random.randint(10, 60) * 1000
    next_page = ShoppingScreen.get_next_page(Page.LOGIN)
    if next_page == ShoppingScreen.Page.MAIN:
        # login event
        if user.is_login_user:
            # profile set
            user_id = {
                "value": user.user_id,
                "set_timestamp": user.current_timestamp
            }
            event["user"]["_user_id"] = user_id
            profile_set_event = ShoppingEvent.clean_event(event)
            user_name = {
                "value": user.name,
                "set_timestamp": user.current_timestamp
            }
            profile_set_event["user"]["_user_name"] = user_name
            user_gender = {
                "value": user.gender,
                "set_timestamp": user.current_timestamp
            }
            profile_set_event["user"]["gender"] = user_gender
            user_age = {
                "value": user.age,
                "set_timestamp": user.current_timestamp
            }
            profile_set_event["user"]["age"] = user_age
            events.append(ShoppingEvent.get_final_event(user, EventType.PROFILE_SET, profile_set_event))

            events.append(ShoppingEvent.get_final_event(user, EventType.LOGIN, ShoppingEvent.clean_event(event)))
            user.is_login = True
            user.login_timestamp = user.current_timestamp
    return events, next_page


def get_sign_up_page_events(event, user):
    events = []
    user.current_timestamp += random.randint(5, 100) * 1000
    next_page = ShoppingScreen.get_next_page(Page.SIGN_UP)
    if next_page == ShoppingScreen.Page.MAIN:
        # sign up success
        events.append(ShoppingEvent.get_final_event(user, EventType.SIGN_UP, ShoppingEvent.clean_event(event)))
    return events, next_page
