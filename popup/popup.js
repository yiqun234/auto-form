const resumeFileInput = document.getElementById('resumeFile');
const fillFormButton = document.getElementById('fillFormButton');
const statusDiv = document.getElementById('status');

let resumeText = null; // 稍后存储简历文本

// 初始化时检查是否已有存储的简历数据
chrome.storage.local.get(['resumeData'], (result) => {
  if (result.resumeData) {
    statusDiv.textContent = '已加载简历数据，可以填充表单。';
    // 注意：这里只加载了结构化数据，可能还需要原始文本
    // resumeText = result.resumeData.originalText; // 假设存储了原始文本
  } else {
    statusDiv.textContent = '请先上传简历。';
  }
});


resumeFileInput.addEventListener('change', (event) => {
  const file = event.target.files[0];
  if (!file) {
    statusDiv.textContent = '未选择文件。';
    return;
  }

  statusDiv.textContent = `正在处理 ${file.name}...`;

  // Optional: Check if it's a txt file for now
  if (!file.name.toLowerCase().endsWith('.txt')) {
     console.warn(`Selected file "${file.name}" is not a .txt file. Attempting to read as text, but full parsing for PDF/DOCX is not yet implemented.`);
     // You could disable the button or show a clearer message if you ONLY want to allow .txt for now
  }

  const reader = new FileReader();

  reader.onload = function(e) {
    // e.target.result now contains the text content directly for .txt files
    const extractedText = e.target.result;
    resumeText = extractedText; // Store text

    if (!extractedText) {
        statusDiv.textContent = '无法读取文件内容或文件为空。';
        console.error("File content is empty or could not be read.");
        return;
    }

    statusDiv.textContent = '文件读取成功，正在发送解析请求...';

    // 将实际提取的文本发送到 background script 进行 OpenAI 解析
    chrome.runtime.sendMessage({ type: 'PARSE_RESUME_TEXT', payload: extractedText }, (response) => {
      if (chrome.runtime.lastError) {
        statusDiv.textContent = `解析请求出错: ${chrome.runtime.lastError.message}`;
        console.error(chrome.runtime.lastError);
      } else if (response && response.success) {
        statusDiv.textContent = '简历解析成功！可以填充表单。';
        // 解析后的数据由 background script 存储在 chrome.storage.local
      } else {
        statusDiv.textContent = `解析失败: ${response?.error || '未知错误'}`;
      }
    });
  };

  reader.onerror = function() {
    statusDiv.textContent = '读取文件失败！';
    console.error("File reading error");
  };

  // Read the file as text
  reader.readAsText(file);
});

fillFormButton.addEventListener('click', async () => {
  statusDiv.textContent = '正在尝试填充表单...';

  // 1. 获取当前活动的标签页
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  if (!tab) {
    statusDiv.textContent = '无法获取当前标签页。';
    console.error("No active tab found");
    return;
  }

  // 2. 向 content script 发送消息，要求其查找表单字段
  try {
    const response = await chrome.tabs.sendMessage(tab.id, { type: 'GET_FORM_FIELDS' });
    if (chrome.runtime.lastError) {
      throw new Error(chrome.runtime.lastError.message);
    }

    if (response && response.success && response.payload) {
      const formFields = response.payload;
      statusDiv.textContent = `找到 ${formFields.length} 个字段，正在请求匹配...`;

      // 3. 从 storage 获取解析后的简历数据
      chrome.storage.local.get(['resumeData'], (result) => {
        if (chrome.runtime.lastError) {
           statusDiv.textContent = `读取简历数据失败: ${chrome.runtime.lastError.message}`;
           console.error(chrome.runtime.lastError);
           return;
        }
        if (!result.resumeData) {
           statusDiv.textContent = '未找到解析后的简历数据，请先上传并等待解析完成。';
           return;
        }

        // 4. 将表单字段和简历数据发送到 background script 请求 OpenAI 匹配
        chrome.runtime.sendMessage({
            type: 'MATCH_FIELDS_WITH_RESUME',
            payload: {
                formFields: formFields, // content script 识别的字段信息
                resumeData: result.resumeData // background script 解析存储的数据
            }
        }, (matchResponse) => {
            if (chrome.runtime.lastError) {
                statusDiv.textContent = `匹配请求失败: ${chrome.runtime.lastError.message}`;
                console.error(chrome.runtime.lastError);
            } else if (matchResponse && matchResponse.success && matchResponse.payload) {
                const fieldMapping = matchResponse.payload; // OpenAI 返回的匹配结果 {fieldId: valueToFill, ...}
                statusDiv.textContent = '匹配成功，正在填充...';

                // 5. 将匹配结果发送回 content script 进行填充
                chrome.tabs.sendMessage(tab.id, { type: 'FILL_FORM', payload: fieldMapping }, (fillResponse) => {
                     if (chrome.runtime.lastError) {
                        statusDiv.textContent = `填充失败: ${chrome.runtime.lastError.message}`;
                        console.error(chrome.runtime.lastError);
                     } else if (fillResponse && fillResponse.success) {
                        statusDiv.textContent = '表单填充完成！';
                     } else {
                        statusDiv.textContent = `填充时发生错误: ${fillResponse?.error || '未知错误'}`;
                     }
                });
            } else {
                statusDiv.textContent = `匹配失败: ${matchResponse?.error || '未知错误'}`;
            }
        });
      });

    } else {
      statusDiv.textContent = `获取表单字段失败: ${response?.error || '未找到字段或 content script 未响应'}`;
    }
  } catch (error) {
    statusDiv.textContent = `通信错误: ${error.message}`;
    console.error("Error communicating with content script:", error);
    // 可能需要提示用户刷新页面或检查插件权限
  }
});

// 监听来自 background script 的消息 (例如更新状态)
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'UPDATE_STATUS') {
    statusDiv.textContent = message.payload;
  }
}); 