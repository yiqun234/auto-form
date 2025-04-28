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
      z-index: 99999;
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
    .sidebar-button:disabled {
        background: #ccc;
        cursor: not-allowed;
    }
    #status-message {
      margin: 10px 0;
      font-style: italic;
      font-size: 14px;
    }
    .settings-link {
        display: block;
        margin-top: 10px;
        font-size: 14px;
        color: #0073b1;
        cursor: pointer;
        text-decoration: underline;
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
    <h2 style="margin: 0; font-size: 18px;">智能表单填充</h2>
    <button id="resume-autofill-close" style="background: none; border: none; font-size: 20px; cursor: pointer;">×</button>
  `;
  sidebar.appendChild(header);

  // 创建侧边栏内容 - 更新
  const content = document.createElement('div');
  content.id = 'resume-autofill-sidebar-content';
  content.innerHTML = `
    <div class="sidebar-section">
      <h3>设置</h3>
      <p style="font-size: 14px; margin-top: 0;">请先在选项页面设置 API Key 和提供简历内容。</p>
      <span id="open-options-link" class="settings-link">打开设置页面</span>
      <div id="status-message">请先完成设置</div> 
    </div>

    <div class="sidebar-section">
      <button id="fill-form-button" class="sidebar-button" disabled>填充当前页面表单</button>
      <button id="batch-apply-button" class="sidebar-button" style="margin-top: 10px; background-color: #4CAF50;">批量自动投递简历 (LinkedIn)</button> 
    </div>

    <div class="sidebar-section" id="workday-controls" style="border-top: 1px solid #eee; padding-top: 15px; display: none;"> 
      <h3 style="margin-bottom: 5px;">Workday 页面</h3>
      <button id="start-workday-batch" class="sidebar-button" style="background-color: #FF9800;" disabled>开始处理当前列表页</button>
      <button id="stop-workday-batch" class="sidebar-button" style="background-color: #f44336; display: none; margin-left: 10px;">停止处理</button>
      <button id="manual-fill-workday" class="sidebar-button" style="background-color: #2196F3; margin-top: 10px;" disabled>手动填充当前表单</button>
      <div style="margin-top: 10px; margin-bottom: 5px; display: none;"> 
        <label for="workday-apply-interval" style="display: block; margin-bottom: 3px; font-size: 14px;">处理间隔(秒):</label>
        <input type="number" id="workday-apply-interval" min="1" max="30" value="2" style="width: 60px; padding: 3px; font-size: 14px;">
      </div>
      <div id="workday-batch-status" style="margin-top: 10px; font-size: 14px;"></div>
    </div>

    <div class="sidebar-section" id="batch-apply-settings" style="display: none;">
      <h3>批量投递设置 (LinkedIn)</h3>
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
        请先在选项页设置 API Key 和粘贴您的简历内容。<br><br>
        设置完成后，点击"填充当前页面表单"按钮，AI 将分析简历并尝试填充页面上的表单字段。<br><br>
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

  // 添加打开选项页面链接逻辑
  const optionsLink = document.getElementById('open-options-link');
  if (optionsLink) {
      optionsLink.addEventListener('click', () => {
        chrome.runtime.sendMessage({ type: 'OPEN_OPTIONS_PAGE' });
      });
  }

  // 更新返回的元素引用，移除 resumeFileInput
  return {
    sidebar,
    toggleButton,
    statusMessage: document.getElementById('status-message'),
    fillFormButton: document.getElementById('fill-form-button'),
    batchApplyButton: document.getElementById('batch-apply-button'), 
    startWorkdayBatchButton: document.getElementById('start-workday-batch'),
    stopWorkdayBatchButton: document.getElementById('stop-workday-batch'),
    manualFillWorkdayButton: document.getElementById('manual-fill-workday'),
    workdayBatchStatusDiv: document.getElementById('workday-batch-status'),
    workdayApplyIntervalInput: document.getElementById('workday-apply-interval')
  };
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
        // 尝试找到关联的标签
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

// 更新表单填充功能的设置
function setupFormFilling(fillFormButton, statusMessage) {
  if (!fillFormButton) return;
  
  // 检查API Key和简历数据是否已设置
  checkResumeAndApiSettings(statusMessage, fillFormButton);
  
  // 添加点击事件监听
  fillFormButton.addEventListener('click', async () => {
    if (fillFormButton.disabled) {
      statusMessage.textContent = '请先在选项页面设置API Key和简历内容';
      return;
    }
    
    try {
      statusMessage.textContent = '正在收集表单字段...';
      
      // 收集页面上可见的表单字段
      const fields = getVisibleFormFields();
      if (!fields || fields.length === 0) {
        statusMessage.textContent = '未在页面上找到表单字段';
        return;
      }
      
      statusMessage.textContent = `找到 ${fields.length} 个表单字段，正在请求AI匹配...`;
      
      // 将表单字段发送到background script请求匹配，现在无需传递resumeData
      chrome.runtime.sendMessage({
        type: 'MATCH_FIELDS_WITH_RESUME',
        payload: {
          formFields: fields
        }
      }, (matchResponse) => {
        if (chrome.runtime.lastError) {
          statusMessage.textContent = `匹配请求失败: ${chrome.runtime.lastError.message}`;
          console.error(chrome.runtime.lastError);
          return;
        }
        
        if (!matchResponse || !matchResponse.success) {
          statusMessage.textContent = `匹配失败: ${matchResponse?.error || '未知错误'}`;
          return;
        }
        
        const fieldMapping = matchResponse.fieldMapping;
        statusMessage.textContent = '正在填充表单...';
        
        // 使用匹配结果填充表单
        let filledCount = 0;
        for (const fieldId in fieldMapping) {
          if (fillFormField(fieldId, fieldMapping[fieldId])) {
            filledCount++;
          }
        }
        
        statusMessage.textContent = `表单填充完成！成功填充 ${filledCount} 个字段。`;
      });
    } catch (error) {
      statusMessage.textContent = `处理出错: ${error.message}`;
      console.error("Form filling error:", error);
    }
  });
}

// 检查API Key和简历数据是否已设置
function checkResumeAndApiSettings(statusMessage, fillFormButton) {
  chrome.storage.local.get(['openaiApiKey', 'resumeData'], (result) => {
    const hasApiKey = !!result.openaiApiKey;
    const hasResumeData = !!result.resumeData;
    
    if (!hasApiKey && !hasResumeData) {
      statusMessage.textContent = '请先在选项页面设置API Key和简历内容';
      fillFormButton.disabled = true;
    } else if (!hasApiKey) {
      statusMessage.textContent = '请先在选项页面设置API Key';
      fillFormButton.disabled = true;
    } else if (!hasResumeData) {
      statusMessage.textContent = '请先在选项页面提供简历内容';
      fillFormButton.disabled = true;
    } else {
      statusMessage.textContent = 'API Key和简历内容已设置，可以填充表单';
      fillFormButton.disabled = false;
    }
  });
}

// 匹配表单字段和简历数据 - 移除resumeData参数
function matchFieldsWithResume(formFields) {
  return new Promise((resolve, reject) => {
    try {
      // 只将表单字段发送到后台，简历数据将由后台脚本从storage中获取
      chrome.runtime.sendMessage({
        type: 'MATCH_FIELDS_WITH_RESUME',
        payload: { formFields }
      }, (response) => {
        if (chrome.runtime.lastError) {
          console.error("匹配请求失败:", chrome.runtime.lastError);
          reject(chrome.runtime.lastError);
        } else if (!response || !response.success) {
          console.error("字段匹配失败:", response?.error);
          reject(new Error(response?.error || "未知匹配错误"));
        } else {
          resolve(response.fieldMapping);
        }
      });
    } catch (error) {
      console.error("发送匹配请求时出错:", error);
      reject(error);
    }
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

  // **放弃按钮**
  function findDiscardButton() {
    const selectors = 'button[data-control-name="discard_application_confirm_btn"]';
    const discardButtons = document.querySelectorAll(selectors);
    for (const btn of discardButtons) { if (btn.offsetParent !== null) return btn; }
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
      <p>请手动上传您的简历文件。</p>
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

        // 点击之前先看看有没有关闭的
        // 如果找到了关闭按钮，也视为成功
        const closeButton = findCloseButton();
        if (closeButton) {
          console.log("找到关闭按钮，认为申请已提交");
          closeButton.click();

          const discardButton = findDiscardButton();
          if (discardButton) {
            console.log("放弃");
            await new Promise(resolve => setTimeout(resolve, 500));
            discardButton.click();
          }
        }

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
  
  const { sidebar, statusMessage, fillFormButton, batchApplyButton, startWorkdayBatchButton, stopWorkdayBatchButton, workdayBatchStatusDiv, workdayApplyIntervalInput } = createAndInjectSidebar(); // Added Workday refs
  
  // 不再需要上传简历，直接设置表单填充功能
  setupFormFilling(fillFormButton, statusMessage);
  setupBatchApplyFeature(); // Sets up LinkedIn batch feature
  
  // --- Workday Button Logic ---
  let isWorkdayBatchApplying = false; // Global state for Workday batch process

  // 检查当前页面是否是 Workday 申请表单页面，如果是则处理
  if (isWorkdayApplicationPage()) {
    console.log("检测到 Workday 申请表单页面，准备处理...");
    handleWorkdayApplicationForm();
  }

  
  // 设置导航事件监听，在页面变化时重新检查
  window.addEventListener('load', function() {
    if (isWorkdayApplicationPage()) {
      handleWorkdayApplicationForm();
    }
    checkAndEnableWorkdayButton();
  });
  
  // 监听 URL 变化
  let lastUrl = location.href;
  new MutationObserver(() => {
    const url = location.href;
    if (url !== lastUrl) {
      lastUrl = url;
      console.log('URL 已更改，重新检查页面类型');
      if (isWorkdayApplicationPage()) {
        handleWorkdayApplicationForm();
      }
      checkAndEnableWorkdayButton();
    }
  }).observe(document, { subtree: true, childList: true });

  // Function to update Workday button states and status
  function updateWorkdayUI(isProcessing, message = "") {
    const startBtn = startWorkdayBatchButton; // Use reference from createAndInjectSidebar
    const stopBtn = stopWorkdayBatchButton;
    const statusDiv = workdayBatchStatusDiv;
    const linkedInToggleBtn = batchApplyButton; // LinkedIn Batch Toggle

    if (startBtn && stopBtn && statusDiv) {
        if (isProcessing) {
            startBtn.style.display = 'none';
            stopBtn.style.display = 'inline-block';
            startBtn.disabled = true; // Also disable logically
            if(linkedInToggleBtn) linkedInToggleBtn.disabled = true; // Disable LinkedIn btn during Workday run
        } else {
            startBtn.style.display = 'inline-block';
            stopBtn.style.display = 'none';
             // Only re-enable start button if on a workday page
            startBtn.disabled = !window.location.href.includes('.myworkdayjobs.com'); 
            if(linkedInToggleBtn) linkedInToggleBtn.disabled = false; // Re-enable LinkedIn btn
        }
        statusDiv.textContent = message;
    } else {
         console.error("[Workday UI] Could not find all Workday UI elements for update (using refs).");
    }
  }

  // Main function to initiate the Workday batch process
  async function startWorkdayApplicationProcess() { 
    if (isWorkdayBatchApplying) { // Prevent starting again if already running
        console.warn("[Workday] Batch process already running.");
        return;
    }
    isWorkdayBatchApplying = true;
    updateWorkdayUI(true, "开始批量处理 Workday 列表...");
    console.log("[Workday] Starting Workday BATCH application process..."); 

    // Define selectors at the top level of the function
    const leftJobLinkSelector = 'ul[role="list"] li a[data-automation-id="jobTitle"]'; 
    const nextPageSelector = 'button[data-uxi-element-id="next"][aria-label="next"]'; // Corrected selector based on user provided HTML

    let totalProcessedCount = 0;
    let totalErrorCount = 0;
    let totalSkippedCount = 0;
    let currentPage = 1;

    // --- Outer loop for pagination ---
    while (isWorkdayBatchApplying) {
      console.log(`\n--- [Workday] Processing Page ${currentPage} ---`);
      updateWorkdayUI(true, `开始处理第 ${currentPage} 页...`);
      await new Promise(resolve => setTimeout(resolve, 1500)); // Short pause before processing page

      // *** CHECK STOP FLAG before processing page ***
      if (!isWorkdayBatchApplying) {
          console.log("[Workday] Stop requested before processing page", currentPage);
          break; 
      }

      // --- Find all visible job links on the *current* page ---
      const allJobLinks = document.querySelectorAll(leftJobLinkSelector);
      // Filter for *currently* visible links on *this* page
      const visibleJobLinks = Array.from(allJobLinks).filter(link => link.offsetParent !== null);

      if (visibleJobLinks.length === 0 && currentPage === 1) { // Only error out if no links on first page
        updateWorkdayUI(false, "未找到可见的左侧职位链接 (第一页)。");
        console.warn("[Workday] Could not find any visible job links on the left (Page 1) using selector:", leftJobLinkSelector);
        alert("无法在第一页找到左侧的职位链接。");
        isWorkdayBatchApplying = false; // Reset state
        break; // Stop if no links found on page 1
      } else if (visibleJobLinks.length === 0 && currentPage > 1) {
         console.log(`[Workday] No more visible job links found on page ${currentPage}. Assuming end of list.`);
         updateWorkdayUI(true, `第 ${currentPage} 页未找到新职位。 检查下一页...`);
         // Proceed to check for next page button directly
      } else {
          console.log(`[Workday] Found ${visibleJobLinks.length} visible job links on page ${currentPage}.`);
          updateWorkdayUI(true, `第 ${currentPage} 页找到 ${visibleJobLinks.length} 个职位，开始处理...`);
          await new Promise(resolve => setTimeout(resolve, 1000)); 

          // --- Inner loop: Iterate through each visible job link on the current page ---
          for (let i = 0; i < visibleJobLinks.length; i++) {
              // *** CHECK STOP FLAG inside inner loop ***
              if (!isWorkdayBatchApplying) {
                  console.log("[Workday] Stop requested during inner loop on page", currentPage);
                  break; // Exit the inner loop
              }

              const jobLink = visibleJobLinks[i];
              const currentJobIndex = i + 1;
              const jobTitleText = jobLink.textContent.length > 40 ? jobLink.textContent.substring(0, 37) + '...' : jobLink.textContent;

              console.log(`\n--- [Workday][Page ${currentPage}] Processing Job ${currentJobIndex}/${visibleJobLinks.length}: ${jobLink.textContent} ---`);
              updateWorkdayUI(true, `第 ${currentPage} 页: 处理中 ${currentJobIndex}/${visibleJobLinks.length}: ${jobTitleText}`);

              const parentLi = jobLink.closest('li');
              if (parentLi && parentLi.textContent.toLowerCase().includes('applied')) {
                  console.log("[Workday] Skipping job that appears to be already applied:", jobTitleText);
                  totalSkippedCount++;
                  updateWorkdayUI(true, `第 ${currentPage} 页: 处理中 ${currentJobIndex}/${visibleJobLinks.length}: 跳过 (已申请?)`);
                  await new Promise(resolve => setTimeout(resolve, 500)); 
                  continue; 
              }

              try {
                  // --- Step 1: Click the left job link ---
                  console.log("[Workday] Clicking left job link...");
                  jobLink.click();
                  updateWorkdayUI(true, `第 ${currentPage} 页: 处理中 ${currentJobIndex}/${visibleJobLinks.length}: 等待右侧...`);
                  // *** CHECK STOP FLAG ***
                  if (!isWorkdayBatchApplying) break;
                  await new Promise(resolve => setTimeout(resolve, 2500)); 
                  // *** CHECK STOP FLAG ***
                  if (!isWorkdayBatchApplying) break;

                  // --- Step 2: Find and Click the Apply button on the right ---
                  updateWorkdayUI(true, `第 ${currentPage} 页: 处理中 ${currentJobIndex}/${visibleJobLinks.length}: 查找 Apply...`);
                  const applyButtonSelectors = [
                    'a[data-automation-id="adventureButton"]',   
                    'button[data-automation-id="adventureButton"]',
                    'button[data-automation-id="applyButton"]',
                    'a[data-automation-id="applyButton"]',
                    'button[aria-label*="Apply" i]',
                    'a[role="button"][aria-label*="Apply" i]',
                    '.wd-primary-button[data-automation-id*="apply"]'
                  ];
                  let applyButton = null;
                  await new Promise(resolve => setTimeout(resolve, 500)); 
                  // *** CHECK STOP FLAG ***
                  if (!isWorkdayBatchApplying) break;
                  for (const selector of applyButtonSelectors) {
                      const button = document.querySelector(selector);
                      // Ensure button is visible on the screen
                      if (button && button.offsetParent !== null) { 
                          applyButton = button;
                          console.log(`[Workday] Found Apply button using selector: ${selector}`);
                          break;
                      }
                  }

                  if (applyButton) {
                      // --- Start Replacement ---
                      updateWorkdayUI(true, `第 ${currentPage} 页: 处理中 ${currentJobIndex}/${visibleJobLinks.length}: 点击 Apply...`);
                      console.log("[Workday] Clicking the Apply button:", applyButton);
                      applyButton.click();

                      // *** NEW LOGIC: Handle 'Use My Last Application' Modal ***
                      console.log("[Workday] Waiting for 'Start Your Application' modal...");
                      updateWorkdayUI(true, `第 ${currentPage} 页: 处理中 ${currentJobIndex}/${visibleJobLinks.length}: 等待选项...`);

                      const useLastAppSelector = 'a[data-automation-id="useMyLastApplication"]';
                      const modalCloseSelector = 'button[data-automation-id="closeButton"]';
                      let useLastAppButton = null;
                      const waitStartTime = Date.now();
                      const waitTimeout = 10000; // 10 seconds timeout
                      let foundUseLastApp = false;

                      while (Date.now() - waitStartTime < waitTimeout) {
                           // *** CHECK STOP FLAG while waiting for modal ***
                           if (!isWorkdayBatchApplying) {
                               console.log("[Workday] Stop requested while waiting for 'Use My Last' modal.");
                               break; // Exit wait loop
                           }
                           useLastAppButton = document.querySelector(useLastAppSelector);
                           // Check if the button is found and visible
                           if (useLastAppButton && useLastAppButton.offsetParent !== null) { 
                               console.log("[Workday] Found 'Use My Last Application' button.");
                               foundUseLastApp = true;
                               break; // Exit wait loop
                           }
                           await new Promise(resolve => setTimeout(resolve, 500)); // Check every 0.5 seconds
                      }

                      // *** CHECK STOP FLAG again after waiting ***
                      if (!isWorkdayBatchApplying) break; // Exit job processing if stopped

                      if (foundUseLastApp && useLastAppButton) {
                          const applicationUrl = useLastAppButton.href;
                          if (!applicationUrl) {
                                console.warn("[Workday] 'Use My Last Application' button found but href is missing!");
                                totalErrorCount++;
                                jobLink.style.outline = '2px dashed orange'; // Mark different error
                          } else {
                              // --- Start Replacement for message sending and waiting logic ---
                              console.log(`[Workday] Extracted application URL: ${applicationUrl}`);
                              updateWorkdayUI(true, `第 ${currentPage} 页: 处理中 ${currentJobIndex}/${visibleJobLinks.length}: 打开新标签页...`);

                              let newTabId = null;
                              try {
                                  // 使用 Promise 包装 sendMessage 以便 await
                                  const response = await new Promise((resolve, reject) => {
                                      chrome.runtime.sendMessage({ type: 'OPEN_URL_NEW_TAB', url: applicationUrl }, (response) => {
                                          if (chrome.runtime.lastError) {
                                              reject(new Error(chrome.runtime.lastError.message));
                                          } else if (response && response.success && response.tabId) {
                                              resolve(response);
                                          } else {
                                              reject(new Error(response?.error || "Failed to get tabId from background."));
                                          }
                                      });
                                  });
                                  
                                  newTabId = response.tabId;
                                  console.log(`[Workday] Background confirmed new tab opened with ID: ${newTabId}`);

                              } catch (error) {
                                  console.error("[Workday] Error opening new tab via background:", error.message);
                                  totalErrorCount++; // Count as error if tab fails to open
                                  jobLink.style.outline = '2px dashed red'; 
                                  continue; // Skip rest of processing for this job if tab opening fails
                              }
                              
                              // *** CHECK STOP FLAG *** (Important after await)
                              if (!isWorkdayBatchApplying) break; 

                              // --- 等待后台处理完成 --- 
                              console.log(`[Workday] Waiting for background signal (NEW_TAB_PROCESS_COMPLETE) for tab ID: ${newTabId}...`);
                              updateWorkdayUI(true, `第 ${currentPage} 页: 处理中 ${currentJobIndex}/${visibleJobLinks.length}: 等待后台处理...`);

                              try {
                                  // 设置上次更新时间
                                  window.lastProcessingUpdate = Date.now();
                                  
                                  // 创建一个带超时的Promise
                                  await new Promise((resolve, reject) => {
                                      // 存储全局解析器 - 用于供通信系统调用
                                      window.resolveNewTabPromise = resolve;
                                      
                                      // 设置检查间隔 - 每2秒检查一次是否太久没有更新
                                      const checkInterval = setInterval(() => {
                                          // 如果已经停止批量处理，清除间隔并拒绝Promise
                                          if (!isWorkdayBatchApplying) {
                                              clearInterval(checkInterval);
                                              reject(new Error("批量处理已停止"));
                                              return;
                                          }
                                          
                                          const now = Date.now();
                                          // 如果30秒没收到任何更新，认为处理卡住了
                                          if (now - window.lastProcessingUpdate > 30000) {
                                              clearInterval(checkInterval);
                                              reject(new Error("30秒内未收到处理更新，可能卡住了"));
                                          }
                                      }, 2000);
                                      
                                      // 设置总体超时 (40秒)
                                      const timeoutId = setTimeout(() => {
                                          clearInterval(checkInterval);
                                          console.log("[Workday] 等待后台处理超时 (40秒)");
                                          // 移除解析器
                                          window.resolveNewTabPromise = null;
                                          
                                          // 拒绝Promise并带上超时消息
                                          reject(new Error("等待后台处理超时 (40秒)"));
                                      }, 40000);
                                      
                                      // 增强解析器以清除定时器
                                      const originalResolve = resolve;
                                      window.resolveNewTabPromise = function(result) {
                                          clearTimeout(timeoutId);
                                          clearInterval(checkInterval);
                                          window.resolveNewTabPromise = null;
                                          originalResolve(result);
                                      };
                                  });
                                  
                                  console.log("[Workday] 后台处理成功完成");
                                  // 处理成功，标记并继续
                                  totalProcessedCount++;
                                  jobLink.style.opacity = '0.5';
                                  
                              } catch(error) { 
                                   console.error("[Workday] 等待后台处理时出错:", error.message);
                                   totalErrorCount++; 
                                   jobLink.style.outline = '2px dashed purple';
                                   
                                   // 如果我们有标签页ID，尝试关闭它
                                   if (newTabId) {
                                       console.log("[Workday] 尝试关闭失败的标签页:", newTabId);
                                       chrome.runtime.sendMessage({ 
                                           type: 'CLOSE_TAB', 
                                           tabId: newTabId 
                                       });
                                   }
                                   
                                   // 关闭原始页面上的模态弹窗
                                   console.log("[Workday] 尝试关闭原始页面模态窗口");
                                   const closeButton = document.querySelector(modalCloseSelector);
                                   if (closeButton && closeButton.offsetParent !== null) {
                                       closeButton.click();
                                       console.log("[Workday] 成功点击关闭按钮");
                                       // 短暂暂停确保UI更新
                                       await new Promise(resolve => setTimeout(resolve, 500));
                                   }
                                   
                                   // 确保清理全局解析器
                                   window.resolveNewTabPromise = null;
                                   continue; // 跳过剩余处理，继续下一个职位
                              }
                            }

                      } else {
                          // 'Use My Last Application' button not found within timeout
                          updateWorkdayUI(true, `第 ${currentPage} 页: 处理中 ${currentJobIndex}/${visibleJobLinks.length}: 未找到'Use Last App'`);
                          console.warn("[Workday] Could not find 'Use My Last Application' button within timeout for job:", jobTitleText);
                          totalErrorCount++;
                          jobLink.style.outline = '2px dashed orange'; // Different color/style for this specific error
                      }
                      // --- End Replacement ---
                  } else {
                      updateWorkdayUI(true, `第 ${currentPage} 页: 处理中 ${currentJobIndex}/${visibleJobLinks.length}: 未找到 Apply`);
                      console.warn("[Workday] Could not find the main 'Apply' button after clicking left link for job:", jobTitleText);
                      totalErrorCount++;
                      jobLink.style.outline = '2px dashed red'; 
                  }

              } catch (error) {
                  updateWorkdayUI(true, `第 ${currentPage} 页: 职位 ${currentJobIndex} 出错`);
                  console.error(`[Workday][Page ${currentPage}] Error processing job ${currentJobIndex} (${jobTitleText}):`, error);
                  totalErrorCount++;
                  jobLink.style.outline = '2px dashed red'; 
                  await new Promise(resolve => setTimeout(resolve, 1000)); 
              }
              
              // Delay before processing the next job
              // *** CHECK STOP FLAG ***
              if (!isWorkdayBatchApplying) break;
              // Read interval from input, with fallback
              const intervalInput = document.getElementById('workday-apply-interval');
              let intervalSec = intervalInput ? parseInt(intervalInput.value, 10) : 2; 
              if (isNaN(intervalSec) || intervalSec < 1) intervalSec = 1; // Minimum 1 second
              if (intervalSec > 30) intervalSec = 30; // Maximum 30 seconds

              console.log(`[Workday] Waiting ${intervalSec} seconds before next job...`);
              updateWorkdayUI(true, `第 ${currentPage} 页: 处理中 ${currentJobIndex}/${visibleJobLinks.length}: 等待 ${intervalSec}s`);
              await new Promise(resolve => setTimeout(resolve, intervalSec * 1000)); 

          } // End of inner loop (jobs on current page)
      } // End of else (if visible links were found on current page)

      // *** CHECK STOP FLAG after processing page jobs ***
      if (!isWorkdayBatchApplying) {
          console.log("[Workday] Stop requested after processing jobs on page", currentPage);
          break; // Exit the outer loop
      }

      // --- Attempt to navigate to the next page ---
      console.log(`[Workday] Finished processing page ${currentPage}. Looking for next page button...`);
      updateWorkdayUI(true, `第 ${currentPage} 页处理完毕，查找下一页按钮...`);
      await new Promise(resolve => setTimeout(resolve, 1000)); // Pause before finding next button

      const nextPageButton = document.querySelector(nextPageSelector);

      if (nextPageButton && !nextPageButton.disabled && nextPageButton.offsetParent !== null) {
          console.log("[Workday] Found active next page button. Clicking...");
          updateWorkdayUI(true, `找到下一页按钮，正在加载第 ${currentPage + 1} 页...`);
          nextPageButton.click();
          currentPage++;
          // Wait longer for the next page to load
          const pageLoadWaitSec = 4;
          console.log(`[Workday] Waiting ${pageLoadWaitSec} seconds for page ${currentPage} to load...`);
          // *** CHECK STOP FLAG while waiting for next page ***
          let waitCounter = 0;
          while (waitCounter < pageLoadWaitSec * 1000 && isWorkdayBatchApplying) {
              await new Promise(resolve => setTimeout(resolve, 500));
              waitCounter += 500;
              updateWorkdayUI(true, `正在加载第 ${currentPage} 页... (${Math.ceil((pageLoadWaitSec * 1000 - waitCounter)/1000)}s)`);
          }
          if (!isWorkdayBatchApplying) {
              console.log("[Workday] Stop requested while waiting for page", currentPage);
              break; // Exit outer loop
          }
          console.log(`[Workday] Page ${currentPage} should be loaded.`);
      } else {
          if (!nextPageButton) {
              console.log("[Workday] Next page button not found. Assuming end of results.");
          } else if (nextPageButton.disabled) {
              console.log("[Workday] Next page button found but is disabled. Assuming end of results.");
          } else if (nextPageButton.offsetParent === null) {
               console.log("[Workday] Next page button found but is not visible. Assuming end of results.");
          }
          updateWorkdayUI(true, "未找到可用的下一页按钮。 结束处理。");
          await new Promise(resolve => setTimeout(resolve, 1000));
          break; // Exit the outer loop
      }

    } // End of outer loop (pagination)

    // --- Batch Process Finished or Stopped ---
    const finalMessage = isWorkdayBatchApplying ? 
        `Workday 批量处理完成 (${currentPage} 页)！点击 Apply: ${totalProcessedCount}，失败: ${totalErrorCount}，跳过: ${totalSkippedCount}。` :
        `Workday 批量处理已停止 (在第 ${currentPage} 页)。`;
    const alertMessage = isWorkdayBatchApplying ?
         `Workday 批量处理（点击 Apply）完成！\n处理页数: ${currentPage}\n成功: ${totalProcessedCount}\n失败: ${totalErrorCount}\n跳过: ${totalSkippedCount}\n\n注意：实际表单填写尚未实现。`:
         `Workday 批量处理已手动停止 (在第 ${currentPage} 页)。\n完成点击 Apply: ${totalProcessedCount}\n失败: ${totalErrorCount}\n跳过: ${totalSkippedCount}`; 

    console.log(`[Workday] Batch process finished/stopped on page ${currentPage}. Clicked Apply: ${totalProcessedCount}, Errors: ${totalErrorCount}, Skipped: ${totalSkippedCount}, Stopped: ${!isWorkdayBatchApplying}`);
    isWorkdayBatchApplying = false; // Ensure state is reset
    updateWorkdayUI(false, finalMessage);
    alert(alertMessage);
    
    // Optionally reset visual markers from the last processed page (or all if needed)
    document.querySelectorAll(leftJobLinkSelector).forEach(link => {
        link.style.opacity = '';
        link.style.outline = '';
    });

  }

  // Event Listeners for new Workday buttons
  // Get references from the object returned by createAndInjectSidebar
  if (startWorkdayBatchButton) {
      startWorkdayBatchButton.addEventListener('click', startWorkdayApplicationProcess);
  } else {
      console.error("Workday START button reference not found during initialization.");
  }

  if (stopWorkdayBatchButton) {
      stopWorkdayBatchButton.addEventListener('click', () => {
          if (isWorkdayBatchApplying) {
              console.log("[Workday] Stop button clicked. Setting stop flag.");
              isWorkdayBatchApplying = false; 
              updateWorkdayUI(false, "正在停止处理..."); 
          } else {
              console.warn("[Workday] Stop button clicked but process not running.");
          }
      });
  } else {
      console.error("Workday STOP button reference not found during initialization.");
  }
 

  
  // 初始检查
  checkAndEnableWorkdayButton();
  
  // --- End Workday Button Logic ---

  // 添加页面导航和模态框变化监听器
  setupModalAndNavigationObserver();
  
  console.log("Resume auto-fill sidebar initialized.");

  // --- Message Listener Setup ---
  // Ensure there's a listener setup, potentially combining with existing ones
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      console.log("[Content Script] Received message:", message.type);
      
      if (message.type === 'UPDATE_STATUS') {
          const statusDiv = document.getElementById('status-message') || document.getElementById('workday-batch-status');
          if (statusDiv) { statusDiv.textContent = message.payload; }
          sendResponse({ success: true });
      } 
      // --- NEW: Handler for completion signal from background ---
      else if (message.type === 'NEW_TAB_PROCESS_COMPLETE') {
          console.log("[Content Script] Received NEW_TAB_PROCESS_COMPLETE signal.");
          if (typeof window.resolveNewTabPromise === 'function') {
              console.log("[Content Script] Resolving the wait promise for new tab completion.");
              window.resolveNewTabPromise({
                success: true,
                message: message.details,
                tabId: message.workdayTabId
              });
              window.resolveNewTabPromise = null; // Reset for next use
              sendResponse({ success: true }); // Acknowledge receipt
          } else {
               console.warn("[Content Script] Received completion signal, but no promise resolver was waiting.");
               sendResponse({ success: false, error: "No promise waiting." });
          }
          return true; // Indicate async response for this handler
      }
      // 处理进度更新消息
      else if (message.type === 'PROCESSING_UPDATE') {
        console.log("收到处理进度更新:", message);
        
        // 更新最后收到更新的时间（明确地设置为全局变量）
        if (typeof window.lastProcessingUpdate === 'undefined') {
          window.lastProcessingUpdate = Date.now();
        } else {
          window.lastProcessingUpdate = Date.now();
        }
        
        // 获取状态和详细信息
        const status = message.status || 'processing';
        const details = message.details || '处理中...';
        
        // 更新UI状态
        const statusDiv = document.getElementById('workday-batch-status');
        if (statusDiv) {
          statusDiv.textContent = `处理中: ${details}`;
        }
        
        // 更新处理中的UI
        if (typeof updateWorkdayUI === 'function') {
          updateWorkdayUI(true, `处理中: ${details}`);
        }
        
        sendResponse({ success: true, message: "已处理PROCESSING_UPDATE消息" });
      }
      // --- End of NEW handler ---
      
      // If not handling message or not async, return false or nothing
      // return false; 
  });
  // --- End Message Listener Setup ---

  /**
   * 检查当前页面是否是 Workday 申请表单页面
   * @returns {boolean} 是否是 Workday 申请表单页面
   */
  function isWorkdayApplicationPage() {
  // Regex to check if the URL matches a typical Workday application form pattern
  // Example: https://*.myworkdayjobs.com/.../apply/application or /apply/review
    const workdayAppRegexStrict = /myworkdayjobs\.com\/.+?\/apply\/(application|review|useMyLastApplication|jobReqId-\w+)/i;
    console.log("[Workday Form Check] Checking URL:", window.location.href);
    const isMatch = workdayAppRegexStrict.test(window.location.href);
    console.log("[Workday Form Check] Is application page?", isMatch);
    return isMatch;
  }

  /**
   * 等待特定元素出现在页面上
   * @param {string} selector - 要等待的元素选择器
   * @param {number} timeout - 超时时间（毫秒）
   * @returns {Promise<Element|null>} - 找到的元素或超时后为 null
   */
  function waitForElement(selector, timeout = 5000) {
    return new Promise((resolve) => {
      // 如果元素已存在，立即解析
      const element = document.querySelector(selector);
      if (element) {
        return resolve(element);
      }
      
      // 设置一个变量记录是否超时
      let isTimedOut = false;
      
      // 设置超时
      const timeoutId = setTimeout(() => {
        isTimedOut = true;
        console.log(`等待元素 ${selector} 超时`);
        resolve(null);
      }, timeout);
      
      // 创建一个观察器来监视 DOM 变化
      const observer = new MutationObserver((mutations) => {
        // 如果已经超时，停止观察
        if (isTimedOut) {
          observer.disconnect();
          return;
        }
        
        // 检查元素是否存在
        const element = document.querySelector(selector);
        if (element) {
          observer.disconnect();
          clearTimeout(timeoutId);
          resolve(element);
        }
      });
      
      // 开始观察 DOM 变化
      observer.observe(document.body, {
        childList: true,
        subtree: true
      });
    });
  }

  /**
   * 等待 Workday 加载器消失
   * @param {number} timeout - 超时时间（毫秒）
   * @returns {Promise<boolean>} - 是否成功等待加载完成
   */
  function waitForWorkdayLoader(timeout = 10000) {
    return new Promise((resolve) => {
      // 立即检查加载器是否不存在
      const loader = document.querySelector('.css-1jxpxmu, [data-automation-id="loadingIndicator"]');
      if (!loader || loader.offsetParent === null) {
        return resolve(true);
      }
      
      console.log("等待 Workday 加载器消失...");
      
      // 设置超时
      const timeoutId = setTimeout(() => {
        console.log("等待 Workday 加载器消失超时");
        resolve(false);
      }, timeout);
      
      // 创建一个观察器来监视 DOM 变化
      const observer = new MutationObserver(() => {
        const loader = document.querySelector('.css-1jxpxmu, [data-automation-id="loadingIndicator"]');
        if (!loader || loader.offsetParent === null) {
          observer.disconnect();
          clearTimeout(timeoutId);
          console.log("Workday 加载器已消失");
          resolve(true);
        }
      });
      
      // 开始观察 DOM 变化
      observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true
      });
    });
  }

  /**
   * 处理 Workday 申请表单页面
   * 分析表单元素，提取字段信息，使用简历数据填充
   * TODO: 实现表单填充逻辑
   */
  async function handleWorkdayApplicationForm() {
    console.log("开始处理 Workday 申请表单...");
    let isWorkdayFormBeingHandled = true; // 标记表单正在处理中
    let progressInterval = null;
    // 将statusDiv的声明移到函数顶部，避免重复声明
    const statusDiv = document.getElementById('workday-batch-status') || document.getElementById('status-message');
    
    try {
      // 先等待10秒，确保页面完全加载
      console.log("等待10秒让页面完全加载...");
      
      // 发送状态更新
      if (statusDiv) statusDiv.textContent = "正在等待页面完全加载 (10秒)...";
      
      // 确保全局最后处理时间变量存在
      if (typeof window.lastProcessingUpdate === 'undefined') {
        window.lastProcessingUpdate = Date.now();
      }
      
      // 等待10秒
      await new Promise(resolve => setTimeout(resolve, 10000));
      console.log("等待完成，开始处理表单...");
      
      // 设置一个定期发送进度更新的计时器
      const tabId = chrome.runtime.id; // 获取当前标签页ID
      progressInterval = setInterval(() => {
        // 更新最后处理时间
        window.lastProcessingUpdate = Date.now();
        
        // 发送进度更新到后台
        chrome.runtime.sendMessage({
          type: 'SEND_PROCESSING_UPDATE',
          tabId: tabId,
          details: '表单填充进行中...'
        });
      }, 5000); // 每5秒发送一次更新
      
      // 0. 等待页面加载完成
      console.log("等待 Workday 表单元素加载...");
      const formSelectors = [
        '[data-automation-id]', 
        'div[data-displayed-in-modal="true"]'
      ];
      
      // 构建一个复合选择器
      const combinedSelector = formSelectors.join(', ');
      const formFieldElement = await waitForElement(combinedSelector, 15000);
      
      if (!formFieldElement) {
        console.log("未找到 Workday 表单元素，终止处理");
        return;
      }
      
      // 更新进度消息并更新最后处理时间
      window.lastProcessingUpdate = Date.now();
      chrome.runtime.sendMessage({
        type: 'SEND_PROCESSING_UPDATE',
        tabId: tabId,
        details: '表单元素已找到，等待加载完成...'
      });
      
      // 等待加载器消失
      await waitForWorkdayLoader();
      console.log("Workday 页面加载完成，加载器已消失");
      
      // 1. 收集所有表单元素
      console.log("开始收集表单元素...");
      window.lastProcessingUpdate = Date.now();
      chrome.runtime.sendMessage({
        type: 'SEND_PROCESSING_UPDATE',
        tabId: tabId,
        details: '正在收集表单元素...'
      });
      
      const formFields = collectWorkdayFormElements();
      if (!formFields || formFields.length === 0) {
        console.log("未找到 Workday 表单元素，终止处理");
        return;
      }
      console.log(`已收集 ${formFields.length} 个表单元素`);
      
      // 2. 检查简历数据是否已设置
      console.log("检查简历数据...");
      window.lastProcessingUpdate = Date.now();
      chrome.runtime.sendMessage({
        type: 'SEND_PROCESSING_UPDATE',
        tabId: tabId,
        details: '检查简历数据...'
      });
      
      // 检查是否存在简历数据
      const resumeData = await getResumeDataFromStorage();
      if (!resumeData) {
        console.log("未找到简历数据，无法自动填充");
        
        // 更新状态消息
        if (statusDiv) statusDiv.textContent = "未找到简历数据。请先在选项页面设置简历内容。";
        
        // 发送通知给后台脚本
        chrome.runtime.sendMessage({
          type: 'WORKDAY_PROCESS_COMPLETE',
          payload: {
            status: 'error',
            details: '未找到简历数据'
          }
        });
        
        return;
      }
      console.log("简历数据检查成功");
      
      // 3. 发送请求匹配字段和简历数据
      console.log("开始请求 AI 匹配字段和简历数据...");
      window.lastProcessingUpdate = Date.now();
      chrome.runtime.sendMessage({
        type: 'SEND_PROCESSING_UPDATE',
        tabId: tabId,
        details: '正在匹配字段和简历数据...'
      });
      
      let fieldMapping;
      try {
        // 不再传递resumeData参数
        fieldMapping = await matchFieldsWithResume(formFields);
        if (!fieldMapping) {
          console.log("匹配请求未返回有效结果");
          throw new Error("AI 匹配未返回有效结果");
        }
        console.log("AI 匹配字段数据成功");
      } catch (matchError) {
        console.error("匹配字段时出错:", matchError);
        
        // 作为备选方案，直接使用原始表单字段
        console.log("使用原始表单字段作为备选方案");
        fieldMapping = formFields;
      }
      
      // 4. 填充表单字段
      console.log("开始填充 Workday 表单字段...");
      window.lastProcessingUpdate = Date.now();
      chrome.runtime.sendMessage({
        type: 'SEND_PROCESSING_UPDATE',
        tabId: tabId,
        details: '正在填充表单字段...'
      });
      
      const fillResult = fillWorkdayFormFields(fieldMapping, resumeData);
      console.log(`完成基本表单填充。成功: ${fillResult.filled}, 失败: ${fillResult.failed}`);
      
      // 5. 处理特殊字段（复选框、同意条款等）
      console.log("处理特殊字段...");
      window.lastProcessingUpdate = Date.now();
      chrome.runtime.sendMessage({
        type: 'SEND_PROCESSING_UPDATE',
        tabId: tabId,
        details: '处理特殊字段...'
      });
      
      await handleWorkdaySpecialFields();
      
      // 6. 提示用户处理完成
      if (statusDiv) {
        statusDiv.textContent = `Workday 表单已自动填充：成功 ${fillResult.filled} 项。请检查并手动提交。`;
      }
      console.log("Workday 表单自动填充完成。");
      
      // 7. 尝试滚动到页面底部，以查看提交按钮
      window.scrollTo(0, document.body.scrollHeight);
      
      // 8. 发送完成消息给后台脚本
      console.log("发送 WORKDAY_PROCESS_COMPLETE 消息（成功）到后台脚本。");
      chrome.runtime.sendMessage({
        type: 'WORKDAY_PROCESS_COMPLETE',
        payload: {
          status: 'success',
          details: `表单自动填充完成，成功填充 ${fillResult.filled} 个字段`
        }
      });

    } catch (error) {
      console.error("处理 Workday 表单时出错:", error);
      
      // 更新状态消息 - 使用外部声明的statusDiv变量
      if (statusDiv) {
        statusDiv.textContent = "处理 Workday 表单时出错: " + error.message;
      }
      
      // 发送错误消息到后台脚本
      console.log("发送 WORKDAY_PROCESS_COMPLETE 消息（错误）到后台脚本。");
      chrome.runtime.sendMessage({
        type: 'WORKDAY_PROCESS_COMPLETE',
        payload: {
          status: 'error',
          details: error.message
        }
      });
    } finally {
      // 清除进度更新计时器
      if (progressInterval) {
        clearInterval(progressInterval);
      }
      
      isWorkdayFormBeingHandled = false; // 无论成功或失败，重置处理标志
    }
  }

  /**
   * 收集 Workday 表单元素
   * @returns {Array} 表单字段数组
   */
  function collectWorkdayFormElements() {
    console.log("收集 Workday 表单元素...");
    
    // 存储收集到的字段
    const formFields = [];
    let fieldCount = 0;
    
    // 简化的表单字段选择器
    const fieldContainers = document.querySelectorAll(
      // 主要通用选择器 - 任何带data-automation-id的元素
      '[data-automation-id],' +
      // 表单组和常见角色
      'div[role="group"],' + 
      '[role="radiogroup"],' +
      // CSS类选择器作为备用
      '.css-1ypndxp, .css-1u9ubqn'
    );
    
    console.log(`找到 ${fieldContainers.length} 个可能的 Workday 表单字段容器`);
    
    // 专门处理文件上传字段
    const fileUploadContainers = document.querySelectorAll('div[data-automation-id="fileUploadContainer"]');
    fileUploadContainers.forEach((container, fileIndex) => {
      try {
        // 提取标签信息
        let fieldLabel = '';
        const labelElement = container.querySelector('label, [data-automation-id="formLabel"], [data-automation-id="attachmentLabel"]');
        if (labelElement) {
          fieldLabel = labelElement.textContent.trim();
        } else {
          // 尝试从周围元素提取标签
          const parentDiv = container.closest('div[data-automation-id]');
          if (parentDiv) {
            const nearLabel = parentDiv.querySelector('label, [data-automation-id="formLabel"]');
            if (nearLabel) {
              fieldLabel = nearLabel.textContent.trim();
            }
          }
        }
        
        if (!fieldLabel) {
          fieldLabel = '文件上传';  // 默认标签
        }
        
        // 查找文件上传输入元素
        const uploadInput = container.querySelector('input[type="file"]');
        if (uploadInput) {
          const fieldId = `workday_file_${fileIndex}`;
          
          // 创建文件上传字段信息
          const fieldInfo = {
            fieldId,
            tagName: 'input',
            type: 'file',
            label: fieldLabel,
            isRequired: fieldLabel.includes('*'),
            // 添加特殊标志，以便后续处理
            isFileUpload: true,
            // 保存文件接受类型
            acceptTypes: uploadInput.getAttribute('accept') || '',
            element: uploadInput // 保存元素引用，便于后续处理
          };
          
          // 给元素添加标识属性
          uploadInput.setAttribute('data-workday-field-id', fieldId);
          
          formFields.push(fieldInfo);
          fieldCount++;
          console.log(`找到文件上传字段: ${fieldLabel}`);
        }
      } catch (error) {
        console.error(`处理文件上传字段时出错:`, error);
      }
    });
    
    // 遍历所有普通字段容器
    fieldContainers.forEach((container, containerIndex) => {
      try {
        // 跳过已经处理过的文件上传容器
        if (container.hasAttribute('data-automation-id') && 
            container.getAttribute('data-automation-id') === 'fileUploadContainer') {
          return;
        }
        
        // 获取字段标签
        let fieldLabel = '';
        const labelElement = container.querySelector(
          'label, [data-automation-id="formLabel"], [data-automation-id="promptLabel"], ' +
          '[data-automation-label="true"], .css-1unemfe, .css-1tqo8qc'
        );
        
        if (labelElement) {
          fieldLabel = labelElement.textContent.trim();
        }
        
        // 如果没有直接找到标签，尝试其他方法
        if (!fieldLabel) {
          // 检查 aria-label 属性
          if (container.hasAttribute('aria-label')) {
            fieldLabel = container.getAttribute('aria-label').trim();
          } 
          // 尝试从data-automation-id属性推断字段类型
          else if (container.hasAttribute('data-automation-id')) {
            const automationId = container.getAttribute('data-automation-id');
            if (automationId.includes('firstName')) {
              fieldLabel = '名字';
            } else if (automationId.includes('lastName')) {
              fieldLabel = '姓氏';
            } else if (automationId.includes('email')) {
              fieldLabel = '电子邮件';
            } else if (automationId.includes('phone')) {
              fieldLabel = '电话';
            } else if (automationId.includes('country')) {
              fieldLabel = '国家';
            }
          }
          // 尝试查找问题标题
          else if (container.hasAttribute('data-automation-id') && 
                   container.getAttribute('data-automation-id') === 'questionnaireQuestion') {
            const questionTitle = container.querySelector('.css-1p3ni5g, [data-automation-id="questionLabel"]');
            if (questionTitle) {
              fieldLabel = questionTitle.textContent.trim();
            }
          }
          // 尝试查找相邻的标签文本
          else {
            const siblingLabel = container.previousElementSibling;
            if (siblingLabel && 
                (siblingLabel.tagName.toLowerCase() === 'label' || 
                 siblingLabel.classList.contains('css-1unemfe'))) {
              fieldLabel = siblingLabel.textContent.trim();
            }
          }
          
          // 尝试查找legend元素作为标签
          if (!fieldLabel) {
            const legendElement = container.querySelector('legend');
            if (legendElement) {
              fieldLabel = legendElement.textContent.trim();
            }
          }
        }
        
        // 如果依然没有标签但有自定义数据属性，尝试生成一个标签
        if (!fieldLabel && container.hasAttribute('data-automation-id')) {
          fieldLabel = `字段-${container.getAttribute('data-automation-id')}`;
        }
        
        // 查找输入元素（文本输入、下拉框、复选框、单选框等）
        let inputElements = container.querySelectorAll(
          'input, select, textarea, ' +
          '[data-automation-id="dateInputIcon"], ' +  // 日期选择器
          '[data-automation-id="promptOption"], ' +   // 单选/复选选项
          '[data-automation-id="checkboxInput"], ' +  // 复选框输入
          '[data-automation-id="radioInput"], ' +     // 单选按钮输入
          '[data-automation-id="searchBox"], ' +      // 搜索框
          '[role="listbox"], [role="combobox"]'       // 自定义下拉框
        );
        
        // 如果没有找到输入元素，查找特殊的 Workday 输入组件
        if (inputElements.length === 0) {
          const possibleInputContainers = container.querySelectorAll(
            '[data-automation-id$="InputBox"], ' +      // 任何以InputBox结尾的元素
            '[data-automation-id$="Input"], ' +         // 任何以Input结尾的元素 
            '[data-uxi-widget-type]'                    // 带uxi小部件类型的元素
          );
          
          if (possibleInputContainers.length > 0) {
            // 对于每个容器，查找实际的输入元素
            const tempElements = [];
            possibleInputContainers.forEach(container => {
              const innerInputs = container.querySelectorAll('input, select, textarea');
              innerInputs.forEach(input => tempElements.push(input));
              
              // 检查特殊的Workday输入组件（可能没有标准input元素）
              if (innerInputs.length === 0) {
                // 对于下拉框，查找div
                const selectDiv = container.querySelector('[role="listbox"], [role="combobox"]');
                if (selectDiv) {
                  tempElements.push(selectDiv);
                }
                
                // 对于日期选择器，查找日期图标
                const dateIcon = container.querySelector('[data-automation-id="dateInputIcon"]');
                if (dateIcon) {
                  tempElements.push(dateIcon);
                }
                
                // 如果仍然没有找到元素，但容器本身可能是输入元素
                if (container.hasAttribute('tabindex') || 
                    container.hasAttribute('role') ||
                    container.hasAttribute('data-automation-id')) {
                  tempElements.push(container);
                }
              }
            });
            
            if (tempElements.length > 0) {
              inputElements = tempElements;
            }
          }
        }
        
        // 处理所有找到的输入元素
        if (inputElements.length > 0) {
          Array.from(inputElements).forEach((inputElement, inputIndex) => {
            // 跳过隐藏元素
            if (inputElement.type === 'hidden' || 
                (inputElement.offsetParent === null && !inputElement.hasAttribute('data-automation-id'))) {
              return;
            }
            
            // 获取元素类型和附加属性
            const tagName = inputElement.tagName ? inputElement.tagName.toLowerCase() : 'div';
            let type = inputElement.getAttribute('type') || tagName;
            const automationId = inputElement.getAttribute('data-automation-id') || '';
            const role = inputElement.getAttribute('role') || '';
            
            // 检测特殊日期元素
            if (automationId === 'dateInputIcon' || 
                inputElement.closest('[data-automation-id="dateTimeInputBox"]')) {
              type = 'date';
            }
            
            // 检测特殊下拉元素
            if (role === 'listbox' || role === 'combobox' || 
                inputElement.closest('[data-automation-id="selectInputBox"]')) {
              type = 'select-one';
            }
            
            // 创建唯一标识
            const fieldId = `workday_field_${containerIndex}_${inputIndex}`;
            
            // 根据元素类型收集不同的信息
            let fieldInfo = {
              fieldId,
              tagName,
              type,
              automationId,
              role,
              label: fieldLabel,
              isRequired: fieldLabel.includes('*'),
              element: inputElement  // 保存对元素的引用，方便后续处理
            };
            
            // 为下拉框添加选项信息
            if (tagName === 'select' || type === 'select-one') {
              fieldInfo.options = [];
              
              // 对于标准select元素
              if (tagName === 'select') {
                fieldInfo.options = Array.from(inputElement.options).map(option => ({
                  value: option.value,
                  text: option.text
                })).filter(opt => opt.value && opt.text);
              } 
              // 对于自定义下拉元素，尝试找到选项
              else if (role === 'listbox' || role === 'combobox') {
                const optionElements = document.querySelectorAll('[role="option"]');
                if (optionElements.length > 0) {
                  fieldInfo.options = Array.from(optionElements).map(option => ({
                    value: option.getAttribute('data-value') || option.id || option.textContent,
                    text: option.textContent.trim()
                  })).filter(opt => opt.text);
                }
              }
            }
            
            // 为单选/复选框添加特定信息
            if (type === 'radio' || type === 'checkbox' || automationId === 'radioInput' || automationId === 'checkboxInput') {
              // 查找相同名称的所有单选/复选框，它们属于同一组
              const groupName = inputElement.getAttribute('name');
              fieldInfo.isGroup = true;
              
              if (groupName) {
                const sameNameInputs = document.querySelectorAll(`input[name="${groupName}"]`);
                fieldInfo.groupName = groupName;
                fieldInfo.groupOptions = Array.from(sameNameInputs).map(input => {
                  const optionLabel = findLabelForElement(input) || '';
                  return {
                    value: input.value,
                    label: optionLabel
                  };
                });
              } 
              // 对于Workday特殊单选/复选框
              else {
                // 尝试收集选项信息
                const optionElements = container.querySelectorAll('[data-automation-id="promptOption"], [role="radio"], [role="checkbox"]');
                if (optionElements.length > 0) {
                  fieldInfo.groupOptions = Array.from(optionElements).map(option => ({
                    value: option.getAttribute('data-automation-id') || option.id,
                    label: option.textContent.trim()
                  }));
                }
              }
            }
            
            // 处理日期选择器
            if (type === 'date') {
              fieldInfo.dateFormat = 'YYYY-MM-DD'; // 默认日期格式
              
              // 查找相关的文本输入框以获取更多信息
              const dateInputContainer = inputElement.closest('[data-automation-id="dateTimeInputBox"]');
              if (dateInputContainer) {
                const textInput = dateInputContainer.querySelector('input[type="text"]');
                if (textInput) {
                  // 保存对文本输入框的引用
                  fieldInfo.textInputElement = textInput;
                  
                  // 尝试从占位符推断日期格式
                  const placeholder = textInput.getAttribute('placeholder');
                  if (placeholder) {
                    if (placeholder.includes('MM/DD/YYYY')) {
                      fieldInfo.dateFormat = 'MM/DD/YYYY';
                    } else if (placeholder.includes('DD/MM/YYYY')) {
                      fieldInfo.dateFormat = 'DD/MM/YYYY';
                    } else if (placeholder.includes('YYYY-MM-DD')) {
                      fieldInfo.dateFormat = 'YYYY-MM-DD';
                    }
                  }
                }
              }
            }
            
            // 给元素添加标识属性，以便后续更容易引用
            if (inputElement instanceof Element) {
              inputElement.setAttribute('data-workday-field-id', fieldId);
            }
            
            // 添加到字段列表
            formFields.push(fieldInfo);
            fieldCount++;
            console.log(`找到表单字段: ${fieldLabel} (类型: ${type})`);
          });
        }
      } catch (error) {
        console.error(`处理表单字段容器时出错:`, error);
      }
    });
    
    console.log(`总共收集到 ${fieldCount} 个 Workday 表单字段`);
    return formFields;
  }

  /**
   * 填充Workday表单字段
   * @param {Array} formFields - 由collectWorkdayFormElements函数收集的表单字段
   * @param {Object} resumeData - 简历数据
   * @returns {number} - 成功填充的字段数量
   */
  function fillWorkdayFormFields(formFields, resumeData) {
    console.log("开始填充Workday表单字段...");
    
    if (!formFields || !Array.isArray(formFields) || formFields.length === 0) {
      console.error("没有找到可填充的Workday表单字段");
      return { filled: 0, failed: 0 };
    }
    
    if (!resumeData) {
      console.error("没有简历数据可用于填充");
      return { filled: 0, failed: 0 };
    }
    
    let filledCount = 0;
    let failedCount = 0;
    
    // 创建标签与简历字段的映射关系
    const labelMappings = {
      // 个人信息
      '名字': resumeData.first_name || resumeData.name?.split(' ')[0],
      '姓氏': resumeData.last_name || (resumeData.name && resumeData.name.includes(' ') ? resumeData.name.split(' ').slice(1).join(' ') : ''),
      '名': resumeData.first_name || resumeData.name?.split(' ')[0],
      '姓': resumeData.last_name || (resumeData.name && resumeData.name.includes(' ') ? resumeData.name.split(' ').slice(1).join(' ') : ''),
      '电子邮件': resumeData.email,
      '电话': resumeData.phone,
      '手机': resumeData.phone,
      '地址': resumeData.address || resumeData.location,
      '城市': resumeData.city,
      '邮编': resumeData.zip || resumeData.postal_code,
      '国家': resumeData.country || 'China',
      '国籍': resumeData.nationality || 'Chinese',
      
      // 教育信息
      '学校名称': resumeData.education && resumeData.education[0] ? resumeData.education[0].institution : '',
      '学位': resumeData.education && resumeData.education[0] ? resumeData.education[0].degree : '',
      '专业': resumeData.education && resumeData.education[0] ? resumeData.education[0].field_of_study : '',
      '入学日期': resumeData.education && resumeData.education[0] ? resumeData.education[0].start_date : '',
      '毕业日期': resumeData.education && resumeData.education[0] ? resumeData.education[0].end_date : '',
      '在校时间': resumeData.education && resumeData.education[0] ? `${resumeData.education[0].start_date} - ${resumeData.education[0].end_date}` : '',
      
      // 工作经验
      '公司名称': resumeData.experience && resumeData.experience[0] ? resumeData.experience[0].company : '',
      '职位': resumeData.experience && resumeData.experience[0] ? resumeData.experience[0].position : '',
      '开始日期': resumeData.experience && resumeData.experience[0] ? resumeData.experience[0].start_date : '',
      '结束日期': resumeData.experience && resumeData.experience[0] ? resumeData.experience[0].end_date : '',
      '工作描述': resumeData.experience && resumeData.experience[0] ? resumeData.experience[0].description : '',
      
      // 技能和语言
      '技能': resumeData.skills ? (Array.isArray(resumeData.skills) ? resumeData.skills.join(', ') : resumeData.skills) : '',
      '语言': resumeData.languages ? (Array.isArray(resumeData.languages) ? resumeData.languages.join(', ') : resumeData.languages) : '',
      
      // 其他常见字段
      '网站': resumeData.website || resumeData.linkedin,
      'LinkedIn': resumeData.linkedin,
      '个人网站': resumeData.website,
      '工作许可': '是', // 默认值，这应该根据实际情况调整
      '推荐人': resumeData.references && resumeData.references[0] ? resumeData.references[0].name : '',
      
      // 新增常见字段
      '姓名': resumeData.name,
      '全名': resumeData.name,
      '家庭住址': resumeData.address || resumeData.location,
      '手机号码': resumeData.phone,
      '电子邮箱': resumeData.email,
      '工作年限': resumeData.years_of_experience || '3',
      '期望薪资': resumeData.expected_salary || '',
      '自我介绍': resumeData.summary || '',
      '个人简介': resumeData.summary || '',
    };
    
    // 扩展标签映射以包含更多常见变体
    const extendedMappings = {};
    Object.keys(labelMappings).forEach(key => {
      // 添加原始键
      extendedMappings[key] = labelMappings[key];
      
      // 添加键的小写版本
      extendedMappings[key.toLowerCase()] = labelMappings[key];
      
      // 添加常见的英文变体
      const englishMappings = {
        '名字': 'First Name',
        '姓氏': 'Last Name',
        '名': 'First Name',
        '姓': 'Last Name',
        '电子邮件': 'Email',
        '电话': 'Phone',
        '手机': 'Mobile',
        '地址': 'Address',
        '城市': 'City',
        '邮编': 'Zip',
        '国家': 'Country',
        '国籍': 'Nationality',
        '学校名称': 'School',
        '学位': 'Degree',
        '专业': 'Major',
        '入学日期': 'Start Date',
        '毕业日期': 'End Date',
        '在校时间': 'Education Period',
        '公司名称': 'Company',
        '职位': 'Position',
        '开始日期': 'Start Date',
        '结束日期': 'End Date',
        '工作描述': 'Description',
        '技能': 'Skills',
        '语言': 'Languages',
        '网站': 'Website',
        'LinkedIn': 'LinkedIn',
        '个人网站': 'Personal Website',
        '工作许可': 'Work Authorization',
        '推荐人': 'References',
        '姓名': 'Full Name',
        '全名': 'Full Name',
        '家庭住址': 'Home Address',
        '手机号码': 'Mobile Number',
        '电子邮箱': 'Email Address',
        '工作年限': 'Years of Experience',
        '期望薪资': 'Expected Salary',
        '自我介绍': 'Self Introduction',
        '个人简介': 'Profile Summary'
      };
      
      if (englishMappings[key]) {
        extendedMappings[englishMappings[key]] = labelMappings[key];
        extendedMappings[englishMappings[key].toLowerCase()] = labelMappings[key];
      }
    });
    
    // 填充每个字段
    formFields.forEach(field => {
      try {
        // 跳过文件上传字段
        if (field.isFileUpload) {
          console.log(`跳过文件上传字段: ${field.label}`);
          return;
        }
        
        // 根据字段标签查找匹配的简历数据
        const fieldLabel = field.label.replace('*', '').trim(); // 移除必填星号
        let valueToFill = null;
        
        // 直接匹配标签
        if (extendedMappings[fieldLabel]) {
          valueToFill = extendedMappings[fieldLabel];
        } 
        // 尝试部分匹配（标签包含关键词）
        else {
          for (const key of Object.keys(extendedMappings)) {
            if (fieldLabel.toLowerCase().includes(key.toLowerCase()) && extendedMappings[key]) {
              valueToFill = extendedMappings[key];
              break;
            }
          }
        }
        
        // 对于一些特殊字段类型，尝试更智能的匹配
        if (!valueToFill) {
          // 尝试根据字段类型和标签关键词进行匹配
          if (field.type === 'date' || field.tagName === 'date') {
            if (fieldLabel.toLowerCase().includes('生日') || fieldLabel.toLowerCase().includes('birth')) {
              valueToFill = resumeData.birth_date || resumeData.date_of_birth || '';
            }
          } else if (field.type === 'tel' || fieldLabel.toLowerCase().includes('电话') || fieldLabel.toLowerCase().includes('phone')) {
            valueToFill = resumeData.phone || '';
          } else if (field.type === 'email' || fieldLabel.toLowerCase().includes('邮件') || fieldLabel.toLowerCase().includes('email')) {
            valueToFill = resumeData.email || '';
          }
        }
        
        // 如果没有找到有效的值，尝试使用特殊字段处理 
        if (!valueToFill || valueToFill === '') {
          // 对于是/否问题，通常选择"是"
          if ((field.type === 'radio' || field.type === 'checkbox') && field.isGroup && field.groupOptions) {
            if (field.groupOptions.length === 2) {
              const yesOption = field.groupOptions.find(opt => 
                opt.label.toLowerCase().includes('yes') || 
                opt.label.toLowerCase().includes('是')
              );
              
              if (yesOption) {
                // 这里不直接填充，而是在下面的代码中处理
                valueToFill = yesOption.value;
              }
            }
          }
          // 对于工作授权或工作许可问题
          else if (fieldLabel.toLowerCase().includes('授权') || 
                   fieldLabel.toLowerCase().includes('许可') || 
                   fieldLabel.toLowerCase().includes('authorization') || 
                   fieldLabel.toLowerCase().includes('permit')) {
            valueToFill = '是' || 'Yes';
          }
        }
        
        // 如果找到了要填充的值
        if (valueToFill) {
          // 获取字段元素
          let element = field.element;
          if (!element) {
            element = document.querySelector(`[data-workday-field-id="${field.fieldId}"]`);
          }
          
          if (!element) {
            console.log(`找不到字段元素: ${field.label} (ID: ${field.fieldId})`);
            failedCount++;
            return;
          }
          
          // 根据字段类型进行不同的填充操作
          switch (field.type) {
            case 'text':
            case 'email':
            case 'tel':
            case 'textarea':
              if (element.value === '') {
                element.value = valueToFill;
                element.dispatchEvent(new Event('input', { bubbles: true }));
                element.dispatchEvent(new Event('change', { bubbles: true }));
                filledCount++;
                console.log(`填充文本字段: ${field.label} = ${valueToFill}`);
              }
              break;
              
            case 'select-one':
              if (element.value === '') {
                // 尝试匹配选项文本
                let optionFound = false;
                // 对于标准select元素
                if (element.tagName && element.tagName.toLowerCase() === 'select') {
                  for (let i = 0; i < element.options.length; i++) {
                    const option = element.options[i];
                    // 检查选项文本是否包含要填充的值（大小写不敏感）
                    if (option.text.toLowerCase().includes(valueToFill.toLowerCase()) ||
                        valueToFill.toLowerCase().includes(option.text.toLowerCase())) {
                      element.value = option.value;
                      element.selectedIndex = i;
                      element.dispatchEvent(new Event('change', { bubbles: true }));
                      filledCount++;
                      optionFound = true;
                      console.log(`填充下拉框: ${field.label} = ${option.text}`);
                      break;
                    }
                  }
                  
                  // 如果没有找到精确匹配，尝试使用更宽松的匹配
                  if (!optionFound && element.options.length > 0) {
                    // 跳过第一个选项，通常是"请选择"
                    if (element.options.length > 1) {
                      element.selectedIndex = 1;
                      element.dispatchEvent(new Event('change', { bubbles: true }));
                      filledCount++;
                      console.log(`填充下拉框（使用默认选项）: ${field.label} = ${element.options[1].text}`);
                    }
                  }
                } 
                // 对于自定义下拉元素
                else if (field.role === 'listbox' || field.role === 'combobox') {
                  // 点击元素打开下拉框
                  element.click();
                  setTimeout(() => {
                    // 查找选项并点击匹配的选项
                    const options = document.querySelectorAll('[role="option"]');
                    for (const option of options) {
                      if (option.textContent.toLowerCase().includes(valueToFill.toLowerCase()) ||
                          valueToFill.toLowerCase().includes(option.textContent.toLowerCase())) {
                        option.click();
                        filledCount++;
                        optionFound = true;
                        console.log(`填充自定义下拉框: ${field.label} = ${option.textContent}`);
                        break;
                      }
                    }
                    
                    // 如果没找到匹配项，选择第一个非空选项
                    if (!optionFound && options.length > 0) {
                      // 通常第一个是"请选择"，所以尝试第二个
                      if (options.length > 1) {
                        options[1].click();
                        filledCount++;
                        console.log(`填充自定义下拉框（默认选项）: ${field.label} = ${options[1].textContent}`);
                      } else {
                        options[0].click();
                        filledCount++;
                        console.log(`填充自定义下拉框（唯一选项）: ${field.label} = ${options[0].textContent}`);
                      }
                    }
                  }, 500);
                }
              }
              break;
              
            case 'date':
              // 处理日期字段
              if (valueToFill) {
                // 查找相关的日期输入框（通常在日期图标附近）
                const dateContainer = element.closest('[data-automation-id="dateTimeInputBox"]');
                let textInput = null;
                
                if (dateContainer) {
                  textInput = dateContainer.querySelector('input[type="text"]');
                } else if (field.textInputElement) {
                  textInput = field.textInputElement;
                }
                
                if (textInput && textInput.value === '') {
                  // 根据占位符格式化日期
                  let formattedDate = valueToFill;
                  const placeholder = textInput.getAttribute('placeholder');
                  
                  // 尝试以各种格式解析日期
                  try {
                    // 尝试解析各种可能的日期格式
                    let dateObj = null;
                    // ISO格式: YYYY-MM-DD
                    if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(valueToFill)) {
                      dateObj = new Date(valueToFill);
                    } 
                    // US格式: MM/DD/YYYY
                    else if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(valueToFill)) {
                      const parts = valueToFill.split('/');
                      dateObj = new Date(parts[2], parts[0] - 1, parts[1]);
                    } 
                    // EU格式: DD/MM/YYYY
                    else if (/^\d{1,2}\.\d{1,2}\.\d{4}$/.test(valueToFill)) {
                      const parts = valueToFill.split('.');
                      dateObj = new Date(parts[2], parts[1] - 1, parts[0]);
                    }
                    // 尝试直接解析
                    else {
                      dateObj = new Date(valueToFill);
                    }
                    
                    if (!isNaN(dateObj.getTime())) {
                      if (placeholder && placeholder.includes('MM/DD/YYYY')) {
                        formattedDate = `${(dateObj.getMonth() + 1).toString().padStart(2, '0')}/${dateObj.getDate().toString().padStart(2, '0')}/${dateObj.getFullYear()}`;
                      } else if (placeholder && placeholder.includes('DD/MM/YYYY')) {
                        formattedDate = `${dateObj.getDate().toString().padStart(2, '0')}/${(dateObj.getMonth() + 1).toString().padStart(2, '0')}/${dateObj.getFullYear()}`;
                      } else {
                        formattedDate = `${dateObj.getFullYear()}-${(dateObj.getMonth() + 1).toString().padStart(2, '0')}-${dateObj.getDate().toString().padStart(2, '0')}`;
                      }
                    }
                  } catch (error) {
                    console.error(`日期解析错误:`, error);
                  }
                  
                  textInput.value = formattedDate;
                  textInput.dispatchEvent(new Event('input', { bubbles: true }));
                  textInput.dispatchEvent(new Event('change', { bubbles: true }));
                  filledCount++;
                  console.log(`填充日期字段: ${field.label} = ${formattedDate}`);
                } else {
                  // 尝试直接点击日期图标，可能会打开日期选择器
                  element.click();
                  console.log(`点击日期图标: ${field.label}`);
                }
              }
              break;
              
            case 'radio':
              if (field.isGroup && field.groupOptions) {
                // 对于YES/NO类型的问题，通常选择YES
                if (field.groupOptions.length === 2) {
                  const yesOption = field.groupOptions.find(opt => 
                    opt.label.toLowerCase().includes('yes') || 
                    opt.label.toLowerCase().includes('是')
                  );
                  
                  if (yesOption) {
                    const radioButton = document.querySelector(`input[type="radio"][value="${yesOption.value}"]`);
                    if (radioButton && !radioButton.checked) {
                      radioButton.checked = true;
                      radioButton.dispatchEvent(new Event('change', { bubbles: true }));
                      filledCount++;
                      console.log(`选择单选按钮: ${field.label} = ${yesOption.label}`);
                    }
                  }
                }
                // 对于其他单选按钮组，尝试根据值匹配
                else if (valueToFill) {
                  // 尝试找到匹配值的选项
                  const matchedOption = field.groupOptions.find(opt => 
                    opt.label.toLowerCase().includes(valueToFill.toLowerCase()) || 
                    valueToFill.toLowerCase().includes(opt.label.toLowerCase())
                  );
                  
                  if (matchedOption) {
                    const radioButton = document.querySelector(`input[type="radio"][value="${matchedOption.value}"]`);
                    if (radioButton && !radioButton.checked) {
                      radioButton.checked = true;
                      radioButton.dispatchEvent(new Event('change', { bubbles: true }));
                      filledCount++;
                      console.log(`选择单选按钮: ${field.label} = ${matchedOption.label}`);
                    }
                  }
                  // 如果没有找到匹配项，尝试选择第一个选项
                  else if (field.groupOptions.length > 0) {
                    const firstOption = field.groupOptions[0];
                    const radioButton = document.querySelector(`input[type="radio"][value="${firstOption.value}"]`);
                    if (radioButton && !radioButton.checked) {
                      radioButton.checked = true;
                      radioButton.dispatchEvent(new Event('change', { bubbles: true }));
                      filledCount++;
                      console.log(`选择单选按钮(默认第一个): ${field.label} = ${firstOption.label}`);
                    }
                  }
                }
              }
              break;
              
            case 'checkbox':
              // 对于复选框，根据上下文决定是否选中
              if (field.label.toLowerCase().includes('同意') || 
                  field.label.toLowerCase().includes('agree') || 
                  field.label.toLowerCase().includes('accept') || 
                  field.label.toLowerCase().includes('条款') || 
                  field.label.toLowerCase().includes('terms')) {
                if (!element.checked) {
                  element.checked = true;
                  element.dispatchEvent(new Event('change', { bubbles: true }));
                  filledCount++;
                  console.log(`勾选复选框: ${field.label}`);
                }
              }
              break;
              
            default:
              // 尝试作为普通输入框填充
              if (element.value === undefined || element.value === '') {
                if (element.tagName && element.tagName.toLowerCase() === 'input') {
                  element.value = valueToFill;
                  element.dispatchEvent(new Event('input', { bubbles: true }));
                  element.dispatchEvent(new Event('change', { bubbles: true }));
                  filledCount++;
                  console.log(`填充默认输入字段: ${field.label} = ${valueToFill}`);
                } else {
                  // 对于其他元素，尝试点击
                  element.click();
                  console.log(`点击未知类型元素: ${field.label}`);
                }
              }
              break;
          }
        } else {
          console.log(`未找到匹配的值: ${field.label}`);
          failedCount++;
        }
      } catch (error) {
        console.error(`填充字段时出错: ${field.label}`, error);
        failedCount++;
      }
    });
    
    console.log(`表单填充完成。成功填充: ${filledCount} 个字段，失败: ${failedCount} 个字段`);
    return { filled: filledCount, failed: failedCount };
  }

  /**
   * 处理 Workday 特殊字段，如复选框和同意条款
   */
  async function handleWorkdaySpecialFields() {
    console.log("处理 Workday 特殊字段...");
    
    // 处理复选框（特别是同意条款和条件的复选框）
    const checkboxes = document.querySelectorAll('input[type="checkbox"]:not([data-workday-filled="true"])');
    let checkboxCount = 0;
    
    for (const checkbox of checkboxes) {
      if (checkbox.offsetParent === null) continue; // 跳过不可见元素
      
      // 获取复选框标签
      let checkboxLabel = '';
      if (checkbox.id) {
        const label = document.querySelector(`label[for="${checkbox.id}"]`);
        if (label) {
          checkboxLabel = label.textContent.trim().toLowerCase();
        }
      }
      
      if (!checkboxLabel) {
        const parentLabel = checkbox.closest('label');
        if (parentLabel) {
          checkboxLabel = parentLabel.textContent.trim().toLowerCase();
        }
      }
      
      // 检查是否是同意条款的复选框
      if (checkboxLabel.includes('agree') || checkboxLabel.includes('terms') || 
          checkboxLabel.includes('consent') || checkboxLabel.includes('privacy') ||
          checkboxLabel.includes('条款') || checkboxLabel.includes('同意') ||
          checkboxLabel.includes('隐私')) {
        
        console.log(`找到需要勾选的条款复选框: ${checkboxLabel}`);
        
        // 勾选复选框
        checkbox.checked = true;
        checkbox.dispatchEvent(new Event('change', { bubbles: true }));
        checkbox.setAttribute('data-workday-filled', 'true');
        checkboxCount++;
      }
    }
    
    // 处理下拉选择框
    const selectElements = document.querySelectorAll('select:not([data-workday-filled="true"])');
    let selectCount = 0;
    
    for (const select of selectElements) {
      if (select.offsetParent === null) continue; // 跳过不可见元素
      
      // 检查是否已有选择
      if (select.selectedIndex > 0) continue; // 跳过已有选择的
      
      // 获取选择框标签
      let selectLabel = '';
      if (select.id) {
        const label = document.querySelector(`label[for="${select.id}"]`);
        if (label) {
          selectLabel = label.textContent.trim().toLowerCase();
        }
      }
      
      // 查找特殊选择框
      if (selectLabel.includes('country') || selectLabel.includes('国家')) {
        // 尝试选择中国或美国选项
        for (const option of select.options) {
          const optionText = option.text.trim().toLowerCase();
          if (optionText.includes('china') || optionText.includes('中国')) {
            select.value = option.value;
            select.dispatchEvent(new Event('change', { bubbles: true }));
            select.setAttribute('data-workday-filled', 'true');
            selectCount++;
            break;
          }
        }
      } else if (selectLabel.includes('source') || selectLabel.includes('来源')) {
        // 尝试选择来源
        for (const option of select.options) {
          const optionText = option.text.trim().toLowerCase();
          if (optionText.includes('internet') || optionText.includes('job board') || 
              optionText.includes('linkedin') || optionText.includes('indeed')) {
            select.value = option.value;
            select.dispatchEvent(new Event('change', { bubbles: true }));
            select.setAttribute('data-workday-filled', 'true');
            selectCount++;
            break;
          }
        }
      }
    }
    
    console.log(`处理了 ${checkboxCount} 个复选框和 ${selectCount} 个特殊下拉框`);
  }
}

  // 检查当前是否为 Workday 页面并启用按钮
  function checkAndEnableWorkdayButton() {
    const startBtn = document.getElementById('start-workday-batch');
    const workdaySection = document.getElementById('workday-controls');
    const stopBtn = document.getElementById('stop-workday-batch');
    
    // Ensure global state variable is accessible if needed, or pass as argument
    // Depending on exact JS scoping, might need adjustment if isWorkdayBatchApplying isn't global enough
    const isProcessing = typeof isWorkdayBatchApplying !== 'undefined' ? isWorkdayBatchApplying : false; 

    const onWorkdayPage = window.location.href.includes('.myworkdayjobs.com');

    if (workdaySection) {
        workdaySection.style.display = onWorkdayPage ? 'block' : 'none';
    }

    if (startBtn) {
        // Disable if not on Workday OR if already processing
        startBtn.disabled = !onWorkdayPage || isProcessing; 
        startBtn.title = onWorkdayPage ? "开始批量处理当前页 Workday 职位" : "此功能仅在 Workday 招聘网站可用";
    }

    // Ensure stop button is hidden if not on Workday page OR if process isn't running
    if (stopBtn && (!onWorkdayPage || !isProcessing)) {
        stopBtn.style.display = 'none';
    }
    // Ensure start button is shown if not processing
     if (startBtn && !isProcessing) {
        startBtn.style.display = 'inline-block';
    }
}

// 监听模态框变化和页面导航
function setupModalAndNavigationObserver() {
  // 监听URL变化
  let lastUrl = location.href;
  new MutationObserver(() => {
    const url = location.href;
    if (url !== lastUrl) {
      lastUrl = url;
      console.log('URL changed, cleaning up any notices and checking Workday button status');
            // --- DEBUGGING: Check function availability before calling ---
      cleanupResumeUploadNotice();
      checkAndEnableWorkdayButton(); // URL 变化时重新检查 Workday 按钮状态
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
  // 处理来自后台脚本的新标签页处理完成消息
  else if (message.type === 'NEW_TAB_PROCESS_COMPLETE') {
    console.log("收到后台脚本的处理完成消息:", message);
    
    // 获取处理状态和详细信息
    const status = message.status || 'unknown';
    const details = message.details || '';
    const workdayTabId = message.workdayTabId;
    
    // 更新UI状态
    const statusDiv = document.getElementById('workday-batch-status');
    if (statusDiv) {
      if (status === 'success') {
        statusDiv.textContent = `Workday标签页处理成功: ${details}`;
      } else if (status === 'error') {
        statusDiv.textContent = `Workday标签页处理出错: ${details}`;
      } else {
        statusDiv.textContent = `Workday标签页处理结束: ${status}`;
      }
    }
    
    console.log(`解析NEW_TAB_PROCESS_COMPLETE，解析Promise...`);
    
    // 如果已经设置了解析器，使用它来完成Promise
    if (typeof window.resolveNewTabPromise === 'function') {
      console.log("找到等待的Promise解析器，正在解析...");
      window.resolveNewTabPromise({
        success: status === 'success',
        message: details,
        tabId: workdayTabId
      });
    } else {
      console.warn("没有找到等待的Promise解析器，可能已经超时或批量流程已停止");
    }
    
    sendResponse({ success: true, message: "已处理NEW_TAB_PROCESS_COMPLETE消息" });
  }
  // 处理进度更新消息
  else if (message.type === 'PROCESSING_UPDATE') {
    console.log("收到处理进度更新:", message);
    
    // 更新最后收到更新的时间（明确地设置为全局变量）
    if (typeof window.lastProcessingUpdate === 'undefined') {
      window.lastProcessingUpdate = Date.now();
    } else {
      window.lastProcessingUpdate = Date.now();
    }
    
    // 获取状态和详细信息
    const status = message.status || 'processing';
    const details = message.details || '处理中...';
    
    // 更新UI状态
    const statusDiv = document.getElementById('workday-batch-status');
    if (statusDiv) {
      statusDiv.textContent = `处理中: ${details}`;
    }
    
    // 更新处理中的UI
    if (typeof updateWorkdayUI === 'function') {
      updateWorkdayUI(true, `处理中: ${details}`);
    }
    
    sendResponse({ success: true, message: "已处理PROCESSING_UPDATE消息" });
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