const STORAGE_KEY = "OverviewBlockerEnabled";
const popupCheckbox = document.getElementById("enabledToggle");

if (popupCheckbox) {
  runPopup();
} else {
  runContentScript();
}

//Extension logic
//All js code is in this file including js code for toggling
function runPopup() {
  chrome.storage.local.get([STORAGE_KEY], (result) => {
    popupCheckbox.checked = result[STORAGE_KEY] !== false; // default ON
  });
  popupCheckbox.addEventListener("change", () => {
    chrome.storage.local.set({ [STORAGE_KEY]: popupCheckbox.checked });
  });
}

//Configuration can be changed depending on personal preference
//Did not add UI for this except HIDE_AI_OVERVIEW
function runContentScript() {
  const CONFIG = {
    HIDE_AI_OVERVIEW: true,
    HIDE_THINGS_TO_KNOW: true,
    HIDE_AI_MODE_TAB: true,
    HIDE_PEOPLE_ALSO_ASK_AI_ENTRIES: true,
    ENABLE_TEXT_PATTERN_FALLBACK: true,
    TEXT_FALLBACK_MIN_INTERVAL_MS: 1500,
    DEBUG_LOGGING: false,
  };


// The AI Overview patterns part was directly taken from: https://github.com/zbarnz/Google_AI_Overviews_Blocker.git
// These keywords are searched for in the header
// Turkish was added as extra
  const AI_OVERVIEW_PATTERNS = [
    /übersicht mit ki/i, /ai overview/i, /prezentare generală generată de ai/i,
    /AI による概要/, /Обзор от ИИ/, /AI 摘要/, /AI-overzicht/i, /AI-oversigt/i,
    /Vista creada con IA/i, /Přehled od AI/i, /Aperçu IA/i, /AI Bakışı/i,
  ];

//HTML selectors
  const DOM_SELECTORS = {
    MAIN_BODY: "div#rcnt",
    MAIN_BODY_MOBILE: "div#center_col",
    HEADER_TABS: "div#hdtb-sc > div",
    MAIN_ELEMENT: '[role="main"]',
    PEOPLE_ALSO_ASK: "div.related-question-pair",
    TABS_LIST: '[role="list"]',
  };

  const CSS_VALUES = { HIDDEN: "none", HEADER_PADDING: "12px", MAIN_MARGIN: "24px" };
  const TAB_PATTERNS = { AI_MODE: /^AI Mode$/i };

// Default until storage loads
  let enabled = true; 

  let detectionReady = false;

//Useful for debugging, only outputs reports to developer console if DEBUG_LOGGING = true
  function log(...args) { if (CONFIG.DEBUG_LOGGING) console.info("[AI Overview Blocker]", ...args); }
  function warn(...args) { if (CONFIG.DEBUG_LOGGING) console.warn("[AI Overview Blocker]", ...args); }

// rcnt is an outer container for the whole results column
// rso is an inner container holding the list of regular search results 
// These can change in the future, they are undocumented
  function getAiContainerParent(startEl) {
    let el = startEl;
    while (el && el.parentElement) {
      const parent = el.parentElement;
      if (parent.id === "rso") return el;
      if (parent.id === "rcnt") return el;
      el = parent;
    }
    return startEl;
  }

  function getThingsToKnowContainer(startEl) {
    let el = startEl;
    while (el && el.parentElement) {
      const parent = el.parentElement;
      if (parent.parentElement?.id === "rso") return el;
      el = parent;
    }
    return null;
  }

//Plan A
//folsrch is a fingerprint of Google's AI
//Even if AI Overview generation fails, it exists as a fallback element (folsrch-ghost)
  function tryDataAttributeMatch(mainBody) {
    if (!mainBody) return null;
    const inner = mainBody.querySelector('[data-async-type="folsrch"]') ||
      mainBody.querySelector('[id^="folsrch"]');
    if (inner) {
      const block = getAiContainerParent(inner);
      if (block) return block;
    }
    return null;
  }

//Plan B
  function tryStructuralMatch(mainBody) {
    if (!mainBody) return null;
    const structuralSelectors = [
      '[data-subtree~="aimc"]', '[data-subtree="aimc"]',
      '[data-subtree="aimfl,mfl"]', '[data-subtree="aimfl"]',
      '[jscontroller][data-hveid][data-async-context*="ai"]',
    ];
    for (const sel of structuralSelectors) {
      const match = mainBody.querySelector(sel);
      if (match) {
        const block = getAiContainerParent(match);
        if (block) return block;
      }
    }
    return null;
  }

  let lastTextFallbackRun = 0;
  function shouldRunTextFallback() {
    if (!CONFIG.ENABLE_TEXT_PATTERN_FALLBACK) return false;
    const now = Date.now();
    if (now - lastTextFallbackRun < CONFIG.TEXT_FALLBACK_MIN_INTERVAL_MS) return false;
    lastTextFallbackRun = now;
    return true;
  }

//Plan C
  function tryTextPatternMatch(mainBody) {
    if (!mainBody) return null;
    const headings = [...mainBody.querySelectorAll("h1, h2, [role='heading']")];
    const aiTexts = headings.filter((e) =>
      AI_OVERVIEW_PATTERNS.some((p) => p.test(e.innerText || ""))
    );
    for (const aiText of aiTexts) {
      const block = getAiContainerParent(aiText);
      if (block) return block;
    }
    return null;
  }

  function detectAiOverview(mainBody) {
    let block = tryDataAttributeMatch(mainBody); //Plan A
    if (block) return { block, confidence: "high" };
    block = tryStructuralMatch(mainBody); //Plan B
    if (block) return { block, confidence: "medium" };
    if (shouldRunTextFallback()) { //Plan C
      block = tryTextPatternMatch(mainBody);
      if (block) return { block, confidence: "low" };
    }
    return null;
  }

  function getThingsToKnow() {
    const candidates = document.querySelectorAll("[data-maindata]:not([data-bkt])");
    for (const el of candidates) {
      const block = getThingsToKnowContainer(el);
      if (block) return block;
    }
    return null;
  }

  function isAiOverviewPaaTab(el) {
    if (!el || !el.matches(DOM_SELECTORS.PEOPLE_ALSO_ASK)) return false;
    if (el.querySelector("[data-evn]")) return true;
    if (el.querySelector('[data-subtree~="aimc"], [data-subtree="aimc"]')) return true;
    if (el.querySelector('[data-subtree="aimfl,mfl"], [data-subtree="aimfl"]')) return true;
    if (CONFIG.ENABLE_TEXT_PATTERN_FALLBACK &&
      AI_OVERVIEW_PATTERNS.some((p) => p.test(el.innerText || ""))) return true;
    return false;
  }

  function runDetection() {
    if (!enabled || !detectionReady) return;

    const mainBody =
      document.querySelector(DOM_SELECTORS.MAIN_BODY) ||
      document.querySelector(DOM_SELECTORS.MAIN_BODY_MOBILE);
    if (!mainBody) return;

    if (CONFIG.HIDE_AI_OVERVIEW) {
      const result = detectAiOverview(mainBody);
      if (result?.block) {
        result.block.style.display = CSS_VALUES.HIDDEN;
        if (result.confidence !== "high") {
          log(`AI Overview hidden via ${result.confidence}-confidence match`);
        }
      }
    }

    const headerTabs = document.querySelector(DOM_SELECTORS.HEADER_TABS);
    if (headerTabs) headerTabs.style.paddingBottom = CSS_VALUES.HEADER_PADDING;

    const mainElement = document.querySelector(DOM_SELECTORS.MAIN_ELEMENT);
    if (mainElement) mainElement.style.marginTop = CSS_VALUES.MAIN_MARGIN;

    if (CONFIG.HIDE_PEOPLE_ALSO_ASK_AI_ENTRIES) {
      const paaAiEntries = [...document.querySelectorAll(DOM_SELECTORS.PEOPLE_ALSO_ASK)]
        .filter(isAiOverviewPaaTab);
      paaAiEntries.forEach((el) => {
        if (el.parentElement?.parentElement) {
          el.parentElement.parentElement.style.display = CSS_VALUES.HIDDEN;
        }
      });
    }

    if (CONFIG.HIDE_THINGS_TO_KNOW) {
      const thingsToKnow = getThingsToKnow();
      if (thingsToKnow) thingsToKnow.style.display = CSS_VALUES.HIDDEN;
    }

    if (CONFIG.HIDE_AI_MODE_TAB) {
      const tabsList = document.querySelector(DOM_SELECTORS.TABS_LIST)?.children;
      if (tabsList?.length) {
        const aiModeTab = tabsList[0];
        const text = (aiModeTab.innerText || "").trim();
        if (TAB_PATTERNS.AI_MODE.test(text)) {
          aiModeTab.style.display = CSS_VALUES.HIDDEN;
        }
      }
    }
  }

  let scheduled = false;
  function scheduleDetection() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      try { runDetection(); } catch (e) { warn("detection error", e); }
    });
  }

//IMPORTANT
  const observer = new MutationObserver(scheduleDetection);

  function start() {
    observer.observe(document.documentElement || document, { childList: true, subtree: true });

    chrome.storage.local.get([STORAGE_KEY], (result) => {
      enabled = result[STORAGE_KEY] !== false;
      detectionReady = true;
      scheduleDetection();
    });

    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === "local" && STORAGE_KEY in changes) {
        enabled = changes[STORAGE_KEY].newValue !== false;
        if (enabled) {
          scheduleDetection();
        } else {
          location.reload();
        }
      }
    });
  }

  if (document.body) start();
  else document.addEventListener("DOMContentLoaded", start, { once: true });

  (function patchHistoryForRerun() {
    const fire = () => scheduleDetection();
    const _pushState = history.pushState;
    const _replaceState = history.replaceState;
    history.pushState = function (...args) { const r = _pushState.apply(this, args); fire(); return r; };
    history.replaceState = function (...args) { const r = _replaceState.apply(this, args); fire(); return r; };
    window.addEventListener("popstate", fire);
  })();
}