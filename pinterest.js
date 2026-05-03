function parseBody(body) {
  try {
    return JSON.parse(body);
  } catch (e) {
    console.log("Pinterest filter: failed to parse response body");
    return null;
  }
}

function stringifyBody(obj, fallbackBody) {
  try {
    return JSON.stringify(obj);
  } catch (e) {
    console.log("Pinterest filter: failed to stringify response body");
    return fallbackBody;
  }
}

function isPromotedPin(item) {
  if (!item || typeof item !== "object") return false;

  return (
    item.is_promoted === true ||
    item.is_shopping_ad === true ||
    item.advertiser_id != null ||
    item.ad_data != null ||
    item.ad_destination_url != null ||
    item.promoted_ios_deep_link != null ||
    item.ad_targeting_attribution != null ||
    item.ad_targeting_attribution_reasons != null ||
    item.promoted_is_removable === true ||
    item.promoter != null
  );
}

function hasPromotedContent(item) {
  if (!item || typeof item !== "object") return false;

  if (isPromotedPin(item)) {
    return true;
  }

  if (
    item.sponsorship != null ||
    item.affiliate_disclosure != null ||
    item.shopping_mdl_browser_type != null ||
    (item.recommendation_reason &&
      item.recommendation_reason.reason === "PROMOTED_PIN") ||
    (item.board && item.board.is_ads_only === true)
  ) {
    return true;
  }

  const nestedCollections = [
    item.objects,
    item.data,
    item.pins,
    item.results,
    item.items,
  ];

  for (const collection of nestedCollections) {
    if (Array.isArray(collection) && collection.some(hasPromotedContent)) {
      return true;
    }
  }

  const nestedObjects = [
    item.object,
    item.pin,
    item.hero_pin,
    item.primary_pin,
    item.story_pin_data,
    item.collection_pin,
    item.aggregated_pin_data,
  ];

  for (const nested of nestedObjects) {
    if (nested && hasPromotedContent(nested)) {
      return true;
    }
  }

  return false;
}

function isSearchRecommendation(item) {
  if (!item || typeof item !== "object") return false;

  return (
    item.story_type === "slp_search_recommendation" ||
    (item.aux_fields &&
      item.aux_fields.story_type === "slp_search_recommendation")
  );
}

function filterArray(obj, predicate, label, fallbackBody) {
  if (!obj || !Array.isArray(obj.data)) {
    return fallbackBody;
  }

  const originalCount = obj.data.length;
  obj.data = obj.data.filter((item) => !predicate(item));
  const removedCount = originalCount - obj.data.length;

  if (removedCount > 0) {
    console.log(`Pinterest filter: removed ${removedCount} ${label}`);
  }

  return stringifyBody(obj, fallbackBody);
}

function handleResponse() {
  const body = $response.body;
  const obj = parseBody(body);

  if (!obj) {
    return body;
  }

  if (/^https:\/\/api\.pinterest\.com\/v3\/feeds\/home\/(?:\?|$)/.test($request.url)) {
    return filterArray(
      obj,
      hasPromotedContent,
      "promoted item(s) from home feed",
      body,
    );
  }

  if (/^https:\/\/api\.pinterest\.com\/v3\/search\/tab\/(?:\?|$)/.test($request.url)) {
    return filterArray(
      obj,
      (item) => hasPromotedContent(item) || isSearchRecommendation(item),
      "search sponsor/recommendation item(s)",
      body,
    );
  }

  return body;
}

$done({ body: handleResponse() });
