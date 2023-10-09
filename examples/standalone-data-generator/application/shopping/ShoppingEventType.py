"""
Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.

Licensed under the Apache License, Version 2.0 (the "License"). You may not use this file except in compliance
with the License. A copy of the License is located at

    http://www.apache.org/licenses/LICENSE-2.0

or in the 'license' file accompanying this file. This file is distributed on an 'AS IS' BASIS, WITHOUT WARRANTIES
OR CONDITIONS OF ANY KIND, express or implied. See the License for the specific language governing permissions
and limitations under the License.
"""


class EventType:
    # preset event
    FIRST_OPEN = '_first_open'
    SESSION_START = '_session_start'
    APP_START = '_app_start'
    APP_END = '_app_end'
    SCREEN_VIEW = '_screen_view'
    USER_ENGAGEMENT = '_user_engagement'
    PROFILE_SET = '_profile_set'

    # web preset event
    CLICK = '_click'
    SCROLL = '_scroll'
    PAGE_VIEW = '_page_view'

    # custom event
    LOGOUT = 'logout'
    SIGN_UP = 'sign_up'
    LOGIN = 'login'
    ADD_TO_CART = 'add_to_cart'
    REMOVE_FROM_CART = 'remove_from_cart'
    PRODUCT_EXPOSURE = 'product_exposure'
    VIEW_ITEM = 'view_item'
    VIEW_CART = 'view_cart'
    BEGIN_CHECKOUT = 'begin_checkout'
    PURCHASE = 'purchase'
    SEARCH = 'search'
