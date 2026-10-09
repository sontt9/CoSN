# CoSN: kế hoạch lớp bảo vệ Việt Nam v2 — MITM được chấp nhận

Ngày: 09/10/2026. Bản đề xuất cập nhật sau nghiên cứu yfamilys (snapshot nghiên cứu giữ tại thư mục local `ref/yfamilys-shadowrocket/`, không thuộc bản phát hành này), dựa trên **7 sgmodule tại root**, cấu hình Shadowrocket, script được tham chiếu và workflow hiện có. Người dùng đã chấp nhận rủi ro MITM. Chấp nhận này không đồng nghĩa chấp nhận sửa subscription, bỏ cảnh báo an toàn, ghi lịch sử duyệt hoặc tự thay cấu hình production.

**Trạng thái:** đề xuất để xem xét; chưa thực hiện sửa module/script/workflow. Đây là phân tích tĩnh, không xác nhận bộ luật hoạt động trên app/thiết bị thật. URL script trỏ `main/master` không đảm bảo nội dung remote giống working tree; chưa tải lại toàn bộ phụ thuộc production trong bước này.

**Backlog chi tiết:** xem [kế hoạch sửa module hiện tại](current-modules-improvement-plan.md) cho YouTube, Shopee, Zalo, Pinterest và module liên quan, với nguồn upstream, dependencies và tiêu chí nghiệm thu. Đây là đề xuất bổ sung, không thay cho phê duyệt triển khai.

## 1. Thay đổi so với kế hoạch trước

- Không bắt đầu từ con số không: dùng hostsVN và các luật app hiện có làm nền.
- **MITM là lớp chủ lực cho quảng cáo cùng hostname, feed JSON và protobuf**, không chỉ là một mục Lab cuối roadmap. DNS/domain vẫn cần vì rẻ, bao phủ rộng và hoạt động khi response không đọc được.
- Ưu tiên sửa wiring, xung đột, hành vi trái mục tiêu trước khi mở rộng.
- Tách ba lựa chọn độc lập: **Ads/Privacy**, **Content/Focus**, **Security**. Bỏ Video/Discovery không phải lúc nào cũng là chặn quảng cáo; không gọi mọi đề xuất hoặc video ngắn là độc hại.
- Không nhập hàng trăm module yfamilys vào production. Chọn kỹ thuật/endpoint có ích, có license và fixture; không kế thừa premium unlock.

## 2. Kiểm kê hiện trạng — toàn bộ module của repo

| Tài sản | Chức năng thấy trong code | Kế thừa | Việc cần làm |
|---|---|---|---|
| [CoSN-shadowrocket.conf](../CoSN-shadowrocket.conf):5–20 | DNS Quad9/Cloudflare; hostsVN exceptions trước blocklist, adult/gambling/threat; fallback DNS system | Nền domain filtering dành cho VN | Xác minh định dạng từng rule-set và đường DNS; tách category nội dung; fallback có thể mất filtering cần kiểm thử, không kết luận đã bypass |
| [CoSN.sgmodule](../CoSN.sgmodule):6–98 | Spotify ads/logging, Reddit events, Zalo Video/discovery/analytics, Shopee tracking/debug, Apple enrollment; Pinterest response filtering; Bili/Bstar | Nền Ads/Privacy và app-specific MITM | Tách scope, bổ sung hostname cần thiết, không gộp enrollment và entitlement vào bảo vệ mặc định |
| [Bili-Enhanced.sgmodule](../Bili-Enhanced.sgmodule):7–82 | Reject/P2P, map JSON/gRPC, jq body rewrite, request/response protobuf, UI; lẫn VIP/account/skin/region | Kỹ thuật nhị phân, ad filter, telemetry | Một nơi sở hữu Bili; tách ads khỏi entitlement và region/UI; giữ cơ chế an toàn bản địa |
| [youtube.sgmodule](../youtube.sgmodule):12–23 | Chặn UDP trên hostname video/API, response binary upstream Maasea, Map Local `initplayback` | Module media có sẵn | Sửa/kiểm tra argument và workflow trước; pin bản đã review; kiểm tra Shorts thực sự ẩn hay chỉ UI |
| [reddit.sgmodule](../reddit.sgmodule):1–18 | Response `gql-fed`, tải Mikephie; mô tả mở khóa và bỏ NSFW | Chỉ mô hình lọc AdPost sau review | Không dùng gói trộn NSFW/entitlement cho bảo vệ; local `reddit.js` **không** được module tải |
| [titktok.sgmodule](../titktok.sgmodule):7–16 | Redirect cả họ domain TikTok, URL Shorts/Reels, mọi `fb.watch` sang trang bên ngoài; không có MITM khai báo | Ý tưởng chế độ Focus | Chuyển thành opt-in rõ ràng, tách TikTok toàn app với Shorts/Reels; kiểm tra hostname/HTTPS, shared CDN, app native; không coi `fb.watch` luôn là Reels |
| [truecaller.sgmodule](../truecaller.sgmodule):1–8 | Script trên endpoint subscription/products, nhãn Gold | Không dùng làm cơ chế anti-scam | `truecaller.js` tạo response quyền lợi; không chứng minh chặn cuộc gọi hay phát hiện số lừa đảo |
| [google-recaptcha.sgmodule](../google-recaptcha.sgmodule):1–11 | Thử Google Search qua nhiều proxy policy | Tiện ích riêng nếu cần | Không đưa vào bảo vệ mặc định; một truy vấn có thể gửi qua nhiều đường proxy, không phải threat detection |

### Script cần chú ý khi kế thừa

- [pinterest.js](../pinterest.js):19–55,67–105,136–162: nhận diện promoted/sponsored, lọc mảng đệ quy trên 5 endpoint. Có fallback JSON lỗi và schema ngoài `data[]`; **cần test false positive** cho affiliate/shopping không phải quảng cáo và giữ pagination/cursor. Chưa có classifier nội dung độc hại.
- [scripts/bstar.enhance.js](../scripts/bstar.enhance.js):21–31: loại cả item không phải object và dùng `includes("ad")` trên type/goto; một type hợp lệ chứa chuỗi `ad` như `download` có thể bị loại. Cần fixture phân biệt ad marker chính xác, không substring rộng. Dòng 61–82 sửa VIP/login/account, phải tách khỏi ad filter.
- `scripts/bstar.myinfo.js`: sửa quyền lợi account; được **cả CoSN và Bili-Enhanced** tải. Nếu thay coverage/options phải kiểm tra cả hai binding, không đổi một phía.
- `scripts/bilibili.json.js` và protobuf request/response là bundle/minified. Cần provenance/source có thể build lại, fixture nhị phân và review phần được sử dụng; không coi file local đồng nghĩa đã audit.
- [reddit.js](../reddit.js):55–74 sửa quyền lợi và xóa trạng thái NSFW. Đây là bằng chứng file local, **không phải xác minh nội dung script Mikephie remote hiện tại**. Module mô tả bỏ NSFW nên gói đó không phù hợp Family cho đến khi tách/review.

## 3. Các vấn đề cụ thể cần ưu tiên

| Mức | Bằng chứng hiện tại | Hệ quả cần kiểm tra | Hướng sửa đề xuất |
|---|---|---|---|
| P0 | `youtube.sgmodule`:17 kết thúc `argument` bằng `"debug":false"`, thiếu `}` JSON | Argument không tạo thành object hợp lệ; chưa khẳng định client sẽ từ chối toàn module hay bỏ argument | Dùng JSON hợp lệ; kiểm tra kết quả transform bằng fixture upstream |
| P0 | [workflow YouTube](../.github/workflows/update-youtube-response.yml):48 thay `{{{启用调试模式}}}}` — có **4 dấu `}`** | Có thể ăn luôn dấu đóng object liền sau placeholder, phù hợp dạng lỗi thấy ở module; cần tái hiện bằng fixture | Thay đúng placeholder 3 dấu, parse JSON sau transform, test không còn placeholder; không chỉ vá tệp sẽ bị sync ghi đè |
| P0 | Workflow:21–24 download với `curl -o`, không có fail-on-HTTP/validation; :63–102 copy rồi commit/push | Error body/upstream thay đổi có thể được publish; chưa nói rằng sự cố đã xảy ra | Download fail-closed, validate module/JS, diff/review gate hoặc beta; cân nhắc bản script bất biến |
| P0 | `CoSN.sgmodule`:42–45 có Shopee HTTPS path rules nhưng :98 không có `ubta.tracking.shopee.vn`, `cdngarenanow-a.akamaihd.net`, `deo.shopeemobile.com` | Đường HTTPS có thể không nhìn thấy để match path nếu không có MITM từ cấu hình khác | Thêm hostname chính xác khi test xác nhận; chỉ match path Shopee, không reject cả CDN |
| P0 | `CoSN` và `Bili-Enhanced` cùng Bili reject/sim_code/Bstar; CoSN có cùng endpoint reject và Map Local | Trùng response handler và cơ chế reject/map; thứ tự client chưa test | Một module sở hữu mỗi endpoint; chọn reject **hoặc** synthetic success theo hành vi retry của app |
| P0 | `Bili-Enhanced`:41–42 Map Local `Teenagers/ModeStatus`; Reddit mô tả bỏ NSFW | Có thể làm suy yếu cơ chế bảo vệ app | Không bật trong Family; giữ cảnh báo/mode bản địa; review bundled script xem còn hành vi tương tự |
| P1 | `titktok.sgmodule` không khai báo MITM, redirect API/video/CDN sang HTML bên ngoài | HTTPS/path coverage không bảo đảm; có thể phá native app và chuyển lưu lượng không cần thiết ra bên thứ ba | Chế độ Focus rõ; reject/synthetic response hoặc trang local phù hợp loại request; không redirect mọi request media/API thành HTML |
| P1 | `CoSN`:48–50 chặn Apple device/MDM enrollment | Là quản trị thiết bị, không phải adblock; có thể ảnh hưởng máy được quản lý hợp pháp | Tách module admin opt-in; không đưa vào lớp bảo vệ mặc định |
| P1 | DNS conf:5–6 trộn resolver security/family, fallback system; :10 `master`, script module `main` | Category có thể không thống nhất; deploy nhầm nhánh nếu cấu trúc remote khác | Profile Security/Family rõ, kiểm tra DNS thật và branch; **không tự đổi URL** trước xác minh deployment |

Workflow thực tế **có trong repo** và lịch khai báo 02:00 UTC hằng ngày/manual dispatch. Phân tích không khẳng định workflow đã chạy thành công hoặc GitHub Actions hiện được bật.

## 4. Kế hoạch phát triển mới — dựa trên tài sản sẵn có

Ước lượng 8–12 tuần cho một người phát triển có thiết bị và người hỗ trợ test. Ưu tiên ứng dụng là đề xuất theo code hiện có và mục tiêu người dùng, không dựa vào thống kê thị phần. Module mới dưới đây là **tên dự kiến**, chưa tồn tại.

| Thứ tự | Đầu ra dự kiến | Kế thừa | Phát triển cụ thể | MITM | Nghiệm thu / gate |
|---|---|---|---|---|---|
| 1 — P0, tuần 1 | Baseline validator + endpoint inventory | 7 module, bindings, workflow | Map endpoint → phase/script/hostname/owner; test placeholder/argument, matcher, URL nguồn; sửa YouTube và coverage Shopee theo chứng cứ | Test chính xác theo host | JSON argument hợp lệ; không còn placeholder sau render; không mất binary settings; không endpoint có 2 owner không chủ đích |
| 2 — P0, tuần 1–2 | `VN-Core-Security` + `VN-Privacy-Core` | hostsVN, domain/telemetry hiện có | Tách threat/ads với adult/gambling; review source/license; allowlist trước deny; tách MDM; xác minh DNS fallback | Domain không cần; path có MITM | Chỉ công bố coverage đã test; positive/negative fixtures; login/OTP/pay không hỏng trong smoke test |
| 3 — P0, tuần 2–3 | `VN-Zalo-Clean` + `VN-Zalo-Focus` | CoSN:17–39 | Clean giữ ads/analytics; Focus mới bỏ Video/Discovery/channel theo lựa chọn. Với config endpoint rộng phải đo ảnh hưởng, không mặc định reject tất cả | Host Zalo cụ thể | Chat cá nhân/nhóm, call/video call, ảnh/file, sticker, QR login hoạt động; clean không vô tình tắt chức năng người dùng cần |
| 4 — P0/P1, tuần 2–4 | `VN-Shopee-Privacy` và ad-response pilot | CoSN:41–45 | Hoàn chỉnh coverage tracking trước; sau đó capture feed/splash hợp lệ để lọc sponsored card nếu khả thi. Lazada là nghiên cứu mới, không giả có luật sẵn | Host tracking/API cụ thể; tránh wildcard CDN | Search, chi tiết hàng, cart, checkout, voucher, đơn hàng, thanh toán hoạt động; không sửa transaction payload, giá hay quyền lợi |
| 5 — P1, tuần 3–4 | `Pinterest-Ads-Clean`, `Spotify-Privacy` | pinterest.js; CoSN:7–12 | Tách module, bổ sung fixture promoted/organic/pagination; thử Spotify theo đúng client Desktop trước khi hứa iOS | Host/endpoint cụ thể | Giữ pin thường/cursor; playback/login Spotify ổn; không dùng ad marker suy ra nội dung độc hại |
| 6 — P1, tuần 3–5 | `Bili-Ads-Clean` / `Bstar-Ads-Clean` | Hai module Bili, JSON/protobuf | Gỡ chồng endpoint; ad-only schema; giữ teenager mode; tách region/skin/VIP ngoài protection; test substring filter | JSON + gRPC nhị phân | Positive/negative ad fixtures, malformed binary pass-through; playback/comment/live/history hoạt động; binary-body-mode và engine bảo toàn |
| 7 — P1, tuần 4–6 | `YouTube-Ads-Clean` + `YouTube-Focus` | Maasea binding + workflow | Guard upstream, pin bản; tách ad cleanup với Shorts/immersive tùy chọn; kiểm endpoint/caption và UDP impact | Protobuf response, host video/API | Player/search/feed/subscription/caption/casting test theo phiên bản; Shorts option có kết quả mô tả đúng, không coi ẩn nút là chặn mọi truy cập |
| 8 — P1, tuần 5–7 | `Reddit-Ads-Clean` + `VN-Focus-Optional` | Reddit module, titktok.sgmodule | Review code thực sự được tải; ad-only Reddit, giữ NSFW; Focus TikTok/Shorts/Reels độc lập, không redirect sang site ngoài mặc định | Reddit GraphQL; host Focus tùy chế độ | Feed/comment/login không hỏng; NSFW warning giữ; TikTok full-block và Reels-only không bị nhập nhằng; có disable/exception |
| 9 — P2, tuần 6–9 | `VN-Web-Clean` và 1 app VN mới | Endpoint techniques từ yfamilys | Chọn site/app theo phản hồi pilot; Safari/browser blocker cho DOM; MITM JSON khi endpoint ổn. Facebook/TikTok ad-only cần gate pinning/schema/khả năng đọc trước | Có nếu khả thi; không ép cho mọi app | Có capture đã làm mờ dữ liệu + fixture + license; không khả thi thì ghi rõ/defer, không quảng cáo hỗ trợ |
| 10 — P1/P2, tuần 8–10 | `VN-Link-Safety` | Threat domain baseline | Ban đầu chặn đích nguy cơ đã xác minh; cảnh báo URL qua UI riêng. Chỉ sửa liên kết feed công khai khi schema chắc; không đọc chat riêng để “AI chống scam” | URL/path nếu cần | Không sửa link giao dịch/signed URL; không gửi URL có token ra dịch vụ; có khiếu nại và rule expiry |
| 11 — P0, tuần 10–12 | Stable VN release / pilot | Các module đã vượt gate | Profile Lite, Clean MITM, Family/Focus; version/changelog, rollback; đo pin/CPU, DNS/latency, xung đột client | Clean profile có MITM | Phiên bản app/client đã test, số lỗi/block nhầm minh bạch; rollback diễn tập thành công; không tuyên bố bảo vệ tuyệt đối |

**MVP nên chốt:** Core Security + Privacy, Zalo Clean/Focus tách riêng, Shopee Privacy, Pinterest Ads, YouTube sau sửa pipeline. Bili được sửa kiến trúc vì đang có rủi ro chồng; mức ưu tiên mở rộng Bili tùy nhóm pilot. Reddit/Focus triển khai sau khi phân tách hành vi trái mục tiêu. Truecaller và Google reCAPTCHA không thuộc MVP bảo vệ.

## 5. Tiêu chuẩn cho MITM trong kế hoạch này

MITM được chấp nhận nhưng không mặc định bật toàn Internet. Tối thiểu cần:

1. Mỗi handler có hostname/endpoint/phase/body-mode rõ; không dùng wildcard toàn cục chỉ để tiện.
2. Phân biệt rule path chỉ nhìn được sau giải mã với domain reject không cần giải mã. Không “thêm MITM” vào app pinning rồi kết luận đã hỗ trợ.
3. Synthetic response phải giữ schema/status cần thiết, tránh retry storm; response lạ phải pass-through nguyên body. Chỉ fail-open cho **transform không nhận diện được**, không tự fail-open threat rule đã xác minh.
4. Không sửa subscription/account/authorization hay tắt guardrail app trong gói Ads/Family. Region/UI tiện ích tách riêng.
5. CA riêng thiết bị, không share private key; không tắt TLS upstream; mặc định không giải mã ngân hàng/ví/OTP/SSO/chat riêng tư. Đây là giới hạn phạm vi đề xuất, không phải phủ nhận quyết định chấp nhận MITM.
6. Mặc định tắt logging nội dung; capture nghiên cứu có đồng ý, tài khoản test, bỏ token/ID/body cá nhân trước lưu fixture.
7. Script remote phải có source/revision/license, review diff và bản rollback. Nếu module vẫn tải upstream trực tiếp thì workflow local không kiểm soát được code thực thi; sửa workflow **và** binding mới khép được chuỗi cung ứng.

## 6. Tập kiểm thử và cách đánh giá

- Repo hiện không có suite/build Node app. Có thể bổ sung harness tối thiểu riêng cho proxy globals (`$request`, `$response`, `$done` và adapter); không convert script production thành Node module chỉ để test.
- Matcher: URL đúng/sai host, có/không query, version khác, chữ tương tự `ad`, shared CDN path không liên quan; khớp dispatch và module pattern.
- JSON: sponsored + organic, null/string trong list, unknown schema, cursor, empty body, parse lỗi, tối đa một lần `$done`.
- Protobuf: fixture nhị phân thật đã làm mờ, frame/encoding giữ nguyên, unknown message pass-through; không thử bằng JSON giả.
- Integration: cài CA/module trên client đích, test app version cụ thể, HTTP/2/QUIC, gzip/binary, login/OTP/payment/chat/call; kiểm cả khi bật nhiều module.
- Metrics: quảng cáo bị loại trên fixture và sample pilot, nội dung thường bị loại nhầm, request retry, latency/pin/CPU, lỗi nền. Không dùng số lượng rule thay tỷ lệ hiệu quả.
- Threat tests bằng fixture/nguồn an toàn, không mở malware sống. Domain-level security không chứng minh lọc hết nội dung bạo lực/tự hại/tin giả trên một mạng xã hội.

## 7. Những giới hạn không thay đổi dù có MITM

Chỉ sửa được response mà client đọc được và biết schema. Pinning, mã hóa tầng app, giao thức không hỗ trợ, schema drift hay content render tại thiết bị vẫn là rào cản. MITM không tự tạo khả năng nhận diện lừa đảo, tin giả hay “độc hại” theo ngữ cảnh. Family/Focus là lựa chọn category và trải nghiệm, không thay đánh giá ngữ nghĩa.

Các điểm chưa xác minh: remote script hiện tại có giống local không; endpoint còn đúng với app phiên bản hiện dùng; nội dung và license hiện thời của rule-set hostsVN; workflow đang chạy hay không; hành vi thứ tự reject/Map Local theo từng proxy client; ngân sách/team/thiết bị pilot. Đây là gate nghiên cứu trước khi triển khai, không lý do để hứa hỗ trợ trước.

**Phạm vi thay đổi tài liệu:** chỉ thêm bản kế hoạch v2 và liên kết từ báo cáo cũ. Cấu hình production, script, workflow và tài liệu hiện trạng runtime không đổi. Không commit/push.
