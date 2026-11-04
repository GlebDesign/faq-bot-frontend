/* Standalone bundle: no React or host styles. One isolated iframe per loader. */
(() => {
  const script = document.currentScript;
  if (!(script instanceof HTMLScriptElement) || document.getElementById('faq-widget-root')) return;
  const agent = script.dataset.agent;
  if (!agent || !/^[a-zA-Z0-9_-]{1,80}$/.test(agent)) return;
  const widgetOrigin = new URL(script.src).origin;
  const root = document.createElement('div');
  root.id = 'faq-widget-root';
  const shadow = root.attachShadow({ mode: 'open' });
  const style = document.createElement('style');
  style.textContent =
    ':host{position:fixed;right:24px;bottom:24px;z-index:2147483000}button{border:0;border-radius:50%;width:56px;height:56px;background:#ff5a36;color:white;font:26px Arial;cursor:pointer;box-shadow:0 4px 20px #0002}iframe{display:none;width:min(390px,calc(100vw - 24px));height:min(570px,calc(100dvh - 40px));border:0;border-radius:20px;box-shadow:0 8px 40px #0002;background:white}';
  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = '?';
  button.setAttribute('aria-label', 'Открыть FAQ-бот');
  const iframe = document.createElement('iframe');
  iframe.title = 'FAQ-бот';
  iframe.setAttribute('sandbox', 'allow-scripts allow-forms allow-same-origin');
  iframe.referrerPolicy = 'strict-origin';
  iframe.src = `${widgetOrigin}/?embed=1&parentOrigin=${encodeURIComponent(location.origin)}#/widget-demo/${encodeURIComponent(agent)}`;
  button.addEventListener('click', () => {
    iframe.style.display = 'block';
    button.style.display = 'none';
  });
  window.addEventListener('message', (event) => {
    if (
      event.origin !== widgetOrigin ||
      event.source !== iframe.contentWindow ||
      !event.data ||
      event.data.agent !== agent
    )
      return;
    if (event.data.type === 'faq:close') {
      iframe.style.display = 'none';
      button.style.display = 'block';
    }
  });
  shadow.append(style, button, iframe);
  document.body.append(root);
})();
