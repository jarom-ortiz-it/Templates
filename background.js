// Keep track of tabs where content script has been injected
const injectedTabs = new Set();

chrome.tabs.onActivated.addListener(function(activeInfo) {
    if (!injectedTabs.has(activeInfo.tabId)) {
        chrome.scripting.executeScript({
            target: {tabId: activeInfo.tabId},
            files: ['content.js']
        }, () => {
            if (!chrome.runtime.lastError) {
                injectedTabs.add(activeInfo.tabId);
            }
        });
    }
});

chrome.tabs.onRemoved.addListener(function(tabId) {
    // Remove tab from injectedTabs when it's closed
    injectedTabs.delete(tabId);
});

chrome.commands.onCommand.addListener((command) => {
    if (command === "_execute_action") {
        chrome.action.openPopup();
    }
});

// Listen for contentScriptReady message
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "contentScriptReady") {
        sendResponse({status: "acknowledged"});
    }
});