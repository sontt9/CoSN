# Cloak of Starry Night

## Module scope and verification

See [current module changes and rollback](ref/module-changes-2026-10-09.md) for the reviewed YouTube baseline, separate Zalo Focus, Shopee MITM coverage, Pinterest filtering and Bili ownership. These changes are statically/harness-verified, **not device/production-verified**.

Focused checks (Python 3, Node 24):
```
python3 -m unittest discover -s tests -p 'test_*.py'
node --test tests/protection.test.js
```


## DNS Server

[Cloudflare](https://developers.cloudflare.com/1.1.1.1/) -- block malware and adult content
```
1.1.1.3, 2606:4700:4700::1113
```

[Quad9](https://www.quad9.net/service/service-addresses-and-features) -- Secured w/ECS: Malware blocking, DNSSEC Validation, ECS enabled
```
9.9.9.11, 2620:fe::11
```
