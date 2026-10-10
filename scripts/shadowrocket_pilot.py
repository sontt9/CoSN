"""Synthetic, loopback-only Pinterest pilot; no live app capture or CA changes."""

import argparse
import hashlib
import http.client
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import json
from pathlib import Path
import ssl
from urllib.parse import urlsplit


ROOT = Path(__file__).resolve().parents[1]
HOST = "api.pinterest.com"
PORT = 8765
MIXED = json.dumps({
    "data": [{"id": "organic", "affiliate_disclosure": {}},
             {"id": "ad", "is_promoted": True},
             {"id": "search", "story_type": "slp_search_recommendation"}],
    "cursor": ["pilot-next"],
    "metadata": {"items": [{"is_promoted": True}]},
}, separators=(",", ":"))
CASES = {
    "mixed": ("/v3/feeds/home/?cosn_pilot=mixed", MIXED),
    "organic": ("/v3/feeds/home/?cosn_pilot=organic", '{ "data": [{"id":"organic"}], "cursor":"next" }'),
    "empty": ("/v3/feeds/home/?cosn_pilot=empty", ""),
    "malformed": ("/v3/feeds/home/?cosn_pilot=malformed", "{bad"),
    "unknown-schema": ("/v3/feeds/home/?cosn_pilot=unknown-schema", '{ "other": [], "cursor": "next" }'),
    "near-miss": ("/v3/feeds/home_extra/?cosn_pilot=near-miss", MIXED),
    "unknown-endpoint": ("/v3/account/?cosn_pilot=unknown-endpoint", MIXED),
}
FILTERED = json.loads(MIXED)
FILTERED["data"] = [item for item in FILTERED["data"] if item.get("is_promoted") is not True]


def render_config(candidate, origin=False):
    # Host mapping is defense in depth, not an OS-level network sandbox.
    lines = [
        "# CoSN synthetic Mac pilot ONLY; do not sync to iPhone.",
        "# Synthetic HTTPS origin, no Map Local." if origin else
        "# Map Local/script ordering and syntax must be verified on the installed client.",
        "[General]", "dns-server = system", "private-ip-answer = true", "",
        "[Rule]", f"DOMAIN,{HOST},DIRECT", "FINAL,DIRECT", "",
        "[Host]", f"{HOST} = 127.0.0.1", "",
    ]
    if not origin:
        lines.append("[Map Local]")
        for path, body in CASES.values():
            pattern = ("^https://" + HOST.replace(".", r"\.") + path.replace("?", r"\?") + "$")
            lines.append(f'{pattern} data-type=text data={json.dumps(body)} status-code=200 header="content-type: application/json"')
    if candidate:
        lines.extend([
            "", "[Script]",
            r"CoSN Pilot Pinterest = type=http-response,pattern=^https:\/\/api\.pinterest\.com\/v3\/feeds\/home\/(?:\?|$),requires-body=1,max-size=0,"
            f"script-path=http://127.0.0.1:{PORT}/pinterest.js,timeout=10",
        ])
    lines.extend(["", "[MITM]", "enable = true", f"hostname = {HOST}", ""])
    return "\n".join(lines).encode()


def assets(origin=False):
    script = (ROOT / "pinterest.js").read_bytes()
    manifest = {
        "scope": "synthetic Mac only; no live Pinterest traffic",
        "pinterest_sha256": hashlib.sha256(script).hexdigest(),
        "cases": list(CASES),
        "runtime_verified": False,
        "topology": "https-origin-loopback" if origin else "map-local",
    }
    return {
        "/baseline.conf": ("text/plain", render_config(False, origin)),
        "/candidate.conf": ("text/plain", render_config(True, origin)),
        "/pinterest.js": ("application/javascript", script),
        "/manifest.json": ("application/json", json.dumps(manifest, indent=2).encode()),
    }


def serve():
    snapshot = assets()

    class Handler(BaseHTTPRequestHandler):
        def do_GET(self):
            content_type, body = snapshot.get(self.path, ("text/plain", b"Not found"))
            self.send_response(200 if self.path in snapshot else 404)
            self.send_header("Content-Type", content_type)
            self.send_header("Content-Length", str(len(body)))
            self.send_header("Cache-Control", "no-store")
            self.end_headers()
            self.wfile.write(body)

        def log_message(self, *args):
            # Do not log incoming paths, headers, tokens or bodies.
            pass

    server = ThreadingHTTPServer(("127.0.0.1", PORT), Handler)
    print(f"Pilot assets: http://127.0.0.1:{PORT}/baseline.conf and /candidate.conf", flush=True)
    print(snapshot["/manifest.json"][1].decode(), flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


def matches(name, body, phase):
    if phase == "candidate" and name == "mixed":
        try:
            return json.loads(body) == FILTERED
        except (ValueError, UnicodeError):
            return False
    return body == CASES[name][1].encode()


def origin_server(cert, key, port=443):
    bodies = {path: (name, body.encode()) for name, (path, body) in CASES.items()}

    class Handler(BaseHTTPRequestHandler):
        # Keep upstream alive while the proxy executes asynchronous response scripts.
        protocol_version = "HTTP/1.1"

        def do_GET(self):
            fixture = bodies.get(self.path)
            host = self.headers.get("Host")
            allowed = host in (HOST, HOST + ":" + str(port)) and fixture is not None
            body = fixture[1] if allowed else b"Not found"
            self.send_response(200 if allowed else 404)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(body)))
            self.send_header("Cache-Control", "no-store")
            self.end_headers()
            self.wfile.write(body)
            if allowed:
                print("ORIGIN served fixture " + fixture[0], flush=True)

        def log_message(self, *args):
            pass

    context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
    context.minimum_version = ssl.TLSVersion.TLSv1_2
    context.load_cert_chain(str(cert), str(key))
    server = ThreadingHTTPServer(("127.0.0.1", port), Handler)
    server.socket = context.wrap_socket(server.socket, server_side=True)
    print(f"Synthetic HTTPS origin: 127.0.0.1:{port} (no upstream connections)", flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


def check(proxy, ca, phase):
    parsed = urlsplit(proxy)
    if (parsed.scheme != "http" or parsed.hostname != "127.0.0.1" or not parsed.port
            or parsed.username or parsed.password or parsed.path or parsed.query or parsed.fragment):
        raise ValueError("Use an explicit loopback HTTP proxy: http://127.0.0.1:PORT")
    # Trust only the public CA supplied by the user. Never disable TLS verification.
    context = ssl.create_default_context(cafile=str(ca))
    failed = False
    for name, (path, _) in CASES.items():
        connection = http.client.HTTPSConnection("127.0.0.1", parsed.port, context=context, timeout=10)
        connection.set_tunnel(HOST, 443)
        try:
            connection.request("GET", path, headers={"User-Agent": "CoSN-Synthetic-Pilot/1", "Accept-Encoding": "identity"})
            response = connection.getresponse()
            body = response.read(65537)
            ok = response.status == 200 and len(body) <= 65536 and matches(name, body, phase)
            print(f'{"PASS" if ok else "FAIL"} {phase}/{name}; HTTP {response.status}')
            failed |= not ok
        except (OSError, http.client.HTTPException) as error:
            # No body/header/URL dumps; these are not needed for assertions.
            print(f"FAIL {phase}/{name}; {type(error).__name__}")
            failed = True
        finally:
            connection.close()
    return 1 if failed else 0


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest="command", required=True)
    sub.add_parser("serve")
    origin = sub.add_parser("origin", help="Serve only synthetic fixtures over loopback HTTPS port 443")
    origin.add_argument("--cert", required=True, type=Path)
    origin.add_argument("--key", required=True, type=Path)
    origin.add_argument("--port", type=int, default=443, choices=range(1, 65536),
                        metavar="PORT", help="443 for unchanged script dispatch; high ports for origin self-test only")
    exporter = sub.add_parser("export", help="Write standalone lab assets to an existing directory")
    exporter.add_argument("--output", required=True, type=Path)
    exporter.add_argument("--origin", action="store_true", help="Export configs without Map Local")
    checker = sub.add_parser("check")
    checker.add_argument("--proxy", required=True, help="Shadowrocket loopback HTTP listener, not mitmproxy")
    checker.add_argument("--ca", required=True, type=Path, help="Public Shadowrocket CA PEM; NEVER a private key/profile")
    checker.add_argument("--phase", required=True, choices=["baseline", "candidate", "rollback"])
    checker.add_argument("--lab-confirmed", action="store_true", required=True,
                         help="Confirm isolated profile/host mapping, no other modules, config routing and local listener")
    args = parser.parse_args()
    if args.command == "serve":
        serve()
        return 0
    if args.command == "origin":
        origin_server(args.cert, args.key, args.port)
        return 0
    if args.command == "export":
        if not args.output.is_dir():
            parser.error("--output must be an existing lab directory")
        snapshot = assets(args.origin)
        prefix = "cosn-origin-" if args.origin else "cosn-pilot-"
        targets = [(args.output / (prefix + name.lstrip("/")), body)
                   for name, (_, body) in snapshot.items()]
        if any(target.exists() for target, _ in targets):
            parser.error("Lab export files already exist; choose a fresh directory")
        for target, body in targets:
            with target.open("xb") as handle:
                handle.write(body)
            print(target)
        return 0
    return check(args.proxy, args.ca, args.phase)


if __name__ == "__main__":
    raise SystemExit(main())
