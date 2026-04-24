// Переключатель языка RU/EN. Показывает текущую локаль на кнопке,
// клик меняет язык и триггерит applyTranslations + languagechange event.

import { setLanguage, getLanguage } from '../core/i18n.js';

let _btn = null;

export function initLangToggle() {
  _btn = document.getElementById('btn-lang');
  if (!_btn) return;
  _btn.addEventListener('click', () => {
    setLanguage(getLanguage() === 'ru' ? 'en' : 'ru');
    updateBtn();
  });
  window.addEventListener('languagechange', updateBtn);
  updateBtn();
}

function updateBtn() {
  if (!_btn) return;
  // Показываем КУДА переключит — т.е. другую локаль
  const next = getLanguage() === 'ru' ? 'EN' : 'RU';
  _btn.textContent = next;
  _btn.title = getLanguage() === 'ru' ? 'Switch to English' : 'Переключить на русский';
}
