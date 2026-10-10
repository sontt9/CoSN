from pathlib import Path
import unittest


class ShadowrocketConfigTests(unittest.TestCase):
    def test_independent_encrypted_dns_without_system_fallback(self):
        text = (Path(__file__).resolve().parents[1] / "CoSN-shadowrocket.conf").read_text()
        settings = dict(line.split(" = ", 1) for line in text.splitlines()
                        if " = " in line and not line.startswith("#"))
        expected = ["https://family.cloudflare-dns.com/dns-query",
                    "https://family.adguard-dns.com/dns-query",
                    "https://doh.cleanbrowsing.org/doh/adult-filter/"]
        for key in ("dns-server", "fallback-dns-server"):
            self.assertEqual([part.strip() for part in settings[key].split(",")], expected)
        self.assertEqual(settings["update-url"],
                         "https://raw.githubusercontent.com/sontt9/CoSN/master/CoSN-shadowrocket.conf")


if __name__ == "__main__":
    unittest.main()
