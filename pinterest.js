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
    item.duplicated_ad_insertions != null ||
    item.promoted_is_removable === true ||
    item.promoted_is_lead_ad === true ||
    item.promoted_is_max_video === true ||
    item.promoted_is_catalog_carousel_ad === true ||
    item.promoter != null
  );
}

function isSponsoredContainer(item) {
  if (!item || typeof item !== "object") return false;

  return (
    item.sponsorship != null ||
    item.affiliate_disclosure != null ||
    item.shopping_mdl_browser_type != null ||
    (item.recommendation_reason &&
      item.recommendation_reason.reason === "PROMOTED_PIN") ||
    (item.type === "pin" && item.board && item.board.is_ads_only === true)
  );
}

function isPromotedItem(item) {
  return isPromotedPin(item) || isSponsoredContainer(item);
}

function isSearchRecommendation(item) {
  if (!item || typeof item !== "object") return false;

  return (
    item.story_type === "slp_search_recommendation" ||
    (item.aux_fields &&
      item.aux_fields.story_type === "slp_search_recommendation")
  );
}

function sanitizePromotedContent(value, stats) {
  if (Array.isArray(value)) {
    const filtered = [];

    for (const item of value) {
      if (isPromotedItem(item)) {
        stats.removed += 1;
        continue;
      }

      const sanitized = sanitizePromotedContent(item, stats);
      if (
        sanitized &&
        typeof sanitized === "object" &&
        sanitized.type === "story" &&
        Array.isArray(sanitized.objects) &&
        sanitized.objects.length === 0
      ) {
        stats.removed += 1;
        continue;
      }

      filtered.push(sanitized);
    }

    return filtered;
  }

  if (!value || typeof value !== "object") {
    return value;
  }

  for (const key in value) {
    if (Object.prototype.hasOwnProperty.call(value, key)) {
      value[key] = sanitizePromotedContent(value[key], stats);
    }
  }

  return value;
}

function filterPinterestData(obj, predicate, label, fallbackBody) {
  if (!obj || !Array.isArray(obj.data)) {
    return fallbackBody;
  }

  const stats = { removed: 0 };
  const originalCount = obj.data.length;

  obj.data = obj.data.filter((item) => {
    if (predicate && predicate(item)) {
      stats.removed += 1;
      return false;
    }
    return true;
  });

  obj.data = sanitizePromotedContent(obj.data, stats);

  const topLevelRemoved = originalCount - obj.data.length;
  if (stats.removed > 0 || topLevelRemoved > 0) {
    console.log(
      `Pinterest filter: removed ${Math.max(stats.removed, topLevelRemoved)} ${label}`,
    );
  }

  return stringifyBody(obj, fallbackBody);
}

function shouldFilterPinterestResponse(url) {
  return /^https:\/\/api\.pinterest\.com\/v3\/(?:feeds\/home|search\/tab|boards\/[^/]+\/ideas\/feed|pins\/[^/]+\/related\/modules|users\/me\/shuffles)\/(?:\?|$)/.test(
    url,
  );
}

function handleResponse() {
  const body = $response.body;
  const obj = parseBody(body);

  if (!obj) {
    return body;
  }

  if (!shouldFilterPinterestResponse($request.url)) {
    return body;
  }

  return filterPinterestData(
    obj,
    isSearchRecommendation,
    "Pinterest sponsored item(s)",
    body,
  );
}

$done({ body: handleResponse() });
