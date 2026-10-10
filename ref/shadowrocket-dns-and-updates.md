# DNS selection and local configuration updates

## Current decision: three independent service providers

User prefers provider diversity to survive one provider losing connectivity,
over identical categorization. This supersedes the earlier three-Cloudflare-
endpoint choice. Configure all three as DoH and explicit fallback, without
`system` or blank fallback:

| Provider/profile | Official DoH endpoint | Policy differences |
| --- | --- | --- |
| Cloudflare Families | `https://family.cloudflare-dns.com/dns-query` | Malware/phishing and adult filtering; no established ads/SafeSearch promise |
| AdGuard Family Protection | `https://family.adguard-dns.com/dns-query` | Default ads/tracking/phishing filtering plus adult blocking and SafeSearch |
| CleanBrowsing Adult | `https://doh.cleanbrowsing.org/doh/adult-filter/` | Adult filtering; resolver-specific docs also list malicious/phishing filtering; allows VPN/proxy and mixed-content sites |

CleanBrowsing Adult, not Family, avoids Family's additional VPN/proxy and
mixed-content-site restrictions. Official pages conflict about Adult's
SafeSearch/security scope: the filters page includes Google/Bing SafeSearch
and malicious/phishing filtering, while Free vs Paid describes Adult as
adult-only without SafeSearch. Do not claim these disputed details as verified
runtime guarantees.

These are distinct service providers, not audited independent infrastructure
or identical threat feeds. Multiple resolvers do not combine all blocklists:
under the community-documented parallel/fastest-answer behavior a less
restrictive answer may win. AdGuard-specific ad filtering is not reliably
enforced whenever the other resolver wins. Provider diversity improves options
under outage; effective availability/failover still needs Shadowrocket tests.

The exact endpoints are official-documentation-verified on 2026-10-10. The
earlier live nine-probe test covered the superseded Cloudflare-only set, not
this new set. Do not transfer that result to AdGuard/CleanBrowsing.

Shadowrocket comma-separated encrypted fallback syntax is community-documented;
import/compile and forced-failure behavior are unverified. Explicit lists remove
configured system fallback, not all hostname-bootstrap, OS/app/proxy-side DNS.
DoH verifies/encrypts transport to the resolver, not all DNS use on the device.
Keep TLS verification enabled. Report failures instead of silently restoring
system DNS. These profiles are not proof of universal harmful-content blocking.

## Same config for development, testing and daily use

Keep `CoSN-shadowrocket.conf` and existing `master` update URL. No extra local
profile/environment. Recommended operations, not an implemented controller:

1. Setup identity in the client once; keep private keys/cert passwords outside
   Git. Record config identity/name without exporting secrets.
2. Suspend scheduled config/module refresh during a run; record base digest,
   effective module revision/arguments/enabled state in a sanitized manifest.
3. Develop modules locally; record any candidate script URL substitutions.
   Do not refresh the base just to fetch a module change or assume remote
   mutable branch content equals the working tree.
4. Restore temporary module/mapping overrides; compare state after run. An
   unexpected update invalidates the run. Resume the previous update setting.
5. Apply published base updates outside active runs; inspect rendered DNS,
   module scope and identity selection, then check connectivity. Keep a private
   last-known-good backup outside Git. Refresh may overwrite unpublished edits.

No commit/push/publish or active-client change performed for this selection.
Identity preservation and pause/resume update controls require verification.
Rollback repo DNS lines through Git only if explicitly desired; the previous
mixed IP configuration included system fallback and different policies.

Sources:
- https://developers.cloudflare.com/1.1.1.1/setup/
- https://developers.cloudflare.com/1.1.1.1/faq/
- https://adguard-dns.io/kb/general/dns-providers/#family-protection
- https://cleanbrowsing.org/filters#step2
- https://cleanbrowsing.org/learn/free-vs-paid
- https://raw.githubusercontent.com/haritos90/shadowrocket-config-files/master/h90_main.conf
  (unofficial fallback syntax)
- https://apps.apple.com/us/app/shadowrocket/id932747118
