import assert from 'node:assert/strict';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const source = await readFile(process.env.CARD_RESOURCE || new URL('../ha-person-orbit-card.js', import.meta.url), 'utf8');
const out = process.env.SCREENSHOT_DIR;
if (out) await mkdir(out, { recursive: true });
const browser = await chromium.launch({ headless: true, ...(process.env.CHROMIUM_EXECUTABLE ? { executablePath: process.env.CHROMIUM_EXECUTABLE } : {}) });
const metrics = [];
try {
 const page = await browser.newPage({ viewport: { width: 1000, height: 700 } });
 const errors = [], requests = [];
 page.on('pageerror', (e) => errors.push(e.message)); page.on('request', (r) => requests.push(r.url()));
 await page.route('**/*', async (route) => {
  const url = new URL(route.request().url());
  if (url.origin !== 'http://person.test') throw Error('Unexpected external request: ' + url.href);
  if (url.pathname === '/card.js') return route.fulfill({ contentType: 'application/javascript', body: source });
  if (url.pathname.startsWith('/api/image/')) return route.fulfill({ status: 404, body: '' });
  return route.fulfill({ contentType: 'text/html', body: '<!doctype html><meta charset="utf-8"><style>body{margin:0;padding:20px;background:#f4f6fa;font-family:Arial,sans-serif}body.dark{background:#10171e;--primary-text-color:#e7edf5;--secondary-text-color:#a5b2c4;--card-background-color:#1c2834;--divider-color:#344454}#host{width:440px;max-width:100%}</style><div id="host"><ha-person-orbit-card></ha-person-orbit-card></div><script>customElements.define("ha-icon",class extends HTMLElement{connectedCallback(){this.textContent="◇";this.style.cssText="display:inline-flex;align-items:center;justify-content:center;width:var(--mdc-icon-size,24px);height:var(--mdc-icon-size,24px);font-size:var(--mdc-icon-size,24px)";}});</script><script src="/card.js"></script>' });
 });
 await page.goto('http://person.test/');
 await page.evaluate(() => {
  window.calls = []; window.queries = []; window.infos = [];
  window.card = document.querySelector('ha-person-orbit-card'); window.card.addEventListener('hass-more-info', (e) => window.infos.push(e.detail));
  window.config = { entity: 'person.example', battery_entity: 'sensor.battery', eta_entity: 'sensor.travel', palette: 'aurora' }; window.card.setConfig(window.config);
  window.card.hass = { states: { 'person.example': { state: 'home', attributes: { friendly_name: 'Alex Morgan', entity_picture: 'https://tracker.invalid/avatar.png', latitude: 45.123, longitude: 25.321 } }, 'sensor.battery': { state: '52.5', attributes: { unit_of_measurement: '%' } }, 'sensor.travel': { state: '14.7', attributes: { unit_of_measurement: 'min' } } }, callService: (...args) => window.calls.push(args), callWS: (...args) => window.queries.push(args) };
 });
 const card = page.locator('ha-person-orbit-card');
 const measure = async (label, budget = 150, allowWrap = false) => {
  const result = await card.evaluate((el) => {
   const outer = el.getBoundingClientRect(), nodes = [...el.shadowRoot.querySelectorAll('button,.name,.status,.metric-copy,.label,.value,.hint')];
   return { width: outer.width, height: outer.height, overflow: nodes.filter((n) => { if (!n.getClientRects().length) return false; const r = n.getBoundingClientRect(); return r.right > outer.right + 1 || r.left < outer.left - 1 || n.scrollWidth > n.clientWidth + 1; }).map((n) => n.className), values: [...el.shadowRoot.querySelectorAll('.value')].map((n) => ({ text: n.textContent, height: n.getBoundingClientRect().height, scroll: n.scrollWidth, client: n.clientWidth })) };
  });
  assert.deepEqual(result.overflow, [], label); assert.ok(result.height <= budget, label + ': ' + result.height);
  for (const value of result.values) { if(allowWrap)assert.ok(value.height>=18&&value.height%18===0,label);else assert.equal(value.height,18,label);assert.ok(value.scroll<=value.client); }
  metrics.push({ label, ...result }); console.log(label, JSON.stringify(result));
  if (out) await card.screenshot({ path: out + '/' + label + '.png' });
 };
 for (const width of [760, 440, 320, 280, 200]) { await page.evaluate((w) => document.querySelector('#host').style.width = w + 'px', width); await measure('light-' + width); }
 await page.setViewportSize({ width: 390, height: 700 }); await page.evaluate(() => document.querySelector('#host').style.width = 'calc((100vw - 56px) / 2)'); await measure('phone-two-column-390', 170);
 await page.setViewportSize({ width: 1000, height: 700 }); await page.evaluate(() => { document.querySelector('#host').style.width = '320px'; document.body.classList.add('dark'); });
 await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' }); await measure('dark-reduced-320');
 assert.equal(await card.locator('img').count(), 0); assert.equal(await card.locator('ha-card').evaluate((el) => getComputedStyle(el).backgroundColor), 'rgb(28, 40, 52)');
 const colors = [];
 for (const palette of ['aurora', 'ocean', 'sunset', 'lavender']) { await page.evaluate((palette) => window.card.setConfig({ ...window.config, palette }), palette); colors.push(await card.locator('.avatar').evaluate((el) => getComputedStyle(el).color)); }
 assert.equal(new Set(colors).size, 4);
 await page.evaluate(() => { window.before = window.card.shadowRoot.querySelector('.person'); window.card.hass = { ...window.card.hass, states: { ...window.card.hass.states, 'sensor.unrelated': { state: '1', attributes: {} } } }; });
 assert.equal(await page.evaluate(() => window.before === window.card.shadowRoot.querySelector('.person')), true);
 await card.locator('.person').click(); await card.locator('[data-action="battery_entity"]').click(); await card.locator('[data-action="eta_entity"]').click();
 assert.deepEqual(await page.evaluate(() => window.infos), [{ entityId: 'person.example' }, { entityId: 'sensor.battery' }, { entityId: 'sensor.travel' }]);
 await card.locator('.person').focus(); await page.keyboard.press('Enter'); await card.locator('[data-action="battery_entity"]').focus(); await page.keyboard.press('Space');
 assert.deepEqual(await page.evaluate(() => window.infos.slice(-2)), [{ entityId: 'person.example' }, { entityId: 'sensor.battery' }]);
 await page.evaluate(() => { window.card.hass = { ...window.card.hass, states: { ...window.card.hass.states, 'sensor.battery': { state: '10', attributes: { unit_of_measurement: '%' } }, 'person.example': { state: 'unknown', attributes: { friendly_name: 'Alex Morgan' } } } }; });
 assert.equal(await card.locator('.status').textContent(), 'Unknown'); assert.equal(await card.locator('.low').count(), 1);
 await card.locator('[data-action="eta_entity"]').focus(); await page.evaluate(() => { window.card.hass = { ...window.card.hass, states: { ...window.card.hass.states, 'sensor.travel': { state: '1.25', attributes: { unit_of_measurement: 'h' } } } }; });
 assert.equal(await card.locator('[data-action="eta_entity"] .value').textContent(), '1.25 h'); assert.equal(await card.evaluate((el) => el.shadowRoot.activeElement?.dataset.action), 'eta_entity');
 await page.evaluate(() => { window.card.hass = { ...window.card.hass, states: { ...window.card.hass.states, 'person.example': { state: 'unavailable', attributes: { friendly_name: 'Alex Morgan' } }, 'sensor.battery': { state: 'unavailable', attributes: {} } } }; });
 assert.equal(await card.locator('.status').textContent(), 'Unavailable'); assert.equal(await card.locator('.low').count(), 0); await measure('unavailable-320');
 await page.evaluate(() => { window.card.hass = { ...window.card.hass, states: { ...window.card.hass.states, 'person.example': { state: 'home', attributes: { friendly_name: 'Alex Morgan', entity_picture: '/api/image/serve/demo/original' } } } }; });
 await card.locator('img').waitFor({ state: 'hidden' }); assert.ok(requests.some((url) => url.includes('/api/image/serve/demo/original')));
 await page.evaluate(() => { const hostile = '"><img src="https://tracker.invalid/x" onerror="window.pwned=true">'; window.card.setConfig({ ...window.config, name: hostile, icon: hostile }); window.card.hass = { ...window.card.hass, states: { ...window.card.hass.states, 'person.example': { state: hostile, attributes: { entity_picture: 'data:image/svg+xml,invalid' } }, 'sensor.travel': { state: '5', attributes: { unit_of_measurement: hostile } } } }; });
 assert.equal(await card.locator('img').count(), 0); assert.equal(await page.evaluate(() => window.pwned), undefined); assert.equal(await card.locator('[onerror],[onload]').count(), 0);
 // Screenshot-style compact card: only explicitly chosen readings, no physical operations.
 await page.setViewportSize({width:1000,height:800});
 await page.evaluate(() => {
  document.body.classList.remove('dark'); window.card.shadowRoot.activeElement?.blur();
  window.card.setConfig({...window.config,metrics_layout:'compact',sensor_1_entity:'sensor.distance',sensor_1_name:'Distance',sensor_1_icon:'mdi:map-marker-distance',sensor_2_entity:'sensor.altitude',sensor_2_name:'Altitude',sensor_2_icon:'mdi:elevation-rise',battery_charging_entity:'binary_sensor.charging'});
  window.card.hass={...window.card.hass,states:{'person.example':{state:'home',attributes:{friendly_name:'Alex'}},'sensor.battery':{state:'97',attributes:{unit_of_measurement:'%'}},'sensor.travel':{state:'0',attributes:{unit_of_measurement:'min'}},'sensor.distance':{state:'8',attributes:{unit_of_measurement:'m'}},'sensor.altitude':{state:'382',attributes:{unit_of_measurement:'m'}},'binary_sensor.charging':{state:'off',attributes:{}}}};
 });
 for(const width of [440,320,280,243,200,167]){
  await page.evaluate(w=>document.querySelector('#host').style.width=w+'px',width);
  await measure('compact-four-'+width,width>=243?150:175);
  assert.deepEqual(await card.locator('.value').allTextContents(),['97 %','0 min','8 m','382 m']);
 }
 await card.locator('[data-action="sensor_1_entity"]').click();
 await card.locator('[data-action="sensor_2_entity"]').focus();await page.keyboard.press('Enter');
 assert.deepEqual(await page.evaluate(()=>window.infos.slice(-2)),[{entityId:'sensor.distance'},{entityId:'sensor.altitude'}]);
 await page.evaluate(()=>{window.card.hass={...window.card.hass,states:{...window.card.hass.states,'binary_sensor.charging':{state:'on',attributes:{}}}};});
 assert.equal(await card.locator('.charging ha-icon').getAttribute('icon'),'mdi:battery-charging');
 await page.evaluate(()=>{window.card.setConfig({...window.card._config,sensor_3_entity:'sensor.steps',sensor_4_entity:'sensor.activity'});window.card.hass={...window.card.hass,states:{...window.card.hass.states,'sensor.steps':{state:'12345',attributes:{unit_of_measurement:'steps'}},'sensor.activity':{state:'Walking',attributes:{icon:'mdi:walk'}}}};});
 await measure('compact-six-167',150,true);
 await page.evaluate(()=>{document.querySelector('#host').style.width='243px';document.body.classList.add('dark');});
 await measure('compact-six-dark-243',200);
 await page.evaluate(()=>{window.card.hass={...window.card.hass,states:{...window.card.hass.states,'sensor.altitude':{state:'-382.5',attributes:{unit_of_measurement:'m'}}}};});
 assert.equal(await card.locator('[data-action="sensor_2_entity"] .value').textContent(),'-382.5 m');
 assert.equal(await card.evaluate(el=>el.shadowRoot.activeElement?.dataset.action),'sensor_2_entity');
 await page.evaluate(()=>{delete window.card.hass.states['sensor.distance'];window.card.hass={...window.card.hass};});
 assert.ok(await card.locator('[data-action="sensor_1_entity"]').isDisabled());
 await page.evaluate(()=>{const hostile='"><img src=https://tracker.invalid onerror="window.pwned=1">';window.card.setConfig({...window.card._config,sensor_3_name:hostile,sensor_3_icon:hostile});window.card.hass={...window.card.hass,states:{...window.card.hass.states,'sensor.steps':{state:hostile,attributes:{unit_of_measurement:hostile}}}};});
 assert.equal(await card.locator('img,[onerror]').count(),0);assert.equal(await page.evaluate(()=>window.pwned),undefined);
 await page.evaluate(()=>{document.querySelector('#host').style.width='320px';window.card.setConfig({...window.config,metrics_layout:'compact'});});
 assert.equal(await card.locator('.extra').count(),0);
 // All selected compact readings flow in pairs, including absent primary fields/odd counts.
 await page.evaluate(() => {
  window.pairedConfig={entity:'person.example',metrics_layout:'compact',battery_entity:'sensor.battery',eta_entity:'sensor.travel',sensor_1_entity:'sensor.distance',sensor_2_entity:'sensor.altitude',sensor_3_entity:'sensor.steps',sensor_4_entity:'sensor.activity'};
  window.pairedKeys=['battery_entity','eta_entity','sensor_1_entity','sensor_2_entity','sensor_3_entity','sensor_4_entity'];
  window.card.hass={...window.card.hass,states:{'person.example':{state:'home',attributes:{friendly_name:'Alex'}},'sensor.battery':{state:'70',attributes:{unit_of_measurement:'%'}},'sensor.travel':{state:'0',attributes:{unit_of_measurement:'min'}},'sensor.distance':{state:'0.0055',attributes:{unit_of_measurement:'km',icon:'mdi:map-marker-distance'}},'sensor.altitude':{state:'376.0',attributes:{unit_of_measurement:'m',icon:'mdi:elevation-rise'}},'sensor.steps':{state:'12345',attributes:{unit_of_measurement:'steps'}},'sensor.activity':{state:'Stopped',attributes:{icon:'mdi:car'}}}};
 });
 const assertGrid=async(columns,count)=>{
  const boxes=await card.locator('.metric').evaluateAll(nodes=>nodes.map(n=>{const r=n.getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height};}));
  assert.equal(boxes.length,count);
  for(let i=1;i<count;i++){
   assert.ok(Math.abs(boxes[i].width-boxes[0].width)<1,'equal column widths');
   if(i%columns){assert.equal(boxes[i].y,boxes[i-1].y,'paired readings must share a row');assert.ok(boxes[i].x>=boxes[i-1].x+boxes[i-1].width,'separate columns');}
   else{assert.equal(boxes[i].x,boxes[0].x);assert.ok(boxes[i].y>=boxes[i-1].y+boxes[i-1].height,'next reading row');}
  }
 };
 for(const count of [1,2,3,4,5,6]){
  await page.evaluate(count=>{window.card.setConfig(Object.fromEntries(Object.entries(window.pairedConfig).filter(([key])=>!window.pairedKeys.includes(key)||window.pairedKeys.indexOf(key)<count)));},count);
  for(const width of [440,280,243,220,200,180,167]){
   await page.evaluate(w=>document.querySelector('#host').style.width=w+'px',width);
   await assertGrid(2,count);
   await measure('paired-'+count+'-'+width,150,count>=5&&width<=180);
  }
 }
 await page.evaluate(()=>{const c={...window.pairedConfig};delete c.eta_entity;delete c.sensor_3_entity;window.card.setConfig(c);document.querySelector('#host').style.width='243px';});
 await assertGrid(2,4);await measure('screenshot-readings-dark-243',130);
 assert.deepEqual(await card.locator('.value').allTextContents(),['70 %','0.0055 km','376.0 m','Stopped']);
 for(const action of ['battery_entity','sensor_1_entity','sensor_2_entity','sensor_4_entity']){await card.locator('[data-action="'+action+'"]').click();}
 assert.deepEqual(await page.evaluate(()=>window.infos.slice(-4)),['battery','distance','altitude','activity'].map(x=>({entityId:'sensor.'+x})));
 await page.evaluate(()=>document.body.classList.remove('dark'));await measure('screenshot-readings-light-243',130);
 // Long values may wrap; never clip, ellipsize or hide them to force a compact row.
 await page.evaluate(()=>{window.card.hass={...window.card.hass,states:{...window.card.hass.states,'sensor.activity':{state:'A deliberately long activity state for visibility',attributes:{}}}};});
 assert.equal(await card.locator('[data-action="sensor_4_entity"] .value').textContent(),'A deliberately long activity state for visibility');
 assert.deepEqual(await card.locator('.value').evaluateAll(ns=>ns.filter(n=>n.scrollWidth>n.clientWidth+1||n.scrollHeight>n.clientHeight+1).map(n=>n.textContent)),[]);
 // Reproduce two people SIDE BY SIDE on a phone, not just a full-width phone card.
 await page.evaluate(()=>{
  document.body.style.padding='12px';document.body.style.fontFamily='system-ui,sans-serif';
  document.querySelector('#host').style.cssText='display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;width:100%;align-items:start';
  const c={...window.pairedConfig};delete c.eta_entity;delete c.sensor_3_entity;window.card.setConfig(c);
  window.card.hass={...window.card.hass,states:{...window.card.hass.states,'sensor.battery':{state:'100',attributes:{unit_of_measurement:'%'}},'sensor.distance':{state:'0.0052',attributes:{unit_of_measurement:'km'}},'sensor.altitude':{state:'378.0',attributes:{unit_of_measurement:'m'}},'sensor.activity':{state:'Stopped',attributes:{}}}};
  window.other=document.createElement('ha-person-orbit-card');const c2={...c,name:'Sam',sensor_4_entity:'',palette:'sunset'};other.setConfig(c2);other.hass={...card.hass,states:{...card.hass.states,'sensor.battery':{state:'70',attributes:{unit_of_measurement:'%'}},'sensor.distance':{state:'0.0068',attributes:{unit_of_measurement:'km'}},'sensor.altitude':{state:'372.0',attributes:{unit_of_measurement:'m'}}}};document.querySelector('#host').append(other);
 });
 const two=page.locator('ha-person-orbit-card');
 for(const dark of [false,true])for(const width of [360,390,430]){
  await page.setViewportSize({width,height:844});await page.evaluate(dark=>document.body.classList.toggle('dark',dark),dark);
  for(const person of await two.all()){
   const r=await person.evaluate(el=>{const outer=el.getBoundingClientRect(),ns=[...el.shadowRoot.querySelectorAll('.metric')];return{width:outer.width,height:outer.height,boxes:ns.map(n=>{const r=n.getBoundingClientRect(),v=n.querySelector('.value');return{x:r.x,y:r.y,w:r.width,text:v.textContent,h:v.getBoundingClientRect().height,overflow:v.scrollWidth>v.clientWidth||v.scrollHeight>v.clientHeight};})};});
   assert.ok(r.width<210&&r.width>150);assert.ok(r.height<=130);
   for(let i=0;i<r.boxes.length;i++){assert.equal(r.boxes[i].h,18);assert.equal(r.boxes[i].overflow,false);if(i%2)assert.equal(r.boxes[i].y,r.boxes[i-1].y);else if(i)assert.ok(r.boxes[i].y>r.boxes[i-1].y);}
  }
  assert.deepEqual(await two.nth(0).locator('.value').allTextContents(),['100 %','0.0052 km','378.0 m','Stopped']);
  assert.deepEqual(await two.nth(1).locator('.value').allTextContents(),['70 %','0.0068 km','372.0 m']);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  if(out)await page.locator('#host').screenshot({path:out+'/two-people-'+(dark?'dark':'light')+'-'+width+'.png'});
 }
 await two.nth(0).locator('[data-action="sensor_4_entity"]').focus();await page.keyboard.press('Enter');assert.equal(await page.evaluate(()=>infos.at(-1).entityId),'sensor.activity');
 await page.evaluate(()=>{other.remove();document.querySelector('#host').style.cssText='width:140px';});await assertGrid(1,4);
 await page.setViewportSize({width:1000,height:800});await page.evaluate(() => {document.querySelector('#host').style.width='320px';window.card.setConfig({});}); await measure('empty-320', 150); assert.equal(await card.locator('button').count(), 0);
 assert.deepEqual(await page.evaluate(() => [window.calls, window.queries]), [[], []]); assert.deepEqual(errors, []); assert.equal(requests.some((url) => !url.startsWith('http://person.test/')), false);
 console.log('Browser assertions passed; synthetic hass and HA icon/component stubs. Services=0; queries=0.');
 if (out) await writeFile(out + '/metrics.json', JSON.stringify({ metrics, paletteColors: colors, services: 0, queries: 0, errors, requests }, null, 2) + '\n');
} finally { await browser.close(); }
