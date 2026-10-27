# Home: search/identify on top, then "Price drops" and "New products" rows (demo, marked), then the Reels strip.
# Needs: VITE_SUPABASE_URL= VITE_CONTACT_EMAIL= npx vite --port 5199 --host 127.0.0.1
import re, sys
from playwright.sync_api import sync_playwright
U = sys.argv[1] if len(sys.argv) > 1 else 'http://127.0.0.1:5199/'
fails = []
def check(n, ok):
    print(('PASS ' if ok else 'FAIL ') + n)
    if not ok: fails.append(n)
with sync_playwright() as p:
    b = p.chromium.launch(); ctx = b.new_context(viewport={'width': 390, 'height': 900}); pg = ctx.new_page(); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.add_init_script("localStorage.setItem('ovoprice_lang_v1','en')")
    pg.goto(U); pg.wait_for_timeout(800)
    drops = pg.get_by_test_id('home-price-drops'); new = pg.get_by_test_id('home-new-products')
    check('"Price drops" row is shown', drops.count() == 1 and drops.get_by_role('heading', name='Price drops').count() == 1)
    check('"New products" row is shown', new.count() == 1 and new.get_by_role('heading', name='New products').count() == 1)
    check('both rows are marked as examples', drops.get_by_text('Example').count() >= 1 and new.get_by_text('Example').count() >= 1)
    check('old "Popular searches" list is gone', pg.get_by_role('heading', name='Popular searches').count() == 0)
    check('price drop cards show discount badges and a price', drops.get_by_role('button').count() == 3 and drops.get_by_text('-24%', exact=True).count() == 1 and drops.get_by_text(re.compile(r'From\s+289,00')).count() == 1)
    check('new cards show NEW and the number of stores, no price', new.get_by_role('button').count() == 2 and new.get_by_text('NEW', exact=True).count() == 2 and new.get_by_text(re.compile(r'€')).count() == 0)
    order = pg.evaluate("""() => { const ids = ['home-price-drops','home-new-products']; const y = ids.map(i => document.querySelector('[data-testid='+i+']').getBoundingClientRect().top); const reels = [...document.querySelectorAll('button')].find(b => b.innerText.includes('Discover Reels')).getBoundingClientRect().top; return [reels, y[0], y[1]]; }""")
    check('order: Reels strip, Price drops, New products', order[0] < order[1] < order[2])
    check('rows scroll sideways without page overflow', pg.evaluate('document.documentElement.scrollWidth <= window.innerWidth'))
    drops.get_by_role('button', name=re.compile('Sony WH-1000XM5')).click(); pg.wait_for_timeout(600)
    check('a price-drop card opens the product page', pg.get_by_role('heading', name='Product Details').count() == 1)
    pg.get_by_role('button', name='Go back').click(); pg.wait_for_timeout(400)
    check('back returns to Home with the rows', pg.get_by_test_id('home-price-drops').count() == 1)
    pg.get_by_test_id('home-new-products').get_by_role('button').first.click(); pg.wait_for_timeout(500)
    check('a card without catalog details shows the "unavailable" state, not a wrong product', pg.get_by_text('Product Details Unavailable').count() >= 1 and pg.get_by_text('Samsung Crystal').count() == 0)
    check('no page errors', not errs)
    b.close()
print('\nFAILED: %d' % len(fails) if fails else '\nALL PASS'); sys.exit(1 if fails else 0)
