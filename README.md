# Cloak of Starry Night

## Module scope and verification

See [current module changes and rollback](ref/module-changes-2026-10-09.md) for the reviewed YouTube baseline, separate Zalo Focus, Shopee MITM coverage, Pinterest filtering and Bili ownership. These changes are statically/harness-verified, **not device/production-verified**.

Focused checks (Python 3, Node 24):
```
python3 -m unittest discover -s tests -p 'test_*.py'
node --test tests/protection.test.js
```


## DNS Server

`CoSN-shadowrocket.conf` uses three independent encrypted DNS providers:
Cloudflare Families, AdGuard Family Protection and CleanBrowsing Adult.
Provider diversity is preferred over identical classification: AdGuard also
filters ads/trackers, and blocklists/SafeSearch behavior differ. CleanBrowsing
Adult is chosen instead of its stricter Family profile to preserve proxy/VPN
and mixed-content site access. Explicit fallback uses the same three providers
rather than system DNS. This does not guarantee device-wide DNS leak prevention,
identical results or perfect content classification. This provider set is
documentation-verified; client availability/failover still needs testing.
See [DNS selection and local updates](ref/shadowrocket-dns-and-updates.md).

The provider addresses below are reference alternatives, not the active mixed
resolver configuration.

[Cloudflare](https://developers.cloudflare.com/1.1.1.1/) -- block malware and adult content
```
1.1.1.3, 2606:4700:4700::1113
```

[Quad9](https://www.quad9.net/service/service-addresses-and-features) -- Secured w/ECS: Malware blocking, DNSSEC Validation, ECS enabled
```
9.9.9.11, 2620:fe::11
```
