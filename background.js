// Handle toolbar icon click
chrome.action.onClicked.addListener(() => {
  chrome.runtime.openOptionsPage();
});

// Default redirect rules
const defaultRules = [
  {  
    from: ".corp",
    to: ".com",
    enabled: true
  }
];

// Load rules from storage or use defaults
chrome.storage.local.get(['redirectRules'], function(result) {
  if (!result.redirectRules) {
    chrome.storage.local.set({ redirectRules: defaultRules });
  }
});

// Listen for URL changes
chrome.webNavigation.onBeforeNavigate.addListener(function(details) {
  // Only handle main frame navigation
  if (details.frameId !== 0) return;

  chrome.storage.local.get(['redirectRules'], function(result) {
    const rules = result.redirectRules || defaultRules;
    let url = details.url;
    let urlChanged = false;

    try {
      const urlObj = new URL(url);
      
      for (const rule of rules) {
        if (!rule.enabled) continue;

        // If the rule starts and ends with dots, it's a domain rule
        if (rule.from.startsWith('.') && rule.from.endsWith('.')) {
          // Remove the dots for the actual comparison
          const fromPattern = rule.from.slice(1, -1);
          const toPattern = rule.to.slice(1, -1);

          if (urlObj.hostname.includes(fromPattern)) {
            urlObj.hostname = urlObj.hostname.replace(fromPattern, toPattern);
            url = urlObj.toString();
            urlChanged = true;
            break;
          }
        } else {
          // For non-domain rules, try a direct replacement
          const newUrl = url.replace(rule.from, rule.to);
          if (newUrl !== url) {
            url = newUrl;
            urlChanged = true;
            break;
          }
        }
      }

      if (urlChanged) {
        console.log('Redirecting to:', url);
        chrome.tabs.update(details.tabId, { url: url });
      }
    } catch (error) {
      console.error('Error processing URL:', error);
    }
  });
});

