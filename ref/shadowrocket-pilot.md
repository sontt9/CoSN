# Pilot Mac: Shadowrocket + synthetic Pinterest

## Scope và trạng thái

**Kết quả mới nhất: synthetic HTTPS-origin cycle hoàn tất — baseline 7/7, candidate 7/7, rollback 7/7 PASS.** Shadowrocket Mac 2.2.90 (3378), macOS 15.8.1; nguyên bản `pinterest.js`, TLS verification bật. Runtime transformation có log và assertions; không test app/iPhone thật. Các đoạn bên dưới ghi diễn tiến theo thời gian, gồm các blocker đã giải quyết. Cleanup system trust/process và restore config production còn cần người dùng thực hiện.

User đã đồng ý pilot chỉ trên Mac, dữ liệu giả, không account/app Pinterest/iPhone, không thu traffic thật. Không sửa production module hoặc trust hệ thống tự động. `scripts/shadowrocket_pilot.py` cung cấp config và **snapshot nguyên bản** của `pinterest.js` qua listener loopback `127.0.0.1:8765`. Không serve cả repo, không ghi request logs hoặc raw traffic.

Kết quả chuẩn bị 2026-10-09: macOS 15.8.1 ARM64; Shadowrocket cài đặt 2.2.90 (3378). 9 Python tests và 11 Node tests pass; HTTP asset server đã kiểm tra và xác nhận listen chỉ `127.0.0.1:8765`. Script snapshot SHA-256: `09d10d3c8efe6f31cf8e82cbdc4691584ca818b50d716f74b3697a165614544a`. **Baseline/candidate/rollback trên Shadowrocket chưa chạy**, đang chờ import config, loopback listener và public CA do người dùng chuẩn bị. Không có kết luận runtime pass.

Lần chạy tiếp theo, 2026-10-09: user phê duyệt LAN sharing `192.168.8.129:1082`; agent dùng `127.0.0.1:1082` và public CA ngoài repo. Bảy Python baseline attempts fail trước HTTP với `SSLCertVerificationError`; diagnostic trả code 85, `Missing Authority Key Identifier`. Một probe mixed bằng `/usr/bin/curl` (SecureTransport, TLS verification vẫn bật) trả HTTP **401**, không phải fixture 200. Dừng thử vì config/Map Local hiệu lực và containment chưa được chứng minh; không biết 401 do local handler hay upstream, không coi là offline success. Không disable verification, không lưu response body/credentials. Candidate và rollback chưa chạy. Cần xác nhận config đang chọn, compiled Map Local và host mapping trước khi thử tiếp. Bốn focused pilot tests pass sau cập nhật policy. Đoạn “chưa chạy” phía trên mô tả thời điểm chuẩn bị, không phải trạng thái mới nhất.

Đây là thử nghiệm **Map Local → response script** trên runtime thật. Thứ tự này chưa được xác nhận trong tài liệu; nếu baseline hoạt động nhưng candidate giữ ad, cần xem compile/script logs thay vì kết luận script production sai. Cú pháp Map Local dựa trên community examples và cần xác nhận bằng UI/export của phiên bản đang cài. Không sử dụng mitmproxy trong topology đầu tiên; máy đã có mitmproxy 12.2.3 để nghiên cứu capture ở vòng sau.

## Chuẩn bị và chạy

Import qua file thật: `python3 scripts/shadowrocket_pilot.py export --output <existing-lab-directory>` ghi các file `cosn-pilot-baseline.conf`, `cosn-pilot-candidate.conf`, script snapshot và manifest; từ chối ghi đè. Có thể dùng `open -a Shadowrocket <baseline-file>` để yêu cầu macOS mở file trong app. Agent không coi exit code của `open` là bằng chứng import/activate; user phải xác nhận tên config đang active và preview. Candidate vẫn fetch script qua loopback asset server nên giữ server chạy. Không import manifest/script snapshot thành config.

1. Ghi phiên bản Shadowrocket và tên config/routing mode hiện dùng để rollback. Không export CA private key, node credentials hoặc config cá nhân vào repo/chat. Tắt các module khác trong thời gian lab, bảo đảm config lab không inherit config production. Không bật sync lab sang iPhone. Đóng app Pinterest nếu có.
2. Chạy `python3 scripts/shadowrocket_pilot.py serve` và giữ process sống. Server giữ snapshot script đến khi restart; SHA-256 được in trong manifest. Import URL `http://127.0.0.1:8765/baseline.conf` vào Shadowrocket trên Mac.
3. Trước khi bật lab, kiểm tra preview/compiled config: `[Host] api.pinterest.com = 127.0.0.1`; MITM **chỉ** `api.pinterest.com`; 7 Map Local entries dùng dữ liệu inline; baseline không có script. Chọn routing **Config**, không Global Proxy. Nếu config parse lỗi hoặc host mapping thiếu, **không chạy checker**. Các host khác dùng DIRECT, không MITM.
4. Trong Shadowrocket, chuẩn bị CA riêng cho lab nếu cần. Export **public certificate PEM** ra chỗ riêng ngoài repo, không export `.p12`, private key hoặc identity/password. Checker dùng `--ca` để trust CA cho process của nó; không cần agent cài trust toàn hệ thống. Không tắt TLS verification/Allow Insecure. UI tên menu có thể khác theo phiên bản.
5. Xác định HTTP proxy listener của Shadowrocket trên **127.0.0.1**. Không đoán port. User đã phê duyệt Proxy Sharing đồng thời trên LAN `192.168.8.129:1082` và loopback port `1082` cho pilot này; LAN binding không còn là blocker. Checker vẫn chỉ kết nối loopback rồi CONNECT hostname thử, không có direct fallback. Không cấu hình port forwarding/public Internet, không capture thiết bị khác. Tắt Proxy Sharing khi kết thúc lab nếu không còn cần; nếu interface/port/phạm vi thay đổi, xác nhận lại approval.
6. Bật baseline và chạy:
   ```sh
   python3 scripts/shadowrocket_pilot.py check --proxy http://127.0.0.1:PORT --ca /path/outside/repo/lab-public-ca.pem --phase baseline --lab-confirmed
   ```
7. Import `http://127.0.0.1:8765/candidate.conf`. Xác nhận script được fetch/compile từ `http://127.0.0.1:8765/pinterest.js`; hostname mapping/MITM vẫn như baseline. Chạy cùng command với `--phase candidate`.
8. Chọn lại **baseline lab** và chạy `--phase rollback`. Sau đó tắt lab, khôi phục config và routing mode production trước đó, khôi phục trạng thái các module. Dừng server bằng Ctrl-C; gỡ CA lab nếu đã cài vào hệ thống và không còn dùng. Không chạy phase rollback với config production.

Config loopback mapping là defense-in-depth, không phải OS egress sandbox. Chỉ chạy khi preview xác nhận mapping và không có override/module khác. Map Local miss phải đi loopback, không Pinterest thật. Nếu muốn chứng minh tuyệt đối không egress cần network isolation riêng; không tự hứa điều này chỉ từ config. Config import/compile không có remote dependencies ngoài loopback, nhưng app có thể tự thực hiện background updates độc lập với lab.

## Assertions và evidence

Baseline runtime 2026-10-09: sau khi user enable/chọn identity và tạo CA mới (public certificate ngoài repo), mixed probe trả đúng synthetic body HTTP 200. Đã chạy đủ 7 cases qua `/usr/bin/curl` SecureTransport, explicit proxy `127.0.0.1:1082`, `--cacert` CA mới, TLS verification bật, không redirect; dùng `matches(..., "baseline")` đối chiếu tự động: **7/7 PASS**, gồm byte-identical empty/malformed/organic/unknown/near-miss. Python checker trước đó gặp strict OpenSSL certificate validation; lần pass này dùng curl hệ thống, không đổi validation flags. Candidate đã được yêu cầu mở bằng macOS `open -a Shadowrocket`; import/activation và identity riêng của candidate vẫn cần user xác nhận. Candidate/rollback chưa verified. Kết quả xác nhận synthetic Map Local baseline, không phải script transform hay app production.

Candidate runtime, sau user xác nhận import/active/identity: 7 cases HTTP 200, **6 preservation cases PASS; mixed FAIL**. Mixed body byte-identical baseline, ad chưa bị loại. Local script URL được fetch độc lập và khớp SHA-256 snapshot; 5 pilot harness tests pass. Điều này chứng minh asset server hoạt động, không chứng minh Shadowrocket fetch/compile/execute script. Chưa phân biệt entry chưa compile/chạy với Map Local bypass response scripts. Cần log/compiled entry riêng `CoSN Pilot Pinterest` trước khi đổi topology. Rollback chưa chạy; pilot transformation chưa pass.

Retest sau khi user xác nhận compile lại candidate: riêng mixed vẫn HTTP 200, curl exit 0, body byte-identical baseline; candidate assertion **FAIL**. Binding do user cung cấp khớp URL test về mặt static. Refresh config chưa giải quyết transformation; chưa có runtime script log để xác nhận invocation. Không tiếp tục yêu cầu compile lặp lại; bước chẩn đoán tiếp theo cần evidence execution hoặc một topology origin synthetic không dùng Map Local.

User cho phép đọc log tại LAN `/api/log`. Endpoint HTTP 200 `text/plain;charset=utf-8`, chunked/streaming; blocking read-to-EOF timeout. Đã đọc cửa sổ ngắn trong memory và chỉ in pilot-scoped redacted lines, không lưu raw logs. Endpoint cũng trả recent backlog, nên correlation dựa vào stream IDs/timestamps, không coi mọi line là mới. Hai request mixed mới vẫn HTTP 200, byte-identical baseline. Pilot streams `<315>` và `<318>` ghi MITM host, decrypted GET, async rule lookup, `script http request suspend data read`, `tcp rule` với `result = MAP-LOCAL`, rồi remove host. Không quan sát thấy `Pinterest filter: removed ...` hay named response-script execution trong cửa sổ thu được. Request-suspend line không chứng minh response script chạy. Evidence nghiêng về Map Local short-circuit response path, nhưng script loading/execution và log completeness chưa chứng minh nên chưa kết luận chắc chắn. Vòng sau cần origin synthetic hoặc diagnostic execution marker riêng trong lab, không sửa script production.

| Case | Baseline/rollback | Candidate |
| --- | --- | --- |
| Mixed ads + organic/search/cursor/metadata | Body giả nguyên bản | Chỉ ad rõ ràng bị loại; mọi trường khác giữ nguyên |
| Organic | Byte-identical | Byte-identical |
| Empty/malformed/unknown schema | Byte-identical | Byte-identical |
| Near-miss path/unknown endpoint | Byte-identical | Byte-identical; binding không match |

Checker yêu cầu HTTP 200, không follow redirect, không gửi credentials/cookies, không in body/headers hoặc lưu capture. PASS candidate được đối chiếu với expected cố định, **không** tự coi output runtime là golden. Empty-body response có thể được client skip script; không suy ra invocation từ case này. Mixed candidate biến đổi đúng sau baseline nguyên bản là evidence response transform, nhưng completion count chỉ được xác minh trong Node harness; log runtime cần bổ sung nếu có.

Kết quả phải ghi OS/client version, script SHA-256, config compile/import, port và từng phase. Không gắn production/device-verified cho app thật khi mới pass synthetic Mac pilot.

## Chẩn đoán

### Vòng origin HTTPS (không Map Local)

User yêu cầu chuyển topology sang origin giả. `export --origin` tạo config `cosn-origin-baseline.conf`/`cosn-origin-candidate.conf`: giữ host loopback, MITM và binding/script nguyên bản; không có `[Map Local]`. `origin --cert <public-cert> --key <lab-key> [--port 443]` chỉ listen loopback, trả đúng 7 fixtures theo Host/path, reject unknown bằng 404, không có upstream forwarding. Logs chỉ ghi tên fixture cố định. Certificate tự ký SAN `api.pinterest.com`, serverAuth, thời hạn 2 ngày; key riêng mới cho origin, không dùng CA private key của Shadowrocket, lưu ngoài repo trong thư mục mode 700/key mode 600.

2026-10-09: port 443 bind bị macOS từ chối `PermissionError`, không tự chạy sudo. Self-test origin tại `127.0.0.1:8443` với curl `--resolve` và `--cacert`, verification bật: 7/7 fixtures PASS; 11 Python + 11 Node tests PASS. **Port 8443 chỉ self-test origin**, không chứng minh dispatch/script chạy. Runtime qua Shadowrocket cần origin port 443 để giữ nguyên URL không có explicit port. Người dùng cần khởi động origin port 443 bằng quyền thích hợp và trust **public origin certificate**, không chia sẻ/import origin key. Việc Shadowrocket chấp nhận system-trusted self-signed origin chưa verified; dừng nếu upstream TLS fail, không disable verification.

Lab assets hiện ở `/var/folders/g1/86k0mv_123s2b3_v734wmbq40000gp/T/opencode/cosn-pilot-import/origin/`; script server loopback 8765 vẫn cần chạy. Agent mở origin baseline bằng `open -a Shadowrocket`, user xác nhận active và chọn identity MITM trước đó. Trust origin certificate là khác với client trust CA Shadowrocket: client → Shadowrocket dùng CA Shadowrocket, Shadowrocket → origin dùng origin certificate.

Cleanup thêm: dừng origin (gồm process elevated nếu user chạy), gỡ trust/certificate origin đã import, xóa lab private key và assets khi kết thúc; restore production profile/modules và tắt sharing nếu không còn dùng. Origin transformation/rollback chưa chạy.

Sau user báo setup xong: proxied mixed trả curl exit 52 `Empty reply from server`, HTTP 000. Direct loopback-origin check dùng `--resolve api.pinterest.com:443:127.0.0.1`/`--cacert` trả exit 7 connection refused; không thấy origin process (chỉ asset server `serve`), không quan sát listener 443. Log endpoint đọc cửa sổ ngắn chỉ lấy được backlog streams 315/318 cũ, không có evidence request origin mới; không dùng backlog để chẩn đoán lần mới. Blocker hiện tại: HTTPS origin chưa chạy hoặc đã thoát, trước mọi kết luận TLS/response-script. Cần output terminal của command origin/sudo, không password/key.

Sau user chạy origin elevated và gửi startup output: direct origin TLS probe HTTP 200 với `--cacert` origin cert. Proxied baseline vẫn curl exit 52. Log mới stream 563 xác nhận host map `api.pinterest.com → 127.0.0.1`, kết nối `127.0.0.1:443`, rồi `CERTIFICATE_VERIFY_FAILED`; không còn Map Local short-circuit trong stream này. `security verify-cert -c <public-origin-cert> -p ssl -s api.pinterest.com` trả `CSSMERR_TP_NOT_TRUSTED`. Origin hoạt động; system trust của origin certificate chưa có hiệu lực theo verification check, độc lập với CA Shadowrocket. Cần user trust chính public origin cert cho SSL; chưa thể kết luận Shadowrocket dùng trust store nào nếu macOS verify vẫn fail. Không dùng `ssl_insecure`/skip verification.

Sau user trust origin cert: macOS SSL verification successful; proxied mixed HTTP 200 và nguyên bản đúng. Chạy đủ 7 origin-baseline cases qua Shadowrocket/curl verified TLS: **7/7 PASS**. Trên phiên bản máy/client này, trust thao tác của user đủ để origin TLS hoạt động; không suy rộng thành public trust-store contract cho mọi Shadowrocket version. Đã mở `cosn-origin-candidate.conf` để user import/activate và chọn lại MITM identity hiện tại. Origin candidate/script transform và rollback vẫn chưa chạy.

Origin candidate: 5 matching cases HTTP 000; 2 nonmatching cases HTTP 200/PASS. Logs streams 773/774 xác nhận response script match, response completed, peer socket closed, rồi `cancel without callback`; mixed có exception không có detail. Empty/malformed ghi console parse failure, chứng minh code chạy. Đây là runtime failure, không phải chỉ binding không load. Hypothesis mới: origin HTTP/1.0 close làm script asynchronous bị cancel. Đổi **chỉ origin lab** sang HTTP/1.1 keep-alive với Content-Length đầy đủ; chưa xác minh fixes runtime vì process sudo cũ cần user restart. Không sửa pinterest.js.

Sau user restart origin HTTP/1.1: mixed probe HTTP 200, candidate expected match true/baseline match false. Chạy lại đủ 7 cases: **origin candidate 7/7 PASS**, TLS verification bật; script nguyên bản không đổi. Log mới 21:08:16/21:08:35 streams 801/803 ghi `Pinterest filter: removed 1 Pinterest sponsored item(s)`; empty/malformed streams 805/806 ghi parse fallback và checker xác nhận byte-identical. Thay origin HTTP/1.0-close → HTTP/1.1-keepalive giải quyết failure quan sát được, hỗ trợ hypothesis lifecycle/race ở lab; không kết luận mọi HTTP/1.0 origin đều lỗi trong Shadowrocket. Đây là synthetic Mac runtime verification trên 2.2.90 (3378), không phải app production. Rollback về origin baseline vẫn cần chạy để hoàn tất cycle.

Sau user chọn lại origin baseline cho rollback: đủ 7 cases **origin rollback 7/7 PASS**, tất cả HTTP 200, byte-identical fixture ban đầu; mixed có ad lại, xác nhận transformation được tắt. Cycle baseline/candidate/rollback hoàn tất. Trạng thái cuối test vẫn là baseline lab; chưa xác nhận restore production, dừng sudo origin và gỡ trust origin. Không tự xóa certificate đang trusted hoặc process elevated của user.

Sau khi user xác nhận baseline đã active, listener từng mất rồi trở lại trên loopback/LAN port 1082. Probe mixed bằng curl verified-TLS trả `CONNECT tunnel failed, response 503` (HTTP 000). Hai probe CONNECT-only độc lập đều trả `HTTP/1.1 503 Service Unavailable`; không gửi HTTP request bên trong tunnel. Hiện blocker ở tunnel trước TLS/Map Local, chưa phải script lỗi. Cần kiểm tra CA/identity trong **config mới** và log riêng request pilot. System trust của public CA không chứng minh config baseline đã gắn CA/private identity phù hợp. Một giả thuyết khác: client kết nối origin loopback trước Map Local; chưa xác nhận, không tự bỏ host mapping để thử với server thật.

- `ConnectionRefusedError`: listener chưa bật/sai port, không phải filter lỗi.
- CONNECT 503: xem log riêng endpoint pilot để phân biệt origin loopback refusal, identity/MITM setup và lỗi routing; không bỏ host mapping hoặc tắt TLS verification để vượt lỗi.
- `SSLCertVerificationError`: CA public file không đúng hoặc MITM chưa bật. Không xử lý bằng `-k` hay disable verification.
- Baseline fail: kiểm tra Map Local parse/order, host mapping và response status trước khi xét script.
- Baseline pass, candidate mixed fail: script compile/fetch/binding hoặc Map Local bỏ qua response script; xem log riêng của entry pilot, không export toàn bộ browsing logs.
- Candidate pass nhưng rollback fail: candidate/script vẫn còn active hoặc cache/config chưa đổi; chưa công nhận pilot pass.

Nguồn và giới hạn chung: [nghiên cứu MITM](shadowrocket-mitm-testing-research-2026-10-09.md). Cú pháp cộng đồng, không phải official runtime contract: https://github.com/LOWERTOP/Shadowrocket ; khả năng Map Local/script/MITM chính thức: https://apps.apple.com/us/app/shadowrocket/id932747118 .
