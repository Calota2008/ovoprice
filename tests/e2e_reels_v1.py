# Reels v1: no user posting by default, one primary Compare button (no separate Buy), Share, grid view, Home thumbnails.
# Needs one dev server WITHOUT the flag:  VITE_SUPABASE_URL= VITE_CONTACT_EMAIL= npx vite --port 5196 --host 127.0.0.1
import re, sys
from playwright.sync_api import sync_playwright
U = sys.argv[1] if len(sys.argv) > 1 else 'http://127.0.0.1:5196/'
fails = []
def check(n, ok):
    print(('PASS ' if ok else 'FAIL ') + n)
    if not ok: fails.append(n)
CMP = re.compile(r'^Compare (\d+ prices|Prices)$')
with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={'width': 390, 'height': 900}, permissions=['clipboard-read', 'clipboard-write'])
    pg = ctx.new_page(); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.add_init_script("localStorage.setItem('ovoprice_lang_v1','en')")
    pg.goto(U); pg.wait_for_timeout(700)
    thumbs = pg.get_by_test_id('home-reel-thumbs')
    check('Home shows 3 reel thumbnails', thumbs.count() == 1 and thumbs.locator('img:visible').count() == 3)
    check('thumbnails are inside the one Reels button', pg.get_by_role('button', name=re.compile('Discover Reels')).get_by_test_id('home-reel-thumbs').count() == 1)
    pg.get_by_role('button', name=re.compile('Discover Reels')).click(); pg.wait_for_timeout(900)
    check('no "Add Reel" button for visitors', pg.get_by_role('button', name='Add Reel').count() == 0)
    check('no separate Buy button on a catalog reel', pg.get_by_role('button', name='Buy', exact=True).count() == 0)
    cmp = pg.get_by_role('button', name=CMP)
    check('primary button says "Compare N prices"', cmp.count() == 1 and re.match(r'Compare \d+ prices', cmp.inner_text().strip()) is not None)
    check('Compare is enabled', cmp.is_enabled())
    check('Share button present', pg.get_by_role('button', name='Share product').count() == 1)
    pg.get_by_role('button', name='Share product').click(); pg.wait_for_timeout(400)
    clip = pg.evaluate('navigator.clipboard.readText()')
    check('Share copies a link with ?list=', '?list=' in clip and clip.startswith('http'))
    check('toast says Link copied', pg.get_by_text('Link copied').count() >= 1)
    # the copied link opens the product as a shared list
    pg2 = ctx.new_page(); pg2.add_init_script("localStorage.setItem('ovoprice_lang_v1','en')")
    pg2.goto(clip); pg2.wait_for_timeout(900)
    check('shared link opens the shared list screen', pg2.get_by_role('heading', name='Shared list').count() + pg2.get_by_text('Shared with you').count() >= 1)
    pg2.close()
    # grid
    title_first = pg.locator('h2').first.inner_text()
    pg.get_by_role('button', name='Show all as a grid').click(); pg.wait_for_timeout(300)
    grid = pg.get_by_role('list', name='All reels')
    check('grid shows all 6 reels', grid.count() == 1 and grid.get_by_role('button').count() == 6)
    grid.get_by_role('button').nth(2).click(); pg.wait_for_timeout(400)
    check('tapping a tile opens that reel in the feed', pg.get_by_text('3 of 6').count() == 1)
    check('back toggle available in the feed', pg.get_by_role('button', name='Show all as a grid').count() == 1)
    check('no page errors', not errs)
    b.close()
print('\nFAILED: %d' % len(fails) if fails else '\nALL PASS'); sys.exit(1 if fails else 0)
