#!/bin/sh
# Temporary diagnostic wrapper: if uvicorn crashes, serve the crash log
# on the same port instead of exiting, so the traceback is retrievable
# over HTTP. Remove once the deploy is confirmed stable.
uvicorn server:app --host 0.0.0.0 --port 8080 > /tmp/crash.log 2>&1
EXIT_CODE=$?
if [ $EXIT_CODE -ne 0 ]; then
  cat /tmp/crash.log
  python3 -c "
import http.server, socketserver

class Handler(http.server.BaseHTTPRequestHandler):
    def do_GET(self):
        self.send_response(500)
        self.send_header('Content-Type', 'text/plain')
        self.end_headers()
        with open('/tmp/crash.log', 'rb') as f:
            self.wfile.write(f.read())

with socketserver.TCPServer(('0.0.0.0', 8080), Handler) as httpd:
    httpd.serve_forever()
"
fi
