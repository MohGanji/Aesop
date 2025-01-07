// Add a context menu option
chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.create({
        id: 'aesop',
        title: 'Aesop: Read Aloud Selected Text',
        contexts: ['selection']
    });
});

// Listen for context menu clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === "aesop" && info.selectionText) {
        // Send a message to the content script with the selected text
        chrome.tabs.sendMessage(tab.id, {
            type: "selectedText",
            text: info.selectionText
        });
    }
});