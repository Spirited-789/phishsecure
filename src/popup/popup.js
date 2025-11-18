document.addEventListener('DOMContentLoaded', () => {
    const masterSwitch = document.getElementById('master-switch');
    // 1. Load saved settings from storage
    chrome.storage.local.get(['isEnabled'], (result) => { // Removed 'blockedSiteCount'
        // Set master switch state
        masterSwitch.checked = result.isEnabled !== false; // Default to true
        updateBodyDisabledState(masterSwitch.checked);
    });

    // 2. Add listener for master switch
    masterSwitch.addEventListener('change', () => {
        const isEnabled = masterSwitch.checked;
        chrome.storage.local.set({ isEnabled: isEnabled }, () => {
            // Send a message to background script to update its state
            chrome.runtime.sendMessage({ command: 'updateState' });
            updateBodyDisabledState(isEnabled);
        });
    });

    // 3. Helper to dim the popup when extension is off
    function updateBodyDisabledState(isEnabled) {
        if (isEnabled) {
            document.body.classList.remove('disabled');
        } else {
            document.body.classList.add('disabled');
        }
    }
});