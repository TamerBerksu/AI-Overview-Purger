# AI-Overview-Purger
Deletes  unwanted AI "features" of Google including AI mode tab, overview, people also ask, and things to know.

# AI Overview Blocker

A lightweight Chrome extension that hides Google's AI Overview, AI Mode tab, and "Things to know" panel from search results — with a one-click toggle in your toolbar.

## Features

- **Hides AI Overview** using tiered detection (data attributes → structural heuristics → text pattern fallback) so it stays reliable even as Google tweaks its markup
- **Hides the AI Mode tab**
- **Hides "Things to know"** panels
- **One-click toggle** via the extension popup — closes automatically on outside click, positioned natively by Chrome
- **Debounced detection** using `requestAnimationFrame`, so it doesn't hammer the DOM on every mutation
- **Multi-language pattern matching** as a last-resort fallback (EN, DE, FR, ES, JA, RU, ZH, NL, DA, CZ, RO)
- Handles Google's SPA-style navigation (History API) so detection re-runs without a full page reload

## Installation

1. Clone or download this repository
2. Open `chrome://extensions` in Chrome
3. Enable **Developer mode** (top right toggle)
4. Click **Load unpacked** and select the project folder
5. Pin the extension to your toolbar for easy access

## Usage

Click the extension icon in your toolbar to open the popup and flip the switch:

- **ON** — AI Overview and related elements are hidden immediately, no reload needed
- **OFF** — the current tab reloads to restore anything that was hidden

## File Structure

```
├── manifest.json     # Extension config (Manifest V3)
├── blocker.js        # Single script — runs as either the popup controller or the content script
├── toggle.html        # Popup markup
└── toggle.css          # Popup styling
```

`blocker.js` detects its own context at runtime: if a toggle checkbox exists in the DOM, it runs as the popup; otherwise it runs as the content script on `google.com/search` pages. Both share state through `chrome.storage.local`, kept in sync via `chrome.storage.onChanged`.

## How Detection Works

Detection runs in three tiers, stopping at the first match:

| Tier | Method | Confidence |
|------|--------|------------|
| 1 | Google's own `data-async-type` / `folsrch` markers | High |
| 2 | Structural `data-subtree` heuristics | Medium |
| 3 | Multi-language text pattern matching (rate-limited) | Low |

## Configuration

Toggle individual features on/off by editing the `CONFIG` object at the top of `blocker.js`:

```js
const CONFIG = {
  HIDE_AI_OVERVIEW: true,
  HIDE_THINGS_TO_KNOW: true,
  HIDE_AI_MODE_TAB: true,
  HIDE_PEOPLE_ALSO_ASK_AI_ENTRIES: false,
  ENABLE_TEXT_PATTERN_FALLBACK: true,
  TEXT_FALLBACK_MIN_INTERVAL_MS: 1500,
  DEBUG_LOGGING: false,
};
```

Set `DEBUG_LOGGING: true` to see which detection tier fired in the console — useful for spotting when Google changes its markup and Tier 1 stops matching.

## Notes

- Google periodically changes its DOM structure, which may require selector updates over time
- This extension only affects your local browser view — it does not modify search results for anyone else or interact with Google's servers beyond a normal search request

## License

MIT
