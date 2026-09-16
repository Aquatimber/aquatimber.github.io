/**
 * 入阁流云：无依赖 Canvas 流场。
 * 使用低数量柔边粒子叠加 CSS 云团；移动端和节能偏好会自动降载。
 */
(function () {
  const stage = document.querySelector('.entry-stage');
  const canvas = document.querySelector('.entry-canvas');
  if (!stage || !canvas) return;

  const ctx = canvas.getContext('2d', { alpha: true });
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const mobile = matchMedia('(max-width: 720px)').matches;
  const palette = ['77,134,133', '77,105,139', '132,78,102', '151,77,62', '138,105,75', '196,205,194'];
  let width = 0;
  let height = 0;
  let dpr = 1;
  let frame = 0;
  let raf = 0;
  let particles = [];
  let paused = false;

  class Wisp {
    constructor(seed = Math.random()) { this.reset(seed, true); }
    reset(seed = Math.random(), initial = false) {
      this.x = initial ? Math.random() * width : -80;
      this.y = (seed * .82 + .08) * height;
      this.radius = (mobile ? 34 : 58) + Math.random() * (mobile ? 74 : 130);
      this.speed = .08 + Math.random() * .23;
      this.phase = Math.random() * Math.PI * 2;
      this.color = palette[Math.floor(Math.random() * palette.length)];
      this.alpha = .006 + Math.random() * .014;
    }
    update(time) {
      const wave = Math.sin(this.phase + time * .00012 + this.x * .0018);
      this.x += this.speed + wave * .055;
      this.y += Math.cos(this.phase + time * .00009) * .035;
      if (this.x - this.radius > width) this.reset();
    }
    draw() {
      const gradient = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.radius);
      gradient.addColorStop(0, `rgba(${this.color},${this.alpha * 1.8})`);
      gradient.addColorStop(.45, `rgba(${this.color},${this.alpha})`);
      gradient.addColorStop(1, `rgba(${this.color},0)`);
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.ellipse(this.x, this.y, this.radius * 1.8, this.radius, this.phase * .12, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function resize() {
    width = innerWidth;
    height = innerHeight;
    dpr = Math.min(devicePixelRatio || 1, mobile ? 1.25 : 1.75);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    particles = Array.from({ length: reduced ? 12 : (mobile ? 38 : 72) }, (_, i) => new Wisp(i / 72));
  }

  function draw(time = 0) {
    raf = 0;
    ctx.clearRect(0, 0, width, height);
    ctx.globalCompositeOperation = 'screen';
    particles.forEach((particle) => {
      if (!reduced && !paused) particle.update(time);
      particle.draw();
    });
    ctx.globalCompositeOperation = 'source-over';
    frame += 1;
    if (!reduced && !document.hidden && !paused) raf = requestAnimationFrame(draw);
  }

  function resume() {
    if (!reduced && !document.hidden && !paused && !raf) raf = requestAnimationFrame(draw);
  }

  resize();
  draw(0);
  addEventListener('resize', resize, { passive: true });
  document.addEventListener('visibilitychange', () => {
    cancelAnimationFrame(raf);
    raf = 0;
    resume();
  });
  addEventListener('yunmo:motionchange', (event) => {
    paused = Boolean(event.detail?.paused);
    if (paused) {
      cancelAnimationFrame(raf);
      raf = 0;
    } else resume();
  });

  // 给首屏一个短暂的铺陈时间，随后显现印章按钮。
  setTimeout(() => stage.classList.add('is-ready'), reduced ? 80 : 850);
})();
