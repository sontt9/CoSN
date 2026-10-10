# Nghiên cứu lọc quảng cáo trong feed TikTok

Ngày tra cứu: 2026-10-06. Đọc mã nguồn/config và tài liệu; chưa kiểm thử trên thiết bị. Tìm kiếm không bao phủ toàn bộ GitHub.

## Kết luận

Chưa xác minh được một cặp script + config Surge/Shadowrocket lọc quảng cáo trong response feed **TikTok quốc tế** đủ bằng chứng để khuyến nghị dùng trên app hiện tại. Có script lọc feed **Douyin**, nhưng không thể coi đó là hỗ trợ TikTok. Các module TikTok unlock và rule reject endpoint quảng cáo riêng không tương đương lọc feed.

## Script có logic lọc thực sự: Choler/Surge — Douyin legacy

- [Script `douyin.js`](https://raw.githubusercontent.com/Choler/Surge/master/Script/douyin.js) đọc JSON response, duyệt ngược `aweme_list` và xóa phần tử có `is_ads == true`, rồi trả body qua `$done`.
- Script không chỉ lọc quảng cáo: nó sửa watermark/quyền tải xuống và mặc định loại một số mục live không có `images`/`video`. Các nhánh `data` và `aweme_detail` không áp dụng cùng kiểm tra quảng cáo như `aweme_list`. Không nên nhập nguyên script nếu mục tiêu là ad-only.
- [Module tiêu thụ](https://raw.githubusercontent.com/Choler/Surge/master/Module/douyin.sgmodule) dùng `type=http-response`, `requires-body=1`, script-path trên `Choler.github.io`; MITM `%APPEND% api*.amemv.com, aweme.snssdk.com`. Matcher script chỉ bắt `aweme.snssdk.com/aweme/v[12]/`, không có hostname TikTok quốc tế.
- Endpoint bao phủ: `feed`, `follow/feed`, `nearby/feed`, `aweme/post`, `hot/search/video/list`, `mix/aweme`, `aweme/detail`; matcher yêu cầu dấu `/` và query tiếp theo.
- Module ghi hỗ trợ tới Douyin 16.2.0. [Lịch sử script](https://api.github.com/repos/Choler/Surge/commits?path=Script/douyin.js&per_page=1) và [module](https://api.github.com/repos/Choler/Surge/commits?path=Module/douyin.sgmodule&per_page=1) cho thấy lần thay đổi gần nhất lần lượt là 2021-06-12 và 2021-06-16 tại thời điểm tra cứu.
- Báo cáo người dùng: [16.3.0 không còn hỗ trợ](https://github.com/Choler/Surge/issues/18), [tràn bộ nhớ Surge](https://github.com/Choler/Surge/issues/14), [rewrite ảnh hưởng comment/shop](https://github.com/Choler/Surge/issues/17). Đây không phải kết quả kiểm thử của nghiên cứu này.

## Nguồn TikTok không đáp ứng mục tiêu lọc feed

| Nguồn | Chức năng xác minh từ config | Không chứng minh được |
| --- | --- | --- |
| Semporia/TikTok-Unlock: [Surge](https://raw.githubusercontent.com/Semporia/TikTok-Unlock/master/Surge/TiKTok-US.sgmodule), [Shadowrocket](https://raw.githubusercontent.com/Semporia/TikTok-Unlock/master/Shadowrocket/TiKTok-US.conf) | Rewrite vùng, `mcc_mnc`, cấu hình `tnc/dm`, version | Không có response script lọc ad-marker |
| [limbopro/tiktok.conf](https://raw.githubusercontent.com/limbopro/Profiles4limbo/master/tiktok.conf) | Unlock legacy | Không có JS lọc feed |
| [NobyDa/RewriteRules.sgmodule](https://raw.githubusercontent.com/NobyDa/Script/master/Surge/Module/RewriteRules.sgmodule) | Có reject `apiN.tiktokv.com/api/ad/` | Reject endpoint riêng không loại các mục quảng cáo trong danh sách feed |

[README Semporia](https://raw.githubusercontent.com/Semporia/TikTok-Unlock/master/README.md) hướng dẫn unlock qua routing mà không cần MITM/rewrite; điều đó không chứng minh có thể sửa response quảng cáo mà không cần MITM.

## Điều kiện và phần chưa xác minh

- [Tài liệu Surge MITM](https://manual.nssurge.com/http/mitm.html): cần CA được hệ thống tin cậy và hostname được MITM; app dùng certificate pinning có thể từ chối certificate MITM. Chưa xác minh TikTok iOS hiện tại có pinning trên endpoint feed hay không.
- [Tài liệu Surge HTTP response](https://manual.nssurge.com/scripting/http-response.html): `requires-body` cung cấp body cho script và cần buffer response; `binary-body-mode` cung cấp dữ liệu nhị phân, không tự giải mã protobuf. Script Choler chỉ xử lý JSON. Chưa xác minh format feed TikTok hiện tại là JSON hay binary.
- Chưa xác minh endpoint/hostname, schema, trường đánh dấu quảng cáo hiện tại hoặc khả năng chạy script Choler trên Shadowrocket. Không suy từ tên repo/module rằng đã hỗ trợ TikTok hoặc client khác.

## Hướng tiếp theo

Dùng Choler làm tài liệu tham khảo predicate JSON, không nhập module Douyin vào TikTok. Trước khi viết bộ lọc mới, capture response feed thực tế trên đúng app/client: xác minh MITM đọc được body, endpoint và ad-marker; sau đó chỉ lọc quảng cáo, giữ metadata/phân trang và trả nguyên response khi schema không phù hợp. Nếu MITM không đọc được response, chưa có cơ sở triển khai hướng lọc feed này.
