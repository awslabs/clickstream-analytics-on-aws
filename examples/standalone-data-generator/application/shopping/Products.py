import random

from application.shopping import ShoppingApp
from application.shopping.ShoppingEventType import EventType
import util.util as utils
import enums


def get_random_product(number):
    loop_times = int(number / 2)
    product_list = []
    for _ in range(loop_times):
        category = enums.product_category.get_random_item()
        product_list.extend(get_random_category_product(category, 2))
    return product_list


def get_random_category_product(category, number):
    product_list = []
    if category == enums.Category.BOOK:
        product_list.extend(random.sample(books, number))
    elif category == enums.Category.TOOLS:
        product_list.extend(random.sample(tools, number))
    elif category == enums.Category.FOOD_SERVICE:
        product_list.extend(random.sample(food_service, number))
    elif category == enums.Category.CODE_DISPENSED:
        product_list.extend(random.sample(code_dispensed, number))
    elif category == enums.Category.BEAUTY:
        product_list.extend(random.sample(beauty, number))
    elif category == enums.Category.FOOTWEAR:
        product_list.extend(random.sample(footwear, number))
    elif category == enums.Category.OUTDOORS:
        product_list.extend(random.sample(outdoors, number))
    elif category == enums.Category.JEWELRY:
        product_list.extend(random.sample(jewelry, number))
    return product_list


def get_exposure_events(user, products, event, feature):
    events = []
    for product in products:
        product_exposure = ShoppingApp.clean_event(event)
        product_exposure['attributes']['currency'] = 'USD'
        product_exposure['attributes']['event_category'] = feature
        product_exposure['attributes']['item_id'] = product['id']
        product_exposure['items'] = [
            {
                "id": product['id'],
                "name": product['name'],
                "category": product['category'],
                "style": product['style'],
                "price": product['price'],
                "quantity": product['current_stock']
            }
        ]
        events.append(ShoppingApp.get_final_event(user, EventType.PRODUCT_EXPOSURE, product_exposure))
    return events


def get_view_item_event(user, product, event, feature):
    view_item_event = ShoppingApp.clean_event(event)
    view_item_event['attributes']['currency'] = 'USD'
    view_item_event['attributes']['event_category'] = feature
    view_item_event['attributes']['item_id'] = product['id']
    view_item_event['items'] = [
        {
            "id": product['id'],
            "name": product['name'],
            "category": product['category'],
            "style": product['style'],
            "price": product['price'],
            "quantity": product['current_stock']
        }
    ]
    return ShoppingApp.get_final_event(user, EventType.VIEW_ITEM, view_item_event)


def get_add_to_cart_event(user, product, event, feature):
    view_item_event = ShoppingApp.clean_event(event)
    view_item_event['attributes']['currency'] = 'USD'
    view_item_event['attributes']['event_category'] = feature
    view_item_event['attributes']['item_id'] = product['id']
    view_item_event['items'] = [
        {
            "id": product['id'],
            "name": product['name'],
            "category": product['category'],
            "style": product['style'],
            "price": product['price'],
            "quantity": product['current_stock']
        }
    ]
    return ShoppingApp.get_final_event(user, EventType.ADD_TO_CART, view_item_event)


def get_remove_from_cart_event(user, product, event):
    view_item_event = ShoppingApp.clean_event(event)
    view_item_event['attributes']['currency'] = 'USD'
    view_item_event['attributes']['item_id'] = product['id']
    view_item_event['items'] = [
        {
            "id": product['id'],
            "name": product['name'],
            "category": product['category'],
            "style": product['style'],
            "price": product['price'],
            "quantity": product['current_stock']
        }
    ]
    return ShoppingApp.get_final_event(user, EventType.REMOVE_FROM_CART, view_item_event)


def get_view_cart_event(user, products, event):
    view_cart_event = ShoppingApp.clean_event(event)
    view_cart_event['attributes']['currency'] = 'USD'
    total_price = 0
    view_cart_event["items"] = []
    for product in products:
        item = {
            "id": product['id'],
            "name": product['name'],
            "category": product['category'],
            "style": product['style'],
            "price": product['price'],
            "quantity": product['current_stock']
        }
        total_price += product['price']
        view_cart_event['items'].append(item)
    view_cart_event['attributes']['value'] = total_price
    return ShoppingApp.get_final_event(user, EventType.VIEW_CART, view_cart_event)


def get_purchase_event(user, products, event):
    purchase_event = ShoppingApp.clean_event(event)
    purchase_event['attributes']['currency'] = 'USD'
    purchase_event["items"] = []
    total_price = 0
    for product in products:
        item = {
            "id": product['id'],
            "name": product['name'],
            "category": product['category'],
            "style": product['style'],
            "price": product['price'],
            "quantity": product['current_stock']
        }
        total_price += product['price']
        purchase_event['items'].append(item)
        purchase_event['attributes']['order_id'] = utils.get_unique_id()
    purchase_event['attributes']['value'] = round(total_price, 2)
    return ShoppingApp.get_final_event(user, EventType.PURCHASE, purchase_event)


books = [
    {
        "id": "e53a6570-3a3f-4ca8-b6dc-8ff378bca757",
        "name": "Visit Sweden",
        "category": "books",
        "style": "travel",
        "price": 12.99,
        "current_stock": 12
    },
    {
        "id": "b55e794f-1137-4de2-bcea-806041e080e6",
        "name": "Visit China",
        "category": "books",
        "style": "travel",
        "price": 10.99,
        "current_stock": 11
    },
    {
        "id": "468f0798-8c51-4846-b8ee-c9fea3a32cf4",
        "name": "Visit Greece",
        "category": "books",
        "style": "travel",
        "price": 12.99,
        "current_stock": 10
    },
    {
        "id": "31eef6b5-781e-4353-a851-d73ff9c22f9a",
        "name": "Chinese Cuisine",
        "category": "books",
        "style": "cooking",
        "price": 52.99,
        "current_stock": 12
    },
    {
        "id": "fd34b35b-de76-496e-89f1-6ef65969e1a4",
        "name": "Visit Mexico",
        "category": "books",
        "style": "travel",
        "price": 15.99,
        "current_stock": 16
    },
    {
        "id": "c04c5c8e-d946-402a-a751-a3d33c124ccc",
        "name": "Indonesian Cuisine",
        "category": "books",
        "style": "cooking",
        "price": 38.99,
        "current_stock": 13
    },
    {
        "id": "e093925f-ea8c-4409-a00f-3d725cc463fb",
        "name": "Swedish Cuisine",
        "category": "books",
        "style": "cooking",
        "price": 54.99,
        "current_stock": 8
    },
    {
        "id": "9e663074-853f-45a4-a950-9419eaff5531",
        "name": "Spanish Cuisine",
        "category": "books",
        "style": "cooking",
        "price": 49.99,
        "current_stock": 18
    },
    {
        "id": "ef2bc846-fed1-4d6b-a9bb-e50c6961f254",
        "name": "Visit Kenya",
        "category": "books",
        "style": "travel",
        "price": 15.99,
        "current_stock": 13
    },
    {
        "id": "5d37a44b-d121-426e-b528-59e603ba5923",
        "name": "Visit Egypt",
        "category": "books",
        "style": "travel",
        "price": 11.99,
        "current_stock": 9
    },
    {
        "id": "84ab276d-9713-409f-861e-35502d6dc64a",
        "name": "Visit China",
        "category": "books",
        "style": "travel",
        "price": 14.99,
        "current_stock": 11
    },
    {
        "id": "53ce7597-bb59-45e0-a3a3-ca3ef6f7ce1c",
        "name": "Visit France",
        "category": "books",
        "style": "travel",
        "price": 11.99,
        "current_stock": 10
    },
    {
        "id": "4adabef5-293b-42c0-b6d1-1cf853f6391d",
        "name": "Visit China",
        "category": "books",
        "style": "travel",
        "price": 10.99,
        "current_stock": 18
    },
    {
        "id": "ac099a60-9187-4d4f-97b4-6bdfb14ba521",
        "name": "Visit Iceland",
        "category": "books",
        "style": "travel",
        "price": 11.99,
        "current_stock": 11
    },
    {
        "id": "4f9e1247-5342-4a79-ae6d-e53d083840a8",
        "name": "Visit Britain",
        "category": "books",
        "style": "travel",
        "price": 15.99,
        "current_stock": 18
    },
    {
        "id": "4f13bb6a-20f0-4067-a33d-6585b3cd26f2",
        "name": "Chinese Cuisine",
        "category": "books",
        "style": "cooking",
        "price": 26.99,
        "current_stock": 7
    },
    {
        "id": "6095dabe-0311-476c-b537-84f6f3dc2d75",
        "name": "Visit Italy",
        "category": "books",
        "style": "travel",
        "price": 14.99,
        "current_stock": 10
    },
    {
        "id": "5c7c00f5-37fa-4fab-95f8-f6982401f762",
        "name": "Visit Sweden",
        "category": "books",
        "style": "travel",
        "price": 11.99,
        "current_stock": 10
    },
    {
        "id": "47707417-48c4-4faa-84ee-a06414d29e46",
        "name": "Visit Spain",
        "category": "books",
        "style": "travel",
        "price": 9.99,
        "current_stock": 14
    },
    {
        "id": "9cc46ed9-287c-4ce8-bdb5-8e1fed177dd5",
        "name": "Italian Cuisine",
        "category": "books",
        "style": "cooking",
        "price": 45.99,
        "current_stock": 16
    }
]
tools = [
    {
        "id": "e65ad5b5-6860-4444-b873-9368c49cf30c",
        "name": "Plier",
        "category": "tools",
        "style": "plier",
        "price": 11.99,
        "current_stock": 10
    },
    {
        "id": "f5aea4cc-13dc-492b-a744-27a5e3f718cf",
        "name": "Screwdriver",
        "category": "tools",
        "style": "screwdriver",
        "price": 13.99,
        "current_stock": 10
    },
    {
        "id": "addd77dc-c004-445b-a448-5ef6956d82bd",
        "name": "Saw",
        "category": "tools",
        "style": "saw",
        "price": 13.99,
        "current_stock": 9
    },
    {
        "id": "f9446e88-fe6e-4601-8f47-7529f80bbac5",
        "name": "Knife",
        "category": "tools",
        "style": "knife",
        "price": 18.99,
        "current_stock": 17
    },
    {
        "id": "d090af37-2c9d-4779-9baf-2944eb436f14",
        "name": "Plier",
        "category": "tools",
        "style": "plier",
        "price": 11.99,
        "current_stock": 11
    },
    {
        "id": "8bffb5fb-624f-48a8-a99f-b8e9c64bbe29",
        "name": "Screwdriver",
        "category": "tools",
        "style": "screwdriver",
        "price": 24.99,
        "current_stock": 9
    },
    {
        "id": "2aa46f50-0e73-40f4-92a2-fd5a7aec5a4d",
        "name": "Saw",
        "category": "tools",
        "style": "saw",
        "price": 14.99,
        "current_stock": 14
    },
    {
        "id": "36671dac-7e57-46ee-a00f-99a7224d61d2",
        "name": "Knife",
        "category": "tools",
        "style": "knife",
        "price": 17.99,
        "current_stock": 14
    },
    {
        "id": "da6e5214-d24f-4be4-901b-b78f17d627b8",
        "name": "Hammer",
        "category": "tools",
        "style": "hammer",
        "price": 20.99,
        "current_stock": 18
    },
    {
        "id": "600e0db0-302f-49c6-b038-a872442894fb",
        "name": "Drill",
        "category": "tools",
        "style": "drill",
        "price": 8.99,
        "current_stock": 7
    },
    {
        "id": "f4b060b6-9146-47d0-b926-d0c347364278",
        "name": "Set",
        "category": "tools",
        "style": "set",
        "price": 11.99,
        "current_stock": 19
    },
    {
        "id": "785f77a6-5988-462e-a866-4d6d61390786",
        "name": "Wrench",
        "category": "tools",
        "style": "wrench",
        "price": 23.99,
        "current_stock": 10
    },
    {
        "id": "092a278e-4d04-4ce3-bc18-e8a0491a9fb5",
        "name": "Saw",
        "category": "tools",
        "style": "saw",
        "price": 23.99,
        "current_stock": 15
    },
    {
        "id": "56e24d72-d09a-4ec5-8da9-d840c9f4795f",
        "name": "Set",
        "category": "tools",
        "style": "set",
        "price": 18.99,
        "current_stock": 11
    },
    {
        "id": "edd7a7fa-23e2-4caa-92fa-3bdedfb68223",
        "name": "Hammer",
        "category": "tools",
        "style": "hammer",
        "price": 13.99,
        "current_stock": 13
    },
    {
        "id": "d2d8147f-0f24-42c3-bcbe-a232bab7e94d",
        "name": "Saw",
        "category": "tools",
        "style": "saw",
        "price": 17.99,
        "current_stock": 11
    },
    {
        "id": "b1b2b98b-5fbd-4e05-9d9f-e557409a37df",
        "name": "Wrench",
        "category": "tools",
        "style": "wrench",
        "price": 25.99,
        "current_stock": 6
    },
    {
        "id": "b630250c-41f3-4f14-865c-c1dc12e448ac",
        "name": "Saw",
        "category": "tools",
        "style": "saw",
        "price": 15.99,
        "current_stock": 6
    },
    {
        "id": "252ad448-0031-4705-8ec8-d43ad8df9d71",
        "name": "Set",
        "category": "tools",
        "style": "set",
        "price": 24.99,
        "current_stock": 7
    },
    {
        "id": "53ec1efb-0deb-48cf-96a3-7a7342b78608",
        "name": "Plier",
        "category": "tools",
        "style": "plier",
        "price": 8.99,
        "current_stock": 11
    }
]
food_service = [
    {
        "id": "0790267c-c708-424d-81f5-46903a9c8444",
        "name": "Slice of pepperoni pizza",
        "category": "food service",
        "style": "pizza",
        "price": 3,
        "current_stock": 90
    },
    {
        "id": "24c62ad2-6977-4f69-be75-e37d897c1434",
        "name": "Tomato soup",
        "category": "food service",
        "style": "soup and salad",
        "price": 2.1,
        "current_stock": 10
    },
    {
        "id": "a6f43f84-a89a-446f-8adc-8b1a23a30a81",
        "name": "Healthy stuffed vine leaves",
        "category": "food service",
        "style": "sandwiches/wraps",
        "price": 3.9,
        "current_stock": 10
    },
    {
        "id": "b20ba076-58a7-4602-9b56-4bee46e98388",
        "name": "Deluxe Nachos",
        "category": "food service",
        "style": "nachos",
        "price": 5,
        "current_stock": 90
    },
    {
        "id": "4496471c-b098-4915-9a1a-8b9e60043737",
        "name": "Mediterranean Salad",
        "category": "food service",
        "style": "soup and salad",
        "price": 4.1,
        "current_stock": 10
    },
    {
        "id": "575c0ac0-5494-4c64-a886-a9c0cf8b779a",
        "name": "Vegetarian lentil dish",
        "category": "food service",
        "style": "other cuisine",
        "price": 3.5,
        "current_stock": 10
    },
    {
        "id": "25d7bbf6-7dd3-4912-93a7-4186ea417b54",
        "name": "Salmon salad",
        "category": "food service",
        "style": "soup and salad",
        "price": 4.9,
        "current_stock": 10
    },
    {
        "id": "0987bfa1-0a23-4b90-8882-8a6e9bd91e24",
        "name": "Prawn curry",
        "category": "food service",
        "style": "seafood",
        "price": 5.5,
        "current_stock": 10
    }
]
code_dispensed = [
    {
        "id": "aff05423-76e8-4339-a478-fc17d51ed985",
        "name": "16oz Soda",
        "category": "cold dispensed",
        "style": "fountain-carbonated",
        "price": 1.5,
        "current_stock": 90
    },
    {
        "id": "0de9bba0-1149-40e9-b1a6-7dcecaf68194",
        "name": "Fruit smoothy",
        "category": "cold dispensed",
        "style": "fountain-non-carbonated",
        "price": 2.5,
        "current_stock": 10
    },
    {
        "id": "5afced84-ed2d-4520-a06d-dcfeab382e52",
        "name": "Herbal iced tea",
        "category": "cold dispensed",
        "style": "fountain-non-carbonated",
        "price": 2.2,
        "current_stock": 10
    },
    {
        "id": "5afced85-ed2d-4525-a06e-dcfeab382e55",
        "name": "iced milk tea",
        "category": "cold dispensed",
        "style": "fountain-non-carbonated",
        "price": 3.5,
        "current_stock": 22
    }
]
beauty = [
    {
        "id": "473d7251-7eaf-4b7a-9f87-ff6f7897d565",
        "name": "Gloss Bomb Universal Lip Luminizer",
        "category": "beauty",
        "style": "grooming",
        "price": 19,
        "gender_affinity": "F",
        "current_stock": 12
    },
    {
        "id": "6d5b3f03-ade6-42f7-969d-acd1f2162332",
        "name": "Razor",
        "category": "beauty",
        "style": "grooming",
        "price": 37.99,
        "gender_affinity": "M",
        "current_stock": 10
    },
    {
        "id": "ec981144-9f7d-473e-94a1-14da97152c5b",
        "name": "Waterproof Eyeliner and Mascara",
        "category": "beauty",
        "style": "grooming",
        "price": 27,
        "gender_affinity": "F",
        "current_stock": 9
    },
    {
        "id": "5dbc7cb7-39c5-4795-9064-d1655d78b3ca",
        "name": "Razor",
        "category": "beauty",
        "style": "grooming",
        "price": 31.99,
        "gender_affinity": "M",
        "current_stock": 7
    },
    {
        "id": "7cfd10d1-ff92-4513-b688-0ee179deaaef",
        "name": "Deep Disguise Concealer",
        "category": "beauty",
        "style": "grooming",
        "price": 12,
        "gender_affinity": "F",
        "current_stock": 7
    },
    {
        "id": "89728417-5269-403d-baa3-04b59cdffd0a",
        "name": "4-Piece Makeup Brush Set",
        "category": "beauty",
        "style": "grooming",
        "price": 26,
        "gender_affinity": "F",
        "current_stock": 4
    },
    {
        "id": "5d6023ca-e614-49ea-aa61-643d9f7284d7",
        "name": "Charcoal Cream",
        "category": "beauty",
        "style": "bathing",
        "price": 9.99,
        "current_stock": 10
    },
    {
        "id": "4994caee-f0b7-4ce8-a4df-d542ce1d9bda",
        "name": "Rich Soap",
        "category": "beauty",
        "style": "bathing",
        "price": 73.99,
        "current_stock": 10
    },
    {
        "id": "ab228b40-f692-4662-9986-6d8184dda20b",
        "name": "Beauty Balm",
        "category": "beauty",
        "style": "bathing",
        "price": 51.99,
        "current_stock": 9
    },
    {
        "id": "f91ec34f-a08e-4408-8bb0-592bdd09375c",
        "name": "Brush",
        "category": "beauty",
        "style": "grooming",
        "price": 50.99,
        "gender_affinity": "F",
        "current_stock": 10
    },
    {
        "id": "8759b4e2-51cc-456f-a224-01a34d04db2b",
        "name": "Pocket Powder Case",
        "category": "beauty",
        "style": "grooming",
        "price": 29,
        "gender_affinity": "F",
        "current_stock": 12
    },
    {
        "id": "c9eed2f3-8275-47a6-b485-166162262c70",
        "name": "Beauty Cream",
        "category": "beauty",
        "style": "bathing",
        "price": 9.99,
        "current_stock": 10
    },
    {
        "id": "b6295ac1-d60b-42a6-b16b-ebb433562e18",
        "name": "Subtle and Fresh: Palette of 15 Concealers",
        "category": "beauty",
        "style": "grooming",
        "price": 44,
        "gender_affinity": "F",
        "current_stock": 6
    },
    {
        "id": "1513d9f0-bb81-4b0c-bab5-20e8ea67c104",
        "name": "Toothbrush",
        "category": "beauty",
        "style": "grooming",
        "price": 58.99,
        "current_stock": 16
    },
    {
        "id": "31f69124-fa40-4a08-9d6c-9363c7f9d29b",
        "name": "7-in-1 Daily Wear Palette Essentials",
        "category": "beauty",
        "style": "grooming",
        "price": 103,
        "gender_affinity": "F",
        "current_stock": 2
    },
    {
        "id": "09920b2e-4e07-41f7-aca6-47744777a2a7",
        "name": "Trendy Razor",
        "category": "beauty",
        "style": "grooming",
        "price": 9.99,
        "gender_affinity": "F",
        "current_stock": 12
    },
    {
        "id": "63074efc-388e-4505-b984-5b25a4441299",
        "name": "Sublime Soap",
        "category": "beauty",
        "style": "bathing",
        "price": 22.99,
        "current_stock": 6
    },
    {
        "id": "1bcb66c4-ee9d-4c0c-ba53-168cb243569f",
        "name": "Grooming Kit",
        "category": "beauty",
        "style": "grooming",
        "price": 9.99,
        "gender_affinity": "F",
        "current_stock": 8
    },
    {
        "id": "641f3960-72a7-4e2b-be69-8a7539eb50bb",
        "name": "Lotion",
        "category": "beauty",
        "style": "bathing",
        "price": 30.99,
        "current_stock": 19
    },
    {
        "id": "72ae72f3-e7f0-4f03-b8eb-12e78c77741d",
        "name": "Fragrant Oil",
        "category": "beauty",
        "style": "bathing",
        "price": 36.99,
        "current_stock": 8
    }
]
footwear = [
    {
        "id": "5cb18925-3a3c-4867-8f1c-46efd7eba067",
        "name": "Spiffy Sandals",
        "category": "footwear",
        "style": "sandals",
        "price": 9.99,
        "gender_affinity": "F",
        "current_stock": 14
    },
    {
        "id": "8a4af646-ffb5-4413-a201-750537e2a318",
        "name": "Black Shoes",
        "category": "footwear",
        "style": "formal",
        "price": 9.99,
        "gender_affinity": "M",
        "current_stock": 11
    },
    {
        "id": "6d1e04fb-e960-43c3-9709-d83e19007cda",
        "name": "Black Heels",
        "category": "footwear",
        "style": "formal",
        "price": 9.99,
        "gender_affinity": "F",
        "current_stock": 16
    },
    {
        "id": "f7c1d04c-3076-4389-b06a-91993c983777",
        "name": "Saddle Brown Boots",
        "category": "footwear",
        "style": "boot",
        "price": 146.99,
        "gender_affinity": "F",
        "current_stock": 9
    },
    {
        "id": "baa6a74a-015f-41dd-8dd8-bdfc8dc1918a",
        "name": "Light Slate Gray Sneakers",
        "category": "footwear",
        "style": "sneaker",
        "price": 110.99,
        "gender_affinity": "M",
        "current_stock": 18
    },
    {
        "id": "0dc8e3c4-4556-45fe-a80f-48176777fb83",
        "name": "Neon Pink Shoes",
        "category": "footwear",
        "style": "formal",
        "price": 9.99,
        "gender_affinity": "F",
        "current_stock": 7
    },
    {
        "id": "0f4a0199-9ad9-422a-9bca-868723b659a9",
        "name": "Dark Blue Shoes",
        "category": "footwear",
        "style": "sneaker",
        "price": 107.99,
        "gender_affinity": "M",
        "current_stock": 11
    },
    {
        "id": "3f3b3c2d-b2ca-450f-9280-98f29b3371d5",
        "name": "Spiffy Sandals",
        "category": "footwear",
        "style": "sandals",
        "price": 9.99,
        "gender_affinity": "F",
        "current_stock": 17
    },
    {
        "id": "7e0e0e1f-9798-4f20-843f-df9a1ae2d878",
        "name": "Crimson Shoes",
        "category": "footwear",
        "style": "formal",
        "price": 9.99,
        "gender_affinity": "F",
        "current_stock": 19
    },
    {
        "id": "072f2cf7-33e8-4c74-9406-2c1fc21b3168",
        "name": "Black Shoes",
        "category": "footwear",
        "style": "formal",
        "price": 9.99,
        "gender_affinity": "F",
        "current_stock": 15
    },
    {
        "id": "54158f12-a839-466b-afbc-7c8788c9fd85",
        "name": "Firebrick Sneakers",
        "category": "footwear",
        "style": "sneaker",
        "price": 160.99,
        "gender_affinity": "M",
        "current_stock": 16
    },
    {
        "id": "700914b6-ae23-4e10-9329-896ba6526ce4",
        "name": "Modish Sandals",
        "category": "footwear",
        "style": "sandals",
        "price": 9.99,
        "gender_affinity": "F",
        "current_stock": 17
    },
    {
        "id": "2b556650-4748-460a-b4c9-b81b8fd3e990",
        "name": "Brown Boots",
        "category": "footwear",
        "style": "boot",
        "price": 182.99,
        "gender_affinity": "M",
        "current_stock": 17
    },
    {
        "id": "afd62b60-3596-47cd-a61f-1e53a0c2a8da",
        "name": "Golden Shoes",
        "category": "footwear",
        "style": "formal",
        "price": 9.99,
        "gender_affinity": "F",
        "current_stock": 9
    },
    {
        "id": "9a66adca-22dc-4e13-bf61-ceb1f5fffcb6",
        "name": "Black Boots",
        "category": "footwear",
        "style": "boot",
        "price": 258.99,
        "gender_affinity": "F",
        "current_stock": 10
    },
    {
        "id": "a51e9895-f3ee-47c1-b594-a8e7df8e8fd8",
        "name": "Dark Slate Blue Sneakers",
        "category": "footwear",
        "style": "sneaker",
        "price": 127.99,
        "gender_affinity": "M",
        "current_stock": 18
    },
    {
        "id": "b51bd298-43b7-49e2-852d-de8c1aff6724",
        "name": "Groovy Sandals",
        "category": "footwear",
        "style": "sandals",
        "price": 9.99,
        "gender_affinity": "M",
        "current_stock": 18
    },
    {
        "id": "e850acc3-3cb1-499b-bea9-fd495d4c56ca",
        "name": "Swanky Sandals",
        "category": "footwear",
        "style": "sandals",
        "price": 9.99,
        "gender_affinity": "F",
        "current_stock": 16
    },
    {
        "id": "cfd9119f-ee29-4bc5-a08d-a58f471e7c73",
        "name": "Black Shoes",
        "category": "footwear",
        "style": "formal",
        "price": 9.99,
        "gender_affinity": "M",
        "current_stock": 7
    },
    {
        "id": "bb3f926c-9869-4b47-b13d-63271768f0b1",
        "name": "Sparkly Heels",
        "category": "footwear",
        "style": "formal",
        "price": 9.99,
        "gender_affinity": "F",
        "current_stock": 14
    }
]
outdoors = [
    {
        "id": "25a3547f-4a86-46f5-857a-fc17aa2b8fa0",
        "name": "Kayak",
        "category": "outdoors",
        "style": "kayaking",
        "price": 412.99,
        "current_stock": 14
    },
    {
        "id": "2a33865f-f45b-475f-9e35-29c8de4dc42d",
        "name": "Camping Tent",
        "category": "outdoors",
        "style": "camping",
        "price": 180.99,
        "current_stock": 12
    },
    {
        "id": "70d44a58-e099-40ea-8c01-575013ff0be2",
        "name": "Kayak",
        "category": "outdoors",
        "style": "kayaking",
        "price": 305.99,
        "current_stock": 14
    },
    {
        "id": "959732aa-01c5-4416-8a60-067797539182",
        "name": "Sure-Fire Fishing Reel",
        "category": "outdoors",
        "style": "fishing",
        "price": 55.99,
        "current_stock": 9
    },
    {
        "id": "c621da57-cc0f-4004-a975-6b08f28d0d60",
        "name": "Paddle",
        "category": "outdoors",
        "style": "kayaking",
        "price": 25.99,
        "current_stock": 15
    },
    {
        "id": "f6231107-7050-44ea-ac6a-dcb09f4a0b33",
        "name": "Camping Lamp",
        "category": "outdoors",
        "style": "camping",
        "price": 19.99,
        "current_stock": 16
    },
    {
        "id": "f9b60b83-4c16-472d-b579-461ec89eaac2",
        "name": "Camping Cup",
        "category": "outdoors",
        "style": "camping",
        "price": 9.99,
        "current_stock": 10
    },
    {
        "id": "0c687920-9e48-4937-87fe-472911249386",
        "name": "Camping Chair",
        "category": "outdoors",
        "style": "camping",
        "price": 45.99,
        "current_stock": 6
    },
    {
        "id": "3d11accd-9984-47e5-b0e6-94743e964b15",
        "name": "Camping Cup",
        "category": "outdoors",
        "style": "camping",
        "price": 7.99,
        "current_stock": 18
    },
    {
        "id": "e9f3e5cc-1f5f-4073-bea6-42c12a2c6bc5",
        "name": "Camping Lamp",
        "category": "outdoors",
        "style": "camping",
        "price": 15.99,
        "current_stock": 8
    },
    {
        "id": "bedb6aec-0704-416f-b31c-0b43b6ff1b2e",
        "name": "Fishing Reel",
        "category": "outdoors",
        "style": "fishing",
        "price": 105.99,
        "current_stock": 11
    },
    {
        "id": "dc135daa-4c1f-4672-ada4-fc8ee144e2f1",
        "name": "Camping Lamp",
        "category": "outdoors",
        "style": "camping",
        "price": 22.99,
        "current_stock": 19
    },
    {
        "id": "cc42e0f4-abaf-445b-b843-54884c4f6845",
        "name": "Fishing Reel",
        "category": "outdoors",
        "style": "fishing",
        "price": 36.99,
        "current_stock": 13
    },
    {
        "id": "938bb9e7-d978-4159-b13d-e653c1548934",
        "name": "Sure-Fire Fishing Lure",
        "category": "outdoors",
        "style": "fishing",
        "price": 53.99,
        "current_stock": 12
    },
    {
        "id": "404414a7-9562-4f9d-ade8-06d6923cf2ae",
        "name": "Fishing Hooks",
        "category": "outdoors",
        "style": "fishing",
        "price": 5.99,
        "current_stock": 6
    },
    {
        "id": "ef0bcf8e-b88a-442d-9380-fc9eda149df7",
        "name": "Sturdy Paddle",
        "category": "outdoors",
        "style": "kayaking",
        "price": 19.99,
        "current_stock": 14
    },
    {
        "id": "ef3312a1-6dd8-4433-9c72-772dd7abae82",
        "name": "Kayak",
        "category": "outdoors",
        "style": "kayaking",
        "price": 300.99,
        "current_stock": 17
    },
    {
        "id": "36a73f97-5107-4471-9609-f34235123c63",
        "name": "Dependable Fishing Reel",
        "category": "outdoors",
        "style": "fishing",
        "price": 116.99,
        "current_stock": 16
    },
    {
        "id": "a426a252-50ca-4a4d-b477-306985c3e0a6",
        "name": "Dog Accessory",
        "category": "outdoors",
        "style": "pet",
        "price": 34.99,
        "current_stock": 16
    },
    {
        "id": "75f06592-a0a2-4dc5-acfb-76b275dae3aa",
        "name": "Kayak",
        "category": "outdoors",
        "style": "kayaking",
        "price": 319.99,
        "current_stock": 17
    }
]
jewelry = [
    {
        "id": "34898360-79dc-4a8c-b774-9a799b0e7054",
        "name": "Modish Earrings",
        "category": "jewelry",
        "style": "earrings",
        "price": 67.99,
        "gender_affinity": "F",
        "current_stock": 8
    },
    {
        "id": "120e30c2-30ff-4c57-8265-17d084436ebb",
        "name": "Sans Pareil Bracelet",
        "category": "jewelry",
        "style": "bracelet",
        "price": 65.99,
        "gender_affinity": "F",
        "current_stock": 12
    },
    {
        "id": "69efa81b-e1d4-415b-9639-71450fae5bb6",
        "name": "Spiffy Earrings",
        "category": "jewelry",
        "style": "earrings",
        "price": 85.99,
        "gender_affinity": "F",
        "current_stock": 15
    },
    {
        "id": "2386a4f2-d20f-4622-a8ee-0d47f38c1f90",
        "name": "Exquisite Bracelet",
        "category": "jewelry",
        "style": "bracelet",
        "price": 150.99,
        "gender_affinity": "F",
        "current_stock": 9
    },
    {
        "id": "ef3fbe9a-a82f-48a7-93e5-b51cc10f973e",
        "name": "Foxy Bracelet",
        "category": "jewelry",
        "style": "bracelet",
        "price": 104.99,
        "gender_affinity": "F",
        "current_stock": 13
    },
    {
        "id": "7b8a3927-b430-4c2a-b5bb-32750b601795",
        "name": "Outstanding Necklace",
        "category": "jewelry",
        "style": "necklace",
        "price": 191.99,
        "gender_affinity": "F",
        "current_stock": 19
    },
    {
        "id": "7e259b82-d821-484b-80a4-d7adab366684",
        "name": "Quintessential Bracelet",
        "category": "jewelry",
        "style": "bracelet",
        "price": 76.99,
        "gender_affinity": "F",
        "current_stock": 9
    },
    {
        "id": "3f791530-9540-4a36-9838-4fb14fc247ae",
        "name": "Edgy Earrings",
        "category": "jewelry",
        "style": "earrings",
        "price": 23.99,
        "gender_affinity": "F",
        "current_stock": 17
    },
    {
        "id": "8f4bde5c-2d69-4c30-9c72-c5cff24ca58c",
        "name": "Supercool Earrings",
        "category": "jewelry",
        "style": "earrings",
        "price": 37.99,
        "gender_affinity": "F",
        "current_stock": 15
    },
    {
        "id": "7a52ede4-bed8-4720-9cf3-9cb6908d89f5",
        "name": "Flawless Bracelet",
        "category": "jewelry",
        "style": "bracelet",
        "price": 115.99,
        "gender_affinity": "F",
        "current_stock": 11
    },
    {
        "id": "1ee559df-965f-4ec7-847c-1d5d9f4170ea",
        "name": "Groovy Earrings",
        "category": "jewelry",
        "style": "earrings",
        "price": 109.99,
        "gender_affinity": "F",
        "current_stock": 14
    },
    {
        "id": "50d59a7a-738a-4c84-9b9e-2fd119f8aacd",
        "name": "Spiffy Necklace",
        "category": "jewelry",
        "style": "necklace",
        "price": 145.99,
        "gender_affinity": "F",
        "current_stock": 18
    },
    {
        "id": "a7d17aa3-4576-4907-be47-1c2a735f90f3",
        "name": "Sans Pareil Bracelet",
        "category": "jewelry",
        "style": "bracelet",
        "price": 148.99,
        "gender_affinity": "F",
        "current_stock": 8
    },
    {
        "id": "f4d6df27-394b-42bb-b1e3-130eca6feef6",
        "name": "Swell Necklace",
        "category": "jewelry",
        "style": "necklace",
        "price": 133.99,
        "gender_affinity": "F",
        "current_stock": 19
    },
    {
        "id": "5215c84a-7f87-4060-a86d-75826a35a9e4",
        "name": "Voguish Earrings",
        "category": "jewelry",
        "style": "earrings",
        "price": 41.99,
        "gender_affinity": "F",
        "current_stock": 6
    },
    {
        "id": "9254d2a2-8e8b-4df4-af68-705a2deccda6",
        "name": "First-Rate Bracelet",
        "category": "jewelry",
        "style": "bracelet",
        "price": 135.99,
        "gender_affinity": "F",
        "current_stock": 17
    },
    {
        "id": "8c0b69ac-e8db-4aca-83a9-1a89e0434965",
        "name": "Spiffy Necklace",
        "category": "jewelry",
        "style": "necklace",
        "price": 112.99,
        "gender_affinity": "F",
        "current_stock": 17
    },
    {
        "id": "9f7a3af3-a5d5-4a4f-9fc5-3fdae3e9787a",
        "name": "Trendy Earrings",
        "category": "jewelry",
        "style": "earrings",
        "price": 19.99,
        "gender_affinity": "F",
        "current_stock": 6
    },
    {
        "id": "854adde5-fc7b-4659-a353-c8e84668ef79",
        "name": "Beautiful Bracelet",
        "category": "jewelry",
        "style": "bracelet",
        "price": 55.99,
        "gender_affinity": "F",
        "current_stock": 18
    },
    {
        "id": "cc3edb1a-d73a-4f6a-8718-600cba7f37b4",
        "name": "Swanky Earrings",
        "category": "jewelry",
        "style": "earrings",
        "price": 25.99,
        "gender_affinity": "F",
        "current_stock": 12
    }
]
