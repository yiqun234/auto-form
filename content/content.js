console.log("Auto Form Filler: Content script loaded.");

// --- 侧边栏创建与管理 ---

// 创建并注入侧边栏
function createAndInjectSidebar() {
  // 检查是否已存在侧边栏，避免重复创建
  if (document.getElementById('resume-autofill-sidebar')) {
    return;
  }

  // 创建样式表
  const style = document.createElement('style');
  style.textContent = `
    #resume-autofill-sidebar {
      position: fixed;
      top: 0;
      right: 0;
      width: 320px;
      height: 100%;
      background: white;
      box-shadow: -2px 0 5px rgba(0,0,0,0.2);
      z-index: 9999;
      overflow-y: auto;
      transition: transform 0.3s ease;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
    }
    #resume-autofill-sidebar.hidden {
      transform: translateX(100%);
    }
    #resume-autofill-sidebar-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 10px 15px;
      background: #f5f5f5;
      border-bottom: 1px solid #ddd;
    }
    #resume-autofill-sidebar-content {
      padding: 15px;
    }
    #resume-autofill-toggle {
      position: fixed;
      right: 20px;
      top: 50%;
      transform: translateY(-50%);
      z-index: 10000;
      width: 40px;
      height: 40px;
      background: #2196F3;
      color: white;
      border: none;
      border-radius: 50%;
      cursor: pointer;
      box-shadow: 0 2px 5px rgba(0,0,0,0.2);
      display: flex;
      justify-content: center;
      align-items: center;
      font-size: 20px;
      outline: none;
    }
    .sidebar-section {
      margin-bottom: 20px;
    }
    .sidebar-section h3 {
      margin-top: 0;
      margin-bottom: 10px;
      font-size: 16px;
    }
    .sidebar-button {
      background: #2196F3;
      color: white;
      border: none;
      padding: 8px 15px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
      margin-top: 10px;
    }
    .sidebar-button:hover {
      background: #1976D2;
    }
    #status-message {
      margin: 10px 0;
      font-style: italic;
      font-size: 14px;
    }
    .file-input-label {
      display: inline-block;
      padding: 8px 15px;
      background: #e0e0e0;
      border-radius: 4px;
      cursor: pointer;
      margin-top: 5px;
    }
    #resume-file {
      display: none;
    }
  `;
  document.head.appendChild(style);

  // 创建侧边栏容器
  const sidebar = document.createElement('div');
  sidebar.id = 'resume-autofill-sidebar';
  sidebar.className = 'hidden'; // 默认隐藏

  // 创建侧边栏头部
  const header = document.createElement('div');
  header.id = 'resume-autofill-sidebar-header';
  header.innerHTML = `
    <h2 style="margin: 0; font-size: 18px;">智能简历填充</h2>
    <button id="resume-autofill-close" style="background: none; border: none; font-size: 20px; cursor: pointer;">×</button>
  `;
  sidebar.appendChild(header);

  // 创建侧边栏内容
  const content = document.createElement('div');
  content.id = 'resume-autofill-sidebar-content';
  content.innerHTML = `
    <div class="sidebar-section">
      <h3>选择简历文件</h3>
      <p style="font-size: 14px; margin-top: 0;">上传简历并使用 AI 自动填充表单</p>
      <label class="file-input-label">
        选择文件 (TXT/PDF/DOCX)
        <input type="file" id="resume-file" accept=".txt,.pdf,.docx">
      </label>
      <div id="status-message">请先上传简历</div>
    </div>
    
    <div class="sidebar-section">
      <button id="fill-form-button" class="sidebar-button">填充当前页面表单</button>
    </div>
    
    <div class="sidebar-section">
      <h3>帮助</h3>
      <p style="font-size: 13px; color: #666;">
        上传简历后，AI 将分析其内容并尝试填充页面上的表单字段。<br><br>
        填充后，您仍可以手动检查和调整填写的内容。
      </p>
    </div>
  `;
  sidebar.appendChild(content);

  // 创建切换按钮
  const toggleButton = document.createElement('button');
  toggleButton.id = 'resume-autofill-toggle';
  toggleButton.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M19 3H5C3.9 3 3 3.9 3 5V19C3 20.1 3.9 21 5 21H19C20.1 21 21 20.1 21 19V5C21 3.9 20.1 3 19 3ZM10 17L5 12L6.41 10.59L10 14.17L17.59 6.58L19 8L10 17Z" fill="white"/></svg>';
  toggleButton.setAttribute('title', '打开简历填充工具');

  // 添加到 DOM
  document.body.appendChild(sidebar);
  document.body.appendChild(toggleButton);

  // 添加侧边栏切换逻辑
  toggleButton.addEventListener('click', () => {
    sidebar.classList.toggle('hidden');
  });

  // 添加关闭按钮逻辑
  document.getElementById('resume-autofill-close').addEventListener('click', () => {
    sidebar.classList.add('hidden');
  });

  return {
    sidebar,
    toggleButton,
    statusMessage: document.getElementById('status-message'),
    resumeFileInput: document.getElementById('resume-file'),
    fillFormButton: document.getElementById('fill-form-button')
  };
}

// --- 简历文件处理 ---

// 处理文件上传，直接发送文件 ArrayBuffer 到后台
function setupFileUpload(resumeFileInput, statusMessage) {
  resumeFileInput.addEventListener('change', async (event) => {
    const file = event.target.files[0];
    if (!file) {
      statusMessage.textContent = '未选择文件。';
      return;
    }

    statusMessage.textContent = `正在处理 ${file.name}...`;
    
    try {
      // 直接读取文件为 ArrayBuffer
      const fileData = await readFileAsArrayBuffer(file);
      
      // 发送文件数据到 background script 进行处理
      statusMessage.textContent = '正在上传文件并请求 AI 分析...';
      chrome.runtime.sendMessage({ 
        type: 'PROCESS_RESUME_FILE', 
        payload: {
          fileName: file.name,
          fileData: fileData
        }
      }, (response) => {
        if (chrome.runtime.lastError) {
          statusMessage.textContent = `处理请求出错: ${chrome.runtime.lastError.message}`;
          console.error(chrome.runtime.lastError);
        } else if (response && response.success) {
          statusMessage.textContent = '简历处理成功！可以填充表单。'; // 更新消息
          console.log("Resume processed successfully!");
        } else {
          statusMessage.textContent = `处理失败: ${response?.error || '未知错误'}`;
          console.error("File processing failed:", response?.error);
        }
      });
      
    } catch (error) {
      statusMessage.textContent = `读取文件时出错: ${error.message}`;
      console.error("Error reading file:", error);
    }
  });
}

// 辅助函数：读取文件为 ArrayBuffer
function readFileAsArrayBuffer(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => resolve(e.target.result);
    reader.onerror = () => reject(new Error('读取文件失败'));
    reader.readAsArrayBuffer(file);
  });
}

// --- 表单字段识别 ---

function getVisibleFormFields() {
  const fields = [];
  // 寻找输入框、文本区域、选择框等表单元素
  const formElements = document.querySelectorAll('input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="reset"]), textarea, select');

  formElements.forEach((element, index) => {
    // 简单的可见性检查
    if (element.offsetWidth > 0 || element.offsetHeight > 0 || element.getClientRects().length > 0) {
      const fieldInfo = {
        fieldId: `field_${index}`, // 生成唯一 ID
        tagName: element.tagName.toLowerCase(),
        type: element.type?.toLowerCase() || null, // 输入类型 (text, email, tel 等)
        name: element.name || null,
        id: element.id || null,
        placeholder: element.placeholder || null,
        ariaLabel: element.getAttribute('aria-label') || null,
        // 尝试找到关联的标签文本
        label: findLabelForElement(element) || null,
      };
      fields.push(fieldInfo);

      // 添加临时属性用于之后找回元素
      element.setAttribute('data-autofill-id', fieldInfo.fieldId);
    }
  });

  console.log("Found form fields:", fields);
  return fields;
}

// 找到与表单元素相关联的标签
function findLabelForElement(element) {
  // 1. 检查是否有直接包裹元素的 <label>
  const parentLabel = element.closest('label');
  if (parentLabel) {
    // 克隆标签，移除输入元素本身，然后获取文本内容
    const labelClone = parentLabel.cloneNode(true);
    const inputInClone = labelClone.querySelector(`#${element.id}, [name="${element.name}"]`);
    if(inputInClone) inputInClone.remove();
    return labelClone.textContent.trim();
  }

  // 2. 检查 <label for="element.id">
  if (element.id) {
    const label = document.querySelector(`label[for="${element.id}"]`);
    if (label) {
      return label.textContent.trim();
    }
  }

  // 3. 检查使用 aria-labelledby
  const labelledBy = element.getAttribute('aria-labelledby');
  if (labelledBy) {
    const labelIds = labelledBy.split(' ');
    let labels = [];
    labelIds.forEach(id => {
      const labelElement = document.getElementById(id);
      if (labelElement) {
        labels.push(labelElement.textContent.trim());
      }
    });
    if (labels.length > 0) return labels.join(' ');
  }

  // 4. 检查相邻的兄弟节点中是否有描述性文本
  let sibling = element.previousElementSibling;
  if (sibling && sibling.tagName !== 'INPUT' && sibling.tagName !== 'SELECT' && sibling.tagName !== 'TEXTAREA') {
    const text = sibling.textContent.trim();
    if (text && text.length < 50) return text; // 避免获取太长的文本
  }

  // 5. 检查父元素的前一个兄弟节点
  const parentSibling = element.parentElement?.previousElementSibling;
  if (parentSibling) {
    const text = parentSibling.textContent.trim();
    if (text && text.length < 50) return text;
  }

  return null;
}

// --- 表单填充 ---

function fillFormField(fieldId, value) {
  const element = document.querySelector(`[data-autofill-id="${fieldId}"]`);
  if (element) {
    console.log(`填充字段 ${fieldId} (${element.name || element.id || element.type}) 值: ${value}`);
    // 模拟用户输入以更好地兼容各种框架
    element.focus();
    element.value = value;
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
    element.blur();
    return true;
  } else {
    console.warn(`未找到标记为 data-autofill-id="${fieldId}" 的元素。`);
    return false;
  }
}

// --- 表单填充按钮操作 ---

function setupFormFilling(fillFormButton, statusMessage) {
  fillFormButton.addEventListener('click', async () => {
    statusMessage.textContent = '正在分析页面表单...';
    
    // 清理之前可能存在的标记
    document.querySelectorAll('[data-autofill-id]').forEach(el => el.removeAttribute('data-autofill-id'));
    
    // 查找表单字段
    const fields = getVisibleFormFields();
    
    if (fields.length === 0) {
      statusMessage.textContent = '未在页面上找到可填充的表单字段。';
      return;
    }
    
    statusMessage.textContent = `找到 ${fields.length} 个表单字段，正在请求匹配...`;
    
    // 从存储中获取解析后的简历数据
    chrome.storage.local.get(['resumeData'], (result) => {
      if (chrome.runtime.lastError) {
        statusMessage.textContent = `读取简历数据失败: ${chrome.runtime.lastError.message}`;
        console.error(chrome.runtime.lastError);
        return;
      }
      
      if (!result.resumeData) {
        statusMessage.textContent = '未找到解析后的简历数据，请先上传并等待解析完成。';
        return;
      }
      
      // 将表单字段和简历数据发送到 background script 请求 OpenAI 匹配
      chrome.runtime.sendMessage({
        type: 'MATCH_FIELDS_WITH_RESUME',
        payload: {
          formFields: fields,
          resumeData: result.resumeData
        }
      }, (matchResponse) => {
        if (chrome.runtime.lastError) {
          statusMessage.textContent = `匹配请求失败: ${chrome.runtime.lastError.message}`;
          console.error(chrome.runtime.lastError);
        } else if (matchResponse && matchResponse.success && matchResponse.payload) {
          const fieldMapping = matchResponse.payload;
          statusMessage.textContent = '匹配成功，正在填充表单...';
          
          // 应用匹配结果填充表单
          let filledCount = 0;
          let failedCount = 0;
          
          for (const fieldId in fieldMapping) {
            if (Object.hasOwnProperty.call(fieldMapping, fieldId)) {
              const value = fieldMapping[fieldId];
              if (fillFormField(fieldId, value)) {
                filledCount++;
              } else {
                failedCount++;
              }
            }
          }
          
          // 清理临时属性
          document.querySelectorAll('[data-autofill-id]').forEach(el => el.removeAttribute('data-autofill-id'));
          
          if (filledCount > 0) {
            statusMessage.textContent = `已填充 ${filledCount} 个字段。${failedCount > 0 ? `有 ${failedCount} 个字段填充失败。`: ''}`;
          } else {
            statusMessage.textContent = '无法填充任何字段。';
          }
        } else {
          statusMessage.textContent = `匹配失败: ${matchResponse?.error || '未知错误'}`;
        }
      });
    });
  });
}

// --- 初始化并运行 ---

// 在页面加载完成后初始化
function initialize() {
  const { sidebar, statusMessage, resumeFileInput, fillFormButton } = createAndInjectSidebar();
  setupFileUpload(resumeFileInput, statusMessage);
  setupFormFilling(fillFormButton, statusMessage);
  
  console.log("Resume auto-fill sidebar initialized.");
}

// 当文档加载完成时运行初始化
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initialize);
} else {
  initialize();
}

// --- 消息监听 ---

// 保留用于接收来自后台脚本的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("Content script received message:", message.type);
  
  if (message.type === 'UPDATE_STATUS') {
    const statusMessage = document.getElementById('status-message');
    if (statusMessage) {
      statusMessage.textContent = message.payload;
    }
    sendResponse({ success: true });
  }
}); 