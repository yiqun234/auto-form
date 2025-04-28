// API Key 相关元素
const apiKeyForm = document.getElementById('apiKeyForm');
const apiKeyInput = document.getElementById('apiKey');
const showKeyButton = document.getElementById('showKeyButton');
const apiKeyStatus = document.getElementById('apiKeyStatus');

// 简历内容相关元素
const resumeForm = document.getElementById('resumeForm');
const resumeContent = document.getElementById('resumeContent');
const resumeStatus = document.getElementById('resumeStatus');

// 自定义 Prompt 相关元素
const promptForm = document.getElementById('promptForm');
const customPrompt = document.getElementById('customPrompt');
const resetPromptButton = document.getElementById('resetPromptButton');
const promptStatus = document.getElementById('promptStatus');

// 默认的匹配提示词
const DEFAULT_PROMPT = `
您是一个AI助手，负责根据提供的结构化简历数据和网页表单字段列表，生成自动填充表单所需的键值对。您的目标是理解每个表单字段的问题，并根据简历数据提供最准确、最相关的回答。您的响应应该是一个JSON对象，其中键是表单字段的 'fieldId' (来自 input formFields)，值是应该填充到该字段的字符串。

重要规则：
1. 分析每个表单字段的 'label', 'name', 'id', 'placeholder', 'type', 以及 **最重要的 'options' 列表** 来理解其用途和期望的输入格式。
2. **从简历数据中寻找或推断答案:** 这是核心任务。对于每个字段，首先在 'resumeData' (这是一个结构化JSON对象，包含 personalInfo, workExperience, education, skills, projects 等信息) 中找到最相关的信息。您需要阅读简历数据中的文本描述，理解其含义，并据此生成答案。
3. **处理选择项 (下拉菜单, 单选, 复选):** 如果表单字段有 'options' 数组，请找到简历数据或根据以下规则推断出的最匹配内容。然后从 'options' 列表中找到与该内容最接近的选项，返回该选项的 **'value' 属性**。如果该选项没有 'value' 属性，则返回其 **'text' 属性**。
4. **处理特定问题 (正面回答):** 对于少数与简历内容不直接相关，但需要标准积极回答的问题（例如：接受背景调查/毒品检查？意愿搬迁/出差？是否残疾？），根据提供的 'options' 列表，选择一个表达积极意愿或标准态度的选项的 **'value' 或 'text'** 返回。**注意：此规则仅适用于特定类型的通用问题，不适用于询问具体技能或经验年限的问题。**
5. **处理数值问题 (如工作年限):** 如果表单字段（通过label/name/placeholder识别，如"SCADA 经验年限？"）询问一个数量（如年限、人数等），请在 'resumeData' (特别是工作经历 \`workExperience\` 和项目 \`projects\`) 中找到相关的经验描述。**根据描述中的时间和内容，估算**相关的年限或数量。返回的答案必须是**纯数字的字符串**（例如，如果简历表明有 3 年相关经验，返回 "3"）。如果简历中完全没有相关信息，则省略该字段。
6. **处理结构化地址字段:** 简历数据中的地址在 \`resumeData.personalInfo.address\` 下有 \`street\`, \`city\`, \`state\`, \`zipCode\`, \`country\` 字段。请将这些结构化地址组件与表单中对应的地址输入字段进行匹配，返回匹配到的字符串。
7. **处理电话字段:** 简历数据中的电话在 \`resumeData.personalInfo.phone\`。请将这个值与表单中的电话字段进行匹配，返回匹配到的字符串。
8. **处理文本区域（textarea）或通用文本输入框:** 如果字段是开放式文本输入（如个人简介、描述等），从简历数据中提取最相关的摘要或关键描述（summary, experience/project description）。如果问题非常开放或无法从简历中直接找到，根据问题和简历内容尝试生成一个简短、相关且积极的回答。不要留空。
9. 如果从简历数据中找不到合适信息，且该字段不属于规则 4 (特定正面回答) 覆盖的类型，也无法通过规则 5, 6, 7, 8 找到或推断出答案，则省略该字段的键值对。
10. 所有输出的值 **必须是字符串类型**。即使是数字、布尔值、日期、选择项的值/文本，也请转换为对应的字符串。
11. 确保你返回的JSON对象只包含需要填充的字段，并且键是传入的 formFields 中的 \`fieldId\`，值是需要填充的字符串。
`;


// 初始化：加载所有保存的数据
function restoreOptions() {
  console.log("正在恢复选项设置...");
  // 加载 API Key
  console.log("尝试加载API Key...");
  chrome.storage.local.get(['openaiApiKey'], (result) => {
    if (chrome.runtime.lastError) {
      console.error("Error retrieving API key:", chrome.runtime.lastError);
      apiKeyStatus.textContent = '无法加载API密钥。';
      apiKeyStatus.style.color = 'red';
    } else if (result.openaiApiKey) {
      console.log("成功从存储中读取API Key (掩码):", "****" + result.openaiApiKey.slice(-4));
      apiKeyInput.value = result.openaiApiKey;
      apiKeyStatus.textContent = '已加载保存的API Key。';
      apiKeyStatus.style.color = 'green';
    } else {
      console.log("未找到已保存的API Key");
      apiKeyStatus.textContent = '请输入您的OpenAI API Key。';
      apiKeyStatus.style.color = 'black';
    }
  });
  
  // 加载简历内容
  console.log("尝试加载简历内容...");
  chrome.storage.local.get(['resumeContent'], (result) => {
    if (result.resumeContent) {
      console.log("找到保存的简历内容");
      resumeContent.value = result.resumeContent;
      resumeStatus.textContent = '已加载保存的简历内容。';
      resumeStatus.style.color = 'green';
    }
  });
  chrome.storage.local.get(['resumeData'], (result) => {
    if (result.resumeData) {
      console.log("找到保存的简历数据结构");
      // 如果存储的是JSON对象，转换为字符串显示
      if (typeof result.resumeData === 'object') {
        try {
          resumeContent.value = JSON.stringify(result.resumeData, null, 2);
          resumeStatus.textContent = '已加载保存的简历数据（JSON格式）。';
        } catch (e) {
          console.error("转换保存的简历数据时出错:", e);
          resumeContent.value = '';
          resumeStatus.textContent = '已保存的简历数据无法正确显示。';
        }
      } else if (typeof result.resumeData === 'string') {
        resumeContent.value = result.resumeData;
        resumeStatus.textContent = '已加载保存的简历内容。';
      }
      resumeStatus.style.color = 'green';
    }
  });
  
  // 加载自定义 Prompt
  console.log("尝试加载自定义Prompt...");
  chrome.storage.local.get(['customPromptPrefix'], (result) => {
    if (result.customPromptPrefix) {
      console.log("找到保存的自定义Prompt");
      customPrompt.value = result.customPromptPrefix;
      promptStatus.textContent = '已加载自定义Prompt。';
      promptStatus.style.color = 'green';
    } else {
      console.log("未找到自定义Prompt，使用默认值");
      customPrompt.value = DEFAULT_PROMPT;
      promptStatus.textContent = '使用默认Prompt。';
      promptStatus.style.color = 'blue';
    }
  });
}

// 保存API Key
function saveApiKey(e) {
  e.preventDefault();
  console.log("Saving API Key...");
  const apiKey = apiKeyInput.value.trim();

  if (!apiKey) {
    console.error("API Key is empty!");
    apiKeyStatus.textContent = 'API Key不能为空！';
    apiKeyStatus.style.color = 'red';
    return;
  }

  console.log("API Key validation passed, saving to storage with key 'openaiApiKey'...");
  chrome.storage.local.set({ openaiApiKey: apiKey }, () => {
    if (chrome.runtime.lastError) {
      console.error("Error saving API key:", chrome.runtime.lastError);
      apiKeyStatus.textContent = '保存失败！请重试。';
      apiKeyStatus.style.color = 'red';
    } else {
      console.log("API Key saved successfully to 'openaiApiKey'.");
      // 立即尝试读取来验证保存是否成功
      chrome.storage.local.get(['openaiApiKey'], (result) => {
        if (result.openaiApiKey === apiKey) {
          console.log("Verification successful: API Key correctly stored and retrieved.");
        } else {
          console.error("Verification failed: Stored API Key doesn't match!", {
            original: apiKey ? "****" + apiKey.slice(-4) : "empty",
            retrieved: result.openaiApiKey ? "****" + result.openaiApiKey.slice(-4) : "not found"
          });
        }
      });
      
      apiKeyStatus.textContent = 'API Key已保存！';
      apiKeyStatus.style.color = 'green';
      // 3秒后清除状态消息
      setTimeout(() => { apiKeyStatus.textContent = ''; }, 3000);
    }
  });
}

// 保存简历内容
function saveResumeContent(e) {
  e.preventDefault();
  const content = resumeContent.value.trim();

  if (!content) {
    resumeStatus.textContent = '简历内容不能为空！';
    resumeStatus.style.color = 'red';
    return;
  }

  // 设置状态为处理中
  resumeStatus.textContent = '正在处理简历内容...请稍候';
  resumeStatus.style.color = 'blue';

  // 尝试解析是否为JSON格式，如果是则直接使用该格式
  let contentType = 'text';
  try {
    JSON.parse(content);
    contentType = 'json';
  } catch (e) {
    // 不是JSON格式，按文本处理
    contentType = 'text';
  }

  // 显示额外提示信息
  if (contentType === 'text') {
    resumeStatus.textContent = '正在使用AI分析简历内容，这可能需要几秒钟...';
  } else {
    resumeStatus.textContent = '正在处理JSON格式简历数据...';
  }

  // 发送消息给后台处理
  chrome.runtime.sendMessage({
    type: 'STORE_RESUME_DATA',
    payload: {
      resumeContent: content,
      contentType: contentType
    }
  }, (response) => {
    if (chrome.runtime.lastError) {
      console.error("Error sending resume data:", chrome.runtime.lastError);
      resumeStatus.textContent = '发送简历内容失败！请重试。';
      resumeStatus.style.color = 'red';
    } else if (response && response.success) {
      resumeStatus.textContent = '✅ 简历内容已成功保存！';
      resumeStatus.style.color = 'green';
      resumeStatus.style.fontWeight = 'bold';
      
      // 立即从存储中读取处理后的JSON数据并更新输入框
      chrome.storage.local.get(['resumeData'], (result) => {
        if (result.resumeData) {
          try {
            // 将JSON对象转换为格式化的字符串显示
            const formattedJson = JSON.stringify(result.resumeData, null, 2);
            resumeContent.value = formattedJson;
            console.log("自动更新输入框为处理后的JSON数据");
          } catch (e) {
            console.error("格式化JSON数据时出错:", e);
          }
        }
      });
      
      setTimeout(() => { 
        resumeStatus.textContent = '简历内容已保存';
        resumeStatus.style.fontWeight = 'normal';
      }, 3000);
    } else {
      resumeStatus.textContent = `保存失败: ${response?.error || '未知错误'}`;
      resumeStatus.style.color = 'red';
    }
  });
}

// 保存自定义Prompt
function saveCustomPrompt(e) {
  e.preventDefault();
  const prompt = customPrompt.value.trim();
  
  // 如果为空，使用默认值
  const finalPrompt = prompt || DEFAULT_PROMPT;

  chrome.storage.local.set({ customPromptPrefix: finalPrompt }, () => {
    if (chrome.runtime.lastError) {
      console.error("Error saving custom prompt:", chrome.runtime.lastError);
      promptStatus.textContent = '保存自定义Prompt失败！请重试。';
      promptStatus.style.color = 'red';
    } else {
      console.log("Custom prompt saved successfully.");
      promptStatus.textContent = '自定义Prompt已保存！';
      promptStatus.style.color = 'green';
      setTimeout(() => { promptStatus.textContent = ''; }, 3000);
    }
  });
}

// 重置为默认Prompt
function resetToDefaultPrompt() {
  customPrompt.value = DEFAULT_PROMPT;
  
  chrome.storage.local.remove('customPromptPrefix', () => {
    if (chrome.runtime.lastError) {
      console.error("Error removing custom prompt:", chrome.runtime.lastError);
      promptStatus.textContent = '重置失败！请重试。';
      promptStatus.style.color = 'red';
    } else {
      promptStatus.textContent = '已重置为默认Prompt。';
      promptStatus.style.color = 'blue';
      setTimeout(() => { promptStatus.textContent = ''; }, 3000);
    }
  });
}

// 切换API Key显示/隐藏
function toggleApiKeyVisibility() {
  if (apiKeyInput.type === "password") {
    apiKeyInput.type = "text";
    showKeyButton.textContent = "隐藏";
  } else {
    apiKeyInput.type = "password";
    showKeyButton.textContent = "显示";
  }
}

// 事件监听器
document.addEventListener('DOMContentLoaded', () => {
  // 恢复保存的选项
  restoreOptions();
  
  // 添加消息监听器，接收处理状态更新
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'PROCESSING_UPDATE') {
      console.log('收到处理状态更新:', message);
      
      // 更新界面上的状态显示
      if (message.stage && message.message) {
        resumeStatus.textContent = message.message;
        
        // 根据不同阶段设置不同颜色
        switch(message.stage) {
          case 'PREPARING':
          case 'API_CALL':
          case 'PROCESSING':
          case 'SAVING':
            resumeStatus.style.color = 'blue';
            break;
          case 'COMPLETE':
            resumeStatus.style.color = 'green';
            resumeStatus.style.fontWeight = 'bold';
            setTimeout(() => {
              resumeStatus.style.fontWeight = 'normal';
            }, 3000);
            break;
          case 'ERROR':
            resumeStatus.style.color = 'red';
            break;
        }
      }
      
      return true;
    }
  });
  
  // 添加表单事件监听器
  apiKeyForm.addEventListener('submit', saveApiKey);
  resumeForm.addEventListener('submit', saveResumeContent);
  promptForm.addEventListener('submit', saveCustomPrompt);
  resetPromptButton.addEventListener('click', resetToDefaultPrompt);
  showKeyButton.addEventListener('click', toggleApiKeyVisibility);
}); 