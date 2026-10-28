# The team's demo clip in Reels: last in the feed, no product (no Compare), marked as a demo. Needs a dev server with VITE_SUPABASE_URL= VITE_CONTACT_EMAIL= (no add-reel flag).
import re, sys
from playwright.sync_api import sync_playwright
U = sys.argv[1] if len(sys.argv) > 1 else 'http://127.0.0.1:5199/'
SHOT = sys.argv[2] if len(sys.argv) > 2 else None
fails = []
def check(n, ok):
    print(('PASS ' if ok else 'FAIL ') + n)
    if not ok: fails.append(n)
with sync_playwright() as p:
    b = p.chromium.launch(); ctx = b.new_context(viewport={'width': 390, 'height': 844}); pg = ctx.new_page(); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.add_init_script("localStorage.setItem('ovoprice_lang_v1','en')")
    pg.goto(U); pg.wait_for_timeout(800)
    pg.get_by_role('button', name=re.compile('Discover Reels')).click(); pg.wait_for_timeout(600)
    pg.keyboard.press('ArrowUp'); pg.wait_for_timeout(400)  # wraps to the last reel
    check('last reel is the demo clip (6 of 6)', pg.get_by_text('6 of 6').is_visible() and pg.get_by_role('heading', name='Demo clip').is_visible())
    check('video element points at the clip', pg.evaluate("() => { const v = document.querySelector('video'); return !!v && v.getAttribute('src') === '/reels/demo_reel.mp4' && v.getAttribute('poster') === '/reels/demo_poster.jpg'; }"))
    check('clip files are served', pg.evaluate("async () => (await fetch('/reels/demo_reel.mp4', {method:'HEAD'})).ok && (await fetch('/reels/demo_poster.jpg', {method:'HEAD'})).ok"))
    check('labelled as the team\'s example, not a product', pg.get_by_text('OvoPrice team').count() >= 1 and pg.get_by_text(re.compile('Not a real product')).count() == 1)
    cmp_btn = pg.get_by_role('button', name='Compare Prices')
    check('Compare is disabled and no price is shown (no product)', cmp_btn.count() == 1 and cmp_btn.is_disabled() and pg.get_by_text(re.compile('€')).count() == 0 and pg.get_by_text('no price comparison for this Reel', exact=False).count() == 1)
    check('no Buy link and no View Details (nothing invented)', pg.get_by_text(re.compile('^Buy at')).count() == 0 and pg.get_by_role('button', name='View Details').count() == 0)
    if SHOT: pg.screenshot(path=SHOT)
    check('no horizontal overflow', pg.evaluate('document.documentElement.scrollWidth <= window.innerWidth'))
    check('no page errors', not errs)
    b.close()
print('\nFAILED: %d' % len(fails) if fails else '\nALL PASS'); sys.exit(1 if fails else 0)
