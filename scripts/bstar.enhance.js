/*
  Bstar (Bili Intl) enhancement patch
  - Removes obvious ad cards from feed/recommend responses
  - Removes roll/in-stream ad metadata from view aggregation
  - Unlocks VIP-related media flags in playurl
  - Normalizes VIP flags in account mine payload
*/

const url = ($request && $request.url) || "";
const body = $response && $response.body;

if (!body) {
  $done({});
  return;
}

function isObject(v) {
  return v && typeof v === "object" && !Array.isArray(v);
}

function removeAdCards(list) {
  if (!Array.isArray(list)) return list;
  return list.filter((item) => {
    if (!isObject(item)) return false;
    const cardType = String(item.card_type || "").toLowerCase();
    const gotoType = String(item.goto || item.card_goto || "").toLowerCase();
    if (cardType.includes("ad") || gotoType.includes("ad")) return false;
    if (isObject(item.ad) || isObject(item.ad_info)) return false;
    return true;
  });
}

function patchFeedHome(obj) {
  const data = obj.data;
  if (!isObject(data)) return;
  if (Array.isArray(data.items)) {
    data.items = removeAdCards(data.items);
  }
}

function patchRelates(obj) {
  const data = obj.data;
  if (!isObject(data) || !isObject(data.recommend)) return;
  if (Array.isArray(data.recommend.list)) {
    data.recommend.list = removeAdCards(data.recommend.list);
  }
}

function patchViewAggregation(obj) {
  const data = obj.data;
  if (!isObject(data) || !Array.isArray(data.cards)) return;
  data.cards.forEach((card) => {
    if (!isObject(card) || !isObject(card.meta)) return;
    delete card.meta.roll_ad;
    delete card.meta.in_stream_ad;
    delete card.meta.cm;
    delete card.meta.ad_info;
  });
}

function patchPlayurl(obj) {
  const data = obj.data;
  if (!isObject(data) || !isObject(data.video_info)) return;
  const streams = data.video_info.stream_list;
  if (!Array.isArray(streams)) return;
  streams.forEach((stream) => {
    if (!isObject(stream) || !isObject(stream.stream_info)) return;
    stream.stream_info.need_vip = false;
    stream.stream_info.need_login = false;
    stream.stream_info.valid_vip_type = 0;
  });
}

function patchMine(obj) {
  const data = obj.data;
  if (!isObject(data) || !isObject(data.user_info)) return;
  const userInfo = data.user_info;
  userInfo.is_vip = true;
  userInfo.vip_status = 1;
  userInfo.vip_status_show = true;
  userInfo.vip_benefit_type = 1;
}

try {
  const obj = JSON.parse(body);
  if (!isObject(obj) || !isObject(obj.data)) {
    $done({ body });
    return;
  }

  if (/\/intl\/gateway\/v\d+\/app\/feed\/home(?:\?|$)/.test(url)) {
    patchFeedHome(obj);
  } else if (/\/intl\/gateway\/v\d+\/app\/recommend\/relates(?:\?|$)/.test(url)) {
    patchRelates(obj);
  } else if (/\/intl\/gateway\/v\d+\/app\/view\/aggregation(?:\?|$)/.test(url)) {
    patchViewAggregation(obj);
  } else if (/\/intl\/gateway\/v\d+\/app\/playurl\/player(?:\?|$)/.test(url)) {
    patchPlayurl(obj);
  } else if (/\/intl\/gateway\/v\d+\/app\/account\/mine\/v\d+(?:\?|$)/.test(url)) {
    patchMine(obj);
  }

  $done({ body: JSON.stringify(obj) });
} catch (e) {
  $done({ body });
}
