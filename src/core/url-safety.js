// URL safety helpers. Все внешние URL, принимаемые от пользователя (через
// ?jsonl=, ?sessions=, ?live=, live-input field), проходят через
// isSafeHttpUrl() перед fetch. Цель — ограничить схемы до http(s), чтобы
// исключить javascript:/data:/blob:/file:/ftp:/ws: и прочий неожиданный
// фан. `fetch()` по спеке сам отклоняет javascript: и data: для
// non-navigable requests, но явная проверка читабельнее и защищает от
// случайных багов дальше по коду (location.href = url и т.д.).
//
// Это НЕ защита от SSRF в полном смысле — браузер и так не даёт прочитать
// cross-origin ответ без CORS-заголовков. Но crafted `?jsonl=http://192.168.x.x/admin`
// может вызвать preflight OPTIONS на внутренний сервер, что само по себе
// может быть нежелательно. Fix ниже не блокирует intranet URL (это сломало
// бы ?live=http://localhost:8080/stream для dev use-case), но предупреждает
// в консоль.

const SAFE_SCHEMES = new Set(['http:', 'https:']);

/**
 * Проверяет, что URL — это корректный HTTP(S). Относительные URL тоже OK
 * (they resolve on same origin, так что не дают выйти за пределы).
 * @param {string} url
 * @param {string} [baseUrl] — если передан, относительные резолвятся от него
 * @returns {boolean}
 */
export function isSafeHttpUrl(url, baseUrl) {
  if (typeof url !== 'string' || !url) return false;
  // Относительный URL — считаем безопасным (same-origin)
  if (url.startsWith('/') || url.startsWith('./') || url.startsWith('../')) return true;
  try {
    const parsed = new URL(url, baseUrl || (typeof window !== 'undefined' ? window.location.href : 'http://localhost/'));
    return SAFE_SCHEMES.has(parsed.protocol);
  } catch {
    return false;
  }
}

/**
 * Оборачивает fetch с предварительной проверкой схемы. Если URL небезопасен —
 * возвращает Promise.reject(Error('unsafe URL scheme')) без отправки запроса.
 *
 * Использование:
 *   import { safeFetch } from '../core/url-safety.js';
 *   const res = await safeFetch(userUrl, { credentials: 'same-origin' });
 */
export function safeFetch(url, opts) {
  if (!isSafeHttpUrl(url)) {
    return Promise.reject(new Error('Unsafe URL scheme (only http/https/relative allowed): ' + String(url).slice(0, 80)));
  }
  return fetch(url, opts);
}

/**
 * Warn-только эвристика: является ли URL intranet/loopback. Сам по себе
 * запрос не блокирует (dev-сценарий ?live=http://localhost:3000/session.jsonl
 * должен работать), но выведет предупреждение в консоль.
 */
export function isLikelyIntranet(url) {
  try {
    const u = new URL(url, typeof window !== 'undefined' ? window.location.href : 'http://localhost/');
    const h = u.hostname;
    return h === 'localhost'
      || h === '127.0.0.1'
      || /^10\./.test(h)
      || /^192\.168\./.test(h)
      || /^172\.(1[6-9]|2\d|3[0-1])\./.test(h)
      || h.endsWith('.local');
  } catch {
    return false;
  }
}
