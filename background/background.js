// 添加点击图标打开新标签页的监听器
chrome.action.onClicked.addListener(() => {
  // 什么都不做，我们现在通过内容脚本注入侧边栏
  console.log("Action icon clicked - sidebar is injected by content script.");
});

// --- OpenAI API Interaction (用于文本分析) ---

// 默认的字段匹配 Prompt
const DEFAULT_MATCH_PROMPT = `
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

async function callOpenAI(prompt, apiKey) {
  const API_ENDPOINT = "https://api.openai.com/v1/chat/completions";
  const API_MODEL = "gpt-4o"; // 使用最新模型进行文本分析

  if (!apiKey) {
    throw new Error("OpenAI API Key not configured.");
  }

  console.log("Calling OpenAI for text analysis...");

  try {
    const response = await fetch(API_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: API_MODEL,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.5,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error("OpenAI Text API Error:", response.status, errorBody);
      // 尝试解析错误体以获取更具体的信息
      let errorMessage = `OpenAI text API request failed: ${response.status}`;
      try {
          const errorJson = JSON.parse(errorBody);
          errorMessage += `: ${errorJson.error?.message || errorBody}`;
      } catch (e) { 
          errorMessage += `: ${errorBody}`;
      }
      throw new Error(errorMessage);
    }

    const data = await response.json();
    console.log("OpenAI Text Response:", data);

    if (!data.choices || data.choices.length === 0 || !data.choices[0].message?.content) {
        console.error("Invalid response structure from OpenAI text API:", data);
        throw new Error("Invalid or empty response from OpenAI text API.");
    }

    // 尝试提取并解析 JSON
    try {
      const responseContent = data.choices[0].message.content;
      // 增强JSON提取逻辑
      const jsonMatch = responseContent.match(/```json\s*([\s\S]*?)\s*```/) || 
                        responseContent.match(/```\s*([\s\S]*?)\s*```/) ||
                        responseContent.match(/(\{[\s\S]*\})/); // 匹配被{}包裹的内容
      
      let jsonText = responseContent; // 默认使用完整响应
      if (jsonMatch) {
          jsonText = jsonMatch[1] || jsonMatch[0]; // 优先使用捕获组，否则使用整个匹配
          console.log("Extracted JSON block:", jsonText);
      } else {
          console.log("No JSON block found, attempting to parse the whole response.");
      }

      // 移除可能的非JSON前缀和后缀（更宽松）
      const firstBrace = jsonText.indexOf('{');
      const lastBrace = jsonText.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        jsonText = jsonText.substring(firstBrace, lastBrace + 1);
      }

      const parsedData = JSON.parse(jsonText);
      return parsedData;
    } catch (parseError) {
      console.error("Failed to parse JSON from OpenAI response content:", parseError);
      console.error("Original content:", data.choices[0].message.content); // Log original content on error
      // 返回原始文本以便调试
      return { rawText: data.choices[0].message.content, parseError: `Failed to parse JSON: ${parseError.message}` }; 
    }

  } catch (error) {
    console.error("Error calling OpenAI text API:", error);
    throw error;
  }
}

async function getApiKey() {
    try {
        console.log("Attempting to get API key from storage...");
        const result = await chrome.storage.local.get(['openaiApiKey']);
        console.log("API key retrieval result:", result);
        
        if (chrome.runtime.lastError) {
            console.error("Storage error:", chrome.runtime.lastError);
            throw new Error(`Storage error: ${chrome.runtime.lastError.message}`);
        }
        
        if (!result.openaiApiKey) {
            console.error("API Key not found in storage with key 'openaiApiKey'");
            throw new Error("API Key not set in extension options.");
        }
        
        console.log("API key retrieved successfully (masked):", "****" + result.openaiApiKey.slice(-4));
        return result.openaiApiKey;
    } catch (error) {
        console.error("Error in getApiKey:", error);
        throw error;
    }
}

// 发送处理更新的辅助函数，处理不同上下文（选项页面或内容脚本）
function sendProcessingUpdate({ sender, stage, message }) {
  const updateMessage = {
    type: 'PROCESSING_UPDATE',
    stage,
    message
  };
  
  // 如果是从内容脚本发来的请求，发送回该标签页
  if (sender && sender.tab?.id) {
    chrome.tabs.sendMessage(sender.tab.id, updateMessage);
  }
  
  // 将消息广播给可能打开的选项页面
  chrome.runtime.sendMessage(updateMessage)
    .catch(err => {
      // 如果没有接收者，会出现错误，可以忽略
      console.log("没有选项页面接收更新或消息发送出错");
    });
}

// --- 移除直接处理简历文件的函数 ---
// async function processResumeFileWithId(fileData, fileName, apiKey) { ... } 

// --- Message Handling ---

// 移除全局 workdayTabMap
// const workdayTabMap = {}; 

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("Background script received message:", message.type, "from", sender.tab?.id || "popup/options");

  // --- 新处理器：存储简历数据 ---
  if (message.type === 'STORE_RESUME_DATA') {
    const { resumeContent, contentType } = message.payload; // 'text' or 'json'
    const callId = `store-resume-${Date.now()}`;
    console.time(callId);
    (async () => {
      try {
        let resumeDataJson;
        if (contentType === 'json') {
          console.log("Received resume data as JSON string, parsing...");
          try {
            resumeDataJson = JSON.parse(resumeContent);
          } catch (e) {
            throw new Error("Provided content is not valid JSON.");
          }
        } else if (contentType === 'text') {
          console.log("Received resume data as text, parsing with OpenAI...");
          
          // 发送进度更新 - 准备调用API
          sendProcessingUpdate({
            sender,
            stage: 'PREPARING',
            message: '正在初始化API请求...'
          });
          
          const apiKey = await getApiKey();
          
          // 发送进度更新 - API调用中
          sendProcessingUpdate({
            sender,
            stage: 'API_CALL',
            message: '正在使用OpenAI分析简历内容...'
          });
          
          // 使用 OpenAI 解析简历文本为 JSON
          const parsePrompt = `
            请分析以下简历文本并提取关键信息，以JSON格式返回。
            请根据简历中实际包含的信息内容，自行判断并构建最适合的JSON结构。
            提取所有有价值的信息，包括但不限于：个人信息、联系方式、工作经历、教育背景、技能、项目经验、认证资格等。
            对于复杂的经历描述，请提取关键信息并保持原有语义。
            保持JSON结构的可读性和合理性，根据简历内容灵活设计JSON字段和层次。
            内容的语言应该与简历的语言保持一致，不需要去翻译简历中的内容。
            如果某些信息未找到，则省略相应字段。
            请确保返回的是有效的 JSON 格式，并将您的JSON响应放在\`\`\`json和\`\`\`标记之间。

            Resume Text:
            ---
            ${resumeContent}
            ---
            JSON Output:
          `;
          resumeDataJson = await callOpenAI(parsePrompt, apiKey);
          
          // 发送进度更新 - 处理响应
          sendProcessingUpdate({
            sender,
            stage: 'PROCESSING',
            message: '已收到AI响应，正在处理数据...'
          });
          
          // 检查解析是否成功，如果返回的是带错误的原始文本，则抛出错误
          if (resumeDataJson.parseError) {
              throw new Error(`Failed to parse resume text with OpenAI: ${resumeDataJson.parseError}`);
          }
          console.log("Resume text parsed by OpenAI:", resumeDataJson);
        } else {
          throw new Error("Invalid contentType specified. Must be 'text' or 'json'.");
        }

        // 发送进度更新 - 保存数据
        sendProcessingUpdate({
          sender,
          stage: 'SAVING',
          message: '正在保存处理后的简历数据...'
        });
        
        // 存储解析后的 JSON 数据
        await chrome.storage.local.set({ resumeData: resumeDataJson });
        console.log("Processed resume data stored successfully.");
        
        // 发送进度更新 - 完成
        sendProcessingUpdate({
          sender, 
          stage: 'COMPLETE',
          message: '简历数据处理完成！'
        });
        
        sendResponse({ success: true });

      } catch (error) {
        console.error("Error processing STORE_RESUME_DATA message:", error);
        
        // 发送进度更新 - 错误
        sendProcessingUpdate({
          sender,
          stage: 'ERROR',
          message: `处理出错: ${error.message}`
        });
        
        sendResponse({ success: false, error: `存储简历数据失败: ${error.message}` });
      } finally {
        console.timeEnd(callId);
      }
    })();
    return true; // 异步响应
  }

  // --- 移除旧的 PROCESS_RESUME_FILE 处理器 ---
  // else if (message.type === 'PROCESS_RESUME_FILE') { ... }

  // --- 移除旧的 PARSE_RESUME_TEXT 处理器 (功能合并到 STORE_RESUME_DATA) ---
  // else if (message.type === 'PARSE_RESUME_TEXT') { ... } 

  // --- 修改字段匹配处理器 ---
  else if (message.type === 'MATCH_FIELDS_WITH_RESUME') {
    const { formFields } = message.payload; // 不再需要传递 resumeData
    const callId = `match-${Date.now()}`;
    console.time(callId);
    (async () => {
      try {
        // 1. 获取 API Key
        const apiKey = await getApiKey();
        
        // 2. 获取存储的简历数据 (JSON 格式) 和 自定义 Prompt 前缀
        const storageResult = await chrome.storage.local.get(['resumeData', 'customPromptPrefix']);
        const resumeData = storageResult.resumeData;
        // 如果没有自定义前缀，则使用默认的 Prompt
        const customPromptPrefix = storageResult.customPromptPrefix || DEFAULT_MATCH_PROMPT; 

        if (!resumeData) {
          throw new Error("未找到存储的简历数据。请先提供简历内容。");
        }
        
        console.log("使用的 Prompt 前缀 (或默认 Prompt):", customPromptPrefix ? customPromptPrefix.substring(0, 100) + '...' : "(无)");
        console.log("使用存储的简历数据进行匹配:", typeof resumeData === 'object' ? Object.keys(resumeData) : "(非对象)");
        
        // 3. 构建最终 Prompt (现在 customPromptPrefix 要么是用户设置的，要么是默认的完整 Prompt)
        const prompt = `
        ${customPromptPrefix} 

        请将您的JSON响应放在\`\`\`json和\`\`\`标记之间。**您的整个响应内容必须且只能是包含在 \`\`\`json...\`\`\` 标记中的 JSON 对象，请不要包含任何解释性、引导性或其他额外文本。**确保格式有效。


        Resume Data (structured JSON):
        \`\`\`json
        ${JSON.stringify(resumeData, null, 2)}
        \`\`\`

        Form Fields:
        \`\`\`json
        ${JSON.stringify(formFields, null, 2)}
        \`\`\`

        Required Output Format (JSON object mapping fieldId to value, values MUST be strings):
        {
          "fieldId_1": "Value from resume",
          "fieldId_3": "7" 
          // Only include fields for which a match was found
        }

        Matching JSON Output:
        `;

        // 4. 调用 OpenAI 进行匹配
        const fieldMapping = await callOpenAI(prompt, apiKey);
        // 检查匹配是否成功，如果返回的是带错误的原始文本，则抛出错误
        if (fieldMapping.parseError) {
            throw new Error(`Failed to get field mapping from OpenAI: ${fieldMapping.parseError}`);
        }
        console.log("Field mapping received:", fieldMapping);
        sendResponse({ success: true, payload: fieldMapping });

      } catch (error) {
        console.error("Error processing MATCH_FIELDS_WITH_RESUME message:", error);
        sendResponse({ success: false, error: `匹配字段失败: ${error.message}` });
      } finally {
          console.timeEnd(callId);
      }
    })();
    return true; // 异步响应
  }

  // --- 处理打开新标签页请求 (保持不变或根据需要调整) ---
  else if (message.type === 'OPEN_URL_NEW_TAB') {
    // ... (保持之前的逻辑，用于Workday等场景)
    // 注意：这里不再需要 workdayTabMap
     if (message.url && typeof message.url === 'string' && message.url.startsWith('http')) {
      chrome.tabs.create({ url: message.url, active: true }, (tab) => {
        if (chrome.runtime.lastError) {
          console.error(`Error opening new tab for URL ${message.url}:`, chrome.runtime.lastError.message);
          sendResponse({ success: false, error: chrome.runtime.lastError.message });
        } else {
          const newTabId = tab.id;
          const originalTabId = sender.tab?.id; 

          console.log(`Opened new tab (ID: ${newTabId}) for URL: ${message.url}. Original Tab ID: ${originalTabId}`);
          
          // 不再存储映射，但仍然可以发送消息确认
          sendResponse({ success: true, tabId: newTabId }); 

          // 如果需要，仍然可以添加模拟处理或后续逻辑，
          // 但现在没有简单的方法将新标签页与原始标签页关联起来
          // 可以考虑将 originalTabId 传递给新标签页的内容脚本
          // chrome.tabs.sendMessage(newTabId, { type: 'INITIALIZE_WITH_ORIGIN', originTabId: originalTabId });

        }
      });
      return true; 
    } else {
      console.error("Received OPEN_URL_NEW_TAB message but URL was missing, invalid, or not HTTP(S).");
      sendResponse({ success: false, error: "Invalid or missing URL in message." });
    }
  }
  // --- End of open tab handler ---

  // --- 移除 Workday 相关和之前添加的消息处理器 ---
  // else if (message.type === 'WORKDAY_PROCESS_COMPLETE') { ... }
  // else if (message.type === 'CLOSE_TAB') { ... }
  // else if (message.type === 'SEND_PROCESSING_UPDATE') { ... }

  // --- 添加处理打开选项页面的请求 ---
  else if (message.type === 'OPEN_OPTIONS_PAGE') {
    chrome.runtime.openOptionsPage();
    sendResponse({success: true});
    return false; // 同步响应
  }

});


// --- Installation/Update Logic ---
chrome.runtime.onInstalled.addListener(details => {
  if (details.reason === 'install') {
    console.log('Extension installed.');
    // 保存默认的 Prompt 前缀
    chrome.storage.local.set({ customPromptPrefix: DEFAULT_MATCH_PROMPT }, () => {
      console.log('Default prompt prefix saved to storage.');
      // 打开选项页面让用户设置 API Key (现在 Prompt 已有默认值)
      chrome.runtime.openOptionsPage(); 
    });
  } else if (details.reason === 'update') {
    console.log('Extension updated.');
    // 可以在这里添加检查，如果 customPromptPrefix 不存在则设置默认值
    chrome.storage.local.get('customPromptPrefix', (result) => {
      if (!result.customPromptPrefix) {
        chrome.storage.local.set({ customPromptPrefix: DEFAULT_MATCH_PROMPT }, () => {
          console.log('Set default prompt prefix on update as it was missing.');
        });
      }
    });
  }
});

console.log("Background service worker started (External Resume & Custom Prompt Mode)."); 