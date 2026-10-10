import importlib.util
import json
from pathlib import Path
import re
import subprocess
import tempfile
import unittest


ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location("pilot", ROOT / "scripts/shadowrocket_pilot.py")
pilot = importlib.util.module_from_spec(spec)
spec.loader.exec_module(pilot)


class PilotTests(unittest.TestCase):
    def test_origin_configs_keep_dispatch_and_remove_map_local(self):
        for candidate in (False, True):
            config = pilot.render_config(candidate, origin=True).decode()
            self.assertNotIn("[Map Local]", config)
            self.assertNotIn("data-type=", config)
            self.assertIn("api.pinterest.com = 127.0.0.1", config)
            self.assertIn("hostname = api.pinterest.com\n", config)
            self.assertEqual("[Script]" in config, candidate)
            self.assertNotIn("skip-cert", config)

    def test_export_matches_renderer_and_refuses_overwrite(self):
        with tempfile.TemporaryDirectory() as directory:
            command = ["python3", str(ROOT / "scripts/shadowrocket_pilot.py"),
                       "export", "--output", directory]
            subprocess.run(command, check=True, capture_output=True)
            baseline = Path(directory) / "cosn-pilot-baseline.conf"
            self.assertEqual(baseline.read_bytes(), pilot.render_config(False))
            self.assertEqual((Path(directory) / "cosn-pilot-candidate.conf").read_bytes(),
                             pilot.render_config(True))
            result = subprocess.run(command, capture_output=True)
            self.assertNotEqual(result.returncode, 0)
            self.assertEqual(baseline.read_bytes(), pilot.render_config(False))

    def test_config_scope_and_baseline_difference(self):
        baseline = pilot.render_config(False).decode()
        candidate = pilot.render_config(True).decode()
        self.assertNotIn("[Script]", baseline)
        self.assertIn("[Script]", candidate)
        for config in (baseline, candidate):
            self.assertIn("api.pinterest.com = 127.0.0.1", config)
            self.assertIn("hostname = api.pinterest.com\n", config)
            self.assertNotIn("%APPEND%", config)  # standalone, not an additive module
            self.assertNotIn("https://raw.", config)
            maps = config.split("[Map Local]\n")[1].split("\n\n")[0].splitlines()
            self.assertEqual(len(maps), len(pilot.CASES))
            for line, (path, body) in zip(maps, pilot.CASES.values()):
                pattern, remainder = line.split(" data-type=text data=", 1)
                self.assertRegex("https://" + pilot.HOST + path, pattern)
                self.assertIsNone(re.search(pattern, "https://" + pilot.HOST + path + "-extra"))
                encoded = remainder.split(" status-code=", 1)[0]
                self.assertEqual(json.loads(encoded), body)

    def test_original_script_against_all_synthetic_cases(self):
        # This verifies fixture expectations, not Shadowrocket execution.
        program = r"""
const fs = require('node:fs'), vm = require('node:vm');
const inputs = JSON.parse(fs.readFileSync(0, 'utf8'));
const source = fs.readFileSync('pinterest.js', 'utf8');
const outputs = inputs.map(([url, body]) => {
  const calls = [];
  vm.runInNewContext(source, {$request: {url}, $response: {body},
    $done: value => calls.push(value), console: {log() {}}}, {timeout: 1000});
  if (calls.length !== 1) throw Error('completion count');
  return calls[0].body;
});
process.stdout.write(JSON.stringify(outputs));
"""
        inputs = [("https://" + pilot.HOST + path, body) for path, body in pilot.CASES.values()]
        result = subprocess.run(["node", "-e", program], input=json.dumps(inputs),
                                text=True, capture_output=True, check=True, cwd=ROOT)
        for name, output in zip(pilot.CASES, json.loads(result.stdout)):
            self.assertTrue(pilot.matches(name, output.encode(), "candidate"), name)

    def test_assertions_distinguish_baseline_from_candidate(self):
        self.assertTrue(pilot.matches("mixed", pilot.MIXED.encode(), "baseline"))
        self.assertFalse(pilot.matches("mixed", pilot.MIXED.encode(), "candidate"))
        filtered = json.dumps(pilot.FILTERED).encode()
        self.assertTrue(pilot.matches("mixed", filtered, "candidate"))
        self.assertFalse(pilot.matches("mixed", filtered, "rollback"))
        self.assertFalse(pilot.matches("mixed", b"", "candidate"))

    def test_checker_refuses_nonlocal_or_ambiguous_proxy(self):
        for proxy in ["http://example.com:8080", "https://127.0.0.1:8080",
                      "http://127.0.0.1:8080/path", "http://user@127.0.0.1:8080"]:
            with self.assertRaises(ValueError):
                pilot.check(proxy, Path("not-a-certificate"), "baseline")


if __name__ == "__main__":
    unittest.main()
