# Voice search + keyboard focus e2e. Start `npx vite --port 5199 --host 127.0.0.1`, then: python3 tests/e2e_voice_search.py
# Speech recognition is replaced by a fake that records the language and returns a preset phrase.
import re, sys
from playwright.sync_api import sync_playwright
U=sys.argv[1] if len(sys.argv)>1 else 'http://127.0.0.1:5199/'
fails=[]
def check(n,ok):
    print(('PASS ' if ok else 'FAIL ')+n)
    if not ok: fails.append(n)
FAKE="""
window.__rec = {lang:null, started:0, aborted:0};
class FakeRec {
  start(){ window.__rec.started++; window.__rec.lang=this.lang;
    const mode=window.__mode||'ok';
    setTimeout(()=>{
      if(mode==='ok'){ this.onresult({results:[[{transcript:window.__say||'Sony WH-1000XM5.'}]]}); this.onend(); }
      else if(mode==='denied'){ this.onerror({error:'not-allowed'}); this.onend(); }
      else if(mode==='silent'){ this.onerror({error:'no-speech'}); this.onend(); }
      else if(mode==='hang'){ /* keeps listening until aborted */ }
    },150); }
  abort(){ window.__rec.aborted++; setTimeout(()=>{ this.onerror&&this.onerror({error:'aborted'}); this.onend&&this.onend(); },10); }
}
window.SpeechRecognition = FakeRec;
"""
MIC={'en':'Voice search','de':'Sprachsuche','ro':'Căutare vocală'}
with sync_playwright() as p:
    b=p.chromium.launch()
    # 1) spoken search per language
    for loc,lang,exp,say in [('en-US','en','en-GB','Sony WH-1000XM5.'),('de-DE','de','de-DE','Sony Kopfhörer'),('ro-RO','ro','ro-RO','Căști Sony')]:
        ctx=b.new_context(viewport={'width':430,'height':900},locale=loc); pg=ctx.new_page(); errs=[]; pg.on('pageerror',lambda e:errs.append(str(e)))
        pg.add_init_script(FAKE+f"window.__say={say!r};"); pg.goto(U); pg.wait_for_timeout(500)
        pg.get_by_role('button',name=MIC[lang]).click(); pg.wait_for_timeout(60)
        check(f'{lang}: listening notice shown', pg.get_by_role('status').filter(has_text=re.compile('Listening|Ich höre|Ascult')).count()==1)
        pg.wait_for_timeout(600)
        check(f'{lang}: recognition language {exp}', pg.evaluate('window.__rec.lang')==exp)
        inp=pg.locator('input[type=search]')
        check(f'{lang}: Search screen opened with spoken text', inp.count()==1 and inp.input_value()==say.rstrip('.'))
        check(f'{lang}: not focused when arriving by voice', not pg.evaluate("document.activeElement && document.activeElement.tagName==='INPUT'"))
        if lang=='en':
            pg.wait_for_timeout(500); check('en: results for the spoken text', pg.get_by_text(re.compile('WH-1000XM5')).count()>0)
        check(f'{lang}: no page errors', not errs); ctx.close()
    # Austria uses de-AT
    ctx=b.new_context(viewport={'width':430,'height':900},locale='de-DE'); pg=ctx.new_page()
    pg.add_init_script(FAKE+"localStorage.setItem('ovoprice_country_v1','AT');"); pg.goto(U); pg.wait_for_timeout(400)
    pg.get_by_role('button',name='Sprachsuche').click(); pg.wait_for_timeout(500)
    check('de + Austria -> de-AT', pg.evaluate('window.__rec.lang')=='de-AT'); ctx.close()
    # 2) problems are explained, nothing opens
    for mode,txt in [('denied','Mikrofonzugriff'),('silent','nichts gehört')]:
        ctx=b.new_context(viewport={'width':430,'height':900},locale='de-DE'); pg=ctx.new_page()
        pg.add_init_script(FAKE+f"window.__mode={mode!r};"); pg.goto(U); pg.wait_for_timeout(400)
        pg.get_by_role('button',name='Sprachsuche').click(); pg.wait_for_timeout(500)
        check(f'{mode}: message shown in German, stays on Home', pg.get_by_role('alert').count()==1 and txt in pg.get_by_role('alert').inner_text() and pg.locator('input[type=search]').count()==0); ctx.close()
    # unsupported browser
    ctx=b.new_context(viewport={'width':430,'height':900},locale='en-US'); pg=ctx.new_page()
    pg.add_init_script("delete window.SpeechRecognition; delete window.webkitSpeechRecognition;"); pg.goto(U); pg.wait_for_timeout(400)
    pg.get_by_role('button',name='Voice search').click(); pg.wait_for_timeout(200)
    check('unsupported: honest message', "can't recognise speech" in pg.get_by_role('alert').inner_text()); ctx.close()
    # 3) tap again cancels
    ctx=b.new_context(viewport={'width':430,'height':900},locale='en-US'); pg=ctx.new_page()
    pg.add_init_script(FAKE+"window.__mode='hang';"); pg.goto(U); pg.wait_for_timeout(400)
    pg.get_by_role('button',name='Voice search').click(); pg.wait_for_timeout(200)
    pg.get_by_role('button',name='Stop listening').click(); pg.wait_for_timeout(300)
    check('second tap stops listening, stays on Home', pg.evaluate('window.__rec.aborted')==1 and pg.get_by_role('status').filter(has_text=re.compile('Listening')).count()==0 and pg.locator('input[type=search]').count()==0)
    # 4) the box still opens Search; mic click does not
    pg.get_by_text('What are you looking for?').click(); pg.wait_for_timeout(300)
    check('box opens Search with empty field', pg.locator('input[type=search]').input_value()=='')
    pg.get_by_role('navigation', name='Main Navigation').get_by_role('button').nth(0).click(); pg.wait_for_timeout(200); ctx.close()
    # 5) stale spoken text is not reused
    ctx=b.new_context(viewport={'width':430,'height':900},locale='en-US'); pg=ctx.new_page()
    pg.add_init_script(FAKE); pg.goto(U); pg.wait_for_timeout(400)
    pg.get_by_role('button',name='Voice search').click(); pg.wait_for_timeout(600)
    pg.get_by_role('navigation', name='Main Navigation').get_by_role('button').nth(0).click(); pg.wait_for_timeout(200)
    pg.get_by_role('navigation', name='Main Navigation').get_by_role('button').nth(1).click(); pg.wait_for_timeout(300)
    check('Search from the bottom bar starts empty', pg.locator('input[type=search]').input_value()==''); ctx.close()
    # 6) keyboard: phone/tablet focus the field, computer does not
    for name,kw,exp in [('phone',dict(viewport={'width':390,'height':800},is_mobile=True,has_touch=True),True),
                        ('tablet',dict(viewport={'width':820,'height':1180},is_mobile=True,has_touch=True),True),
                        ('computer',dict(viewport={'width':1280,'height':800}),False)]:
        ctx=b.new_context(locale='en-US',**kw); pg=ctx.new_page(); pg.goto(U); pg.wait_for_timeout(500)
        pg.get_by_text('What are you looking for?').click(); pg.wait_for_timeout(400)
        focused=pg.evaluate("document.activeElement && document.activeElement.tagName==='INPUT'")
        check(f'{name}: search field focused = {exp}', focused==exp); ctx.close()
    b.close()
print('\nFAILS:',fails if fails else 'none'); sys.exit(1 if fails else 0)
