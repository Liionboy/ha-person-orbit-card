# Person Orbit Card

A compact, read-only Home Assistant Dashboard card for a chosen person. Four Orbit palettes, theme-aware colors, a local avatar, optional phone battery/charging, existing travel-time-home sensor and up to four additional sensor readings. No framework, build step or runtime dependencies. Requires Home Assistant **2026.6+** for the native visual configuration form.

## Install

Add [this GitHub repository](https://github.com/Liionboy/ha-person-orbit-card) as a HACS custom repository, category **Dashboard**, and download Person Orbit Card. The resource is `/hacsfiles/ha-person-orbit-card/ha-person-orbit-card.js`, type **JavaScript module**. For manual installation copy the root JavaScript file to `config/www/ha-person-orbit-card.js` and register `/local/ha-person-orbit-card.js` as a JavaScript module. Add **Person Orbit Card** in the card picker.

```yaml
type: custom:ha-person-orbit-card
entity: person.example
battery_entity: sensor.example_phone_battery
eta_entity: sensor.example_travel_home
palette: aurora
low_battery_threshold: 20
```

All fields are optional and exposed in the native visual editor. Empty configuration shows a setup hint and selects no entities.

| Option | Default | Meaning |
| --- | --- | --- |
| `entity` | empty | Person entity; required only to display the person/metrics |
| `name` | empty | Display-name override; otherwise friendly name or Person |
| `icon` | empty | Fallback icon override; otherwise mdi:account |
| `show_avatar` | true | Load the selected person's approved local picture |
| `battery_entity` | empty | Explicit sensor: numeric 0–100 and unit `%` required |
| `eta_entity` | empty | Explicit nonnegative numeric travel-time sensor, unit preserved |
| `battery_charging_entity` | empty | Optional charging status: binary sensor `on`, or sensor state `charging` (case-insensitive) |
| `metrics_layout` | tiles | `tiles` for original labeled panels; `compact` for small icon/value rows |
| `sensor_1_entity` … `sensor_4_entity` | empty | Up to four explicitly chosen sensor readings, in slot order |
| `sensor_1_name` … `sensor_4_name` | empty | Optional label overrides; otherwise entity friendly name |
| `sensor_1_icon` … `sensor_4_icon` | empty | Optional icon overrides; otherwise entity icon or `mdi:chart-line` |
| `low_battery_threshold` | 20 | Number 0–100 inclusive; low at or below threshold |
| `palette` | aurora | aurora, ocean, sunset, lavender; unknown values fall back to aurora |

The person state uses `hass.formatEntityState` when available, with Home/Away/Unknown/Unavailable and escaped raw-zone fallbacks. Missing entities say Entity not found and have disabled taps. Unknown and unavailable entities remain tappable for diagnosis. Phone battery requires explicit `%`; battery device class alone never implies percentage. Invalid percentages or negative/nonnumeric travel time show Invalid reading, not stale values. Travel time uses the sensor's reported unit (or no unit when absent), never converts or guesses minutes, and does not predict arrival.

Tap the person or any displayed reading to open that exact entity's More Info. Native buttons support Enter/Space. The card is always read-only, so no read-only toggle is needed. There are no service calls, route/tracking queries, automatic entity selection, tracker sources, history, or arbitrary HTML/services. The card does not read tracker coordinate attributes or compute distance/altitude; additional readings come only from the sensors you select. A deliberately chosen location-related sensor can display its own state. It only consumes selected states supplied by HA.

Pictures are limited to root-relative `/api/image/serve/<id>/<file>` and `/api/image/image_proxy/<id>` paths; absolute URLs (including same-origin absolute URLs), external URLs, data/javascript URLs, dot paths and other local paths are rejected. A generic account icon is used otherwise or on image error. A local image request is the only network operation initiated by the card. External pictures are intentionally not supported to avoid tracking; local endpoints can still reflect server-side configuration, which remains under your HA administrator's control. More Info is HA's own dialog and may show additional attributes; this card itself does not print them.

## Small person tile with additional readings

For a layout with battery/travel time on the first line and distance/altitude below, choose **Readings layout → compact** in the visual editor. Every entity is optional. Existing configurations keep their original `tiles` appearance.

```yaml
type: custom:ha-person-orbit-card
entity: person.example
metrics_layout: compact
battery_entity: sensor.example_phone_battery
battery_charging_entity: binary_sensor.example_phone_charging
eta_entity: sensor.example_travel_home
sensor_1_entity: sensor.example_distance_home
sensor_1_name: Distance
sensor_1_icon: mdi:map-marker-distance
sensor_2_entity: sensor.example_altitude
sensor_2_name: Altitude
sensor_2_icon: mdi:elevation-rise
```

Replace these examples with your own existing entities. Additional slots 3/4 can show steps, activity or other sensor states; names/icons without a selected entity do not create empty rows. Numeric readings preserve their reported sign, decimals and unit, including zero and below-sea-level altitude. Textual sensor states use HA formatting when available. Unknown, unavailable and missing readings are distinct; absent entities cannot open More Info. No distance, route or arrival is calculated by the card.

Compact mode hides the on-screen metric labels but keeps descriptive tooltips and accessible labels with the complete value. The charging icon is shown only from the explicitly selected charging sensor, not inferred from battery percentage. Only binary-sensor `on` or sensor `charging` (case-insensitive) means charging; other states do not imply it. A low battery stays red even while charging. The battery tap still opens the percentage sensor.

## Development

```sh
npm run check
npm test
PLAYWRIGHT_MODULE=/path/to/playwright-core/index.mjs CHROMIUM_EXECUTABLE=/path/to/chromium SCREENSHOT_DIR=/path/to/screenshots npm run test:browser
```

Node tests use VM mocks. Browser tests use synthetic `hass`, a stub icon and a plain `ha-card` element—not actual HA components. 73 Node regression tests and browser checks cover original and compact layouts, including screenshot-sized 243px and two-column-phone 167px tiles. Four readings measure 148px tall at 243px wide and 157px tall at 167px wide; six readings grow to 201px at 167px. Browser tests also check interactions after unrelated updates, keyboard, light/dark, reduced motion and privacy/security behavior. No live HA or native-editor validation is claimed. See [TODO.md](TODO.md) and [RESEARCH.md](RESEARCH.md).
