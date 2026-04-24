// Dark/light toggle. Переключает CSS-переменные через [data-theme] на <html>.
// Сохраняется в localStorage.

let btn;
const KEY = 'viz-theme';

export function initThemeToggle() {
  btn = document.getElementById('btn-theme');
  // Применяем сохранённое значение при старте
  const saved = localStorage.getItem(KEY);
  if (saved === 'light') applyTheme('light');
  else applyTheme('dark');
  if (btn) btn.addEventListener('click', toggle);
  updateBtn();
}

export function toggleTheme() { toggle(); }

function toggle() {
  const cur = document.documentElement.dataset.theme || 'dark';
  applyTheme(cur === 'dark' ? 'light' : 'dark');
  updateBtn();
}

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  localStorage.setItem(KEY, theme);
}

function updateBtn() {
  if (!btn) return;
  const theme = document.documentElement.dataset.theme || 'dark';
  btn.textContent = theme === 'dark' ? '☀' : '🌙';
  btn.title = theme === 'dark' ? 'Switch to light' : 'Switch to dark';
  btn.classList.toggle('active-theme', theme === 'light');
}

export function getTheme() {
  return document.documentElement.dataset.theme || 'dark';
}
