# Kế hoạch sửa và cải thiện module hiện tại

Ngày nghiên cứu: 09/10/2026. Bổ sung chi tiết cho [roadmap v2](vietnam-protection-plan-v2.md); tuân theo [AGENTS.md](../AGENTS.md). Đây là backlog đề xuất, **chưa được phê duyệt triển khai**, không phải lời xác nhận module đã hoạt động. Chỉ thay tài liệu, không sửa binding, workflow hay script production.

## Phạm vi và mức bằng chứng

- **L — Local:** xác minh từ working tree; không đồng nghĩa file remote tại URL deployment giống local.
- **U — Upstream:** đọc source code/tài liệu nguồn chính; URL nhánh có thể đổi sau ngày nghiên cứu.
- **C — Capture required:** giả thuyết cần capture/test trên tài khoản tự nguyện; chưa có schema app hay bằng chứng chặn an toàn.
- Shopee, Zalo, Pinterest đang nằm trong `CoSN.sgmodule`, không có sgmodule riêng. Tách module là lựa chọn kiến trúc cần phê duyệt, không phải việc bắt buộc để sửa lỗi nhỏ.
- Tài liệu này không thay đổi quyết định scope của roadmap/AGENTS. Khi triển khai phải chọn ticket, kiểm nghiệm rồi mới mở rộng; không tự xóa chức năng legacy người dùng đang dùng.

## 1. Thứ tự thực hiện và dependencies

| Đợt | Ticket đề xuất | Mục tiêu | Phụ thuộc |
|---|---|---|---|
| A — sửa nền | BASE-01, YT-01, SH-01 | Harness/validator, argument YouTube, coverage Shopee | Không phụ thuộc việc tổ chức lại module |
| B — giảm chặn nhầm | PIN-01, ZA-01, BILI-01 | Pinterest precision; phân nhóm luật Zalo; kiểm ownership Bili | BASE-01; capture khi cần |
| C — kiểm soát production | YT-02, BASE-02, ZA-02 | Pipeline/revision, hồ sơ module, chiến lược config/response | YT-01; phê duyệt deployment; ZA-01 |
| D — mở rộng có gate | YT-03, SH-02, ZA-03, PIN-02, RED-01, FOCUS-01 | Upstream YouTube, feed ads, category/Focus rõ ràng | Baseline + fixture + test client trước đó |

Không ấn định ngày hoàn thành trước khi có client/app versions và capture. Phần harness/validation có thể làm trên máy; coverage thực tế và compatibility cần thiết bị. Priority P0 là chặn lỗi/phát hành, P1 là độ chính xác/phân tách scope, P2 là nghiên cứu mở rộng.

## 2. Nền dùng chung

### BASE-01 — P0: harness proxy và kiểm tra cấu hình

**Thay đổi dự kiến:** bổ sung harness tối thiểu cung cấp proxy globals, fixture an toàn và validator cho file module/workflow. Giữ platform adapters hiện có; không convert script production thành Node module.

**Nghiệm thu:**
- Đối chiếu URL pattern, dispatch, hostname, request/response phase, `requires-body`, engine và binary mode cho mọi endpoint sửa.
- Render argument/default rồi parse JSON; bắt placeholder chưa thay, duplicate/malformed keys, HTTP error body/HTML thay source.
- Fixture body rỗng/JSON lỗi/schema lạ, organic/ad/cursor, single `$done`; fixture nhị phân riêng cho protobuf.
- Chạy negative URL fixtures, bao gồm endpoint cùng host/CDN ngoài phạm vi.

### BASE-02 — P1: provenance, hồ sơ coverage và rollback

Lập danh mục actual `script-path`, revision/license, endpoint owner và compatibility. Pin **commit/release đã review** nếu đổi binding; blob SHA chỉ nhận diện nội dung đã quan sát, không tự là URL commit hợp lệ. Không tự đổi `master/main` hoặc chuyển upstream sang local mà chưa duyệt deployment.

**Nghiệm thu:** hỗ trợ được mô tả theo client/app version thật; rollback URL/version cụ thể; chỉ số quảng cáo loại/chặn nhầm/retry/latency theo fixture/pilot; không claims 100%. Module legacy có chức năng ngoài protection phải được ghi rõ, không tự xóa.

## 3. YouTube

Files: [youtube.sgmodule](../youtube.sgmodule):17; [workflow](../.github/workflows/update-youtube-response.yml):21–48,63–102; `youtube.response.js` local không phải script mà module tải.

### YT-01 — P0: sửa argument và rendering, không nâng upstream cùng ticket

**L:** argument hiện thiếu dấu đóng object. Workflow thay `{{{启用调试模式}}}}` với 4 dấu đóng; fixture cho thấy nó ăn cả dấu đóng JSON liền sau placeholder. **U:** upstream script dùng `JSON.parse($argument)`, lỗi đi tới catch; kết quả runtime cần thử client chứ không giả định toàn module fail.

**Đề xuất:** sửa transform đúng token; validate JSON sau render; đối chiếu options được script revision đó hỗ trợ. Tránh tuyên bố option có hiệu lực chỉ vì còn trong `#!arguments`: workflow đang hardcode các giá trị trong binding.

**Nghiệm thu:** argument parse được; debug token và object closing brace giữ đúng; thay từng tùy chọn thực sự làm đổi `$argument` theo client đích hoặc bỏ metadata gây hiểu nhầm; không đổi binary binding/endpoint trong hotfix.

### YT-02 — P0: harden pipeline và kiểm soát code thật sự được tải

**L:** download chưa fail-on-HTTP; copy/publish chưa validate. Module tải trực tiếp mutable Maasea `master`, nên workflow kiểm file local không đủ kiểm soát client thực thi.

**Đề xuất:** HTTP/download failure chặn refresh; validate script/module/rendered arguments, review diff, có rollback. Quyết định trước giữa upstream commit-pinned và bản CoSN reviewed; review stable qua PR hoặc promotion beta thay vì publish tự động mọi diff. Đây là thay đổi chính sách deployment cần duyệt, không tự sửa dưới danh nghĩa “fix curl”.

**Nghiệm thu:** 404/500/HTML/empty body/unknown placeholder không được copy/publish; module/script cùng revision; hành vi stable release và rollback được diễn tập. Script JSON/binary checks không thay device tests. Agent không commit/push nếu chưa được yêu cầu.

### YT-03 — P1/P2: migration upstream theo cặp module/script

**U [S1–S2]:** upstream hiện có response `log_event|config`, request `initplayback...&ack` và `log_event`; không còn UDP reject/`initplayback...&oad` Map Local như CoSN. Script có build header `2026/7/19 16:16:39`, supported defaults có `captionLang`, `blockUpload`, `blockImmersive`, `blockShorts` nhưng không thấy `lyricLang`. Không phải cập nhật thả-in tương đương.

**Cải thiện cần quyết định:**
- So sánh version và fixture trước khi thêm handler request; không bật log/config interception chỉ vì upstream thêm.
- Tách ad removal khỏi Focus/UI/enhancement. Code upstream xóa một số rich-item Shorts độc lập `blockShorts`; option này điều khiển guide button, nên `false` không bảo đảm giữ Shorts organic.
- Review PiP/background/download-related settings; không silently bundle với Ads.
- Code upstream lưu `clientKey`/`encryptKey` từ config và chuyển dữ liệu serialized tới debug logger. Xác minh khả năng log thực tế, storage/retention, tắt hoặc làm mờ dữ liệu nhạy cảm trước adoption; không kết luận đã exfiltrate.
- Benchmark giữ/bỏ UDP reject trên client/app thật; luật cũ không chứng minh cần cho upstream mới.

**Nghiệm thu:** binary fixtures cho player/browse/next/search/config và request handler nào chọn; giữ framing, pass-through unsupported; thử playback, seek, caption, Music, login/subscriptions và casting nếu hứa hỗ trợ. Focus tắt giữ nội dung bình thường trong tập test; không in key/token. Report phiên bản, pinning và giới hạn.

## 4. Shopee

Files: [CoSN.sgmodule](../CoSN.sgmodule):41–45,98. Hiện chỉ có tracking/config/debug rules; **chưa có response filter sponsored product**.

### SH-01 — P0: coverage, matcher và mô tả đúng

**L:** path HTTPS trên `ubta.tracking.shopee.vn`, `cdngarenanow-a.akamaihd.net`, `deo.shopeemobile.com` thiếu hostname tương ứng trong MITM module. Thêm hosts là điều kiện nhìn path [S7], không chứng minh app chấp nhận CA.

**Đề xuất:** kiểm mục đích từng path, thêm hostname chính xác nếu cần; nếu endpoint event_batch thực sự độc lập không thiết yếu, cân nhắc domain reject sau capture thay vì thêm MITM không cần thiết. Các path `sentry.json`, `debug.json`, `tp_whitelist.json` là config, chưa đủ chứng cứ chỉ nhìn tên để khẳng định chặn ad/tracker hiệu quả. Thêm boundary `(?:\?|$)` nơi endpoint đầy đủ, giữ prefix chỉ nếu có child paths được chứng minh.

**Nghiệm thu:** shared CDN paths ngoài Shopee và file tên gần giống không match; login/search/cart/checkout/đơn hàng ổn trong test; không capture payment payload; đo retry; mô tả là privacy trên endpoints đã test, không “xóa quảng cáo Shopee” tổng quát.

### SH-02 — P2: mở rộng privacy/feed sau capture

**U [S3]:** `log-collector.shopee.vn`, `userstats.shopee.vn` được hostsVN liệt kê. Đây là leads, không bằng chứng nonessential. Nếu đã nằm trong rule-set CoSN load thì không thêm duplicate handler.

**C:** capture splash/home/search-sponsored trên tài khoản test, chỉ public/product response; xác minh marker và cursor. Loại card ad cụ thể, giữ sản phẩm organic/giá/voucher và transaction semantics. Chọn schema-compatible response nếu reject gây retry. Không tự bịa private API endpoint từ app khác.

**Gate:** không đọc được/pinning hoặc không phân biệt sponsored chắc chắn thì defer feed filter; publish giới hạn. Test product variants, search, cart và normal checkout bằng luồng không giải mã thanh toán nhạy cảm.

## 5. Zalo

Files: [CoSN.sgmodule](../CoSN.sgmodule):17–39. Hiện trộn ads, analytics, user/config, Video/Discovery, broadcast/channel dưới nhãn Ads.

### ZA-01 — P1: phân loại luật và điều khiển Clean/Focus

**Đề xuất:** inventory từng luật thành Ads, Privacy, Focus hoặc chưa rõ. Endpoint `/get/user`, `/get/config`, `/latest_value`, broadcast/channel không mặc định được coi là quảng cáo. `qos-talk.123c.vn` cần test ảnh hưởng QoS/call, không dựa tên để kết luận nonessential.

Giữ controls độc lập: Clean chỉ ads/telemetry có bằng chứng; Focus opt-in cho Video/Discovery/channel. Chọn argument supported hoặc module riêng sau phê duyệt, không reorganize trước khi duyệt. Document thay đổi defaults nếu hiện người dùng đang dựa vào block Video.

**Nghiệm thu:** Focus off không block Video/Discovery trong tập matcher; Clean không xóa content chỉ vì là feed; chat/call/file/sticker/QR login test trên thiết bị, không lưu message body. Capture network status/metadata hoặc host không-chat, tránh MITM private-chat hosts chưa được duyệt.

### ZA-02 — P1: bỏ reject config mù, xử lý đúng schema

**C:** xác minh app phản ứng khi config/splash/popup bị reject. Nếu mixed config có dữ liệu hữu ích, sửa riêng trường quảng cáo. Nếu synthetic response cần thiết thì dùng schema đã ghi nhận, không trả `{}` tùy tiện. Giữ cảnh báo an toàn và thông báo giao dịch/tài khoản.

**Nghiệm thu:** timeout/retry không tăng, config unknown pass-through, không mất update/login behavior; một endpoint một owner. Cần sanitized fixture trước code transform.

### ZA-03 — P2: privacy candidates từ hostsVN

**U [S3]:** `log.api.zaloapp.com`, `log.zalo.video`, `ads.zaloapp.com`, `media-ads.zaloapp.com`, `static-ads.zaloapp.com` là candidates. hostsVN cũng chặn widget/social button nên membership không chứng nhận an toàn với native app.

Check rule-set coverage hiện dùng và exception trước khi thêm; không wildcard `*.zaloapp.com`/`*.zadn.vn`; review từng domain bằng capture. Không đọc chat để phân loại scam trong phase này.

## 6. Pinterest

Files: [pinterest.js](../pinterest.js):19–55,57–105,154–159; [binding](../CoSN.sgmodule):87–91. Bản local có fallback nhưng vẫn lọc mọi mảng con đệ quy và loại search recommendations trên cả 5 endpoint.

### PIN-01 — P1: giảm false-positive, giữ organic

**L:** `affiliate_disclosure`, `shopping_mdl_browser_type`, `sponsorship`, `promoter` hiện đủ điều kiện loại item. Chưa có fixture chứng minh mọi item có các trường đó là paid ad. `slp_search_recommendation` không phải marker quảng cáo đã xác minh; tách thành Focus nếu muốn.

**Đề xuất:** xác minh/ưu tiên explicit promoted marker, endpoint-specific list paths thay vì universal recursion. Khi object `type=story` đã rỗng từ đầu, code hiện cũng có thể loại dù chưa xóa ad; chỉ drop container khi hiểu schema và chính handler đã làm nó rỗng. Nếu không thay đổi nội dung, giữ body nguyên để giảm CPU/serialization.

**Nghiệm thu:** sponsored loại đúng; organic affiliate/shopping/promoter giữ trừ bằng chứng khác; search recommendations giữ khi Focus off; cursor/order/top-level metadata nguyên; JSON lỗi/schema lạ/pass-through và `$done` một lần. Fixture cần provenance; synthetic fixture minh họa logic không chứng minh schema app thật.

### PIN-02 — P2: bổ sung coverage theo capture, không mở matcher chung

**C:** thu mẫu 5 endpoint đang bind gồm home/search/board ideas/related/shuffles; kiểm `data[]` hay nested list theo từng version. Chỉ thêm endpoint/schema khi có sample organic+ad và binding MITM cần thiết. Không tự gộp endpoint account/private messaging.

**U [S6]:** app2smile QQ News lọc `data.widget_list` theo exact `widget_type === 'ad_list'` là technique cho list-path + type marker, **không phải schema Pinterest**. Không copy phần parse/logging thiếu an toàn của ví dụ.

## 7. Những module còn lại

| Ticket | Priority / phạm vi | Việc cần làm | Gate |
|---|---|---|---|
| BILI-01 | P0 ownership, P1 precision | Inventory overlaps giữa CoSN/Bili-Enhanced và reject/Map Local cùng endpoint; chọn owner; review `includes("ad")` và item nonobject trong Bstar | Kiểm cả hai consumer; organic `download` không bị loại bởi substring; JSON/protobuf fixtures |
| BILI-02 | P1 protection scope | Tách quyền lợi/account/region/skin/payment edits và teenager-mode patch khỏi protection sau phê duyệt; giữ safety | Không tự xóa legacy; binary framing và playback/history/comment không hỏng |
| SPOT-01 | P1 Spotify | Test 5 luật Desktop hiện có, boundary/host cần thiết, retry và telemetry purpose; thu hẹp wildcard MITM theo coverage thật | Không suy ra hỗ trợ iOS/Android; login/playback test đúng platform |
| RED-01 | P1 Reddit | Review **Mikephie script remote thực sự được tải**, không chỉ local; ad-only, giữ NSFW và account; pin reviewed revision/license | Fixture GraphQL ad+organic, login/comment/pagination; không chỉ quảng cáo tên module |
| FOCUS-01 | P1 TikTok/Shorts/Reels | Tách full-app block và URL feature; bỏ redirect mọi API/media sang HTML ngoài; `fb.watch` không mặc định = Reels | HTTPS visibility, shared CDN và normal Facebook/YouTube test; không claim full blocking chỉ từ UI |
| DNS-01 | P1 config/hostsVN | Đối chiếu exceptions/rules/rewrite syntax theo client, category Security/Family và resolver/fallback, IPv6; giữ explicit branch URLs cho tới quyết định deployment | Test actual DNS path, safe threat fixtures; không gọi nhiều resolver là cộng dồn blacklist |
| AUX-01 | P2 ngoài protection | Truecaller entitlement không chứng minh anti-call-scam; CAPTCHA routing và MDM enrollment tách khỏi default bundle | Giữ nguyên legacy đến khi duyệt migration, mô tả đúng chức năng |

## 8. Nguồn ngoài đã tham khảo

Đọc ngày 09/10/2026; không truy cập private API app hoặc live malware. Context7 được thử cho service docs nhưng hết quota, nên đọc nguồn chính trực tiếp. Blob SHA dưới là Git object content identity do research ghi nhận, không phải commit SHA hay digest client tự kiểm.

| ID | Nguồn chính | Điều dùng trong kế hoạch / revision quan sát |
|---|---|---|
| S1 | [Maasea YouTube.Enhance.sgmodule](https://github.com/Maasea/sgmodule/blob/master/YouTube.Enhance.sgmodule) | Handler/argument hiện tại; blob `dc3073bf09adcaae999b6e9612fad761a0bfc926` |
| S2 | [Maasea youtube.response.js](https://github.com/Maasea/sgmodule/blob/master/Script/Youtube/youtube.response.js) | JSON.parse, defaults, Shorts behavior, config key storage/logger, playback enhancement; build header không phải commit revision |
| S3 | [hostsVN grouped source](https://github.com/bigdargon/hostsVN/blob/master/source/hosts-VN-group.txt) | Exact Zalo/Shopee candidate domains; blob `474dffacd465a1ed9ea2b2b10c1c64ada5ab1ae5` |
| S4 | [hostsVN README](https://github.com/bigdargon/hostsVN/blob/master/README.md) | Client-specific outputs, mục tiêu hosts; không có private response schemas |
| S5 | [hostsVN exceptions](https://github.com/bigdargon/hostsVN/blob/master/source/exceptions.txt) | Bản đọc chỉ thấy `app.appsflyer.com`; không suy ra không có exception app trong file/lịch sử khác; blob `6406c6d1ff4a92c88fcae82e15442b838d333ed4` |
| S6 | [app2smile qq-news.js](https://github.com/app2smile/rules/blob/master/js/qq-news.js) | Technique exact marker trên known array, không copy thiếu fallback/body logging; blob `9b7c03e1cf08401da24f7eed33699e68a46d30d3` |
| S7 | [Surge MITM documentation](https://manual.nssurge.com/http/mitm.html) | Hostname/CA/pinning; không tự gán toàn bộ hành vi Surge cho Shadowrocket |

Licenses đọc ở source: [Maasea Apache-2.0](https://github.com/Maasea/sgmodule/blob/master/LICENSE), [hostsVN MIT](https://github.com/bigdargon/hostsVN/blob/master/LICENSE), [app2smile MIT](https://github.com/app2smile/rules/blob/master/LICENSE.md). Khi copy/fork giữ license/copyright/notice và đánh dấu sửa theo nghĩa vụ; vẫn kiểm third-party imports riêng. Branch URLs mutable, chưa archive/pin toàn bộ source upstream mới trong bước lập kế hoạch.

## 9. Các quyết định cần chốt trước implementation

1. Client và app versions đích: Shadowrocket, Surge hoặc cả hai; iOS/Desktop ưu tiên nào.
2. Giữ CoSN umbrella có controls hay tách module app; default Focus cũ có tiếp tục hay cần migration.
3. YouTube: hotfix revision hiện có trước, rồi chọn commit-pinned upstream hoặc fork ad-only; chấp thuận release gate mới.
4. Ai cung cấp sanitized capture/device tests cho Shopee/Zalo/Pinterest; thiếu sample thì chỉ làm static/harness fixes, không hứa feed-ad coverage.

Đề xuất bắt đầu **BASE-01 + YT-01**, tiếp **SH-01 và PIN-01** sau khi đủ fixture; ZA-01 phân loại trước khi đổi default. Mỗi ticket được chọn phải có thay đổi nhỏ, focused tests và rollback; chưa cần đồng loạt đổi mọi module hay xây framework lớn.
