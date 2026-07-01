// options.js — Khamsat Sniper

const form = document.getElementById('settingsForm');
const status = document.getElementById('saveStatus');
const toggleGroq = document.getElementById('providerToggleGroq');
const toggleOpenAI = document.getElementById('providerToggleOpenAI');
const toggleMistral = document.getElementById('providerToggleMistral');
const toggleCerebras = document.getElementById('providerToggleCerebras');
const fieldsGroq = document.getElementById('fieldsGroq');
const fieldsOpenAI = document.getElementById('fieldsOpenAI');
const fieldsMistral = document.getElementById('fieldsMistral');
const fieldsCerebras = document.getElementById('fieldsCerebras');

const MODELS_API = {
  groq: 'https://api.groq.com/openai/v1/models',
  openai: 'https://api.openai.com/v1/models',
  mistral: 'https://api.mistral.ai/v1/models',
  cerebras: 'https://api.cerebras.ai/v1/models'
};

// Load saved settings
document.addEventListener('DOMContentLoaded', () => {
  chrome.storage.local.get(['provider', 'apiKeyGroq', 'apiKeyOpenAI', 'apiKeyMistral', 'apiKeyCerebras', 'selectedModelGroq', 'selectedModelOpenAI', 'selectedModelMistral', 'selectedModelCerebras', 'selectedFields', 'skills', 'persona'], (data) => {
    if (data.selectedFields && Array.isArray(data.selectedFields)) {
      data.selectedFields.forEach(field => {
        const checkbox = document.querySelector(`input[name="fields"][value="${field}"]`);
        if (checkbox) checkbox.checked = true;
      });
    }

    if (data.skills) document.getElementById('skills').value = data.skills;
    if (data.persona) document.getElementById('persona').value = data.persona;
    if (data.apiKeyGroq) document.getElementById('apiKeyGroq').value = data.apiKeyGroq;
    if (data.apiKeyOpenAI) document.getElementById('apiKeyOpenAI').value = data.apiKeyOpenAI;
    if (data.apiKeyMistral) document.getElementById('apiKeyMistral').value = data.apiKeyMistral;
    if (data.apiKeyCerebras) document.getElementById('apiKeyCerebras').value = data.apiKeyCerebras;

    if (data.selectedModelGroq) {
      const select = document.getElementById('modelGroq');
      const option = Array.from(select.options).find(o => o.value === data.selectedModelGroq);
      if (option) select.value = data.selectedModelGroq;
    }
    if (data.selectedModelOpenAI) {
      const select = document.getElementById('modelOpenAI');
      const option = Array.from(select.options).find(o => o.value === data.selectedModelOpenAI);
      if (option) select.value = data.selectedModelOpenAI;
    }
    if (data.selectedModelMistral) {
      const select = document.getElementById('modelMistral');
      const option = Array.from(select.options).find(o => o.value === data.selectedModelMistral);
      if (option) select.value = data.selectedModelMistral;
    }
    if (data.selectedModelCerebras) {
      const select = document.getElementById('modelCerebras');
      const option = Array.from(select.options).find(o => o.value === data.selectedModelCerebras);
      if (option) select.value = data.selectedModelCerebras;
    }

    if (data.provider) {
      document.getElementById('provider' + data.provider.charAt(0).toUpperCase() + data.provider.slice(1)).checked = true;
      updateActiveProvider(data.provider);
    }
  });

  // Bind fetch buttons
  document.querySelectorAll('.btn-fetch-models').forEach(btn => {
    btn.addEventListener('click', function() {
      const provider = this.dataset.provider;
      if (provider) fetchModels(provider);
    });
  });

  // Bind show/hide buttons
  document.querySelectorAll('.btn-toggle-visibility').forEach(btn => {
    btn.addEventListener('click', function() {
      const fieldId = this.dataset.field;
      if (fieldId) toggleVisibility(fieldId, this);
    });
  });
});

async function fetchModels(provider) {
  const apiKey = document.getElementById('apiKey' + capitalize(provider)).value.trim();
  const loadingEl = document.getElementById('modelLoading' + capitalize(provider));
  const selectEl = document.getElementById('model' + capitalize(provider));
  const fetchBtn = document.querySelector(`.btn-fetch-models[data-provider="${provider}"]`);

  if (!apiKey) {
    loadingEl.textContent = 'أدخل مفتاح API أولاً';
    loadingEl.style.color = 'var(--color-error)';
    return;
  }

  loadingEl.textContent = 'جاري جلب النماذج...';
  loadingEl.style.color = 'var(--color-accent)';
  fetchBtn.disabled = true;

  try {
    const response = await fetch(MODELS_API[provider], {
      headers: { 'Authorization': 'Bearer ' + apiKey }
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error('خطأ في API ' + response.status + ': ' + err.substring(0, 100));
    }

    const data = await response.json();
    const models = (data.data || [])
      .filter(m => m.id && !m.id.includes('embed') && !m.id.includes('whisper') && !m.id.includes('tts'))
      .map(m => m.id)
      .sort();

    selectEl.innerHTML = '';
    models.forEach(id => {
      const opt = document.createElement('option');
      opt.value = id;
      opt.textContent = id;
      selectEl.appendChild(opt);
    });

    // Restore saved selection
    const savedKey = 'selectedModel' + capitalize(provider);
    chrome.storage.local.get([savedKey], (d) => {
      const saved = d[savedKey];
      if (saved && Array.from(selectEl.options).some(o => o.value === saved)) {
        selectEl.value = saved;
      }
    });

    loadingEl.textContent = `تم العثور على ${models.length} نموذج`;
    loadingEl.style.color = 'var(--color-accent)';

  } catch (error) {
    console.error('Fetch models error:', error);
    loadingEl.textContent = 'خطأ: ' + error.message;
    loadingEl.style.color = 'var(--color-error)';
  } finally {
    fetchBtn.disabled = false;
  }
}

function capitalize(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function updateActiveProvider(provider) {
  toggleGroq.classList.toggle('active', provider === 'groq');
  toggleOpenAI.classList.toggle('active', provider === 'openai');
  toggleMistral.classList.toggle('active', provider === 'mistral');
  toggleCerebras.classList.toggle('active', provider === 'cerebras');

  fieldsGroq.classList.toggle('visible', provider === 'groq');
  fieldsOpenAI.classList.toggle('visible', provider === 'openai');
  fieldsMistral.classList.toggle('visible', provider === 'mistral');
  fieldsCerebras.classList.toggle('visible', provider === 'cerebras');

  updateModelFieldVisibility(provider);
}

function updateModelFieldVisibility(provider) {
  const apiKeyInput = document.getElementById('apiKey' + capitalize(provider));
  const modelField = document.getElementById('modelField' + capitalize(provider));
  if (apiKeyInput && modelField) {
    modelField.classList.toggle('visible', apiKeyInput.value.trim().length > 0);
  }
}

document.querySelectorAll('input[name="provider"]').forEach(radio => {
  radio.addEventListener('change', (e) => {
    updateActiveProvider(e.target.value);
  });
});

['Groq', 'OpenAI', 'Mistral', 'Cerebras'].forEach(provider => {
  const apiKeyInput = document.getElementById('apiKey' + provider);
  if (apiKeyInput) {
    apiKeyInput.addEventListener('input', () => {
      updateModelFieldVisibility(provider.toLowerCase());
      validateApiKey(provider.toLowerCase());
    });
  }
});

function validateApiKey(provider) {
  const apiKey = document.getElementById('apiKey' + capitalize(provider)).value.trim();
  const validationMsg = document.getElementById('validation' + capitalize(provider));

  if (!apiKey) {
    validationMsg.textContent = '';
    validationMsg.className = 'validation-msg';
    return true;
  }

  let isValid = false;
  let message = '';

  if (provider === 'groq') {
    isValid = apiKey.startsWith('gsk_');
    message = isValid ? 'صيغة صحيحة' : 'يجب أن يبدأ بـ gsk_';
  } else if (provider === 'openai') {
    isValid = apiKey.startsWith('sk-');
    message = isValid ? 'صيغة صحيحة' : 'يجب أن يبدأ بـ sk-';
  } else if (provider === 'mistral') {
    isValid = apiKey.length > 10;
    message = isValid ? 'يبدو صحيحاً' : 'المفتاح قصير جداً';
  } else if (provider === 'cerebras') {
    isValid = apiKey.startsWith('csk-');
    message = isValid ? 'صيغة صحيحة' : 'يجب أن يبدأ بـ csk-';
  }

  validationMsg.textContent = message;
  validationMsg.className = 'validation-msg ' + (isValid ? 'success' : 'error');

  return isValid;
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const provider = document.querySelector('input[name="provider"]:checked')?.value;
  if (!provider) {
    showStatus('اختر مزود الذكاء الاصطناعي أولاً', 'error');
    return;
  }

  const apiKey = document.getElementById('apiKey' + capitalize(provider)).value.trim();
  const skills = document.getElementById('skills').value.trim();
  const persona = document.getElementById('persona').value.trim();
  const selectedFields = Array.from(document.querySelectorAll('input[name="fields"]:checked')).map(cb => cb.value);

  if (!apiKey) {
    showStatus('مفتاح API مطلوب', 'error');
    return;
  }

  if (!validateApiKey(provider)) {
    showStatus('صيغة مفتاح API غير صحيحة', 'error');
    return;
  }

  if (selectedFields.length === 0) {
    showStatus('اختر مجالاً واحداً على الأقل', 'error');
    return;
  }

  if (!skills) {
    showStatus('أدخل مهاراتك وخبراتك', 'error');
    return;
  }

  const saveBtn = document.getElementById('saveBtn');
  saveBtn.disabled = true;
  saveBtn.textContent = 'جاري الحفظ...';

  chrome.storage.local.set({
    provider,
    apiKey,
    selectedModelGroq: document.getElementById('modelGroq').value,
    selectedModelOpenAI: document.getElementById('modelOpenAI').value,
    selectedModelMistral: document.getElementById('modelMistral').value,
    selectedModelCerebras: document.getElementById('modelCerebras').value,
    selectedFields,
    skills,
    persona,
    apiKeyGroq: document.getElementById('apiKeyGroq').value.trim(),
    apiKeyOpenAI: document.getElementById('apiKeyOpenAI').value.trim(),
    apiKeyMistral: document.getElementById('apiKeyMistral').value.trim(),
    apiKeyCerebras: document.getElementById('apiKeyCerebras').value.trim()
  }, () => {
    showStatus('تم حفظ الإعدادات بنجاح', 'success');
    saveBtn.disabled = false;
    saveBtn.textContent = 'حفظ الإعدادات';
  });
});

function showStatus(message, type) {
  status.textContent = message;
  status.className = 'save-status visible' + (type === 'error' ? ' error' : '');
  setTimeout(() => {
    status.className = 'save-status';
  }, 3000);
}

function toggleVisibility(fieldId, btn) {
  const field = document.getElementById(fieldId);
  if (field.type === 'password') {
    field.type = 'text';
    btn.textContent = 'إخفاء';
  } else {
    field.type = 'password';
    btn.textContent = 'إظهار';
  }
}
