/*
  Bstar (Bili Intl) myinfo VIP unlock
  Target endpoint:
  https://app.biliintl.com/intl/gateway/v*/app/account/myinfo
*/

const body = $response.body;

if (!body) {
  $done({});
  return;
}

try {
  const obj = JSON.parse(body);
  if (!obj || typeof obj !== "object" || !obj.data || typeof obj.data !== "object") {
    $done({ body });
    return;
  }

  const data = obj.data;

  data.vip_type = 2;
  data.vip_benefit_type = 1;

  if (!data.vip_benefits || typeof data.vip_benefits !== "object") {
    data.vip_benefits = {};
  }
  if (!data.vip_benefits.limit_speed || typeof data.vip_benefits.limit_speed !== "object") {
    data.vip_benefits.limit_speed = {};
  }
  data.vip_benefits.limit_speed.enable_limit_speed = false;
  data.vip_benefits.limit_speed.speed = 0;

  if (!data.vip || typeof data.vip !== "object") {
    data.vip = {};
  }
  data.vip.type = 2;
  data.vip.status = 1;
  data.vip.vip_pay_type = 1;
  data.vip.theme_type = data.vip.theme_type || 0;
  data.vip.due_date = 4669824160;
  data.vip.avatar_subscript = 1;

  if (!data.vip.label || typeof data.vip.label !== "object") {
    data.vip.label = {};
  }
  data.vip.label.path = data.vip.label.path || "";
  data.vip.label.text = data.vip.label.text || "Annual VIP";
  data.vip.label.label_theme = data.vip.label.label_theme || "annual_vip";

  if (!data.vip.nickname_color) {
    data.vip.nickname_color = "#FB7299";
  }

  $done({ body: JSON.stringify(obj) });
} catch (e) {
  $done({ body });
}
