# Shadowrocket module workflow — bản để review

## Quyết định đã xác nhận

- **Một môi trường duy nhất, một config chính `CoSN-shadowrocket.conf` cho dev, test và sử dụng hằng ngày.** Không tạo/select baseline/candidate/prod profiles riêng.
- Đơn vị phát triển và kiểm thử là **module `.sgmodule`**, gồm rules, bindings, MITM hosts, arguments và dependencies, không chỉ JavaScript riêng.
- Human operations tập trung trong setup/repair; sau setup mục tiêu là agent tự chạy và khôi phục trạng thái. Unattended chưa verified.
- Certificate/identity setup trong config chính một lần. Private CA/identity không đưa vào Git. File repo và bản hiệu lực trong client không đồng nhất: phải xác nhận client state, không ghi đè identity bằng cách reimport file repo.
- HTTPS origin synthetic và app thật là hai loại evidence/input trong **cùng môi trường**, không phải hai môi trường hay config. Pilot không tự cấp phép capture app/account/host mới.

Status: workflow review, chưa triển khai runner/skill/service mới. [Pilot](shadowrocket-pilot.md) đã pass 7/7 baseline/candidate/rollback với binding trong profile lab riêng; đó là evidence nền runtime, **chưa chứng nhận workflow một config/module integration này**.

## Boundary automation hiện tại

Confirmed: tạo assets, HTTPS fixtures, curl verified TLS, assertions và đọc log scoped. Accessibility đọc UI được nhưng AXPress/AXShowMenu chưa ổn định. Import/update/enable/disable/compile module và read-back chưa có controller verified. Một config cố định bỏ nhu cầu profile switching nhưng không bỏ control-plane blocker.

## 1. Setup/repair — human chỉ ở đây trong target workflow

| Automation chuẩn bị/kiểm tra | Human setup một lần |
| --- | --- |
| Kiểm tra config chính/version/listener, ghi scope và module state | Chọn `CoSN-shadowrocket.conf` làm config duy nhất; duyệt phạm vi và quyền thay đổi module |
| Kiểm tra cert SAN/expiry/fingerprint và TLS hai hop | Chọn/tạo identity MITM trong config chính; export public CA; trust public origin certificate/CA |
| Chuẩn bị origin port 443, HTTP/1.1 keep-alive, only loopback | Approve admin install cơ chế service/socket có quyền giới hạn |
| Tạo module hỗ trợ fixture và module cần test có provenance | Import/provision module lúc setup; không để host mapping synthetic active thường trực |
| Kiểm tra controller module update/compile/enable/disable/read-back | Cấp Accessibility/Automation hoặc cơ chế khác đã review |
| Chạy acceptance và restore nguyên trạng trên config chính | Xác nhận setup nếu mọi thao tác sau đó đã tự động được |

Certificate lifecycle cần chốt: cert hai ngày/temp files của pilot không reusable. Thiết kế renewal phải được verify; trust anchor/identity đổi hoặc expiry là setup repair, không prompt giữa run. Không passwordless sudo tổng quát/daemon root chạy source repo editable. Setup phải có uninstall service, gỡ trust và xóa keys riêng ngoài repo.

## 2. Per-run — một config, thay đổi module có kiểm soát

| Stage | Automation target | Human per-run |
| --- | --- | --- |
| Preflight | Lock, xác nhận config chính, certs, scope, snapshot module revision/enabled/arguments và trạng thái routing/tunnel | Không; capability thiếu thì BLOCKED |
| Prepare | Build candidate module/dependencies; matcher/host/ownership checks; kiểm tra overlap với module đang bật | Không; không tự tắt module khác ngoài phạm vi được approve |
| Baseline | Tạm bật fixture mapping endpoint đã approve, module cần test tắt; origin trả synthetic body; assertions | Không |
| Candidate | Load/compile và bật candidate `.sgmodule`, xác nhận bytes/revision/state; assertions + fresh logs | Không |
| Rollback check | Tắt module test, mapping vẫn bật; assert synthetic body ban đầu | Không |
| Restore | Khôi phục phiên bản/trạng thái/arguments module trước run, gỡ/tắt fixture mapping, stop owned origin; xác nhận read-back | Không |
| Report | Versions/digests, assertions, limitations và restore status | Không |

Giữ config chính và identity nguyên trạng trong mọi stage. Nếu synthetic input cần `[Host]` override, dùng module hỗ trợ khi client hỗ trợ và đã validate; nếu không hỗ trợ, có thể cần endpoint-specific edit tạm thời **trong cùng config** với snapshot/restore. Cách thực hiện chưa chốt, không coi module `[Host]` support là đã verified. Không bật mapping toàn host lâu dài: trong khoảng synthetic test, app thật cùng host có thể nhận fixtures/lỗi, dù fixture paths được match chính xác. Runner phải giới hạn thời gian và báo tác động này. Không gửi real-app requests ngoài scope.

Module production sử dụng remote scripts có thể khác working tree. Nếu lab build đổi script-path sang asset server local, giữ bindings/phase/arguments/engine, ghi diff và provenance; gọi kết quả là **candidate module integration**, không chứng nhận URL production đã triển khai. Không dùng wrapper hoặc sửa production matchers để ép test pass mà không approval.

```mermaid
sequenceDiagram
    participant H as Human - Setup only
    participant A as Automation
    participant S as Shadowrocket - CoSN-shadowrocket.conf
    participant O as Local HTTPS Origin
    H->>S: Setup main config, MITM identity and module controls
    H->>H: Trust certificates and approve service permissions
    A->>A: Validate setup and unattended capability
    Note over A,S: Same config and environment throughout each run
    A->>S: Read and snapshot module state
    A->>O: Start origin and verify TLS
    A->>S: Enable temporary fixture mapping; disable target module
    A->>S: Probe baseline and assert
    A->>S: Load, compile and enable candidate module
    A->>S: Probe candidate; assert output and fresh logs
    A->>S: Disable target module; probe rollback
    A->>S: Restore previous module revisions, arguments and states
    A->>S: Remove temporary fixture mapping and verify restoration
    A->>O: Stop owned origin
    A-->>H: Report results and restore status
```

## Failures và completion gate

- `finally` restore sau mọi failure. Script rollback khác module-state restoration; trước run module có thể vốn đã enabled nên không để nó disabled khi xong.
- Restore fail/unknown: `RESTORE_REQUIRED`, không báo workflow sạch. Missing controller/permissions/trust: `SETUP_REPAIR_REQUIRED`/`BLOCKED`; không silent assisted fallback.
- Một môi trường dùng thật nghĩa là module candidate có thể ảnh hưởng traffic thực ngoài request fixture. Không hứa isolated/no-impact; approve scope, kiểm tra overlap, minimal changes, bounded window.
- Certificate verification luôn bật; không private-key sharing, public listener exposure, global MITM hoặc log browsing history.

Acceptance để gọi hoàn thiện: hai cycle liên tiếp không human click/sudo/import/trust prompt; cả baseline/candidate/rollback pass; native module bindings và arguments verified; controlled failure vẫn restore đúng module bytes/state/mapping; không đổi config chính hay mất identity. Version/UI/cert change có thể cần setup repair.

## Skill sau khi review

Proposed repo-local `shadowrocket-module-test`: `setup`, `run`, `repair`, `uninstall`. Skill phải kiểm tra unattended readiness; không chứa hướng dẫn đổi config từng phase. Chỉ gọi setup human khi capabilities thiếu; per-run không hỏi human enable/disable. Pilot history là reference, không phải recipe multi-profile mới.

Open implementation decisions: controller module đáng tin cậy; fixture mapping support/restore mechanism; scoped privileged service; reusable certificate lifetime/renewal. Chưa triển khai các phần này trong vòng review. Hướng một config do user xác nhận là ràng buộc, không mở lại quyết định phân môi trường.
