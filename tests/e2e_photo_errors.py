# Photo recognition error paths (the server call is mocked; nothing reaches Google):
# network failure, HTML error page from the host, JSON error, and a success that still works.
# Needs: VITE_SUPABASE_URL= VITE_CONTACT_EMAIL= npx vite --port 5199 --host 127.0.0.1
import sys, base64, json, tempfile, os, re
from playwright.sync_api import sync_playwright
fails = []
def check(n, ok):
    print(('PASS ' if ok else 'FAIL ') + n)
    if not ok: fails.append(n)
PNG = base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==')
tmp = os.path.join(tempfile.mkdtemp(), 'p.png'); open(tmp, 'wb').write(PNG)
OK = {'objectName': 'Test kettle', 'category': 'Kitchen', 'description': 'd', 'observableCharacteristics': ['c'],
      'retailerSearchQuery': 'kettle', 'alternatives': []}

def run(b, lang, handler, expect, viewport=None):
    ctx = b.new_context(viewport=viewport or {'width': 390, 'height': 800}, locale=f'{lang}-{lang.upper()}')
    pg = ctx.new_page(); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.add_init_script(f"localStorage.setItem('ovoprice_lang_v1','{lang}')")
    pg.route('**/api/analyze-image', handler)
    # Photo analysis is for accounts: sign in with the LOCAL TEST ACCOUNT (dev only).
    pg.goto('http://127.0.0.1:5199/?previewAccount=1'); pg.wait_for_timeout(500)
    pg.get_by_role('button', name=re.compile('User Profile|Benutzerprofil|Profil utilizator')).click()
    pg.get_by_role('button', name=re.compile('Create an account|Konto erstellen|Creează un cont')).first.click(); pg.wait_for_timeout(250)
    d = pg.get_by_role('dialog'); d.get_by_role('textbox').first.fill('anna.muster@example.com')
    d.get_by_role('button', name=re.compile('Email me|E-Mail|Trimite')).first.click(); pg.wait_for_timeout(400)
    pg.get_by_test_id('photo-gallery-input').count()
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
        pg.get_by_test_id('photo-gallery-input').set_input_files(tmp); pg.wait_for_timeout(500)
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
        pg.get_by_test_id('photo-gallery-input').set_input_files(tmp); pg.wait_for_timeout(500)
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
    pg.get_by_test_id('photo-gallery-input').set_input_files(tmp); pg.wait_for_timeout(500)
    check('photo: note says the photo goes to Google Gemini and is not stored', pg.get_by_test_id('photo-privacy-note').count() == 1 and 'Google' in pg.get_by_test_id('photo-privacy-note').inner_text() and 'do not store' in pg.get_by_test_id('photo-privacy-note').inner_text())
    ctx.close()
    ctx, pg, errs = run(b, 'en', lambda r: r.abort(), '')
    check('footer: price note shown (VAT, shipping, merchant price counts)', pg.get_by_test_id('price-note').count() == 1 and 'VAT' in pg.get_by_test_id('price-note').inner_text())
    check('footer: no horizontal overflow', pg.evaluate('document.documentElement.scrollWidth <= window.innerWidth'))
    ctx.close()
    # Phone camera: a "Take a photo" button opens the camera directly (capture), "Choose from gallery" the gallery.
    # A big camera photo (over 5 MB) is shrunk in the browser and sent as a small JPEG.
    from PIL import Image as _I
    import numpy as _np
    big = os.path.join(tempfile.mkdtemp(), 'camera.jpg')
    _I.fromarray((_np.random.rand(3000, 4000, 3) * 255).astype('uint8')).save(big, quality=100)
    sent = {}
    def capture_body(r):
        sent['body'] = r.request.post_data_json; r.fulfill(status=200, content_type='application/json', body=json.dumps(OK))
    ctx, pg, errs = run(b, 'en', capture_body, '')
    pg.get_by_role('button', name='Scan or find product').first.click() if pg.get_by_role('button', name='Scan or find product').count() else None
    pg.wait_for_timeout(300)
    pg.get_by_role('button', name='Photo', exact=False).first.click(); pg.wait_for_timeout(200)
    cam = pg.get_by_test_id('photo-camera-input')
    check('camera: "Take a photo" and "Choose from gallery" buttons shown', pg.get_by_test_id('photo-take').is_visible() and pg.get_by_test_id('photo-gallery').is_visible())
    check('camera: camera input opens the back camera (capture=environment, any image)', cam.get_attribute('capture') == 'environment' and cam.get_attribute('accept') == 'image/*')
    check('gallery: gallery input accepts any image, no capture', pg.get_by_test_id('photo-gallery-input').get_attribute('accept') == 'image/*' and pg.get_by_test_id('photo-gallery-input').get_attribute('capture') is None)
    with pg.expect_file_chooser() as fc:
        pg.get_by_test_id('photo-take').click()
    check('camera: the button opens the camera/file chooser', fc.value is not None)
    fc.value.set_files(big); pg.wait_for_timeout(2500)
    check(f'big camera photo ({os.path.getsize(big)//(1024*1024)} MB) accepted, no size error', pg.get_by_role('button', name='Analyze Photo with Gemini').count() == 1 and pg.get_by_text('5 MB limit').count() == 0)
    pg.get_by_role('button', name='Analyze Photo with Gemini').click(); pg.wait_for_timeout(1500)
    b64 = (sent.get('body') or {}).get('imageBase64', '')
    check('big photo sent shrunk as JPEG under 1.5 MB', (sent.get('body') or {}).get('mimeType') == 'image/jpeg' and 0 < len(b64) * 3 / 4 < 1.5 * 1024 * 1024)
    check('big photo: result shown, no page errors', pg.get_by_text('Test kettle').count() >= 1 and not errs); ctx.close()
    # German translation of the network failure
    ctx, pg, errs = run(b, 'de', lambda r: r.abort(), '')
    pg.get_by_role('button', name='Produkt scannen oder suchen').first.click() if pg.get_by_role('button', name='Produkt scannen oder suchen').count() else None
    pg.wait_for_timeout(300)
    pg.get_by_role('button', name='Foto', exact=False).first.click(); pg.wait_for_timeout(200)
    pg.get_by_test_id('photo-gallery-input').set_input_files(tmp); pg.wait_for_timeout(500)
    pg.get_by_role('button', name='Foto mit Gemini analysieren').click(); pg.wait_for_timeout(1500)
    check('German: network failure message is German', pg.get_by_text('Verbindung zum Bildanalyse-Dienst fehlgeschlagen.', exact=True).count() == 1 and pg.get_by_text('Failed to fetch').count() == 0)
    ctx.close()
    # success still works
    ctx, pg, errs = run(b, 'en', lambda r: r.fulfill(status=200, content_type='application/json', body=json.dumps(OK)), '')
    pg.get_by_role('button', name='Scan or find product').first.click() if pg.get_by_role('button', name='Scan or find product').count() else None
    pg.wait_for_timeout(300)
    pg.get_by_role('button', name='Photo', exact=False).first.click(); pg.wait_for_timeout(200)
    pg.get_by_test_id('photo-gallery-input').set_input_files(tmp); pg.wait_for_timeout(500)
    pg.get_by_role('button', name='Analyze Photo with Gemini').click(); pg.wait_for_timeout(1500)
    check('success: result screen shows the recognized object', pg.get_by_text('Test kettle').count() >= 1)
    check('success: no page errors', not errs)
    ctx.close()
    # counter and daily limit (3 per account per day)
    ctx, pg, errs = run(b, 'en', lambda r: r.fulfill(status=200, content_type='application/json', body=json.dumps(OK)), '')
    pg.get_by_role('button', name='Scan or find product').first.click() if pg.get_by_role('button', name='Scan or find product').count() else None
    pg.wait_for_timeout(300)
    pg.get_by_role('button', name='Photo', exact=False).first.click(); pg.wait_for_timeout(200)
    check('account: "3 of 3 photo analyses left today"', pg.get_by_test_id('photo-left').inner_text().startswith('3 of 3'))
    check('photo tab: tip to type the name or scan the barcode first', pg.get_by_test_id('photo-tip').count() == 1)
    pg.get_by_test_id('photo-gallery-input').set_input_files(tmp); pg.wait_for_timeout(500)
    pg.get_by_role('button', name='Analyze Photo with Gemini').click(); pg.wait_for_timeout(1500)
    pg.goto('http://127.0.0.1:5199/'); pg.wait_for_timeout(600)
    pg.get_by_role('button', name='Scan or find product').first.click() if pg.get_by_role('button', name='Scan or find product').count() else None
    pg.wait_for_timeout(300)
    pg.get_by_role('button', name='Photo', exact=False).first.click(); pg.wait_for_timeout(200)
    check('account: after one analysis -> 2 of 3 left', pg.get_by_test_id('photo-left').inner_text().startswith('2 of 3'))
    pg.evaluate("localStorage.setItem('ovoprice_photo_quota_v1', JSON.stringify({day: new Date().toISOString().slice(0,10), used: 3}))")
    pg.goto('http://127.0.0.1:5199/'); pg.wait_for_timeout(600)
    pg.get_by_role('button', name='Scan or find product').first.click() if pg.get_by_role('button', name='Scan or find product').count() else None
    pg.wait_for_timeout(300)
    pg.get_by_role('button', name='Photo', exact=False).first.click(); pg.wait_for_timeout(200)
    check('account: 3 used -> limit message, no photo buttons', pg.get_by_test_id('photo-limit-reached').count() == 1 and pg.get_by_test_id('photo-take').count() == 0)
    pg.evaluate("localStorage.setItem('ovoprice_photo_quota_v1', JSON.stringify({day: '2000-01-01', used: 3}))")
    pg.goto('http://127.0.0.1:5199/'); pg.wait_for_timeout(600)
    pg.get_by_role('button', name='Scan or find product').first.click() if pg.get_by_role('button', name='Scan or find product').count() else None
    pg.wait_for_timeout(300)
    pg.get_by_role('button', name='Photo', exact=False).first.click(); pg.wait_for_timeout(200)
    check('new day -> counter starts again at 3', pg.get_by_test_id('photo-left').inner_text().startswith('3 of 3'))
    ctx.close()
    # visitor without account: no photo analysis, free ways offered
    ctx = b.new_context(viewport={'width': 390, 'height': 800}); pg = ctx.new_page(); calls = []
    pg.route('**/api/analyze-image', lambda r: (calls.append(1), r.abort()))
    pg.add_init_script("localStorage.setItem('ovoprice_lang_v1','en')")
    pg.goto('http://127.0.0.1:5199/'); pg.wait_for_timeout(600)
    pg.get_by_role('button', name='Scan or find product').first.click() if pg.get_by_role('button', name='Scan or find product').count() else None
    pg.wait_for_timeout(300)
    pg.get_by_role('button', name='Photo', exact=False).first.click(); pg.wait_for_timeout(200)
    check('visitor: photo search asks for a free account', pg.get_by_test_id('photo-needs-account').count() == 1 and pg.get_by_test_id('photo-take').count() == 0)
    pg.get_by_test_id('photo-tip').get_by_role('button', name="I'll type the name").click(); pg.wait_for_timeout(400)
    check('visitor: "I\'ll type the name" opens search', pg.get_by_role('searchbox').count() == 1 and not calls)
    ctx.close()
    # Computer: nobody photographs a product with the webcam -> only "Choose a photo" (Home and the photo tab).
    ctx, pg, errs = run(b, 'en', lambda r: r.abort(), '', {'width': 1366, 'height': 860})
    pg.get_by_role('button', name='Close').first.click() if pg.get_by_role('dialog').count() else None
    pg.wait_for_timeout(200)
    opts = pg.get_by_test_id('home-find-options')
    check('PC Home: "Choose a photo" instead of "Take a photo"', opts.get_by_text('Choose a photo').count() == 1 and opts.get_by_text('Take a photo').count() == 0)
    opts.get_by_text('Choose a photo').click(); pg.wait_for_timeout(400)
    check('PC photo tab: no camera button, one "Choose a photo" button', pg.get_by_test_id('photo-take').count() == 0 and pg.get_by_test_id('photo-gallery').inner_text().strip() == 'Choose a photo')
    check('PC: no page errors', not errs)
    ctx.close(); b.close()
print('\nFAILED: %d' % len(fails) if fails else '\nALL PASS'); sys.exit(1 if fails else 0)
