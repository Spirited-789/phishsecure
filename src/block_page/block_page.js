document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const blockedUrl = urlParams.get('url');
    const mode = urlParams.get('mode');

    // Display the blocked URL
    const urlElement = document.getElementById('blocked-url');
    if (blockedUrl) {
        // For DNR rules, the URL might be the filter rule (||domain.com^)
        // Let's clean it up for display
        const displayUrl = blockedUrl.replace('||', '').replace('^', '');
        urlElement.textContent = displayUrl;
    }

    // Display the reason
    const reasonElement = document.getElementById('block-reason');
    if (mode === 'phishing') {
        reasonElement.textContent = 'a known phishing filter list';
    } else if (mode === 'total_security') {
        reasonElement.textContent = 'VirusTotal';
    }

    // "Go Back" button logic
    document.getElementById('go-back').addEventListener('click', () => {
        history.back();
    });

    // "Proceed" button logic
    document.getElementById('proceed').addEventListener('click', () => {
        // Send a message to the background script to temporarily whitelist this URL
        chrome.runtime.sendMessage({
            command: 'whitelistTemporarily',
            url: blockedUrl // Send the original, un-cleaned URL/filter
        });

        // Try to redirect to the site
        // Note: For DNR rules, 'blockedUrl' is the filter, not the full URL.
        // This is a limitation. The "Total Security" proceed will work better.
        // A more advanced solution would pass the full URL from the listener.
        if (mode === 'total_security') {
            window.location.href = blockedUrl;
        } else {
            // For phishing, we just have the domain. Try to go there.
            window.location.href = 'http://' + urlElement.textContent;
        }
    });
});