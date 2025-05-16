document.addEventListener('DOMContentLoaded', function() {
  loadRules();
  document.getElementById('detectRule').addEventListener('click', detectAndCreateRule);
});

function findDifferences(url1, url2) {
  try {
    // Add https:// if not present
    if (!url1.startsWith('http')) url1 = 'https://' + url1;
    if (!url2.startsWith('http')) url2 = 'https://' + url2;

    const parsedUrl1 = new URL(url1);
    const parsedUrl2 = new URL(url2);
    
    // Compare different parts of the URLs to find the differences
    const differences = [];
    
    if (parsedUrl1.hostname !== parsedUrl2.hostname) {
      // Compare the full hostnames first
      const hostname1 = parsedUrl1.hostname;
      const hostname2 = parsedUrl2.hostname;
      
      // Find the longest common prefix and suffix
      let prefixLength = 0;
      while (prefixLength < hostname1.length && 
             prefixLength < hostname2.length && 
             hostname1[prefixLength] === hostname2[prefixLength]) {
        prefixLength++;
      }
      
      let suffixLength = 0;
      while (suffixLength < hostname1.length - prefixLength && 
             suffixLength < hostname2.length - prefixLength && 
             hostname1[hostname1.length - 1 - suffixLength] === hostname2[hostname2.length - 1 - suffixLength]) {
        suffixLength++;
      }
      
      const from = hostname1.slice(prefixLength, hostname1.length - suffixLength);
      const to = hostname2.slice(prefixLength, hostname2.length - suffixLength);
      
      if (from && to) {
        differences.push({
          from: '.' + from + '.',
          to: '.' + to + '.'
        });
      }
    }
    
    if (parsedUrl1.pathname !== parsedUrl2.pathname) {
      differences.push({
        from: parsedUrl1.pathname,
        to: parsedUrl2.pathname
      });
    }
    
    return differences;
  } catch (error) {
    console.error('Error comparing URLs:', error);
    return null;
  }
}

function detectAndCreateRule() {
  const originalUrl = document.getElementById('originalUrl').value.trim();
  const correctedUrl = document.getElementById('correctedUrl').value.trim();
  
  if (!originalUrl || !correctedUrl) {
    alert('Please enter both URLs');
    return;
  }
  
  const differences = findDifferences(originalUrl, correctedUrl);
  
  if (!differences || differences.length === 0) {
    alert('Could not detect any significant differences between the URLs');
    return;
  }
  
  // Create rules for each difference found
  chrome.storage.local.get(['redirectRules'], function(result) {
    const rules = result.redirectRules || [];
    
    differences.forEach(diff => {
      rules.push({
        from: diff.from,
        to: diff.to,
        enabled: true,
        example: {
          original: originalUrl,
          corrected: correctedUrl
        }
      });
    });
    
    chrome.storage.local.set({ redirectRules: rules }, () => {
      document.getElementById('originalUrl').value = '';
      document.getElementById('correctedUrl').value = '';
      loadRules();
    });
  });
}

function loadRules() {
  chrome.storage.local.get(['redirectRules'], function(result) {
    const rules = result.redirectRules || [];
    const rulesContainer = document.getElementById('rules');
    rulesContainer.innerHTML = '';
    
    rules.forEach((rule, index) => {
      const ruleElement = createRuleElement(rule, index);
      rulesContainer.appendChild(ruleElement);
    });
  });
}

function createRuleElement(rule, index) {
  const div = document.createElement('div');
  div.className = 'rule';
  
  let exampleText = '';
  if (rule.example) {
    exampleText = `
      <div class="pattern">
        <strong>Example:</strong><br>
        From: ${rule.example.original}<br>
        To: ${rule.example.corrected}
      </div>`;
  }
  
  div.innerHTML = `
    <div>
      <input type="checkbox" class="enabled" ${rule.enabled ? 'checked' : ''}>
      Replace: <input type="text" class="from" value="${rule.from}">
      with: <input type="text" class="to" value="${rule.to}">
      ${exampleText}
      <button class="delete-btn">Delete</button>
    </div>
  `;

  // Add event listeners
  const inputs = div.querySelectorAll('input');
  inputs.forEach(input => {
    input.addEventListener('change', () => updateRule(index));
  });

  div.querySelector('.delete-btn').addEventListener('click', () => deleteRule(index));

  return div;
}

function updateRule(index) {
  chrome.storage.local.get(['redirectRules'], function(result) {
    const rules = result.redirectRules || [];
    const ruleDiv = document.querySelectorAll('.rule')[index];
    
    rules[index] = {
      ...rules[index],
      from: ruleDiv.querySelector('.from').value,
      to: ruleDiv.querySelector('.to').value,
      enabled: ruleDiv.querySelector('.enabled').checked
    };

    chrome.storage.local.set({ redirectRules: rules });
  });
}

function deleteRule(index) {
  chrome.storage.local.get(['redirectRules'], function(result) {
    const rules = result.redirectRules || [];
    rules.splice(index, 1);
    chrome.storage.local.set({ redirectRules: rules }, loadRules);
  });
}
