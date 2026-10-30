# Photo analysis falls back to the next Gemini model when Google says a model is busy (503 UNAVAILABLE).
# Runs its own fake Gemini on port 5401 and needs the server started against it with a test key:
#   npm run build && NODE_ENV=production PORT=5302 GEMINI_API_KEY=test-key GEMINI_TEST_BASE_URL=http://127.0.0.1:5401 node server.ts
# (The test URL is only used with keys starting with "test-", so a real key is never sent there.)
import json, sys, threading, time, urllib.request
from http.server import BaseHTTPRequestHandler, HTTPServer
U = (sys.argv[1] if len(sys.argv) > 1 else 'http://127.0.0.1:5302').rstrip('/')
fails = []; state = {'busy': set(), 'calls': []}
def check(n, ok):
    print(('PASS ' if ok else 'FAIL ') + n)
    if not ok: fails.append(n)
class H(BaseHTTPRequestHandler):
    def log_message(self, *a): pass
    def do_POST(self):
        self.rfile.read(int(self.headers.get('content-length', 0)))
        model = self.path.split('/models/')[1].split(':')[0]; state['calls'].append(model)
        if model in state['busy']:
            body = json.dumps({'error': {'code': 503, 'message': 'This model is currently experiencing high demand.', 'status': 'UNAVAILABLE'}}).encode(); self.send_response(503)
        else:
            res = {'objectName': f'Kettle via {model}', 'category': 'Kitchen', 'description': 'd', 'observableCharacteristics': ['c'], 'retailerSearchQuery': 'kettle', 'alternatives': []}
            body = json.dumps({'candidates': [{'content': {'role': 'model', 'parts': [{'text': json.dumps(res)}]}, 'finishReason': 'STOP'}]}).encode(); self.send_response(200)
        self.send_header('Content-Type', 'application/json'); self.send_header('Content-Length', str(len(body))); self.end_headers(); self.wfile.write(body)
srv = HTTPServer(('127.0.0.1', 5401), H); threading.Thread(target=srv.serve_forever, daemon=True).start()
PNG = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='
def analyze():
    r = urllib.request.Request(U + '/api/analyze-image', data=json.dumps({'imageBase64': PNG, 'mimeType': 'image/png'}).encode(), headers={'Content-Type': 'application/json'})
    try:
        with urllib.request.urlopen(r) as x: return x.status, json.loads(x.read())
    except urllib.error.HTTPError as e: return e.code, json.loads(e.read())
health = json.loads(urllib.request.urlopen(U + '/api/health').read())
models = [health['model']] + health.get('fallbackModels', [])
check(f'health lists the model order {models}', len(models) >= 2)
for busy_n in range(len(models) + 1):
    state['busy'] = set(models[:busy_n]); state['calls'] = []
    st, body = analyze()
    if busy_n < len(models):
        check(f'{busy_n} model(s) busy -> answer from {models[busy_n]}', st == 200 and body.get('objectName') == f'Kettle via {models[busy_n]}' and state['calls'] == models[:busy_n + 1])
    else:
        check('all models busy -> 503 GEMINI_BUSY (the app retries, then shows "very busy")', st == 503 and body.get('code') == 'GEMINI_BUSY' and 'UNAVAILABLE' in body.get('error', ''))
srv.shutdown()
print('\nFAILED: %d' % len(fails) if fails else '\nALL PASS'); sys.exit(1 if fails else 0)
