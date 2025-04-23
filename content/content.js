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
      <button id="batch-apply-button" class="sidebar-button" style="margin-top: 10px; background-color: #4CAF50;">批量自动投递简历</button>
    </div>
    
    <div class="sidebar-section" id="batch-apply-settings" style="display: none;">
      <h3>批量投递设置</h3>
      <div style="margin-bottom: 10px;">
        <label style="display: block; margin-bottom: 5px;">间隔时间(秒):</label>
        <input type="number" id="apply-interval" min="2" max="30" value="5" style="width: 100%; padding: 5px;">
      </div>
      <button id="start-batch-apply" class="sidebar-button" style="background-color: #4CAF50;">开始批量投递</button>
      <button id="stop-batch-apply" class="sidebar-button" style="background-color: #f44336; display: none; margin-left: 10px;">停止投递</button>
      <div id="batch-status" style="margin-top: 10px; font-size: 14px;"></div>
    </div>
    
    <div class="sidebar-section">
      <h3>帮助</h3>
      <p style="font-size: 13px; color: #666;">
        上传简历后，AI 将分析其内容并尝试填充页面上的表单字段。<br><br>
        填充后，您仍可以手动检查和调整填写的内容。<br><br>
        批量投递功能可自动点击"快速申请"或"Easy Apply"按钮并填充表单。
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
      
      // 保存最后上传的简历信息到storage
      chrome.storage.local.set({
        'lastUploadedResume': {
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type,
          uploadTime: new Date().toISOString()
        }
      });
      
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

// --- 求职网站快速申请按钮处理 ---

// 添加MutationObserver来监视DOM变化，以便在右侧详情页加载后能够及时发现按钮
function setupDOMChangeObserver() {
  console.log("启动DOM变化观察器...");
  
  // 创建观察器实例
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      // 检查右侧详情区域是否已加载
      if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
        // 检查是否添加了包含申请按钮的节点
        const rightPanel = document.querySelector('.job-detail-panel, .job-description-panel');
        
        if (rightPanel) {
          const applyButton = rightPanel.querySelector('button:not([data-quick-apply-monitored]), a:not([data-quick-apply-monitored])');
          
          if (applyButton) {
            const buttonText = applyButton.textContent?.trim().toLowerCase() || '';
            
            // 检查是否是申请按钮
            if (buttonText.includes('快速申请') || 
                buttonText.includes('立即申请') || 
                buttonText.includes('申请职位') || 
                buttonText.includes('投递简历') ||
                buttonText.includes('申请') && buttonText.length < 10) {
              
              console.log("DOM变化检测到申请按钮:", applyButton);
              applyButton.setAttribute('data-quick-apply-monitored', 'true');
              applyButton.addEventListener('click', handleRightApplyButtonClick);
              
              // 如果之前点击了左侧按钮，自动点击右侧按钮
              chrome.storage.local.get(['leftQuickApplyClicked', 'resumeData'], (result) => {
                if (result.leftQuickApplyClicked && result.resumeData) {
                  console.log("检测到左侧按钮曾被点击，自动点击右侧申请按钮");
                  // 清除标记，避免重复点击
                  chrome.storage.local.set({ 'leftQuickApplyClicked': false });
                  // 延迟一点点再点击，让页面完全加载
                  setTimeout(() => {
                    applyButton.click();
                  }, 500);
                }
              });
            }
          }
        }
      }
    });
  });
  
  // 配置观察选项
  const config = { 
    childList: true, 
    subtree: true 
  };
  
  // 开始观察整个文档
  observer.observe(document.body, config);
  
  // 5分钟后断开观察器，避免长时间消耗资源
  setTimeout(() => {
    observer.disconnect();
    console.log("已停止DOM变化观察");
  }, 5 * 60 * 1000);
}

// 检测并处理求职网站上的快速申请按钮
function setupJobsQuickApplyHandlers() {
  console.log("设置求职网站快速申请按钮处理器...");
  
  // 启动DOM变化观察器
  setupDOMChangeObserver();
  
  // 检测图片中所示网站的特定结构
  function checkSpecificWebsiteStructure() {
    try {
      // 直接通过ID找到LinkedIn的申请按钮
      const linkedInApplyButton = document.getElementById('jobs-apply-button-id');
      if (linkedInApplyButton && !linkedInApplyButton.hasAttribute('data-quick-apply-monitored')) {
        console.log("找到LinkedIn申请按钮(ID匹配):", linkedInApplyButton);
        linkedInApplyButton.setAttribute('data-quick-apply-monitored', 'true');
        
        // 不自动点击，只添加监听器以捕获用户点击
        linkedInApplyButton.addEventListener('click', handleRightApplyButtonClick);
      }
      
      // 检查左侧职位列表中的快速申请按钮
      document.querySelectorAll('button, a').forEach(el => {
        if (el.hasAttribute('data-quick-apply-monitored')) return;
        
        const text = el.textContent?.trim() || '';
        const buttonId = el.id?.toLowerCase() || '';
        
        if (text === '快速申请' || 
            text.toLowerCase() === 'easy apply' || 
            text.toLowerCase() === 'apply now' ||
            text === 'Go' || // 添加对"Go"文本的支持
            buttonId.includes('jobs-apply-button')) { // 直接匹配ID
          console.log("找到申请按钮:", el, text);
          el.setAttribute('data-quick-apply-monitored', 'true');
          el.addEventListener('click', handleLeftQuickApplyClick);
        }
      });
    } catch (error) {
      console.log("检查特定网站结构时出错:", error);
    }
  }
  
  // 立即检查一次特定网站结构
  checkSpecificWebsiteStructure();
  
  // 定期检查页面上的快速申请按钮
  const checkInterval = setInterval(() => {
    // 再次检查特定网站结构
    checkSpecificWebsiteStructure();
    
    // 检查左侧快速申请按钮 - 扩大搜索范围
    const leftQuickApplyButtons = document.querySelectorAll('button:not([data-quick-apply-monitored]), a:not([data-quick-apply-monitored])');
    
    leftQuickApplyButtons.forEach(button => {
      // 标记按钮已被监控
      button.setAttribute('data-quick-apply-monitored', 'true');
      
      // 检查按钮文本是否包含"快速申请"或其他常见文本
      const buttonText = button.textContent?.trim().toLowerCase() || '';
      const buttonClass = button.className?.toLowerCase() || '';
      const buttonId = button.id?.toLowerCase() || '';
      
      // 更广泛的申请按钮文本匹配，支持中英文
      if (buttonText.includes('快速申请') || 
          buttonText.includes('立即申请') || 
          buttonText.includes('申请职位') || 
          buttonText.includes('投递简历') || 
          buttonText.includes('申请') && buttonText.length < 10 ||
          buttonText.includes('easy apply') || 
          buttonText.includes('apply now') ||
          buttonText.includes('apply') && buttonText.length < 15 ||
          buttonText === 'go' ||  // 添加对LinkedIn "Go" 按钮的支持
          buttonClass.includes('apply') ||
          buttonClass.includes('jobs-apply-button') ||
          buttonId.includes('apply') ||
          buttonId.includes('jobs-apply-button')) {
        
        console.log("找到左侧申请按钮:", button, buttonText);
        
        // 添加点击事件监听器
        button.addEventListener('click', handleLeftQuickApplyClick);
      }
    });
    
    // 检查右侧详情页面中的申请按钮 - 扩大搜索范围
    const rightApplyButtonSelectors = [
      '#jobs-apply-button-id',
      'button.jobs-apply-button',
      'a.jobs-apply-button',
      'button:not([data-quick-apply-monitored])[id*="apply"]',
      'a:not([data-quick-apply-monitored])[id*="apply"]',
      'button:not([data-quick-apply-monitored])[class*="apply"]',
      'a:not([data-quick-apply-monitored])[class*="apply"]'
    ];
    
    const rightApplyButtonsQuery = rightApplyButtonSelectors.join(', ');
    const rightApplyButtons = document.querySelectorAll(rightApplyButtonsQuery);
    
    rightApplyButtons.forEach(button => {
      if (!button.hasAttribute('data-quick-apply-monitored')) {
        const buttonText = button.textContent?.trim().toLowerCase() || '';
        
        // 更广泛的中英文招聘网站申请按钮文本匹配
        if (buttonText.includes('快速申请') || 
            buttonText.includes('立即申请') || 
            buttonText.includes('申请职位') || 
            buttonText.includes('投递简历') ||
            buttonText.includes('申请') && buttonText.length < 10 ||
            buttonText.includes('easy apply') || 
            buttonText.includes('apply now') ||
            buttonText.includes('apply') && buttonText.length < 15 ||
            buttonText === 'go' ||
            button.id === 'jobs-apply-button-id') {
          
          console.log("找到右侧申请按钮:", button, buttonText);
          
          // 标记按钮已被监控
          button.setAttribute('data-quick-apply-monitored', 'true');
          
          // 添加点击事件监听器
          button.addEventListener('click', handleRightApplyButtonClick);
        }
      }
    });
  }, 1000); // 每秒检查一次
  
  // 5分钟后清除间隔，避免长时间消耗资源
  setTimeout(() => {
    clearInterval(checkInterval);
    console.log("已停止快速申请按钮监控");
  }, 5 * 60 * 1000);
}

// 处理左侧快速申请按钮点击
function handleLeftQuickApplyClick(event) {
  console.log("左侧申请按钮被点击");
  
  // 保存事件，不阻止默认行为，让页面正常加载右侧详情
  chrome.storage.local.set({ 'leftQuickApplyClicked': true });
  
  // 设置延时检查右侧申请按钮
  setTimeout(() => {
    // 扩大右侧申请按钮搜索范围
    const rightApplyButtonSelectors = [
      '#jobs-apply-button-id',
      'button.jobs-apply-button',
      'a.jobs-apply-button',
      'button[id*="apply"]',
      'a[id*="apply"]',
      'button[class*="apply"]',
      'a[class*="apply"]'
    ];
    
    const rightApplyButtonsQuery = rightApplyButtonSelectors.join(', ');
    const rightApplyButtons = document.querySelectorAll(rightApplyButtonsQuery);
    
    let rightApplyButton = null;
    
    // 查找匹配的按钮
    for (const button of rightApplyButtons) {
      const buttonText = button.textContent?.trim().toLowerCase() || '';
      
      if (buttonText.includes('快速申请') || 
          buttonText.includes('立即申请') || 
          buttonText.includes('申请职位') || 
          buttonText.includes('投递简历') ||
          buttonText.includes('申请') && buttonText.length < 10 ||
          buttonText.includes('easy apply') || 
          buttonText.includes('apply now') ||
          buttonText.includes('apply') && buttonText.length < 15 ||
          buttonText === 'go' ||
          button.id === 'jobs-apply-button-id') {
        
        rightApplyButton = button;
        break;
      }
    }
    
    if (rightApplyButton) {
      console.log("找到右侧申请按钮，准备自动点击", rightApplyButton);
      
      // 标记按钮已被监控
      rightApplyButton.setAttribute('data-quick-apply-monitored', 'true');
      
      // 如果有简历数据，可以自动点击右侧按钮
      chrome.storage.local.get(['resumeData'], (result) => {
        if (result.resumeData) {
          console.log("有简历数据，自动点击右侧申请按钮");
          rightApplyButton.click();
        } else {
          console.log("无简历数据，不自动点击右侧申请按钮");
        }
      });
    }
  }, 2000); // 2秒后检查，给页面加载时间
}

// 处理右侧申请按钮点击
function handleRightApplyButtonClick(event) {
  console.log("右侧申请按钮被点击");
  
  // 不阻止默认行为，让表单正常打开
  // 设置延时检测表单并自动填充
  setTimeout(() => {
    // 检查打开的表单并填充
    const formFields = getVisibleFormFields();
    
    if (formFields.length > 0) {
      console.log("检测到申请表单，准备自动填充", formFields.length, "个字段");
      
      // 从存储中获取解析后的简历数据
      chrome.storage.local.get(['resumeData'], (result) => {
        if (result.resumeData) {
          console.log("有简历数据，自动填充表单");
          
          // 发送匹配请求
          chrome.runtime.sendMessage({
            type: 'MATCH_FIELDS_WITH_RESUME',
            payload: {
              formFields: formFields,
              resumeData: result.resumeData
            }
          }, (matchResponse) => {
            if (matchResponse && matchResponse.success && matchResponse.payload) {
              const fieldMapping = matchResponse.payload;
              
              // 应用匹配结果填充表单
              let filledCount = 0;
              
              for (const fieldId in fieldMapping) {
                if (Object.hasOwnProperty.call(fieldMapping, fieldId)) {
                  const value = fieldMapping[fieldId];
                  if (fillFormField(fieldId, value)) {
                    filledCount++;
                  }
                }
              }
              
              console.log(`自动填充了 ${filledCount} 个字段`);
              
              // 清理临时属性
              document.querySelectorAll('[data-autofill-id]').forEach(el => el.removeAttribute('data-autofill-id'));
            }
          });
        }
      });
    } else {
      console.log("未检测到申请表单字段");
    }
  }, 1500); // 1.5秒后检查，给表单打开时间
}

// --- 批量投递功能 ---
function setupBatchApplyFeature() {
  console.log("设置批量投递功能...");

  const batchApplyButton = document.getElementById('batch-apply-button');
  const batchApplySettings = document.getElementById('batch-apply-settings');
  const startBatchApplyButton = document.getElementById('start-batch-apply');
  const stopBatchApplyButton = document.getElementById('stop-batch-apply');
  const batchStatusDiv = document.getElementById('batch-status');
  const applyInterval = document.getElementById('apply-interval');

  let isBatchApplying = false;

  if (!batchApplyButton || !stopBatchApplyButton) {
    console.error("批量投递相关按钮未找到");
    return;
  }

  // **查找职位列表项函数 (支持滚动)**
  async function findAllEasyApplyItems() {
    const items = [];
    const seenElements = new Set(); 
    let scrollContainer = null;
    const firstListItem = document.querySelector('li.scaffold-layout__list-item, div.job-card-container');
    
    if (firstListItem) {
      let parent = firstListItem.parentElement;
      while (parent && parent !== document.body) {
        if (parent.scrollHeight > parent.clientHeight && 
            (window.getComputedStyle(parent).overflowY === 'scroll' || window.getComputedStyle(parent).overflowY === 'auto')) {
          scrollContainer = parent;
          console.log("通过向上查找找到可滚动容器:", scrollContainer);
          break;
        }
        parent = parent.parentElement;
      }
    }
    
    if (!scrollContainer) {
      console.log("向上查找滚动容器失败，尝试备用选择器...");
      const scrollContainerSelectors = ['.jobs-search-results-list__list', '.jobs-search-results-list', '.scaffold-layout__list-container', 'ul.scaffold-layout__list', '[role="list"]'];
      for (const selector of scrollContainerSelectors) {
          const element = document.querySelector(selector);
          if (element && element.scrollHeight > element.clientHeight) {
              scrollContainer = element;
              console.log("找到备用可滚动容器:", selector, scrollContainer);
              break;
          }
      }
    }

    if (!scrollContainer) {
        console.warn("未找到明确的可滚动职位列表容器，将仅查找当前视口。");
        findAndAddItemsInScope(document.body, seenElements, items);
        return items; 
    }

    console.log("开始滚动查找快速申请职位...");
    let lastScrollTop = -1;
    let scrollAttempts = 0;
    const MAX_SCROLL_ATTEMPTS = 30;

    while (scrollAttempts < MAX_SCROLL_ATTEMPTS) {
      // **检查是否被停止** (滚动前)
      if (!isBatchApplying) { 
          console.log("批量投递在滚动查找中被停止。"); 
          // **传递包含数量的消息**
          finishBatchApply(`批量投递已停止。本次共处理了 ${processedCount} 个职位。`); 
          return []; // 返回空数组表示停止
      }
      console.log(`滚动查找: 第 ${scrollAttempts + 1} 次`);
      lastScrollTop = scrollContainer.scrollTop;
      findAndAddItemsInScope(scrollContainer, seenElements, items);
      scrollContainer.scrollTop += scrollContainer.clientHeight * 0.85;
      await new Promise(resolve => setTimeout(resolve, 750));
      if (scrollContainer.scrollTop <= lastScrollTop) {
        console.log("可能已到达滚动底部。");
        await new Promise(resolve => setTimeout(resolve, 500));
        findAndAddItemsInScope(scrollContainer, seenElements, items);
        break;
      }
      scrollAttempts++;
    }
    if (scrollAttempts >= MAX_SCROLL_ATTEMPTS) { console.warn("达到最大滚动尝试次数。"); }
    console.log(`滚动查找结束，共找到 ${items.length} 个独特的快速申请项。`);
    return items;
  }

  // **辅助函数：在范围内查找项目**
  function findAndAddItemsInScope(scopeElement, seenElementsSet, itemsArray) {
    const potentialContainers = scopeElement.querySelectorAll('li.scaffold-layout__list-item, div.job-card-container');
    potentialContainers.forEach(container => {
        let textContent = '';
        try { textContent = (container.innerText || container.textContent || '').toLowerCase(); } catch(e) { return; }
        const hasKeyword = textContent.includes('快速申请') || textContent.includes('easy apply');
        if (hasKeyword) {
            let targetElement = container.querySelector('a.job-card-list__title, a.job-card-container__link');
            if (!targetElement) { targetElement = container.querySelector('.job-card-container--clickable') || container; }
            if (targetElement && targetElement.getBoundingClientRect().width > 0 && !seenElementsSet.has(targetElement)) {
                itemsArray.push(targetElement);
                seenElementsSet.add(targetElement);
            }
        }
    });
  }

  // **查找右侧申请按钮**
  function findRightApplyButton() {
    const idButton = document.getElementById('jobs-apply-button-id');
    if (idButton && idButton.offsetParent !== null) return idButton;
    const selectors = 'button.jobs-apply-button, button[aria-label*="Apply"], button[aria-label*="申请"]';
    const buttons = document.querySelectorAll(selectors);
    for (const btn of buttons) {
      const text = btn.textContent?.trim().toLowerCase() || '';
      if (btn.offsetParent !== null && (text.includes('apply') || text.includes('申请') || text === 'go')) { return btn; }
    }
    const allButtons = document.querySelectorAll('button');
    for (const btn of allButtons) {
      const text = btn.textContent?.trim().toLowerCase() || '';
      if (btn.offsetParent !== null && (text.includes('apply') || text.includes('申请') || text === 'go')) { return btn; }
    }
    return null;
  }

  // **查找关闭按钮**
  function findCloseButton() {
      const selectors = '.artdeco-modal__dismiss, button[aria-label*="Dismiss"], button[aria-label*="关闭"], button#ember314';
      const closeButtons = document.querySelectorAll(selectors);
      for (const btn of closeButtons) { if (btn.offsetParent !== null) return btn; }
      return null;
  }

  // **填充申请表单函数**
  async function fillApplicationModal() {
    console.log("[fillApplicationModal] Starting to fill application modal...");
    
    // 等待表单加载完成
    await new Promise(resolve => setTimeout(resolve, 1500));
    if (!isBatchApplying) throw new Error("用户停止");
    
    console.log("[fillApplicationModal] Attempting to recover previously filled values...");
    // 初始化全局填充值存储（如果不存在）
    if (!window.filledFieldValues) window.filledFieldValues = {};
    const recoveredElements = recoverFilledValues();
    if (recoveredElements > 0) {
      console.log(`[fillApplicationModal] Recovered ${recoveredElements} previously filled values.`);
    }

    // **关键步骤：先处理特殊字段，包括复选框**
    console.log("[fillApplicationModal] Calling handleSpecialFields to handle checkboxes, selects, etc. BEFORE checking fields...");
    await handleSpecialFields(); // 确保先处理复选框等
    console.log("[fillApplicationModal] Finished handleSpecialFields.");
    
    // 再次检查是否被用户停止
    if (!isBatchApplying) throw new Error("用户停止");

    console.log("[fillApplicationModal] Checking if current page is a submit/confirm page...");
    // 检查是否是最终确认或提交页面
    const isConfirmPage = isSubmitOrConfirmPage();
    console.log(`[fillApplicationModal] Is submit/confirm page? ${isConfirmPage}`);
    if (isConfirmPage) {
      console.log("[fillApplicationModal] Detected submit/confirm page, attempting to submit...");
      const submitted = await attemptToSubmitApplication();
      return submitted;
    }
    
    // 获取表单字段（用于AI匹配，如果需要）
    console.log("[fillApplicationModal] Getting application form fields for potential AI matching...");
    const formFields = getApplicationFormFields();
    console.log(`[fillApplicationModal] Found ${formFields?.length || 0} initial fields for AI matching.`);

    // 检查页面上是否还有其他未处理的元素
    const selectCount = document.querySelectorAll('select:not([data-auto-filled="true"])').length;
    const radioGroupCount = document.querySelectorAll('fieldset input[type="radio"]:not(:checked)').length > 0 ? document.querySelectorAll('fieldset, [role="radiogroup"]').length : 0; // 粗略估计未选中的组
    const inputCount = document.querySelectorAll('input:not([type="hidden"]):not([type="checkbox"]):not([type="radio"]):not([data-auto-filled="true"]), textarea:not([data-auto-filled="true"])').length;
    const checkboxCount = document.querySelectorAll('input[type="checkbox"]:not([data-auto-filled="true"])').length;
    console.log(`[fillApplicationModal] Remaining interactive elements: selects=${selectCount}, radioGroups=${radioGroupCount}, inputs=${inputCount}, checkboxes=${checkboxCount}`);

    const hasRemainingInteractiveElements = selectCount > 0 || radioGroupCount > 0 || inputCount > 0 || checkboxCount > 0;

    // **如果还有未处理的交互元素，尝试用 AI 填充或规则填充**
    if (hasRemainingInteractiveElements) {
        console.log("[fillApplicationModal] Found remaining interactive elements, attempting to fill...");
        let resumeData = await getResumeDataFromStorage();
        if (resumeData) {
            console.log("[fillApplicationModal] Resume data found, attempting AI matching...");
            try {
                const fieldMapping = await matchFieldsWithResume(formFields, resumeData);
                if (fieldMapping) {
                    const fillResult = fillFormFields(fieldMapping);
                    console.log(`[fillApplicationModal] AI fill result: Filled=${fillResult.filled}, Failed=${fillResult.failed}`);
                    // 可以选择在这里再次调用 handleSpecialFields 处理 AI 填充失败的字段
                    // await handleSpecialFields();
                } else {
                    console.log("[fillApplicationModal] AI matching did not return results.");
                }
            } catch (error) {
                console.error("[fillApplicationModal] Error during AI matching:", error);
            }
        } else {
            console.log("[fillApplicationModal] No resume data, skipping AI fill (special fields handled earlier). ");
             // 特殊字段已在前面处理过
        }

        // 检查文件上传字段
         const fileInputs = document.querySelectorAll('input[type="file"]:not([data-autofill-modal-id])');
          if (fileInputs.length > 0) {
            console.log("[fillApplicationModal] Found file upload inputs, handling...");
            await handleFileUploadFields();
          }

    } else {
        console.log("[fillApplicationModal] No remaining interactive elements detected on this page.");
    }

    // **最后尝试点击下一步**
    console.log("[fillApplicationModal] Attempting to find and click the 'Next' button...");
    const nextButtonClicked = await findAndClickNextButton();
    console.log(`[fillApplicationModal] Was 'Next' button clicked? ${nextButtonClicked}`);

    if (nextButtonClicked) {
        console.log("[fillApplicationModal] 'Next' button clicked, waiting for next page...");
        await new Promise(resolve => setTimeout(resolve, 1800)); // 增加等待时间确保页面加载
         if (!isBatchApplying) throw new Error("用户停止"); // 再次检查停止状态
        console.log("[fillApplicationModal] Proceeding to fill next page...");
        return await fillApplicationModal(); // 递归处理下一页
    }
    
    // **如果无法点击下一步，再次检查是否是提交页**
    console.log("[fillApplicationModal] No 'Next' button found or clicked. Re-checking if it's a submit page...");
    const isSubmitPageNow = isSubmitOrConfirmPage();
    console.log(`[fillApplicationModal] Is submit page now? ${isSubmitPageNow}`);
    if (isSubmitPageNow) {
        console.log("[fillApplicationModal] Detected submit page after attempting 'Next', attempting to submit...");
        const submitted = await attemptToSubmitApplication();
        return submitted;
    }
    
    // **如果既不能点下一步，也不是提交页，认为当前页面完成**
    console.log("[fillApplicationModal] Cannot proceed further (no Next button, not Submit page). Considering this page done.");
    return true; // 返回 true 表示当前步骤完成，但不一定代表整个申请完成
  }
  
  // 处理文件上传字段
  async function handleFileUploadFields() {
    // 检查是否已经为当前模态框显示了提示
    if (window.resumeUploadNoticeDisplayed) {
      console.log("已经显示过文件上传提示，不再重复显示");
      return;
    }
    
    // 获取已上传的简历信息
    const resumeInfoPromise = new Promise(resolve => {
      chrome.storage.local.get(['lastUploadedResume'], result => {
        resolve(result.lastUploadedResume || null);
      });
    });
    
    const resumeInfo = await resumeInfoPromise;
    if (!resumeInfo || !resumeInfo.fileName) {
      console.log("没有找到已上传的简历信息，无法自动填充文件上传字段");
      return;
    }
    
    console.log(`找到上传的简历信息: ${resumeInfo.fileName}`);
    
    // 显示提示给用户
    const modalContainer = document.querySelector('.artdeco-modal__content, .jobs-easy-apply-content, [role="dialog"]');
    if (!modalContainer) return;
    
    // 标记提示已显示
    window.resumeUploadNoticeDisplayed = true;
    
    // 创建提示元素
    const noticeDiv = document.createElement('div');
    noticeDiv.style.cssText = `
      position: absolute;
      top: 10px;
      right: 10px;
      background: rgba(255, 255, 0, 0.9);
      padding: 10px;
      border-radius: 5px;
      font-size: 14px;
      max-width: 300px;
      z-index: 9999;
      box-shadow: 0 2px 5px rgba(0,0,0,0.2);
    `;
    noticeDiv.innerHTML = `
      <p><strong>检测到简历上传字段</strong></p>
      <p>需要上传您的简历文件: <b>${resumeInfo.fileName}</b></p>
      <p>请点击"选择文件"按钮并选择您的简历</p>
      <button id="dismiss-file-notice" style="background: #0073b1; color: white; border: none; padding: 5px 10px; border-radius: 3px; cursor: pointer;">我知道了</button>
    `;
    modalContainer.appendChild(noticeDiv);
    
    // 保存当前提示元素的引用
    window.currentResumeNoticeElement = noticeDiv;
    
    // 添加点击监听器以关闭提示
    document.getElementById('dismiss-file-notice').addEventListener('click', () => {
      noticeDiv.remove();
      window.currentResumeNoticeElement = null;
    });
    
    // 尝试高亮显示上传按钮
    const fileInputs = document.querySelectorAll('input[type="file"]:not([data-autofill-modal-id])');
    for (const fileInput of fileInputs) {
      // 找到文件输入框的标签或包装元素
      let fileInputContainer = fileInput.parentElement;
      let uploadLabel = null;
      
      // 寻找相关的标签元素
      if (fileInput.id) {
        uploadLabel = document.querySelector(`label[for="${fileInput.id}"]`);
      }
      
      if (uploadLabel || fileInputContainer) {
        const targetElement = uploadLabel || fileInputContainer;
        
        // 保存原始样式
        const originalStyle = targetElement.getAttribute('style') || '';
        
        // 添加高亮样式
        targetElement.style.cssText = `
          ${originalStyle}
          box-shadow: 0 0 0 2px #0073b1, 0 0 0 6px rgba(0, 115, 177, 0.3) !important;
          transition: all 0.3s !important;
        `;
        
        // 滚动到上传元素
        targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        
        // 5秒后恢复原样式
        setTimeout(() => {
          targetElement.setAttribute('style', originalStyle);
        }, 5000);
      }
    }
  }
  
  // 填充表单字段
  function fillFormFields(fieldMapping) {
    console.log("开始根据AI匹配结果填充表单字段...");
    let filledCount = 0;
    let failedCount = 0;
    
    // 遍历所有需要填充的字段
    for (const fieldId in fieldMapping) {
      const value = fieldMapping[fieldId];
      
      if (!value || value.trim() === '') {
        console.log(`字段 ${fieldId} 没有匹配值，跳过`);
        continue;
      }
      
      // 首先检查常规字段
      const element = document.querySelector(`[data-autofill-modal-id="${fieldId}"]`);
      if (element) {
        try {
          if (element.tagName.toLowerCase() === 'select') {
            // 检查下拉框是否已有选择的值
            const hasValue = element.value && element.value !== '' && 
                             element.value !== 'null' && element.value !== 'undefined' &&
                             element.selectedIndex > 0;
            
            if (hasValue) {
              console.log(`下拉框已有选择的值: ${element.value}，不进行修改`);
              continue;
            }
            
            // 填充下拉选择框
            if (fillSelectElement(element, value)) {
              filledCount++;
            } else {
              failedCount++;
            }
          } else if (element.tagName.toLowerCase() === 'input' || element.tagName.toLowerCase() === 'textarea') {
            // 检查输入框是否已有值
            if (element.value && element.value.trim() !== '') {
              console.log(`输入框已有值: ${element.value}，不进行修改`);
              continue;
            }
            
            // 填充输入元素
            if (fillInputElement(element, value)) {
              filledCount++;
            } else {
              failedCount++;
            }
          }
        } catch (error) {
          console.error(`填充字段 ${fieldId} 时出错:`, error);
          failedCount++;
        }
      } else {
        // 检查AI扩展字段
        const aiElement = document.querySelector(`[data-ai-field-id="${fieldId}"]`);
        if (aiElement) {
          try {
            if (aiElement.tagName.toLowerCase() === 'select') {
              // 检查下拉框是否已有选择的值
              const hasValue = aiElement.value && aiElement.value !== '' && 
                               aiElement.value !== 'null' && aiElement.value !== 'undefined' &&
                               aiElement.selectedIndex > 0;
              
              if (hasValue) {
                console.log(`扩展下拉框已有值: ${aiElement.value}，不进行修改`);
                continue;
              }
              
              // 填充下拉选择框
              if (fillSelectElement(aiElement, value)) {
                filledCount++;
              } else {
                failedCount++;
              }
            } else if (aiElement.tagName.toLowerCase() === 'fieldset' || 
                      aiElement.getAttribute('role') === 'radiogroup' || 
                      aiElement.classList.contains('radio-buttons-group')) {
              // 填充单选按钮组
              // 检查是否已有选中按钮
              const radioButtons = aiElement.querySelectorAll('input[type="radio"]');
              let hasChecked = false;
              radioButtons.forEach(radio => {
                if (radio.checked) hasChecked = true;
              });
              
              if (hasChecked) {
                console.log(`单选按钮组已有选择，不进行修改`);
                continue;
              }
              
              if (fillRadioGroup(aiElement, value)) {
                filledCount++;
              } else {
                failedCount++;
              }
            } else if (aiElement.tagName.toLowerCase() === 'input' || aiElement.tagName.toLowerCase() === 'textarea') {
              // 检查输入框是否已有值
              if (aiElement.value && aiElement.value.trim() !== '') {
                console.log(`扩展输入框已有值: ${aiElement.value}，不进行修改`);
                continue;
              }
              
              // 填充输入元素
              if (fillInputElement(aiElement, value)) {
                filledCount++;
              } else {
                failedCount++;
              }
            }
          } catch (error) {
            console.error(`填充AI扩展字段 ${fieldId} 时出错:`, error);
            failedCount++;
          }
        } else {
          // 检查单选按钮组成员
          const radioButton = document.querySelector(`[data-ai-group-id="${fieldId}"]`);
          if (radioButton) {
            const group = radioButton.closest('fieldset, [role="radiogroup"], .radio-buttons-group');
            if (group) {
              // 检查是否已有选中按钮
              const radioButtons = group.querySelectorAll('input[type="radio"]');
              let hasChecked = false;
              radioButtons.forEach(radio => {
                if (radio.checked) hasChecked = true;
              });
              
              if (hasChecked) {
                console.log(`单选按钮组已有选择，不进行修改`);
                continue;
              }
              
              if (fillRadioGroup(group, value)) {
                filledCount++;
              } else {
                failedCount++;
              }
            }
          } else {
            console.log(`未找到与字段ID ${fieldId} 匹配的元素`);
            failedCount++;
          }
        }
      }
    }
    
    return { filled: filledCount, failed: failedCount };
  }
  
  // 填充单选按钮组
  function fillRadioGroup(groupElement, value) {
    const radioButtons = groupElement.querySelectorAll('input[type="radio"]');
    if (radioButtons.length === 0) {
      console.log("未找到单选按钮");
      return false;
    }
    
    // 尝试按文本匹配
    let matched = false;
    const valueLower = value.toLowerCase();
    
    // 首先尝试精确匹配
    for (const radio of radioButtons) {
      const radioLabel = findLabelForElement(radio) || '';
      const radioLabelLower = radioLabel.toLowerCase();
      const radioValue = radio.value.toLowerCase();
      
      if (radioValue === valueLower || radioLabelLower === valueLower) {
        console.log(`找到精确匹配的单选按钮: "${radioLabel || radioValue}"`);
        radio.checked = true;
        radio.click();
        radio.dispatchEvent(new Event('change', { bubbles: true }));
        matched = true;
        break;
      }
    }
    
    // 如果没找到，尝试包含匹配
    if (!matched) {
      for (const radio of radioButtons) {
        const radioLabel = findLabelForElement(radio) || '';
        const radioLabelLower = radioLabel.toLowerCase();
        
        if (radioLabelLower.includes(valueLower) || valueLower.includes(radioLabelLower)) {
          console.log(`找到部分匹配的单选按钮: "${radioLabel}"`);
          radio.checked = true;
          radio.click();
          radio.dispatchEvent(new Event('change', { bubbles: true }));
          matched = true;
          break;
        }
      }
    }
    
    // 仍未匹配，检查是否包含yes/no相关内容
    if (!matched) {
      if (valueLower === 'yes' || valueLower === 'true' || valueLower === '是' || 
          valueLower === '1' || valueLower.includes('yes')) {
        // 选择第一个按钮(通常是"是")
        const firstRadio = radioButtons[0];
        console.log(`未找到匹配，但值为"${value}"，选择第一个单选按钮作为"是"`);
        firstRadio.checked = true;
        firstRadio.click();
        firstRadio.dispatchEvent(new Event('change', { bubbles: true }));
        matched = true;
      }
      else if (valueLower === 'no' || valueLower === 'false' || valueLower === '否' || 
               valueLower === '0' || valueLower.includes('no')) {
        // 选择第二个按钮(通常是"否")
        if (radioButtons.length > 1) {
          const secondRadio = radioButtons[1];
          console.log(`未找到匹配，但值为"${value}"，选择第二个单选按钮作为"否"`);
          secondRadio.checked = true;
          secondRadio.click();
          secondRadio.dispatchEvent(new Event('change', { bubbles: true }));
          matched = true;
        }
      }
    }
    
    // 如果都没匹配到，使用智能规则
    if (!matched) {
      // 获取组标题
      const legend = groupElement.querySelector('legend, h3, [role="heading"], .t-bold');
      const groupLabel = legend ? legend.textContent.trim().toLowerCase() : '';
      
      if (groupLabel.includes('eligible') || groupLabel.includes('authorized') || 
          groupLabel.includes('有资格') || groupLabel.includes('可以')) {
        // 对于资格问题，选择"是"
        const firstRadio = radioButtons[0];
        console.log(`未找到匹配，但问题与资格相关，选择第一个单选按钮作为"是"`);
        firstRadio.checked = true;
        firstRadio.click();
        firstRadio.dispatchEvent(new Event('change', { bubbles: true }));
      }
      else if (groupLabel.includes('experience') || groupLabel.includes('经验') || 
               groupLabel.includes('years') || groupLabel.includes('年')) {
        // 对于经验问题，选择偏高的选项
        const index = Math.min(Math.floor(radioButtons.length * 0.7), radioButtons.length - 1);
        const radio = radioButtons[index];
        console.log(`未找到匹配，但问题与经验相关，选择第${index+1}个单选按钮`);
        radio.checked = true;
        radio.click();
        radio.dispatchEvent(new Event('change', { bubbles: true }));
      }
      else if (groupLabel.includes('skill') || groupLabel.includes('技能') || 
               groupLabel.includes('level') || groupLabel.includes('级别')) {
        // 对于技能问题，选择最高级别
        const lastRadio = radioButtons[radioButtons.length - 1];
        console.log(`未找到匹配，但问题与技能相关，选择最后一个单选按钮作为最高级别`);
        lastRadio.checked = true;
        lastRadio.click();
        lastRadio.dispatchEvent(new Event('change', { bubbles: true }));
      }
      else {
        // 默认选第一个
        const firstRadio = radioButtons[0];
        console.log(`未找到匹配，默认选择第一个单选按钮`);
        firstRadio.checked = true;
        firstRadio.click();
        firstRadio.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }
    
    return true;
  }
  
  // 填充选择框元素
  function fillSelectElement(selectElement, value) {
    // 检查下拉框是否已被我们主动设置过（而不是仅检查是否有值）
    if (selectElement.getAttribute('data-auto-filled') === 'true') {
      console.log(`下拉框已被主动设置过值: ${selectElement.value}，不进行修改`);
      return true;
    }
    
    // 过滤出有效的选项（排除"Select an option"等占位选项）
    const validOptions = Array.from(selectElement.options).filter(option => {
      const optionValue = option.value;
      const optionText = option.text.trim().toLowerCase();
      
      return optionValue && 
             optionValue !== 'null' && 
             optionValue !== 'undefined' && 
             optionValue !== 'select an option' &&
             !optionText.includes('select an option') &&
             !optionText.includes('select') &&
             !optionText.includes('please select') &&
             !optionText.includes('请选择') &&
             optionText !== '';
    });
    
    if (validOptions.length === 0) {
      console.log("警告: 下拉框没有有效选项可选");
      return false;
    }
    
    console.log(`下拉框有 ${validOptions.length} 个有效选项`);
    
    // 尝试精确匹配
    let optionFound = false;
    let selectedOption = null;
    
    // 先尝试直接值匹配
    for (const option of validOptions) {
      if (option.value.toLowerCase() === value.toLowerCase() || 
          option.text.toLowerCase() === value.toLowerCase()) {
        selectedOption = option;
        optionFound = true;
        console.log(`找到精确匹配的选项: ${option.text}`);
        break;
      }
    }
    
    // 如果没找到，尝试包含匹配
    if (!optionFound) {
      for (const option of validOptions) {
        if (option.text.toLowerCase().includes(value.toLowerCase()) || 
            value.toLowerCase().includes(option.text.toLowerCase())) {
          selectedOption = option;
          optionFound = true;
          console.log(`找到部分匹配的选项: ${option.text}`);
          break;
        }
      }
    }
    
    // 如果还是没找到，并且值像是年份、日期或数字，尝试找最接近的
    if (!optionFound && /^\d+(\.\d+)?$/.test(value)) {
      const numValue = parseFloat(value);
      let closestOption = null;
      let closestDiff = Infinity;
      
      for (const option of validOptions) {
        if (/^\d+(\.\d+)?$/.test(option.text)) {
          const optionNum = parseFloat(option.text);
          const diff = Math.abs(optionNum - numValue);
          if (diff < closestDiff) {
            closestDiff = diff;
            closestOption = option;
          }
        }
      }
      
      if (closestOption) {
        selectedOption = closestOption;
        optionFound = true;
        console.log(`找到数值最接近的选项: ${closestOption.text}`);
      }
    }
    
    // 如果所有匹配方式都失败了，但这是一个必填字段，则选择第一个有效选项
    if (!optionFound) {
      // 检查select是否是必填的
      const isRequired = selectElement.required || 
                        selectElement.closest('label')?.textContent.includes('*') ||
                        selectElement.hasAttribute('aria-required');
      
      if (isRequired || true) { // 总是选择一个有效选项，避免卡住
        selectedOption = validOptions[0];
        console.log(`没有找到匹配的选项，选择第一个有效选项: ${selectedOption.text}`);
        optionFound = true;
      }
    }
    
    // 设置选中的选项
    if (optionFound && selectedOption) {
      selectElement.value = selectedOption.value;
      selectElement.dispatchEvent(new Event('change', { bubbles: true }));
      // 添加标记，表示这个下拉框已被我们主动设置过
      selectElement.setAttribute('data-auto-filled', 'true');
      // 将此选择框的值存储在全局对象中，以便于恢复
      if (!window.filledFieldValues) window.filledFieldValues = {};
      window.filledFieldValues[selectElement.id || selectElement.name || `select_${Date.now()}`] = selectedOption.text;
      return true;
    }
    
    return false;
  }
  
  // 填充输入框和文本域元素
  function fillInputElement(element, value) {
    // 检查元素是否已被我们主动设置过（而不仅仅是有值）
    if (element.getAttribute('data-auto-filled') === 'true') {
      console.log(`输入框已被主动设置过值: ${element.value}，不进行修改`);
      return true;
    }
    
    // 获取元素相关信息，帮助识别字段类型
    const elementId = element.id || '';
    const elementName = element.name || '';
    const elementPlaceholder = element.placeholder || '';
    const elementLabel = findLabelForModalElement(element) || '';
    const elementLabelLower = elementLabel.toLowerCase();
    const elementType = element.type || '';
    
    // 记录填充信息
    console.log(`填充输入框: ${elementLabel || elementName || elementId}, 类型: ${elementType}, 值: ${value}`);
    
    // 处理单选和复选框
    if (element.type === 'checkbox' || element.type === 'radio') {
      console.log(`处理单选/复选框: ${element.name || element.id}，值: ${value}`);
      
      // 对于是/否类型问题的更智能处理
      if (value.toLowerCase() === 'yes' || 
          value.toLowerCase() === 'true' || 
          value === '1' || 
          value.toLowerCase() === 'on' ||
          value.toLowerCase() === '是') {
        
        // 如果我们需要选择"是"，找到对应的单选按钮
        if (element.value && (
            element.value.toLowerCase() === 'yes' || 
            element.value.toLowerCase() === 'true' || 
            element.value === '1' || 
            element.value.toLowerCase() === '是')) {
          
          console.log("选中YES选项");
          element.checked = true;
          element.click(); // 物理点击，触发可能的事件监听器
          element.dispatchEvent(new Event('change', { bubbles: true }));
          element.setAttribute('data-auto-filled', 'true');
          
          // 将此选择的值存储在全局对象中，以便于恢复
          if (!window.filledFieldValues) window.filledFieldValues = {};
          window.filledFieldValues[element.id || element.name || `radio_${Date.now()}`] = 'yes';
          return true;
        }
      } else if (value.toLowerCase() === 'no' || 
                value.toLowerCase() === 'false' || 
                value === '0' || 
                value.toLowerCase() === 'off' ||
                value.toLowerCase() === '否') {
        
        // 如果我们需要选择"否"，找到对应的单选按钮
        if (element.value && (
            element.value.toLowerCase() === 'no' || 
            element.value.toLowerCase() === 'false' || 
            element.value === '0' || 
            element.value.toLowerCase() === '否')) {
          
          console.log("选中NO选项");
          element.checked = true;
          element.click(); // 物理点击，触发可能的事件监听器
          element.dispatchEvent(new Event('change', { bubbles: true }));
          element.setAttribute('data-auto-filled', 'true');
          
          // 将此选择的值存储在全局对象中，以便于恢复
          if (!window.filledFieldValues) window.filledFieldValues = {};
          window.filledFieldValues[element.id || element.name || `radio_${Date.now()}`] = 'no';
          return true;
        }
      } else {
        // 如果是其他类型的单选按钮，直接比较值
        if (element.value && element.value.toLowerCase() === value.toLowerCase()) {
          console.log(`选中值匹配的选项: ${element.value}`);
          element.checked = true;
          element.click(); // 物理点击
          element.dispatchEvent(new Event('change', { bubbles: true }));
          element.setAttribute('data-auto-filled', 'true');
          
          // 将此选择的值存储在全局对象中，以便于恢复
          if (!window.filledFieldValues) window.filledFieldValues = {};
          window.filledFieldValues[element.id || element.name || `radio_${Date.now()}`] = value;
          return true;
        }
      }
      return false;
    }
    
    // 处理可用性/开始日期相关字段 (如 "When can you start" 或 "可用性")
    if ((elementLabelLower.includes('available') || 
         elementLabelLower.includes('availability') ||
         elementLabelLower.includes('start') || 
         elementLabelLower.includes('可用') || 
         elementLabelLower.includes('开始') ||
         elementLabelLower.includes('入职')) && 
        !element.type.includes('date')) {
      
      console.log("检测到可用性/开始日期相关字段，提供标准回答");
      
      // 根据字段类型提供合适的回答
      const currentDate = new Date();
      const twoWeeksLater = new Date(currentDate.setDate(currentDate.getDate() + 14));
      const formatDate = (date) => {
        return `${date.getFullYear()}-${(date.getMonth()+1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
      };
      
      // 确定合适的回答
      let availabilityAnswer;
      if (element.type === 'date') {
        availabilityAnswer = formatDate(twoWeeksLater);
      } else {
        // 文本回答
        availabilityAnswer = `两周内 / Within 2 weeks (${formatDate(twoWeeksLater)})`;
      }
      
      console.log(`设置可用性回答: ${availabilityAnswer}`);
      element.focus();
      element.value = availabilityAnswer;
      element.dispatchEvent(new Event('input', { bubbles: true }));
      element.dispatchEvent(new Event('change', { bubbles: true }));
      element.dispatchEvent(new Event('blur', { bubbles: true }));
      element.setAttribute('data-auto-filled', 'true');
      
      // 将此输入框的值存储在全局对象中，以便于恢复
      if (!window.filledFieldValues) window.filledFieldValues = {};
      window.filledFieldValues[element.id || element.name || `input_${Date.now()}`] = availabilityAnswer;
      return true;
    }
    
    // 处理日期输入
    if (element.type === 'date' && value) {
      // 尝试转换各种日期格式为YYYY-MM-DD
      const dateMatches = value.match(/(\d{1,4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,4})/);
      if (dateMatches) {
        let [_, part1, part2, part3] = dateMatches;
        // 推断年份位置 (判断哪个是年份)
        let year, month, day;
        if (part1.length === 4) {
          // 格式：YYYY-MM-DD
          year = part1;
          month = part2;
          day = part3;
        } else if (part3.length === 4) {
          // 格式：DD-MM-YYYY 或 MM-DD-YYYY
          year = part3;
          // 假设第一部分是月份 (美式)，但这可能不准确
          month = part1;
          day = part2;
        } else {
          // 无法确定，使用当前日期
          const now = new Date();
          year = now.getFullYear();
          month = now.getMonth() + 1;
          day = now.getDate();
        }
        
        // 确保月份和日期有两位数
        month = month.padStart ? month.padStart(2, '0') : (month.length === 1 ? '0' + month : month);
        day = day.padStart ? day.padStart(2, '0') : (day.length === 1 ? '0' + day : day);
        
        // 设置日期值
        const formattedDate = `${year}-${month}-${day}`;
        element.value = formattedDate;
        element.setAttribute('data-auto-filled', 'true');
        
        // 将此输入框的值存储在全局对象中
        if (!window.filledFieldValues) window.filledFieldValues = {};
        window.filledFieldValues[element.id || element.name || `date_${Date.now()}`] = formattedDate;
        return true;
      }
    } 
    // 处理自动完成/建议输入框 (如地址、位置输入)
    else if ((element.getAttribute('aria-autocomplete') === 'list' || 
             element.getAttribute('role') === 'combobox' ||
             element.classList.contains('autocomplete') ||
             element.classList.contains('typeahead') ||
             element.name?.toLowerCase().includes('location') ||
             element.id?.toLowerCase().includes('location') ||
             element.placeholder?.toLowerCase().includes('location') ||
             element.ariaLabel?.toLowerCase().includes('location') ||
             element.closest('div')?.classList.contains('jobs-location-search')) && 
             value) {
      
      console.log(`处理自动完成输入框: ${element.name || element.id}，值: ${value}`);
      
      // 清除现有值
      element.value = "";
      // 聚焦元素
      element.focus();
      
      // 设置值并触发必要的事件
      element.value = value;
      element.dispatchEvent(new Event('input', { bubbles: true }));
      element.dispatchEvent(new Event('change', { bubbles: true }));
      element.setAttribute('data-auto-filled', 'true');
      
      // 将此输入框的值存储在全局对象中
      if (!window.filledFieldValues) window.filledFieldValues = {};
      window.filledFieldValues[element.id || element.name || `autocomplete_${Date.now()}`] = value;
      
      // 等待下拉菜单出现，然后选择第一个匹配项
      setTimeout(() => {
        // 检查是否有下拉选项列表
        const dropdownList = document.querySelector('ul.autocomplete-results, .typeahead-results, ul[role="listbox"], div[role="listbox"]');
        if (dropdownList) {
          console.log("找到自动完成下拉列表");
          // 查找第一个选项并点击
          const firstOption = dropdownList.querySelector('li, div[role="option"]');
          if (firstOption) {
            console.log("选择第一个下拉选项");
            firstOption.click();
          } else {
            // 如果没有选项，按回车确认当前输入
            console.log("未找到下拉选项，按回车确认");
            element.dispatchEvent(new KeyboardEvent('keydown', {
              key: 'Enter',
              code: 'Enter',
              keyCode: 13,
              which: 13,
              bubbles: true
            }));
          }
        } else {
          console.log("未找到自动完成下拉列表，尝试按回车确认");
          // 按回车确认当前输入
          element.dispatchEvent(new KeyboardEvent('keydown', {
            key: 'Enter',
            code: 'Enter',
            keyCode: 13,
            which: 13,
            bubbles: true
          }));
        }
        
        // 最后失去焦点
        setTimeout(() => {
          element.blur();
          element.dispatchEvent(new Event('blur', { bubbles: true }));
        }, 500);
      }, 500); // 等待下拉菜单出现
      
      return true;
    } 
    // 处理语言能力字段
    else if (elementLabelLower.includes('language') || 
             elementLabelLower.includes('语言') || 
             elementLabelLower.includes('speak')) {
      
      console.log("处理语言能力相关字段");
      
      // 默认语言回答
      const languageAnswer = "中文（母语）, 英语（熟练）/ Chinese (Native), English (Proficient)";
      
      element.focus();
      element.value = languageAnswer;
      element.dispatchEvent(new Event('input', { bubbles: true }));
      element.dispatchEvent(new Event('change', { bubbles: true }));
      element.dispatchEvent(new Event('blur', { bubbles: true }));
      element.setAttribute('data-auto-filled', 'true');
      
      // 将此输入框的值存储在全局对象中
      if (!window.filledFieldValues) window.filledFieldValues = {};
      window.filledFieldValues[element.id || element.name || `language_${Date.now()}`] = languageAnswer;
      return true;
    }
    // 处理招聘来源字段
    else if (elementLabelLower.includes('hear about') || 
             elementLabelLower.includes('how did you') || 
             elementLabelLower.includes('来源') || 
             elementLabelLower.includes('了解到')) {
      
      console.log("处理招聘来源相关字段");
      
      // 标准来源回答
      const sourceAnswer = "LinkedIn Jobs / 领英招聘";
      
      element.focus();
      element.value = sourceAnswer;
      element.dispatchEvent(new Event('input', { bubbles: true }));
      element.dispatchEvent(new Event('change', { bubbles: true }));
      element.dispatchEvent(new Event('blur', { bubbles: true }));
      element.setAttribute('data-auto-filled', 'true');
      
      // 将此输入框的值存储在全局对象中
      if (!window.filledFieldValues) window.filledFieldValues = {};
      window.filledFieldValues[element.id || element.name || `source_${Date.now()}`] = sourceAnswer;
      return true;
    }
    else {
      // 常规输入框处理
      console.log(`填充常规输入框: ${element.name || element.id}，值: ${value}`);
      element.focus();
      element.value = value;
      
      // 触发必要的事件
      element.dispatchEvent(new Event('input', { bubbles: true }));
      element.dispatchEvent(new Event('change', { bubbles: true }));
      element.dispatchEvent(new Event('blur', { bubbles: true }));
      element.setAttribute('data-auto-filled', 'true');
      
      // 将此输入框的值存储在全局对象中
      if (!window.filledFieldValues) window.filledFieldValues = {};
      window.filledFieldValues[element.id || element.name || `input_${Date.now()}`] = value;
      return true;
    }
  }
  
  // 处理特殊字段 (如简历上传等)
  async function handleSpecialFields() {
    console.log("开始处理特殊表单字段...");
    
    // 处理复选框（特别是隐私政策和条款同意的复选框）
    await handleCheckboxes();
    
    // 处理单选按钮组
    await handleRadioGroups();
    
    // 特殊处理LinkedIn特有字段
    await handleLinkedInSpecificFields();
    
    // 处理未被填充的下拉选择框
    await handleUnfilledSelectElements();
    
    console.log("特殊字段处理完成");
  }
  
  // 处理复选框，特别是隐私政策和条款同意的复选框
  async function handleCheckboxes() {
    console.log("[handleCheckboxes] Checking for checkboxes...");

    const checkboxes = document.querySelectorAll('input[type="checkbox"]:not([data-auto-filled="true"])');
    if (checkboxes.length === 0) {
      console.log("[handleCheckboxes] No checkboxes found to process.");
      return;
    }

    console.log(`[handleCheckboxes] Found ${checkboxes.length} checkboxes to check.`);
    let filledCount = 0;

    for (const checkbox of checkboxes) {
      console.log("[handleCheckboxes] --- Checking Checkbox ---", checkbox);
      // Basic visibility check
      if (checkbox.offsetParent === null && checkbox.getClientRects().length === 0) {
          console.log("[handleCheckboxes] Checkbox not visible, skipping.");
          continue;
      }
      if (checkbox.checked) {
          console.log("[handleCheckboxes] Checkbox already checked, skipping.");
          continue;
      }

      // Get label text (more robust)
      let checkboxLabel = '';
      try {
        // 1. Check associated label via 'for'
        if (checkbox.id) {
          const labelFor = document.querySelector(`label[for="${checkbox.id}"]`);
          if (labelFor) checkboxLabel = labelFor.textContent || '';
        }
        // 2. Check parent label
        if (!checkboxLabel) {
          const parentLabel = checkbox.closest('label');
          if (parentLabel) checkboxLabel = parentLabel.textContent || '';
        }
        // 3. Check data attribute as fallback
        if (!checkboxLabel) {
          checkboxLabel = checkbox.getAttribute('data-test-text-selectable-option__input') || '';
        }
        // 4. Check sibling label (common pattern)
        if (!checkboxLabel && checkbox.nextElementSibling?.tagName === 'LABEL') {
            checkboxLabel = checkbox.nextElementSibling.textContent || '';
        }
        // 5. Check parent's text if it seems relevant
        if (!checkboxLabel && checkbox.parentElement?.textContent) {
             const parentText = checkbox.parentElement.textContent.trim();
             // Only use parent text if it's reasonably short and seems like a label
             if (parentText.length > 0 && parentText.length < 100 && !parentText.includes('\n')) {
                  checkboxLabel = parentText;
             }
        }
      } catch (e) { console.error("Error getting checkbox label:", e); }

      const checkboxLabelLower = checkboxLabel.trim().toLowerCase();
      console.log(`[handleCheckboxes] Retrieved Label: "${checkboxLabel}"`);

      // Simple Check: Does the label contain "agree", "terms", "condition", "policy", "consent", "acknowledge"?
      const keywords = ['agree', 'terms', 'condition', 'policy', 'privacy', 'consent', 'acknowledge', '同意', '接受', '条款', '政策', '确认'];
      const isLikelyTermsCheckbox = keywords.some(keyword => checkboxLabelLower.includes(keyword));
      console.log(`[handleCheckboxes] Is likely a terms/policy checkbox? ${isLikelyTermsCheckbox}`);

      // *** Simplified Logic: If it looks like a terms checkbox, JUST CLICK IT ***
      if (isLikelyTermsCheckbox) {
        console.log(`[handleCheckboxes] Attempting to check terms checkbox: "${checkboxLabel}"`);
        try {
          // Attempt multiple ways to check
          if (!checkbox.checked) {
              checkbox.checked = true;
              console.log("[handleCheckboxes] Set checkbox.checked = true");
          }
          // Trigger events first
          checkbox.dispatchEvent(new Event('change', { bubbles: true }));
          console.log("[handleCheckboxes] Dispatched 'change' event");
          checkbox.dispatchEvent(new Event('click', { bubbles: true })); // Simulate a bubble click event
          console.log("[handleCheckboxes] Dispatched 'click' event");

          // Fallback: Direct click if not checked after events
          if (!checkbox.checked) {
               console.log("[handleCheckboxes] Still not checked, trying direct click...");
               checkbox.click();
               console.log("[handleCheckboxes] Executed direct click()");
          }

          // Verify if checked now
          if(checkbox.checked) {
              console.log("[handleCheckboxes] Checkbox is now checked.");
              checkbox.setAttribute('data-auto-filled', 'true');
              filledCount++;
          } else {
              console.warn("[handleCheckboxes] Failed to check the checkbox after multiple attempts.");
               // Try clicking the label as a last resort if found
               if (checkbox.id) {
                  const labelElement = document.querySelector(`label[for="${checkbox.id}"]`);
                  if (labelElement) {
                      console.log("[handleCheckboxes] Trying to click the label...");
                      labelElement.click();
                      if (checkbox.checked) {
                           console.log("[handleCheckboxes] Clicking the label worked.");
                           checkbox.setAttribute('data-auto-filled', 'true');
                           filledCount++;
                      } else {
                           console.warn("[handleCheckboxes] Clicking the label also failed.");
                      }
                  }
               }
          }

        } catch (clickError) {
          console.error("[handleCheckboxes] Error during checkbox click/event dispatch:", clickError);
        }
      } else {
        console.log(`[handleCheckboxes] Skipping checkbox, does not appear to be terms/policy: "${checkboxLabel}"`);
      }
      console.log("[handleCheckboxes] --- Checkbox check finished ---");
    }

    console.log(`[handleCheckboxes] Finished processing. Checked ${filledCount} checkboxes.`);

    // Agree button logic remains the same
    const agreeButtons = Array.from(document.querySelectorAll('button, a.button, input[type="button"], input[type="submit"]')).filter(button => {
        const text = (button.textContent || button.value || '').toLowerCase();
        return (text.includes('agree') || text.includes('accept') || text.includes('同意') || text.includes('接受')) &&
               button.offsetParent !== null;
      });

      for (const button of agreeButtons) {
        console.log(`[handleCheckboxes] Clicking agree button: "${button.textContent || button.value}"`);
        button.click();
        await new Promise(resolve => setTimeout(resolve, 500));
      }
  }
  
  // 处理未被填充的下拉选择框
  async function handleUnfilledSelectElements() {
    console.log("[handleUnfilledSelectElements] Checking for unfilled select elements...");

    // 获取所有未被处理的下拉框
    const selectElements = document.querySelectorAll('select:not([data-auto-filled="true"])');
    if (selectElements.length === 0) {
      console.log("[handleUnfilledSelectElements] No select elements found needing processing.");
      return;
    }

    console.log(`[handleUnfilledSelectElements] Found ${selectElements.length} selects potentially needing processing.`);
    let filledCount = 0;
    // 扩展常见的占位符文本和值
    const placeholderTexts = ['select', 'choose', 'please select', 'select an option', '', '0', '-1', 'null', 'undefined', '选择', '请选择', '选择一项', '--', '(select one)'];

    for (const select of selectElements) {
      if (select.offsetParent === null) {
          console.log("[handleUnfilledSelectElements] Select not visible, skipping.", select);
          continue; // 跳过不可见元素
      }

      // **改进的"已有值"检查：检查当前值/文本是否是占位符**
      const currentValue = select.value;
      const currentText = select.options[select.selectedIndex]?.text.trim().toLowerCase() || '';
      // 只有当选中的值或文本是明确的占位符时，才认为需要处理
      const isPlaceholderSelected = placeholderTexts.includes(currentValue?.toLowerCase()) || 
                                    placeholderTexts.includes(currentText) || 
                                    select.selectedIndex < 0; // selectedIndex 通常为-1表示未选择

      if (!isPlaceholderSelected) {
          console.log(`[handleUnfilledSelectElements] Select already has a non-placeholder value: "${select.options[select.selectedIndex]?.text}" (Value: ${currentValue}), skipping.`);
          continue; // 如果不是占位符，就跳过这个 select
      }
      
      console.log(`[handleUnfilledSelectElements] Processing select with placeholder (Value: "${currentValue}", Text: "${currentText}", Placeholder?: ${isPlaceholderSelected}):`, select);

      // 获取有效选项 (过滤掉占位符)
      const validOptions = Array.from(select.options).filter(option => {
        const optionValueLower = option.value?.toLowerCase();
        const optionTextLower = option.text.trim().toLowerCase();
        // 确保选项有实际值并且文本不是占位符
        return option.value && !placeholderTexts.includes(optionValueLower) && !placeholderTexts.includes(optionTextLower);
      });

      if (validOptions.length === 0) {
        console.log("[handleUnfilledSelectElements] No valid (non-placeholder) options found, skipping.");
        continue;
      }

      // 获取标签
      const selectLabel = findLabelForElement(select) || '';
      const selectLabelLower = selectLabel.toLowerCase();
      const selectId = select.id || '';
      const selectName = select.name || '';

      console.log(`[handleUnfilledSelectElements] Select Label: "${selectLabel}"`);

      let ruleApplied = false; // 标记是否有特定规则被应用

      // --- 应用特定规则 --- 
      // (工作权限、招聘来源、国家/地区等规则保持不变)
      // 检查是否是工作权限/签证相关选择框
      if ((selectLabelLower.includes('work') && 
          (selectLabelLower.includes('authorization') || selectLabelLower.includes('visa') || 
           selectLabelLower.includes('permit') || selectLabelLower.includes('right') || 
           selectLabelLower.includes('eligible') || selectLabelLower.includes('eligibility') ||
           selectLabelLower.includes('status') || selectLabelLower.includes('citizenship'))) || 
          selectLabelLower.includes('hong kong') || selectLabelLower.includes('singapore')) {
        
        console.log("[handleUnfilledSelectElements] Detected work authorization/visa/region field.");
        let bestOption = null;
        // ... (之前的香港/新加坡/通用工作权限逻辑来选择 bestOption) ...
          if (selectLabelLower.includes('hong kong') || selectLabelLower.includes('singapore')) {
               for (const option of validOptions) {
                   const optionText = option.text.toLowerCase();
                   if (optionText.includes('citizen') || optionText.includes('permanent') || optionText.includes('have the right') || optionText.includes('entitled to') || optionText.includes('yes')) {
                       bestOption = option; break;
                   }
               }
         } else {
             for (const option of validOptions) {
                 const optionText = option.text.toLowerCase();
                 if (optionText.includes('citizen') || optionText.includes('公民') || optionText.includes('permanent resident') || optionText.includes('永久居民') || optionText.includes('authorized') || optionText.includes('有权') || optionText.includes('yes') || optionText.includes('是') || optionText.includes('have the right') || optionText.includes('eligible')) {
                     bestOption = option; break;
                 }
             }
         }
          if (!bestOption && validOptions.length > 0) {
              bestOption = validOptions[0];
          }
        // ---
        if (bestOption) {
          console.log(`[handleUnfilledSelectElements] Applying work auth rule, selecting: "${bestOption.text}"`);
          select.value = bestOption.value;
          select.dispatchEvent(new Event('change', { bubbles: true }));
          select.setAttribute('data-auto-filled', 'true'); // 标记已被处理
          filledCount++;
          ruleApplied = true;
        }
      }
      // 检查是否是招聘来源相关选择框
      else if (selectLabelLower.includes('hear about') || selectLabelLower.includes('how did you') || selectLabelLower.includes('来源') || selectLabelLower.includes('source') || selectLabelLower.includes('refer')) {
          console.log("[handleUnfilledSelectElements] Detected referral source field.");
          let sourceOption = null;
          // ... (之前的招聘来源逻辑来选择 sourceOption) ...
           for (const option of validOptions) {
               const optionText = option.text.toLowerCase();
               if (optionText.includes('linkedin') || optionText.includes('领英') || optionText.includes('job board') || optionText.includes('job site') || optionText.includes('招聘网站')) {
                   sourceOption = option; break;
               }
           }
           if (!sourceOption && validOptions.length > 0) {
               sourceOption = validOptions[0];
           }
          // ---
           if (sourceOption) {
              console.log(`[handleUnfilledSelectElements] Applying referral source rule, selecting: "${sourceOption.text}"`);
              select.value = sourceOption.value;
              select.dispatchEvent(new Event('change', { bubbles: true }));
              select.setAttribute('data-auto-filled', 'true'); // 标记已被处理
              filledCount++;
              ruleApplied = true;
          }
      }
      // 检查是否是国家/地区选择框
      else if (selectLabelLower.includes('country') || selectLabelLower.includes('nation') || selectLabelLower.includes('location') || selectLabelLower.includes('国家') || selectLabelLower.includes('地区')) {
          console.log("[handleUnfilledSelectElements] Detected country/location field.");
           let countryOption = null;
           // ... (之前的国家选择逻辑来选择 countryOption) ...
            const preferredCountries = ['china', 'cn', '中国', 'united states', 'usa', 'us', '美国', 'singapore', 'sg', '新加坡', 'hong kong', 'hk', '香港'];
            for (const country of preferredCountries) {
                const matchingOption = validOptions.find(option => option.text.toLowerCase().includes(country) || option.value.toLowerCase() === country);
                if (matchingOption) {
                    countryOption = matchingOption;
                    break;
                }
            }
            if (!countryOption && validOptions.length > 0) {
                countryOption = validOptions[0];
            }
           // ---
           if (countryOption) {
              console.log(`[handleUnfilledSelectElements] Applying country rule, selecting: "${countryOption.text}"`);
              select.value = countryOption.value;
              select.dispatchEvent(new Event('change', { bubbles: true }));
              select.setAttribute('data-auto-filled', 'true'); // 标记已被处理
              filledCount++;
              ruleApplied = true;
           }
      }
      // --- 特定规则结束 ---
      
      // **如果没有任何特定规则被应用，则跳过这个下拉框**
      // 不再需要检查 isRequired 并强制选择第一个选项
      if (!ruleApplied) {
          console.log(`[handleUnfilledSelectElements] No specific rule applied for "${selectLabel}". Leaving for AI matching or user input.`);
      }
    }

    console.log(`[handleUnfilledSelectElements] Finished. Applied specific rules to ${filledCount} select elements.`);
  }
  
  // 处理单选按钮组（如工作经验年限、技能等级等）
  async function handleRadioGroups() {
    // 查找单选按钮组
    const radioGroups = document.querySelectorAll('fieldset, [role="radiogroup"], .radio-buttons-group, .jobs-easy-apply-form-section__radio-buttons');
    
    if (radioGroups.length > 0) {
      console.log(`找到 ${radioGroups.length} 个可能的单选按钮组`);
      
      for (const group of radioGroups) {
        // 获取组标题或标签
        const legend = group.querySelector('legend, h3, [role="heading"], .t-bold');
        const groupLabel = legend ? legend.textContent.trim().toLowerCase() : '';
        console.log(`单选按钮组: "${groupLabel}"`);
        
        if (!groupLabel) continue;
        
        // 获取组内的所有单选按钮
        const radioButtons = group.querySelectorAll('input[type="radio"]');
        if (radioButtons.length === 0) continue;
        
        // 根据不同类型的问题选择合适的选项
        if (groupLabel.includes('eligible') || groupLabel.includes('有资格') || 
            groupLabel.includes('可以工作') || groupLabel.includes('authorized')) {
          
          // 工作资格问题 - 通常选择"是"
          console.log("检测到工作资格相关问题，尝试选择'Yes'");
          
          // 查找"Yes"选项
          let yesOption = null;
          for (const radio of radioButtons) {
            const radioValue = radio.value.toLowerCase();
            // 使用内部版本的findLabelForElement函数
            const radioLabel = findLabelForElement(radio) || '';
            
            if (radioValue === 'yes' || radioLabel.toLowerCase() === 'yes' || 
                radioValue === 'true' || radioLabel.toLowerCase() === '是') {
              yesOption = radio;
              break;
            }
          }
          
          // 选择"Yes"选项
          if (yesOption && !yesOption.checked) {
            console.log("选中'Yes'选项");
            yesOption.checked = true;
            yesOption.click();
            yesOption.dispatchEvent(new Event('change', { bubbles: true }));
          }
        } 
        else if (groupLabel.includes('experience') || groupLabel.includes('经验') || 
                groupLabel.includes('years') || groupLabel.includes('年')) {
          
          // 经验年限问题 - 选择中间偏上的选项
          console.log("检测到经验相关问题，选择较高经验值");
          
          // 选择中间偏上的选项（比如4-6年经验）
          const middleUpperIndex = Math.min(Math.floor(radioButtons.length * 0.7), radioButtons.length - 1);
          const experienceOption = radioButtons[middleUpperIndex];
          
          if (experienceOption && !experienceOption.checked) {
            console.log(`选择经验选项 ${middleUpperIndex + 1}/${radioButtons.length}`);
            experienceOption.checked = true;
            experienceOption.click();
            experienceOption.dispatchEvent(new Event('change', { bubbles: true }));
          }
        }
        else if (groupLabel.includes('skill') || groupLabel.includes('技能') || 
                groupLabel.includes('熟练度') || groupLabel.includes('级别') ||
                groupLabel.includes('proficiency') || groupLabel.includes('level')) {
          
          // 技能级别问题 - 选择最高级别
          console.log("检测到技能级别相关问题，选择最高级别");
          
          // 选择最后一个选项（通常是最高级别）
          const highestOption = radioButtons[radioButtons.length - 1];
          
          if (highestOption && !highestOption.checked) {
            console.log(`选择最高技能级别选项 ${radioButtons.length}/${radioButtons.length}`);
            highestOption.checked = true;
            highestOption.click();
            highestOption.dispatchEvent(new Event('change', { bubbles: true }));
          }
        }
      }
    }
    
    return true;
  }
  
  // 处理LinkedIn特定的表单元素
  async function handleLinkedInSpecificFields() {
    try {
      // 示例：处理LinkedIn的技能评分滑块
      const skillSliders = document.querySelectorAll('.jobs-easy-apply-form-section__radio-buttons');
      
      if (skillSliders.length > 0) {
        console.log("找到可能的技能评分滑块，尝试选择专家级别");
        
        skillSliders.forEach(sliderContainer => {
          // 查找标题确认是技能评分
          const titleEl = sliderContainer.querySelector('h3, [role="heading"]');
          if (titleEl && (titleEl.textContent.toLowerCase().includes('skill') || 
              titleEl.textContent.includes('能力') || 
              titleEl.textContent.includes('熟练度'))) {
            // 查找最高级别选项 (通常是最后一个)
            const options = sliderContainer.querySelectorAll('input[type="radio"]');
            if (options.length > 0) {
              // 选择最后一个（通常是最高级别）
              const lastOption = options[options.length - 1];
              lastOption.click();
              lastOption.checked = true;
              lastOption.dispatchEvent(new Event('change', { bubbles: true }));
              console.log("已选择最高技能级别选项");
            }
          }
        });
      } else {
        console.log("未找到技能评分滑块");
      }
      
      // 等待任何动态内容加载
      await new Promise(resolve => setTimeout(resolve, 500));
      return true;
    } catch (error) {
      console.error("处理LinkedIn特定表单元素时出错:", error);
      return false;
    }
  }
  
  // 检查是否是提交或确认页面
  function isSubmitOrConfirmPage() {
    // 记录检查过程，帮助调试
    console.log("检查当前是否为提交或确认页面...");
    
    // 查找提交或审核按钮
    const submitButtonSelectors = [
      '.jobs-easy-apply-modal__content footer button' // 底部按钮
    ];
    
    // 检查所有可能的提交按钮
    for (const selector of submitButtonSelectors) {
      const buttons = document.querySelectorAll(selector);
      console.log(`选择器 "${selector}" 找到 ${buttons.length} 个可能的提交按钮`);
      
      for (const button of buttons) {
        if (button.offsetParent !== null) {  // 确认按钮可见
          const text = (button.textContent || '').trim().toLowerCase();
          console.log(text)
          
          // 扩大关键词匹配范围
          if (text.includes('submit') || text.includes('提交') || 
              text.includes('review') || text.includes('审核') || 
              text.includes('审阅') || text.includes('确认') || 
              text.includes('confirm') || text.includes('应用') ||
              text.includes('apply') || text.includes('发送') ||
              text.includes('send application')) {
            console.log(`找到提交/确认按钮: "${text}"`);
            return true;
          }
        }
      }
    }
    
    // 查找确认文本
    const confirmTexts = [
      'review your application', 
      '审核您的申请', 
      '确认申请', 
      '提交申请', 
      'confirm', 
      'submit', 
      '提交',
      '应用',
      'review application',
      'are you ready to submit',
      '准备好提交',
      '确认应用',
      '最后一步'
    ];
    
    // 获取页面或模态框文本
    let pageText = '';
    const modalContent = document.querySelector('.jobs-easy-apply-modal__content footer button');
    if (modalContent) {
      pageText = modalContent.textContent.toLowerCase();
    } else {
      pageText = document.body.textContent.toLowerCase();
    }

    // 查找确认文本
    console.log(pageText)
    for (const text of confirmTexts) {
      if (pageText.includes(text)) {
        console.log(`页面文本中包含确认关键词: "${text}"`);
        return true;
      }
    }
    
    // 检查是否有"提交您的申请"等标题
    const headings = document.querySelectorAll('h1, h2, h3, [role="heading"]');
    for (const heading of headings) {
      if (heading.offsetParent !== null) {
        const headingText = (heading.textContent || '').toLowerCase();
        if (headingText.includes('submit') || 
            headingText.includes('提交') || 
            headingText.includes('review') || 
            headingText.includes('审核') ||
            headingText.includes('confirm') || 
            headingText.includes('确认')) {
          console.log(`找到确认/提交相关标题: "${headingText}"`);
          return true;
        }
      }
    }
    
    // 检查是否只有单个"提交"类按钮且没有表单字段
    const primaryButtons = document.querySelectorAll('button.artdeco-button--primary:not([aria-label*="Cancel"]):not([aria-label*="取消"])');
    if (primaryButtons.length === 1) {
      const formFields = document.querySelectorAll('input:not([type="hidden"]), select, textarea');
      const visibleFormFields = Array.from(formFields).filter(el => el.offsetParent !== null);
      
      if (visibleFormFields.length <= 2) { // 允许有1-2个确认字段
        console.log("页面只有一个主要按钮且几乎没有表单字段，可能是提交页");
        return true;
      }
    }
    
    console.log("未检测到提交或确认页面特征");
    return false;
  }
  
  // 尝试提交申请
  async function attemptToSubmitApplication() {
    const submitButtonSelectors = [
      'button[aria-label*="Submit"], button[aria-label*="提交"]',
      'button.artdeco-button--primary',
      'button:not([aria-label])',
      'button[type="submit"]'
    ];
    
    for (const selector of submitButtonSelectors) {
      const buttons = document.querySelectorAll(selector);
      for (const button of buttons) {
        if (button.offsetParent !== null) {  // 确认按钮可见
          const text = button.textContent.toLowerCase();
          if (text.includes('submit') || text.includes('提交') || 
              text.includes('review') || text.includes('审核') ||
              text.includes('confirm') || text.includes('confirm') ||
              text.includes('apply') || text.includes('申请')) {
            
            console.log("找到提交按钮，点击提交申请", button);
            button.click();
            
            // 等待提交结果
            await new Promise(resolve => setTimeout(resolve, 3000));
            console.log('heieheieheihiehieh')
            // 查找可能的成功消息
            const successTexts = ['application submitted', 'applied', '申请已提交', '已申请', '申请已发送'];
            const pageText = document.body.textContent.toLowerCase();
            for (const text of successTexts) {
              if (pageText.includes(text)) {
                console.log("申请已成功提交");
                // 如果找到了关闭按钮，也视为成功
                const closeButton = findCloseButton();
                if (closeButton) {
                  console.log("找到关闭按钮，认为申请已提交");
                  closeButton.click();
                  return true;
                }
                return true;
              }
            }
            
            // 如果找到了关闭按钮，也视为成功
            const closeButton = findCloseButton();
            if (closeButton) {
              console.log("找到关闭按钮，认为申请已提交");
              closeButton.click();
              return true;
            }
            
            // 否则继续处理可能的后续步骤
            return await fillApplicationModal();
          }
        }
      }
    }
    
    console.log("未找到提交按钮");
    return false;
  }
  
  // 查找并点击"下一步"按钮
  async function findAndClickNextButton() {
    console.log("开始寻找表单中的下一步按钮...");
    
    // 扩展选择器列表
    const nextButtonSelectors = [
      'button[aria-label*="Continue"], button[aria-label*="继续"]',
      'button[aria-label*="Next"], button[aria-label*="继续下一步"]',
      'button[aria-label*="Check"], button[aria-label*="查看您的申请"]', // TODO 可能要改英文
    ];
    
    // 记录所有找到的按钮
    let allFoundButtons = [];
    
    // 首先尝试按选择器查找
    for (const selector of nextButtonSelectors) {
      const buttons = document.querySelectorAll(selector);
      console.log(`选择器 "${selector}" 找到 ${buttons.length} 个可能的按钮`);
      
      for (const button of buttons) {
        if (button.offsetParent !== null) {  // 确认按钮可见
          const text = (button.textContent || '').trim().toLowerCase();
          allFoundButtons.push({button, text});
          
          // 扩展文本匹配范围
          if (text.includes('next') || text.includes('下一步') || 
              text.includes('check') || text.includes('查看') || 
              text.includes('continue') || text.includes('继续') ||
              text.includes('submit') || text.includes('提交') ||
              text === 'go' || text === '下一页' ||
              text.includes('保存并继续') || text.includes('save') ||
              text.includes('proceed') || text.includes('forward')) {
            
            console.log(`找到下一步按钮: "${text}"`, button);
            try {
              button.click();
              console.log("成功点击了下一步按钮");
              
              // 等待页面更新
              await new Promise(resolve => setTimeout(resolve, 1800));
              return true;
            } catch (error) {
              console.error("点击下一步按钮时出错:", error);
              // 继续尝试其他按钮
            }
          }
        }
      }
    }
    
    // 如果通过文本匹配没找到，检查按钮属性和位置等其他特征
    console.log("通过文本未找到下一步按钮，尝试按位置和样式识别...");
    
    // 检查模态框底部的按钮（通常底部右侧按钮是继续/下一步）
    const modalContent = document.querySelector('.artdeco-modal__content, .jobs-easy-apply-content, [role="dialog"]');
    if (modalContent) {
      const footer = modalContent.querySelector('footer, .artdeco-modal__actionbar, .mt3, .pb3');
      if (footer) {
        const footerButtons = footer.querySelectorAll('button');
        // 通常右侧最后一个按钮是下一步
        if (footerButtons.length > 0) {
          const lastButton = footerButtons[footerButtons.length - 1];
          if (lastButton && lastButton.offsetParent !== null && 
              !lastButton.disabled && 
              !lastButton.classList.contains('artdeco-button--muted')) {
            
            console.log("基于位置找到可能的下一步按钮（底部最后一个按钮）");
            try {
              lastButton.click();
              await new Promise(resolve => setTimeout(resolve, 1800));
              return true;
            } catch (error) {
              console.error("点击基于位置的按钮时出错:", error);
            }
          }
        }
      }
    }
    
    // 记录所有找到但未点击的按钮，帮助调试
    if (allFoundButtons.length > 0) {
      console.log("找到以下按钮但未匹配为下一步按钮:");
      allFoundButtons.forEach((item, index) => {
        console.log(`按钮 ${index+1}: "${item.text}"`, item.button);
      });
    }
    
    console.log("未找到下一步按钮，可能已是最后一页表单");
    return false;
  }
  
  // 关闭申请模态框
  async function closeApplicationModal() {
    console.log("尝试关闭申请模态框");
    
    // 查找关闭按钮
    const closeButton = findCloseButton();
    if (closeButton) {
      console.log("找到关闭按钮，点击关闭");
      closeButton.click();
      
      // 等待确认放弃弹窗
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // 查找确认放弃按钮
      const abandonButton = findAbandonButton();
      if (abandonButton) {
        console.log("找到放弃按钮，确认关闭");
        abandonButton.click();
      }
      
      return true;
    }
    
    console.log("未找到关闭按钮");
    return false;
  }

  // **查找放弃按钮**
  function findAbandonButton() {
      const selectors = 'button.artdeco-modal__confirm-dialog-btn, button[data-control-name="discard_application_confirm_btn"]';
      const abandonButtons = document.querySelectorAll(selectors);
      for (const btn of abandonButtons) {
          const text = btn.textContent?.trim().toLowerCase() || '';
          if (btn.offsetParent !== null && (text.includes('discard') || text.includes('放弃') || text.includes('cancel') || text.includes('取消'))) { return btn; }
      }
      // 后备：直接检查文本
      const allButtons = document.querySelectorAll('button');
      for(const btn of allButtons) {
          const text = btn.textContent?.trim().toLowerCase() || '';
           if (btn.offsetParent !== null && (text.includes('discard') || text.includes('放弃') || text.includes('cancel') || text.includes('取消'))) { return btn; }
      }
      return null;
  }
  
  // 显示/隐藏设置
  batchApplyButton.addEventListener('click', () => {
    batchApplySettings.style.display = batchApplySettings.style.display === 'none' ? 'block' : 'none';
  });
  
  // **开始批量投递**
  startBatchApplyButton.addEventListener('click', async () => {
    const intervalSec = parseInt(applyInterval.value) || 5;
    isBatchApplying = true;
    startBatchApplyButton.style.display = 'none';
    stopBatchApplyButton.style.display = 'inline-block';
    batchStatusDiv.textContent = '开始查找快速申请职位...';

    const easyApplyItems = await findAllEasyApplyItems();
    let itemsToProcess = easyApplyItems;
    batchStatusDiv.textContent = `查找到 ${itemsToProcess.length} 个快速申请职位，准备处理...`;
    console.log(`将处理 ${itemsToProcess.length} 个职位项:`, itemsToProcess);

    let processedCount = 0;
    let currentItemIndex = 0;
    let totalFoundCount = itemsToProcess.length; // 记录初始找到的数量

    // **处理下一个项目**
    async function processNextItem() {
       if (!isBatchApplying) { 
           // **传递包含数量的消息**
           finishBatchApply(`批量投递已停止。本次共处理了 ${processedCount} 个职位。`); 
           return; 
       }

      if (currentItemIndex >= itemsToProcess.length) {
        console.log("当前页面列表处理完毕，尝试翻页...");
        await tryGoToNextPage(); 
        return; 
      }

      const itemElement = itemsToProcess[currentItemIndex];
      batchStatusDiv.textContent = `正在处理第 ${processedCount + 1} 个职位... (本页找到 ${itemsToProcess.length}个)`;
      console.log(`--- 开始处理第 ${processedCount + 1} 个职位 ---`, itemElement);

      try {
        if (!isBatchApplying) throw new Error("用户停止");
        console.log("点击左侧列表项...");
        itemElement.click();

        await new Promise(resolve => setTimeout(resolve, 2000));
        if (!isBatchApplying) throw new Error("用户停止");

        const rightButton = findRightApplyButton();
        if (rightButton) {
          console.log("找到右侧申请按钮，点击...", rightButton);
          rightButton.click();

          // **替换之前的关闭逻辑，改为调用表单填充**
          await new Promise(resolve => setTimeout(resolve, 2500)); // 等待 Modal 出现
          if (!isBatchApplying) throw new Error("用户停止");

          console.log("尝试填充申请表单...");
          const fillSuccess = await fillApplicationModal(); // 调用新的填充函数

          if (fillSuccess) {
             console.log(`职位 ${processedCount + 1} 表单处理成功（或尝试提交）。`);
          } else {
             console.log(`职位 ${processedCount + 1} 表单处理失败或未找到表单。`);
             // 可以在这里添加失败后的处理，比如尝试关闭窗口
          }
        } else { console.log("未找到右侧申请按钮，跳过此职位。"); }

      } catch (error) {
          if (error.message === "用户停止") { 
              // **传递包含数量的消息**
              finishBatchApply(`批量投递已停止。本次共处理了 ${processedCount} 个职位。`); 
              return; 
          }
          else { console.error(`处理第 ${processedCount + 1} 个职位时出错:`, error); }
      }

      if (!isBatchApplying) { 
          // **传递包含数量的消息**
          finishBatchApply(`批量投递已停止。本次共处理了 ${processedCount} 个职位。`); 
          return; 
      }

      processedCount++;
      currentItemIndex++;

      batchStatusDiv.textContent = `第 ${processedCount} 个处理完毕，等待 ${intervalSec} 秒...`;
      await new Promise(resolve => setTimeout(resolve, intervalSec * 1000));
      processNextItem();
    }

    // **尝试翻页**
    async function tryGoToNextPage() {
        if (!isBatchApplying) { 
            // **传递包含数量的消息**
            finishBatchApply(`批量投递已停止。本次共处理了 ${processedCount} 个职位。`); 
            return; 
        }
        batchStatusDiv.textContent = "正在查找下一页按钮...";
        let nextPageButton = null;
        const paginationContainer = document.querySelector('.jobs-search-pagination, .artdeco-pagination__pages');
        
        if (paginationContainer) {
            console.log("找到分页控件:", paginationContainer);
            const selectors = 'button[aria-label*="Next"], button[aria-label*="下一页"], button.jobs-search-pagination__button--next';
            const potentialNextButtons = paginationContainer.querySelectorAll(selectors);
            console.log(`通过选择器找到 ${potentialNextButtons.length} 个可能的下一页按钮`);
            for (const btn of potentialNextButtons) {
                 const isDisabled = btn.disabled || btn.classList.contains('artdeco-button--disabled');
                 if (btn.offsetParent !== null && !isDisabled) { nextPageButton = btn; console.log("找到可用的下一页按钮:", nextPageButton); break; }
            }
            if (!nextPageButton) {
                console.log("选择器未匹配，尝试检查按钮文本...");
                const allButtons = paginationContainer.querySelectorAll('button');
                for (const btn of allButtons) {
                    const text = btn.textContent?.trim() || '';
                    const isDisabled = btn.disabled || btn.classList.contains('artdeco-button--disabled');
                    if (btn.offsetParent !== null && !isDisabled && (text === '下一页' || text.toLowerCase() === 'next')) {
                        nextPageButton = btn;
                        console.log("通过文本找到可用的下一页按钮:", nextPageButton);
                        break;
                    }
                }
            }
        } else { console.log("未找到分页控件。"); }

        if (nextPageButton) {
            // **如果找到，点击并开始处理新页面**
            console.log("点击下一页按钮...");
            nextPageButton.click();
            batchStatusDiv.textContent = "已点击下一页，等待加载...";
            await new Promise(resolve => setTimeout(resolve, 4000));
            if (!isBatchApplying) { 
                // **传递包含数量的消息**
                finishBatchApply(`批量投递已停止。本次共处理了 ${processedCount} 个职位。`); 
                return; 
            }
            await startProcessingNewPage(); 
        } else {
            // **如果找不到，才真正结束**
            console.log("未找到可用的下一页按钮，批量投递结束。");
            finishBatchApply(`所有页面处理完毕，共处理了 ${processedCount} 个职位。`);
        }
    }

    // **开始处理新加载的页面**
    async function startProcessingNewPage() {
        if (!isBatchApplying) { 
            // **传递包含数量的消息**
            finishBatchApply(`批量投递已停止。本次共处理了 ${processedCount} 个职位。`); 
            return; 
        }
        batchStatusDiv.textContent = "重新查找新页面上的快速申请职位...";
        console.log("--- 开始查找新页面 --- ");
        const newItems = await findAllEasyApplyItems();
        itemsToProcess = newItems; // 更新列表
        currentItemIndex = 0; // 重置索引
        totalFoundCount = newItems.length; // 更新找到的总数
        
        if (itemsToProcess.length > 0) {
             batchStatusDiv.textContent = `在新页面找到 ${itemsToProcess.length} 个职位，继续处理...`;
             console.log(`在新页面找到 ${itemsToProcess.length} 个职位:`, itemsToProcess);
             // **直接调用 processNextItem 处理新列表**
             processNextItem(); 
        } else {
             // **如果新页面没有项目，也需要尝试继续翻页**
             console.log("新页面未找到可处理的快速申请职位，尝试继续翻页...");
             await tryGoToNextPage(); // 再次调用翻页，而不是结束
        }
    }

    // **完成处理** 
    function finishBatchApply(finalMessage) {
        isBatchApplying = false;
        startBatchApplyButton.style.display = 'inline-block';
        stopBatchApplyButton.style.display = 'none';
        startBatchApplyButton.disabled = false;
        // **直接使用传入的消息**
        batchStatusDiv.textContent = finalMessage || "批量投递流程结束。";
        console.log(finalMessage || "批量投递流程结束");
    }

    // **停止按钮监听** (只设置标志)
    stopBatchApplyButton.addEventListener('click', () => {
        console.log("用户点击停止按钮。");
        isBatchApplying = false;
        batchStatusDiv.textContent = "正在停止...";
    });

    // **启动流程**
    if (itemsToProcess.length > 0) {
      processNextItem();
    } else {
      console.log("初始页面未找到职位，尝试翻页...");
      // **修改：如果初始找不到，也传递包含数量的消息**
      await tryGoToNextPage(); // tryGoToNextPage 会在找不到下一页时调用 finishBatchApply
      // 如果 tryGoToNextPage 立即发现没有下一页，需要确保 finishBatchApply 被调用
      if (!nextPageButton) { // 再次检查以防万一
          finishBatchApply(`未在初始页面找到职位，且无下一页。共处理了 ${processedCount} 个职位。`);
      }
    }
  });
}

// --- 初始化并运行 ---
function initialize() {
  // 全局变量，用于跟踪提示状态
  window.resumeUploadNoticeDisplayed = false;
  window.currentResumeNoticeElement = null;
  
  const { sidebar, statusMessage, resumeFileInput, fillFormButton } = createAndInjectSidebar();
  setupFileUpload(resumeFileInput, statusMessage);
  setupFormFilling(fillFormButton, statusMessage);
  setupBatchApplyFeature();
  
  // 添加页面导航和模态框变化监听器
  setupModalAndNavigationObserver();
  
  console.log("Resume auto-fill sidebar initialized.");
}

// 监听模态框变化和页面导航
function setupModalAndNavigationObserver() {
  // 监听URL变化
  let lastUrl = location.href;
  new MutationObserver(() => {
    const url = location.href;
    if (url !== lastUrl) {
      lastUrl = url;
      console.log('URL changed, cleaning up any notices');
      cleanupResumeUploadNotice();
    }
  }).observe(document, {subtree: true, childList: true});
  
  // 监听模态框关闭
  document.addEventListener('click', (event) => {
    // 检查是否点击了关闭按钮
    if (event.target.closest('.artdeco-modal__dismiss, button[aria-label*="Dismiss"], button[aria-label*="关闭"]')) {
      console.log('Modal close button clicked, cleaning up notices');
      cleanupResumeUploadNotice();
    }
  });
}

// 清理所有简历上传提示
function cleanupResumeUploadNotice() {
  if (window.currentResumeNoticeElement) {
    try {
      window.currentResumeNoticeElement.remove();
    } catch (e) {
      console.log('Error removing notice element:', e);
    }
    window.currentResumeNoticeElement = null;
  }
  window.resumeUploadNoticeDisplayed = false;
}

if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', initialize); } 
else { initialize(); }

// --- 消息监听 ---
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("Content script received message:", message.type);
  if (message.type === 'UPDATE_STATUS') {
    const statusMessage = document.getElementById('status-message');
    if (statusMessage) { statusMessage.textContent = message.payload; }
    sendResponse({ success: true });
  }
}); 

// 增强：查找并填充所有下拉选择框
async function fillSelectElements() {
  console.log("尝试查找并填充所有下拉选择框...");
  
  // 寻找所有下拉选择框
  const selectElements = document.querySelectorAll('select');
  let filledCount = 0;
  
  for (const select of selectElements) {
    if (select.offsetParent === null) continue; // 跳过不可见元素
    
    // 检查元素是否已被处理
    if (select.getAttribute('data-autofill-processed')) {
      console.log(`选择框已处理过，跳过: ${select.name || select.id}`);
      continue;
    }
    
    // 获取选择框的标签
    const selectLabel = findLabelForElement(select) || '';
    const selectLabelLower = selectLabel.toLowerCase();
    const selectId = select.id || '';
    const selectName = select.name || '';
    
    console.log(`处理下拉选择框: "${selectLabel}" (ID: ${selectId}, Name: ${selectName})`);
    
    // 基于标签或ID确定选择框的类型
    let selectedValue = null;
    
    // 工作权限/签证相关选择框
    if (selectLabelLower.includes('work') && 
        (selectLabelLower.includes('authorization') || selectLabelLower.includes('visa') || 
         selectLabelLower.includes('permit') || selectLabelLower.includes('right') || 
         selectLabelLower.includes('eligible') || selectLabelLower.includes('eligibility') ||
         selectLabelLower.includes('status'))) {
      
      console.log("检测到工作权限/签证相关选择框");
      // 寻找表示公民/永久居民/有工作权的选项
      for (const option of select.options) {
        const optionText = option.text.toLowerCase();
        if (optionText.includes('citizen') || 
            optionText.includes('公民') || 
            optionText.includes('permanent resident') || 
            optionText.includes('永久居民') ||
            optionText.includes('authorized') || 
            optionText.includes('有权')) {
          selectedValue = option.value;
          break;
        }
      }
      
      // 如果找不到明确的公民/居民选项，选择第一个非空选项
      if (!selectedValue) {
        for (const option of select.options) {
          if (option.value && option.value !== 'null' && option.value !== 'undefined') {
            selectedValue = option.value;
            break;
          }
        }
      }
    }
    // 听说来源相关选择框
    else if (selectLabelLower.includes('hear') || 
             selectLabelLower.includes('来源') || 
             selectLabelLower.includes('source') || 
             selectLabelLower.includes('refer')) {
      
      console.log("检测到听说来源相关选择框");
      // 寻找与LinkedIn相关的选项
      for (const option of select.options) {
        const optionText = option.text.toLowerCase();
        if (optionText.includes('linkedin') || 
            optionText.includes('领英') || 
            optionText.includes('job board') || 
            optionText.includes('job site') ||
            optionText.includes('招聘网站')) {
          selectedValue = option.value;
          break;
        }
      }
      
      // 如果找不到，选择第一个非空选项
      if (!selectedValue) {
        for (const option of select.options) {
          if (option.value && option.value !== 'null' && option.value !== 'undefined') {
            selectedValue = option.value;
            break;
          }
        }
      }
    }
    // 经验年限相关选择框
    else if (selectLabelLower.includes('experience') || 
             selectLabelLower.includes('years') || 
             selectLabelLower.includes('经验') || 
             selectLabelLower.includes('年')) {
      
      console.log("检测到经验年限相关选择框");
      // 选择中高级别的经验选项 (不选最低也不选最高)
      const validOptions = Array.from(select.options)
        .filter(option => option.value && option.value !== 'null' && option.value !== 'undefined');
      
      if (validOptions.length > 0) {
        // 选择中高位置的经验选项 (约70%位置)
        const indexToSelect = Math.min(
          Math.floor(validOptions.length * 0.7), 
          validOptions.length - 1
        );
        selectedValue = validOptions[indexToSelect].value;
      }
    }
    // 任何其他类型的选择框，选择第一个有效选项
    else {
      console.log("其他类型选择框，选择有效选项");
      for (const option of select.options) {
        if (option.value && option.value !== 'null' && option.value !== 'undefined') {
          selectedValue = option.value;
          break;
        }
      }
    }
    
    // 设置选择的值
    if (selectedValue) {
      console.log(`为选择框 "${selectLabel}" 选择值: ${selectedValue}`);
      select.value = selectedValue;
      select.dispatchEvent(new Event('change', { bubbles: true }));
      select.setAttribute('data-autofill-processed', 'true');
      filledCount++;
    } else {
      console.log(`未能为选择框 "${selectLabel}" 找到合适的选项`);
    }
  }
  
  console.log(`完成下拉选择框处理，成功填充 ${filledCount}/${selectElements.length} 个选择框`);
  return filledCount > 0;
}

// 获取申请表单中的可见表单字段
function getApplicationFormFields() {
  // 尝试找到模态框容器
  const modalContainer = document.querySelector('.jobs-easy-apply-content, .artdeco-modal__content, [role="dialog"]');
  if (!modalContainer) {
    console.log("未找到模态框容器");
    return [];
  }
  
  console.log("找到模态框容器，开始查找表单字段");
  const fields = [];
  
  // 查找常见表单元素
  const formElements = modalContainer.querySelectorAll('input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="reset"]), textarea, select');
  
  formElements.forEach((element, index) => {
    // 检查元素是否可见
    if (element.offsetWidth > 0 || element.offsetHeight > 0 || element.getClientRects().length > 0) {
      const fieldInfo = {
        fieldId: `modal_field_${index}`,
        tagName: element.tagName.toLowerCase(),
        type: element.type?.toLowerCase() || null,
        name: element.name || null,
        id: element.id || null,
        placeholder: element.placeholder || null,
        ariaLabel: element.getAttribute('aria-label') || null,
        // 尝试找到相关联的标签
        label: findLabelForModalElement(element) || null,
      };
      fields.push(fieldInfo);
      
      // 添加临时属性用于之后找回元素
      element.setAttribute('data-autofill-modal-id', fieldInfo.fieldId);
    }
  });
  
  console.log("在模态框中找到的表单字段:", fields);
  return fields;
}

// 为模态框元素查找关联的标签
function findLabelForModalElement(element) {
  // 查找直接包裹元素的标签
  const parentLabel = element.closest('label');
  if (parentLabel) {
    const labelClone = parentLabel.cloneNode(true);
    const inputInClone = labelClone.querySelector(`#${element.id}, [name="${element.name}"]`);
    if(inputInClone) inputInClone.remove();
    return labelClone.textContent.trim();
  }
  
  // 查找for属性匹配的标签
  if (element.id) {
    const label = document.querySelector(`label[for="${element.id}"]`);
    if (label) {
      return label.textContent.trim();
    }
  }
  
  // 查找最近的前置兄弟元素
  let currentEl = element;
  while (currentEl.previousElementSibling) {
    currentEl = currentEl.previousElementSibling;
    if (currentEl.tagName === 'LABEL' || 
        currentEl.classList.contains('jobs-easy-apply-form-element__label') ||
        currentEl.classList.contains('artdeco-label') ||
        currentEl.getAttribute('role') === 'heading') {
      return currentEl.textContent.trim();
    }
  }
  
  // 查找父容器前面的标签元素
  const formElementContainer = element.closest('div.jobs-easy-apply-form-element, div.jobs-easy-apply-form-section, div.form-field');
  if (formElementContainer) {
    const labelElement = formElementContainer.querySelector('label, [role="heading"], h3, .jobs-easy-apply-form-element__label, .artdeco-label');
    if (labelElement) {
      return labelElement.textContent.trim();
    }
  }
  
  return null;
}

// 从存储中获取简历数据
function getResumeDataFromStorage() {
  return new Promise(resolve => {
    chrome.storage.local.get(['resumeData'], result => {
      if (chrome.runtime.lastError) {
        console.error("获取简历数据失败:", chrome.runtime.lastError);
        resolve(null);
      } else {
        resolve(result.resumeData || null);
      }
    });
  });
}

// 匹配表单字段和简历数据
function matchFieldsWithResume(formFields, resumeData) {
  return new Promise((resolve, reject) => {
    try {
      // 收集完整的表单数据，包括选择框和单选按钮组
      const enhancedFormFields = collectAllFormElements(formFields);
      
      chrome.runtime.sendMessage({
        type: 'MATCH_FIELDS_WITH_RESUME',
        payload: {
          formFields: enhancedFormFields,
          resumeData: resumeData
        }
      }, response => {
        if (chrome.runtime.lastError) {
          console.error("字段匹配请求失败:", chrome.runtime.lastError);
          reject(chrome.runtime.lastError);
        } else if (response && response.success && response.payload) {
          resolve(response.payload);
        } else {
          console.error("字段匹配响应错误:", response?.error || "未知错误");
          reject(new Error(response?.error || "匹配失败"));
        }
      });
    } catch (error) {
      console.error("匹配字段时发生错误：", error);
      reject(error);
    }
  });
}

// 收集所有表单元素，包括选择框和单选按钮组
function collectAllFormElements(initialFields) {
  console.log("收集所有表单元素，准备进行AI匹配...");
  
  // 使用初始字段作为基础
  const allFields = [...initialFields];
  const fieldIds = new Set(initialFields.map(field => field.fieldId));
  
  // 查找模态框容器
  const modalContainer = document.querySelector('.artdeco-modal__content, .jobs-easy-apply-content, [role="dialog"]');
  if (!modalContainer) {
    console.log("未找到模态框容器，无法收集额外字段");
    return initialFields;
  }
  
  // 收集所有下拉选择框
  const selectElements = modalContainer.querySelectorAll('select:not([data-autofill-processed])');
  selectElements.forEach((select, index) => {
    if (select.offsetParent === null) return; // 跳过不可见元素
    
    // 检查是否已被我们主动设置过（而不仅仅是有值）
    const hasBeenFilled = select.getAttribute('data-auto-filled') === 'true';
    
    if (hasBeenFilled) {
      console.log(`跳过已被主动设置过的选择框: ${select.name || select.id}`);
      return;
    }
    
    // 获取选择框的标签
    const selectLabel = findLabelForElement(select) || '';
    const selectId = select.id || '';
    const selectName = select.name || '';
    
    // 收集select的所有可选项
    const allOptions = Array.from(select.options);
    
    // 过滤掉占位选项，通常是第一个值为空或显示"Select an option"的选项
    const validOptions = allOptions.filter(option => {
      const optionValue = option.value;
      const optionText = option.text.trim().toLowerCase();
      
      return optionValue && 
             optionValue !== 'null' && 
             optionValue !== 'undefined' && 
             optionValue !== 'select an option' &&
             !optionText.includes('select an option') &&
             !optionText.includes('select') &&
             !optionText.includes('please select') &&
             !optionText.includes('请选择') &&
             optionText !== '';
    }).map(option => ({
      value: option.value,
      text: option.text.trim()
    }));
    
    console.log(`选择框 "${selectLabel || selectName || selectId}" 有 ${allOptions.length} 个选项，${validOptions.length} 个有效选项`);
    
    // 检查是否是选择国家地区代码的下拉框，直接处理而不加入AI匹配
    if (selectLabel.toLowerCase().includes('country code') || 
        selectLabel.toLowerCase().includes('国家代码') || 
        selectName.toLowerCase().includes('country')) {
      console.log(`检测到国家代码选择框：${selectLabel || selectName}`);
      // 为中国用户设置 +86
      const chinaOption = allOptions.find(option => 
        option.text.toLowerCase().includes('china') || 
        option.text.includes('中国') || 
        option.text.includes('+86')
      );
      if (chinaOption) {
        select.value = chinaOption.value;
        select.dispatchEvent(new Event('change', { bubbles: true }));
        select.setAttribute('data-auto-filled', 'true');
        console.log(`自动选择中国国家代码: ${chinaOption.text}`);
        return; // 已直接处理，不需要加入AI匹配
      }
    }
    
    // 如果没有有效选项，记录警告
    if (validOptions.length === 0) {
      console.warn(`警告: 选择框 "${selectLabel || selectName || selectId}" 没有找到有效选项`);
      // 仍然添加所有原始选项，供AI参考
      validOptions.push(...allOptions.map(option => ({
        value: option.value,
        text: option.text.trim()
      })));
    }
    
    // 创建唯一ID
    const fieldId = `select_${index}_${Date.now()}`;
    
    // 添加到字段列表，包含完整的选项信息
    allFields.push({
      fieldId: fieldId,
      tagName: 'select',
      type: 'select',
      name: selectName,
      id: selectId,
      label: selectLabel,
      options: validOptions,
      elementType: 'select',
      isRequired: select.required || selectLabel.includes('*') || select.hasAttribute('aria-required')
    });
    
    // 标记ID用于后续查找
    select.setAttribute('data-ai-field-id', fieldId);
  });
  
  // 收集所有单选按钮组
  const radioGroups = modalContainer.querySelectorAll('fieldset, [role="radiogroup"], .radio-buttons-group');
  radioGroups.forEach((group, groupIndex) => {
    // 获取组标题或标签
    const legend = group.querySelector('legend, h3, [role="heading"], .t-bold');
    const groupLabel = legend ? legend.textContent.trim() : '';
    
    if (!groupLabel) return;
    
    // 获取组内的所有单选按钮
    const radioButtons = group.querySelectorAll('input[type="radio"]');
    if (radioButtons.length === 0) return;
    
    // 检查是否已有选中的按钮
    let hasChecked = false;
    radioButtons.forEach(radio => {
      if (radio.checked) hasChecked = true;
    });
    
    if (hasChecked) {
      console.log(`跳过已有选择的单选按钮组: "${groupLabel}"`);
      return;
    }
    
    // 获取所有选项值
    const options = Array.from(radioButtons).map(radio => {
      const radioLabel = findLabelForElement(radio) || '';
      return {
        value: radio.value,
        text: radioLabel || radio.value
      };
    });
    
    // 创建唯一ID
    const fieldId = `radiogroup_${groupIndex}_${Date.now()}`;
    
    // 添加到字段列表
    allFields.push({
      fieldId: fieldId,
      tagName: 'fieldset',
      type: 'radio-group',
      name: `radiogroup_${groupIndex}`,
      id: group.id || '',
      label: groupLabel,
      options: options,
      elementType: 'radio-group'
    });
    
    // 标记组和按钮用于后续查找
    group.setAttribute('data-ai-field-id', fieldId);
    radioButtons.forEach(radio => {
      radio.setAttribute('data-ai-group-id', fieldId);
    });
  });
  
  // 收集未处理的输入框
  const textInputs = modalContainer.querySelectorAll('input[type="text"]:not([data-autofill-modal-id]), input[type="email"]:not([data-autofill-modal-id]), input[type="tel"]:not([data-autofill-modal-id]), textarea:not([data-autofill-modal-id])');
  textInputs.forEach((input, index) => {
    if (input.offsetParent === null) return; // 跳过不可见元素
    
    // 检查是否已被我们主动设置过（而不仅仅是有值）
    const hasBeenFilled = input.getAttribute('data-auto-filled') === 'true';
    
    if (hasBeenFilled) {
      console.log(`跳过已被主动设置过的输入框: ${input.name || input.id}`);
      return;
    }
    
    // 获取输入框的标签
    const inputLabel = findLabelForElement(input) || '';
    const inputId = input.id || '';
    const inputName = input.name || '';
    
    // 检查是否是手机号输入框
    if (inputLabel.toLowerCase().includes('phone') || 
        inputLabel.toLowerCase().includes('mobile') || 
        inputLabel.toLowerCase().includes('电话') || 
        inputLabel.toLowerCase().includes('手机') ||
        inputName.toLowerCase().includes('phone') ||
        inputId.toLowerCase().includes('phone')) {
      console.log(`检测到手机号输入框: ${inputLabel || inputName}`);
      // 不进行AI匹配，使用专门逻辑处理手机号
      return;
    }
    
    // 创建唯一ID
    const fieldId = `input_${index}_${Date.now()}`;
    
    // 添加到字段列表
    allFields.push({
      fieldId: fieldId,
      tagName: input.tagName.toLowerCase(),
      type: input.type,
      name: inputName,
      id: inputId,
      placeholder: input.placeholder || null,
      label: inputLabel,
      elementType: 'input'
    });
    
    // 标记ID用于后续查找
    input.setAttribute('data-ai-field-id', fieldId);
  });
  
  console.log(`收集到总共 ${allFields.length} 个表单字段，其中初始字段 ${initialFields.length} 个，额外字段 ${allFields.length - initialFields.length} 个`);
  return allFields;
}

// 恢复之前填充的表单值
function recoverFilledValues() {
  if (!window.filledFieldValues || Object.keys(window.filledFieldValues).length === 0) {
    return 0;
  }
  
  console.log("尝试恢复之前填充的表单值");
  let recoveredCount = 0;
  
  // 查找所有表单元素
  const modalContainer = document.querySelector('.artdeco-modal__content, .jobs-easy-apply-content, [role="dialog"]');
  if (!modalContainer) return 0;
  
  // 恢复select元素的值
  const selectElements = modalContainer.querySelectorAll('select:not([data-auto-filled="true"])');
  selectElements.forEach(select => {
    if (select.offsetParent === null) return; // 跳过不可见元素
    
    // 尝试查找之前填充的值
    const selectId = select.id || '';
    const selectName = select.name || '';
    
    if (selectId && window.filledFieldValues[selectId]) {
      console.log(`恢复select元素(ID=${selectId})的值: ${window.filledFieldValues[selectId]}`);
      fillSelectElement(select, window.filledFieldValues[selectId]);
      recoveredCount++;
    } else if (selectName && window.filledFieldValues[selectName]) {
      console.log(`恢复select元素(Name=${selectName})的值: ${window.filledFieldValues[selectName]}`);
      fillSelectElement(select, window.filledFieldValues[selectName]);
      recoveredCount++;
    }
  });
  
  // 恢复input和textarea元素的值
  const inputElements = modalContainer.querySelectorAll('input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="reset"]):not([data-auto-filled="true"]), textarea:not([data-auto-filled="true"])');
  inputElements.forEach(input => {
    if (input.offsetParent === null) return; // 跳过不可见元素
    
    // 尝试查找之前填充的值
    const inputId = input.id || '';
    const inputName = input.name || '';
    
    if (inputId && window.filledFieldValues[inputId]) {
      console.log(`恢复input元素(ID=${inputId})的值: ${window.filledFieldValues[inputId]}`);
      fillInputElement(input, window.filledFieldValues[inputId]);
      recoveredCount++;
    } else if (inputName && window.filledFieldValues[inputName]) {
      console.log(`恢复input元素(Name=${inputName})的值: ${window.filledFieldValues[inputName]}`);
      fillInputElement(input, window.filledFieldValues[inputName]);
      recoveredCount++;
    }
  });
  
  return recoveredCount;
}