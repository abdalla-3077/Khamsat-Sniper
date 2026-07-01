// content-detail.js — لوحة عائمة لتوليد العروض بالذكاء الاصطناعي
(function() {
  if (!window.location.hostname.includes('khamsat.com')) return;

  const isServicePage = (
    window.location.href.includes('/community/requests/') &&
    !window.location.href.endsWith('/community/requests') &&
    !window.location.href.includes('?')
  ) ||
    window.location.href.includes('/requests/') ||
    window.location.href.includes('/service/') ||
    window.location.href.includes('/services/');

  const isListingPage =
    window.location.pathname === '/community/requests' ||
    window.location.pathname === '/community/requests/';

  if (!isServicePage || isListingPage) return;

  let panel = null;
  let currentOffer = null;

  // ── إنشاء اللوحة العائمة ──────────────────────────────────────────────
  function createPanel() {
    if (panel) return panel;

    panel = document.createElement('div');
    panel.id = 'sniper-floating-panel';
    panel.className = 'sniper-panel';

    panel.innerHTML = `
      <div class="sniper-panel-header" id="panel-drag-handle">
        <div style="display: flex; align-items: center; gap: 8px;">
          <div style="
            width: 22px; height: 22px;
            background: rgba(252,182,46,0.15);
            border-radius: 0;
            display: flex; align-items: center; justify-content: center;
          ">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fcb62e" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <circle cx="12" cy="12" r="4"/>
            </svg>
          </div>
          <h3>مساعد العروض</h3>
        </div>
        <button class="sniper-panel-close" id="panel-close" title="إغلاق">&#x2715;</button>
      </div>
      <div class="sniper-panel-body" id="panel-body">
        <div id="panel-loading" class="sniper-loading" style="display: none;">
          <div class="sniper-spinner"></div>
          <div style="color: var(--color-text-secondary); font-size: 12px; margin-top: 12px; text-align: center;">جاري توليد الرد...</div>
        </div>
        <div id="panel-content">
          <div style="text-align: center; padding: 28px 16px;">
            <div style="
              width: 48px; height: 48px;
              background: var(--color-accent-dim);
              border: 1px solid var(--color-border-accent);
              border-radius: 0;
              display: flex; align-items: center; justify-content: center;
              margin: 0 auto 12px;
            ">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
              </svg>
            </div>
            <div style="color: var(--color-text-secondary); font-size: 13px; font-weight: 500; margin-bottom: 6px;">جاهز لتوليد عرضك</div>
            <div style="color: var(--color-text-tertiary); font-size: 11px; line-height: 1.5;">اضغط الزر أدناه لتوليد رد احترافي مخصص لهذا الطلب</div>
          </div>
        </div>
      </div>
      <div class="sniper-panel-footer" id="panel-footer">
        <button class="sniper-btn sniper-btn-primary" id="generate-offer" style="flex: 1;">
          <span style="display: flex; align-items: center; justify-content: center; gap: 6px;">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
            </svg>
            توليد العرض
          </span>
        </button>
      </div>
    `;

    document.body.appendChild(panel);

    setupDrag();
    setupEventListeners();

    return panel;
  }

  // ── سحب اللوحة ───────────────────────────────────────────────────────
  function setupDrag() {
    const handle = document.getElementById('panel-drag-handle');
    let isDragging = false;
    let startX, startY, startLeft, startTop;

    handle.addEventListener('mousedown', (e) => {
      // لا تبدأ السحب إذا تم الضغط على زر الإغلاق
      if (e.target.closest('#panel-close')) return;
      isDragging = true;
      startX = e.clientX;
      startY = e.clientY;
      const rect = panel.getBoundingClientRect();
      startLeft = rect.left;
      startTop = rect.top;
      panel.style.transition = 'none';
      handle.style.cursor = 'grabbing';
    });

    document.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      panel.style.left = `${startLeft + dx}px`;
      panel.style.top = `${startTop + dy}px`;
      panel.style.right = 'auto';
    });

    document.addEventListener('mouseup', () => {
      isDragging = false;
      panel.style.transition = '';
      handle.style.cursor = 'move';
    });
  }

  // ── ربط الأحداث ──────────────────────────────────────────────────────
  function setupEventListeners() {
    document.getElementById('panel-close').addEventListener('click', hidePanel);
    document.getElementById('generate-offer').addEventListener('click', generateOffer);
  }

  // ── استخراج معلومات الخدمة ───────────────────────────────────────────
  async function getServiceInfo() {
    const title = document.querySelector('h1, .request-title, .service-title')?.textContent?.trim() ||
                  document.title.replace(' - خمسات', '').trim();

    const description = document.querySelector('.request-description, .service-description, .description')?.textContent?.trim() ||
                        document.querySelector('p')?.textContent?.trim() || '';

    const skills = [];
    document.querySelectorAll('.skill, .tag, .requirement').forEach(el => {
      const text = el.textContent.trim();
      if (text) skills.push(text);
    });

    const budget = document.querySelector('.budget, .price, .amount')?.textContent?.trim() || '';

    return {
      title,
      description: description.substring(0, 500),
      skills: skills.join(', '),
      budget
    };
  }

  // ── طلب شبكي مع إعادة المحاولة ───────────────────────────────────────
  async function fetchWithRetry(url, options, maxRetries = 3) {
    let lastError;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 20000);

        const response = await fetch(url, { ...options, signal: controller.signal });
        clearTimeout(timeoutId);

        if (response.status === 429) {
          const retryAfter = response.headers.get('Retry-After');
          const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : Math.pow(2, attempt) * 2000;
          console.log(`[خمسات سنايبر] تجاوز الحد المسموح، انتظار ${waitTime}ms...`);
          throw new Error(`تجاوز الحد المسموح. إعادة المحاولة بعد ${waitTime / 1000} ثانية...`);
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

  // ── استدعاء الذكاء الاصطناعي ─────────────────────────────────────────
  async function callAI(prompt) {
    let data;
    try {
      data = await new Promise((resolve, reject) => {
        chrome.storage.local.get(['provider', 'apiKey', 'apiKeyGroq', 'apiKeyOpenAI', 'apiKeyMistral', 'apiKeyCerebras', 'selectedModelGroq', 'selectedModelOpenAI', 'selectedModelMistral', 'selectedModelCerebras', 'persona'], (r) => {
          if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
          else resolve(r);
        });
      });
    } catch (e) {
      throw new Error('تعذر الوصول إلى الإضافة. أعد تحميل الصفحة.');
    }

    const provider = data.provider || 'groq';
    let apiKey = '';
    let model = '';

    if (provider === 'groq') {
      apiKey = data.apiKeyGroq || data.apiKey;
      model = data.selectedModelGroq;
    } else if (provider === 'openai') {
      apiKey = data.apiKeyOpenAI || data.apiKey;
      model = data.selectedModelOpenAI;
    } else if (provider === 'mistral') {
      apiKey = data.apiKeyMistral || data.apiKey;
      model = data.selectedModelMistral;
    } else if (provider === 'cerebras') {
      apiKey = data.apiKeyCerebras || data.apiKey;
      model = data.selectedModelCerebras;
    }

    if (!apiKey) throw new Error('لم يتم إعداد مفتاح API. افتح الإعدادات.');

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

    const response = await fetchWithRetry(endpoints[provider], {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: model || defaultModels[provider],
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 1500
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`خطأ API ${response.status}: ${errorText}`);
    }

    const result = await response.json();
    return result.choices[0]?.message?.content || '';
  }

  // ── توليد العرض ──────────────────────────────────────────────────────
  async function generateOffer() {
    const serviceInfo = await getServiceInfo();

    const loadingEl = document.getElementById('panel-loading');
    const contentEl = document.getElementById('panel-content');
    const generateBtn = document.getElementById('generate-offer');

    loadingEl.style.display = 'block';
    contentEl.style.display = 'none';
    generateBtn.disabled = true;

    try {
      let data;
      try {
        data = await new Promise((resolve, reject) => {
          chrome.storage.local.get(['skills', 'persona', 'selectedFields'], (r) => {
            if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
            else resolve(r);
          });
        });
      } catch (e) {
        throw new Error('تعذر الوصول إلى الإضافة. أعد تحميل الصفحة.');
      }

      const selectedFields = (data.selectedFields || []).join(', ');

      const prompt = `اكتب رداً احترافياً باللغة العربية على طلب الخدمة التالي في خمسات.

عنوان الطلب: ${serviceInfo.title}
وصف الطلب: ${serviceInfo.description}
المهارات المطلوبة: ${serviceInfo.skills}
الميزانية: ${serviceInfo.budget || 'غير محددة'}

مجالاتك: ${selectedFields}
مهاراتك: ${data.skills}
${data.persona ? `أسلوب الرد: ${data.persona}` : ''}

المتطلبات:
1. اكتب باللغة العربية حصراً
2. كن محترفاً وودوداً في الوقت ذاته
3. أظهر فهماً حقيقياً للمشروع
4. سلط الضوء على خبرتك ذات الصلة
5. اجعله موجزاً (فقرتان إلى ثلاث فقرات)
6. لا تستخدم نصوصاً نموذجية مثل [اسمك] — استخدم صياغة احترافية عامة
7. اختم بدعوة واضحة للتواصل

اكتب نص الرد فقط، بلا عناوين أو شروحات.`;

      const reply = await callAI(prompt);
      currentOffer = reply;

      loadingEl.style.display = 'none';
      contentEl.style.display = 'block';
      contentEl.innerHTML = `
        <div style="margin-bottom: 10px;">
          <div style="
            display: flex;
            align-items: center;
            gap: 6px;
            margin-bottom: 8px;
          ">
            <span style="
              display: inline-block;
              width: 6px; height: 6px;
              border-radius: 50%;
              background: var(--color-accent);
              box-shadow: 0 0 6px var(--color-accent-glow);
            "></span>
            <span style="font-size: 10px; color: var(--color-text-tertiary); font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase;">العرض المولَّد</span>
          </div>
          <textarea class="sniper-textarea" id="offer-textarea" rows="8">${escapeHtml(reply)}</textarea>
        </div>
        <div class="sniper-actions-row" style="margin-top: 10px;">
          <button class="sniper-btn sniper-btn-secondary" id="copy-offer" style="flex: 1;">
            <span style="display: flex; align-items: center; justify-content: center; gap: 5px;">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
              </svg>
              نسخ
            </span>
          </button>
          <button class="sniper-btn sniper-btn-secondary" id="insert-offer" style="flex: 1;">
            <span style="display: flex; align-items: center; justify-content: center; gap: 5px;">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
              إدراج
            </span>
          </button>
        </div>
        <div id="copy-status" style="text-align: center; margin-top: 8px; font-size: 11px; color: var(--color-accent); display: none; font-weight: 500;"></div>
      `;

      document.getElementById('copy-offer').addEventListener('click', () => {
        const textarea = document.getElementById('offer-textarea');
        navigator.clipboard.writeText(textarea.value).then(() => {
          const copyStatus = document.getElementById('copy-status');
          copyStatus.textContent = '✓ تم النسخ إلى الحافظة';
          copyStatus.style.display = 'block';
          setTimeout(() => { copyStatus.style.display = 'none'; }, 2500);
        });
      });

      document.getElementById('insert-offer').addEventListener('click', () => {
        const textarea = document.getElementById('offer-textarea');
        insertIntoPage(textarea.value);
      });

      generateBtn.disabled = false;
      // تحديث نص الزر بعد التوليد
      generateBtn.innerHTML = `
        <span style="display: flex; align-items: center; justify-content: center; gap: 6px;">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M1 4v6h6"/><path d="M3.51 15a9 9 0 1 0 .49-3.03"/>
          </svg>
          إعادة التوليد
        </span>
      `;

    } catch (error) {
      console.error('خطأ في توليد العرض:', error);
      loadingEl.style.display = 'none';
      contentEl.style.display = 'block';
      contentEl.innerHTML = `
        <div class="sniper-error">
          <div style="font-weight: 600; margin-bottom: 4px;">حدث خطأ</div>
          <div style="font-size: 12px;">${escapeHtml(error.message)}</div>
        </div>
      `;
      generateBtn.disabled = false;
    }
  }

  // ── إدراج النص في صفحة خمسات ─────────────────────────────────────────
  function insertIntoPage(text) {
    const textareas = document.querySelectorAll('textarea');

    let target = null;

    for (const ta of textareas) {
      if (ta.offsetHeight > 50) {
        target = ta;
        break;
      }
    }

    if (!target) {
      const inputs = document.querySelectorAll('input[type="text"]');
      if (inputs.length > 0) target = inputs[inputs.length - 1];
    }

    if (target) {
      target.value = text;
      target.dispatchEvent(new Event('input', { bubbles: true }));
      target.focus();

      const notice = document.createElement('div');
      notice.className = 'sniper-notice';
      notice.textContent = '✓ تم إدراج الرد في الحقل';
      notice.style.cssText = 'position: fixed; bottom: 80px; left: 24px; z-index: 999999;';
      document.body.appendChild(notice);
      setTimeout(() => notice.remove(), 2500);
    } else {
      alert('تعذر العثور على حقل الرد. حاول النسخ ولصق يدوياً.');
    }
  }

  // ── escape HTML ───────────────────────────────────────────────────────
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // ── إظهار / إخفاء اللوحة ─────────────────────────────────────────────
  function showPanel() {
    createPanel();
    panel.style.display = 'block';
    panel.style.animation = 'none';
    panel.offsetHeight; // reflow
    panel.style.animation = 'panel-enter 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards';
  }

  function hidePanel() {
    if (panel) panel.style.display = 'none';
  }

  // ── زر الفتح الثابت ──────────────────────────────────────────────────
  function injectButton() {
    if (document.getElementById('sniper-detail-btn')) return;

    const btn = document.createElement('button');
    btn.id = 'sniper-detail-btn';
    btn.title = 'توليد عرض بالذكاء الاصطناعي';
    btn.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
      </svg>
    `;
    btn.style.cssText = `
      position: fixed;
      bottom: 24px;
      left: 24px;
      width: 50px;
      height: 50px;
      background: #ffffff;
      color: #fcb62e;
      border: 1px solid rgba(252, 182, 46, 0.3);
      border-radius: 0;
      cursor: pointer;
      z-index: 999998;
      box-shadow: 0 8px 28px rgba(0, 0, 0, 0.15), 0 0 40px rgba(252,182,46,0.08);
      transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
      display: flex;
      align-items: center;
      justify-content: center;
    `;

    btn.addEventListener('mouseenter', () => {
      btn.style.background = '#fcb62e';
      btn.style.color = '#fff';
      btn.style.transform = 'translateY(-2px)';
      btn.style.boxShadow = '0 12px 36px rgba(252,182,46,0.4)';
    });

    btn.addEventListener('mouseleave', () => {
      btn.style.background = '#ffffff';
      btn.style.color = '#fcb62e';
      btn.style.transform = '';
      btn.style.boxShadow = '0 8px 28px rgba(0, 0, 0, 0.15), 0 0 40px rgba(252,182,46,0.08)';
    });

    btn.addEventListener('click', showPanel);
    document.body.appendChild(btn);
  }

  // ── فحص التوليد المعلَّق ─────────────────────────────────────────────
  async function checkPendingGeneration() {
    try {
      const result = await new Promise((resolve, reject) => {
        chrome.storage.local.get(['pendingGeneration'], (r) => {
          if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
          else resolve(r);
        });
      });

      if (result.pendingGeneration && result.pendingGeneration.url === window.location.href) {
        chrome.storage.local.remove('pendingGeneration');
        setTimeout(() => {
          showPanel();
          generateOffer();
        }, 600);
      }
    } catch (e) {
      console.log('[خمسات سنايبر] خطأ في فحص التوليد المعلَّق:', e);
    }
  }

  // ── التشغيل ───────────────────────────────────────────────────────────
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      injectButton();
      checkPendingGeneration();
    });
  } else {
    injectButton();
    checkPendingGeneration();
  }

  const observer = new MutationObserver(() => {
    if (!document.getElementById('sniper-detail-btn')) injectButton();
  });

  observer.observe(document.body, { childList: true, subtree: true });
})();
