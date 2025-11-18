document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const blockedUrl = urlParams.get('url'); // This is the clean domain, e.g., "domain.com"
    // Removed 'mode' variable

    // Display the blocked URL
    const urlElement = document.getElementById('blocked-url');
    let displayUrl = blockedUrl;
    if (blockedUrl) {
        // Clean up the URL for display
        displayUrl = blockedUrl.replace('||', '').replace('^', '');
        urlElement.textContent = displayUrl;
    }

    // Display the reason
    const reasonElement = document.getElementById('block-reason');
    // Hardcode the reason since there's only one mode
    reasonElement.textContent = 'a known phishing filter list';
    // Removed 'if (mode === ...)' logic

    // "Go Back" button logic
    document.getElementById('go-back').addEventListener('click', () => {
        history.back();
    });

    // "Proceed" button logic
    document.getElementById('proceed').addEventListener('click', async () => {

        try {
            // Send the clean domain
            await chrome.runtime.sendMessage({
                command: 'whitelistTemporarily',
                url: blockedUrl
            });
        } catch (e) {
            console.error("Failed to add whitelist rule:", e);
            return; // Stop if the rule wasn't added
        }

        // This code now only runs AFTER the background script is done
        // Only one action now, no 'if mode === ...'
        window.location.href = 'http://' + displayUrl;
    });
});