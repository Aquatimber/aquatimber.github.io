import { API } from './data-api.js';
import { initCommon } from './ui.js';
import { pageRenderers } from './pages.js';

async function main() {
  const host = document.querySelector('#page-content');
  try {
    const state = await API.bootstrap();
    const page = document.body.dataset.page || 'home';
    const render = pageRenderers[page] || pageRenderers.home;
    const params = new URLSearchParams(location.search);
    const prerendered = document.body.dataset.prerendered === 'true';
    const needsDynamicView = !prerendered
      || page === 'article'
      || (page === 'home' && (params.has('page') || params.has('sort')))
      || (page === 'category' && params.has('category'))
      || (page === 'tag' && params.has('tag'));
    if (needsDynamicView) await render(state);
    const common = initCommon(state);
    common.refreshReveal();
  } catch (error) {
    console.error('[云墨阁] 初始化失败：', error);
    if (host) host.innerHTML = `<div class="error-state"><h1>卷册读取失败</h1><p>${String(error.message || error)}</p><p>请通过本地 HTTP 服务预览，或检查 JSON 文件格式。</p></div>`;
  }
}

main();
