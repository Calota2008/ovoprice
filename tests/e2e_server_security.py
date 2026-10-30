# Server security (server.ts in production mode): security headers, photo upload checks, rate limit, JSON errors.
# Needs a production build and the server running with a fake Gemini key (nothing valid reaches Google):
#   npm run build && NODE_ENV=production PORT=5302 GEMINI_API_KEY=fake node server.ts
# Usage: python tests/e2e_server_security.py [base_url]
import sys, json, base64, urllib.request

U = (sys.argv[1] if len(sys.argv) > 1 else 'http://127.0.0.1:5302/').rstrip('/')
fails = []
def check(n, ok):
    print(('PASS ' if ok else 'FAIL ') + n)
    if not ok: fails.append(n)

def req(path, body=None, raw=None, method='GET'):
    data = raw if raw is not None else (json.dumps(body).encode() if body is not None else None)
    r = urllib.request.Request(U + path, data=data, method='POST' if data is not None else method,
                               headers={'Content-Type': 'application/json'})
    try:
        with urllib.request.urlopen(r) as x: return x.status, x.headers, x.read()
    except urllib.error.HTTPError as e: return e.code, e.headers, e.read()

st, h, _ = req('/')
check('page loads', st == 200)
for name in ['X-Content-Type-Options', 'X-Frame-Options', 'Referrer-Policy', 'Permissions-Policy', 'Content-Security-Policy', 'Strict-Transport-Security']:
    check(f'header {name}', bool(h.get(name)))
check('no X-Powered-By', h.get('X-Powered-By') is None)
csp = h.get('Content-Security-Policy') or ''
check("CSP: only own scripts, Supabase allowed, no framing", "script-src 'self'" in csp and 'supabase.co' in csp and "frame-ancestors 'none'" in csp)

png = base64.b64encode(b'\x89PNG' + b'0' * 60).decode()
st, h, b = req('/api/analyze-image', {'imageBase64': png, 'mimeType': 'application/pdf'})
check('non-image type rejected (400, JSON)', st == 400 and 'json' in (h.get('Content-Type') or ''))
st, h, b = req('/api/analyze-image', {'imageBase64': '<script>alert(1)</script>', 'mimeType': 'image/png'})
check('non-base64 content rejected (400)', st == 400)
st, h, b = req('/api/analyze-image', {'imageBase64': 'A' * (6 * 1024 * 1024 * 4 // 3), 'mimeType': 'image/png'})
check('photo over 5 MB rejected (413, JSON)', st == 413 and 'json' in (h.get('Content-Type') or ''))
st, h, b = req('/api/analyze-image', raw=json.dumps({'imageBase64': 'A' * 9_000_000}).encode())
check('body over 8 MB answered as JSON 413, not an HTML page', st == 413 and 'json' in (h.get('Content-Type') or ''))
st, h, b = req('/api/analyze-image', raw=b'{bad')
check('broken JSON answered as JSON 400', st == 400 and 'json' in (h.get('Content-Type') or ''))
st, h, b = req('/api/health', raw=json.dumps({'x': 'a' * 200_000}).encode())
check('other routes accept only small bodies (413)', st == 413)

codes = [req('/api/analyze-image', {'imageBase64': png, 'mimeType': 'image/png'})[0] for _ in range(10)]
st, h, b = req('/api/analyze-image', {'imageBase64': png, 'mimeType': 'image/png'})
check('rate limit: after 5 photos per minute -> 429 RATE_LIMIT with Retry-After',
      st == 429 and json.loads(b).get('code') == 'RATE_LIMIT' and h.get('Retry-After'))
st, h, b = req('/api/health')
check('health still works', st == 200 and json.loads(b).get('status') == 'ok')

print('\nFAILED: %d' % len(fails) if fails else '\nALL PASS'); sys.exit(1 if fails else 0)
