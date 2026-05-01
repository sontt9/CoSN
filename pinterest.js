function isPromotedPin(item) {
  if (!item || typeof item !== "object") return false;

  return item.is_promoted === true ||
    item.advertiser_id != null ||
    item.ad_data != null ||
    item.ad_destination_url != null ||
    item.ad_targeting_attribution != null ||
    item.promoted_is_removable === true ||
    item.promoter != null;
}

function filterHomeFeed(body) {
  let obj;

  try {
    obj = JSON.parse(body);
  } catch (e) {
    console.log("Pinterest ad filter: failed to parse response body");
    return body;
  }

  if (!obj || !Array.isArray(obj.data)) {
    return body;
  }

  const originalCount = obj.data.length;
  obj.data = obj.data.filter(item => !isPromotedPin(item));
  const removedCount = originalCount - obj.data.length;

  if (removedCount > 0) {
    console.log(`Pinterest ad filter: removed ${removedCount} promoted item(s)`);
  }

  return JSON.stringify(obj);
}

$done({ body: filterHomeFeed($response.body) });
