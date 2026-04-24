// Передаёт последний загруженный JSONL между 2D ↔ 3D режимами через
// sessionStorage. sessionStorage живёт в рамках одной вкладки, поэтому
// клик «3D →» (без target="_blank") сохраняет данные, а «← back to 2D»
// восстанавливает. Не засоряет localStorage навсегда.
//
// Limit: sessionStorage в большинстве браузеров ~5MB на origin. Сессии
// обычно помещаются, но для 30+ MB файлов сохраняем не контент, а
// просто маркер «файл был большой — загрузи снова». Пользователь
// увидит sample и должен дропнуть файл повторно.

const KEY = 'viz:last-jsonl';
const KEY_NAME = 'viz:last-jsonl-name';
// ~4 MB — с запасом до quota ~5MB
const MAX_BYTES = 4 * 1024 * 1024;

/** Сохранить JSONL для следующего режима. Возвращает true если получилось. */
export function saveSessionForHandoff(text, name) {
  try {
    if (typeof sessionStorage === 'undefined') return false;
    if (!text || typeof text !== 'string') return false;
    // Быстрая проверка по длине (UTF-16 в JS → 2 байта на символ в worst case,
    // но sessionStorage обычно считает в UTF-16-codeunit-длине, что равно .length).
    if (text.length * 2 > MAX_BYTES) {
      // Не сохраняем контент, но запоминаем имя, чтобы можно было сообщить
      sessionStorage.setItem(KEY_NAME, name || 'large-session');
      sessionStorage.removeItem(KEY);
      return false;
    }
    sessionStorage.setItem(KEY, text);
    if (name) sessionStorage.setItem(KEY_NAME, name);
    return true;
  } catch {
    // QuotaExceededError или private-mode
    try { sessionStorage.removeItem(KEY); } catch {}
    return false;
  }
}

/** Получить JSONL, сохранённый предыдущим режимом. */
export function loadSessionForHandoff() {
  try {
    if (typeof sessionStorage === 'undefined') return null;
    const text = sessionStorage.getItem(KEY);
    const name = sessionStorage.getItem(KEY_NAME);
    return text ? { text, name } : null;
  } catch {
    return null;
  }
}

/** Если пользователь сам выбрал sample — мы не хотим перезаписывать handoff */
export function clearSessionForHandoff() {
  try {
    if (typeof sessionStorage === 'undefined') return;
    sessionStorage.removeItem(KEY);
    sessionStorage.removeItem(KEY_NAME);
  } catch {}
}
