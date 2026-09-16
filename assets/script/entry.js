/* 入阁按钮的无障碍过渡；入口页不加载主站数据。 */
(function () {
  const stage = document.querySelector('.entry-stage');
  const button = document.querySelector('.enter-button');
  if (!stage || !button) return;

  function enter(event) {
    event?.preventDefault();
    if (stage.classList.contains('is-leaving')) return;
    stage.classList.add('is-leaving');
    const destination = button.href || 'pages/index.html';
    setTimeout(() => location.assign(destination), matchMedia('(prefers-reduced-motion: reduce)').matches ? 20 : 720);
  }

  button.addEventListener('click', enter);
  const motion = document.querySelector('.entry-motion-toggle');
  motion?.addEventListener('click', () => {
    const paused = stage.classList.toggle('motion-paused');
    motion.setAttribute('aria-pressed', String(paused));
    motion.textContent = paused ? '继续云息' : '暂停云息';
    dispatchEvent(new CustomEvent('yunmo:motionchange', { detail: { paused } }));
  });
  addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && document.activeElement === document.body) enter(event);
  });
})();
