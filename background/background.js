// 添加点击图标打开新标签页的监听器
chrome.action.onClicked.addListener(() => {
  // 什么都不做，我们现在通过内容脚本注入侧边栏
  console.log("Action icon clicked - sidebar is injected by content script.");
});

// --- OpenAI API Interaction (用于文本分析) ---

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
      const jsonMatch = responseContent.match(/```json\n([\s\S]*?)\n```/) || 
                        responseContent.match(/```\n([\s\S]*?)\n```/) ||
                        responseContent.match(/\{[\s\S]*\}/);
      let jsonText = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : responseContent;
      if (jsonText.indexOf('{') > 0) jsonText = jsonText.substring(jsonText.indexOf('{'));
      if (jsonText.lastIndexOf('}') < jsonText.length - 1) jsonText = jsonText.substring(0, jsonText.lastIndexOf('}') + 1);
      const parsedData = JSON.parse(jsonText);
      return parsedData;
    } catch (parseError) {
      console.warn("OpenAI text response content is not valid JSON, returning as text:", parseError);
      return { rawText: data.choices[0].message.content, parseError: parseError.message };
    }

  } catch (error) {
    console.error("Error calling OpenAI text API:", error);
    throw error;
  }
}

async function getApiKey() {
    const result = await chrome.storage.local.get(['openaiApiKey']);
    if (!result.openaiApiKey) {
        throw new Error("API Key not set");
    }
    return result.openaiApiKey;
}

// --- 直接处理简历文件 (使用用户建议的格式) ---

async function processResumeFileWithId(fileData, fileName, apiKey) {
  console.log("Processing resume file directly with specific format:", fileName);
  let fileId = null; // 用于存储上传后的文件 ID

  try {
    // === 1. 上传文件到 OpenAI ===
    const fileBlob = new Blob([fileData]);
    const formData = new FormData();
    formData.append('file', fileBlob, fileName);
    formData.append('purpose', 'assistants'); 
    
    console.log("Uploading file to OpenAI...");
    const uploadResponse = await fetch('https://api.openai.com/v1/files', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}` },
      body: formData
    });
    
    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      console.error("File upload error response:", errorText);
      throw new Error(`文件上传失败: ${uploadResponse.status} ${errorText}`);
    }
    
    const uploadResult = await uploadResponse.json();
    fileId = uploadResult.id;
    console.log("File uploaded to OpenAI, ID:", fileId);

    // === 2. 调用 Chat Completions API (使用用户建议的格式) ===
    console.log(`Analyzing uploaded resume file (ID: ${fileId}) with OpenAI using specific format...`);
    const API_ENDPOINT = "https://api.openai.com/v1/chat/completions";
    const API_MODEL = "gpt-4.1";

    // 新的提示词，同时包含简历解析和表单匹配功能
    const analysisPromptText = `您是一个专业的简历分析AI助手。请分析附加的简历文件 (ID: ${fileId})，并将其内容转换为合适的JSON格式,注意json的内容应该与简历保持一致，不需要去翻译。

    分析要求：
    1. 请根据简历中实际包含的信息内容，自行判断并构建最适合的JSON结构
    2. 提取所有有价值的信息，包括但不限于：个人信息、联系方式、工作经历、教育背景、技能、项目经验、认证资格等
    3. 对于复杂的经历描述，请提取关键信息并保持原有语义
    4. 保持JSON结构的可读性和合理性，根据简历内容灵活设计JSON字段和层次
    5. 如果简历包含特定行业或职位的专业信息，请适当设计专门的字段存储这些内容
    6. 内容的语言应该与简历的语言保持一致，不需要去翻译简历中的内容
    
    同时，您也需要具备将提取的信息匹配到网页表单字段的能力：
    1. 能够分析表单字段的属性（如label、name、id等）来理解字段用途
    2. 能从您提取的JSON数据中找到最相关的信息来填充表单
    3. 需要根据表单字段类型适当格式化信息（如日期、电话、邮箱等）
    
    请确保您的响应包含两个主要部分：
    1. "resumeData": 包含您从简历中提取并自行构建的完整JSON数据
    2. "fieldMappingFunction": 描述如何将resumeData中的数据映射到表单字段的逻辑
    
    请将您的JSON响应放在\`\`\`json和\`\`\`标记之间，确保格式有效。`;

    const messages = [
      {
        role: 'user',
        content: [
          { 
            type: 'text', // 使用 text
            text: analysisPromptText 
          },
          { 
            type: 'file', // 使用 file
            file: {'file_id': fileId} 
          }
        ]
      }
    ];

    const chatResponse = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: API_MODEL,
        messages: messages, // 使用新的消息结构
        temperature: 0.5
      })
    });

    if (!chatResponse.ok) {
      const errorText = await chatResponse.text();
      console.error("Chat API error response (with file format):", errorText);
      // 尝试解析错误体
      let errorMessage = `AI处理失败: ${chatResponse.status}`;
      try {
          const errorJson = JSON.parse(errorText);
          errorMessage += `: ${errorJson.error?.message || errorText}`;
      } catch (e) { 
          errorMessage += `: ${errorText}`;
      }
      throw new Error(errorMessage);
    }
    
    const result = await chatResponse.json();
    console.log("OpenAI response for file analysis (with file format):", result);

    // === 3. 提取并解析 JSON 结果 ===
    try {
      const responseContent = result.choices[0].message.content;
      const jsonMatch = responseContent.match(/```json\n([\s\S]*?)\n```/) || 
                        responseContent.match(/```\n([\s\S]*?)\n```/) ||
                        responseContent.match(/\{[\s\S]*\}/);
      let jsonText = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : responseContent;
      if (jsonText.indexOf('{') > 0) jsonText = jsonText.substring(jsonText.indexOf('{'));
      if (jsonText.lastIndexOf('}') < jsonText.length - 1) jsonText = jsonText.substring(0, jsonText.lastIndexOf('}') + 1);
      const parsedData = JSON.parse(jsonText);
      return parsedData;
    } catch (parseError) {
      console.warn("Failed to parse JSON from file analysis response:", parseError);
      return { rawText: result.choices[0].message.content, parseError: parseError.message };
    }

  } catch (error) {
    console.error("Error in processResumeFileWithId:", error);
    // 如果文件上传成功但后续分析失败，可以考虑删除已上传的文件
    // if (fileId) { /* ... 调用 /v1/files/{file_id} DELETE ... */ }
    throw error;
  }
}

// --- Message Handling ---
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("Background script received message:", message.type);

  // 处理直接上传的文件 (使用新的 processResumeFileWithId 函数)
  if (message.type === 'PROCESS_RESUME_FILE') {
    const { fileName, fileData } = message.payload;
    const callId = `process-${Date.now()}`;
    console.time(callId);
    (async () => {
      try {
        const apiKey = await getApiKey();
        const parsedData = await processResumeFileWithId(fileData, fileName, apiKey);
        
        await chrome.storage.local.set({
          resumeData: parsedData,
          resumeFileName: fileName
        });
        console.log("Resume data stored from direct file processing:", parsedData);
        sendResponse({ success: true });

      } catch (error) {
        console.error("Error processing PROCESS_RESUME_FILE message:", error);
        sendResponse({ success: false, error: `文件处理失败: ${error.message}` });
      } finally {
          console.timeEnd(callId);
      }
    })();
    return true; // 异步响应
  } 
  
  // 这个暂时没啥用了，不做本地
  else if (message.type === 'PARSE_RESUME_TEXT') {
    const resumeText = message.payload;
    const callId = `parse-${Date.now()}`;
    console.time(callId);
    (async () => {
      try {
        const apiKey = await getApiKey();
        const prompt = `
          请分析以下简历文本并提取关键信息，以JSON格式返回。
          包括以下字段：
          - name (string): 姓名
          - email (string): 电子邮箱
          - phone (string): 电话号码
          - location (string): 所在地
          - summary (string): 个人简介或概述
          - skills (array of strings): 技能列表
          - experience (array of objects): 工作经验，每项包含 title, company, dates, description
          - education (array of objects): 教育经历，每项包含 degree, institution, dates
          - links (array of strings): 相关链接，如 LinkedIn, GitHub 等

          如果某些信息未找到，则省略相应字段。请确保返回的是有效的 JSON 格式。
          请把最终的JSON放在 \`\`\`json 和 \`\`\` 之间。

          Resume Text:
          ---
          ${resumeText}
          ---
          JSON Output:
        `;

        const parsedData = await callOpenAI(prompt, apiKey);

        await chrome.storage.local.set({
            resumeData: parsedData,
            originalResumeText: resumeText
        });
        console.log("Resume text data stored:", parsedData);
        sendResponse({ success: true });

      } catch (error) {
        console.error("Error processing PARSE_RESUME_TEXT message:", error);
        sendResponse({ success: false, error: `AI处理失败: ${error.message}` }); // 传递更详细的错误
      } finally {
          console.timeEnd(callId);
      }
    })();
    return true; // 异步响应
  } 
  
  // 处理表单字段匹配请求 (使用文本处理函数 callOpenAI)
  else if (message.type === 'MATCH_FIELDS_WITH_RESUME') {
    const { formFields, resumeData } = message.payload;
    const callId = `match-${Date.now()}`;
    console.time(callId);
    (async () => {
      try {
        const apiKey = await getApiKey();
        const prompt = `
        您是一个AI助手，负责根据提供的结构化简历数据和网页表单字段列表，生成自动填充表单所需的键值对。您的目标是理解每个表单字段的问题，并根据简历数据提供最准确、最相关的回答。您的响应应该是一个JSON对象，其中键是表单字段的 'fieldId' (来自 input formFields)，值是应该填充到该字段的字符串。

        重要规则：
        1. 分析每个表单字段的 'label', 'name', 'id', 'placeholder', 'type', 以及 **最重要的 'options' 列表** 来理解其用途和期望的输入格式。
        2. **从简历数据中寻找或推断答案:** 这是核心任务。对于每个字段，首先在 'resumeData' (这是一个结构化JSON对象，包含 personalInfo, workExperience, education, skills, projects 等信息) 中找到最相关的信息。您需要阅读简历数据中的文本描述，理解其含义，并据此生成答案。
        3. **处理选择项 (下拉菜单, 单选, 复选):** 如果表单字段有 'options' 数组，请找到简历数据或根据以下规则推断出的最匹配内容。然后从 'options' 列表中找到与该内容最接近的选项，返回该选项的 **'value' 属性**。如果该选项没有 'value' 属性，则返回其 **'text' 属性**。
        4. **处理特定问题 (正面回答):** 对于少数与简历内容不直接相关，但需要标准积极回答的问题（例如：接受背景调查/毒品检查？意愿搬迁/出差？是否残疾？），根据提供的 'options' 列表，选择一个表达积极意愿或标准态度的选项的 **'value' 或 'text'** 返回。**注意：此规则仅适用于特定类型的通用问题，不适用于询问具体技能或经验年限的问题。**
        5. **处理数值问题 (如工作年限):** 如果表单字段（通过label/name/placeholder识别，如“SCADA 经验年限？”）询问一个数量（如年限、人数等），请在 'resumeData' (特别是工作经历 \`workExperience\` 和项目 \`projects\`) 中找到相关的经验描述。**根据描述中的时间和内容，估算**相关的年限或数量。返回的答案必须是**纯数字的字符串**（例如，如果简历表明有 3 年相关经验，返回 "3"）。如果简历中完全没有相关信息，则省略该字段。
        6. **处理结构化地址字段:** 简历数据中的地址在 \`resumeData.personalInfo.address\` 下有 \`street\`, \`city\`, \`state\`, \`zipCode\`, \`country\` 字段。请将这些结构化地址组件与表单中对应的地址输入字段进行匹配，返回匹配到的字符串。
        7. **处理电话字段:** 简历数据中的电话在 \`resumeData.personalInfo.phone\`。请将这个值与表单中的电话字段进行匹配，返回匹配到的字符串。
        8. **处理文本区域（textarea）或通用文本输入框:** 如果字段是开放式文本输入（如个人简介、描述等），从简历数据中提取最相关的摘要或关键描述（summary, experience/project description）。如果问题非常开放或无法从简历中直接找到，根据问题和简历内容尝试生成一个简短、相关且积极的回答。不要留空。
        9. 如果从简历数据中找不到合适信息，且该字段不属于规则 4 (特定正面回答) 覆盖的类型，也无法通过规则 5, 6, 7, 8 找到或推断出答案，则省略该字段的键值对。
        10. 所有输出的值 **必须是字符串类型**。即使是数字、布尔值、日期、选择项的值/文本，也请转换为对应的字符串。
        11. 确保你返回的JSON对象只包含需要填充的字段，并且键是传入的 formFields 中的 \`fieldId\`，值是需要填充的字符串。

        请将您的JSON响应放在\`\`\`json和\`\`\`标记之间。**您的整个响应内容必须且只能是包含在 \`\`\`json...\`\`\` 标记中的 JSON 对象，请不要包含任何解释性、引导性或其他额外文本。**确保格式有效。

        Resume Data (structured JSON from file analysis):
        \`\`\`jsons
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

        const fieldMapping = await callOpenAI(prompt, apiKey);
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

  // --- Handler for opening URL in a new tab --- 
  if (message.type === 'OPEN_URL_NEW_TAB') {
    if (message.url && typeof message.url === 'string' && message.url.startsWith('http')) {
      chrome.tabs.create({ url: message.url, active: true }, (tab) => {
        if (chrome.runtime.lastError) {
          console.error(`Error opening new tab for URL ${message.url}:`, chrome.runtime.lastError.message);
          sendResponse({ success: false, error: chrome.runtime.lastError.message });
        } else {
          // --- Start Replacement --- 
          const newTabId = tab.id;
          // Get the original tab ID that sent the message
          const originalTabId = sender.tab?.id; 

          console.log(`Successfully opened new tab (ID: ${newTabId}) for URL: ${message.url}. Will simulate processing and close in 5s.`);
          // Respond immediately to content script confirming tab creation and providing ID
          sendResponse({ success: true, tabId: newTabId }); 

          if (originalTabId) {
              // Start simulation timer
              setTimeout(() => {
                  console.log(`[Simulate] Closing tab ${newTabId} after 5s timeout.`);
                  // Attempt to close the new tab
                  chrome.tabs.remove(newTabId, () => {
                      if (chrome.runtime.lastError) {
                          console.warn(`[Simulate] Error closing tab ${newTabId} (might have been closed already): ${chrome.runtime.lastError.message}`);
                      } else {
                          console.log(`[Simulate] Successfully closed tab ${newTabId}.`);
                      }
                      
                      // Regardless of close success/failure, notify the original tab
                      console.log(`[Simulate] Sending NEW_TAB_PROCESS_COMPLETE to original tab ${originalTabId}.`);
                      chrome.tabs.sendMessage(originalTabId, { type: 'NEW_TAB_PROCESS_COMPLETE', originalSenderTabId: originalTabId /* Optional: send back original ID for confirmation */ }, (response) => {
                           if (chrome.runtime.lastError) {
                               // Content script might have navigated away or been closed
                               console.warn(`[Simulate] Error sending completion message to tab ${originalTabId}: ${chrome.runtime.lastError.message}`);
                           } else {
                               console.log(`[Simulate] Completion message acknowledged by tab ${originalTabId}.`, response);
                           }
                      });
                  });
              }, 5000); // 5 second delay
          } else {
              console.warn("[Simulate] Could not get original tab ID to send completion message back.");
          }
          // --- End Replacement ---
        }
      });
      return true; // Indicates an asynchronous response will be sent
    } else {
      console.error("Received OPEN_URL_NEW_TAB message but URL was missing, invalid, or not HTTP(S).");
      sendResponse({ success: false, error: "Invalid or missing URL in message." });
    }
  }
  // --- End of open tab handler ---
});


// --- Installation/Update Logic ---
chrome.runtime.onInstalled.addListener(details => {
  if (details.reason === 'install') {
    console.log('Extension installed.');
    chrome.runtime.openOptionsPage();
  } else if (details.reason === 'update') {
    console.log('Extension updated.');
  }
});

console.log("Background service worker started (Attempting Direct File Processing Format)."); 