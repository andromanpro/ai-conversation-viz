// Dark/light toggle. Переключает CSS-переменные через [data-theme] на <html>.
// Сохраняется в localStorage.

let _themeBtn;
const KEY = 'viz-theme';

export function initThemeToggle() {
  _themeBtn = document.getElementById('btn-theme');
  // Применяем сохранённое значение при старте
  const saved = localStorage.getItem(KEY);
  if (saved === 'light') applyTheme('light');
  else applyTheme('dark');
  if (_themeBtn) _themeBtn.addEventListener('click', toggle);
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
  if (!_themeBtn) return;
  const theme = document.documentElement.dataset.theme || 'dark';
  _themeBtn.textContent = theme === 'dark' ? '☀' : '🌙';
  _themeBtn.title = theme === 'dark' ? 'Switch to light' : 'Switch to dark';
  _themeBtn.classList.toggle('active-theme', theme === 'light');
}

export function getTheme() {
  return document.documentElement.dataset.theme || 'dark';
}
