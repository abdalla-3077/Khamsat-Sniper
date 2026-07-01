// popup.js — Khamsat Sniper

console.log('[Sniper Popup] تم التحميل');

document.addEventListener('DOMContentLoaded', async () => {
  const monitoringToggle = document.getElementById('monitoringToggle');
  const checkNowBtn = document.getElementById('checkNowBtn');
  const openOptionsBtn = document.getElementById('openOptions');
  const openOptionsBtn2 = document.getElementById('openOptions2');
  const matchCount = document.getElementById('matchCount');
  const statusDot = document.getElementById('statusDot');

  // Load settings
  const data = await chrome.storage.local.get(['settings', 'stats']);
  const settings = data.settings || { monitoring: true };
  const stats = data.stats || {};

  const isMonitoring = settings.monitoring !== false;
  monitoringToggle.checked = isMonitoring;
  matchCount.textContent = stats.matchesToday || 0;
  updateStatusDot(isMonitoring);

  // Toggle monitoring
  monitoringToggle.addEventListener('change', async () => {
    const isChecked = monitoringToggle.checked;
    const storageData = await chrome.storage.local.get(['settings']);
    const currentSettings = storageData.settings || {};
    currentSettings.monitoring = isChecked;
    await chrome.storage.local.set({ settings: currentSettings });
    updateStatusDot(isChecked);
    showStatus(isChecked ? 'تم تفعيل الفحص التلقائي' : 'تم تعطيل الفحص التلقائي', 'success');
  });

  // Click on toggle row body also toggles
  const toggleRow = document.getElementById('toggleRow');
  if (toggleRow) {
    toggleRow.addEventListener('click', (e) => {
      // Don't double-fire if the actual label/input was clicked
      if (e.target.closest('label') || e.target.closest('input')) return;
      monitoringToggle.click();
    });
  }

  // Open khamsat
  checkNowBtn.addEventListener('click', async () => {
    checkNowBtn.disabled = true;
    checkNowBtn.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10" stroke-dasharray="60" stroke-dashoffset="60" style="animation: dash 1s linear infinite;">
        </circle>
      </svg>
      جاري الفتح...
    `;

    try {
      await chrome.runtime.sendMessage({ action: 'checkNow' });
      showStatus('تم فتح خمسات بنجاح', 'success');
    } catch (e) {
      showStatus('خطأ في الاتصال بالإضافة', 'error');
    }

    checkNowBtn.disabled = false;
    checkNowBtn.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
      </svg>
      افتح خمسات
    `;
  });

  // Open options
  const openOptions = () => chrome.runtime.openOptionsPage();
  if (openOptionsBtn) openOptionsBtn.addEventListener('click', openOptions);
  if (openOptionsBtn2) openOptionsBtn2.addEventListener('click', openOptions);
});

function updateStatusDot(active) {
  const dot = document.getElementById('statusDot');
  if (!dot) return;
  if (active) {
    dot.classList.remove('off');
    dot.title = 'الفحص التلقائي مفعّل';
  } else {
    dot.classList.add('off');
    dot.title = 'الفحص التلقائي متوقف';
  }
}

function showStatus(message, type) {
  const status = document.getElementById('status');
  if (!status) return;
  status.textContent = message;
  status.className = 'status-toast ' + type;
  setTimeout(() => {
    status.className = 'status-toast';
  }, 3000);
}
