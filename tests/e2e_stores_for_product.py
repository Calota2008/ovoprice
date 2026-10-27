# "Where to look": shops of the right kind per product and country, search links only, no prices.
# Needs: VITE_SUPABASE_URL= VITE_CONTACT_EMAIL= npx vite --port 5199 --host 127.0.0.1
import re, sys
from playwright.sync_api import sync_playwright
U = sys.argv[1] if len(sys.argv) > 1 else 'http://127.0.0.1:5199/'
fails = []
def check(n, ok):
    print(('PASS ' if ok else 'FAIL ') + n)
    if not ok: fails.append(n)
def open_product(pg, name, lang='en'):
    nav, srch = ('Main Navigation', 'Search') if lang == 'en' else ('Hauptnavigation', 'Suchen')
    pg.goto(U); pg.wait_for_timeout(500)
    pg.get_by_role('navigation', name=nav).get_by_role('button').filter(has_text=srch).first.click(); pg.wait_for_timeout(300)
    pg.locator('button').filter(has_text=name).first.click(); pg.wait_for_timeout(400)
    pg.locator('button').filter(has_text='DEMO').first.click(); pg.wait_for_timeout(700)
with sync_playwright() as p:
    b = p.chromium.launch()
    def ctx(lang='en', country=None):
        c = b.new_context(viewport={'width': 390, 'height': 900}, locale=f'{lang}-{lang.upper()}')
        pg = c.new_page(); errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        pg.add_init_script(f"localStorage.setItem('ovoprice_lang_v1','{lang}')" + (f";localStorage.setItem('ovoprice_country_v1','{country}')" if country else ''))
        return c, pg, errs
    c, pg, errs = ctx(country='DE')
    open_product(pg, 'Sony WH-1000XM5')
    sec = pg.get_by_test_id('stores-for-product')
    check('section is shown on the product screen', sec.count() == 1 and sec.is_visible())
    txt = sec.inner_text()
    check('electronics shops listed (DE)', all(n in txt for n in ['MediaMarkt', 'Saturn', 'Cyberport']))
    check('no furniture / DIY / drugstore shops for headphones', not any(n in txt for n in ['IKEA', 'XXXLutz', 'Hornbach', 'OBI', 'Rossmann', 'Hartlauer']))
    check('says these are search links, not prices', 'search links, not prices' in txt)
    links = sec.get_by_role('link')
    hrefs = [links.nth(i).get_attribute('href') for i in range(links.count())]
    check('all links are https and open in a new tab safely', all(h.startswith('https://') for h in hrefs) and all('noopener' in (links.nth(i).get_attribute('rel') or '') and links.nth(i).get_attribute('target') == '_blank' for i in range(links.count())))
    check('MediaMarkt link is its own search page with the product', any(h.startswith('https://www.mediamarkt.de/de/search.html?query=') and 'Sony' in h for h in hrefs))
    check('no price text in the section', not re.search(r'\d+[,.]\d{2}\s*€', txt))
    check('no page errors (DE)', not errs); c.close()

    c, pg, errs = ctx(country='AT')
    open_product(pg, 'Sony WH-1000XM5')
    txt = pg.get_by_test_id('stores-for-product').inner_text()
    hrefs = [pg.get_by_test_id('stores-for-product').get_by_role('link').nth(i).get_attribute('href') for i in range(pg.get_by_test_id('stores-for-product').get_by_role('link').count())]
    check('Austria: Austrian shops, not German-only ones', 'Hartlauer' in txt and 'OTTO' not in txt and 'notebooksbilliger' not in txt)
    check('Austria: MediaMarkt points to mediamarkt.at', any(h.startswith('https://www.mediamarkt.at/') for h in hrefs))
    check('Austria: mentions Austria', 'Austria' in txt)
    check('no page errors (AT)', not errs); c.close()

    c, pg, errs = ctx(country='DE')
    open_product(pg, 'De’Longhi Magnifica S') if False else open_product(pg, 'Magnifica')
    txt = pg.get_by_test_id('stores-for-product').inner_text()
    check('coffee machine: appliance shops, no furniture / DIY', 'MediaMarkt' in txt and 'Expert' in txt and not any(n in txt for n in ['IKEA', 'Hornbach']))
    c.close()

    c, pg, errs = ctx(lang='de', country='DE')
    open_product(pg, 'Sony WH-1000XM5', 'de')
    txt = pg.get_by_test_id('stores-for-product').inner_text()
    check('German text', 'Wo du suchen kannst' in txt and 'Suchlinks, keine Preise' in txt and 'Deutschland' in txt)
    c.close(); b.close()
print('\nFAILED: %d' % len(fails) if fails else '\nALL PASS'); sys.exit(1 if fails else 0)
