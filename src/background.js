// --- Constants ---
const PHISHING_RULESET_ID = "phishing_ruleset"; // Must match the ID in manifest.json

// --- State ---
let isEnabled = true;

// --- 1. Initialization and Event Listeners ---

// On first install, set defaults and apply
chrome.runtime.onInstalled.addListener(() => {
    // Only set 'isEnabled'
    chrome.storage.local.set({ isEnabled: true }, () => {
        loadStateAndApply();
    });
});

// On browser startup, load settings
chrome.runtime.onStartup.addListener(() => {
    loadStateAndApply();
});

// Listen for messages from popup OR THE BLOCK PAGE
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.command === 'updateState') {
        loadStateAndApply();
    } else if (message.command === 'whitelistTemporarily') {
        // 'message.url' is the clean domain (e.g., "domain.com")
        addTemporaryAllowRule(message.url)
            .then(() => sendResponse({ success: true }));
        return true; // Keep port open for async response
    }
});

// --- 2. State Management ---

// Loads state from storage and applies the correct blocking mode
async function loadStateAndApply() {
    const { isEnabled: storedIsEnabled } = await chrome.storage.local.get('isEnabled');
    isEnabled = storedIsEnabled !== false; // Default true

    console.log(`State Loaded: Enabled: ${isEnabled}`);
    applyBlockingMode();
}

// Applies the correct listeners/rules based on current state
async function applyBlockingMode() {
    if (!isEnabled) {
        console.log("Protection is OFF.");
        await chrome.declarativeNetRequest.updateEnabledRulesets({
            // *** FIX: Changed 'disableRuleIds' to 'disableRulesetIds' ***
            disableRulesetIds: [PHISHING_RULESET_ID]
        });
        return;
    }

    if (isEnabled) {
        console.log("Applying PHISHING mode.");
        await chrome.declarativeNetRequest.updateEnabledRulesets({
            // *** FIX: Changed 'enableRuleIds' to 'enableRulesetIds' ***
            enableRulesetIds: [PHISHING_RULESET_ID]
        });
    }
}

// --- 3. COUNTER LOGIC (REMOVED) ---

// --- 4. "Proceed" Button Logic (Unchanged) ---
async function addTemporaryAllowRule(domain) {
    const sessionRules = await chrome.declarativeNetRequest.getSessionRules();
    const nextId = Math.max(1, ...sessionRules.map(r => r.id)) + 1;
    const urlFilter = "||" + domain + "^";

    await chrome.declarativeNetRequest.updateSessionRules({
        addRules: [{
            "id": nextId,
            "priority": 2, // Higher priority than our static rules (which are 1)
            "action": { "type": "allow" },
            "condition": {
                "urlFilter": urlFilter,
                "resourceTypes": ["main_frame"]
            }
        }]
    });

    console.log(`Temporarily allowed domain: ${domain} with rule ID ${NextId}`);
}