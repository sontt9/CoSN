# Nghiên cứu kiểm thử Shadowrocket và MITM tự động

Ngày nghiên cứu: 2026-10-09. Đây là phương án khả thi, **chưa phải lab đã triển khai hoặc device-verified**. Không cài CA, không thu traffic, không đổi cấu hình production trong nghiên cứu này.

## Kết luận

Có thể tự động phân tích traffic, tạo fixture và chạy regression test sau khi người dùng provision một môi trường thử nghiệm. Không có bằng chứng về một emulator/headless runner tương đương Shadowrocket có thể tự chứng nhận mọi module.

Phải tách ba loại bằng chứng:

| Mức | Chứng minh được | Không chứng minh được |
| --- | --- | --- |
| Node VM + fixture + kiểm tra cấu hình | Logic script trên dữ liệu đã biết; fallback; completion; matcher/host/argument invariants | Parser, engine và mạng thực của Shadowrocket |
| mitmproxy + app thật | Endpoint/schema thực; request/response quan sát được; replay và phân tích | Module Shadowrocket đã được load và thực thi đúng |
| Shadowrocket thật + app/client thử nghiệm | Hành vi client/module trên phiên bản và flow đã chạy | Mọi phiên bản app, endpoint hoặc giao thức chưa thử |

## Hiện trạng repo

- `CoSN-shadowrocket.conf` chứa remote rule sets; không có binding `[Script]`; `[URL Rewrite]` và `[MITM]` trống. `update-url` dùng `master`.
- Script bindings nằm trong các `.sgmodule`; ví dụ `youtube.sgmodule` dùng các bản script CoSN trên `main`, binary-body mode và arguments riêng. Cần xác minh **cấu hình hiệu lực** trên client, không suy ra từ file local hoặc extension `.sgmodule` rằng Shadowrocket đã load mọi tính năng giống Surge.
- `tests/protection.test.js` chạy scripts trong Node VM với proxy globals giả lập. `tests/test_youtube_update.py` kiểm tra renderer/upstream invariants.
- Đã chạy `python3 -m unittest discover -s tests -p 'test_*.py'`: 5 pass; `node --test tests/protection.test.js`: 11 pass. Đây là kết quả harness tại working tree hiện tại, không phải device test.
- Thiếu fixture phủ toàn bộ JSON scripts, binary Bili và nhiều schema YouTube; chưa có bằng chứng tự động về config import, script execution, pinning, retries và UI flow trên Shadowrocket.

## Lựa chọn môi trường

### 1. Shadowrocket trên Mac: thử runtime thật sớm

App Store chính thức liệt kê hỗ trợ Mac bên cạnh iPhone/iPad. Mô tả sản phẩm có ghi request recording, HTTPS decryption, URL rewrite, script filtering và import config. Release history có Map Local và tunnel-control intents. Không tìm được public CLI, debugger protocol, assertion API hay giao diện export tự động được tài liệu chính thức xác nhận [1][2].

Đề xuất: cài bản hợp lệ trên Mac, import một cấu hình lab tách biệt, chạy client HTTP tới test origin có response kiểm soát, xác minh output sau module. Với endpoint hard-code, lab cần giữ đúng hostname/path để matcher và dispatch thật được kích hoạt; không thay regex production chỉ để localhost test pass. Thiết kế DNS/origin/replay cho việc này cần pilot riêng.

Mac giúp kiểm tra parser/engine thực nhưng không chứng minh app iOS có cùng endpoint hoặc hành vi, và chưa xác minh parity của mọi feature giữa các nền tảng. Không khẳng định CPU compatibility ngoài thông tin App Store.

### 2. iPhone thật + mitmproxy trên Mac: thu evidence

Regular proxy mode cho phép thiết bị dùng HTTP(S) proxy trên Mac. Một số app bỏ qua system proxy; local capture chỉ áp dụng cho process trên cùng máy. WireGuard mode là lựa chọn cho thiết bị ngoài, nhưng không mặc định giả định hai VPN client trên iPhone có thể cùng hoạt động [3].

HTTPS body chỉ đọc được nếu app tin CA của lab và không chặn bằng pinning. iOS yêu cầu bật full trust riêng cho certificate profile cài thủ công [4][5]. CA của mitmproxy có private key: không chia sẻ `mitmproxy-ca.pem`; dùng CA riêng cho lab và bảo vệ key [5].

Chạy các phiên **baseline**, **candidate module**, và **rollback** riêng với cùng flow, phiên bản và dữ liệu kiểm soát. Với phiên candidate, phải có evidence từ Shadowrocket thực sự bật module và script chạy; quan sát bằng mitmproxy độc lập không đủ chứng nhận điều này.

Không mặc định chồng hai lớp MITM. Forwarding/chaining có thể là hướng thử, nhưng trust từng hop, vị trí quan sát trước/sau rewrite, routing loop và binary preservation phải được kiểm chứng. Hiện chưa có lab chain Shadowrocket → mitmproxy đã xác nhận.

### 3. Simulator không phải lối tắt cho App Store apps

Apple phân biệt build cho device và Simulator ngay cả khi đều arm64 [6]. Không tìm thấy bản Simulator của Shadowrocket; vì vậy không đề xuất lấy IPA App Store rồi chạy trong Simulator. Simulator hữu ích khi sở hữu source và Simulator build của app thử nghiệm, không thay thế iPhone chạy app thương mại.

### 4. Appium/XCUITest cho UI regression trên iPhone

Sau provisioning, Appium có thể điều khiển app đã cài bằng `bundleId`. Cần WebDriverAgent có signing/provisioning hợp lệ, device trust, Developer Mode phù hợp và UI Automation [10]. Không khẳng định luôn cần paid membership: tài liệu có đề cập free-account identity, nhưng các giới hạn tài khoản cần kiểm tra khi setup.

Đây là UI automation, không phải MITM hoặc emulator runtime. Khả năng điều khiển màn hình Shadowrocket, import/reload module và trích xuất log phải thử thực tế; một số thao tác hệ thống cần người dùng thực hiện ban đầu.

## Phần agent có thể tự làm sau provisioning

1. Static audit: rule ownership, positive/negative URL matches, script dispatch, MITM host, arguments, unresolved placeholders và dependencies.
2. Chạy mitmdump/addons trong phạm vi phê duyệt; phân loại endpoint, decode JSON hoặc binary theo đúng schema; báo unknown/unsupported, không sửa đoán.
3. Tạo fixture đã redact từ capture được đồng ý; giữ framing/encoding cho protobuf, không thay bằng JSON giả.
4. Replay offline và chạy script JavaScript nguyên bản bằng harness; kiểm tra organic/ad, pagination/cursors, malformed/empty/unknown bodies và exactly-once `$done`.
5. Lặp UI flow qua Appium nếu device đã sẵn sàng; so sánh baseline/candidate/rollback; tạo báo cáo PASS/FAIL/UNSUPPORTED/NOT TESTED có evidence và phiên bản.

mitmproxy hỗ trợ addons Python, saved flows, filtered persistence và replay [7][8]. Viết lại script thành Python chỉ kiểm tra ý tưởng, **không chứng minh script Shadowrocket nguyên bản chạy đúng**. Server replay cần quyết định rõ xử lý request không match: default forwarding không tạo test offline deterministic. Replay còn có cơ chế refresh thời gian/header nên phải ghi rõ options [7][8].

## Blind spots và an toàn

- CA trust không vượt qua certificate pinning. Không tự sửa app hoặc bypass pinning; ghi nhận endpoint không hỗ trợ body inspection [5].
- HTTP/3: mitmproxy tài liệu hiện tại hỗ trợ ở reverse/local/WireGuard, không regular proxy; có hạn chế QUIC version và replay. WebSocket replay cũng chưa hỗ trợ [9]. Chặn UDP có thể đổi hành vi hoặc làm app lỗi, không đảm bảo fallback.
- Không thấy traffic không có nghĩa rule block thành công: có thể DNS/cache, bypass, app không gọi endpoint, pinning hoặc giao thức chưa quan sát.
- `allow_hosts`/`ignore_hosts` có semantics theo mode và CONNECT/SNI. Display filter không giới hạn interception; save filter chỉ giới hạn persistence. Plain HTTP trong regular/upstream không được ignore theo cơ chế này, nên host filter không phải privacy boundary hoàn chỉnh [8][11].
- Ưu tiên tài khoản/app test chuyên dụng; không để banking, wallets, OTP/SSO, private chat vào interception mặc định. Chỉ mở listener cho thiết bị lab cần thiết; không expose proxy công khai.
- Headers, cookies, token, URL query và body có thể chứa secrets. Không lưu raw flow/HAR vào git; chỉ fixture đã redact được duyệt mới trở thành test assets. Không xem việc bỏ header là đã làm sạch mọi dữ liệu cá nhân.
- Khi kết thúc: dừng capture/listener và UI automation, tắt cấu hình lab/khôi phục config trước đó; gỡ profile/CA trust thử nghiệm, xóa raw capture theo retention đã thống nhất. Không đổi URL `master`/`main` production trong quá trình thử.

## Pilot đề xuất, chưa được triển khai

Chọn **một module, một endpoint và một flow không nhạy cảm** trước, ưu tiên JSON như Pinterest với fixture hiện có; để YouTube/Bili protobuf cho vòng sau.

Đầu vào cần chốt: Mac/OS/Shadowrocket phiên bản nào; có iPhone dành cho test không; app/version/bundleId; module và arguments thực sự được bật; account test; hostname/endpoint được phép giải mã; capture retention và mục tiêu flow.

Tiêu chí pilot:

- Ghi lại config hiệu lực và source revision/digest; tránh remote branch thay đổi giữa các lần chạy. Digest trong báo cáo không có nghĩa proxy client enforce hash.
- Chứng minh request đi qua client và binding phù hợp chạy đúng một lần; phân biệt không match, pass-through, transformed, rejected và lỗi.
- Fixture có marker ads rõ và organic/cursor/account fields được giữ nguyên; unknown/malformed/binary unsupported pass-through.
- Flow organic hoạt động; không xuất hiện retry loop; rollback khôi phục baseline. Không kết luận effectiveness chỉ vì UI không hiện quảng cáo trong một lần thử.
- Báo rõ giao thức và endpoint không thấy/không đọc được; không gắn nhãn production-verified nếu chỉ harness/Mac-only.

## Nguồn chính thức

1. Shadowrocket App Store, capabilities/compatibility/release history: https://apps.apple.com/us/app/shadowrocket/id932747118
2. Developer website: https://shadowlaunch.com/
3. mitmproxy modes, macOS local capture, explicit proxy and WireGuard: https://docs.mitmproxy.org/stable/concepts/modes/
4. Apple, trust manually installed certificate profiles: https://support.apple.com/en-us/102390
5. mitmproxy certificates, CA files and pinning: https://docs.mitmproxy.org/stable/concepts/certificates/
6. Apple TN3117, device versus Simulator platform builds: https://developer.apple.com/documentation/technotes/tn3117-resolving-build-errors-for-apple-silicon
7. mitmproxy capture/replay features: https://docs.mitmproxy.org/stable/overview/features/
8. mitmproxy options: https://docs.mitmproxy.org/stable/concepts/options/
9. mitmproxy protocol support/limitations: https://docs.mitmproxy.org/stable/concepts/protocols/
10. Appium XCUITest: https://appium.github.io/appium-xcuitest-driver/latest/preparation/real-device-config/ ; https://appium.github.io/appium-xcuitest-driver/latest/getting-started/provisioning-profile/auto-config/ ; https://appium.github.io/appium-xcuitest-driver/latest/reference/capabilities/
11. mitmproxy ignore semantics: https://docs.mitmproxy.org/stable/howto/ignore-domains/
12. mitmproxy addons: https://docs.mitmproxy.org/stable/addons/overview/

Context7 lookup cho mitmproxy/Appium không khả dụng do quota trong phiên nghiên cứu; đã đọc nguồn chính thức trực tiếp. Các kiến trúc đề xuất là suy luận khả thi từ capabilities, không phải integration đã thực nghiệm. Tài liệu và App Store có thể thay đổi; ghi lại phiên bản khi pilot.
