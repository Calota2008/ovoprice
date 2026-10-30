# PC Reels: filters on the left, reel in the middle, product on the right; mouse wheel and arrows move between reels.
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
    pg.get_by_role('navigation', name='Main Navigation').get_by_role('button', name='Reels', exact=True).click(); pg.wait_for_timeout(800)
    f = pg.get_by_test_id('reels-filters').bounding_box(); m = pg.locator('.touch-pan-x').first.bounding_box(); r = pg.get_by_test_id('reels-product-panel').bounding_box()
    check('PC: three columns (filters | reel | product)', f['x'] + f['width'] <= m['x'] + 2 and m['x'] + m['width'] <= r['x'] + 2 and abs(f['y'] - r['y']) < 80)
    check('PC: starts at 1 of 6', pg.get_by_text('1 of 6').is_visible())
    pg.mouse.move(m['x'] + m['width'] / 2, m['y'] + m['height'] / 2)
    pg.mouse.wheel(0, 120); pg.wait_for_timeout(700)
    check('PC: mouse wheel down -> 2 of 6', pg.get_by_text('2 of 6').is_visible())
    pg.mouse.wheel(0, 120); pg.wait_for_timeout(100); pg.mouse.wheel(0, 120); pg.wait_for_timeout(700)
    check('PC: one step per scroll gesture (fast repeats are ignored)', pg.get_by_text('3 of 6').is_visible())
    pg.mouse.wheel(0, -120); pg.wait_for_timeout(700)
    check('PC: mouse wheel up -> back', pg.get_by_text('2 of 6').is_visible())
    pg.get_by_label('Next Reel').click(); pg.wait_for_timeout(300)
    check('PC: arrow buttons still work', pg.get_by_text('3 of 6').is_visible())
    pg.get_by_role('tab', name='Categories').click(); pg.wait_for_timeout(300)
    check('PC: categories listed in the left column', pg.get_by_test_id('reels-filters').get_by_label('Categories').locator('button').count() >= 2)
    pg.get_by_label('Show all as a grid').click(); pg.wait_for_timeout(300)
    check('PC: grid shows 4 per row', pg.get_by_label('All reels').locator('li').count() >= 4 and len(set(round(pg.get_by_label('All reels').locator('li').nth(i).bounding_box()['y']) for i in range(4))) == 1)
    pg.get_by_label('Show one by one').click(); pg.wait_for_timeout(300)
    pg.get_by_role('tab', name='For You').click(); pg.wait_for_timeout(300)
    pg.get_by_role('button', name=re.compile(r'Compare \d+ prices')).click(); pg.wait_for_timeout(400)
    check('PC: compare sheet opens', pg.get_by_label(re.compile('Buy at ')).count() >= 1)
    check('PC: no horizontal overflow, no errors', pg.evaluate('document.documentElement.scrollWidth <= window.innerWidth') and not errs)
    ctx.close(); b.close()
print('\nFAILED: %d' % len(fails) if fails else '\nALL PASS'); sys.exit(1 if fails else 0)
