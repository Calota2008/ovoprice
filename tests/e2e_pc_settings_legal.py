# PC: settings and legal pages share a side menu and a readable text column. Phone unchanged.
# Needs: VITE_SUPABASE_URL= VITE_CONTACT_EMAIL= npx vite --port 5199 --host 127.0.0.1
import re, sys
from playwright.sync_api import sync_playwright
U = sys.argv[1] if len(sys.argv) > 1 else 'http://127.0.0.1:5199/'
fails = []
def check(n, ok):
    print(('PASS ' if ok else 'FAIL ') + n)
    if not ok: fails.append(n)
with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={'width': 1280, 'height': 900}); pg = ctx.new_page(); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.add_init_script("localStorage.setItem('ovoprice_lang_v1','en')")
    pg.goto(U); pg.wait_for_timeout(800)
    pg.get_by_role('button', name='Privacy').first.click(); pg.wait_for_timeout(500)
    menu = pg.get_by_role('navigation', name='Settings and legal')
    check('PC: side menu + privacy page', menu.count() == 1 and pg.get_by_test_id('legal-privacy').count() == 1)
    check('PC: Privacy marked as current', menu.get_by_role('button', name='Privacy').get_attribute('aria-current') == 'page')
    w = pg.get_by_test_id('legal-privacy').bounding_box()['width']
    check(f'PC: text column readable width ({int(w)} px <= 720)', w <= 720)
    menu.get_by_role('button', name='Terms').click(); pg.wait_for_timeout(300)
    check('PC: menu opens Terms', pg.get_by_test_id('legal-terms').count() == 1)
    menu.get_by_role('button', name='Impressum').click(); pg.wait_for_timeout(300)
    check('PC: menu opens Impressum', pg.get_by_test_id('legal-impressum').count() == 1)
    menu.get_by_role('button', name='Account settings').click(); pg.wait_for_timeout(400)
    check('PC: menu opens Account settings', pg.get_by_test_id('settings-legal-desktop').get_by_role('heading', name='Account settings').count() == 1)
    pg.get_by_role('radio', name='Deutsch').check() if pg.get_by_role('radio', name='Deutsch').count() else pg.get_by_text('Deutsch', exact=True).click()
    pg.wait_for_timeout(400)
    check('PC: language switch still works from settings', pg.get_by_role('navigation', name=re.compile('Einstellungen')).count() == 1)
    check('PC: no overflow, no errors', pg.evaluate('document.documentElement.scrollWidth <= window.innerWidth') and not errs); ctx.close()
    ctx = b.new_context(viewport={'width': 390, 'height': 844}); pg = ctx.new_page()
    pg.add_init_script("localStorage.setItem('ovoprice_lang_v1','en')")
    pg.goto(U); pg.wait_for_timeout(800)
    pg.get_by_role('button', name='Privacy').first.click(); pg.wait_for_timeout(500)
    check('phone: legal page without the side menu', pg.get_by_role('navigation', name='Settings and legal').count() == 0 and pg.get_by_test_id('legal-privacy').count() == 1)
    ctx.close(); b.close()
print('\nFAILED: %d' % len(fails) if fails else '\nALL PASS'); sys.exit(1 if fails else 0)
