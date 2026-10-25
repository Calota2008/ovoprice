"""Video behaviour test. Needs a TEMPORARY fixture: add videoUrl "/__test_reel.webm" to the first demo reel and "/missing.webm" to the second, and place a short .webm in public/. Revert afterwards."""
import re
from playwright.sync_api import sync_playwright
fails=[]
def check(n,ok):
    print(('PASS ' if ok else 'FAIL ')+n)
    if not ok: fails.append(n)
with sync_playwright() as p:
    b=p.chromium.launch(args=['--autoplay-policy=no-user-gesture-required']); pg=b.new_page(viewport={'width':430,'height':900}); errs=[]
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto('http://127.0.0.1:5199/'); pg.wait_for_timeout(600)
    pg.get_by_role('button', name=re.compile('Discover Reels')).click(); pg.wait_for_timeout(1500)
    check('exactly one <video> in DOM', pg.locator('video').count()==1)
    check('video starts muted', pg.evaluate("document.querySelector('video').muted"))
    check('video is playing', pg.evaluate("!document.querySelector('video').paused"))
    check('mute button present', pg.get_by_role('button', name='Unmute').is_visible())
    pg.get_by_role('button', name='Unmute').click(); pg.wait_for_timeout(200)
    check('unmute applied to video', pg.evaluate("!document.querySelector('video').muted"))
    check('button now says Mute', pg.get_by_role('button', name='Mute').is_visible())
    pg.locator('video').click(); pg.wait_for_timeout(300)
    check('tap pauses video', pg.evaluate("document.querySelector('video').paused"))
    check('play overlay shown', pg.get_by_label('Play').is_visible())
    pg.get_by_label('Play').click(); pg.wait_for_timeout(300)
    check('play resumes', pg.evaluate("!document.querySelector('video').paused"))
    pg.get_by_label('Next Reel').click(); pg.wait_for_timeout(1200)
    check('broken video -> "Video unavailable"', pg.get_by_text('Video unavailable').is_visible())
    check('fallback image shown', pg.get_by_role('img', name=re.compile('Sony')).is_visible())
    check('no video element for broken reel', pg.locator('video').count()==0)
    check('mute hidden when video failed', pg.get_by_role('button', name=re.compile('Mute|Unmute')).count()==0)
    check('buttons still work on broken video', pg.get_by_role('button', name='Compare Prices').is_enabled())
    pg.get_by_label('Next Reel').click(); pg.wait_for_timeout(400)
    check('next reel (no video) -> zero video elements', pg.locator('video').count()==0)
    pg.get_by_label('Previous Reel').click(); pg.get_by_label('Previous Reel').click(); pg.wait_for_timeout(1200)
    check('back on first reel: single video again', pg.locator('video').count()==1)
    check('no page errors', not errs)
    b.close()
print('FAILED:', fails or 'none')
