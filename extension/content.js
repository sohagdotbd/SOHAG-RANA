// SecurePass Manager Content Script

// Detect login forms and suggest auto-fill
function detectLoginForms() {
  const forms = document.querySelectorAll('form');
  forms.forEach(form => {
    const passwordInputs = form.querySelectorAll('input[type="password"]');
    if (passwordInputs.length > 0) {
      console.log('SecurePass: Login form detected');
      // Here we could inject a small icon into the input fields
      // For now, we'll wait for the popup to trigger filling
    }
  });
}

// Listen for messages from the extension popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'FILL_CREDENTIALS') {
    const { username, password } = request.data;
    const userInputs = document.querySelectorAll('input[type="text"], input[type="email"], input[name*="user"], input[id*="user"]');
    const passInputs = document.querySelectorAll('input[type="password"]');

    if (userInputs.length > 0) {
      userInputs[0].value = username;
      userInputs[0].dispatchEvent(new Event('input', { bubbles: true }));
    }
    if (passInputs.length > 0) {
      passInputs[0].value = password;
      passInputs[0].dispatchEvent(new Event('input', { bubbles: true }));
    }
    sendResponse({ success: true });
  }
});

// Initial detection
detectLoginForms();
