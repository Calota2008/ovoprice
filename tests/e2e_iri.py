# Iri, the mascot: first-visit guide, Home card with example products, tickling, empty states, messages after save/alert.
# Needs the offline dev server (VITE_SUPABASE_URL= VITE_CONTACT_EMAIL=). Usage: python tests/e2e_iri.py [base_url]
import os, re, sys
from playwright.sync_api import sync_playwright

U = sys.argv[1] if len(sys.argv) > 1 else 'http://127.0.0.1:5199/'
fails = []
def check(n, ok):
    print(('PASS ' if ok else 'FAIL ') + n)
    if not ok: fails.append(n)

ROOT = os.path.join(os.path.dirname(__file__), '..', 'public', 'mascot')
poses = ['wave', 'cart', 'search', 'puzzled', 'celebrate', 'heart', 'bell', 'sleep', 'laugh']
check('all 9 pictures exist and are small (< 120 KB)', all(os.path.getsize(os.path.join(ROOT, f'iri_{p}.webp')) < 120_000 for p in poses))

with sync_playwright() as p:
    b = p.chromium.launch()
    for name, vp, mob in [('phone', {'width': 390, 'height': 844}, True), ('pc', {'width': 1366, 'height': 860}, False)]:
        ctx = b.new_context(viewport=vp, is_mobile=mob, has_touch=mob, locale='en-US')
        pg = ctx.new_page(); errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))

        pg.goto(U); pg.wait_for_timeout(800)
        check(f'{name}: automated browsers do not get the guide (other tests stay unblocked)', pg.get_by_test_id('welcome').count() == 0)

        pg.goto(U + '?welcome=1'); pg.wait_for_timeout(900)
        dlg = pg.get_by_role('dialog')
        check(f'{name}: guide opens with Iri saying hi', dlg.count() == 1 and "Hi! I'm Iri" in dlg.inner_text())
        check(f'{name}: step 1 of 3', 'step 1 of 3' in dlg.inner_text().lower())
        pg.get_by_role('button', name='Next').click(); pg.wait_for_timeout(300)
        check(f'{name}: step 2 explains link and barcode are free', 'Both are free' in dlg.inner_text())
        pg.get_by_role('button', name='Next').click(); pg.wait_for_timeout(300)
        check(f'{name}: last step mentions the demo honestly', 'Demo version' in dlg.inner_text())
        pg.get_by_role('button', name="Let's start").click(); pg.wait_for_timeout(300)
        check(f'{name}: guide closes', pg.get_by_role('dialog').count() == 0)
        check(f'{name}: guide remembered', pg.evaluate("localStorage.getItem('ovoprice_welcome_v1')") == 'done')

        # Home card
        card = pg.get_by_test_id('home-iri')
        check(f'{name}: Home card asks "What are we hunting today?"', 'What are we hunting today?' in card.inner_text())
        chips = pg.get_by_test_id('home-examples').get_by_role('button')
        check(f'{name}: 1-4 example products from the catalog', 1 <= chips.count() <= 4)

        # Tickle
        iri = card.get_by_test_id('iri')
        iri.click(); pg.wait_for_timeout(150)
        check(f'{name}: tickling shows a bubble', pg.get_by_test_id('iri-bubble').count() == 1)
        check(f'{name}: tickling shows Iri laughing', 'iri_laugh' in (iri.locator('img').get_attribute('src') or ''))
        pg.wait_for_timeout(2000)
        check(f'{name}: back to normal after a moment', 'iri_cart' in (iri.locator('img').get_attribute('src') or '') and pg.get_by_test_id('iri-bubble').count() == 0)
        for _ in range(5):
            iri.click(); pg.wait_for_timeout(100)
        check(f'{name}: 5 taps -> secret jump in confetti', 'iri_celebrate' in (iri.locator('img').get_attribute('src') or ''))

        # Example -> product page with Iri celebrating the best price, save -> message
        first = chips.first.inner_text()
        chips.first.click(); pg.wait_for_timeout(1200)
        check(f'{name}: example opens the product ({first})', first.split(' ')[0] in pg.locator('h1, h2').all_inner_texts().__str__())
        check(f'{name}: Iri celebrates next to the best price', pg.locator('img[src*="iri_celebrate"]').count() >= 1)
        pg.get_by_role('button', name='Save', exact=True).first.click(); pg.wait_for_timeout(400)
        toast = pg.get_by_test_id('iri-toast')
        check(f'{name}: "Saved!" message with Iri', toast.count() == 1 and 'Saved!' in toast.inner_text())
        pg.wait_for_timeout(3300)
        check(f'{name}: message disappears after 3 seconds', pg.get_by_test_id('iri-toast').count() == 0)
        ctx.close()

        # Empty states
        ctx = b.new_context(viewport=vp, is_mobile=mob, has_touch=mob, locale='en-US'); pg = ctx.new_page()
        pg.on('pageerror', lambda e: errs.append(str(e)))
        pg.goto(U); pg.wait_for_timeout(800)
        pg.get_by_role('button', name='Saved').first.click(); pg.wait_for_timeout(500)
        check(f'{name}: empty Saved shows Iri sleeping', pg.get_by_test_id('saved-empty').locator('img[src*="iri_sleep"]').count() == 1)
        pg.get_by_role('button', name='Alerts').first.click(); pg.wait_for_timeout(500)
        check(f'{name}: empty Alerts shows Iri sleeping', pg.get_by_test_id('alerts-empty').locator('img[src*="iri_sleep"]').count() == 1)
        pg.get_by_role('button', name='Search').first.click(); pg.wait_for_timeout(500)
        pg.get_by_role('searchbox').first.fill('zzzz nothing here'); pg.wait_for_timeout(1500)
        check(f'{name}: no results shows Iri puzzled', pg.get_by_test_id('search-empty').locator('img[src*="iri_puzzled"]').count() == 1)
        check(f'{name}: no page errors', not errs)
        ctx.close()

    ctx = b.new_context(viewport={'width': 390, 'height': 844}, reduced_motion='reduce'); pg = ctx.new_page()
    pg.goto(U); pg.wait_for_timeout(800)
    check('less motion requested -> Iri stands still', pg.get_by_test_id('iri').first.locator('img').evaluate('e => getComputedStyle(e).animationName') == 'none')
    b.close()

print('\nFAILED: %d' % len(fails) if fails else '\nALL PASS'); sys.exit(1 if fails else 0)
