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
        You are an AI assistant helping to fill a web form based on a parsed resume.
        Below is the structured resume data (in JSON format) and a list of form fields identified on a webpage.
        Your task is to determine the best value from the resume data to fill into each form field.

        Rules:
        1. Analyze the 'label', 'name', 'id', 'placeholder', and 'type' of each form field to understand its purpose.
        2. Find the most relevant piece of information from the 'resumeData' for each field.
        3. Format your response as a JSON object where keys are the 'fieldId' from the input 'formFields' list, and values are the strings to be filled into those fields.
        4. If no suitable information is found in the resume for a specific field, OMIT that field's key from your response JSON. Do not include keys with null or empty values.
        5. For complex fields (like work experience or education), try to provide a concise summary or the most relevant part if the field is a simple text input. If the form has dedicated sections/multiple fields for these, adapt accordingly (though this prompt assumes single fields for simplicity first).
        6. Pay attention to field types (e.g., 'email', 'tel', 'number', 'date'). Format the output accordingly if possible, but prioritize providing the correct text information.
        7. For some questions that are not included in your resume, you need to combine your resume and your own thinking to complete the answers
        8. Please return the answer if the type in the JSON object is 'text' or 'textarea'. It cannot be empty. You can make up your own answer.

        Resume Data:
        \`\`\`json
        ${JSON.stringify(resumeData, null, 2)}
        \`\`\`

        Form Fields:
        \`\`\`json
        ${JSON.stringify(formFields, null, 2)}
        \`\`\`

        Required Output Format (JSON object mapping fieldId to value):
        {
          "fieldId_1": "Value from resume",
          "fieldId_3": "Another value"
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