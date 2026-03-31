// SecurePass Manager Background Script

chrome.runtime.onInstalled.addListener(() => {
  console.log('SecurePass Manager Extension Installed');
  chrome.storage.local.set({ isUnlocked: false });
});

// Handle messages from content scripts or popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'CHECK_AUTH') {
    chrome.storage.local.get(['isUnlocked'], (data) => {
      sendResponse({ isUnlocked: data.isUnlocked });
    });
    return true; // async response
  }
});
