# Legal pages (Impressum, privacy, terms): footer links, draft banner while operator details are missing,
# details shown when VITE_LEGAL_* are set (never invented), phone line only when set, languages, sign-up note.
# Needs two dev servers:
#   VITE_SUPABASE_URL= VITE_CONTACT_EMAIL= npx vite --port 5199 --host 127.0.0.1                      (no operator details)
#   VITE_SUPABASE_URL= VITE_CONTACT_EMAIL= VITE_LEGAL_NAME="Test Operator" \
#     VITE_LEGAL_ADDRESS="Teststr. 1 | 10115 Berlin | Germany" VITE_LEGAL_EMAIL=legal@example.com \
#     npx vite --port 5195 --host 127.0.0.1                                                           (with details, no phone)
import sys
from playwright.sync_api import sync_playwright
fails = []
def check(n, ok):
    print(('PASS ' if ok else 'FAIL ') + n)
    if not ok: fails.append(n)
def new(b, lang='en'):
    ctx = b.new_context(viewport={'width': 390, 'height': 800}, locale=f'{lang}-{lang.upper()}')
    pg = ctx.new_page(); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.add_init_script(f"localStorage.setItem('ovoprice_lang_v1','{lang}')")
    return ctx, pg, errs
def foot(pg, name):
    pg.get_by_role('navigation', name='Legal' if 'Rechtliches' not in name else name).get_by_role('button', name=name, exact=True).click()
    pg.wait_for_timeout(250)

with sync_playwright() as p:
    b = p.chromium.launch()

    # --- without operator details
    ctx, pg, errs = new(b)
    pg.goto('http://127.0.0.1:5199/'); pg.wait_for_timeout(600)
    nav = pg.get_by_role('navigation', name='Legal')
    check('footer shows Impressum, Privacy, Terms', all(nav.get_by_role('button', name=n, exact=True).count() == 1 for n in ['Impressum', 'Privacy', 'Terms']))
    nav.get_by_role('button', name='Impressum', exact=True).click(); pg.wait_for_timeout(250)
    check('Impressum page opens', pg.get_by_role('heading', name='Legal notice (Impressum)').count() == 1)
    check('header title is Impressum with a back button', pg.get_by_role('button', name='Go back').count() == 1)
    check('draft warning shown while details are missing', pg.get_by_text('Draft: the operator details are not filled in yet').count() == 1)
    check('missing name, address and e-mail are marked, not invented', pg.locator('mark[data-missing]').count() == 3)
    check('no phone line when no phone is set', pg.get_by_text('Phone:').count() == 0)
    check('footer still visible on the legal page', pg.get_by_role('navigation', name='Legal').is_visible())
    check('no horizontal overflow on a phone', pg.evaluate('document.documentElement.scrollWidth <= window.innerWidth'))
    pg.get_by_role('button', name='Go back').click(); pg.wait_for_timeout(250)
    check('back returns to home', pg.get_by_role('heading', name='Legal notice (Impressum)').count() == 0)
    pg.get_by_role('navigation', name='Legal').get_by_role('button', name='Privacy', exact=True).click(); pg.wait_for_timeout(250)
    txt = pg.locator('[data-testid=legal-privacy]').inner_text()
    check('privacy notice names the real processors', all(w in txt for w in ['Render', 'Supabase', 'Resend', 'Gemini']))
    check('privacy notice says no analytics/tracking today', 'do not use advertising or tracking cookies' in txt)
    check('privacy notice (EN) points to the German version', 'the German version applies' in txt)
    pg.get_by_role('navigation', name='Legal').get_by_role('button', name='Terms', exact=True).click(); pg.wait_for_timeout(250)
    txt = pg.locator('[data-testid=legal-terms]').inner_text()
    check('terms mention demo data and affiliate links', 'Demo data' in txt and 'affiliate links' in txt)
    pg.get_by_role('button', name='Search', exact=True).first.click(); pg.wait_for_timeout(300)
    check('footer is also on other screens', pg.get_by_role('navigation', name='Legal').count() == 1)
    check('no page errors (no details)', not errs); ctx.close()

    # --- sign-up note
    ctx, pg, errs = new(b)
    pg.goto('http://127.0.0.1:5199/'); pg.wait_for_timeout(600)
    pg.get_by_role('button', name='User Profile').click(); pg.get_by_role('button', name='Create an account').click(); pg.wait_for_timeout(300)
    note = pg.get_by_test_id('auth-legal-note')
    check('create-account sheet shows the terms/privacy note with 2 links', note.count() == 1 and note.get_by_role('button').count() == 2)
    note.get_by_role('button', name='Terms of use').click(); pg.wait_for_timeout(300)
    check('link closes the sheet and opens the terms', pg.get_by_role('dialog').count() == 0 and pg.get_by_role('heading', name='Terms of use').count() >= 1)
    pg.get_by_role('button', name='User Profile').click(); pg.get_by_role('button', name='Sign in', exact=True).click(); pg.wait_for_timeout(300)
    check('sign-in sheet has no sign-up note', pg.get_by_test_id('auth-legal-note').count() == 0)
    check('no page errors (sheet)', not errs); ctx.close()

    # --- with operator details
    ctx, pg, errs = new(b)
    pg.goto('http://127.0.0.1:5195/'); pg.wait_for_timeout(600)
    pg.get_by_role('navigation', name='Legal').get_by_role('button', name='Impressum', exact=True).click(); pg.wait_for_timeout(250)
    txt = pg.locator('[data-testid=legal-impressum]').inner_text()
    check('operator name, address and e-mail are shown', 'Test Operator' in txt and 'Teststr. 1, 10115 Berlin, Germany' in txt and 'legal@example.com' in txt)
    check('no draft warning and no markers when complete', pg.get_by_text('Draft: the operator details').count() == 0 and pg.locator('mark[data-missing]').count() == 0)
    check('still no phone line', 'Phone:' not in txt)
    check('no page errors (with details)', not errs); ctx.close()

    # --- German and Romanian
    ctx, pg, errs = new(b, 'de')
    pg.goto('http://127.0.0.1:5199/'); pg.wait_for_timeout(600)
    pg.get_by_role('navigation', name='Rechtliches').get_by_role('button', name='Datenschutz', exact=True).click(); pg.wait_for_timeout(250)
    txt = pg.locator('[data-testid=legal-privacy]').inner_text()
    check('German privacy notice is shown in German, without the translation note', 'Datenschutzerklärung' in txt and 'gilt die deutsche Fassung' not in txt)
    check('German draft banner', pg.get_by_text('Entwurf: Die Angaben zum Betreiber').count() == 1)
    check('no page errors (de)', not errs); ctx.close()
    ctx, pg, errs = new(b, 'ro')
    pg.goto('http://127.0.0.1:5199/'); pg.wait_for_timeout(600)
    pg.get_by_role('navigation', name='Informații legale').get_by_role('button', name='Termeni', exact=True).click(); pg.wait_for_timeout(250)
    txt = pg.locator('[data-testid=legal-terms]').inner_text()
    check('Romanian terms with the German-version note', 'Termeni de utilizare' in txt and 'versiunea germană' in txt)
    check('no page errors (ro)', not errs); ctx.close()
    b.close()
print('\nFAILED: %d' % len(fails) if fails else '\nALL PASS'); sys.exit(1 if fails else 0)
