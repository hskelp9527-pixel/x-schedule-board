// Observe only requests already made by X. No API calls, cookies or auth headers.
(() => {
  const watched = value => /\/(FetchScheduledTweets|CreateScheduledTweet|EditScheduledTweet|UpdateScheduledTweet|DeleteScheduledTweet)$/.test(String(value).split('?')[0]);
  const owner = () => document.querySelector('a[data-testid="AppTabBar_Profile_Link"]')?.getAttribute('href')?.split('/')[1]?.toLowerCase() ?? '';
  let ready = false;
  let lastOrder = 0;
  const order = () => (lastOrder = Math.max(Date.now(), lastOrder + 0.01));
  const pending = [];
  function emit(event) {
    if (typeof event.text !== 'string' || event.text.length > 2e6 || !event.account) return;
    const serialized = JSON.stringify(event);
    if (ready) document.dispatchEvent(new CustomEvent('xsb:net', { detail: serialized }));
    else if (pending.length < 20) pending.push(serialized);
  }
  document.addEventListener('xsb:ready', () => {
    ready = true;
    pending.splice(0).forEach(detail => document.dispatchEvent(new CustomEvent('xsb:net', { detail })));
  }, { once: true });
  const original = window.fetch;
  window.fetch = function(input, init) {
    const url = input instanceof Request ? input.url : new URL(String(input), location.href).href, account = owner(), requestedAt = order();
    let body;
    try { if (watched(url)) body = init?.body != null ? Promise.resolve(String(init.body)) : input instanceof Request ? input.clone().text() : Promise.resolve(''); } catch { /* preserve X */ }
    const result = original.apply(this, arguments);
    if (body) result.then(response => Promise.all([body, response.clone().text()]).then(([b, text]) => emit({ url, account, requestedAt, body: b, text, status: response.status }))).catch(() => {});
    return result;
  };
  const { open, send } = XMLHttpRequest.prototype;
  const state = new WeakMap();
  XMLHttpRequest.prototype.open = function(method, url) { state.set(this, { url: String(url) }); return open.apply(this, arguments); };
  XMLHttpRequest.prototype.send = function(body) {
    const request = state.get(this);
    if (request && watched(request.url)) {
      const account = owner(), requestedAt = order();
      this.addEventListener('load', () => {
        try {
          const text = this.responseType === 'json' ? JSON.stringify(this.response) : ['', 'text'].includes(this.responseType) ? this.responseText : '';
          emit({ url: new URL(request.url, location.href).href, account, requestedAt, body: typeof body === 'string' ? body : '', text, status: this.status });
        } catch { /* preserve X */ }
      }, { once: true });
    }
    return send.apply(this, arguments);
  };
})();
