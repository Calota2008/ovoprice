# Microphone language chips (English / Deutsch / Română). Speech recognition is faked. Needs a dev server: VITE_SUPABASE_URL= VITE_CONTACT_EMAIL= npx vite --port 5199 --host 127.0.0.1
import re, sys
from playwright.sync_api import sync_playwright
U = sys.argv[1] if len(sys.argv) > 1 else 'http://127.0.0.1:5199/'
fails = []
def check(n, ok):
    print(('PASS ' if ok else 'FAIL ') + n)
    if not ok: fails.append(n)
FAKE = """
window.__rec = {lang:null, started:0, aborted:0, langs:[]};
class FakeRec {
  start(){ window.__rec.started++; window.__rec.lang=this.lang; window.__rec.langs.push(this.lang);
    const mode=window.__mode||'hang';
    setTimeout(()=>{
      if(mode==='ok'){ this.onresult({results:[[{transcript:window.__say||'Sony WH-1000XM5.'}]]}); this.onend(); }
      else if(mode==='silent'){ this.onerror({error:'no-speech'}); this.onend(); }
    },150); }
  abort(){ window.__rec.aborted++; setTimeout(()=>{ this.onerror&&this.onerror({error:'aborted'}); this.onend&&this.onend(); },10); }
}
window.SpeechRecognition = FakeRec;
"""
with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={'width': 390, 'height': 900}, locale='en-US'); pg = ctx.new_page(); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.add_init_script("if(!sessionStorage.getItem('__seeded')){localStorage.setItem('ovoprice_lang_v1','en');sessionStorage.setItem('__seeded','1')}" + FAKE)
    pg.goto(U); pg.wait_for_timeout(500)
    check('no language chips before listening', pg.get_by_test_id('voice-languages').count() == 0)
    pg.get_by_role('button', name='Voice search').click(); pg.wait_for_timeout(100)
    grp = pg.get_by_test_id('voice-languages')
    check('three languages offered while listening', grp.count() == 1 and [x.inner_text() for x in grp.get_by_role('button').all()] == ['English', 'Deutsch', 'Română'])
    check('starts in the app language (English)', grp.get_by_role('button', name='English').get_attribute('aria-pressed') == 'true' and pg.evaluate('window.__rec.lang') == 'en-GB')
    check('chips are at least 44 px tall', all(x.bounding_box()['height'] >= 44 for x in grp.get_by_role('button').all()))
    grp.get_by_role('button', name='Română').click(); pg.wait_for_timeout(200)
    check('picking Română restarts listening in ro-RO', pg.evaluate('window.__rec.aborted') == 1 and pg.evaluate('window.__rec.langs') == ['en-GB', 'ro-RO'] and pg.get_by_role('status').filter(has_text='Listening').count() == 1)
    check('Română is now the pressed chip', pg.get_by_test_id('voice-languages').get_by_role('button', name='Română').get_attribute('aria-pressed') == 'true')
    grp.get_by_role('button', name='Deutsch').click(); pg.wait_for_timeout(200)
    check('picking Deutsch restarts in de-DE', pg.evaluate('window.__rec.langs')[-1] == 'de-DE')
    pg.get_by_test_id('voice-languages').get_by_role('button', name='Română').click(); pg.wait_for_timeout(200)
    pg.reload(); pg.wait_for_timeout(500)
    pg.get_by_role('button', name='Voice search').click(); pg.wait_for_timeout(100)
    check('the choice is remembered after reload (ro-RO)', pg.evaluate('window.__rec.lang') == 'ro-RO' and pg.get_by_test_id('voice-languages').get_by_role('button', name='Română').get_attribute('aria-pressed') == 'true')
    check('no page errors', not errs)
    ctx.close()
    # German + Austria; picking back the app language forgets the override
    ctx = b.new_context(viewport={'width': 390, 'height': 900}, locale='de-DE'); pg = ctx.new_page()
    pg.add_init_script("localStorage.setItem('ovoprice_country_v1','AT');" + FAKE); pg.goto(U); pg.wait_for_timeout(400)
    pg.get_by_role('button', name='Sprachsuche').click(); pg.wait_for_timeout(100)
    check('German app + Austria -> de-AT, "Ich spreche" label', pg.evaluate('window.__rec.lang') == 'de-AT' and pg.get_by_text('Ich spreche').count() == 1)
    pg.get_by_test_id('voice-languages').get_by_role('button', name='English').click(); pg.wait_for_timeout(200)
    check('English chip in a German app -> en-GB', pg.evaluate('window.__rec.lang') == 'en-GB')
    pg.get_by_test_id('voice-languages').get_by_role('button', name='Deutsch').click(); pg.wait_for_timeout(200)
    check('Deutsch again -> de-AT and nothing stored', pg.evaluate('window.__rec.lang') == 'de-AT' and pg.evaluate("localStorage.getItem('ovoprice_voice_lang_v1')") is None)
    ctx.close()
    # after "no speech" the chips stay so the person can retry in another language
    ctx = b.new_context(viewport={'width': 390, 'height': 900}, locale='en-US'); pg = ctx.new_page()
    pg.add_init_script(FAKE + "window.__mode='silent';"); pg.goto(U); pg.wait_for_timeout(400)
    pg.get_by_role('button', name='Voice search').click(); pg.wait_for_timeout(500)
    check('after "no speech" the chips are still shown', pg.get_by_role('alert').count() == 1 and pg.get_by_test_id('voice-languages').count() == 1)
    check('no horizontal overflow', pg.evaluate('document.documentElement.scrollWidth <= window.innerWidth'))
    ctx.close(); b.close()
print('\nFAILED: %d' % len(fails) if fails else '\nALL PASS'); sys.exit(1 if fails else 0)
