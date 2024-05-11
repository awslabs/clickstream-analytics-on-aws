
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
          "category": "Search",
          "params": [
            "search_term"
          ],
          "source": "123people",
          "url": "123people.com"
        },
        {
          "category": "Social",
          "params": [],
          "source": "43things",
          "url": "43things.com"
        },
        {
          "category": "Social",
          "params": [],
          "source": "51",
          "url": "51.com"
        },
        {
          "category": "Search",
          "params": [
            "q"
          ],
          "source": "Alexa",
          "url": "alexa.com"
        },
        {
          "category": "Search",
          "params": [
            "q"
          ],
          "source": "AlohaFind",
          "url": "alohafind.com"
        },
        {
          "category": "Search",
          "params": [
            "q"
          ],
          "source": "AltaVista",
          "url": "altavista.com"
        },
        {
          "category": "Search",
          "params": [
            "q"
          ],
          "source": "Arama",
          "url": "arama.com"
        },
        {
          "category": "Search",
          "params": [
            "ask",
            "q",
            "searchfor"
          ],
          "source": "Ask",
          "url": "ask.com"
        },
        {
          "category": "Search",
          "params": [
            "ask",
            "q",
            "searchfor"
          ],
          "source": "Ask",
          "url": "qbyrd.com"
        },
        {
          "category": "Search",
          "params": [
            "ask",
            "q",
            "searchfor"
          ],
          "source": "Ask",
          "url": "searchqu.com"
        },
        {
          "category": "Social",
          "params": [],
          "source": "Badoo",
          "url": "badoo.com"
        },
        {
          "category": "Search",
          "params": [
            "kw",
            "wd",
            "word"
          ],
          "source": "Baidu",
          "url": "baidu.com"
        },
        {
          "category": "Social",
          "params": [],
          "source": "Bebo",
          "url": "bebo.com"
        },
        {
          "category": "Search",
          "params": [
            "q"
          ],
          "source": "Bing",
          "url": "bing.com"
        },
        {
          "category": "Social",
          "params": [],
          "source": "Buzznet",
          "url": "buzznet.com"
        },
        {
          "category": "Search",
          "params": [
            "q"
          ],
          "source": "Claro Search",
          "url": "claro-search.com"
        },
        {
          "category": "Social",
          "params": [],
          "source": "Classmates.com",
          "url": "classmates.com"
        },
        {
          "category": "Search",
          "params": [
            "query"
          ],
          "source": "C\u1ed1c C\u1ed1c",
          "url": "coccoc.com"
        },
        {
          "category": "Search",
          "params": [
            "q"
          ],
          "source": "Daemon search",
          "url": "daemon-search.com"
        },
        {
          "category": "Social",
          "params": [],
          "source": "Douban",
          "url": "douban.com"
        },
        {
          "category": "Social",
          "params": [],
          "source": "Dribbble",
          "url": "dribbble.com"
        },
        {
          "category": "Social",
          "params": [],
          "source": "Facebook",
          "url": "facebook.com"
        },
        {
          "category": "Social",
          "params": [],
          "source": "Fetlife",
          "url": "fetlife.com"
        },
        {
          "category": "Social",
          "params": [],
          "source": "Flixster",
          "url": "flixster.com"
        },
        {
          "category": "Social",
          "params": [],
          "source": "Fotolog",
          "url": "fotolog.com"
        },
        {
          "category": "Social",
          "params": [],
          "source": "Foursquare",
          "url": "foursquare.com"
        },
        {
          "category": "Social",
          "params": [],
          "source": "Friends Reunited",
          "url": "friendsreunited.com"
        },
        {
          "category": "Social",
          "params": [],
          "source": "Friendster",
          "url": "friendster.com"
        },
        {
          "category": "Social",
          "params": [],
          "source": "Gaia Online",
          "url": "gaiaonline.com"
        },
        {
          "category": "Search",
          "params": [
            "q"
          ],
          "source": "Gibiru",
          "url": "gibiru.com"
        },
        {
          "category": "Social",
          "params": [],
          "source": "GitHub",
          "url": "github.com"
        },
        {
          "category": "Search",
          "params": [
            "q"
          ],
          "source": "Google",
          "url": "wwwgoogle.com"
        },
        {
          "category": "Search",
          "params": [
            "q"
          ],
          "source": "Google",
          "url": "gogole.com"
        },
        {
          "category": "Search",
          "params": [
            "q"
          ],
          "source": "Google",
          "url": "gppgle.com"
        },
        {
          "category": "Search",
          "params": [
            "q"
          ],
          "source": "Google",
          "url": "googel.com"
        },
        {
          "category": "Search",
          "params": [
            "query"
          ],
          "source": "Google",
          "url": "darkoogle.com"
        },
        {
          "category": "Search",
          "params": [
            "q"
          ],
          "source": "Google",
          "url": "wow.com"
        },
        {
          "category": "Search",
          "params": [
            "q"
          ],
          "source": "Google",
          "url": "gfsoso.com"
        },
        {
          "category": "Search",
          "params": [
            "q"
          ],
          "source": "Google",
          "url": "monumentbrowser.com"
        },
        {
          "category": "Search",
          "params": [
            "q"
          ],
          "source": "Google syndicated search",
          "url": "googlesyndicatedsearch.com"
        },
        {
          "category": "Social",
          "params": [],
          "source": "Haboo",
          "url": "habbo.com"
        },
        {
          "category": "Social",
          "params": [],
          "source": "Hatena",
          "url": "hatena.com"
        },
        {
          "category": "Shopping",
          "params": [],
          "source": "IGShopping",
          "url": "igshopping.com"
        },
        {
          "category": "Search",
          "params": [
            "q"
          ],
          "source": "InfoSpace",
          "url": "searchya.com"
        },
        {
          "category": "Search",
          "params": [
            "q"
          ],
          "source": "InfoSpace",
          "url": "dogpile.com"
        },
        {
          "category": "Search",
          "params": [
            "q"
          ],
          "source": "InfoSpace",
          "url": "infospace.com"
        },
        {
          "category": "Search",
          "params": [
            "q"
          ],
          "source": "InfoSpace",
          "url": "tattoodle.com"
        },
        {
          "category": "Search",
          "params": [
            "q"
          ],
          "source": "InfoSpace",
          "url": "metacrawler.com"
        },
        {
          "category": "Search",
          "params": [
            "q"
          ],
          "source": "InfoSpace",
          "url": "webfetch.com"
        },
        {
          "category": "Search",
          "params": [
            "q"
          ],
          "source": "InfoSpace",
          "url": "webcrawler.com"
        },
        {
          "category": "Search",
          "params": [
            "query"
          ],
          "source": "IxQuick",
          "url": "ixquick.com"
        },
        {
          "category": "Search",
          "params": [
            "query"
          ],
          "source": "Jungle Key",
          "url": "junglekey.com"
        },
        {
          "category": "Search",
          "params": [
            "q"
          ],
          "source": "K9 Safe Search",
          "url": "k9safesearch.com"
        },
        {
          "category": "Social",
          "params": [],
          "source": "Multiply",
          "url": "multiply.com"
        },
        {
          "category": "Social",
          "params": [],
          "source": "Netlog",
          "url": "netlog.com"
        },
        {
          "category": "Social",
          "params": [],
          "source": "Orkut",
          "url": "orkut.com"
        },
        {
          "category": "Social",
          "params": [],
          "source": "Peepeth",
          "url": "peepeth.com"
        },
        {
          "category": "Social",
          "params": [],
          "source": "Plaxo",
          "url": "plaxo.com"
        },
        {
          "category": "Search",
          "params": [
            "q"
          ],
          "source": "PlusNetwork",
          "url": "plusnetwork.com"
        },
        {
          "category": "Search",
          "params": [],
          "source": "Scour.com",
          "url": "scour.com"
        },
        {
          "category": "Search",
          "params": [
            "q"
          ],
          "source": "SearchLock",
          "url": "searchlock.com"
        },
        {
          "category": "Search",
          "params": [
            "q"
          ],
          "source": "Searchalot",
          "url": "searchalot.com"
        },
        {
          "category": "Search",
          "params": [
            "query"
          ],
          "source": "Setooz",
          "url": "setooz.com"
        },
        {
          "category": "Social",
          "params": [],
          "source": "Sonico.com",
          "url": "sonico.com"
        },
        {
          "category": "Search",
          "params": [
            "query"
          ],
          "source": "StartPage",
          "url": "startpage.com"
        },
        {
          "category": "Social",
          "params": [],
          "source": "StumbleUpon",
          "url": "stumbleupon.com"
        },
        {
          "category": "Search",
          "params": [
            "q"
          ],
          "source": "Surf Canyon",
          "url": "surfcanyon.com"
        },
        {
          "category": "Search",
          "params": [
            "q"
          ],
          "source": "Tarmot",
          "url": "tarmot.com"
        },
        {
          "category": "Search",
          "params": [
            "q"
          ],
          "source": "Technorati",
          "url": "technorati.com"
        },
        {
          "category": "Social",
          "params": [],
          "source": "TikTok",
          "url": "tiktok.com"
        },
        {
          "category": "Social",
          "params": [],
          "source": "Tuenti",
          "url": "tuenti.com"
        },
        {
          "category": "Social",
          "params": [],
          "source": "V2EX",
          "url": "v2ex.com"
        },
        {
          "category": "Social",
          "params": [],
          "source": "Viadeo",
          "url": "viadeo.com"
        },
        {
          "category": "Social",
          "params": [],
          "source": "Vkontakte",
          "url": "vk.com"
        },
        {
          "category": "Social",
          "params": [],
          "source": "WAYN",
          "url": "wayn.com"
        },
        {
          "category": "Social",
          "params": [],
          "source": "WeeWorld",
          "url": "weeworld.com"
        },
        {
          "category": "Social",
          "params": [],
          "source": "Weibo",
          "url": "weibo.com"
        },
        {
          "category": "Social",
          "params": [],
          "source": "Workplace",
          "url": "workplace.com"
        },
        {
          "category": "Social",
          "params": [],
          "source": "XING",
          "url": "xing.com"
        },
        {
          "category": "Search",
          "params": [
            "text"
          ],
          "source": "Yandex",
          "url": "yandex.com"
        },
        {
          "category": "Search",
          "params": [
            "q",
            "query"
          ],
          "source": "Zapmeta",
          "url": "zapmeta.com"
        },
        {
          "category": "Social",
          "params": [],
          "source": "activerain",
          "url": "activerain.com"
        },
        {
          "category": "Social",
          "params": [],
          "source": "activeworlds",
          "url": "activeworlds.com"
        },
        {
          "category": "Social",
          "params": [],
          "source": "addthis",
          "url": "addthis.com"
        },
        {
          "category": "Shopping",
          "params": [],
          "source": "alibaba",
          "url": "alibaba.com"
        },
        {
          "category": "Search",
          "params": [],
          "source": "alice",
          "url": "alice.com"
        },
        {
          "category": "Social",
          "params": [],
          "source": "allnurses",
          "url": "allnurses.com"
        },
        {
          "category": "Social",
          "params": [],
          "source": "allrecipes",
          "url": "allrecipes.com"
        },
        {
          "category": "Social",
          "params": [],
          "source": "alumniclass",
          "url": "alumniclass.com"
        },
        {
          "category": "Shopping",
          "params": [],
          "source": "amazon",
          "url": "amazon.com"
        },
        {
          "category": "Social",
          "params": [],
          "source": "americantowns",
          "url": "americantowns.com"
        },
        {
          "category": "Social",
          "params": [],
          "source": "ancestry",
          "url": "ancestry.com"
        },
        {
          "category": "Social",
          "params": [],
          "source": "anobii",
          "url": "anobii.com"
        },
        {
          "category": "Social",
          "params": [],
          "source": "answerbag",
          "url": "answerbag.com"
        },
        {
          "category": "Search",
          "params": [],
          "source": "aol",
          "url": "aol.com"
        },
        {
          "category": "Social",
          "params": [],
          "source": "aolanswers",
          "url": "aolanswers.com"
        },
        {
          "category": "Social",
          "params": [],
          "source": "artstation",
          "url": "artstation.com"
        },
        {
          "category": "Social",
          "params": [],
          "source": "askubuntu",
          "url": "askubuntu.com"
        },
        {
          "category": "Social",
          "params": [],
          "source": "asmallworld",
          "url": "asmallworld.com"
        },
        {
          "category": "Social",
          "params": [],
          "source": "athlinks",
          "url": "athlinks.com"
        },
        {
          "category": "Search",
          "params": [],
          "source": "avg",
          "url": "avg.com"
        },
        {
          "category": "Social",
          "params": [],
          "source": "baby-gaga",
          "url": "baby-gaga.com"
        },
        {
          "category": "Search",
          "params": [],
          "source": "babylon",
          "url": "babylon.com"
        },
        {
          "category": "Social",
          "params": [],
          "source": "beforeitsnews",
          "url": "beforeitsnews.com"
        },
        {
          "category": "Social",
          "params": [],
          "source": "bharatstudent",
          "url": "bharatstudent.com"
        },
        {
          "category": "Search",
          "params": [],
          "source": "biglobe",
          "url": "biglobe.com"
        },
        {
          "category": "Social",
          "params": [],
          "source": "blackcareernetwork",
          "url": "blackcareernetwork.com"
        },
        {
          "category": "Social",
          "params": [],
          "source": "blackplanet",
          "url": "blackplanet.com"
        },
        {
          "category": "Search",
          "params": [
            "q"
          ],
          "source": "blekko",
          "url": "blekko.com"
        },
        {
          "category": "Social",
          "params": [],
          "source": "blog",
          "url": "blog.com"
        },
        {
          "category": "Social",
          "params": [],
          "source": "bloggang",
          "url": "bloggang.com"
        },
        {
          "category": "Social",
          "params": [],
          "source": "blogger",
          "url": "blogger.com"
        },
        {
          "category": "Social",
          "params": [],
          "source": "blogher",
          "url": "blogher.com"
        },
        {
          "category": "Social",
          "params": [],
          "source": "bloglines",
          "url": "bloglines.com"
        },
        {
          "category": "Social",
          "params": [],
          "source": "blogs",
          "url": "blogs.com"
        },
        {
          "category": "Social",
          "params": [],
          "source": "blogsome",
          "url": "blogsome.com"
        },
        {
          "category": "Social",
          "params": [],
          "source": "blogspot",
          "url": "blogspot.com"
        },
        {
          "category": "Social",
          "params": [],
          "source": "blogster",
          "url": "blogster.com"
        },
        {
          "category": "Social",
          "params": [],
          "source": "blurtit",
          "url": "blurtit.com"
        },
        {
          "category": "Social",
          "params": [],
          "source": "brightkite",
          "url": "brightkite.com"
        },
        {
          "category": "Social",
          "params": [],
          "source": "brizzly",
          "url": "brizzly.com"
        },
        {
          "category": "Social",
          "params": [],
          "source": "buzzfeed",
          "url": "buzzfeed.com"
        },
        {
          "category": "Social",
          "params": [],
          "source": "cafemom",
          "url": "cafemom.com"
        },
        {
          "category": "Social",
          "params": [],
          "source": "camospace",
          "url": "camospace.com"
        },
        {
          "category": "Social",
          "params": [],
          "source": "canalblog",
          "url": "canalblog.com"
        },
        {
          "category": "Social",
          "params": [],
          "source": "care",
          "url": "care.com"
        },
        {
          "category": "Social",
          "params": [],
          "source": "care2",
          "url": "care2.com"
        },
        {
          "category": "Social",
          "params": [],
          "source": "catster",
          "url": "catster.com"
        },
        {
          "category": "Social",
          "params": [],
          "source": "cellufun",
          "url": "cellufun.com"
        },
        {
          "category": "Social",
          "params": [],
          "source": "chegg",
          "url": "chegg.com"
        },
        {
          "category": "Social",
          "params": [],
          "source": "chicagonow",
          "url": "chicagonow.com"
        },
        {
          "category": "Social",
          "params": [],
          "source": "classquest",
          "url": "classquest.com"
        },
        {
          "category": "Search",
          "params": [],
          "source": "cnn",
          "url": "cnn.com"
        },
        {
          "category": "Social",
          "params": [],
          "source": "cocolog-nifty",
          "url": "cocolog-nifty.com"
        },
        {
          "category": "Search",
          "params": [],
          "source": "comcast",
          "url": "comcast.com"
        },
        {
          "category": "Search",
          "params": [],
          "source": "conduit",
          "url": "conduit.com"
        },
        {
          "category": "Social",
          "params": [],
          "source": "cozycot",
          "url": "cozycot.com"
        },
        {
          "category": "Video",
          "params": [],
          "source": "crackle",
          "url": "crackle.com"
        },
        {
          "category": "Social",
          "params": [],
          "source": "crunchyroll",
          "url": "crunchyroll.com"
        },
        {
          "category": "Video",
          "params": [],
          "source": "curiositystream",
          "url": "curiositystream.com"
        },
        {
          "category": "Social",
          "params": [],
          "source": "cyworld",
          "url": "cyworld.com"
        },
        {
          "category": "Video",
          "params": [],
          "source": "dailymotion",
          "url": "dailymotion.com"
        },
        {
          "category": "Search",
          "params": [],
          "source": "daum",
          "url": "daum.com"
        },
        {
          "category": "Social",
          "params": [],
          "source": "deluxe",
          "url": "deluxe.com"
        },
        {
          "category": "Social",
          "params": [],
          "source": "deviantart",
          "url": "deviantart.com"
        },
        {
          "category": "Social",
          "params": [],
          "source": "dianping",
          "url": "dianping.com"
        },
        {
          "category": "Social",
          "params": [],
          "source": "digg",
          "url": "digg.com"
        },
        {
          "category": "Social",
          "params": [],
          "source": "diigo",
          "url": "diigo.com"
        },
        {
          "category": "Video",
          "params": [],
          "source": "disneyplus",
          "url": "disneyplus.com"
        },
        {
          "category": "Social",
          "params": [],
          "source": "disqus",
          "url": "disqus.com"
        },
        {
          "category": "Social",
          "params": [],
          "source": "dogster",
          "url": "dogster.com"
        },
        {
          "category": "Social",
          "params": [],
          "source": "dol2day",
          "url": "dol2day.com"
        },
        {
          "category": "Social",
          "params": [],
          "source": "doostang",
          "url": "doostang.com"
        },
        {
          "category": "Social",
          "params": [],
          "source": "dopplr",
          "url": "dopplr.com"
        },
        {
          "category": "Social",
          "params": [],
          "source": "drugs-forum",
          "url": "drugs-forum.com"
        },
        {
          "category": "Search",
          "params": [],
          "source": "duckduckgo",
          "url": "duckduckgo.com"
        },
        {
          "category": "Social",
          "params": [],
          "source": "dzone",
          "url": "dzone.com"
        },
        {
          "category": "Shopping",
          "params": [],
          "source": "ebay",
          "url": "ebay.com"
        },
        {
          "category": "Social",
          "params": [],
          "source": "elftown",
          "url": "elftown.com"
        },
        {
          "category": "Search",
          "params": [],
          "source": "eniro",
          "url": "eniro.com"
        },
        {
          "category": "Social",
          "params": [],
          "source": "epicurious",
          "url": "epicurious.com"
        },
        {
          "category": "Shopping",
          "params": [],
          "source": "etsy",
          "url": "etsy.com"
        },
        {
          "category": "Social",
          "params": [],
          "source": "everforo",
          "url": "everforo.com"
        },
        {
          "category": "Search",
          "params": [],
          "source": "exalead",
          "url": "exalead.com"
        },
        {
          "category": "Search",
          "params": [],
          "source": "excite",
          "url": "excite.com"
        },
        {
          "category": "Social",
          "params": [],
          "source": "extole",
          "url": "extole.com"
        },
        {
          "category": "Social",
          "params": [],
          "source": "faceparty",
          "url": "faceparty.com"
        },
        {
          "category": "Social",
          "params": [],
          "source": "fandom",
          "url": "fandom.com"
        },
        {
          "category": "Social",
          "params": [],
          "source": "fanpop",
          "url": "fanpop.com"
        },
        {
          "category": "Social",
          "params": [],
          "source": "fark",
          "url": "fark.com"
        },
        {
          "category": "Social",
          "params": [],
          "source": "fb",
          "url": "fb.com"
        },
        {
          "category": "Social",
          "params": [],
          "source": "fc2",
          "url": "fc2.com"
        },
        {
          "category": "Social",
          "params": [],
          "source": "feedspot",
          "url": "feedspot.com"
        },
        {
          "category": "Social",
          "params": [],
          "source": "feministing",
          "url": "feministing.com"
        },
        {
          "category": "Social",
          "params": [],
          "source": "filmaffinity",
          "url": "filmaffinity.com"
        },
        {
          "category": "Social",
          "params": [],
          "source": "flickr",
          "url": "flickr.com"
        },
        {
          "category": "Social",
          "params": [],
          "source": "flipboard",
          "url": "flipboard.com"
        },
        {
          "category": "Social",
          "params": [],
          "source": "folkdirect",
          "url": "folkdirect.com"
        },
        {
          "category": "Social",
          "params": [],
          "source": "foodservice",
          "url": "foodservice.com"
        },
        {
          "category": "Social",
          "params": [],
          "source": "fotki",
          "url": "fotki.com"
        },
        {
          "category": "Social",
          "params": [],
          "source": "friendfeed",
          "url": "friendfeed.com"
        },
        {
          "category": "Social",
          "params": [],
          "source": "fubar",
          "url": "fubar.com"
        },
        {
          "category": "Social",
          "params": [],
          "source": "gamerdna",
          "url": "gamerdna.com"
        },
        {
          "category": "Social",
          "params": [],
          "source": "gather",
          "url": "gather.com"
        },
        {
          "category": "Social",
          "params": [],
          "source": "geni",
          "url": "geni.com"
        },
        {
          "category": "Social",
          "params": [],
          "source": "getpocket",
          "url": "getpocket.com"
        },
        {
          "category": "Social",
          "params": [],
          "source": "glassboard",
          "url": "glassboard.com"
        },
        {
          "category": "Social",
          "params": [],
          "source": "glassdoor",
          "url": "glassdoor.com"
        },
        {
          "category": "Search",
          "params": [],
          "source": "globo",
          "url": "globo.com"
        },
        {
          "category": "Social",
          "params": [],
          "source": "godtube",
          "url": "godtube.com"
        },
        {
          "category": "Social",
          "params": [],
          "source": "goldstar",
          "url": "goldstar.com"
        },
        {
          "category": "Social",
          "params": [],
          "source": "gooblog",
          "url": "gooblog.com"
        },
        {
          "category": "Social",
          "params": [],
          "source": "goodreads",
          "url": "goodreads.com"
        },
        {
          "category": "Search",
          "params": [],
          "source": "google",
          "url": "google.com"
        },
        {
          "category": "Social",
          "params": [],
          "source": "google+",
          "url": "google+.com"
        },
        {
          "category": "Search",
          "params": [],
          "source": "google-play",
          "url": "google-play.com"
        },
        {
          "category": "Social",
          "params": [],
          "source": "googlegroups",
          "url": "googlegroups.com"
        },
        {
          "category": "Social",
          "params": [],
          "source": "googleplus",
          "url": "googleplus.com"
        },
        {
          "category": "Social",
          "params": [],
          "source": "govloop",
          "url": "govloop.com"
        },
        {
          "category": "Social",
          "params": [],
          "source": "gowalla",
          "url": "gowalla.com"
        },
        {
          "category": "Social",
          "params": [],
          "source": "gulli",
          "url": "gulli.com"
        },
        {
          "category": "Social",
          "params": [],
          "source": "hi5",
          "url": "hi5.com"
        },
        {
          "category": "Social",
          "params": [],
          "source": "hootsuite",
          "url": "hootsuite.com"
        },
        {
          "category": "Social",
          "params": [],
          "source": "houzz",
          "url": "houzz.com"
        },
        {
          "category": "Social",
          "params": [],
          "source": "hoverspot",
          "url": "hoverspot.com"
        },
        {
          "category": "Social",
          "params": [],
          "source": "hr",
          "url": "hr.com"
        },
        {
          "category": "Social",
          "params": [],
          "source": "hubculture",
          "url": "hubculture.com"
        },
        {
          "category": "Video",
          "params": [],
          "source": "hulu",
          "url": "hulu.com"
        },
        {
          "category": "Social",
          "params": [],
          "source": "ibibo",
          "url": "ibibo.com"
        },
        {
          "category": "Social",
          "params": [],
          "source": "ig",
          "url": "ig.com"
        },
        {
          "category": "Social",
          "params": [],
          "source": "imageshack",
          "url": "imageshack.com"
        },
        {
          "category": "Social",
          "params": [],
          "source": "imvu",
          "url": "imvu.com"
        },
        {
          "category": "Search",
          "params": [],
          "source": "incredimail",
          "url": "incredimail.com"
        },
        {
          "category": "Social",
          "params": [],
          "source": "insanejournal",
          "url": "insanejournal.com"
        },
        {
          "category": "Social",
          "params": [],
          "source": "instagram",
          "url": "instagram.com"
        },
        {
          "category": "Social",
          "params": [],
          "source": "instapaper",
          "url": "instapaper.com"
        },
        {
          "category": "Social",
          "params": [],
          "source": "intherooms",
          "url": "intherooms.com"
        },
        {
          "category": "Video",
          "params": [],
          "source": "iq",
          "url": "iq.com"
        },
        {
          "category": "Video",
          "params": [],
          "source": "iqiyi",
          "url": "iqiyi.com"
        },
        {
          "category": "Social",
          "params": [],
          "source": "italki",
          "url": "italki.com"
        },
        {
          "category": "Social",
          "params": [],
          "source": "jammerdirect",
          "url": "jammerdirect.com"
        },
        {
          "category": "Social",
          "params": [],
          "source": "jappy",
          "url": "jappy.com"
        },
        {
          "category": "Social",
          "params": [],
          "source": "kaboodle",
          "url": "kaboodle.com"
        },
        {
          "category": "Social",
          "params": [],
          "source": "kakao",
          "url": "kakao.com"
        },
        {
          "category": "Social",
          "params": [],
          "source": "kakaocorp",
          "url": "kakaocorp.com"
        },
        {
          "category": "Social",
          "params": [],
          "source": "kaneva",
          "url": "kaneva.com"
        },
        {
          "category": "Search",
          "params": [],
          "source": "kvasir",
          "url": "kvasir.com"
        },
        {
          "category": "Social",
          "params": [],
          "source": "lang-8",
          "url": "lang-8.com"
        },
        {
          "category": "Social",
          "params": [],
          "source": "librarything",
          "url": "librarything.com"
        },
        {
          "category": "Social",
          "params": [],
          "source": "line",
          "url": "line.com"
        },
        {
          "category": "Social",
          "params": [],
          "source": "linkedin",
          "url": "linkedin.com"
        },
        {
          "category": "Social",
          "params": [],
          "source": "listal",
          "url": "listal.com"
        },
        {
          "category": "Social",
          "params": [],
          "source": "listography",
          "url": "listography.com"
        },
        {
          "category": "Social",
          "params": [],
          "source": "livedoor",
          "url": "livedoor.com"
        },
        {
          "category": "Social",
          "params": [],
          "source": "livedoorblog",
          "url": "livedoorblog.com"
        },
        {
          "category": "Social",
          "params": [],
          "source": "livejournal",
          "url": "livejournal.com"
        },
        {
          "category": "Search",
          "params": [],
          "source": "lycos",
          "url": "lycos.com"
        },
        {
          "category": "Social",
          "params": [],
          "source": "meetup",
          "url": "meetup.com"
        },
        {
          "category": "Social",
          "params": [],
          "source": "menuism",
          "url": "menuism.com"
        },
        {
          "category": "Shopping",
          "params": [],
          "source": "mercadolibre",
          "url": "mercadolibre.com"
        },
        {
          "category": "Social",
          "params": [],
          "source": "messenger",
          "url": "messenger.com"
        },
        {
          "category": "Social",
          "params": [],
          "source": "mix",
          "url": "mix.com"
        },
        {
          "category": "Social",
          "params": [],
          "source": "mocospace",
          "url": "mocospace.com"
        },
        {
          "category": "Social",
          "params": [],
          "source": "mouthshut",
          "url": "mouthshut.com"
        },
        {
          "category": "Social",
          "params": [],
          "source": "movabletype",
          "url": "movabletype.com"
        },
        {
          "category": "Search",
          "params": [],
          "source": "msn",
          "url": "msn.com"
        },
        {
          "category": "Social",
          "params": [],
          "source": "mubi",
          "url": "mubi.com"
        },
        {
          "category": "Social",
          "params": [],
          "source": "myYearbook",
          "url": "myyearbook.com"
        },
        {
          "category": "Social",
          "params": [],
          "source": "myheritage",
          "url": "myheritage.com"
        },
        {
          "category": "Social",
          "params": [],
          "source": "mylife",
          "url": "mylife.com"
        },
        {
          "category": "Social",
          "params": [],
          "source": "mymodernmet",
          "url": "mymodernmet.com"
        },
        {
          "category": "Social",
          "params": [],
          "source": "myspace",
          "url": "myspace.com"
        },
        {
          "category": "Search",
          "params": [],
          "source": "najdi",
          "url": "najdi.com"
        },
        {
          "category": "Search",
          "params": [],
          "source": "naver",
          "url": "naver.com"
        },
        {
          "category": "Video",
          "params": [],
          "source": "netflix",
          "url": "netflix.com"
        },
        {
          "category": "Social",
          "params": [],
          "source": "netvibes",
          "url": "netvibes.com"
        },
        {
          "category": "Social",
          "params": [],
          "source": "newsshowcase",
          "url": "newsshowcase.com"
        },
        {
          "category": "Social",
          "params": [],
          "source": "nexopia",
          "url": "nexopia.com"
        },
        {
          "category": "Social",
          "params": [],
          "source": "niconico",
          "url": "niconico.com"
        },
        {
          "category": "Social",
          "params": [],
          "source": "nightlifelink",
          "url": "nightlifelink.com"
        },
        {
          "category": "Social",
          "params": [],
          "source": "ning",
          "url": "ning.com"
        },
        {
          "category": "Search",
          "params": [],
          "source": "onet",
          "url": "onet.com"
        },
        {
          "category": "Social",
          "params": [],
          "source": "onstartups",
          "url": "onstartups.com"
        },
        {
          "category": "Social",
          "params": [],
          "source": "opendiary",
          "url": "opendiary.com"
        },
        {
          "category": "Social",
          "params": [],
          "source": "over-blog",
          "url": "over-blog.com"
        },
        {
          "category": "Social",
          "params": [],
          "source": "overblog",
          "url": "overblog.com"
        },
        {
          "category": "Social",
          "params": [],
          "source": "photobucket",
          "url": "photobucket.com"
        },
        {
          "category": "Social",
          "params": [],
          "source": "pinboard",
          "url": "pinboard.com"
        },
        {
          "category": "Social",
          "params": [],
          "source": "pingsta",
          "url": "pingsta.com"
        },
        {
          "category": "Social",
          "params": [],
          "source": "pinterest",
          "url": "pinterest.com"
        },
        {
          "category": "Social",
          "params": [],
          "source": "plurk",
          "url": "plurk.com"
        },
        {
          "category": "Social",
          "params": [],
          "source": "posterous",
          "url": "posterous.com"
        },
        {
          "category": "Social",
          "params": [],
          "source": "qapacity",
          "url": "qapacity.com"
        },
        {
          "category": "Social",
          "params": [],
          "source": "quechup",
          "url": "quechup.com"
        },
        {
          "category": "Social",
          "params": [],
          "source": "quora",
          "url": "quora.com"
        },
        {
          "category": "Search",
          "params": [],
          "source": "qwant",
          "url": "qwant.com"
        },
        {
          "category": "Search",
          "params": [],
          "source": "rakuten",
          "url": "rakuten.com"
        },
        {
          "category": "Search",
          "params": [],
          "source": "rambler",
          "url": "rambler.com"
        },
        {
          "category": "Social",
          "params": [],
          "source": "ravelry",
          "url": "ravelry.com"
        },
        {
          "category": "Social",
          "params": [],
          "source": "reddit",
          "url": "reddit.com"
        },
        {
          "category": "Social",
          "params": [],
          "source": "redux",
          "url": "redux.com"
        },
        {
          "category": "Social",
          "params": [],
          "source": "renren",
          "url": "renren.com"
        },
        {
          "category": "Social",
          "params": [],
          "source": "reunion",
          "url": "reunion.com"
        },
        {
          "category": "Social",
          "params": [],
          "source": "reverbnation",
          "url": "reverbnation.com"
        },
        {
          "category": "Social",
          "params": [],
          "source": "ryze",
          "url": "ryze.com"
        },
        {
          "category": "Social",
          "params": [],
          "source": "salespider",
          "url": "salespider.com"
        },
        {
          "category": "Social",
          "params": [],
          "source": "screenrant",
          "url": "screenrant.com"
        },
        {
          "category": "Social",
          "params": [],
          "source": "scribd",
          "url": "scribd.com"
        },
        {
          "category": "Social",
          "params": [],
          "source": "scvngr",
          "url": "scvngr.com"
        },
        {
          "category": "Search",
          "params": [],
          "source": "search-results",
          "url": "search-results.com"
        },
        {
          "category": "Social",
          "params": [],
          "source": "secondlife",
          "url": "secondlife.com"
        },
        {
          "category": "Social",
          "params": [],
          "source": "serverfault",
          "url": "serverfault.com"
        },
        {
          "category": "Search",
          "params": [],
          "source": "seznam",
          "url": "seznam.com"
        },
        {
          "category": "Social",
          "params": [],
          "source": "shareit",
          "url": "shareit.com"
        },
        {
          "category": "Social",
          "params": [],
          "source": "sharethis",
          "url": "sharethis.com"
        },
        {
          "category": "Shopping",
          "params": [],
          "source": "shopify",
          "url": "shopify.com"
        },
        {
          "category": "Shopping",
          "params": [],
          "source": "shopzilla",
          "url": "shopzilla.com"
        },
        {
          "category": "Social",
          "params": [],
          "source": "shvoong",
          "url": "shvoong.com"
        },
        {
          "category": "Shopping",
          "params": [],
          "source": "simplycodes",
          "url": "simplycodes.com"
        },
        {
          "category": "Social",
          "params": [],
          "source": "skype",
          "url": "skype.com"
        },
        {
          "category": "Social",
          "params": [],
          "source": "skyrock",
          "url": "skyrock.com"
        },
        {
          "category": "Social",
          "params": [],
          "source": "smartnews",
          "url": "smartnews.com"
        },
        {
          "category": "Social",
          "params": [],
          "source": "snapchat",
          "url": "snapchat.com"
        },
        {
          "category": "Search",
          "params": [],
          "source": "so",
          "url": "so.com"
        },
        {
          "category": "Social",
          "params": [],
          "source": "social",
          "url": "social.com"
        },
        {
          "category": "Social",
          "params": [],
          "source": "socialvibe",
          "url": "socialvibe.com"
        },
        {
          "category": "Search",
          "params": [],
          "source": "sogou",
          "url": "sogou.com"
        },
        {
          "category": "Social",
          "params": [],
          "source": "spoke",
          "url": "spoke.com"
        },
        {
          "category": "Social",
          "params": [],
          "source": "spruz",
          "url": "spruz.com"
        },
        {
          "category": "Social",
          "params": [],
          "source": "ssense",
          "url": "ssense.com"
        },
        {
          "category": "Social",
          "params": [],
          "source": "stackapps",
          "url": "stackapps.com"
        },
        {
          "category": "Social",
          "params": [],
          "source": "stackexchange",
          "url": "stackexchange.com"
        },
        {
          "category": "Social",
          "params": [],
          "source": "stackoverflow",
          "url": "stackoverflow.com"
        },
        {
          "category": "Social",
          "params": [],
          "source": "stardoll",
          "url": "stardoll.com"
        },
        {
          "category": "Search",
          "params": [],
          "source": "startsiden",
          "url": "startsiden.com"
        },
        {
          "category": "Social",
          "params": [],
          "source": "stickam",
          "url": "stickam.com"
        },
        {
          "category": "Shopping",
          "params": [],
          "source": "stripe",
          "url": "stripe.com"
        },
        {
          "category": "Social",
          "params": [],
          "source": "superuser",
          "url": "superuser.com"
        },
        {
          "category": "Social",
          "params": [],
          "source": "sweeva",
          "url": "sweeva.com"
        },
        {
          "category": "Social",
          "params": [],
          "source": "tagged",
          "url": "tagged.com"
        },
        {
          "category": "Social",
          "params": [],
          "source": "taggedmail",
          "url": "taggedmail.com"
        },
        {
          "category": "Social",
          "params": [],
          "source": "talkbiznow",
          "url": "talkbiznow.com"
        },
        {
          "category": "Social",
          "params": [],
          "source": "techmeme",
          "url": "techmeme.com"
        },
        {
          "category": "Video",
          "params": [],
          "source": "ted",
          "url": "ted.com"
        },
        {
          "category": "Social",
          "params": [],
          "source": "tencent",
          "url": "tencent.com"
        },
        {
          "category": "Search",
          "params": [],
          "source": "terra",
          "url": "terra.com"
        },
        {
          "category": "Social",
          "params": [],
          "source": "tinyurl",
          "url": "tinyurl.com"
        },
        {
          "category": "Social",
          "params": [],
          "source": "toolbox",
          "url": "toolbox.com"
        },
        {
          "category": "Social",
          "params": [],
          "source": "travellerspoint",
          "url": "travellerspoint.com"
        },
        {
          "category": "Social",
          "params": [],
          "source": "tripadvisor",
          "url": "tripadvisor.com"
        },
        {
          "category": "Social",
          "params": [],
          "source": "trombi",
          "url": "trombi.com"
        },
        {
          "category": "Social",
          "params": [],
          "source": "trustpilot",
          "url": "trustpilot.com"
        },
        {
          "category": "Social",
          "params": [],
          "source": "tudou",
          "url": "tudou.com"
        },
        {
          "category": "Social",
          "params": [],
          "source": "tumblr",
          "url": "tumblr.com"
        },
        {
          "category": "Social",
          "params": [],
          "source": "tweetdeck",
          "url": "tweetdeck.com"
        },
        {
          "category": "Video",
          "params": [],
          "source": "twitch",
          "url": "twitch.com"
        },
        {
          "category": "Social",
          "params": [],
          "source": "twitter",
          "url": "twitter.com"
        },
        {
          "category": "Social",
          "params": [],
          "source": "twoo",
          "url": "twoo.com"
        },
        {
          "category": "Social",
          "params": [],
          "source": "typepad",
          "url": "typepad.com"
        },
        {
          "category": "Search",
          "params": [],
          "source": "ukr",
          "url": "ukr.com"
        },
        {
          "category": "Social",
          "params": [],
          "source": "urbanspoon",
          "url": "urbanspoon.com"
        },
        {
          "category": "Social",
          "params": [],
          "source": "ushareit",
          "url": "ushareit.com"
        },
        {
          "category": "Video",
          "params": [],
          "source": "utreon",
          "url": "utreon.com"
        },
        {
          "category": "Social",
          "params": [],
          "source": "vampirefreaks",
          "url": "vampirefreaks.com"
        },
        {
          "category": "Social",
          "params": [],
          "source": "vampirerave",
          "url": "vampirerave.com"
        },
        {
          "category": "Video",
          "params": [],
          "source": "veoh",
          "url": "veoh.com"
        },
        {
          "category": "Video",
          "params": [],
          "source": "vimeo",
          "url": "vimeo.com"
        },
        {
          "category": "Search",
          "params": [],
          "source": "virgilio",
          "url": "virgilio.com"
        },
        {
          "category": "Social",
          "params": [],
          "source": "wakoopa",
          "url": "wakoopa.com"
        },
        {
          "category": "Shopping",
          "params": [],
          "source": "walmart",
          "url": "walmart.com"
        },
        {
          "category": "Social",
          "params": [],
          "source": "wattpad",
          "url": "wattpad.com"
        },
        {
          "category": "Social",
          "params": [],
          "source": "webshots",
          "url": "webshots.com"
        },
        {
          "category": "Social",
          "params": [],
          "source": "wechat",
          "url": "wechat.com"
        },
        {
          "category": "Social",
          "params": [],
          "source": "weebly",
          "url": "weebly.com"
        },
        {
          "category": "Social",
          "params": [],
          "source": "weread",
          "url": "weread.com"
        },
        {
          "category": "Social",
          "params": [],
          "source": "whatsapp",
          "url": "whatsapp.com"
        },
        {
          "category": "Social",
          "params": [],
          "source": "wikihow",
          "url": "wikihow.com"
        },
        {
          "category": "Video",
          "params": [],
          "source": "wistia",
          "url": "wistia.com"
        },
        {
          "category": "Social",
          "params": [],
          "source": "woot",
          "url": "woot.com"
        },
        {
          "category": "Social",
          "params": [],
          "source": "wordpress",
          "url": "wordpress.com"
        },
        {
          "category": "Social",
          "params": [],
          "source": "xanga",
          "url": "xanga.com"
        },
        {
          "category": "Search",
          "params": [],
          "source": "yahoo",
          "url": "yahoo.com"
        },
        {
          "category": "Social",
          "params": [],
          "source": "yammer",
          "url": "yammer.com"
        },
        {
          "category": "Social",
          "params": [],
          "source": "yelp",
          "url": "yelp.com"
        },
        {
          "category": "Video",
          "params": [],
          "source": "youku",
          "url": "youku.com"
        },
        {
          "category": "Video",
          "params": [],
          "source": "youtube",
          "url": "youtube.com"
        },
        {
          "category": "Social",
          "params": [],
          "source": "zalo",
          "url": "zalo.com"
        },
        {
          "category": "Social",
          "params": [],
          "source": "zooppa",
          "url": "zooppa.com"
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


    if utm_source is None and latest_referrer is not None:
        print(
            "LOG::check latest_referrer: {latest_referrer}".format(
                latest_referrer=latest_referrer
            )
        )
        get_umt_from_url(latest_referrer, "latest_referrer")
        get_info_from_page_referer(latest_referrer, "latest_referrer")
    
    if utm_source is None and referrer is not None:
        print("LOG::check referrer: {}".format(referrer))
        get_umt_from_url(referrer, "referrer")
        get_info_from_page_referer(referrer, "referrer")
  
    if channel_group is None and utm_source is not None:
        channel_group = "Unassigned"

    if source_category is None and utm_source is not None:
        source_category = "Unassigned"

    if utm_source is None:
        utm_source = "Driect"
        channel_group = "Direct"
        source_category = "Direct"
    
    if utm_medium is None:
        utm_medium = channel_group

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

