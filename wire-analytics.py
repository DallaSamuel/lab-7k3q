#!/usr/bin/env python3
"""Turn the optional usage-sharing feature on or off.

  python3 wire-analytics.py https://script.google.com/macros/s/XXXX/exec   # on
  python3 wire-analytics.py --off                                          # off (default build)

It writes config.js and sets the matching connect-src in the security policy of index.html.
It refuses anything that is not an https address (or http://localhost for testing).
"""
import re, sys
from urllib.parse import urlparse

def main():
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    arg = sys.argv[1].strip()
    here = __file__.rsplit("/", 1)[0] if "/" in __file__ else "."
    idx = here + "/index.html"
    if arg == "--off":
        url, origins = "", ""
    else:
        u = urlparse(arg)
        ok = (u.scheme == "https" and u.hostname) or (u.scheme == "http" and u.hostname == "localhost" and u.port)
        if not ok or not re.fullmatch(r"https://[A-Za-z0-9.-]+(:\d+)?/[\x21-\x7E]*|http://localhost:\d+/[\x21-\x7E]*", arg):
            sys.exit("Refused: use an https address with a path, for example https://script.google.com/macros/s/XXXX/exec")
        url = arg
        origin = "%s://%s%s" % (u.scheme, u.hostname, (":%d" % u.port) if u.port else "")
        origins = origin + (" https://script.googleusercontent.com" if u.hostname == "script.google.com" else "")
    open(here + "/config.js", "w", encoding="utf-8").write(
        "/* Anonymous usage sharing endpoint. Empty = feature hidden, the app never contacts any server. */\n"
        "window.PIPFRAME_CFG = { ingest: %s };\n" % ('"%s"' % url if url else '""'))
    s = open(idx, encoding="utf-8").read()
    new, n = re.subn(r"connect-src [^;]*;", "connect-src 'self'%s;" % ((" " + origins) if origins else ""), s, count=1)
    if n != 1:
        sys.exit("Could not find connect-src in index.html")
    open(idx, "w", encoding="utf-8").write(new)
    print("Usage sharing is now", "ON for " + url if url else "OFF")

main()
