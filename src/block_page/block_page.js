document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const blockedUrl = urlParams.get('url');

    const urlElement = document.getElementById('blocked-url');
    let displayUrl = blockedUrl;
    if (blockedUrl) {
        displayUrl = blockedUrl.replace('||', '').replace('^', '');
        urlElement.textContent = displayUrl;
    }

    const reasonElement = document.getElementById('block-reason');
    reasonElement.innerHTML = 'a blocklist of phishing websites, curated from <a href="https://openphish.com/" target="_blank">OpenPhish</a>, <a href="https://ipthreat.net/" target="_blank">IPThreat</a>, and <a href="https://phishtank.org/" target="_blank">PhishTank</a>.';

    document.getElementById('go-back').addEventListener('click', () => {
        history.back();
    });

    document.getElementById('proceed').addEventListener('click', async () => {

        try {
            await chrome.runtime.sendMessage({
                command: 'whitelistTemporarily',
                url: blockedUrl
            });
        } catch (e) {
            console.error("Failed to add whitelist rule:", e);
            return;
        }

        window.location.href = 'http://' + displayUrl;
    });
});