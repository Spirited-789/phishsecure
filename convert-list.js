// convert-list.js
const fs = require('fs');
const path = require('path');

// --- Configuration ---
const DNR_RULE_ID_START = 1;
const BLOCK_PAGE_URL = 'src/block_page/block_page.html';
const PHISHING_FILTER_PATH = 'phishing-filter.txt';
const RULESETS_DIR = path.join(__dirname, 'rulesets');
const BASE_RULES_PATH = path.join(RULESETS_DIR, 'phishing_rules.json');
const PATCH_RULES_PATH = path.join(RULESETS_DIR, 'updates.json');

// Get arguments (e.g., node convert-list.js --release)
const isReleaseMode = process.argv.includes('--release');

// Ensure directories exist
if (!fs.existsSync(RULESETS_DIR)) fs.mkdirSync(RULESETS_DIR);

// --- Helper: Parse Raw Text List ---
function parseRawList(filePath) {
    if (!fs.existsSync(filePath)) return new Set();
    const text = fs.readFileSync(filePath, 'utf8');
    return new Set(
        text.split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0 && !line.startsWith('!'))
    );
}

// --- Helper: Parse Existing JSON Ruleset (The Base) ---
function parseBaseJson(filePath) {
    if (!fs.existsSync(filePath)) return new Set();
    try {
        const rules = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        // Extract domains back from the filter syntax "||domain.com^"
        const domains = rules.map(r => r.condition.urlFilter.slice(2, -1));
        return new Set(domains);
    } catch (e) {
        return new Set();
    }
}

// --- Helper: Generate Rule Objects ---
function generateRules(domains, startId = 1) {
    return Array.from(domains).map((domain, index) => ({
        "id": startId + index,
        "priority": 1,
        "action": {
            "type": "redirect",
            "redirect": { "extensionPath": `/${BLOCK_PAGE_URL}?url=${encodeURIComponent(domain)}` }
        },
        "condition": {
            "urlFilter": "||" + domain + "^",
            "resourceTypes": ["main_frame"]
        }
    }));
}

// --- MAIN LOGIC ---

console.log(`Running in ${isReleaseMode ? 'RELEASE' : 'PATCH'} mode...`);

// 1. Load the fresh list from GitLab download
const newDomainsSet = parseRawList(PHISHING_FILTER_PATH);
console.log(`Fresh list contains ${newDomainsSet.size} domains.`);

if (isReleaseMode) {
    // --- RELEASE MODE: Overwrite the Base ---
    // 1. Create full ruleset
    const allRules = generateRules(newDomainsSet, DNR_RULE_ID_START);
    fs.writeFileSync(BASE_RULES_PATH, JSON.stringify(allRules, null, 2));

    // 2. Clear the patch file (reset to empty array)
    fs.writeFileSync(PATCH_RULES_PATH, '[]');

    console.log(`[RELEASE] Updated Base Ruleset with ${allRules.length} rules.`);
    console.log(`[RELEASE] Cleared Patch file.`);

} else {
    // --- PATCH MODE: Calculate Diff ---
    // 1. Load the existing base (what is currently in the Store)
    const currentBaseSet = parseBaseJson(BASE_RULES_PATH);

    // 2. Find domains in New that are NOT in Base
    const patchDomains = [];
    for (const domain of newDomainsSet) {
        if (!currentBaseSet.has(domain)) {
            patchDomains.push(domain);
        }
    }

    // 3. Safety Check: 5,000 Rule Limit
    if (patchDomains.length > 5000) {
        console.error(`[CRITICAL] Patch size (${patchDomains.length}) exceeds Chrome limit (5000).`);
        console.error(`You MUST run a RELEASE update to bundle these into the base.`);
        // We intentionally exit with error to fail the GitHub Action so you notice
        process.exit(1);
    }

    // 4. Write the Patch file
    const patchRules = generateRules(patchDomains, DNR_RULE_ID_START);
    fs.writeFileSync(PATCH_RULES_PATH, JSON.stringify(patchRules, null, 2));

    console.log(`[PATCH] Generated updates.json with ${patchRules.length} new rules.`);
    console.log(`(Base size: ${currentBaseSet.size} | Fresh size: ${newDomainsSet.size})`);
}