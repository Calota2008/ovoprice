# No request goes to a third party while browsing (no Google Fonts, no CDN, no tracker): visitors' IP
# addresses are not sent anywhere except our own host. Needs:
#   VITE_SUPABASE_URL= VITE_CONTACT_EMAIL= npx vite --port 5199 --host 127.0.0.1   (accounts off)
import re, sys
from playwright.sync_api import sync_playwright
U = 'http://127.0.0.1:5199/'
fails = []
def check(n, ok):
    print(('PASS ' if ok else 'FAIL ') + n)
    if not ok: fails.append(n)
with sync_playwright() as p:
    b = p.chromium.launch(); ctx = b.new_context(viewport={'width': 430, 'height': 900}); pg = ctx.new_page()
    hosts = set(); errs = []
    pg.on('request', lambda r: hosts.add(re.sub(r'^(\w+:)//([^/]+).*$', r'\1//\2', r.url)) if r.url.startswith('http') else None)
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(U); pg.wait_for_timeout(800)
    for name in ['Search', 'Saved', 'Alerts']:
        pg.get_by_role('navigation', name='Main Navigation').get_by_role('button', name=re.compile('^' + name)).first.click(); pg.wait_for_timeout(300)
    pg.get_by_role('navigation', name='Legal').get_by_role('button', name='Privacy', exact=True).click(); pg.wait_for_timeout(300)
    pg.get_by_role('button', name='User Profile').click(); pg.get_by_role('button', name='Account settings').click(); pg.wait_for_timeout(400)
    check('only our own host is contacted: ' + ', '.join(sorted(hosts)), hosts == {'http://127.0.0.1:5199'})
    check('no Google Fonts link in the page', pg.locator('link[href*="googleapis"], link[href*="gstatic"]').count() == 0)
    fam = pg.evaluate("getComputedStyle(document.body).fontFamily")
    loaded = pg.evaluate("document.fonts.ready.then(() => [...document.fonts].filter(f => f.status === 'loaded').map(f => f.family))")
    check('body uses the self-hosted Inter', 'Inter Variable' in fam and any('Inter' in f for f in loaded))
    check('no page errors', not errs)
    b.close()
print('\nFAILED: %d' % len(fails) if fails else '\nALL PASS'); sys.exit(1 if fails else 0)
