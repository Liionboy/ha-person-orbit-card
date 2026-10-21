/* Person Orbit Card v1.1.0 — MIT */
const TYPE = 'ha-person-orbit-card';
const PALETTES = ['aurora', 'ocean', 'sunset', 'lavender'];
const EXTRA_SLOTS = [1, 2, 3, 4];
const EXTRA_DEFAULTS = Object.fromEntries(EXTRA_SLOTS.flatMap((n) => ['entity', 'name', 'icon'].map((field) => ['sensor_' + n + '_' + field, ''])));
const DEFAULTS = { entity: '', name: '', icon: '', show_avatar: true, battery_entity: '', eta_entity: '', battery_charging_entity: '', metrics_layout: 'tiles', low_battery_threshold: 20, palette: 'aurora', ...EXTRA_DEFAULTS };
const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const icon = (value) => '<ha-icon icon="' + esc(value) + '"></ha-icon>';
// Restrict pictures to HA's local image endpoints; no remote or arbitrary URL loads.
const picturePath = (value) => typeof value === 'string' && /^\/api\/image\/(?:serve|image_proxy)\/[a-zA-Z0-9_-]+(?:\/[a-zA-Z0-9_.-]+)?(?:\?[a-zA-Z0-9_=&.%-]*)?$/.test(value) && !value.includes('..') ? value : '';
const numeric = (value) => (typeof value === 'number' || typeof value === 'string' && /^[-+]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(value.trim())) && Number.isFinite(Number(value));
const STYLE = `
:host{display:block;min-width:0;max-width:100%;color:var(--primary-text-color,#202b3c)}*{box-sizing:border-box}
ha-card{display:block;container:person/inline-size;min-width:0;max-width:100%;overflow:hidden;border:1px solid var(--divider-color,#dfe5eb);border-radius:20px;background:var(--ha-card-background,var(--card-background-color,#fff));box-shadow:var(--ha-card-box-shadow,0 2px 5px #14233712);--accent:#078f72;--accent2:#27b7b0}
ha-card[data-palette=ocean]{--accent:#1477c9;--accent2:#22a7c7}ha-card[data-palette=sunset]{--accent:#d65c42;--accent2:#ee973f}ha-card[data-palette=lavender]{--accent:#8059c7;--accent2:#b56cc8}
.shell{padding:14px;background:radial-gradient(ellipse at 100% 0,color-mix(in srgb,var(--accent2) 10%,transparent),transparent 70%)}button{font:inherit;color:inherit;cursor:pointer;-webkit-tap-highlight-color:transparent}button:disabled{cursor:default}button:focus-visible{outline:2px solid var(--accent);outline-offset:-2px}button:hover:not(:disabled){background:color-mix(in srgb,var(--accent) 8%,transparent)}
.person{display:flex;align-items:center;gap:12px;width:100%;min-width:0;padding:0;border:0;border-radius:12px;background:transparent;text-align:left}.avatar{position:relative;display:grid;place-items:center;flex:none;width:48px;height:48px;border-radius:50%;color:var(--accent);background:color-mix(in srgb,var(--accent) 12%,transparent);border:1px solid color-mix(in srgb,var(--accent) 25%,transparent)}.avatar ha-icon{--mdc-icon-size:26px}.avatar img{position:absolute;inset:0;width:100%;height:100%;border-radius:50%;object-fit:cover}.dot{position:absolute;right:-1px;bottom:1px;width:11px;height:11px;border:2px solid var(--ha-card-background,var(--card-background-color,#fff));border-radius:50%;background:var(--secondary-text-color,#778494)}[data-presence=home] .dot{background:var(--success-color,#29956f)}[data-presence=unknown] .dot,[data-presence=unavailable] .dot,[data-presence=missing] .dot{background:var(--warning-color,#d59a38)}
.copy{min-width:0;flex:1}.name{display:block;font-size:15px;font-weight:700;line-height:21px;overflow-wrap:anywhere}.status{display:block;font-size:12px;line-height:18px;color:var(--secondary-text-color,#637080);overflow-wrap:anywhere}.metrics{display:flex;flex-wrap:wrap;gap:6px;margin-top:10px}.metric{display:flex;align-items:center;gap:6px;min-width:0;max-width:100%;flex:1 1 95px;border:0;border-radius:10px;padding:7px 9px;text-align:left;background:color-mix(in srgb,var(--accent) 6%,transparent)}.metric ha-icon{flex:none;--mdc-icon-size:17px;color:var(--accent)}.metric.low ha-icon{color:var(--error-color,#c74343)}.metric-copy{min-width:0}.label{display:block;font-size:10px;line-height:14px;color:var(--secondary-text-color,#637080)}.value{display:block;font-size:12px;line-height:18px;font-weight:650;overflow-wrap:anywhere;font-variant-numeric:tabular-nums}.hint{font-size:12px;line-height:18px;color:var(--secondary-text-color,#637080);overflow-wrap:anywhere}.hint strong{display:block;color:var(--primary-text-color,#202b3c);margin-bottom:4px}
@container person (max-width:240px){.shell{padding:12px}.person{gap:9px}.avatar{width:40px;height:40px}.avatar ha-icon{--mdc-icon-size:23px}.name{font-size:14px}.metric{flex-basis:100%;padding:6px 8px}.metric-copy{display:flex;align-items:center;justify-content:space-between;gap:8px;flex:1}.value{font-size:12px}}
@container person (max-width:180px){.person{gap:8px}.avatar{width:36px;height:36px}.name{font-size:13px}.metric{gap:4px}.metric ha-icon{--mdc-icon-size:15px}.metric-copy{gap:4px}.label{font-size:9px}.value{font-size:11px}}
/* Compact readings match small person tiles: battery/travel first, extra sensors below. */
.metrics.compact{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:2px 8px;margin-top:6px}.compact .metric{padding:1px 0;gap:4px;background:transparent;border-radius:5px}.compact .metric-copy{display:block;min-width:0;flex:1}.compact .label{display:none}.compact .value{font-size:12px;line-height:18px;font-weight:400;overflow-wrap:anywhere}.compact .extra{grid-column:1/-1}.compact .metric ha-icon{--mdc-icon-size:15px}.metric.charging:not(.low) ha-icon{color:var(--warning-color,#d59a38)}
@container person (max-width:200px){.metrics.compact{grid-template-columns:minmax(0,1fr)}.compact .metric{grid-column:1/-1}}
`;
class PersonOrbitCard extends HTMLElement {
 static getStubConfig() { return { ...DEFAULTS }; }
 static getConfigForm() {
  const labels = { entity: 'Person (optional)', name: 'Name override (optional)', icon: 'Fallback icon override (optional)', show_avatar: 'Show local person picture', battery_entity: 'Phone battery sensor (optional)', eta_entity: 'Travel time home sensor (optional)', low_battery_threshold: 'Low battery at or below (%)', palette: 'Orbit palette', battery_charging_entity: 'Charging status sensor (optional)', metrics_layout: 'Readings layout' };
  for (const n of EXTRA_SLOTS) for (const [field, label] of [['entity', 'sensor (optional)'], ['name', 'label override (optional)'], ['icon', 'icon override (optional)']]) labels['sensor_' + n + '_' + field] = 'Extra ' + n + ' ' + label;
  return { schema: [
   { name: 'entity', selector: { entity: { domain: 'person' } } },
   { name: 'name', selector: { text: {} } }, { name: 'icon', selector: { icon: {} } },
   { name: 'show_avatar', default: true, selector: { boolean: {} } },
   { name: 'battery_entity', selector: { entity: { domain: 'sensor' } } },
   { name: 'eta_entity', selector: { entity: { domain: 'sensor' } } },
   { name: 'battery_charging_entity', selector: { entity: { filter: { domain: ['binary_sensor', 'sensor'] } } } },
   { name: 'metrics_layout', default: 'tiles', selector: { select: { options: ['tiles', 'compact'], mode: 'dropdown' } } },
   ...EXTRA_SLOTS.flatMap((n) => [
    { name: 'sensor_' + n + '_entity', selector: { entity: { filter: { domain: 'sensor' } } } },
    { name: 'sensor_' + n + '_name', selector: { text: {} } },
    { name: 'sensor_' + n + '_icon', selector: { icon: {} } },
   ]),
   { name: 'low_battery_threshold', default: 20, selector: { number: { min: 0, max: 100, mode: 'box', step: 1 } } },
   { name: 'palette', default: 'aurora', selector: { select: { options: PALETTES, mode: 'dropdown' } } },
  ], computeLabel: ({ name }) => labels[name], computeHelper: ({ name }) => ({ battery_entity: 'Requires a numeric 0–100 percentage with unit %. Battery device class alone does not imply percent.', eta_entity: 'Choose an existing nonnegative numeric travel-time sensor; its unit is preserved. No route or arrival is calculated.', metrics_layout: 'Compact shows icon/value readings like a small person tile. Tiles keeps the original labeled panels.', battery_charging_entity: 'Optional binary sensor (on = charging), or sensor whose state is charging. Unknown states do not imply charging.', show_avatar: 'Only same-origin /api/image/serve/ or /api/image/image_proxy/ pictures are loaded. Other pictures use the fallback icon.' })[name] };
 }
 constructor() {
  super(); this.attachShadow({ mode: 'open' }); this._config = { ...DEFAULTS };
  this.shadowRoot.addEventListener('click', (event) => {
   const target = event.composedPath().find((el) => el?.dataset?.action);
   if (target && !target.disabled) this._moreInfo(target.dataset.action);
  });
  this.shadowRoot.addEventListener('error', (event) => { if (event.target?.tagName === 'IMG') event.target.hidden = true; }, true);
 }
 setConfig(config) {
  if (!config || typeof config !== 'object' || Array.isArray(config)) throw new Error('Person Orbit requires an object configuration.');
  for (const key of Object.keys(DEFAULTS).filter((key) => typeof DEFAULTS[key] === 'string')) if (config[key] != null && typeof config[key] !== 'string') throw new Error(key + ' must be text.');
  for (const [key, domain] of [['entity', 'person'], ['battery_entity', 'sensor'], ['eta_entity', 'sensor']]) if (config[key] && !new RegExp('^' + domain + '[.][a-z0-9_]+$').test(config[key])) throw new Error(key + ' must be a ' + domain + ' entity ID.');
  for (const n of EXTRA_SLOTS) { const id = config['sensor_' + n + '_entity']; if (id && !/^sensor[.][a-z0-9_]+$/.test(id)) throw new Error('Extra readings require sensor entity IDs.'); }
  if (config.battery_charging_entity && !/^(?:sensor|binary_sensor)[.][a-z0-9_]+$/.test(config.battery_charging_entity)) throw new Error('Charging status requires a sensor or binary_sensor entity ID.');
  if (config.metrics_layout != null && !['tiles', 'compact'].includes(config.metrics_layout)) throw new Error('metrics_layout must be tiles or compact.');
  if (config.show_avatar != null && typeof config.show_avatar !== 'boolean') throw new Error('show_avatar must be true or false.');
  if (config.low_battery_threshold != null && (typeof config.low_battery_threshold !== 'number' || !Number.isFinite(config.low_battery_threshold) || config.low_battery_threshold < 0 || config.low_battery_threshold > 100)) throw new Error('low_battery_threshold must be a number from 0 to 100.');
  this._config = Object.fromEntries(Object.entries(DEFAULTS).map(([key, value]) => [key, config[key] ?? value]));
  if (!PALETTES.includes(this._config.palette)) this._config.palette = 'aurora';
  this._signature = ''; this._update();
 }
 set hass(value) { this._hass = value; this._update(); }
 get hass() { return this._hass; }
 getCardSize() { return 3; }
 getGridOptions() { return { columns: 6, min_columns: 3 }; }
 _state(id) { return id ? this._hass?.states?.[id] : undefined; }
 _availability(state) { return !state ? 'missing' : state.state === 'unavailable' ? 'unavailable' : state.state === 'unknown' || state.state === '' || state.state == null ? 'unknown' : 'known'; }
 _status(state) {
  const availability = this._availability(state);
  let fallback = availability === 'missing' ? 'Entity not found' : availability === 'unavailable' ? 'Unavailable' : availability === 'unknown' ? 'Unknown' : state.state === 'home' ? 'Home' : state.state === 'not_home' ? 'Away' : String(state.state);
  if (state) { try { const formatted = this._hass.formatEntityState?.(state); if (typeof formatted === 'string' && formatted) fallback = formatted; } catch { /* Safe state fallback. */ } }
  return fallback;
 }
 _metric(key) {
  const id = this._config[key], state = this._state(id), availability = this._availability(state);
  if (availability !== 'known') return { id, text: this._status(state), low: false };
  const unit = state.attributes?.unit_of_measurement;
  const valid = numeric(state.state) && Number(state.state) >= 0 && (key !== 'battery_entity' || unit === '%' && Number(state.state) <= 100);
  return { id, text: valid ? String(state.state).trim() + (unit ? ' ' + unit : '') : 'Invalid reading', low: valid && key === 'battery_entity' && Number(state.state) <= this._config.low_battery_threshold };
 }
 _charging() {
  const state = this._state(this._config.battery_charging_entity);
  return this._availability(state) === 'known' && (this._config.battery_charging_entity.startsWith('binary_sensor.') ? state.state === 'on' : String(state.state).trim().toLowerCase() === 'charging');
 }
 _extraMetric(n) {
  const key = 'sensor_' + n + '_entity', id = this._config[key], state = this._state(id), a = state?.attributes || {};
  // Read only the selected sensor state and display metadata; never tracker/GPS attributes.
  const text = this._availability(state) !== 'known' ? this._status(state) : numeric(state.state) ? String(state.state).trim() + (a.unit_of_measurement ? ' ' + a.unit_of_measurement : '') : this._status(state);
  return { key, id, text, label: this._config['sensor_' + n + '_name'] || a.friendly_name || 'Sensor ' + n, icon: this._config['sensor_' + n + '_icon'] || a.icon || 'mdi:chart-line', extra: true, exists: !!state };
 }
 _primaryMetric(key) {
  const metric = this._metric(key), battery = key === 'battery_entity', charging = battery && this._charging();
  const label = !battery ? 'Travel home' : metric.low ? 'Low battery' + (charging ? ' · Charging' : '') : charging ? 'Charging' : 'Phone battery';
  const metricIcon = !battery ? 'mdi:car-clock' : charging ? 'mdi:battery-charging' : metric.low ? 'mdi:battery-alert-variant-outline' : 'mdi:battery';
  return { key, ...metric, exists: !!this._state(metric.id), charging, label, icon: metricIcon };
 }
 _model() {
  const c = this._config, state = this._state(c.entity), a = state?.attributes || {}, availability = this._availability(state);
  return { name: c.name || a.friendly_name || 'Person', status: this._status(state), presence: availability !== 'known' ? availability : state.state === 'home' ? 'home' : 'away', picture: c.show_avatar ? picturePath(a.entity_picture) : '', icon: c.icon || 'mdi:account', metrics: [ ...['battery_entity', 'eta_entity'].filter((key) => c[key]).map((key) => this._primaryMetric(key)), ...EXTRA_SLOTS.filter((n) => c['sensor_' + n + '_entity']).map((n) => this._extraMetric(n)) ] };
 }
 _update() {
  const model = this._model(), signature = JSON.stringify([this._config, model, ['entity', 'battery_entity', 'eta_entity'].map((key) => !!this._state(this._config[key]))]);
  if (signature === this._signature) return; this._signature = signature; this._render(model);
 }
 _render(model) {
  const c = this._config, active = this.shadowRoot.activeElement?.dataset?.action;
  const content = !c.entity ? '<div class="hint"><strong>Person Orbit</strong>Choose a person in the card editor. Optional battery, travel-time and additional sensors are never selected automatically.</div>' : '<button class="person" data-action="entity" aria-label="More information: ' + esc(model.name) + '"' + (!this._state(c.entity) ? ' disabled' : '') + '><span class="avatar" aria-hidden="true">' + icon(model.icon) + (model.picture ? '<img alt="" referrerpolicy="no-referrer" src="' + esc(model.picture) + '">' : '') + '<span class="dot"></span></span><span class="copy"><span class="name">' + esc(model.name) + '</span><span class="status">' + esc(model.status) + '</span></span></button>' + (model.metrics.length ? '<div class="metrics ' + c.metrics_layout + '">' + model.metrics.map((m) => '<button class="metric' + (m.low ? ' low' : '') + (m.charging ? ' charging' : '') + (m.extra ? ' extra' : '') + '" data-action="' + m.key + '" aria-label="More information: ' + esc(m.label + ': ' + m.text) + '" title="' + esc(m.label + ': ' + m.text) + '"' + (!this._state(m.id) ? ' disabled' : '') + '>' + icon(m.icon) + '<span class="metric-copy"><span class="label">' + esc(m.label) + '</span><span class="value">' + esc(m.text) + '</span></span></button>').join('') + '</div>' : '');
  this.shadowRoot.innerHTML = '<style>' + STYLE + '</style><ha-card data-palette="' + c.palette + '" data-presence="' + model.presence + '"><div class="shell">' + content + '</div></ha-card>';
  if (active) this.shadowRoot.querySelector('[data-action="' + active + '"]')?.focus();
 }
 _moreInfo(action) {
  if (!this._config.entity || !['entity', 'battery_entity', 'eta_entity', ...EXTRA_SLOTS.map((n) => 'sensor_' + n + '_entity')].includes(action)) return;
  const id = this._config[action]; if (!this._state(id)) return;
  this.dispatchEvent(new CustomEvent('hass-more-info', { detail: { entityId: id }, bubbles: true, composed: true }));
 }
}
if (!customElements.get(TYPE)) customElements.define(TYPE, PersonOrbitCard);
window.customCards = window.customCards || [];
if (!window.customCards.some((card) => card.type === TYPE)) window.customCards.push({ type: TYPE, name: 'Person Orbit Card', description: 'Private person status with battery, travel time and optional extra sensor readings.', preview: true });
