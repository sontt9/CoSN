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
    item.advertiser_id != null ||
    item.ad_data != null ||
    item.ad_destination_url != null ||
    item.ad_targeting_attribution != null ||
    item.promoted_is_removable === true ||
    item.promoter != null
  );
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

  if (/^https:\/\/api\.pinterest\.com\/v3\/feeds\/home\//.test($request.url)) {
    return filterArray(
      obj,
      isPromotedPin,
      "promoted item(s) from home feed",
      body,
    );
  }

  if (/^https:\/\/api\.pinterest\.com\/v3\/search\/tab\//.test($request.url)) {
    return filterArray(
      obj,
      isSearchRecommendation,
      "search recommendation item(s)",
      body,
    );
  }

  return body;
}

$done({ body: handleResponse() });
