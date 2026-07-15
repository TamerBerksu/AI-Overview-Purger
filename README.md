# AI-Overview-Purger
Deletes  unwanted AI "features" of Google including AI mode tab, overview, people also ask, and things to know.

## Features

- Hides AI Overview
- Hides the AI Mode tab
- Hides "Things to know" panels
- Hides "People Also Ask AI" entries
- Toggle on/off with the extension popup
- Detections re-run without full page reload

## Installation
1. Clone or download this repository
2. Open the extension manager in your preferred browser
3. Click **Load unpacked** and select the project folder

## Usage

Click the extension icon in your toolbar to open the popup and flip the switch:

- **ON** : AI Overview and related elements are hidden immediately, no reload needed
- **OFF** : The current tab reloads to restore anything that was hidden

## Source Code File Structure

```  
├── blocker.js        
├── toggle.html         
└── toggle.css          
```

## How Detection Works

Detection runs in three tiers, stopping at the first match:

| Tier | Method | Confidence |
|------|--------|------------|
| 1 | Google's own `data-async-type` / `folsrch` markers | High |
| 2 | Structural `data-subtree` guess | Medium |
| 3 | Multi-language text pattern matching | Low |

## Configuration
Features can be turned on/off by editing `CONFIG` at the top of `content.js`:

```
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

Set `DEBUG_LOGGING: true` to see which detection tier fired in the console

## Usage
The icons folder contains 4 png images. These are the necessary images for the logo to be displayed. Their relative path is specified in manifest.json. More information regarding these icons and best practices can be found here: https://developer.chrome.com/docs/extensions/develop/ui/configure-icons
## Notes

- When Google changes its DOM structure, code will have to be updated
- Correction of searches (did you mean ...) gets deleted with AI Overview, will have to look into this in the future
- The majority of the code for the toggle (CSS and HTML) was taken from: https://uiverse.io/RaspberryBee/calm-deer-81*/
- Inspiration and certain parts of code (specified in `content.js`) were taken from: https://github.com/zbarnz/Google_AI_Overviews_Blocker.git

## License

MIT
