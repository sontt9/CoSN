import importlib.util
import json
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location("update_youtube", ROOT / "scripts/update_youtube.py")
update = importlib.util.module_from_spec(spec)
spec.loader.exec_module(update)


class YouTubeUpdateTests(unittest.TestCase):
    def test_current_module_renders_with_live_arguments(self):
        source = (ROOT / "youtube.sgmodule").read_text()
        rendered = source
        for key, value in update.DEFAULTS.items():
            rendered = rendered.replace("{{{" + key + "}}}", value)
        self.assertNotIn("{{{", rendered)
        args = next(line.split("argument=", 1)[1] for line in rendered.splitlines() if "argument=" in line)
        self.assertEqual(json.loads(args[1:-1])["blockShorts"], False)
        self.assertNotIn("youtube.request.init", source)
        self.assertIn("youtube.request.log_event", source)

    def test_logging_patch_fails_on_unknown_shape(self):
        with self.assertRaises(ValueError):
            update.redact_key_logging("unknown upstream")
        self.assertEqual(update.redact_key_logging('function x(l){F.debug(`saveKeyConfig: ${JSON.stringify(l)}`),F.setJSON(l,k)}'),
                         'function x(l){F.setJSON(l,k)}')

    def test_duplicate_arguments_rejected(self):
        with self.assertRaises(ValueError):
            json.loads('{"debug":false,"debug":true}', object_pairs_hook=update.unique_keys)

    def test_bad_assets_rejected(self):
        for source in ("", "<html>error</html>", "// Build: wrong\ninvalid"):
            with self.assertRaises(ValueError):
                update.validate_script(source)
        with self.assertRaises(ValueError):
            update.render_module("<html>error</html>")

    def test_render_latest_shape_keeps_brace_and_narrows_hosts(self):
        # Reconstruct the approved upstream shape from stable output to exercise rendering.
        source = (ROOT / "youtube.sgmodule").read_text()
        source = source.replace("hostname = %APPEND% youtubei.googleapis.com",
                                "hostname = %APPEND% *.googlevideo.com, youtubei.googleapis.com")
        source = source.replace("[MITM]", "youtube.request.init = type=http-request,pattern=initplayback,requires-body=1,binary-body-mode=1\n\n[MITM]")
        output = update.render_module(source)
        self.assertNotIn("youtube.request.init", output)
        self.assertNotIn("*.googlevideo.com", output)
        self.assertIn("log_event(?:\\?.*)?$", output)
        self.assertIn('"debug":{{{启用调试模式}}}}"', output)


if __name__ == "__main__":
    unittest.main()
