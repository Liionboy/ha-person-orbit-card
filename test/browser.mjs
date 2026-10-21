import assert from 'node:assert/strict';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const source = await readFile(new URL('../ha-person-orbit-card.js', import.meta.url), 'utf8');
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
 const measure = async (label, budget = 150) => {
  const result = await card.evaluate((el) => {
   const outer = el.getBoundingClientRect(), nodes = [...el.shadowRoot.querySelectorAll('button,.name,.status,.metric-copy,.label,.value,.hint')];
   return { width: outer.width, height: outer.height, overflow: nodes.filter((n) => { if (!n.getClientRects().length) return false; const r = n.getBoundingClientRect(); return r.right > outer.right + 1 || r.left < outer.left - 1 || n.scrollWidth > n.clientWidth + 1; }).map((n) => n.className), values: [...el.shadowRoot.querySelectorAll('.value')].map((n) => ({ text: n.textContent, height: n.getBoundingClientRect().height, scroll: n.scrollWidth, client: n.clientWidth })) };
  });
  assert.deepEqual(result.overflow, [], label); assert.ok(result.height <= budget, label + ': ' + result.height);
  for (const value of result.values) { assert.equal(value.height, 18, label); assert.ok(value.scroll <= value.client); }
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
 await measure('compact-six-167',225);
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
 await page.evaluate(() => window.card.setConfig({})); await measure('empty-320', 150); assert.equal(await card.locator('button').count(), 0);
 assert.deepEqual(await page.evaluate(() => [window.calls, window.queries]), [[], []]); assert.deepEqual(errors, []); assert.equal(requests.some((url) => !url.startsWith('http://person.test/')), false);
 console.log('Browser assertions passed; synthetic hass and HA icon/component stubs. Services=0; queries=0.');
 if (out) await writeFile(out + '/metrics.json', JSON.stringify({ metrics, paletteColors: colors, services: 0, queries: 0, errors, requests }, null, 2) + '\n');
} finally { await browser.close(); }
