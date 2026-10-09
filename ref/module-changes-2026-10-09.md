# Module changes — 09/10/2026

## Implemented

- **YouTube latest baseline:** Maasea commit `65075cdb388fc5e3094afd7e7314c67b243f3525`. Response and request source were downloaded from the same resolved revision; upstream SHA-256 recorded in `youtube.upstream.json`, Apache-2.0 license retained in `youtube.LICENSE`. CoSN modifies key-debug logging, module bindings/defaults and request matcher; source code remains an upstream bundle, not a new classifier.
- Module now binds reviewed CoSN `main` copies of both scripts, preserves argument placeholders for client controls, defaults Upload/Immersive/Shorts suppression off. Removed old UDP rejects and Map Local to follow latest module baseline. Only `youtubei.googleapis.com` is intercepted.
- **Explicit exception:** upstream `initplayback` request handler is not enabled. It redirects to `init-stream.maasea.workers.dev` with configuration key/target parameters. Third-party routing needs separate user approval. Request code is retained as upstream baseline, but only the anchored `log_event` handler is bound. Ad coverage requiring the Worker may be lost; cannot promise latest-upstream effectiveness with that handler disabled.
- Removed config-key debug serialization in both bundles. Upstream still persists config keys locally (`YouTubeConfig`) for its config/log-event behavior. Upstream playback enhancements, guide `SPunlimited` removal and Shorts feed heuristic remain; **blockShorts=false controls the guide option, not a guarantee that all organic Shorts remain**. This is still an Enhance module, not ad-only. Forking every enhancement is deferred pending schema/device tests.
- **Updates:** scheduled workflow is now read-only, validates and uploads candidate/diff artifacts. It no longer commits/pushes stable changes automatically. `scripts/update_youtube.py` fails on HTTP/source/syntax/options/patch-shape errors before writing outputs. Stable adoption requires review, tests and an explicitly requested deployment; no client-side hash enforcement is claimed.
- **Shopee:** exact MITM hosts added for four existing tracking/config rules; endpoint boundaries prevent matching lookalike filenames. No domain expansion or sponsored-product filter added. These remain inherited config rules whose real-world nonessential nature/retry behavior needs capture.
- **Zalo:** CoSN Clean keeps existing ads/analytics rules. Video/Discovery/channel suppression moved to optional `zalo-focus.sgmodule`. Broad user/config/latest_value/broadcast/launch_actions/data_lp and QoS/domain rejects removed from Clean rather than pretending they are ads. Defaults now preserve more ordinary features; install Focus separately only if desired.
- **Pinterest:** explicit promoted flags/known promoted reason/ads-only-board markers retained. Commercial/affiliate/promoter metadata alone no longer removes an item; search recommendations retained. Traversal limited to known content collection keys, metadata/cursors preserved; originally empty stories retained and newly emptied ad stories dropped; unchanged/unknown bodies preserve bytes.
- **Bili:** shared domain rules, region rewrite and Bstar bindings now owned by Bili-Enhanced only. CoSN retains additional endpoint rules and its defaultwords/ad-report Map Local; duplicate rejects removed. Bili-Enhanced report patterns cover both Intl/global hosts without redundant subpath handlers. Watch-history blocking and teenager-mode Map Local removed. Bstar exact `ad` marker replaces `includes("ad")`, preserves nonobject list items.
- **MDM:** Apple enrollment blocks removed from the ads/privacy bundle; not replaced by an admin module.
- **hostsVN/DNS:** `CoSN-shadowrocket.conf` is byte-for-byte unchanged; remote upstream URLs, exceptions/categories/resolvers/fallback and self-update URL retained per user instruction. No hostsVN fork or manual list refresh is required because consuming configuration fetches remote rule sets; runtime refresh timing remains client-dependent.

## Verification actually run

- Five Python updater tests: rendered JSON, duplicate keys, unsafe logging patch shape, bad-source refusal and renderer hostname/matcher/closing-brace regression.
- Eleven Node proxy-global harness tests: Pinterest organic/ad/cursor/fallback, Bstar exact markers, Shopee host/matcher boundaries, Focus and ownership, YouTube malformed/valid synthetic binary response, unknown endpoint and request-phase header behavior without `$response`.
- Synthetic player binary contains a status field, an ad field and an unknown organic field; ad removal and unknown-field retention passed. It is **not a captured real-device fixture** and does not establish app compatibility.
- Latest candidate downloaded and built successfully; JS syntax and rendered arguments validated. Independent read-only review identified overly broad log-event matcher/unused video MITM; both corrected and regression-tested.
- No app/client/device versions tested. Chat/calls, cart/payment, playback/casting, QUIC and combined-rule runtime ordering remain unverified. `$done({})` is proxy pass-through, not an empty synthetic response.

## Enable/disable and rollback

- Run focused checks before adopting. URLs still point to remote CoSN `main`; local working-tree edits do not change code already fetched by clients until reviewed files are deployed and scripts/modules refreshed.
- Disable `zalo-focus.sgmodule` to restore its Video/Discovery/channel requests. Disable CoSN for inherited Shopee/Zalo/Pinterest path filtering; disable YouTube module for playback issues. HostsVN can independently block domains even with these modules off.
- Users formerly using CoSN alone for Bstar/region/shared Bili rules must now use Bili-Enhanced separately if those legacy enhancements are desired. Bili-Enhanced still has legacy entitlement/region/skin/payment edits and bundled behavior not fully audited; **not recommended as a Family protection bundle**. Do not enable it to imply harmful-content protection.
- Before deployment save the currently working modules/scripts/profile as a rollback version. Restore that reviewed version and refresh client caches if regressions occur; avoid `git reset` on this workspace with unrelated untracked assets. No commit or push was performed in this work.

## Deferred work

New Shopee feed ads, Zalo config transformations/domain candidates and Pinterest new endpoint schemas require sanitized captures. Reddit remote script audit/ad-only fork, generalized TikTok Focus redesign, and complete Bili bundle safety/entitlement separation remain pending. No live malware visited or private-chat/payment content captured. Plans under `ref/` are historical proposals; this file records the implemented subset and its limits.
