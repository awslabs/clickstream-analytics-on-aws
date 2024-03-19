
create or replace function {{schema}}.parse_utm_from_url(url varchar(65535), referrer varchar(65535))
  returns varchar(65535)
stable
as $$

import json


def parse_utm_from_url(url, referrer=None):
    
    if url is None:
        url = ""

    # Split the URL into different parts
    parts = url.split("?")
    host_and_path = parts[0]
    query = parts[1] if len(parts) > 1 else ""

    # url decode the query string
    query = (query
        .replace("%3D", "=")
        .replace("%26", "&")
        .replace("%3F", "?")
        .replace("%3D", "=")
        .replace("%2F", "/")
        .replace("%3A", ":")
        .replace("%2C", ",")
        .replace("%2B", "+")
        .replace("%3A", ":")
        .replace("%3B", ";")
        .replace("%3C", "<")
        .replace("%3E", ">")
        .replace("%3D", "=")
        .replace("%3F", "?")
        .replace("%40", "@")
        .replace("%5B", "[")
        .replace("%5C", "\\")
        .replace("%5D", "]")
        .replace("%5E", "^")
        .replace("%5F", "_")
        .replace("%60", "`")
        .replace("%7B", "{")
        .replace("%7C", "|")
        .replace("%7D", "}")
        .replace("%7E", "~")
        .replace("%20", " "))

    protocol = host_and_path.split("//")[0].replace(":", "")
    host = None
    path = None
    if len(host_and_path.split("//")) > 1:
        host = host_and_path.split("//")[1].split("/")[0]
        if len(host_and_path.split("//")[1].split("/")) > 1:
            path = host_and_path.split("//")[1].split("/", 1)[1]
        

    # Split the query string into key-value pairs
    params = {}
    if query:
        pairs = query.split("&")
        for pair in pairs:
            key_value = pair.split("=")
            key = key_value[0]
            if len(key) == 0:
                continue
            value = key_value[1] if len(key_value) > 1 else None
            if params.get(key, None) is None:
               params[key] = value
            else:
               params[key] = params[key] + "," + value

    # Extract the UTM parameters from the params dictionary
    utm_id = params.get('utm_id', None)
    utm_source = params.get('utm_source', None)
    utm_medium = params.get('utm_medium', None)
    utm_content = params.get('utm_content', None)
    utm_term = params.get('utm_term', None)
    gclid = params.get('gclid', None)
    utm_campaign = params.get('utm_campaign', None)
    utm_source_platform = params.get('utm_source_platform', None)
    query_q = params.get('q', None)

    # Find the clid parameter
    clid_str = None
    clid_type = None
    for key, value in params.items():
        if key.endswith('clid'):
            clid_str = json.dumps({'type': key, 'id': value})
            clid_type = key
            break
    
    clid_type_to_source_and_medium_dict = {
        'gclid': {'utm_source': 'google', 'utm_medium': 'cpc'},
        'dclid': {'utm_source': 'google', 'utm_medium': 'display'},
        'fbclid': {'utm_source': 'facebook', 'utm_medium': 'scocial'},
        'msclid': {'utm_source': 'microsoft', 'utm_medium': 'cpc'},
        'twclid': {'utm_source': 'twitter', 'utm_medium': 'cpc'},
        'pintclid': {'utm_source': 'pinterest', 'utm_medium': 'cpc'},
        'linclid': {'utm_source': 'linkedin', 'utm_medium': 'cpc'},
        'ytclid': {'utm_source': 'youtube', 'utm_medium': 'video'},
        'tikclid': {'utm_source': 'tiktok', 'utm_medium': 'video'},
        'bingclid': {'utm_source': 'bing', 'utm_medium': 'cpc'},
        'baiduclid': {'utm_source': 'baidu', 'utm_medium': 'cpc'},  
    }

    if utm_source is None and clid_str is not None:
        utm_source = clid_type_to_source_and_medium_dict.get(clid_type, {}).get('utm_source', None)
        utm_medium = clid_type_to_source_and_medium_dict.get(clid_type, {}).get('utm_medium', None)
        
    referrer_to_source_medium_dict = {
        'google.com' : {'utm_source': 'google', 'utm_medium': 'organic'},
        'facebook.com' : {'utm_source': 'facebook', 'utm_medium': 'organic'},
        'microsoft.com' : {'utm_source': 'microsoft', 'utm_medium': 'organic'},
        'twitter.com' : {'utm_source': 'twitter', 'utm_medium': 'organic'},
        'pinterest.com' : {'utm_source': 'pinterest', 'utm_medium': 'organic'},
        'linkedin.com' : {'utm_source': 'linkedin', 'utm_medium': 'organic'},
        'youtube.com' : {'utm_source': 'youtube', 'utm_medium': 'organic'},
        'tiktok.com' : {'utm_source': 'tiktok', 'utm_medium': 'organic'},
        'bing.com' : {'utm_source': 'bing', 'utm_medium': 'organic'},
        'baidu.com' : {'utm_source': 'baidu', 'utm_medium': 'organic'},
    }    
    
    if utm_source is None and clid_str is None and referrer is not None:
          for key, value in referrer_to_source_medium_dict.items():
              if referrer.find(key) > -1:
                  utm_source = value.get('utm_source')
                  utm_medium = value.get('utm_medium')
                  break      
        
    if utm_source is not None and utm_term is None:
        utm_term = query_q
        
    if utm_source is None and referrer is not None:
        utm_content = referrer
        utm_medium = 'referral'
        if len(referrer.split("//")) > 1:
            referrer_host = referrer.split("//")[1].split("?")[0].split("/")[0]
            utm_source = referrer_host
        else:
            utm_source = referrer.split("?")[0].split("/")[0]
    
    
    if utm_source is None:
        utm_source = 'direct'
        utm_campaign = 'direct'

    source_category_dict = {
        'google': 'search',
        'bing': 'search',
        'yahoo': 'search',
        'baidu': 'search',
        'yandex': 'search',
        'naver': 'search',
        'daum': 'search',
        'sogou': 'search',
        'duckduckgo': 'search',
        'ecosia': 'search',
        'aol': 'search',
        'ask': 'search',
        'facebook': 'social',
        'instagram': 'social',
        'twitter': 'social',
        'linkedin': 'social',
        'pinterest': 'social',
        'tiktok': 'social',
        'snapchat': 'social',
        'youtube': 'social',
        'vimeo': 'social',
        'flickr': 'social',
        'tumblr': 'social',
        'reddit': 'social',
        'quora': 'social',
        'digg': 'social',
        'delicious': 'social',
        'stumbleupon': 'social',
        'myspace': 'social',
        'hi5': 'social',
        'tagged': 'social',
        'meetup': 'social',
        'meetme': 'social',
        'vk': 'social',
        'weibo': 'social',
        'wechat': 'social',
        'qq': 'social',
        'renren': 'social',
        'kaixin': 'social',
        'douban': 'social',
        'mixi': 'social',
        'cyworld': 'social',
        'orkut': 'social',
        'bebo': 'social',
        'friendster': 'social',
        'xanga': 'social',
        'livejournal': 'social',
        'plurk': 'social',
        'foursquare': 'social',
        'yelp': 'social',
        'tripadvisor': 'social',
        'angieslist': 'social',
        'nextdoor': 'social',
        'amazon': 'shopping',
        'ebay': 'shopping',
        'etsy': 'shopping',
        'aliexpress': 'shopping',
        'walmart': 'shopping',
        'bestbuy': 'shopping',
        'target': 'shopping',
        'overstock': 'shopping',
        'wayfair': 'shopping',
        'homedepot': 'shopping',
    }


    source_category = source_category_dict.get(utm_source, None)
    
    if source_category is None:
        for key, value in source_category_dict.items():
            if utm_source.find(key) > -1:
                source_category = value
                break
         
    
    if query is not None and len(query) == 0:
       query = None
    
    if path is not None and len(path) == 0:
         path = None
    
    if protocol is not None and len(protocol) == 0:
         protocol = None

    # channel_group
        
    paid_shopping_sites = ['amazon', 'ebay', 'etsy', 'aliexpress', 'walmart', 'bestbuy', 'target', 'overstock', 'wayfair', 'homedepot', 
                           'lowes', 'costco', 'sears', 'kmart', 'macys', 'nordstrom']

    paid_search_sites = ['google', 'bing', 'yahoo', 'baidu', 'yandex', 'naver', 'daum', 'sogou', 'duckduckgo', 'ecosia', 'aol', 'ask', 
                         'dogpile', 'excite', 'lycos', 'webcrawler', 'info', 'infospace', 'search', 'searchlock', 'searchencrypt', 'searchy']

    paid_social_sites = ['facebook', 'instagram', 'twitter', 'linkedin', 'pinterest', 'tiktok', 'snapchat', 'youtube', 'vimeo', 'flickr', 
                         'tumblr', 'reddit', 'quora', 'digg', 'delicious', 'stumbleupon', 'myspace', 'hi5', 'tagged', 'meetup', 'meetme', 
                         'vk', 'weibo', 'wechat', 'qq', 'renren', 'kaixin', 'douban', 'mixi', 'cyworld', 'orkut', 'bebo', 'friendster', 'xanga', 
                         'livejournal', 'plurk', 'foursquare', 'yelp', 'tripadvisor', 'angieslist', 'nextdoor', 'yelp', 'tripadvisor', 'angieslist', 'nextdoor']


    channel_group = None

    if utm_source in paid_shopping_sites or (utm_campaign is not None and utm_campaign.find('shop') > -1 and utm_medium in ['cpc', 'ppc', 'retargeting', 'paid']):
        channel_group = 'Paid Shopping'
    elif utm_source in paid_search_sites and utm_medium in ['cpc', 'ppc', 'retargeting', 'paid']:
        channel_group = 'Paid Search'
    elif utm_source in paid_social_sites and utm_medium in ['cpc', 'ppc', 'retargeting', 'paid']:
        channel_group = 'Paid Social'

      
    # Create a dictionary with the extracted values
    result = {
        'path': path,
        'query': query,
        'params': params,
        'utm_id': utm_id,
        'utm_source': utm_source,
        'utm_medium': utm_medium,
        'utm_campaign': utm_campaign,
        'utm_content': utm_content,
        'utm_term': utm_term,
        'utm_source_platform': utm_source_platform,
        'gclid': gclid,
        'clid_str': clid_str,
        'host': host,  
        'protocol': protocol,
        'channel_group': channel_group,
        'source_category': source_category,
    }

    return json.dumps(result)


return parse_utm_from_url(url, referrer)

$$ language plpythonu;

