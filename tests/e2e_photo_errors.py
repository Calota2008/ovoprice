# Photo recognition error paths (the server call is mocked; nothing reaches Google):
# network failure, HTML error page from the host, JSON error, and a success that still works.
# Needs: VITE_SUPABASE_URL= VITE_CONTACT_EMAIL= npx vite --port 5199 --host 127.0.0.1
import sys, base64, json, tempfile, os
from playwright.sync_api import sync_playwright
fails = []
def check(n, ok):
    print(('PASS ' if ok else 'FAIL ') + n)
    if not ok: fails.append(n)
PNG = base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==')
tmp = os.path.join(tempfile.mkdtemp(), 'p.png'); open(tmp, 'wb').write(PNG)
OK = {'objectName': 'Test kettle', 'category': 'Kitchen', 'description': 'd', 'observableCharacteristics': ['c'],
      'retailerSearchQuery': 'kettle', 'alternatives': []}

def run(b, lang, handler, expect):
    ctx = b.new_context(viewport={'width': 390, 'height': 800}, locale=f'{lang}-{lang.upper()}')
    pg = ctx.new_page(); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.add_init_script(f"localStorage.setItem('ovoprice_lang_v1','{lang}')")
    pg.route('**/api/analyze-image', handler)
    pg.goto('http://127.0.0.1:5199/'); pg.wait_for_timeout(600)
    pg.locator('input[type=file]').count()
    return ctx, pg, errs

with sync_playwright() as p:
    b = p.chromium.launch()
    cases = [
        ('network failure', lambda r: r.abort(), 'Failed to connect to the image analysis service.'),
        ('HTML error page (502)', lambda r: r.fulfill(status=502, content_type='text/html', body='<html>Bad gateway</html>'), 'Server error while analyzing photograph.'),
        ('HTML page with 200', lambda r: r.fulfill(status=200, content_type='text/html', body='<html>x</html>'), 'Server error while analyzing photograph.'),
        ('JSON error from server', lambda r: r.fulfill(status=500, content_type='application/json', body=json.dumps({'error': 'Gemini key missing'})), 'Gemini key missing'),
    ]
    for name, handler, expect in cases:
        ctx, pg, errs = run(b, 'en', handler, expect)
        pg.get_by_role('button', name='Scan or find product').first.click() if pg.get_by_role('button', name='Scan or find product').count() else None
        pg.wait_for_timeout(300)
        # open the Photo tab
        pg.get_by_role('button', name='Photo', exact=False).first.click(); pg.wait_for_timeout(200)
        pg.locator('input[type=file]').set_input_files(tmp); pg.wait_for_timeout(500)
        pg.get_by_role('button', name='Analyze Photo with Gemini').click(); pg.wait_for_timeout(1500)
        notice = pg.get_by_text('Analysis Notice')
        check(f'{name}: a notice is shown', notice.count() == 1)
        check(f'{name}: message is "{expect}"', pg.get_by_text(expect, exact=True).count() == 1)
        check(f'{name}: no raw browser/JSON error text', pg.get_by_text('Failed to fetch').count() == 0 and pg.get_by_text('Unexpected token').count() == 0)
        check(f'{name}: dialog still open, button usable again', pg.get_by_role('button', name='Analyze Photo with Gemini').is_enabled())
        check(f'{name}: no page errors', not errs); ctx.close()
    # Google overload (503 UNAVAILABLE): retried automatically, then a friendly message, never the raw JSON
    BUSY = json.dumps({'error': json.dumps({'error': {'code': 503, 'message': 'This model is currently experiencing high demand.', 'status': 'UNAVAILABLE'}})})
    def open_photo(pg):
        pg.get_by_role('button', name='Scan or find product').first.click() if pg.get_by_role('button', name='Scan or find product').count() else None
        pg.wait_for_timeout(300)
        pg.get_by_role('button', name='Photo', exact=False).first.click(); pg.wait_for_timeout(200)
        pg.locator('input[type=file]').set_input_files(tmp); pg.wait_for_timeout(500)
        pg.get_by_role('button', name='Analyze Photo with Gemini').click()
    calls = {'n': 0}
    def always_busy(r):
        calls['n'] += 1; r.fulfill(status=503, content_type='application/json', body=BUSY)
    ctx, pg, errs = run(b, 'en', always_busy, ''); open_photo(pg); pg.wait_for_timeout(9000)
    check('503: tried 3 times in total', calls['n'] == 3)
    check('503: friendly message, no raw JSON', pg.get_by_text('The analysis service is very busy right now. Please try again in a minute, or search by name.', exact=True).count() == 1 and pg.get_by_text('UNAVAILABLE').count() == 0 and pg.get_by_text('high demand').count() == 0)
    check('503: button usable again', pg.get_by_role('button', name='Analyze Photo with Gemini').is_enabled())
    check('503: no page errors', not errs); ctx.close()
    calls2 = {'n': 0}
    def busy_once(r):
        calls2['n'] += 1
        if calls2['n'] == 1: r.fulfill(status=503, content_type='application/json', body=BUSY)
        else: r.fulfill(status=200, content_type='application/json', body=json.dumps(OK))
    ctx, pg, errs = run(b, 'en', busy_once, ''); open_photo(pg); pg.wait_for_timeout(4500)
    check('503 once, then success: second attempt gives the result', calls2['n'] == 2 and pg.get_by_text('Test kettle').count() >= 1)
    check('503 once: no page errors', not errs); ctx.close()
    # privacy note next to the Analyze button + price note in the footer
    ctx, pg, errs = run(b, 'en', lambda r: r.abort(), ''); open_photo_tab = None
    pg.get_by_role('button', name='Scan or find product').first.click() if pg.get_by_role('button', name='Scan or find product').count() else None
    pg.wait_for_timeout(300)
    pg.get_by_role('button', name='Photo', exact=False).first.click(); pg.wait_for_timeout(200)
    pg.locator('input[type=file]').set_input_files(tmp); pg.wait_for_timeout(500)
    check('photo: note says the photo goes to Google Gemini and is not stored', pg.get_by_test_id('photo-privacy-note').count() == 1 and 'Google' in pg.get_by_test_id('photo-privacy-note').inner_text() and 'do not store' in pg.get_by_test_id('photo-privacy-note').inner_text())
    ctx.close()
    ctx, pg, errs = run(b, 'en', lambda r: r.abort(), '')
    check('footer: price note shown (VAT, shipping, merchant price counts)', pg.get_by_test_id('price-note').count() == 1 and 'VAT' in pg.get_by_test_id('price-note').inner_text())
    check('footer: no horizontal overflow', pg.evaluate('document.documentElement.scrollWidth <= window.innerWidth'))
    ctx.close()
    # German translation of the network failure
    ctx, pg, errs = run(b, 'de', lambda r: r.abort(), '')
    pg.get_by_role('button', name='Produkt scannen oder suchen').first.click() if pg.get_by_role('button', name='Produkt scannen oder suchen').count() else None
    pg.wait_for_timeout(300)
    pg.get_by_role('button', name='Foto', exact=False).first.click(); pg.wait_for_timeout(200)
    pg.locator('input[type=file]').set_input_files(tmp); pg.wait_for_timeout(500)
    pg.get_by_role('button', name='Foto mit Gemini analysieren').click(); pg.wait_for_timeout(1500)
    check('German: network failure message is German', pg.get_by_text('Verbindung zum Bildanalyse-Dienst fehlgeschlagen.', exact=True).count() == 1 and pg.get_by_text('Failed to fetch').count() == 0)
    ctx.close()
    # success still works
    ctx, pg, errs = run(b, 'en', lambda r: r.fulfill(status=200, content_type='application/json', body=json.dumps(OK)), '')
    pg.get_by_role('button', name='Scan or find product').first.click() if pg.get_by_role('button', name='Scan or find product').count() else None
    pg.wait_for_timeout(300)
    pg.get_by_role('button', name='Photo', exact=False).first.click(); pg.wait_for_timeout(200)
    pg.locator('input[type=file]').set_input_files(tmp); pg.wait_for_timeout(500)
    pg.get_by_role('button', name='Analyze Photo with Gemini').click(); pg.wait_for_timeout(1500)
    check('success: result screen shows the recognized object', pg.get_by_text('Test kettle').count() >= 1)
    check('success: no page errors', not errs); ctx.close(); b.close()
print('\nFAILED: %d' % len(fails) if fails else '\nALL PASS'); sys.exit(1 if fails else 0)
