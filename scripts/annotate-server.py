#!/usr/bin/env python3
"""annotate-server.py — Local HTTP server for HTML annotation.

Serves static files from a target directory with two additions:
1. HTML files get a <script> tag injected before </body> to load annotate.js
2. REST API at /__ann__/ for reading/writing annotation JSON files

Usage:
    python annotate-server.py <directory> [--port 8787]
"""

import argparse
import json
import os
import sys
from http.server import HTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
from urllib.parse import parse_qs, unquote, urlparse

ASSETS_DIR = Path(__file__).resolve().parent.parent / "assets"
SCRIPT_TAG = '<script src="/__ann__/annotate.js"></script>'


class AnnotateHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, serve_dir, **kwargs):
        self._serve_dir = serve_dir
        super().__init__(*args, directory=serve_dir, **kwargs)

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def do_GET(self):
        parsed = urlparse(self.path)

        if parsed.path == "/__ann__/annotate.js":
            self._serve_asset("annotate.js", "application/javascript")
            return

        if parsed.path == "/__ann__/api/data":
            self._api_get(parsed)
            return

        if parsed.path.endswith(".html") or parsed.path.endswith(".htm"):
            self._serve_html_injected(parsed.path)
            return

        super().do_GET()

    def do_POST(self):
        parsed = urlparse(self.path)
        if parsed.path == "/__ann__/api/data":
            self._api_post(parsed)
            return
        self.send_error(404)

    def do_OPTIONS(self):
        self.send_response(200)
        self._cors()
        self.end_headers()

    def _cors(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")

    def _ann_path(self, parsed):
        qs = parse_qs(urlparse(self.path).query)
        fname = qs.get("file", [""])[0]
        if not fname:
            return None
        base = os.path.splitext(fname)[0]
        return os.path.join(self._serve_dir, base + ".annotations.json")

    def _serve_asset(self, name, content_type):
        fpath = ASSETS_DIR / name
        if not fpath.exists():
            self.send_error(404, f"Asset not found: {name}")
            return
        data = fpath.read_bytes()
        self.send_response(200)
        self.send_header("Content-Type", content_type)
        self._cors()
        self.send_header("Content-Length", len(data))
        self.end_headers()
        self.wfile.write(data)

    def _serve_html_injected(self, path):
        fpath = os.path.join(self._serve_dir, unquote(path.lstrip("/")))
        if not os.path.isfile(fpath):
            self.send_error(404)
            return
        with open(fpath, "rb") as f:
            html = f.read()
        marker = b"</body>"
        idx = html.lower().rfind(marker)
        if idx != -1:
            inject = SCRIPT_TAG.encode()
            html = html[:idx] + inject + b"\n" + html[idx:]
        self.send_response(200)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self._cors()
        self.send_header("Content-Length", len(html))
        self.end_headers()
        self.wfile.write(html)

    def _api_get(self, parsed):
        ann_path = self._ann_path(parsed)
        if not ann_path:
            self._json_resp(400, {"error": "missing file param"})
            return
        if os.path.exists(ann_path):
            with open(ann_path, "r", encoding="utf-8") as f:
                data = f.read()
        else:
            data = "[]"
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self._cors()
        encoded = data.encode()
        self.send_header("Content-Length", len(encoded))
        self.end_headers()
        self.wfile.write(encoded)

    def _api_post(self, parsed):
        ann_path = self._ann_path(parsed)
        if not ann_path:
            self._json_resp(400, {"error": "missing file param"})
            return
        length = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(length)
        try:
            data = json.loads(body)
        except json.JSONDecodeError:
            self._json_resp(400, {"error": "invalid JSON"})
            return
        with open(ann_path, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        self._json_resp(200, {"ok": True, "file": os.path.basename(ann_path)})

    def _json_resp(self, code, obj):
        data = json.dumps(obj).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self._cors()
        self.send_header("Content-Length", len(data))
        self.end_headers()
        self.wfile.write(data)

    def log_message(self, fmt, *args):
        try:
            msg = fmt % args
            if "/__ann__/api/" in msg:
                return
        except Exception:
            pass
        super().log_message(fmt, *args)


def main():
    parser = argparse.ArgumentParser(description="Annotation server for HTML files")
    parser.add_argument("directory", help="Directory to serve")
    parser.add_argument("--port", type=int, default=8787, help="Port (default: 8787)")
    args = parser.parse_args()

    serve_dir = os.path.abspath(args.directory)
    if not os.path.isdir(serve_dir):
        print(f"Error: {serve_dir} is not a directory", file=sys.stderr)
        sys.exit(1)

    handler = lambda *a, **kw: AnnotateHandler(*a, serve_dir=serve_dir, **kw)
    server = HTTPServer(("127.0.0.1", args.port), handler)
    print(f"Annotation server running at http://localhost:{args.port}")
    print(f"Serving: {serve_dir}")
    print(f"HTML files will have annotation UI injected automatically.")
    print(f"Press Ctrl+C to stop.\n")

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nServer stopped.")
        server.server_close()


if __name__ == "__main__":
    main()
