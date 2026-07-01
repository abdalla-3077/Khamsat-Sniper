// Khamsat Sniper - Background Service Worker

console.log('[Sniper BG] Service worker loaded');

const PROVIDER_ENDPOINTS = {
  openai: 'https://api.openai.com/v1/chat/completions',
  groq: 'https://api.groq.com/openai/v1/chat/completions',
  mistral: 'https://api.mistral.ai/v1/chat/completions',
  cerebras: 'https://api.cerebras.ai/v1/chat/completions'
};

const DEFAULT_SETTINGS = {
  monitoring: true,
  autoOpenTabs: true,
  maxTabsPerCheck: 3,
  provider: 'groq',
  apiKeys: { openai: '', groq: '', mistral: '', cerebras: '' },
  models: {
    openai: 'gpt-4o-mini',
    groq: 'llama-3.1-8b-instant',
    mistral: 'mistral-small-latest',
    cerebras: 'gemma-4-31b'
  },
  persona: '',
  interests: ''
};

// Initialize storage
chrome.runtime.onInstalled.addListener(async () => {
  console.log('[Sniper BG] Extension installed');
  const existing = await chrome.storage.local.get(['settings', 'seenIds', 'generatedOffers', 'stats']);
  if (!existing.settings) await chrome.storage.local.set({ settings: DEFAULT_SETTINGS });
  if (!existing.seenIds) await chrome.storage.local.set({ seenIds: [] });
  if (!existing.generatedOffers) await chrome.storage.local.set({ generatedOffers: [] });
  if (!existing.stats) await chrome.storage.local.set({ stats: { matchesToday: 0, lastCheck: 0 } });
});

// Messages
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('[Sniper BG] Message:', message.action);

  if (message.action === 'keepalive') {
    sendResponse({ alive: true });
    return false;
  }

  if (message.action === 'checkNow') {
    handleCheckNow().then(result => {
      console.log('[Sniper BG] checkNow done:', result);
      chrome.storage.local.set({ _response_checkNow: result });
    });
    sendResponse({ pending: true });
    return false;
  }

  if (message.action === 'openAndGenerate') {
    // Store the pending generation
    chrome.storage.local.set({ 
      pendingGeneration: { url: message.url, title: message.title }
    }, () => {
      // Open the URL in a new tab
      chrome.tabs.create({ url: message.url, active: true }, (tab) => {
        console.log('[Sniper BG] Opened tab for generation:', message.url);
      });
    });
    sendResponse({ success: true });
    return false;
  }

  if (message.action === 'generateOffer') {
    handleGenerateOffer(message.data).then(result => {
      console.log('[Sniper BG] generateOffer done:', result);
      chrome.storage.local.set({ _response_generateOffer: result });
    });
    sendResponse({ pending: true });
    return false;
  }

  if (message.action === 'getSettings') {
    chrome.storage.local.get(['settings', 'stats']).then(result => {
      chrome.storage.local.set({ _response_getSettings: result });
    });
    sendResponse({ pending: true });
    return false;
  }

  if (message.action === 'updateStats') {
    updateStats(message.data).then(result => {
      chrome.storage.local.set({ _response_updateStats: result });
    });
    sendResponse({ pending: true });
    return false;
  }
});

async function handleCheckNow() {
  const data = await chrome.storage.local.get(['settings']);
  const settings = data.settings || DEFAULT_SETTINGS;

  if (!settings.monitoring) {
    return { success: false, message: 'المراقبة معطّلة' };
  }

  const tabs = await chrome.tabs.query({ url: 'https://khamsat.com/community/requests*' });

  if (tabs.length > 0) {
    await chrome.tabs.update(tabs[0].id, { active: true });
    await chrome.windows.update(tabs[0].windowId, { focused: true });

    try {
      await chrome.tabs.sendMessage(tabs[0].id, { action: 'runCheck' });
      return { success: true, message: 'تم التحقق' };
    } catch (e) {
      console.log('[Sniper BG] Injecting content script');
      await chrome.scripting.executeScript({
        target: { tabId: tabs[0].id },
        files: ['content-listing.js']
      });
      return { success: true, message: 'تم تحميل السكربت' };
    }
  } else {
    const newTab = await chrome.tabs.create({
      url: 'https://khamsat.com/community/requests',
      active: true
    });
    await chrome.windows.update(newTab.windowId, { focused: true });
    return { success: true, message: 'تم فتح صفحة الطلبات' };
  }
}

// Offer generation (called from detail page content script)
async function handleGenerateOffer(data) {
  const { requestId, title, description } = data;
  const storageData = await chrome.storage.local.get(['settings', 'generatedOffers', 'provider', 'apiKey', 'apiKeyGroq', 'apiKeyOpenAI', 'apiKeyMistral', 'apiKeyCerebras', 'selectedModelGroq', 'selectedModelOpenAI', 'selectedModelMistral', 'selectedModelCerebras']);
  const settings = storageData.settings || DEFAULT_SETTINGS;
  const generatedOffers = storageData.generatedOffers || [];

  if (generatedOffers.includes(requestId)) {
    return { success: false, message: 'تم توليد عرض لهذا الطلب مسبقاً' };
  }

  const provider = storageData.provider || settings.provider || 'groq';
  let apiKey = '';
  let model = '';

  if (provider === 'groq') {
    apiKey = storageData.apiKeyGroq || storageData.apiKey || settings.apiKeys?.groq;
    model = storageData.selectedModelGroq || settings.models?.groq;
  } else if (provider === 'openai') {
    apiKey = storageData.apiKeyOpenAI || storageData.apiKey || settings.apiKeys?.openai;
    model = storageData.selectedModelOpenAI || settings.models?.openai;
  } else if (provider === 'mistral') {
    apiKey = storageData.apiKeyMistral || storageData.apiKey || settings.apiKeys?.mistral;
    model = storageData.selectedModelMistral || settings.models?.mistral;
  } else if (provider === 'cerebras') {
    apiKey = storageData.apiKeyCerebras || storageData.apiKey || settings.apiKeys?.cerebras;
    model = storageData.selectedModelCerebras || settings.models?.cerebras;
  }

  const endpoint = PROVIDER_ENDPOINTS[provider];

  if (!apiKey) {
    return { success: false, message: 'مفتاح API غير محدد - افتح الإعدادات' };
  }

  const systemPrompt = `أنت مستعر freelance عربي محترف تكتب عروض قصيرة (3-6 جمل) لطلب خدمة على منصة خمسات.
- كن ودوداً ومباشراً
- أبرز خبراتك ذات الصلة
- لا تخترع سعراً أو موعداً للتسليم
- لا تستخدم تنسيق markdown
- اكتب بالعربية الفصحى المبسطة`;

  const userPrompt = 'طلب خدمة:\nالعنوان: ' + title + '\nالوصف: ' + description +
    (settings.persona ? '\n\nمعلومات عني:\n' + settings.persona : '') +
    '\n\nاكتب عرض مناسب لهذا الطلب.';

  try {
    console.log('[Sniper BG] Calling AI:', { provider, model, endpoint });
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + apiKey
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 300
      })
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      console.error('[Sniper BG] API error:', response.status, err);
      if (response.status === 401) return { success: false, message: 'مفتاح API غير صالح' };
      if (response.status === 429) return { success: false, message: 'تم تجاوز حد الطلبات' };
      return { success: false, message: err.error?.message || 'خطأ: ' + response.status };
    }

    const result = await response.json();
    console.log('[Sniper BG] API response:', result);
    const offerText = result.choices?.[0]?.message?.content;

    if (!offerText) {
      return { success: false, message: 'لم يتم استلام رد' };
    }

    generatedOffers.push(requestId);
    await chrome.storage.local.set({ generatedOffers });

    return { success: true, offer: offerText.trim() };
  } catch (error) {
    return { success: false, message: error.message };
  }
}

async function updateStats(newStats) {
  const data = await chrome.storage.local.get(['stats']);
  const stats = data.stats || { matchesToday: 0, lastCheck: 0 };
  await chrome.storage.local.set({ stats: { ...stats, ...newStats } });
  return { success: true };
}