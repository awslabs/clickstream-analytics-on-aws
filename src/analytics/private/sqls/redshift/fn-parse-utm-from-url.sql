
create or replace function {{schema}}.parse_utm_from_url(url varchar(65535), referrer varchar(65535), latest_referrer varchar(65535))
  returns varchar(65535)
stable
as $$
import json


utm_source = None
utm_term = None
utm_id = None
utm_medium = None
utm_content = None
utm_term = None
gclid = None
clid_str = None
utm_campaign = None
utm_source_platform = None
source_category = None
channel_group = None

page_url_host = None
page_url_path = None
page_url_params = None
page_url_protocol = None
page_url_query = None

def get_umt_from_url(url, url_info):
    global utm_source, source_category, channel_group, utm_term, utm_id, utm_medium, utm_content, utm_term, gclid, clid_str, utm_campaign, utm_source_platform
    global page_url_host, page_url_path, page_url_params, page_url_protocol, page_url_query

    print("LOG::get_umt_from_url(): {}={}".format(url_info, url))
    if url is None:
        url = ""
    if url.find("://") == -1:
        url = "http://" + url
    # Split the URL into different parts
    parts = url.split("?")
    host_and_path = parts[0]
    query = parts[1] if len(parts) > 1 else ""
    path = ''
    host = None
    # url decode the query string
    query = (
        query.replace("%3D", "=")
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
        .replace("%20", " ")
    )
    protocol = host_and_path.split("//")[0].replace(":", "")
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

    if url_info == "page_url":
        page_url_host = host
        page_url_path = path if len(path) > 0 and path != "/" else None
        page_url_params = params if len(params) > 0 else None
        page_url_protocol = protocol
        page_url_query = query if len(query) > 0 else None

    # Extract the UTM parameters from the params dictionary
    utm_id = params.get("utm_id", None)
    utm_source = params.get("utm_source", None)
    utm_medium = params.get("utm_medium", None)
    utm_content = params.get("utm_content", None)
    utm_term = params.get("utm_term", None)
    gclid = params.get("gclid", None)
    utm_campaign = params.get("utm_campaign", None)
    utm_source_platform = params.get("utm_source_platform", None)
    if utm_id == "":
        utm_id = None
    if utm_source == "":
        utm_source = None
    if utm_medium == "":
        utm_medium = None
    if utm_content == "":
        utm_content = None
    if utm_term == "":
        utm_term = None
    if gclid == "":
        gclid = None
    if utm_campaign == "":
        utm_campaign = None
    if utm_source_platform == "":
        utm_source_platform = None
    # Find the clid parameter
    clid_str = None
    clid_type = None
    for key, value in params.items():
        if key.endswith("clid"):
            clid_str = json.dumps({"type": key, "id": value})
            clid_type = key
            break
    clid_type_to_source_and_medium_dict = {
        "gclid": {"utm_source": "google", "utm_medium": "cpc"},
        "dclid": {"utm_source": "google", "utm_medium": "display"},
        "fbclid": {"utm_source": "facebook", "utm_medium": "scocial"},
        "msclid": {"utm_source": "microsoft", "utm_medium": "cpc"},
        "twclid": {"utm_source": "twitter", "utm_medium": "cpc"},
        "pintclid": {"utm_source": "pinterest", "utm_medium": "cpc"},
        "linclid": {"utm_source": "linkedin", "utm_medium": "cpc"},
        "ytclid": {"utm_source": "youtube", "utm_medium": "video"},
        "tikclid": {"utm_source": "tiktok", "utm_medium": "video"},
        "bingclid": {"utm_source": "bing", "utm_medium": "cpc"},
        "baiduclid": {"utm_source": "baidu", "utm_medium": "cpc"},
    }
    if utm_source is None and clid_str is not None:
        utm_source = clid_type_to_source_and_medium_dict.get(clid_type, {}).get(
            "utm_source", None
        )
        utm_medium = clid_type_to_source_and_medium_dict.get(clid_type, {}).get(
            "utm_medium", None
        )
    print(
        "LOG:: utm_source: {}, utm_medium: {}, utm_content: {}, utm_term: {}, utm_id: {}, gclid: {}, utm_campaign: {}, utm_source_platform: {}".format(
            utm_source,
            utm_medium,
            utm_content,
            utm_term,
            utm_id,
            gclid,
            utm_campaign,
            utm_source_platform,
        )
    )
    return


# end get_umt_from_url


def parse_utm_from_url(page_url, referrer, latest_referrer):
    global utm_source, source_category, channel_group, utm_term, utm_id, utm_medium, utm_content, utm_term, gclid, clid_str, utm_campaign, utm_source_platform
    global page_url_host, page_url_path, page_url_params, page_url_protocol, page_url_query

    get_umt_from_url(page_url, "page_url")

    referrer_url_source_category_list = [
    {
        "url": "lang-8.com",
        "source": "lang-8",
        "category": "Social",
        "params": []
    },
    {
        "url": "43things.com",
        "source": "43things",
        "category": "Social",
        "params": []
    },
    {
        "url": "hatena.com",
        "source": "Hatena",
        "category": "Social",
        "params": []
    },
    {
        "url": "activerain.com",
        "source": "activerain",
        "category": "Social",
        "params": []
    },
    {
        "url": "linkedin.com",
        "source": "linkedin",
        "category": "Social",
        "params": []
    },
    {
        "url": "51.com",
        "source": "51",
        "category": "Social",
        "params": []
    },
    {
        "url": "activeworlds.com",
        "source": "activeworlds",
        "category": "Social",
        "params": []
    },
    {
        "url": "avg.com",
        "source": "avg",
        "category": "Search",
        "params": []
    },
    {
        "url": "alibaba.com",
        "source": "alibaba",
        "category": "Shopping",
        "params": []
    },
    {
        "url": "babylon.com",
        "source": "babylon",
        "category": "Search",
        "params": []
    },
    {
        "url": "bebo.com",
        "source": "Bebo",
        "category": "Social",
        "params": []
    },
    {
        "url": "searchya.com",
        "source": "InfoSpace",
        "category": "Search",
        "params": [
            "q"
        ]
    },
    {
        "url": "imageshack.com",
        "source": "imageshack",
        "category": "Social",
        "params": []
    },
    {
        "url": "addthis.com",
        "source": "addthis",
        "category": "Social",
        "params": []
    },
    {
        "url": "igshopping.com",
        "source": "IGShopping",
        "category": "Shopping",
        "params": []
    },
    {
        "url": "livejournal.com",
        "source": "livejournal",
        "category": "Social",
        "params": []
    },
    {
        "url": "blogspot.com",
        "source": "blogspot",
        "category": "Social",
        "params": []
    },
    {
        "url": "cellufun.com",
        "source": "cellufun",
        "category": "Social",
        "params": []
    },
    {
        "url": "doostang.com",
        "source": "doostang",
        "category": "Social",
        "params": []
    },
    {
        "url": "alumniclass.com",
        "source": "alumniclass",
        "category": "Social",
        "params": []
    },
    {
        "url": "artstation.com",
        "source": "artstation",
        "category": "Social",
        "params": []
    },
    {
        "url": "askubuntu.com",
        "source": "askubuntu",
        "category": "Social",
        "params": []
    },
    {
        "url": "americantowns.com",
        "source": "americantowns",
        "category": "Social",
        "params": []
    },
    {
        "url": "anobii.com",
        "source": "anobii",
        "category": "Social",
        "params": []
    },
    {
        "url": "daemon-search.com",
        "source": "Daemon search",
        "category": "Search",
        "params": [
            "q"
        ]
    },
    {
        "url": "multiply.com",
        "source": "Multiply",
        "category": "Social",
        "params": []
    },
    {
        "url": "myheritage.com",
        "source": "myheritage",
        "category": "Social",
        "params": []
    },
    {
        "url": "myspace.com",
        "source": "myspace",
        "category": "Social",
        "params": []
    },
    {
        "url": "myyearbook.com",
        "source": "myYearbook",
        "category": "Social",
        "params": []
    },
    {
        "url": "ixquick.com",
        "source": "IxQuick",
        "category": "Search",
        "params": [
            "query"
        ]
    },
    {
        "url": "ask.com",
        "source": "Ask",
        "category": "Search",
        "params": [
            "ask",
            "q",
            "searchfor"
        ]
    },
    {
        "url": "bing.com",
        "source": "Bing",
        "category": "Search",
        "params": [
            "q"
        ]
    },
    {
        "url": "blackcareernetwork.com",
        "source": "blackcareernetwork",
        "category": "Social",
        "params": []
    },
    {
        "url": "blackplanet.com",
        "source": "blackplanet",
        "category": "Social",
        "params": []
    },
    {
        "url": "blogster.com",
        "source": "blogster",
        "category": "Social",
        "params": []
    },
    {
        "url": "google.com",
        "source": "google",
        "category": "Search",
        "params": []
    },
    {
        "url": "etsy.com",
        "source": "etsy",
        "category": "Shopping",
        "params": []
    },
    {
        "url": "excite.com",
        "source": "excite",
        "category": "Search",
        "params": []
    },
    {
        "url": "feedspot.com",
        "source": "feedspot",
        "category": "Social",
        "params": []
    },
    {
        "url": "filmaffinity.com",
        "source": "filmaffinity",
        "category": "Social",
        "params": []
    },
    {
        "url": "flipboard.com",
        "source": "flipboard",
        "category": "Social",
        "params": []
    },
    {
        "url": "foursquare.com",
        "source": "Foursquare",
        "category": "Social",
        "params": []
    },
    {
        "url": "getpocket.com",
        "source": "getpocket",
        "category": "Social",
        "params": []
    },
    {
        "url": "goodreads.com",
        "source": "goodreads",
        "category": "Social",
        "params": []
    },
    {
        "url": "incredimail.com",
        "source": "incredimail",
        "category": "Search",
        "params": []
    },
    {
        "url": "intherooms.com",
        "source": "intherooms",
        "category": "Social",
        "params": []
    },
    {
        "url": "digg.com",
        "source": "digg",
        "category": "Social",
        "params": []
    },
    {
        "url": "netlog.com",
        "source": "Netlog",
        "category": "Social",
        "params": []
    },
    {
        "url": "orkut.com",
        "source": "Orkut",
        "category": "Social",
        "params": []
    },
    {
        "url": "peepeth.com",
        "source": "Peepeth",
        "category": "Social",
        "params": []
    },
    {
        "url": "pinterest.com",
        "source": "pinterest",
        "category": "Social",
        "params": []
    },
    {
        "url": "plaxo.com",
        "source": "Plaxo",
        "category": "Social",
        "params": []
    },
    {
        "url": "reddit.com",
        "source": "reddit",
        "category": "Social",
        "params": []
    },
    {
        "url": "renren.com",
        "source": "renren",
        "category": "Social",
        "params": []
    },
    {
        "url": "skyrock.com",
        "source": "skyrock",
        "category": "Social",
        "params": []
    },
    {
        "url": "snapchat.com",
        "source": "snapchat",
        "category": "Social",
        "params": []
    },
    {
        "url": "sonico.com",
        "source": "Sonico.com",
        "category": "Social",
        "params": []
    },
    {
        "url": "stackoverflow.com",
        "source": "stackoverflow",
        "category": "Social",
        "params": []
    },
    {
        "url": "wwwgoogle.com",
        "source": "Google",
        "category": "Search",
        "params": [
            "q"
        ]
    },
    {
        "url": "gogole.com",
        "source": "Google",
        "category": "Search",
        "params": [
            "q"
        ]
    },
    {
        "url": "gppgle.com",
        "source": "Google",
        "category": "Search",
        "params": [
            "q"
        ]
    },
    {
        "url": "ancestry.com",
        "source": "ancestry",
        "category": "Social",
        "params": []
    },
    {
        "url": "baby-gaga.com",
        "source": "baby-gaga",
        "category": "Social",
        "params": []
    },
    {
        "url": "badoo.com",
        "source": "Badoo",
        "category": "Social",
        "params": []
    },
    {
        "url": "baidu.com",
        "source": "Baidu",
        "category": "Search",
        "params": [
            "kw",
            "wd",
            "word"
        ]
    },
    {
        "url": "disqus.com",
        "source": "disqus",
        "category": "Social",
        "params": []
    },
    {
        "url": "dogster.com",
        "source": "dogster",
        "category": "Social",
        "params": []
    },
    {
        "url": "elftown.com",
        "source": "elftown",
        "category": "Social",
        "params": []
    },
    {
        "url": "fark.com",
        "source": "fark",
        "category": "Social",
        "params": []
    },
    {
        "url": "foodservice.com",
        "source": "foodservice",
        "category": "Social",
        "params": []
    },
    {
        "url": "geni.com",
        "source": "geni",
        "category": "Social",
        "params": []
    },
    {
        "url": "glassdoor.com",
        "source": "glassdoor",
        "category": "Social",
        "params": []
    },
    {
        "url": "globo.com",
        "source": "globo",
        "category": "Search",
        "params": []
    },
    {
        "url": "gowalla.com",
        "source": "gowalla",
        "category": "Social",
        "params": []
    },
    {
        "url": "kakaocorp.com",
        "source": "kakaocorp",
        "category": "Social",
        "params": []
    },
    {
        "url": "listal.com",
        "source": "listal",
        "category": "Social",
        "params": []
    },
    {
        "url": "junglekey.com",
        "source": "Jungle Key",
        "category": "Search",
        "params": [
            "query"
        ]
    },
    {
        "url": "k9safesearch.com",
        "source": "K9 Safe Search",
        "category": "Search",
        "params": [
            "q"
        ]
    },
    {
        "url": "lycos.com",
        "source": "lycos",
        "category": "Search",
        "params": []
    },
    {
        "url": "bloggang.com",
        "source": "bloggang",
        "category": "Social",
        "params": []
    },
    {
        "url": "blogher.com",
        "source": "blogher",
        "category": "Social",
        "params": []
    },
    {
        "url": "buzzfeed.com",
        "source": "buzzfeed",
        "category": "Social",
        "params": []
    },
    {
        "url": "camospace.com",
        "source": "camospace",
        "category": "Social",
        "params": []
    },
    {
        "url": "classquest.com",
        "source": "classquest",
        "category": "Social",
        "params": []
    },
    {
        "url": "conduit.com",
        "source": "conduit",
        "category": "Search",
        "params": []
    },
    {
        "url": "allrecipes.com",
        "source": "allrecipes",
        "category": "Social",
        "params": []
    },
    {
        "url": "duckduckgo.com",
        "source": "duckduckgo",
        "category": "Search",
        "params": []
    },
    {
        "url": "crunchyroll.com",
        "source": "crunchyroll",
        "category": "Social",
        "params": []
    },
    {
        "url": "fubar.com",
        "source": "fubar",
        "category": "Social",
        "params": []
    },
    {
        "url": "google-play.com",
        "source": "google-play",
        "category": "Search",
        "params": []
    },
    {
        "url": "googlegroups.com",
        "source": "googlegroups",
        "category": "Social",
        "params": []
    },
    {
        "url": "hubculture.com",
        "source": "hubculture",
        "category": "Social",
        "params": []
    },
    {
        "url": "aolanswers.com",
        "source": "aolanswers",
        "category": "Social",
        "params": []
    },
    {
        "url": "bharatstudent.com",
        "source": "bharatstudent",
        "category": "Social",
        "params": []
    },
    {
        "url": "bloglines.com",
        "source": "bloglines",
        "category": "Social",
        "params": []
    },
    {
        "url": "amazon.com",
        "source": "amazon",
        "category": "Shopping",
        "params": []
    },
    {
        "url": "answerbag.com",
        "source": "answerbag",
        "category": "Social",
        "params": []
    },
    {
        "url": "plusnetwork.com",
        "source": "PlusNetwork",
        "category": "Search",
        "params": [
            "q"
        ]
    },
    {
        "url": "blogsome.com",
        "source": "blogsome",
        "category": "Social",
        "params": []
    },
    {
        "url": "brightkite.com",
        "source": "brightkite",
        "category": "Social",
        "params": []
    },
    {
        "url": "fanpop.com",
        "source": "fanpop",
        "category": "Social",
        "params": []
    },
    {
        "url": "brizzly.com",
        "source": "brizzly",
        "category": "Social",
        "params": []
    },
    {
        "url": "canalblog.com",
        "source": "canalblog",
        "category": "Social",
        "params": []
    },
    {
        "url": "curiositystream.com",
        "source": "curiositystream",
        "category": "Video",
        "params": []
    },
    {
        "url": "dailymotion.com",
        "source": "dailymotion",
        "category": "Video",
        "params": []
    },
    {
        "url": "dianping.com",
        "source": "dianping",
        "category": "Social",
        "params": []
    },
    {
        "url": "douban.com",
        "source": "Douban",
        "category": "Social",
        "params": []
    },
    {
        "url": "feministing.com",
        "source": "feministing",
        "category": "Social",
        "params": []
    },
    {
        "url": "friendfeed.com",
        "source": "friendfeed",
        "category": "Social",
        "params": []
    },
    {
        "url": "imvu.com",
        "source": "imvu",
        "category": "Social",
        "params": []
    },
    {
        "url": "mix.com",
        "source": "mix",
        "category": "Social",
        "params": []
    },
    {
        "url": "ning.com",
        "source": "ning",
        "category": "Social",
        "params": []
    },
    {
        "url": "screenrant.com",
        "source": "screenrant",
        "category": "Social",
        "params": []
    },
    {
        "url": "seznam.com",
        "source": "seznam",
        "category": "Search",
        "params": []
    },
    {
        "url": "shopify.com",
        "source": "shopify",
        "category": "Shopping",
        "params": []
    },
    {
        "url": "shopzilla.com",
        "source": "shopzilla",
        "category": "Shopping",
        "params": []
    },
    {
        "url": "smartnews.com",
        "source": "smartnews",
        "category": "Social",
        "params": []
    },
    {
        "url": "ssense.com",
        "source": "ssense",
        "category": "Social",
        "params": []
    },
    {
        "url": "stackexchange.com",
        "source": "stackexchange",
        "category": "Social",
        "params": []
    },
    {
        "url": "toolbox.com",
        "source": "toolbox",
        "category": "Social",
        "params": []
    },
    {
        "url": "vimeo.com",
        "source": "vimeo",
        "category": "Video",
        "params": []
    },
    {
        "url": "vk.com",
        "source": "Vkontakte",
        "category": "Social",
        "params": []
    },
    {
        "url": "webshots.com",
        "source": "webshots",
        "category": "Social",
        "params": []
    },
    {
        "url": "weibo.com",
        "source": "Weibo",
        "category": "Social",
        "params": []
    },
    {
        "url": "gibiru.com",
        "source": "Gibiru",
        "category": "Search",
        "params": [
            "q"
        ]
    },
    {
        "url": "weread.com",
        "source": "weread",
        "category": "Social",
        "params": []
    },
    {
        "url": "wistia.com",
        "source": "wistia",
        "category": "Video",
        "params": []
    },
    {
        "url": "zooppa.com",
        "source": "zooppa",
        "category": "Social",
        "params": []
    },
    {
        "url": "blog.com",
        "source": "blog",
        "category": "Social",
        "params": []
    },
    {
        "url": "blogs.com",
        "source": "blogs",
        "category": "Social",
        "params": []
    },
    {
        "url": "buzznet.com",
        "source": "Buzznet",
        "category": "Social",
        "params": []
    },
    {
        "url": "disneyplus.com",
        "source": "disneyplus",
        "category": "Video",
        "params": []
    },
    {
        "url": "dzone.com",
        "source": "dzone",
        "category": "Social",
        "params": []
    },
    {
        "url": "everforo.com",
        "source": "everforo",
        "category": "Social",
        "params": []
    },
    {
        "url": "facebook.com",
        "source": "Facebook",
        "category": "Social",
        "params": []
    },
    {
        "url": "goldstar.com",
        "source": "goldstar",
        "category": "Social",
        "params": []
    },
    {
        "url": "godtube.com",
        "source": "godtube",
        "category": "Social",
        "params": []
    },
    {
        "url": "gulli.com",
        "source": "gulli",
        "category": "Social",
        "params": []
    },
    {
        "url": "hi5.com",
        "source": "hi5",
        "category": "Social",
        "params": []
    },
    {
        "url": "hootsuite.com",
        "source": "hootsuite",
        "category": "Social",
        "params": []
    },
    {
        "url": "ryze.com",
        "source": "ryze",
        "category": "Social",
        "params": []
    },
    {
        "url": "simplycodes.com",
        "source": "simplycodes",
        "category": "Shopping",
        "params": []
    },
    {
        "url": "superuser.com",
        "source": "superuser",
        "category": "Social",
        "params": []
    },
    {
        "url": "tuenti.com",
        "source": "Tuenti",
        "category": "Social",
        "params": []
    },
    {
        "url": "woot.com",
        "source": "woot",
        "category": "Social",
        "params": []
    },
    {
        "url": "yammer.com",
        "source": "yammer",
        "category": "Social",
        "params": []
    },
    {
        "url": "gamerdna.com",
        "source": "gamerdna",
        "category": "Social",
        "params": []
    },
    {
        "url": "hoverspot.com",
        "source": "hoverspot",
        "category": "Social",
        "params": []
    },
    {
        "url": "gooblog.com",
        "source": "gooblog",
        "category": "Social",
        "params": []
    },
    {
        "url": "govloop.com",
        "source": "govloop",
        "category": "Social",
        "params": []
    },
    {
        "url": "ibibo.com",
        "source": "ibibo",
        "category": "Social",
        "params": []
    },
    {
        "url": "ig.com",
        "source": "ig",
        "category": "Social",
        "params": []
    },
    {
        "url": "iq.com",
        "source": "iq",
        "category": "Video",
        "params": []
    },
    {
        "url": "jammerdirect.com",
        "source": "jammerdirect",
        "category": "Social",
        "params": []
    },
    {
        "url": "kaneva.com",
        "source": "kaneva",
        "category": "Social",
        "params": []
    },
    {
        "url": "livedoor.com",
        "source": "livedoor",
        "category": "Social",
        "params": []
    },
    {
        "url": "menuism.com",
        "source": "menuism",
        "category": "Social",
        "params": []
    },
    {
        "url": "librarything.com",
        "source": "librarything",
        "category": "Social",
        "params": []
    },
    {
        "url": "blurtit.com",
        "source": "blurtit",
        "category": "Social",
        "params": []
    },
    {
        "url": "cnn.com",
        "source": "cnn",
        "category": "Search",
        "params": []
    },
    {
        "url": "cocolog-nifty.com",
        "source": "cocolog-nifty",
        "category": "Social",
        "params": []
    },
    {
        "url": "cyworld.com",
        "source": "cyworld",
        "category": "Social",
        "params": []
    },
    {
        "url": "deluxe.com",
        "source": "deluxe",
        "category": "Social",
        "params": []
    },
    {
        "url": "mubi.com",
        "source": "mubi",
        "category": "Social",
        "params": []
    },
    {
        "url": "netvibes.com",
        "source": "netvibes",
        "category": "Social",
        "params": []
    },
    {
        "url": "photobucket.com",
        "source": "photobucket",
        "category": "Social",
        "params": []
    },
    {
        "url": "sharethis.com",
        "source": "sharethis",
        "category": "Social",
        "params": []
    },
    {
        "url": "shvoong.com",
        "source": "shvoong",
        "category": "Social",
        "params": []
    },
    {
        "url": "stickam.com",
        "source": "stickam",
        "category": "Social",
        "params": []
    },
    {
        "url": "stripe.com",
        "source": "stripe",
        "category": "Shopping",
        "params": []
    },
    {
        "url": "ted.com",
        "source": "ted",
        "category": "Video",
        "params": []
    },
    {
        "url": "twitter.com",
        "source": "twitter",
        "category": "Social",
        "params": []
    },
    {
        "url": "ushareit.com",
        "source": "ushareit",
        "category": "Social",
        "params": []
    },
    {
        "url": "veoh.com",
        "source": "veoh",
        "category": "Video",
        "params": []
    },
    {
        "url": "walmart.com",
        "source": "walmart",
        "category": "Shopping",
        "params": []
    },
    {
        "url": "wikihow.com",
        "source": "wikihow",
        "category": "Social",
        "params": []
    },
    {
        "url": "athlinks.com",
        "source": "athlinks",
        "category": "Social",
        "params": []
    },
    {
        "url": "xanga.com",
        "source": "xanga",
        "category": "Social",
        "params": []
    },
    {
        "url": "youku.com",
        "source": "youku",
        "category": "Video",
        "params": []
    },
    {
        "url": "messenger.com",
        "source": "messenger",
        "category": "Social",
        "params": []
    },
    {
        "url": "qapacity.com",
        "source": "qapacity",
        "category": "Social",
        "params": []
    },
    {
        "url": "quechup.com",
        "source": "quechup",
        "category": "Social",
        "params": []
    },
    {
        "url": "quora.com",
        "source": "quora",
        "category": "Social",
        "params": []
    },
    {
        "url": "scvngr.com",
        "source": "scvngr",
        "category": "Social",
        "params": []
    },
    {
        "url": "serverfault.com",
        "source": "serverfault",
        "category": "Social",
        "params": []
    },
    {
        "url": "spoke.com",
        "source": "spoke",
        "category": "Social",
        "params": []
    },
    {
        "url": "stackapps.com",
        "source": "stackapps",
        "category": "Social",
        "params": []
    },
    {
        "url": "tencent.com",
        "source": "tencent",
        "category": "Social",
        "params": []
    },
    {
        "url": "travellerspoint.com",
        "source": "travellerspoint",
        "category": "Social",
        "params": []
    },
    {
        "url": "trombi.com",
        "source": "trombi",
        "category": "Social",
        "params": []
    },
    {
        "url": "urbanspoon.com",
        "source": "urbanspoon",
        "category": "Social",
        "params": []
    },
    {
        "url": "wattpad.com",
        "source": "wattpad",
        "category": "Social",
        "params": []
    },
    {
        "url": "diigo.com",
        "source": "diigo",
        "category": "Social",
        "params": []
    },
    {
        "url": "dogpile.com",
        "source": "InfoSpace",
        "category": "Search",
        "params": [
            "q"
        ]
    },
    {
        "url": "dopplr.com",
        "source": "dopplr",
        "category": "Social",
        "params": []
    },
    {
        "url": "fb.com",
        "source": "fb",
        "category": "Social",
        "params": []
    },
    {
        "url": "houzz.com",
        "source": "houzz",
        "category": "Social",
        "params": []
    },
    {
        "url": "hulu.com",
        "source": "hulu",
        "category": "Video",
        "params": []
    },
    {
        "url": "nightlifelink.com",
        "source": "nightlifelink",
        "category": "Social",
        "params": []
    },
    {
        "url": "overblog.com",
        "source": "overblog",
        "category": "Social",
        "params": []
    },
    {
        "url": "plurk.com",
        "source": "plurk",
        "category": "Social",
        "params": []
    },
    {
        "url": "reverbnation.com",
        "source": "reverbnation",
        "category": "Social",
        "params": []
    },
    {
        "url": "startsiden.com",
        "source": "startsiden",
        "category": "Search",
        "params": []
    },
    {
        "url": "talkbiznow.com",
        "source": "talkbiznow",
        "category": "Social",
        "params": []
    },
    {
        "url": "tripadvisor.com",
        "source": "tripadvisor",
        "category": "Social",
        "params": []
    },
    {
        "url": "trustpilot.com",
        "source": "trustpilot",
        "category": "Social",
        "params": []
    },
    {
        "url": "tudou.com",
        "source": "tudou",
        "category": "Social",
        "params": []
    },
    {
        "url": "scour.com",
        "source": "Scour.com",
        "category": "Search",
        "params": []
    },
    {
        "url": "searchalot.com",
        "source": "Searchalot",
        "category": "Search",
        "params": [
            "q"
        ]
    },
    {
        "url": "searchlock.com",
        "source": "SearchLock",
        "category": "Search",
        "params": [
            "q"
        ]
    },
    {
        "url": "setooz.com",
        "source": "Setooz",
        "category": "Search",
        "params": [
            "query"
        ]
    },
    {
        "url": "blogger.com",
        "source": "blogger",
        "category": "Social",
        "params": []
    },
    {
        "url": "care2.com",
        "source": "care2",
        "category": "Social",
        "params": []
    },
    {
        "url": "classmates.com",
        "source": "Classmates.com",
        "category": "Social",
        "params": []
    },
    {
        "url": "wordpress.com",
        "source": "wordpress",
        "category": "Social",
        "params": []
    },
    {
        "url": "deviantart.com",
        "source": "deviantart",
        "category": "Social",
        "params": []
    },
    {
        "url": "extole.com",
        "source": "extole",
        "category": "Social",
        "params": []
    },
    {
        "url": "faceparty.com",
        "source": "faceparty",
        "category": "Social",
        "params": []
    },
    {
        "url": "flickr.com",
        "source": "flickr",
        "category": "Social",
        "params": []
    },
    {
        "url": "gaiaonline.com",
        "source": "Gaia Online",
        "category": "Social",
        "params": []
    },
    {
        "url": "habbo.com",
        "source": "Haboo",
        "category": "Social",
        "params": []
    },
    {
        "url": "insanejournal.com",
        "source": "insanejournal",
        "category": "Social",
        "params": []
    },
    {
        "url": "mouthshut.com",
        "source": "mouthshut",
        "category": "Social",
        "params": []
    },
    {
        "url": "netflix.com",
        "source": "netflix",
        "category": "Video",
        "params": []
    },
    {
        "url": "pingsta.com",
        "source": "pingsta",
        "category": "Social",
        "params": []
    },
    {
        "url": "redux.com",
        "source": "redux",
        "category": "Social",
        "params": []
    },
    {
        "url": "sweeva.com",
        "source": "sweeva",
        "category": "Social",
        "params": []
    },
    {
        "url": "sogou.com",
        "source": "sogou",
        "category": "Search",
        "params": []
    },
    {
        "url": "kaboodle.com",
        "source": "kaboodle",
        "category": "Social",
        "params": []
    },
    {
        "url": "mercadolibre.com",
        "source": "mercadolibre",
        "category": "Shopping",
        "params": []
    },
    {
        "url": "newsshowcase.com",
        "source": "newsshowcase",
        "category": "Social",
        "params": []
    },
    {
        "url": "onstartups.com",
        "source": "onstartups",
        "category": "Social",
        "params": []
    },
    {
        "url": "reunion.com",
        "source": "reunion",
        "category": "Social",
        "params": []
    },
    {
        "url": "scribd.com",
        "source": "scribd",
        "category": "Social",
        "params": []
    },
    {
        "url": "shareit.com",
        "source": "shareit",
        "category": "Social",
        "params": []
    },
    {
        "url": "spruz.com",
        "source": "spruz",
        "category": "Social",
        "params": []
    },
    {
        "url": "techmeme.com",
        "source": "techmeme",
        "category": "Social",
        "params": []
    },
    {
        "url": "terra.com",
        "source": "terra",
        "category": "Search",
        "params": []
    },
    {
        "url": "tinyurl.com",
        "source": "tinyurl",
        "category": "Social",
        "params": []
    },
    {
        "url": "twitch.com",
        "source": "twitch",
        "category": "Video",
        "params": []
    },
    {
        "url": "typepad.com",
        "source": "typepad",
        "category": "Social",
        "params": []
    },
    {
        "url": "vampirerave.com",
        "source": "vampirerave",
        "category": "Social",
        "params": []
    },
    {
        "url": "virgilio.com",
        "source": "virgilio",
        "category": "Search",
        "params": []
    },
    {
        "url": "tiktok.com",
        "source": "TikTok",
        "category": "Social",
        "params": []
    },
    {
        "url": "xing.com",
        "source": "XING",
        "category": "Social",
        "params": []
    },
    {
        "url": "yahoo.com",
        "source": "yahoo",
        "category": "Search",
        "params": []
    },
    {
        "url": "youtube.com",
        "source": "youtube",
        "category": "Video",
        "params": []
    },
    {
        "url": "kakao.com",
        "source": "kakao",
        "category": "Social",
        "params": []
    },
    {
        "url": "livedoorblog.com",
        "source": "livedoorblog",
        "category": "Social",
        "params": []
    },
    {
        "url": "nexopia.com",
        "source": "nexopia",
        "category": "Social",
        "params": []
    },
    {
        "url": "niconico.com",
        "source": "niconico",
        "category": "Social",
        "params": []
    },
    {
        "url": "ravelry.com",
        "source": "ravelry",
        "category": "Social",
        "params": []
    },
    {
        "url": "tagged.com",
        "source": "tagged",
        "category": "Social",
        "params": []
    },
    {
        "url": "twoo.com",
        "source": "twoo",
        "category": "Social",
        "params": []
    },
    {
        "url": "utreon.com",
        "source": "utreon",
        "category": "Video",
        "params": []
    },
    {
        "url": "mymodernmet.com",
        "source": "mymodernmet",
        "category": "Social",
        "params": []
    },
    {
        "url": "over-blog.com",
        "source": "over-blog",
        "category": "Social",
        "params": []
    },
    {
        "url": "so.com",
        "source": "so",
        "category": "Search",
        "params": []
    },
    {
        "url": "taggedmail.com",
        "source": "taggedmail",
        "category": "Social",
        "params": []
    },
    {
        "url": "ukr.com",
        "source": "ukr",
        "category": "Search",
        "params": []
    },
    {
        "url": "weebly.com",
        "source": "weebly",
        "category": "Social",
        "params": []
    },
    {
        "url": "tumblr.com",
        "source": "tumblr",
        "category": "Social",
        "params": []
    },
    {
        "url": "stumbleupon.com",
        "source": "StumbleUpon",
        "category": "Social",
        "params": []
    },
    {
        "url": "v2ex.com",
        "source": "V2EX",
        "category": "Social",
        "params": []
    },
    {
        "url": "viadeo.com",
        "source": "Viadeo",
        "category": "Social",
        "params": []
    },
    {
        "url": "wayn.com",
        "source": "WAYN",
        "category": "Social",
        "params": []
    },
    {
        "url": "weeworld.com",
        "source": "WeeWorld",
        "category": "Social",
        "params": []
    },
    {
        "url": "workplace.com",
        "source": "Workplace",
        "category": "Social",
        "params": []
    },
    {
        "url": "googel.com",
        "source": "Google",
        "category": "Search",
        "params": [
            "q"
        ]
    },
    {
        "url": "darkoogle.com",
        "source": "Google",
        "category": "Search",
        "params": [
            "query"
        ]
    },
    {
        "url": "wow.com",
        "source": "Google",
        "category": "Search",
        "params": [
            "q"
        ]
    },
    {
        "url": "gfsoso.com",
        "source": "Google",
        "category": "Search",
        "params": [
            "q"
        ]
    },
    {
        "url": "monumentbrowser.com",
        "source": "Google",
        "category": "Search",
        "params": [
            "q"
        ]
    },
    {
        "url": "googlesyndicatedsearch.com",
        "source": "Google syndicated search",
        "category": "Search",
        "params": [
            "q"
        ]
    },
    {
        "url": "infospace.com",
        "source": "InfoSpace",
        "category": "Search",
        "params": [
            "q"
        ]
    },
    {
        "url": "tattoodle.com",
        "source": "InfoSpace",
        "category": "Search",
        "params": [
            "q"
        ]
    },
    {
        "url": "metacrawler.com",
        "source": "InfoSpace",
        "category": "Search",
        "params": [
            "q"
        ]
    },
    {
        "url": "webfetch.com",
        "source": "InfoSpace",
        "category": "Search",
        "params": [
            "q"
        ]
    },
    {
        "url": "webcrawler.com",
        "source": "InfoSpace",
        "category": "Search",
        "params": [
            "q"
        ]
    },
    {
        "url": "aol.com",
        "source": "aol",
        "category": "Search",
        "params": []
    },
    {
        "url": "asmallworld.com",
        "source": "asmallworld",
        "category": "Social",
        "params": []
    },
    {
        "url": "cafemom.com",
        "source": "cafemom",
        "category": "Social",
        "params": []
    },
    {
        "url": "care.com",
        "source": "care",
        "category": "Social",
        "params": []
    },
    {
        "url": "chegg.com",
        "source": "chegg",
        "category": "Social",
        "params": []
    },
    {
        "url": "chicagonow.com",
        "source": "chicagonow",
        "category": "Social",
        "params": []
    },
    {
        "url": "crackle.com",
        "source": "crackle",
        "category": "Video",
        "params": []
    },
    {
        "url": "ebay.com",
        "source": "ebay",
        "category": "Shopping",
        "params": []
    },
    {
        "url": "exalead.com",
        "source": "exalead",
        "category": "Search",
        "params": []
    },
    {
        "url": "fandom.com",
        "source": "fandom",
        "category": "Social",
        "params": []
    },
    {
        "url": "folkdirect.com",
        "source": "folkdirect",
        "category": "Social",
        "params": []
    },
    {
        "url": "gather.com",
        "source": "gather",
        "category": "Social",
        "params": []
    },
    {
        "url": "googleplus.com",
        "source": "googleplus",
        "category": "Social",
        "params": []
    },
    {
        "url": "hr.com",
        "source": "hr",
        "category": "Social",
        "params": []
    },
    {
        "url": "instagram.com",
        "source": "instagram",
        "category": "Social",
        "params": []
    },
    {
        "url": "line.com",
        "source": "line",
        "category": "Social",
        "params": []
    },
    {
        "url": "mocospace.com",
        "source": "mocospace",
        "category": "Social",
        "params": []
    },
    {
        "url": "opendiary.com",
        "source": "opendiary",
        "category": "Social",
        "params": []
    },
    {
        "url": "qwant.com",
        "source": "qwant",
        "category": "Search",
        "params": []
    },
    {
        "url": "socialvibe.com",
        "source": "socialvibe",
        "category": "Social",
        "params": []
    },
    {
        "url": "tweetdeck.com",
        "source": "tweetdeck",
        "category": "Social",
        "params": []
    },
    {
        "url": "whatsapp.com",
        "source": "whatsapp",
        "category": "Social",
        "params": []
    },
    {
        "url": "yandex.com",
        "source": "Yandex",
        "category": "Search",
        "params": [
            "text"
        ]
    },
    {
        "url": "allnurses.com",
        "source": "allnurses",
        "category": "Social",
        "params": []
    },
    {
        "url": "cozycot.com",
        "source": "cozycot",
        "category": "Social",
        "params": []
    },
    {
        "url": "epicurious.com",
        "source": "epicurious",
        "category": "Social",
        "params": []
    },
    {
        "url": "glassboard.com",
        "source": "glassboard",
        "category": "Social",
        "params": []
    },
    {
        "url": "jappy.com",
        "source": "jappy",
        "category": "Social",
        "params": []
    },
    {
        "url": "meetup.com",
        "source": "meetup",
        "category": "Social",
        "params": []
    },
    {
        "url": "yelp.com",
        "source": "yelp",
        "category": "Social",
        "params": []
    },
    {
        "url": "alice.com",
        "source": "alice",
        "category": "Search",
        "params": []
    },
    {
        "url": "beforeitsnews.com",
        "source": "beforeitsnews",
        "category": "Social",
        "params": []
    },
    {
        "url": "biglobe.com",
        "source": "biglobe",
        "category": "Search",
        "params": []
    },
    {
        "url": "daum.com",
        "source": "daum",
        "category": "Search",
        "params": []
    },
    {
        "url": "drugs-forum.com",
        "source": "drugs-forum",
        "category": "Social",
        "params": []
    },
    {
        "url": "eniro.com",
        "source": "eniro",
        "category": "Search",
        "params": []
    },
    {
        "url": "fc2.com",
        "source": "fc2",
        "category": "Social",
        "params": []
    },
    {
        "url": "fotolog.com",
        "source": "Fotolog",
        "category": "Social",
        "params": []
    },
    {
        "url": "google+.com",
        "source": "google+",
        "category": "Social",
        "params": []
    },
    {
        "url": "instapaper.com",
        "source": "instapaper",
        "category": "Social",
        "params": []
    },
    {
        "url": "iqiyi.com",
        "source": "iqiyi",
        "category": "Video",
        "params": []
    },
    {
        "url": "kvasir.com",
        "source": "kvasir",
        "category": "Search",
        "params": []
    },
    {
        "url": "najdi.com",
        "source": "najdi",
        "category": "Search",
        "params": []
    },
    {
        "url": "naver.com",
        "source": "naver",
        "category": "Search",
        "params": []
    },
    {
        "url": "onet.com",
        "source": "onet",
        "category": "Search",
        "params": []
    },
    {
        "url": "pinboard.com",
        "source": "pinboard",
        "category": "Social",
        "params": []
    },
    {
        "url": "posterous.com",
        "source": "posterous",
        "category": "Social",
        "params": []
    },
    {
        "url": "rambler.com",
        "source": "rambler",
        "category": "Search",
        "params": []
    },
    {
        "url": "skype.com",
        "source": "skype",
        "category": "Social",
        "params": []
    },
    {
        "url": "social.com",
        "source": "social",
        "category": "Social",
        "params": []
    },
    {
        "url": "stardoll.com",
        "source": "stardoll",
        "category": "Social",
        "params": []
    },
    {
        "url": "vampirefreaks.com",
        "source": "vampirefreaks",
        "category": "Social",
        "params": []
    },
    {
        "url": "zalo.com",
        "source": "zalo",
        "category": "Social",
        "params": []
    },
    {
        "url": "123people.com",
        "source": "123people",
        "category": "Search",
        "params": [
            "search_term"
        ]
    },
    {
        "url": "alexa.com",
        "source": "Alexa",
        "category": "Search",
        "params": [
            "q"
        ]
    },
    {
        "url": "alohafind.com",
        "source": "AlohaFind",
        "category": "Search",
        "params": [
            "q"
        ]
    },
    {
        "url": "altavista.com",
        "source": "AltaVista",
        "category": "Search",
        "params": [
            "q"
        ]
    },
    {
        "url": "arama.com",
        "source": "Arama",
        "category": "Search",
        "params": [
            "q"
        ]
    },
    {
        "url": "qbyrd.com",
        "source": "Ask",
        "category": "Search",
        "params": [
            "ask",
            "q",
            "searchfor"
        ]
    },
    {
        "url": "search-results.com",
        "source": "search-results",
        "category": "Search",
        "params": []
    },
    {
        "url": "searchqu.com",
        "source": "Ask",
        "category": "Search",
        "params": [
            "ask",
            "q",
            "searchfor"
        ]
    },
    {
        "url": "blekko.com",
        "source": "blekko",
        "category": "Search",
        "params": [
            "q"
        ]
    },
    {
        "url": "claro-search.com",
        "source": "Claro Search",
        "category": "Search",
        "params": [
            "q"
        ]
    },
    {
        "url": "coccoc.com",
        "source": "C\u1ed1c C\u1ed1c",
        "category": "Search",
        "params": [
            "query"
        ]
    },
    {
        "url": "zapmeta.com",
        "source": "Zapmeta",
        "category": "Search",
        "params": [
            "q",
            "query"
        ]
    },
    {
        "url": "github.com",
        "source": "GitHub",
        "category": "Social",
        "params": []
    },
    {
        "url": "dribbble.com",
        "source": "Dribbble",
        "category": "Social",
        "params": []
    },
    {
        "url": "fetlife.com",
        "source": "Fetlife",
        "category": "Social",
        "params": []
    },
    {
        "url": "flixster.com",
        "source": "Flixster",
        "category": "Social",
        "params": []
    },
    {
        "url": "friendsreunited.com",
        "source": "Friends Reunited",
        "category": "Social",
        "params": []
    },
    {
        "url": "friendster.com",
        "source": "Friendster",
        "category": "Social",
        "params": []
    },
    {
        "url": "italki.com",
        "source": "italki",
        "category": "Social",
        "params": []
    },
    {
        "url": "msn.com",
        "source": "msn",
        "category": "Search",
        "params": []
    },
    {
        "url": "mylife.com",
        "source": "mylife",
        "category": "Social",
        "params": []
    },
    {
        "url": "secondlife.com",
        "source": "secondlife",
        "category": "Social",
        "params": []
    },
    {
        "url": "catster.com",
        "source": "catster",
        "category": "Social",
        "params": []
    },
    {
        "url": "fotki.com",
        "source": "fotki",
        "category": "Social",
        "params": []
    },
    {
        "url": "movabletype.com",
        "source": "movabletype",
        "category": "Social",
        "params": []
    },
    {
        "url": "salespider.com",
        "source": "salespider",
        "category": "Social",
        "params": []
    },
    {
        "url": "startpage.com",
        "source": "StartPage",
        "category": "Search",
        "params": [
            "query"
        ]
    },
    {
        "url": "surfcanyon.com",
        "source": "Surf Canyon",
        "category": "Search",
        "params": [
            "q"
        ]
    },
    {
        "url": "tarmot.com",
        "source": "Tarmot",
        "category": "Search",
        "params": [
            "q"
        ]
    },
    {
        "url": "technorati.com",
        "source": "Technorati",
        "category": "Search",
        "params": [
            "q"
        ]
    },
    {
        "url": "comcast.com",
        "source": "comcast",
        "category": "Search",
        "params": []
    },
    {
        "url": "dol2day.com",
        "source": "dol2day",
        "category": "Social",
        "params": []
    },
    {
        "url": "listography.com",
        "source": "listography",
        "category": "Social",
        "params": []
    },
    {
        "url": "rakuten.com",
        "source": "rakuten",
        "category": "Search",
        "params": []
    },
    {
        "url": "wakoopa.com",
        "source": "wakoopa",
        "category": "Social",
        "params": []
    },
    {
        "url": "wechat.com",
        "source": "wechat",
        "category": "Social",
        "params": []
    }
    ]

    # convert referrer_url_source_category_list to a dictionary for faster lookup
    referrer_url_source_category_dict = {}
    source_category_map = {}
    for category_dict in referrer_url_source_category_list:
        if not category_dict["url"] in referrer_url_source_category_dict:
            referrer_url_source_category_dict[category_dict["url"]] = category_dict
        if not category_dict["source"] in source_category_map:
            source_category_map[category_dict["source"].lower()] = category_dict[
                "category"
            ]

    # set utm_source and source_category based on referrer

    source_category = None
    channel_group = None

    def is_paid_medium():
        return utm_medium is not None and (
            utm_medium.find("cp") != -1
            or utm_medium.find("ppc") != -1
            or utm_medium.find("retargeting") != -1
            or utm_medium.find("paid") != -1
        )

    def is_social_medium():
        return utm_medium is not None and utm_medium.lower() in [
            "social",
            "social-network",
            "social-media",
            "sm",
            "social network",
            "social media",
        ]

    def is_paid():
        return is_paid_medium() or clid_str is not None

    def get_info_from_page_referer(page_referrer, url_info):
        global utm_source, source_category, channel_group, utm_term, utm_id, utm_medium, utm_content, utm_term, gclid, utm_campaign, utm_source_platform

        if source_category is None and utm_source is not None:
            source_category = source_category_map.get(utm_source.lower(), None)

        if source_category is None and is_social_medium():
            source_category = "Social"

        print(
            "LOG::get_info_from_page_referer() {url_info}: {page_referrer}, Input:: utm_source: {utm_source}, utm_term: {utm_term}, source_category: {source_category}".format(
                url_info=url_info,
                page_referrer=page_referrer,
                utm_source=utm_source,
                utm_term=utm_term,
                source_category=source_category,
            )
        )

        referrer_term = None
        if page_referrer.find("://") == -1:
            page_referrer = "http://" + page_referrer

        referrer_host_and_path = page_referrer.split("//")[1].split("?")[0]
        query_string = (
            page_referrer.split("?")[1] if len(page_referrer.split("?")) > 1 else None
        )

        referrer_params = {}

        if query_string is not None:
            query_pairs = query_string.split("&")
            for query_pair in query_pairs:
                key_value = query_pair.split("=")
                key = key_value[0]
                val = key_value[1] if len(key_value) > 1 else None
                if val is not None:
                    referrer_params[key] = val

        referrer_host = referrer_host_and_path.split("/")[0]

        find_url_list = [referrer_host_and_path, referrer_host]

        if referrer_host.startswith("www."):
            referrer_host2 = referrer_host.split("www.")[1]
            referrer_host_and_path2 = referrer_host_and_path.split("www.")[1]

            find_url_list.append(referrer_host_and_path2)
            find_url_list.append(referrer_host2)

        for referrer_url in find_url_list:
            category_item = referrer_url_source_category_dict.get(referrer_url, None)
            if category_item is not None:
                utm_source = category_item["source"]
                source_category = category_item["category"]
                query_keys = category_item["params"]
                for key in query_keys:
                    if referrer_params.get(key, None) is not None:
                        if referrer_term is None:
                            referrer_term = referrer_params[key]
                        else:
                            referrer_term += "," + referrer_params[key]
                print(
                    "LOG::find by referrer_url: {referrer_url} -> source_category: {source_category}, utm_source: {utm_source}, referrer_term: {referrer_term}".format(
                        referrer_url=referrer_url,
                        source_category=source_category,
                        utm_source=utm_source,
                        referrer_term=referrer_term,
                    )
                )
                break

        if referrer_term is not None:
            utm_term = referrer_term

        print(
            "LOG::source_category: {source_category}, utm_source: {utm_source}, utm_term: {utm_term}".format(
                source_category=source_category,
                utm_source=utm_source,
                utm_term=utm_term,
            )
        )

        # set channel_group based on rules
        if (
            source_category is None
            and utm_source is not None
            and utm_medium is not None
            and utm_campaign is not None
            and utm_content is not None
            and utm_term is not None
            and utm_id is not None
            and utm_source_platform is not None
        ):
            channel_group = "Direct"

        elif source_category == "Search" and is_paid():
            channel_group = "Paid Search"
        elif source_category == "Search" and (
            utm_medium is None or utm_medium == "organic"
        ):
            channel_group = "Organic Search"
        elif source_category == "Social" and is_paid():
            channel_group = "Paid Social"
        elif source_category == "Social" or is_social_medium():
            channel_group = "Organic Social"
        elif source_category == "Video" and is_paid():
            channel_group = "Paid Video"
        elif source_category == "Video" or (
            utm_medium is not None and utm_medium.find("video") != -1
        ):
            channel_group = "Organic Video"
        elif source_category == "Shopping" and is_paid():
            channel_group = "Paid Shopping"
        elif source_category == "Shopping" or (
            utm_campaign is not None and utm_campaign.find("shop") != -1
        ):
            channel_group = "Organic Shopping"
        elif source_category is None and is_paid_medium():
            channel_group = "Paid Other"
        elif (
            (utm_source is not None and utm_source.find("email") != -1)
            or (utm_medium is not None and utm_medium.find("email") != -1)
            or (referrer is not None and referrer.find("email") != -1)
        ):
            channel_group = "Email"
        elif (utm_source is not None and utm_source.find("sms") != -1) or (
            utm_medium is not None and utm_medium.find("sms") != -1
        ):
            channel_group = "SMS"
        elif utm_medium is not None and utm_medium == "audio":
            channel_group = "Audio"
        elif utm_medium is not None and (
            utm_medium.endswith("push")
            or utm_medium.find("mobile") != -1
            or utm_medium.find("notification") != -1
        ):
            channel_group = "Mobile Push Notifications"
        elif (
            source_category is None
            and referrer is not None
            and referrer.find("internal") != -1
        ):
            channel_group = "Referral"
        elif referrer is not None and referrer.find("Internal") != -1:
            channel_group = "Internal Referral"

        print(
            "LOG::source_category: {source_category}, utm_source: {utm_source}, utm_term: {utm_term}, channel_group: {channel_group}".format(
                source_category=source_category,
                utm_source=utm_source,
                utm_term=utm_term,
                channel_group=channel_group,
            )
        )

        return
        # end def get_info_from_page_referer()

    if utm_source is None and referrer is not None:
        print("LOG::check referrer: {}".format(referrer))
        get_umt_from_url(referrer, "referrer")
        get_info_from_page_referer(referrer, "referrer")

    if utm_source is None and latest_referrer is not None:
        print(
            "LOG::check latest_referrer: {latest_referrer}".format(
                latest_referrer=latest_referrer
            )
        )
        get_umt_from_url(latest_referrer, "latest_referrer")
        get_info_from_page_referer(latest_referrer, "latest_referrer")

    if channel_group is None and utm_source is not None:
        channel_group = "Unassigned"

    if source_category is None and utm_source is not None:
        source_category = "Unassigned"

    # Create a dictionary with the extracted values

    result = {
        "path": page_url_path,
        "query": page_url_query,
        "params": page_url_params,
        "utm_id": utm_id,
        "utm_source": utm_source,
        "utm_medium": utm_medium,
        "utm_campaign": utm_campaign,
        "utm_content": utm_content,
        "utm_term": utm_term,
        "utm_source_platform": utm_source_platform,
        "gclid": gclid,
        "clid_str": clid_str,
        "host": page_url_host,
        "protocol": page_url_protocol,
        "channel_group": channel_group,
        "source_category": source_category,
    }

    return json.dumps(result, sort_keys=True)

return parse_utm_from_url(url, referrer, latest_referrer)

$$ language plpythonu;

