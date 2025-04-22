const optionsForm = document.getElementById('optionsForm');
const apiKeyInput = document.getElementById('apiKey');
const showKeyButton = document.getElementById('showKeyButton');
const statusDiv = document.getElementById('status');

// Load the saved API key when the options page loads
function restoreOptions() {
  // Use sync storage if you want the key available across user's logged-in browsers
  // Use local storage if only for this browser instance
  chrome.storage.local.get(['openaiApiKey'], (result) => {
    if (chrome.runtime.lastError) {
        console.error("Error retrieving API key:", chrome.runtime.lastError);
        statusDiv.textContent = '无法加载设置。';
        statusDiv.style.color = 'red';
    } else if (result.openaiApiKey) {
      apiKeyInput.value = result.openaiApiKey;
      statusDiv.textContent = '已加载保存的 API Key。';
      statusDiv.style.color = 'green';
    } else {
      statusDiv.textContent = '请输入您的 OpenAI API Key。';
      statusDiv.style.color = 'black';
    }
  });
}

// Save the API key
function saveOptions(e) {
  e.preventDefault(); // Prevent form submission
  const apiKey = apiKeyInput.value.trim();

  if (!apiKey) {
    statusDiv.textContent = 'API Key 不能为空！';
    statusDiv.style.color = 'red';
    return;
  }

  chrome.storage.local.set({ openaiApiKey: apiKey }, () => {
    if (chrome.runtime.lastError) {
        console.error("Error saving API key:", chrome.runtime.lastError);
        statusDiv.textContent = '保存失败！请重试。';
        statusDiv.style.color = 'red';
    } else {
        console.log("API Key saved successfully.");
        statusDiv.textContent = 'API Key 已保存！';
        statusDiv.style.color = 'green';
        // Optionally hide the status message after a few seconds
        setTimeout(() => { statusDiv.textContent = ''; }, 3000);
    }
  });
}

// Toggle visibility of the API key
function toggleApiKeyVisibility() {
    if (apiKeyInput.type === "password") {
        apiKeyInput.type = "text";
        showKeyButton.textContent = "隐藏";
    } else {
        apiKeyInput.type = "password";
        showKeyButton.textContent = "显示";
    }
}


document.addEventListener('DOMContentLoaded', restoreOptions);
optionsForm.addEventListener('submit', saveOptions);
showKeyButton.addEventListener('click', toggleApiKeyVisibility); 