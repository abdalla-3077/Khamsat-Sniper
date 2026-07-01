// content-listing.js — يراجع الطلبات واحداً تلو الآخر مع تغذية راجعة بصرية حية
(async function() {
  console.log('[خمسات سنايبر] تم تحميل السكريبت، الرابط:', window.location.href);

  if (!window.location.hostname.includes('khamsat.com')) {
    console.log('[خمسات سنايبر] لست على خمسات، خروج');
    return;
  }

  const state = {
    isScanning: false,
    shouldCancel: false,
    abortController: null,
    matches: []
  };

  // ── حقن الأنماط ──────────────────────────────────────────────────────
  function injectStyles() {
    if (document.getElementById('sniper-listing-styles')) return;
    const style = document.createElement('style');
    style.id = 'sniper-listing-styles';
    style.textContent = `
      @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;500;600;700&display=swap');

      .sniper-analysis-chip-container {
        margin-top: 10px;
        padding-top: 10px;
        border-top: 1px dashed rgba(252, 182, 46, 0.3);
        animation: sniper-fade-in 0.35s ease-out;
        font-family: 'IBM Plex Sans Arabic', 'Segoe UI', system-ui, sans-serif;
        display: block;
        width: 100%;
        box-sizing: border-box;
        overflow: hidden;
        direction: rtl;
      }

      @keyframes sniper-fade-in {
        from { opacity: 0; transform: translateY(5px); }
        to   { opacity: 1; transform: translateY(0); }
      }

      .sniper-chip-row {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 12px;
      }

      .sniper-chips-info {
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        gap: 6px;
        flex-shrink: 0;
      }

      .sniper-chips-actions {
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        gap: 6px;
        flex-shrink: 0;
      }

      /* Score chips */
      .sniper-score-chip {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        padding: 5px 12px;
        border-radius: 0;
        font-size: 13px;
        font-weight: 700;
        line-height: 1.4;
        white-space: nowrap;
      }

      .sniper-score-high {
        background: #fcb62e;
        color: #fff;
        border: 1px solid #e6a526;
      }

      .sniper-score-medium {
        background: #f59e0b;
        color: #fff;
        border: 1px solid #d97706;
      }

      .sniper-score-low {
        background: #ff2323;
        color: #fff;
        border: 1px solid #dc1616;
      }

      .sniper-score-icon {
        width: 7px;
        height: 7px;
        border-radius: 50%;
        background: currentColor;
        flex-shrink: 0;
      }

      /* Tag chips */
      .sniper-tag-chip {
        padding: 5px 12px;
        background: #e5e5e5;
        border: 1px solid #ccc;
        border-radius: 0;
        font-size: 13px;
        font-weight: 600;
        color: #333;
        line-height: 1.4;
        white-space: normal;
        word-wrap: break-word;
      }

      /* Status chips */
      .sniper-status-chip {
        padding: 5px 12px;
        border-radius: 0;
        font-size: 13px;
        font-weight: 700;
        line-height: 1.4;
        white-space: nowrap;
      }

      .sniper-status-match {
        color: #fff;
        background: #52b035;
        border: 1px solid #459a2c;
      }

      .sniper-status-nomatch {
        color: #666;
        background: #e5e5e5;
        border: 1px solid #ccc;
      }

      /* Reason text */
      .sniper-reason-text {
        flex: 1;
        min-width: 0;
        font-size: 12px;
        color: #555;
        line-height: 1.6;
        white-space: normal;
        word-wrap: break-word;
        padding: 0 8px;
        direction: rtl;
      }

      /* Action chips */
      .sniper-action-chip {
        border: none;
        padding: 10px 22px;
        border-radius: 0;
        font-size: 14px;
        font-weight: 700;
        cursor: pointer;
        line-height: 1.4;
        transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        white-space: nowrap;
        font-family: 'IBM Plex Sans Arabic', 'Segoe UI', system-ui, sans-serif;
        position: relative;
        overflow: hidden;
      }

      .sniper-chip-generate {
        background: linear-gradient(135deg, #fcb62e 0%, #e6a526 100%);
        color: #fff;
        box-shadow: 0 4px 15px rgba(252,182,46,0.35), inset 0 1px 0 rgba(255,255,255,0.15);
      }

      .sniper-chip-generate:hover {
        background: linear-gradient(135deg, #ffc240 0%, #f0b030 100%);
        transform: translateY(-2px);
        box-shadow: 0 6px 20px rgba(252,182,46,0.45), inset 0 1px 0 rgba(255,255,255,0.2);
      }

      .sniper-chip-generate:active {
        transform: translateY(0);
        box-shadow: 0 2px 8px rgba(252,182,46,0.3);
      }

      .sniper-chip-skip {
        background: rgba(0,0,0,0.06);
        color: #666;
        border: 1px solid rgba(0,0,0,0.12);
      }

      .sniper-chip-skip:hover {
        background: rgba(0,0,0,0.1);
        color: #444;
        border-color: rgba(0,0,0,0.2);
        transform: translateY(-1px);
      }

      .sniper-chip-skip:active {
        transform: translateY(0);
      }

      /* Row highlight */
      tr.sniper-card-match td {
        background-color: rgba(252, 182, 46, 0.06) !important;
        border-bottom: 1px solid rgba(252, 182, 46, 0.15) !important;
      }

      .sniper-card-skip {
        opacity: 0.45;
        transition: opacity 0.3s;
      }

      .sniper-card-skip:hover {
        opacity: 0.85;
      }
    `;
    document.head.appendChild(style);
  }

  // ── مؤشر التحميل ─────────────────────────────────────────────────────
  function createLoadingIndicator() {
    const existing = document.getElementById('sniper-loading');
    if (existing) existing.remove();

    const loading = document.createElement('div');
    loading.id = 'sniper-loading';
    loading.className = 'sniper-loading-indicator';
    loading.innerHTML = `
      <div class="sniper-spinner-small"></div>
      <span>جاري الفحص...</span>
    `;
    loading.style.cssText = 'display: none;';
    document.body.appendChild(loading);
    return loading;
  }

  // ── إشعار ─────────────────────────────────────────────────────────────
  function showNotice(message, duration = 3000) {
    const existing = document.getElementById('sniper-notice');
    if (existing) existing.remove();

    const notice = document.createElement('div');
    notice.id = 'sniper-notice';
    notice.className = 'sniper-notice';
    notice.textContent = message;
    document.body.appendChild(notice);

    if (duration > 0) {
      setTimeout(() => {
        if (notice.parentNode) notice.remove();
      }, duration);
    }
    return notice;
  }

  // ── تحديث عداد المطابقات ──────────────────────────────────────────────
  function updateMatchCount() {
    try {
      chrome.storage.local.get(['matches'], (data) => {
        if (chrome.runtime.lastError) return;
        const allMatches = data.matches || [];
        const uniqueUrls = new Set(allMatches.map(m => m.url));
        const countEl = document.getElementById('sniper-match-count');
        if (countEl) countEl.textContent = uniqueUrls.size;
      });
    } catch (e) { /* تجاهل */ }
  }

  // ── طلب شبكي مع مهلة ──────────────────────────────────────────────────
  async function fetchWithTimeout(url, options, timeout = 10000) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    try {
      const response = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  // ── طلب شبكي مع إعادة محاولة ─────────────────────────────────────────
  async function fetchWithRetry(url, options, maxRetries = 3) {
    let lastError;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const response = await fetchWithTimeout(url, options, 20000);

        if (response.status === 429) {
          const retryAfter = response.headers.get('Retry-After');
          const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : Math.pow(2, attempt) * 2000;
          console.log(`[خمسات سنايبر] تجاوز الحد المسموح، انتظار ${waitTime}ms...`);
          showNotice(`تجاوز الحد، انتظار ${waitTime / 1000} ثانية...`, waitTime);
          await new Promise(resolve => setTimeout(resolve, waitTime));
          continue;
        }

        return response;
      } catch (error) {
        lastError = error;
        if (attempt < maxRetries - 1) {
          const waitTime = Math.pow(2, attempt) * 1000;
          console.log(`[خمسات سنايبر] فشل الطلب، إعادة المحاولة بعد ${waitTime}ms...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }
      }
    }

    throw lastError || new Error('تجاوز عدد المحاولات القصوى');
  }

  // ── تنظيف العناوين ────────────────────────────────────────────────────
  function cleanTitle(title) {
    if (!title) return '';
    return title
      .replace(/\d+ طلب(?:ات)?(?: خدمات)?(?: جديدة)?/g, '')
      .replace(/طلبات_services/g, '')
      .replace(/services-requests/g, '')
      .replace(/requests/gi, '')
      .replace(/^\d+\s*[-–]\s*/, '')
      .replace(/^[-–]\s*\d+\s*/, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  // ── تحقق من مدى ملاءمة الخدمة ────────────────────────────────────────
  async function checkServiceRelevance(service, apiKey, provider) {
    let selectedFields, skills, cfgProvider, selectedModel;
    try {
      const result = await new Promise((resolve, reject) => {
        chrome.storage.local.get(['selectedFields', 'skills', 'provider', 'selectedModelGroq', 'selectedModelOpenAI', 'selectedModelMistral', 'selectedModelCerebras'], (r) => {
          if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
          else resolve(r);
        });
      });
      selectedFields = result.selectedFields || [];
      skills = result.skills;
      cfgProvider = result.provider;

      const modelKey = 'selectedModel' + provider.charAt(0).toUpperCase() + provider.slice(1);
      selectedModel = result[modelKey];
    } catch (e) {
      throw new Error('تعذر الوصول إلى سياق الإضافة');
    }

    const currentProvider = cfgProvider || provider;

    const prompt = `أنت مساعد مطابقة وظائف. حلل طلب الخدمة العربي التالي.

مجالات اهتمام المستخدم: ${selectedFields.join(', ')}
مهارات المستخدم: ${skills}

عنوان الخدمة: ${service.title}
تصنيف الخدمة: ${service.category || 'غير محدد'}
وصف الخدمة: ${service.description || 'غير متاح'}
الميزانية: ${service.budget || 'غير محدد'}
المهارات المطلوبة: ${service.skills || 'غير محدد'}

حدد:
1. هل تتوافق هذه الخدمة مع أي من مجالات اهتمام المستخدم؟
2. هل يمتلك المستخدم المهارات اللازمة؟
3. هل هي فرصة جيدة؟

أجب بـ JSON فقط:
{
  "is_match": true/false,
  "reason": "اشرح بالعربية سبب المطابقة أو عدمها. كن محدداً.",
  "match_score": 0-100,
  "matched_field": "المجال الذي يتطابق مع اهتمامات المستخدم، أو null"
}`;

    const endpoints = {
      openai: 'https://api.openai.com/v1/chat/completions',
      groq: 'https://api.groq.com/openai/v1/chat/completions',
      mistral: 'https://api.mistral.ai/v1/chat/completions',
      cerebras: 'https://api.cerebras.ai/v1/chat/completions'
    };

    const defaultModels = {
      openai: 'gpt-4o-mini',
      groq: 'llama-3.1-8b-instant',
      mistral: 'mistral-small-latest',
      cerebras: 'gemma-4-31b'
    };

    const endpoint = endpoints[currentProvider];
    if (!endpoint) throw new Error('مزود غير صالح');

    const response = await fetchWithRetry(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: selectedModel || defaultModels[currentProvider],
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        max_tokens: 500
      })
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`خطأ API: ${response.status} - ${errorData}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content || '';

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('صيغة رد الذكاء الاصطناعي غير صالحة');

    try {
      return JSON.parse(jsonMatch[0]);
    } catch (e) {
      throw new Error('فشل تحليل رد الذكاء الاصطناعي');
    }
  }

  // ── شريط التقدم ───────────────────────────────────────────────────────
  function createProgressBar() {
    const existing = document.getElementById('sniper-progress');
    if (existing) existing.remove();

    const progress = document.createElement('div');
    progress.id = 'sniper-progress';
    progress.className = 'sniper-progress-bar';
    progress.innerHTML = `
      <div class="sniper-progress-header">
        <span class="sniper-progress-title">مراجعة الذكاء الاصطناعي</span>
        <span class="sniper-progress-count" id="progress-count">0 / 0</span>
      </div>
      <div class="sniper-progress-track">
        <div class="sniper-progress-fill" id="progress-fill" style="width: 0%"></div>
      </div>
      <div class="sniper-progress-current" id="progress-current"></div>
      <button class="sniper-progress-cancel" id="progress-cancel">إلغاء</button>
    `;
    document.body.appendChild(progress);

    document.getElementById('progress-cancel').addEventListener('click', () => {
      state.shouldCancel = true;
      showNotice('جاري الإلغاء...');
    });

    return progress;
  }

  function updateProgress(current, total, title) {
    const countEl = document.getElementById('progress-count');
    const fillEl = document.getElementById('progress-fill');
    const currentEl = document.getElementById('progress-current');

    if (countEl) countEl.textContent = `${current} / ${total}`;
    if (fillEl) fillEl.style.width = `${(current / total) * 100}%`;
    if (currentEl) currentEl.textContent = cleanTitle(title) || `معالجة الطلب ${current}`;
  }

  function stopScanning() {
    state.isScanning = false;
    state.shouldCancel = false;
    if (state.abortController) {
      state.abortController.abort();
      state.abortController = null;
    }

    const progress = document.getElementById('sniper-progress');
    if (progress) progress.remove();

    const loading = document.getElementById('sniper-loading');
    if (loading) loading.remove();

    const btn = document.getElementById('sniper-start');
    if (btn) {
      btn.disabled = false;
      btn.textContent = 'ابدأ المراجعة';
    }
  }

  // ── البحث عن بطاقات الطلبات ──────────────────────────────────────────
  function findServiceCards() {
    const allLinks = document.querySelectorAll('a[href]');
    console.log(`[خمسات سنايبر] إجمالي الروابط في الصفحة: ${allLinks.length}`);
    
    const serviceLinks = Array.from(allLinks).filter(link => {
      const href = link.href || link.getAttribute('href') || '';
      const text = link.textContent.trim();
      const matches = href.match(/\/community\/requests\/\d+-/);
      if (matches) {
        console.log(`[خمسات سنايبر] رابط مطابق: ${href.substring(0, 80)} | نص: ${text.substring(0, 30)}`);
      }
      return matches && text.length > 5;
    });

    if (serviceLinks.length === 0) {
      console.log('[خمسات سنايبر] لم يتم العثور على روابط طلبات');
      return [];
    }

    console.log(`[خمسات سنايبر] تم العثور على ${serviceLinks.length} رابط`);

    const cards = [];
    const processedUrls = new Set();

    serviceLinks.forEach(link => {
      const url = link.href;
      if (processedUrls.has(url)) return;

      let container = null;
      let parent = link;

      while (parent && parent !== document.body) {
        if (parent.tagName === 'TR') {
          container = parent;
          break;
        }

        const rect = parent.getBoundingClientRect();
        if (rect.height > 60 && rect.top > 50 && parent.tagName !== 'TD' && parent.tagName !== 'TH') {
          container = parent;
          break;
        }

        parent = parent.parentElement;
      }

      if (!container) container = link.parentElement;

      let injectTarget = container;
      if (container.tagName === 'TR') {
        injectTarget = link.closest('td') || link.parentElement;
      }

      processedUrls.add(url);
      cards.push({ element: container, injectTarget, link, url });
    });

    console.log(`[خمسات سنايبر] تم العثور على ${cards.length} بطاقة`);
    return cards;
  }

  // ── رسم بطاقة التحليل ────────────────────────────────────────────────
  function renderAnalysisCard(card, injectTarget, result, serviceData, url) {
    const existing = injectTarget.querySelector('.sniper-analysis-chip-container');
    if (existing) existing.remove();

    if (!injectTarget || !injectTarget.appendChild) {
      console.error('[خمسات سنايبر] عنصر الحقن غير صالح:', injectTarget);
      return;
    }

    let scoreClass = 'sniper-score-low';
    if (result.match_score >= 70) scoreClass = 'sniper-score-high';
    else if (result.match_score >= 40) scoreClass = 'sniper-score-medium';

    const chipContainer = document.createElement('div');
    chipContainer.className = 'sniper-analysis-chip-container';
    chipContainer.innerHTML = `
      <div class="sniper-chip-row">
        <div class="sniper-chips-info">
          <div class="sniper-score-chip ${scoreClass}">
            <span class="sniper-score-icon"></span>
            ${result.match_score}%
          </div>
          ${result.matched_field ? `<span class="sniper-tag-chip" title="${result.matched_field}">${result.matched_field}</span>` : ''}
          <span class="sniper-status-chip ${result.is_match ? 'sniper-status-match' : 'sniper-status-nomatch'}">
            ${result.is_match ? '✓ مطابق' : '✕ غير مطابق'}
          </span>
        </div>
        <div class="sniper-reason-text" title="${result.reason}">
          ${result.reason}
        </div>
        <div class="sniper-chips-actions">
          ${result.is_match ? `
            <button class="sniper-action-chip sniper-chip-generate" data-url="${url}" data-title="${encodeURIComponent(serviceData.title)}">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
              رد
            </button>
            <button class="sniper-action-chip sniper-chip-skip" data-action="skip">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
              تخطي
            </button>
          ` : ''}
        </div>
      </div>
    `;

    try {
      injectTarget.appendChild(chipContainer);
    } catch (e) {
      console.error('[خمسات سنايبر] فشل الإضافة:', e);
      return;
    }

    if (result.is_match) {
      card.classList.add('sniper-card-match');
      card.classList.remove('sniper-card-skip');
    } else {
      card.classList.add('sniper-card-skip');
      card.classList.remove('sniper-card-match');
    }

    const generateBtn = chipContainer.querySelector('.sniper-chip-generate');
    const skipBtn = chipContainer.querySelector('.sniper-chip-skip');

    if (generateBtn) {
      generateBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        showNotice('جاري فتح الطلب...');
        chrome.runtime.sendMessage({ action: 'openAndGenerate', url, title: decodeURIComponent(generateBtn.dataset.title) });
      });
    }

    if (skipBtn) {
      skipBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        card.style.opacity = '0.35';
        card.style.transition = 'opacity 0.3s';
      });
    }
  }

  // ── بدء الفحص ─────────────────────────────────────────────────────────
  async function startScanning() {
    if (state.isScanning) return;

    state.isScanning = true;
    state.shouldCancel = false;

    const btn = document.getElementById('sniper-start');
    if (btn) {
      btn.disabled = true;
      btn.textContent = 'جاري المراجعة...';
    }

    const loading = createLoadingIndicator();
    loading.style.display = 'flex';

    const progress = createProgressBar();

    try {
      let data;
      try {
        data = await new Promise((resolve, reject) => {
          chrome.storage.local.get(['provider', 'apiKey', 'apiKeyGroq', 'apiKeyOpenAI', 'apiKeyMistral', 'apiKeyCerebras'], (result) => {
            if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
            else resolve(result);
          });
        });
      } catch (e) {
        throw new Error('تعذر الوصول إلى الإضافة. أعد تحميل الصفحة.');
      }

      const provider = data.provider || 'groq';
      let apiKey = '';

      if (provider === 'groq') apiKey = data.apiKeyGroq || data.apiKey;
      else if (provider === 'openai') apiKey = data.apiKeyOpenAI || data.apiKey;
      else if (provider === 'mistral') apiKey = data.apiKeyMistral || data.apiKey;
      else if (provider === 'cerebras') apiKey = data.apiKeyCerebras || data.apiKey;

      if (!apiKey) {
        showNotice('أدخل مفتاح API في الإعدادات أولاً');
        stopScanning();
        return;
      }

      state.abortController = new AbortController();

      const serviceCards = findServiceCards();

      if (serviceCards.length === 0) {
        showNotice('لم يتم العثور على طلبات للمراجعة', 5000);
        stopScanning();
        return;
      }

      const existingMatches = await new Promise((resolve, reject) => {
        chrome.storage.local.get(['matches', 'generatedOffers'], (r) => {
          if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
          else resolve(r);
        });
      });
      const existingUrls = new Set((existingMatches.matches || []).map(m => m.url));
      const existingTitles = new Set((existingMatches.generatedOffers || []).map(o => o.title));

      let reviewedCount = 0;
      let matchCount = 0;

      for (let i = 0; i < serviceCards.length; i++) {
        if (state.shouldCancel) {
          console.log('[خمسات سنايبر] تم إلغاء الفحص من قِبل المستخدم');
          break;
        }

        const cardData = serviceCards[i];
        const card = cardData.element;
        const injectTarget = cardData.injectTarget || card;
        const link = cardData.link;
        const url = cardData.url;

        const title = cleanTitle(link.textContent) || cleanTitle(card.textContent || '');

        if (existingTitles.has(title)) continue;

        updateProgress(i + 1, serviceCards.length, title);

        try {
          const serviceData = {
            title,
            category: card.querySelector ? (card.querySelector('.category, .tag, .badge')?.textContent || '') : '',
            description: card.querySelector ? (card.querySelector('.description, .details, .summary, p')?.textContent?.substring(0, 300) || '') : '',
            budget: card.querySelector ? (card.querySelector('.budget, .price, .cost')?.textContent || '') : '',
            skills: card.querySelector ? (card.querySelector('.skills, .requirements, .tags')?.textContent || '') : '',
            url
          };

          console.log(`[خمسات سنايبر] معالجة ${i + 1}/${serviceCards.length}: ${title.substring(0, 50)}`);

          const result = await checkServiceRelevance(serviceData, apiKey, provider);

          if (state.shouldCancel) {
            console.log('[خمسات سنايبر] إلغاء بعد استدعاء API');
            break;
          }

          reviewedCount++;

          console.log(`[خمسات سنايبر] نتيجة "${title.substring(0, 30)}": score=${result.match_score}, is_match=${result.is_match}`);

          renderAnalysisCard(card, injectTarget, result, serviceData, url);

          if (result.is_match) {
            matchCount++;

            if (!existingUrls.has(url)) {
              try {
                chrome.storage.local.get(['matches'], (data) => {
                  if (chrome.runtime.lastError) return;
                  const matches = data.matches || [];
                  matches.push({
                    ...serviceData,
                    relevance: result.match_score,
                    reason: result.reason,
                    timestamp: Date.now()
                  });
                  chrome.storage.local.set({ matches });
                });
              } catch (e) { /* تجاهل أخطاء التخزين */ }
            }
          }

          // تحديث عداد المطابقات في الواجهة
          const countEl = document.getElementById('sniper-match-count');
          if (countEl) countEl.textContent = matchCount;

          if (i < serviceCards.length - 1 && !state.shouldCancel) {
            for (let w = 0; w < 15; w++) {
              if (state.shouldCancel) break;
              await new Promise(r => setTimeout(r, 100));
            }
          }

        } catch (error) {
          console.error(`خطأ في معالجة الخدمة ${i + 1}:`, error);
        }
      }

      if (!state.shouldCancel) {
        showNotice(`اكتملت المراجعة. ${matchCount} مطابقة من أصل ${reviewedCount} طلب.`, 6000);
      }

    } catch (error) {
      console.error('خطأ أثناء الفحص:', error);
      showNotice('حدث خطأ: ' + error.message, 6000);
    } finally {
      stopScanning();
      updateMatchCount();
    }
  }

  // ── حقن واجهة التحكم ─────────────────────────────────────────────────
  function injectUI() {
    if (document.getElementById('sniper-controls')) return;

    injectStyles();

    const container = document.createElement('div');
    container.id = 'sniper-controls';
    container.style.cssText = `
      position: fixed;
      bottom: 24px;
      left: 24px;
      z-index: 999999;
      font-family: 'IBM Plex Sans Arabic', 'Segoe UI', system-ui, sans-serif;
      direction: rtl;
    `;

    container.innerHTML = `
      <div style="
        background: #ffffff;
        border: 1px solid rgba(0,0,0,0.1);
        border-radius: 0;
        padding: 14px;
        display: flex;
        flex-direction: column;
        gap: 10px;
        min-width: 150px;
        box-shadow: 0 16px 50px rgba(0,0,0,0.15), 0 0 80px rgba(252,182,46,0.06);
      ">
        <!-- شعار + عنوان -->
        <div style="display: flex; align-items: center; gap: 8px; padding: 0 2px;">
          <div style="
            width: 24px; height: 24px;
            background: rgba(252,182,46,0.12);
            border: 1px solid rgba(252,182,46,0.25);
            border-radius: 0;
            display: flex; align-items: center; justify-content: center;
          ">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fcb62e" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <circle cx="12" cy="12" r="4"/>
            </svg>
          </div>
          <span style="color: #444; font-size: 11px; font-weight: 600; letter-spacing: 0.04em;">سنايبر</span>
        </div>

        <!-- زر ابدأ المراجعة -->
        <button id="sniper-start" style="
          background: #fcb62e;
          color: #fff;
          border: none;
          padding: 9px 14px;
          border-radius: 0;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.25s ease;
          font-family: inherit;
          letter-spacing: 0.01em;
        ">ابدأ المراجعة</button>

        <!-- عداد المطابقات -->
        <div style="
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 10px;
          background: rgba(0,0,0,0.03);
          border: 1px solid rgba(0,0,0,0.06);
          border-radius: 0;
        ">
          <span style="color: #888; font-size: 10px; font-weight: 500;">مطابقات</span>
          <span id="sniper-match-count" style="
            color: #fcb62e;
            font-size: 18px;
            font-weight: 700;
            letter-spacing: -0.02em;
            font-variant-numeric: tabular-nums;
          ">0</span>
        </div>
      </div>
    `;

    document.body.appendChild(container);

    const startBtn = document.getElementById('sniper-start');
    startBtn.addEventListener('click', startScanning);
    startBtn.addEventListener('mouseenter', () => {
      if (!startBtn.disabled) {
        startBtn.style.transform = 'translateY(-1px)';
        startBtn.style.boxShadow = '0 6px 20px rgba(252,182,46,0.35)';
      }
    });
    startBtn.addEventListener('mouseleave', () => {
      startBtn.style.transform = '';
      startBtn.style.boxShadow = '';
    });

    updateMatchCount();
  }

  // ── تشغيل عند جاهزية الصفحة ──────────────────────────────────────────
  const checkAndInject = () => injectUI();

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', checkAndInject);
  } else {
    checkAndInject();
  }

  const observer = new MutationObserver(() => {
    if (!document.getElementById('sniper-controls')) injectUI();
  });

  observer.observe(document.body, { childList: true, subtree: true });

  window.stopScanning = stopScanning;
})();
