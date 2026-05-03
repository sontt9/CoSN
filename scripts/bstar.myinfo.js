/*
  Bstar (Bili Intl) myinfo VIP unlock
  Target endpoint:
  https://app.biliintl.com/intl/gateway/v*/app/account/myinfo
*/

let body = $response.body;

if (body) {
  try {
    const obj = JSON.parse(body);
    if (obj && obj.data) {
      obj.data.vip_type = 2;
      obj.data.vip_benefit_type = 1;

      if (!obj.data.vip || typeof obj.data.vip !== "object") {
        obj.data.vip = {};
      }

      obj.data.vip.type = 2;
      obj.data.vip.status = 1;
      obj.data.vip.vip_pay_type = 1;
      obj.data.vip.due_date = 4669824160;

      if (!obj.data.vip.label || typeof obj.data.vip.label !== "object") {
        obj.data.vip.label = {};
      }

      if (!obj.data.vip.label.text) {
        obj.data.vip.label.text = "Annual VIP";
      }
    }

    $done({ body: JSON.stringify(obj) });
  } catch (e) {
    $done({ body });
  }
} else {
  $done({});
}
