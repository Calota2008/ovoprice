"""E2E for the local "Add Reel" flow. Usage: python tests/e2e_add_reel.py [base_url]  (needs ffmpeg + Pillow for fixtures)."""
import re, subprocess, sys, tempfile, os
from PIL import Image
from playwright.sync_api import sync_playwright

U = sys.argv[1] if len(sys.argv) > 1 else 'http://127.0.0.1:5199/'
fails = []
def check(name, ok):
    print(('PASS ' if ok else 'FAIL ') + name)
    if not ok: fails.append(name)

tmp = tempfile.mkdtemp()
video = os.path.join(tmp, 'demo.webm')
long_video = os.path.join(tmp, 'long.webm')
photo = os.path.join(tmp, 'photo.jpg')
fake = os.path.join(tmp, 'fake.mp4')
text = os.path.join(tmp, 'notes.txt')
subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-f', 'lavfi', '-i', 'testsrc=duration=2:size=160x284:rate=10',
                '-c:v', 'libvpx', '-b:v', '100k', video], check=True)
subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-f', 'lavfi', '-i', 'color=c=black:s=64x64:r=1:d=100',
                '-c:v', 'libvpx', '-b:v', '10k', long_video], check=True)
Image.new('RGB', (2400, 1600), (30, 120, 200)).save(photo)
open(fake, 'wb').write(b'this is not a video' * 50)
open(text, 'w').write('hello')

SONY_EAN = '4548736132580'
UNKNOWN_EAN = '4006381333931'

def open_reels(pg):
    pg.goto(U); pg.wait_for_timeout(600)
    pg.get_by_role('button', name=re.compile('Discover Reels')).click(); pg.wait_for_timeout(800)

with sync_playwright() as p:
    b = p.chromium.launch(args=['--autoplay-policy=no-user-gesture-required'])
    ctx = b.new_context(viewport={'width': 430, 'height': 900})
    pg = ctx.new_page(); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    open_reels(pg)
    media = lambda: pg.locator('#reel-media')

    pg.get_by_role('button', name='Add Reel').first.click(); pg.wait_for_timeout(300)
    check('modal opens, privacy note shown', pg.get_by_text(re.compile('stored only on this device')).is_visible())
    pg.get_by_role('button', name='Save Reel').click(); pg.wait_for_timeout(200)
    check('empty submit: media + name errors', pg.get_by_text('Choose a video or a photo.').is_visible() and pg.get_by_text('Enter the product name.').is_visible())

    media().set_input_files(text); pg.wait_for_timeout(300)
    check('unsupported file type rejected', pg.get_by_text(re.compile('Unsupported file type')).first.is_visible())
    media().set_input_files(fake); pg.wait_for_timeout(1500)
    check('unplayable video rejected', pg.get_by_text(re.compile("can't be played|Could not read this video")).first.is_visible())
    media().set_input_files(long_video); pg.wait_for_timeout(2000)
    check('video over 90s rejected', pg.get_by_text(re.compile('at most 90 seconds')).is_visible())

    pg.locator('#reel-ean').fill('123'); pg.get_by_role('button', name='Match').click(); pg.wait_for_timeout(200)
    check('short barcode rejected', pg.get_by_text(re.compile('8, 12, 13 or 14 digits')).is_visible())
    pg.locator('#reel-ean').fill('4548736132581'); pg.get_by_role('button', name='Match').click(); pg.wait_for_timeout(200)
    check('wrong check digit rejected', pg.get_by_text(re.compile('looks wrong')).is_visible())
    pg.locator('#reel-ean').fill(UNKNOWN_EAN); pg.get_by_role('button', name='Match').click(); pg.wait_for_timeout(400)
    check('unknown barcode -> honest note, no match', pg.get_by_text(re.compile('Not in the catalog yet')).is_visible())

    # 1) matched reel with video
    pg.locator('#reel-ean').fill(SONY_EAN); pg.get_by_role('button', name='Match').click(); pg.wait_for_timeout(500)
    check('catalog match found', pg.get_by_text(re.compile('Matched: Sony')).is_visible())
    check('name auto-filled from catalog', 'Sony' in pg.locator('#reel-title').input_value())
    check('specs auto-filled (Brand/Model/Color)', pg.get_by_label('Specification 1 label').input_value() == 'Brand')
    media().set_input_files(video); pg.wait_for_timeout(1200)
    pg.locator('#reel-title').fill('My Sony XM5 review')
    pg.get_by_role('button', name='Save Reel').click(); pg.wait_for_timeout(1200)
    check('reel added, modal closed', pg.get_by_role('dialog').count() == 0 and pg.get_by_text('1 of 6').is_visible())
    check('own reel labelled as device-only', pg.get_by_text(re.compile('this device only')).is_visible())
    check('video element present and playing', pg.locator('video').count() == 1 and pg.evaluate("!document.querySelector('video').paused"))
    check('spec chips shown', pg.get_by_role('list', name='Specifications').is_visible())
    check('matched reel: Compare enabled and no separate Buy button', pg.get_by_role('button', name=re.compile(r'^Compare (\d+ prices|Prices)$')).is_enabled() and pg.get_by_role('button', name='Buy', exact=True).count() == 0)
    pg.get_by_role('button', name=re.compile(r'^Compare (\d+ prices|Prices)$')).click(); pg.wait_for_timeout(400)
    pg.get_by_role('button', name=re.compile('^See (all|full)')).click(); pg.wait_for_timeout(700)
    body = pg.inner_text('body')
    check('Compare opens the matched product (Sony only)', 'Sony' in body and 'Dyson' not in body and 'Samsung' not in body)
    pg.get_by_role('button', name=re.compile('Back|back')).first.click(); pg.wait_for_timeout(1500)
    check('back returns to the same own reel', pg.get_by_text('1 of 6').is_visible() and pg.get_by_text(re.compile('this device only')).is_visible())

    # 2) unmatched reel with photo + specs + merchant link
    pg.get_by_role('button', name='Add Reel').first.click(); pg.wait_for_timeout(300)
    media().set_input_files(photo); pg.wait_for_timeout(500)
    pg.locator('#reel-title').fill('Handmade lamp')
    pg.locator('#reel-subtitle').fill('Warm light, oak base')
    pg.locator('#reel-category').fill('Home')
    pg.get_by_role('button', name='Add specification').click()
    pg.get_by_label('Specification 1 label').fill('Height')
    pg.get_by_role('button', name='Save Reel').click(); pg.wait_for_timeout(200)
    check('half-filled spec row rejected', pg.get_by_text(re.compile('Fill both the label and the value')).is_visible())
    pg.get_by_label('Specification 1 value').fill('32 cm')
    for bad in ['javascript:alert(1)', 'http://shop.example.com/lamp', 'not a url']:
        pg.locator('#reel-buy').fill(bad); pg.get_by_role('button', name='Save Reel').click(); pg.wait_for_timeout(200)
        check(f'unsafe/invalid merchant link rejected: {bad}', pg.get_by_text(re.compile('full https:// link')).is_visible() and pg.get_by_role('dialog').count() == 1)
    pg.locator('#reel-buy').fill('https://shop.example.com/lamp')
    pg.get_by_label('This is an affiliate link').check()
    pg.get_by_role('button', name='Save Reel').click(); pg.wait_for_timeout(1000)
    check('photo reel added first (1 of 7)', pg.get_by_text('1 of 7').is_visible() and pg.get_by_role('heading', name='Handmade lamp').is_visible())
    check('category uppercased', pg.get_by_text('HOME', exact=True).first.is_visible())
    check('photo shown (no video element)', pg.get_by_role('img', name='Handmade lamp').is_visible() and pg.locator('video').count() == 0)
    check('photo downscaled (<=1280px)', pg.evaluate("document.querySelector('img[alt=\"Handmade lamp\"]').naturalWidth") <= 1280)
    check('spec chip Height: 32 cm', pg.get_by_text('32 cm').is_visible())
    check('unmatched: Compare disabled + honest message', pg.get_by_role('button', name=re.compile(r'^Compare (\d+ prices|Prices)$')).is_disabled() and pg.get_by_text(re.compile('Not matched to a catalog product')).is_visible())
    buy = pg.get_by_role('link', name=re.compile('Buy at shop.example.com'))
    check('creator Buy link: https, new tab, noopener', buy.get_attribute('href') == 'https://shop.example.com/lamp' and buy.get_attribute('target') == '_blank' and 'noopener' in buy.get_attribute('rel'))
    check('affiliate disclosure shown for creator link', pg.get_by_text(re.compile('Some links may be affiliate links')).is_visible())
    check('no Save/View Details for unmatched reel', pg.get_by_role('button', name='Save product').count() == 0 and pg.get_by_role('button', name='View Details').count() == 0)
    pg.get_by_role('tab', name='Saved Products').click(); pg.wait_for_timeout(200)
    check('unmatched reel not in Saved tab', pg.get_by_text(re.compile("haven't saved")).is_visible())
    pg.get_by_role('button', name='Back to For You').click(); pg.wait_for_timeout(200)

    # persistence
    pg.reload(); pg.wait_for_timeout(600)
    pg.get_by_role('button', name=re.compile('Discover Reels')).click(); pg.wait_for_timeout(1500)
    check('both own reels survive reload (1 of 7)', pg.get_by_text('1 of 7').is_visible() and pg.get_by_role('heading', name='Handmade lamp').is_visible())
    check('photo still loads after reload', pg.evaluate("document.querySelector('img[alt=\"Handmade lamp\"]').naturalWidth") > 0)
    pg.get_by_label('Next Reel').click(); pg.wait_for_timeout(1200)
    check('video reel still plays after reload', pg.locator('video').count() == 1 and pg.evaluate("document.querySelector('video').readyState") >= 2)

    # delete (two-step)
    pg.get_by_role('button', name='Delete reel').click(); pg.wait_for_timeout(200)
    check('delete needs confirmation', pg.get_by_role('button', name='Confirm delete reel').is_visible() and pg.get_by_text('2 of 7').is_visible())
    pg.get_by_role('button', name='Confirm delete reel').click(); pg.wait_for_timeout(500)
    check('reel deleted (6 left)', pg.get_by_text(re.compile(r'of 6$')).first.is_visible())
    pg.reload(); pg.wait_for_timeout(600)
    pg.get_by_role('button', name=re.compile('Discover Reels')).click(); pg.wait_for_timeout(1200)
    check('delete persists after reload', pg.get_by_text('1 of 6').is_visible())

    # corrupted / orphan storage
    pg.evaluate("localStorage.setItem('ovoprice_user_reels_v1','{bad')")
    pg.reload(); pg.wait_for_timeout(600)
    pg.get_by_role('button', name=re.compile('Discover Reels')).click(); pg.wait_for_timeout(1000)
    check('corrupt local reels data -> catalog reels still work (1 of 5)', pg.get_by_text('1 of 5').is_visible())
    pg.evaluate("""localStorage.setItem('ovoprice_user_reels_v1', JSON.stringify([
      {id:'local-orphan',title:'Ghost',subtitle:'',category:'X',specs:[],isAffiliate:false,mediaKind:'image',createdAt:1},
      {id:'x',title:'Bad link',subtitle:'',category:'X',specs:[],isAffiliate:false,buyUrl:'javascript:alert(1)',mediaKind:'image',createdAt:1}]))""")
    pg.reload(); pg.wait_for_timeout(600)
    pg.get_by_role('button', name=re.compile('Discover Reels')).click(); pg.wait_for_timeout(1000)
    check('orphan / unsafe stored entries ignored (1 of 5)', pg.get_by_text('1 of 5').is_visible() and pg.get_by_text('Ghost').count() == 0)
    check('no page errors', not errs)
    if errs: print(errs[:3])
    ctx.close(); b.close()
print('FAILED:', fails or 'none')
sys.exit(1 if fails else 0)
