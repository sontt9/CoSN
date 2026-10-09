#!/usr/bin/env python3
"""Build a reviewed-shape YouTube candidate from the latest upstream commit."""
import argparse
import hashlib
import json
import re
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
REPO = "https://raw.githubusercontent.com/Maasea/sgmodule/"
DEFAULTS = {"屏蔽上传按钮": "false", "屏蔽选段按钮": "false",
            "屏蔽Shorts按钮": "false", "字幕翻译语言": "off", "启用调试模式": "false"}


def fetch(url):
    return subprocess.run(["curl", "--fail", "--silent", "--show-error", "--location",
                           "--proto", "=https", "--proto-redir", "=https", "--max-time", "60", url],
                          check=True, capture_output=True).stdout.decode("utf-8")


def validate_script(source):
    if not source.startswith("// Build:") or len(source) < 1000:
        raise ValueError("Unexpected upstream JavaScript")
    subprocess.run(["node", "--check"], input=source, text=True, check=True, capture_output=True)


def redact_key_logging(source):
    # Fail on changed upstream shape rather than silently reintroducing secret logging.
    pattern = r'([A-Za-z_$][\w$]*)\.debug\(`saveKeyConfig: \$\{JSON\.stringify\(([A-Za-z_$][\w$]*)\)\}`\),'
    source, count = re.subn(pattern, "", source)
    if count != 1 or "saveKeyConfig:" in source:
        raise ValueError("Key logging patch requires review")
    return source


def render_module(source):
    if not source.startswith("#!name=") or "[MITM]" not in source:
        raise ValueError("Unexpected upstream module")
    defaults = dict(re.findall(r"([^,:]+):([^,]+)", next(
        line.split("=", 1)[1] for line in source.splitlines() if line.startswith("#!arguments="))))
    if set(defaults) != set(DEFAULTS):
        raise ValueError("Upstream options changed: review required")
    source = re.sub(r"^#!arguments=.*$", "#!arguments=" + ",".join(
        f"{key}:{value}" for key, value in DEFAULTS.items()), source, flags=re.M)
    # Leave placeholders live: target client renders user-selected module arguments.
    lines = []
    for line in source.splitlines():
        if line.startswith("youtube.request.init ="):
            continue  # external Worker routing is not approved for this protection bundle
        line = line.replace(REPO + "master/Script/Youtube/youtube.response.js",
                            "https://raw.githubusercontent.com/sontt9/CoSN/main/youtube.response.js")
        line = line.replace(REPO + "master/Script/Youtube/youtube.request.js",
                            "https://raw.githubusercontent.com/sontt9/CoSN/main/youtube.request.js")
        if line.startswith("youtube.request.log_event ="):
            line = re.sub(r"pattern=.*?,requires-body", r"pattern=^https:\\/\\/youtubei\\.googleapis\\.com\\/youtubei\\/v1\\/log_event(?:\\?.*)?$,requires-body", line)
        if line.startswith("hostname ="):
            line = "hostname = %APPEND% youtubei.googleapis.com"
        lines.append(line)
    result = "\n".join(lines) + "\n"
    if "initplayback" in result or "Maasea/sgmodule/master" in result:
        raise ValueError("Unexpected deployment binding")
    scripts = [line for line in lines if " = type=http-" in line]
    if len(scripts) != 2 or not any(line.startswith("youtube.request.log_event =") for line in scripts):
        raise ValueError("Upstream handler set changed: review required")
    for line in scripts:
        if "binary-body-mode=1" not in line or "requires-body=1" not in line:
            raise ValueError("Missing binary body settings")
    rendered = result
    for key, value in DEFAULTS.items():
        rendered = rendered.replace("{{{" + key + "}}}", value)
    if "{{{" in rendered:
        raise ValueError("Unresolved module placeholders")
    for line in rendered.splitlines():
        if "argument=" in line:
            raw = line.split("argument=", 1)[1]
            if not (raw.startswith('"') and raw.endswith('"')):
                raise ValueError("Malformed argument quoting")
            json.loads(raw[1:-1], object_pairs_hook=unique_keys)
    return result


def unique_keys(pairs):
    obj = {}
    for key, value in pairs:
        if key in obj:
            raise ValueError("Duplicate JSON argument key")
        obj[key] = value
    return obj


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", type=Path, default=ROOT)
    args = parser.parse_args()
    revision = json.loads(fetch("https://api.github.com/repos/Maasea/sgmodule/commits/master"))["sha"]
    if not re.fullmatch(r"[0-9a-f]{40}", revision):
        raise ValueError("Invalid upstream revision")
    upstream = {"youtube.sgmodule": fetch(REPO + revision + "/YouTube.Enhance.sgmodule"),
                "youtube.response.js": fetch(REPO + revision + "/Script/Youtube/youtube.response.js"),
                "youtube.request.js": fetch(REPO + revision + "/Script/Youtube/youtube.request.js")}
    license_text = fetch(REPO + revision + "/LICENSE")
    if "Apache License" not in license_text:
        raise ValueError("License changed: review required")
    output = {"youtube.sgmodule": render_module(upstream["youtube.sgmodule"])}
    for name in ("youtube.response.js", "youtube.request.js"):
        validate_script(upstream[name])
        output[name] = ("// CoSN modification: remove configuration-key debug logging; upstream " + revision + "\n"
                        + redact_key_logging(upstream[name]))
        validate_script(output[name].split("\n", 1)[1])
    args.output.mkdir(parents=True, exist_ok=True)
    # Write only after all assets and rendered configuration have passed validation.
    for name, text in output.items():
        (args.output / name).write_text(text)
    (args.output / "youtube.upstream.json").write_text(json.dumps({
        "repository": "https://github.com/Maasea/sgmodule", "revision": revision,
        "upstream_sha256": {name: hashlib.sha256(text.encode()).hexdigest() for name, text in upstream.items()},
        "modifications": ["disable initplayback external Worker handler", "remove key debug logging",
                          "bind reviewed CoSN scripts", "default Focus controls off; retain argument placeholders"]
    }, indent=2) + "\n")
    (args.output / "youtube.LICENSE").write_text(license_text)
    print("Validated candidate from upstream", revision)


if __name__ == "__main__":
    main()
