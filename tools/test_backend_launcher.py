"""Black-box checks: an occupied port never starts a second Maven/backend process."""
import os
from pathlib import Path
import subprocess
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from threading import Thread
import unittest

ROOT = Path(__file__).resolve().parents[1]


@unittest.skipUnless(os.name == "nt", "Windows PowerShell launcher")
class BackendLauncherTest(unittest.TestCase):
    def probe_occupied_port(self, status):
        requests = []

        class Handler(BaseHTTPRequestHandler):
            def do_GET(self):
                requests.append(self.path)
                self.send_response(status)
                self.send_header("Content-Length", "0")
                self.end_headers()

            def log_message(self, *args):
                pass

        with ThreadingHTTPServer(("127.0.0.1", 0), Handler) as server:
            worker = Thread(target=server.serve_forever, kwargs={"poll_interval": 0.05}, daemon=True)
            worker.start()
            try:
                environment = dict(os.environ, MXZG_PORT=str(server.server_port))
                result = subprocess.run([
                    "powershell.exe", "-NoProfile", "-ExecutionPolicy", "Bypass",
                    "-File", str(ROOT / "backend/dev.ps1"), "-Action", "run",
                ], cwd=ROOT, env=environment, capture_output=True, text=True,
                    encoding="utf-8", errors="replace", timeout=15)
            finally:
                server.shutdown()
                worker.join(timeout=2)
        self.assertNotEqual(result.returncode, 0)
        self.assertEqual(requests, ["/api/v1/heroes"])
        output = result.stdout + result.stderr
        self.assertNotIn("Scanning for projects", output)
        return output

    def test_old_backend_explains_restart(self):
        output = self.probe_occupied_port(404)
        self.assertIn("OLD backend", output)
        self.assertIn("HTTP 404", output)
        self.assertIn("Ctrl+C", output)

    def test_authenticated_endpoint_keeps_existing_server(self):
        output = self.probe_occupied_port(401)
        self.assertIn("already in use", output)
        self.assertNotIn("OLD backend", output)

    def test_other_server_is_not_stopped(self):
        output = self.probe_occupied_port(200)
        self.assertIn("already in use", output)
        self.assertIn("does not stop other processes", output)


if __name__ == "__main__":
    unittest.main()
