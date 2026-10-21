# Person Orbit Card

A compact, read-only Home Assistant Dashboard card for a chosen person. Four Orbit palettes, theme-aware colors, a local avatar, optional phone battery and existing travel-time-home sensor. No framework, build step or runtime dependencies. Requires Home Assistant **2026.6+** for the native visual configuration form.

## Install

After this repository is published, add its GitHub URL as a HACS custom repository, category **Dashboard**, and download Person Orbit Card. The resource is `/hacsfiles/ha-person-orbit-card/ha-person-orbit-card.js`, type **JavaScript module**. For manual installation copy the root JavaScript file to `config/www/ha-person-orbit-card.js` and register `/local/ha-person-orbit-card.js` as a JavaScript module. Add **Person Orbit Card** in the card picker.

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
| `low_battery_threshold` | 20 | Number 0–100 inclusive; low at or below threshold |
| `palette` | aurora | aurora, ocean, sunset, lavender; unknown values fall back to aurora |

The person state uses `hass.formatEntityState` when available, with Home/Away/Unknown/Unavailable and escaped raw-zone fallbacks. Missing entities say Entity not found and have disabled taps. Unknown and unavailable entities remain tappable for diagnosis. Phone battery requires explicit `%`; battery device class alone never implies percentage. Invalid percentages or negative/nonnumeric travel time show Invalid reading, not stale values. Travel time uses the sensor's reported unit (or no unit when absent), never converts or guesses minutes, and does not predict arrival.

Tap the person, battery or travel time to open that exact entity's More Info. Native buttons support Enter/Space. The card is always read-only, so no read-only toggle is needed. There are no service calls, route/tracking queries, automatic entity selection, GPS coordinates, tracker sources, history, or arbitrary HTML/services. It only consumes selected states supplied by HA.

Pictures are limited to root-relative `/api/image/serve/<id>/<file>` and `/api/image/image_proxy/<id>` paths; absolute URLs (including same-origin absolute URLs), external URLs, data/javascript URLs, dot paths and other local paths are rejected. A generic account icon is used otherwise or on image error. A local image request is the only network operation initiated by the card. External pictures are intentionally not supported to avoid tracking; local endpoints can still reflect server-side configuration, which remains under your HA administrator's control. More Info is HA's own dialog and may show additional attributes; this card itself does not print them.

## Development

```sh
npm run check
npm test
PLAYWRIGHT_MODULE=/path/to/playwright-core/index.mjs CHROMIUM_EXECUTABLE=/path/to/chromium SCREENSHOT_DIR=/path/to/screenshots npm run test:browser
```

Node tests use VM mocks. Browser tests use synthetic `hass`, a stub icon and a plain `ha-card` element—not actual HA components. They test 200/280/320/440/760px layouts, interactions after unrelated updates, keyboard, light/dark, reduced motion and privacy/security behavior. No live HA or native-editor validation is claimed. See [TODO.md](TODO.md) and [RESEARCH.md](RESEARCH.md).
