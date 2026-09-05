"""Chromium QA using the exact local source, injected with set_content.
Browser navigation is policy-blocked in the authoring environment, including
localhost. This is a rendering/input test, not hosting or physical Safari QA.
Campaign pilot activates DOM controls only; it never mutates simulation state.
Requires Playwright. Usage: python tests/browser.py /tmp/cv2-qa
"""
from pathlib import Path
import json, os, re, shutil, sys, tempfile
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
OUT=Path(sys.argv[1]) if len(sys.argv)>1 else Path(tempfile.mkdtemp(prefix='cv2-qa-'))
OUT.mkdir(parents=True,exist_ok=True)
checks=[];errors=[]
def check(name,ok):
    assert ok,name
    checks.append(name);print('PASS '+name,flush=True)
def source():
    h=(ROOT/'index.html').read_text()
    h=h.replace('<link rel="stylesheet" href="./style.css">','<style>'+(ROOT/'style.css').read_text()+'</style>')
    h=re.sub(r'<script defer src="[^"]+"></script>','',h)
    scripts='\n'.join((ROOT/f).read_text() for f in ['core.js','art.js','world.js','app.js'])
    return h.replace('</body>','<script>'+scripts+'</script></body>')
def boot(browser,w=1440,h=900,touch=False,reduced=False):
    page=browser.new_page(viewport={'width':w,'height':h},locale='zh-TW',has_touch=touch,is_mobile=touch,reduced_motion='reduce' if reduced else 'no-preference')
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.clock.install();page.set_content(source(),wait_until='load');page.clock.run_for(100)
    return page
def snap(p):return p.evaluate('crystalSnapshot()')
def click(p,selector):p.locator(selector).click(force=True);p.clock.run_for(35)
def control(p,selector):p.locator(selector).evaluate('(el)=>el.click()');p.clock.run_for(20)
def tile(p,x,y,touch=False):
    v=p.evaluate('([x,y])=>crystalProject(x,y)',[x,y]);b=p.locator('#battlefield').bounding_box()
    if touch:p.touchscreen.tap(b['x']+v['x'],b['y']+v['y'])
    else:p.mouse.click(b['x']+v['x'],b['y']+v['y'])
    p.clock.run_for(35)
def plan(p):
    i=snap(p)['wave']*7;pads=[(0,-2),(2,0),(0,2),(-2,0),(-2,-2),(2,2),(-2,2),(2,-2)]
    for _ in range(50):
        s=snap(p)
        if s['gold']<6:break
        kind=['ranger','mage','blade','guard'][i%4];i+=1
        control(p,f'[data-recruit="{kind}"]')
        while True:
            groups={}
            for u in snap(p)['units']:groups.setdefault((u['kind'],u['rank']),[]).append(u)
            group=next((v for (k,r),v in groups.items() if r<3 and len(v)>=3),None)
            if not group:break
            control(p,f'[data-unit="{group[0]["id"]}"]');control(p,'#merge')
        for u in [u for u in snap(p)['units'] if not u['tile']]:
            occupied={(v['tile']['x'],v['tile']['y']) for v in snap(p)['units'] if v['tile']}
            free=next((t for t in pads if t not in occupied),None)
            if free is None:break
            control(p,f'[data-unit="{u["id"]}"]');tile(p,*free)
        if sum(not u['tile'] for u in snap(p)['units'])>=8:break
with sync_playwright() as pw:
    browser=pw.chromium.launch(headless=True,executable_path=os.environ.get('CHROME_BIN') or shutil.which('chromium'),args=['--no-sandbox'])
    p=boot(browser)
    check('Boots with four deployed heroes and Chinese UI',len(snap(p)['units'])==4 and p.locator('#action-label').inner_text()=='迎戰第 1 波' and not errors)
    p.screenshot(path=str(OUT/'desktop-prep.png'))
    click(p,'[data-recruit="ranger"]')
    check('Mouse recruitment pays once and selects reserve hero',snap(p)['gold']==12 and snap(p)['units'][-1]['tile'] is None and snap(p)['selected']==5)
    tile(p,2,-2);check('Pointer deployment uses isometric coordinates',snap(p)['units'][-1]['tile']=={'x':2,'y':-2})
    click(p,'#bench');check('Bench frees the deployed position',snap(p)['units'][-1]['tile'] is None)
    tile(p,0,0);check('Altar rejects deployment',snap(p)['units'][-1]['tile'] is None)
    click(p,'[data-recruit="blade"]');click(p,'[data-recruit="blade"]');click(p,'[data-unit="1"]');click(p,'#merge')
    check('UI merge produces a two-star hero',snap(p)['units'][0]['rank']==2 and len(snap(p)['units'])==5)
    click(p,'#language');check('Language toggle translates shop and action',p.locator('#action-label').inner_text()=='BEGIN WAVE 1' and p.locator('[data-recruit="mage"] strong').inner_text()=='Mage')
    click(p,'#language');click(p,'#codex');check('Codex pauses and renders all four character portraits',snap(p)['phase']=='paused' and p.locator('.codex-entry').count()==4)
    p.screenshot(path=str(OUT/'codex.png'));p.keyboard.press('Escape');p.clock.run_for(60)
    check('Escape closes codex and restores planning',not snap(p)['modal'] and snap(p)['phase']=='prep')
    p.keyboard.press('m');p.clock.run_for(40);check('Keyboard mute toggles sound',snap(p)['muted'])
    p.keyboard.press('m');click(p,'#speed');check('2x speed toggles',snap(p)['speed']==2)
    click(p,'#action');p.clock.run_for(1000);check('Battle starts and shop is locked',snap(p)['phase']=='battle' and p.locator('[data-recruit]:disabled').count()==4)
    p.keyboard.press('p');p.clock.run_for(100);before=snap(p)['time'];p.clock.run_for(2000)
    check('Pause freezes simulation during clock advance',snap(p)['phase']=='paused' and snap(p)['time']==before)
    p.keyboard.press('Space');p.clock.run_for(300);check('Resume does not catch up hidden time',snap(p)['phase']=='battle' and 0<snap(p)['time']-before<1.5)
    p.keyboard.press('f');p.clock.run_for(50);check('Nova locks after one use',not snap(p)['pulseReady'] and p.locator('#action').is_disabled())
    p.evaluate("window.dispatchEvent(new Event('blur'))");p.clock.run_for(50);check('Blur handler pauses battle',snap(p)['phase']=='paused' and snap(p)['modal'])
    click(p,'#modal-actions .secondary');click(p,'#modal-actions .primary');check('Confirmed reset restores initial party',snap(p)['phase']=='prep' and snap(p)['wave']==0 and snap(p)['gold']==18)
    for w,h in [(1440,900),(1280,720),(390,844),(360,640),(320,568),(844,390)]:
        p.set_viewport_size({'width':w,'height':h});p.clock.run_for(150)
        m=p.evaluate('''()=>{const r=document.querySelector('#action').getBoundingClientRect(),a=document.querySelector('#battlefield').getBoundingClientRect();return {fit:document.documentElement.scrollWidth<=innerWidth&&document.documentElement.scrollHeight<=innerHeight,action:r.bottom<=innerHeight&&r.top>=0,arena:a.height>=180}}''')
        check(f'{w}x{h}: no page overflow, primary action visible',m['fit'] and m['action'] and m['arena'])
        p.screenshot(path=str(OUT/f'layout-{w}x{h}.png'))
    p.close();p=boot(browser,390,844,True,True)
    p.locator('[data-recruit="mage"]').tap(force=True);p.clock.run_for(40);tile(p,-2,2,True)
    check('Touch-only recruit/deploy with reduced motion',snap(p)['units'][-1]['tile']=={'x':-2,'y':2} and p.evaluate("matchMedia('(prefers-reduced-motion: reduce)').matches"))
    p.locator('#zoom').tap(force=True);p.clock.run_for(40);check('Mobile zoom preserves gameplay state',snap(p)['zoom']>1 and snap(p)['wave']==0)
    p.screenshot(path=str(OUT/'touch-zoom.png'));p.close()
    p=boot(browser,1280,800);click(p,'#speed');boss_seen=False;waves=0
    while snap(p)['phase'] not in ['won','lost']:
        if snap(p)['phase']=='prep':
            waves+=1
            assert waves<=8,'Unexpected ninth wave'
            plan(p);control(p,'#action');print(f'  Browser campaign: wave {waves}',flush=True)
        for _ in range(300):
            s=snap(p)
            if s['phase']!='battle':break
            near=[e for e in s['enemies'] if (e['x']**2+e['y']**2)**.5<3]
            if s['pulseReady'] and len(near)>=4:control(p,'#action')
            if waves==4 and 8<s['battleTime']<10:p.screenshot(path=str(OUT/'battle-wave4.png'))
            if any(e['kind']=='boss' for e in s['enemies']) and s['battleTime']>17 and not boss_seen:
                boss_seen=True;p.screenshot(path=str(OUT/'boss-wave8.png'))
            p.clock.run_for(700)
        else:raise AssertionError('Wave did not terminate')
    s=snap(p);check('Input-only browser pilot wins all eight waves',s['phase']=='won' and s['cleared']==8 and s['merges']>0)
    check('Final boss is rendered during the campaign',boss_seen)
    check('Victory summary contains score and four portraits',s['score']>0 and p.locator('.result-art canvas').count()==4 and snap(p)['modal'])
    p.screenshot(path=str(OUT/'victory.png'));(OUT/'victory-state.json').write_text(json.dumps(s,ensure_ascii=False,indent=2))
    click(p,'#modal-actions .primary');check('Victory replay resets run and retains in-memory best',snap(p)['wave']==0 and snap(p)['best']>=s['score'])
    for i in [1,2,3]:control(p,f'[data-unit="{i}"]');control(p,'#bench')
    control(p,'[data-unit="4"]');tile(p,4,4)
    for _ in range(4):
        if snap(p)['phase']!='prep':break
        control(p,'#action')
        for _ in range(150):
            if snap(p)['phase']!='battle':break
            p.clock.run_for(800)
    check('Poor positioning reaches real defeat at zero health',snap(p)['phase']=='lost' and snap(p)['crystal']==0)
    p.screenshot(path=str(OUT/'defeat.png'));click(p,'#modal-actions .primary')
    check('Defeat retry restores healthy initial heroes',snap(p)['phase']=='prep' and snap(p)['crystal']==100 and len(snap(p)['units'])==4)
    check('No uncaught JavaScript errors in browser tests',not errors)
    browser.close()
(OUT/'browser-results.json').write_text(json.dumps({'checks':checks,'count':len(checks),'errors':errors,'limitation':'Exact source injected in Chromium; not live navigation or physical Safari.'},ensure_ascii=False,indent=2))
print(f'\n{len(checks)} browser checks passed. Evidence: {OUT}',flush=True)
