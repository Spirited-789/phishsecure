// --- Constants ---
// **IMPORTANT**: Get your own VirusTotal API key
const VIRUSTOTAL_API_KEY = 'YOUR_API_KEY_HERE'; // <-- PUT YOUR KEY HERE
const BLOCK_PAGE_URL = chrome.runtime.getURL('src/block_page/block_page.html');
const PHISHING_RULESET_ID = "phishing_ruleset"; // Must match the ID in manifest.json

// --- State ---
let isEnabled = true;
let securityMode = 'phishing';
let tempWhitelist = new Set();
let vtCache = new Map(); // Use a simple Map for session caching

// --- 1. Initialization and Event Listeners ---

// On first install, load settings and set defaults
chrome.runtime.onInstalled.addListener(() => {
    chrome.storage.local.set({ isEnabled: true, securityMode: 'phishing' }, () => {
        loadStateAndApply();
    });
});

// On browser startup, load settings
chrome.runtime.onStartup.addListener(() => {
    loadStateAndApply();
    vtCache.clear();
    tempWhitelist.clear();
});

// Listen for messages from popup or block page
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.command === 'updateState') {
        loadStateAndApply();
    } else if (message.command === 'whitelistTemporarily') {
        tempWhitelist.add(message.url);
        vtCache.delete(message.url);
    }
});

// --- 2. State Management ---

// Loads state from storage and applies the correct blocking mode
async function loadStateAndApply() {
    const result = await chrome.storage.local.get(['isEnabled', 'securityMode']);
    isEnabled = result.isEnabled !== false; // Default true
    securityMode = result.securityMode || 'phishing'; // Default phishing

    console.log(`State Loaded: Enabled: ${isEnabled}, Mode: ${securityMode}`);
    applyBlockingMode();
}

// Applies the correct listeners/rules based on current state
async function applyBlockingMode() {
    // --- Disable Everything First ---
    // Remove tab update listener (for VirusTotal mode)
    chrome.tabs.onUpdated.removeListener(virusTotalTabListener);
    // Disable the static phishing ruleset
    await chrome.declarativeNetRequest.updateEnabledRulesets({
        disableRulesetIds: [PHISHING_RULESET_ID]
    });

    // --- Enable the Correct Mode ---
    if (!isEnabled) {
        console.log("Protection is OFF.");
        return;
    }

    if (securityMode === 'phishing') {
        console.log("Applying PHISHING mode.");
        // Enable the static phishing ruleset
        await chrome.declarativeNetRequest.updateEnabledRulesets({
            enableRulesetIds: [PHISHING_RULESET_ID]
        });

    } else if (securityMode === 'total_security') {
        console.log("Applying TOTAL SECURITY mode.");
        // Add tab update listener
        chrome.tabs.onUpdated.addListener(virusTotalTabListener);
    }
}

// --- 3. "Phishing" Mode Logic (REMOVED) ---
// All this logic is now in the static rulesets/phishing_rules.json file.
// We no longer need updatePhishingList() or convertToDNRRules().

// --- 4. "Total Security" Mode Logic (Tabs API + VirusTotal) ---
// This remains unchanged.

async function virusTotalTabListener(tabId, changeInfo, tab) {
    if (changeInfo.status !== 'loading' || !tab.url || !tab.url.startsWith('http')) {
        return;
    }
    const url = tab.url;
    if (tempWhitelist.has(url)) {
        return;
    }
    if (vtCache.has(url)) {
        if (vtCache.get(url) === 'dangerous') {
            redirectToBlockPage(tabId, url, 'total_security');
        }
        return;
    }
    const isDangerous = await checkUrlWithVirusTotal(url);
    if (isDangerous) {
        vtCache.set(url, 'dangerous');
        redirectToBlockPage(tabId, url, 'total_security');
    } else {
        vtCache.set(url, 'safe');
    }
}

async function checkUrlWithVirusTotal(url) {
    if (VIRUSTOTAL_API_KEY === 'YOUR_API_KEY_HERE') {
        console.warn("VirusTotal API key not set. Skipping check.");
        return false;
    }
    const urlId = btoa(url).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    try {
        const response = await fetch(`https://www.virustotal.com/api/v3/urls/${urlId}`, {
            headers: { 'x-apikey': VIRUSTOTAL_API_KEY }
        });
        if (response.status === 404) return false; // Not in VT, treat as safe
        if (!response.ok) {
            console.error('VirusTotal API error:', response.status);
            return false; // Fail safe
        }
        const data = await response.json();
        const stats = data.data.attributes.last_analysis_stats;
        if (stats.malicious > 0 || stats.phishing > 0) {
            console.log(`VirusTotal detected ${url} as DANGEROUS.`);
            return true;
        }
        console.log(`VirusTotal detected ${url} as SAFE.`);
        return false;
    } catch (error) {
        console.error('Error checking VirusTotal:', error);
        return false; // Fail safe
    }
}

function redirectToBlockPage(tabId, url, mode) {
    const redirectUrl = `${BLOCK_PAGE_URL}?url=${encodeURIComponent(url)}&mode=${mode}`;
    chrome.tabs.update(tabId, { url: redirectUrl });
}