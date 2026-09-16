/* 首帧前应用主题与正文字体；浏览器禁用存储时仍可正常阅读。 */
(function () {
  const fonts = {
    serif: '"Noto Serif SC", "Songti SC", SimSun, serif',
    kai: '"STKaiti", "KaiTi", serif',
    sans: '"Noto Sans SC", "Microsoft YaHei", sans-serif'
  };
  const read = (key, fallback) => {
    try { return localStorage.getItem(key) || fallback; } catch { return fallback; }
  };
  const theme = read('yunmo-theme', document.documentElement.dataset.defaultTheme || 'auto');
  const choice = ['auto', 'light', 'dark'].includes(theme) ? theme : 'auto';
  const dark = choice === 'dark' || (choice === 'auto' && window.matchMedia?.('(prefers-color-scheme: dark)').matches);
  const font = read('yunmo-font', 'serif');
  const selectedFont = Object.hasOwn(fonts, font) ? font : 'serif';
  document.documentElement.dataset.themeChoice = choice;
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  document.documentElement.dataset.font = selectedFont;
  document.documentElement.style.setProperty('--font-body', fonts[selectedFont]);
})();
