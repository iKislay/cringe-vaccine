document.addEventListener("DOMContentLoaded", function () {
    const apiKeyInput = document.getElementById("apiKey");
    const saveButton = document.getElementById("saveApiKey");
    const statusMessage = document.getElementById("statusMessage");

    // Load the stored Gemini API key when the popup opens
    chrome.storage.sync.get("geminiApiKey", (data) => {
        if (data.geminiApiKey) {
            apiKeyInput.value = data.geminiApiKey;
        }
    });

    // Save the API key
    saveButton.addEventListener("click", function () {
        const apiKey = apiKeyInput.value.trim();
        if (apiKey) {
            chrome.storage.sync.set({ geminiApiKey: apiKey }, () => {
                statusMessage.textContent = "API Key saved!";
                setTimeout(() => (statusMessage.textContent = ""), 2000);
            });
        }
    });
});
