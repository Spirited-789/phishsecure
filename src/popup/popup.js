document.addEventListener('DOMContentLoaded', () => {
    const masterSwitch = document.getElementById('master-switch');
    const modePhishing = document.getElementById('mode-phishing');
    const modeTotal = document.getElementById('mode-total');
    const modeSelectorContainer = document.getElementById('mode-selector-container');

    // 1. Load saved settings from storage
    chrome.storage.local.get(['isEnabled', 'securityMode'], (result) => {
        // Set master switch state
        masterSwitch.checked = result.isEnabled !== false; // Default to true
        updateBodyDisabledState(masterSwitch.checked);

        // Set security mode state
        const mode = result.securityMode || 'phishing'; // Default to 'phishing'
        if (mode === 'phishing') {
            modePhishing.checked = true;
        } else {
            modeTotal.checked = true;
        }
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

    // 3. Add listeners for mode toggle
    [modePhishing, modeTotal].forEach(radio => {
        radio.addEventListener('change', () => {
            if (radio.checked) {
                chrome.storage.local.set({ securityMode: radio.value }, () => {
                    // Send a message to background script to update its state
                    chrome.runtime.sendMessage({ command: 'updateState' });
                });
            }
        });
    });

    // Helper to dim the mode selector when extension is off
    function updateBodyDisabledState(isEnabled) {
        if (isEnabled) {
            document.body.classList.remove('disabled');
        } else {
            document.body.classList.add('disabled');
        }
    }
});