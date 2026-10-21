(() => {
  const api = globalThis.browser ?? globalThis.chrome;
  const host = document.createElement('div');
  host.id = 'x-schedule-board';
  host.style.cssText = 'position:fixed;right:14px;top:82px;z-index:2147483500';
  const root = host.attachShadow({ mode: 'open' });
  root.innerHTML = `<style>
    :host{all:initial;color-scheme:light dark}*{box-sizing:border-box}[hidden]{display:none!important}
    button,input,textarea,select{font:inherit}button,a,input,textarea,select{touch-action:manipulation}button,a{cursor:pointer}button:focus-visible,a:focus-visible{outline:2px solid #1d9bf0;outline-offset:3px}
    .launcher{border:1px solid #cfd9de;border-radius:999px;background:#fff;color:#0f1419;font:600 13px system-ui;padding:10px 15px;box-shadow:0 3px 14px #0002}
    .panel{width:min(384px,calc(100vw - 24px));max-height:calc(100dvh - 106px);overflow:auto;background:#fff;color:#0f1419;border:1px solid #cfd9de;border-radius:18px;box-shadow:0 12px 42px #0003;font:14px/1.5 system-ui,'Microsoft YaHei',sans-serif;padding:18px}
    header{display:flex;align-items:center;justify-content:space-between;margin-bottom:10px}h2{font-size:19px;margin:0;letter-spacing:-.5px}.close{font-size:22px;border:0;background:none;color:inherit;min-width:36px;min-height:36px}
    .account,.hint,.scan-info{font-size:12px;color:#536471}.account{margin:0 0 12px}.tools{display:flex;flex-wrap:wrap;gap:7px;margin:12px 0}.tools button,.tools a,.secondary{background:#eff3f4;color:#0f1419;border:0;border-radius:9px;padding:9px 10px;font-size:12px;text-decoration:none;min-height:36px}
    .primary{background:#0f1419;color:#fff;border:0;border-radius:10px;padding:10px 14px;font-weight:600;min-height:40px}form{border-top:1px solid #eff3f4;padding-top:12px;margin-top:12px;display:grid;gap:8px}label{font-size:12px;font-weight:600}input,textarea,select{background:#fff;color:#0f1419;border:1px solid #cfd9de;border-radius:8px;padding:9px;width:100%;min-width:0}textarea{resize:vertical;min-height:58px}.form-actions{display:flex;gap:8px}.status{font-size:12px;color:#176745;min-height:18px;white-space:pre-wrap;margin:8px 0}.status.error{color:#b42318}
    .filters{display:flex;align-items:center;justify-content:space-between;gap:12px;border-top:1px solid #eff3f4;padding-top:12px}.filters select{width:auto;padding:6px;font-size:12px}.filters b{font-size:13px}.day{font-size:12px;color:#536471;margin:17px 0 5px;font-weight:600}.item{display:grid;grid-template-columns:53px 1fr auto;gap:10px;padding:12px 0;border-bottom:1px solid #eff3f4}.time{font-weight:750;font-size:16px;letter-spacing:-.5px;font-variant-numeric:tabular-nums}.text{white-space:pre-wrap;overflow-wrap:anywhere;font-size:13px}.badge{font-size:11px;color:#536471;display:block;margin-top:3px}.badge.x{color:#176745}.item button{border:0;background:none;color:#536471;font-size:12px;min-width:30px;min-height:32px}.empty{padding:24px 5px;color:#536471;font-size:13px}.foot{font-size:11px;color:#536471;margin:16px 0 0}.import{display:none}
    @media(max-width:480px){.panel{max-height:calc(100dvh - 96px);padding:14px}.tools button,.tools a,.item button,.close{min-height:44px}.launcher{padding:11px 14px}.item{gap:7px;grid-template-columns:48px 1fr auto}}
    @media(prefers-color-scheme:dark){.launcher,.panel,input,textarea,select{background:#15202b;color:#e7e9ea;border-color:#3b4854}.hint,.account,.scan-info,.day,.badge,.foot,.empty{color:#a2b2c0}.tools button,.tools a,.secondary{background:#273340;color:#e7e9ea}.primary{background:#e7e9ea;color:#0f1419}.item,form,.filters{border-color:#35434f}.badge.x,.status{color:#7ddbb1}.status.error{color:#ff9e9e}}
  </style>
  <button class="launcher" aria-expanded="false">◷ 发稿安排 <span class="count">0</span></button>
  <section class="panel" aria-label="X 发稿安排表" hidden>
    <header><h2>发稿安排</h2><button class="close" aria-label="关闭安排表">×</button></header>
    <p class="account"></p><div class="hint">先看已占用的时间，再安排下一篇。</div>
    <div class="tools"><a class="open-x" href="/compose/post/unsent/scheduled">扫描 X 定时列表 ↗</a><button class="add">＋ 记时间</button><button class="export">导出</button><button class="import-btn">导入</button></div>
    <div class="scan-info">尚未扫描。打开 X 的定时列表，插件会读取该页面正常加载的安排。</div>
    <form hidden><label for="xsb-at">发布时间（本机时区）</label><input id="xsb-at" name="at" type="datetime-local" required><label for="xsb-note">内容摘要 / 备注</label><textarea id="xsb-note" name="text" maxlength="1000" placeholder="方便认出是哪一篇"></textarea><div class="form-actions"><button class="primary">记录时间</button><button class="secondary cancel" type="button">取消</button></div><div class="hint">这里只记时间；仍需在 X 完成定时操作。</div></form>
    <div class="status" role="status" aria-live="polite"></div>
    <div class="filters"><b>时间安排</b><select aria-label="筛选安排"><option value="upcoming">未来安排</option><option value="all">全部记录</option></select></div>
    <div class="list"></div><p class="foot"></p><input class="import" type="file" accept="application/json,.json">
  </section>`;
  document.body.append(host);
  const $ = s => root.querySelector(s);
  let owner = '', entries = [], scan = null, editing = null, formOwner = '', loadSequence = 0;
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  $('.foot').textContent = `时区：${timeZone}。数据保存在本浏览器；扫描不是云同步。`;
  const currentOwner = () => document.querySelector('a[data-testid="AppTabBar_Profile_Link"]')?.getAttribute('href')?.split('/')[1]?.toLowerCase() ?? '';
  function status(message, error = false) { $('.status').textContent = message; $('.status').classList.toggle('error', error); }
  async function request(type, extra = {}) {
    const account = currentOwner();
    if (!account) throw new Error('请先登录 X，等待账号信息加载');
    const { expectedAccount, ...data } = extra;
    if ((expectedAccount && account !== expectedAccount) || (['manual', 'remove', 'import'].includes(type) && account !== owner)) { refresh(); throw new Error('账号已切换，请重新打开并操作当前账号的记录'); }
    const response = await api.runtime.sendMessage({ type, ...data, account });
    if (!response?.ok) throw new Error(response?.error ?? '扩展暂时不可用，请刷新 X 页面');
    if (currentOwner() !== account) throw new Error('账号已切换，请重新操作');
    owner = account; entries = response.entries; scan = response.scan; render();
    return response;
  }
  function show(open = true) { $('.panel').hidden = !open; $('.launcher').hidden = open; $('.launcher').setAttribute('aria-expanded', String(open)); if (open) { request('list').catch(e => status(e.message, true)); $('.close').focus(); } }
  $('.launcher').onclick = () => show(); $('.close').onclick = () => { show(false); $('.launcher').focus(); };
  root.addEventListener('keydown', e => { if (e.key === 'Escape') { show(false); $('.launcher').focus(); } });
  function render() {
    $('.account').textContent = owner ? `@${owner}` : '等待 X 账号加载…';
    $('.count').textContent = entries.filter(e => e.at >= Date.now() && e.present).length;
    $('.scan-info').textContent = scan ? `最近扫描：${new Date(scan.at).toLocaleString()} · X 列表中 ${scan.count} 条` : '尚未扫描。打开 X 的定时列表，插件会读取该页面正常加载的安排。';
    const list = $('.list'); list.replaceChildren();
    const visible = entries.filter(e => $('.filters select').value === 'all' || e.at >= Date.now()).sort((a, b) => a.at - b.at);
    let day = '';
    for (const entry of visible) {
      const date = new Date(entry.at), key = date.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' });
      if (key !== day) { const heading = document.createElement('div'); heading.className = 'day'; heading.textContent = key; list.append(heading); day = key; }
      const row = document.createElement('div'); row.className = 'item'; row.dataset.id = entry.id;
      const clock = document.createElement('span'); clock.className = 'time'; clock.textContent = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
      const detail = document.createElement('div'), summary = document.createElement('div'); summary.className = 'text'; summary.textContent = entry.text || '未填写摘要';
      const badge = document.createElement('span'); badge.className = 'badge' + (entry.source === 'x' && entry.present ? ' x' : '');
      badge.textContent = !entry.present ? '未在最近的 X 列表中 · 状态待核实' : entry.at < Date.now() ? '已到时间 · 发布待核实' : entry.source === 'x' ? '从 X 定时记录读取' : '手动记录 · 尚未核实 X 定时状态';
      detail.append(summary, badge);
      const actions = document.createElement('div');
      if (entry.source === 'manual') { const edit = document.createElement('button'); edit.textContent = '改'; edit.title = '修改本地时间记录'; edit.onclick = () => editForm(entry); actions.append(edit); }
      const remove = document.createElement('button'); remove.textContent = '×'; remove.title = '仅移除本地记录，不取消 X 定时'; remove.setAttribute('aria-label', '移除本地记录');
      remove.onclick = async () => { try { await request('remove', { id: entry.id, expectedAccount: entry.account }); status('已移除本地记录，X 定时安排未改变'); } catch(e) { status(e.message, true); } };
      actions.append(remove); row.append(clock, detail, actions); list.append(row);
    }
    if (!visible.length) { const empty = document.createElement('div'); empty.className = 'empty'; empty.textContent = '这里还没有安排。先记录时间，或打开 X 定时列表进行扫描。'; list.append(empty); }
  }
  function editForm(entry) {
    editing = entry?.id ?? null; formOwner = owner; $('form').hidden = false;
    const d = new Date(entry?.at ?? Date.now() + 3600000);
    const p = n => String(n).padStart(2, '0');
    $('input[name=at]').value = `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
    $('textarea').value = entry?.text ?? ''; $('input[name=at]').focus();
  }
  $('.add').onclick = () => editForm(); $('.cancel').onclick = () => { $('form').hidden = true; editing = null; };
  $('form').onsubmit = async e => {
    e.preventDefault();
    try { await request('manual', { at: XSB.localTime($('input[name=at]').value), text: $('textarea').value, id: editing, expectedAccount: formOwner }); $('form').hidden = true; editing = null; status('时间已记录，仍需在 X 确认定时'); } catch(error) { status(error.message, true); }
  };
  $('.filters select').onchange = render;
  $('.export').onclick = async () => {
    try {
      await request('list');
      const url = URL.createObjectURL(new Blob([JSON.stringify({ format: 'x-schedule-board', version: 1, exportedAt: new Date().toISOString(), entries }, null, 2)], { type: 'application/json' }));
      const link = document.createElement('a'); link.href = url; link.download = `x-schedule-board-${owner}.json`; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); status('已导出当前账号记录');
    } catch(e) { status(e.message, true); }
  };
  $('.import-btn').onclick = () => $('.import').click();
  $('.import').onchange = async e => {
    try { const file = e.target.files[0]; if (!file) return; if (file.size > 5e6) throw new Error('备份文件超过 5 MB'); const expectedAccount = currentOwner(); await request('import', { payload: JSON.parse(await file.text()), expectedAccount }); status('备份已合并；不同账号记录分别展示'); } catch(error) { status(error.message, true); } finally { e.target.value = ''; }
  };
  // Accessible labels come from the actual X scheduling form, never select order.
  function selectedSchedule(dialog) {
    const values = {};
    for (const select of dialog.querySelectorAll('select')) {
      const label = select.getAttribute('aria-label') ?? (select.getAttribute('aria-labelledby') ?? '').split(/\s+/).map(id => document.getElementById(id)?.textContent ?? '').join(' ');
      const key = /^month$|月份|^月$/i.test(label.trim()) ? 'month' : /^day$|^日$|日期中的日/i.test(label.trim()) ? 'day' : /^year$|年份|^年$/i.test(label.trim()) ? 'year' : /^hour$|小时|時|^时$/i.test(label.trim()) ? 'hour' : /^minute$|分钟|分鐘|^分$/i.test(label.trim()) ? 'minute' : /AM\/PM|上午.*下午|时段/i.test(label) ? 'period' : '';
      if (key) values[key] = select.value;
    }
    if (!['month','day','year','hour','minute'].every(k => values[k] !== undefined && values[k] !== '')) throw new Error('未识别完整的 X 日期选项，请在安排表手动记录');
    let hour = +values.hour;
    if (values.period) hour = hour % 12 + (/PM|下午/i.test(values.period) ? 12 : 0);
    const p = n => String(n).padStart(2,'0');
    return XSB.localTime(`${values.year}-${p(values.month)}-${p(values.day)}T${p(hour)}:${p(values.minute)}`);
  }
  function bindScheduleButton() {
    const confirm = document.querySelector('[data-testid="scheduledConfirmationPrimaryAction"]');
    if (!confirm || confirm.parentElement.querySelector('[data-xsb-record]')) return;
    const button = document.createElement('button'); button.type = 'button'; button.dataset.xsbRecord = '1'; button.textContent = '◷ 记录此时间';
    button.style.cssText = 'background:#eff3f4;color:#0f1419;border:0;border-radius:999px;padding:10px 12px;margin:0 8px;font:600 12px system-ui;cursor:pointer;white-space:nowrap';
    button.onclick = async () => {
      try {
        const dialog = confirm.closest('[role=dialog]'); if (!dialog) throw new Error('未找到 X 定时窗口');
        const at = selectedSchedule(dialog);
        const editor = [...document.querySelectorAll('[data-testid^="tweetTextarea_"][contenteditable=true]')].find(e => e.getBoundingClientRect().width > 0);
        await request('manual', { at, text: editor?.innerText ?? '' }); show(); status('已记录所选时间，仍需在 X 确认定时');
      } catch(error) { show(); status(error.message, true); }
    };
    confirm.before(button);
  }
  let timer;
  const refresh = () => {
    bindScheduleButton();
    const account = currentOwner();
    if (account !== owner) {
      owner = account; entries = []; scan = null; $('form').hidden = true; editing = null; status(''); render();
      const sequence = ++loadSequence;
      if (account) request('list').catch(e => { if (sequence === loadSequence) status(e.message, true); });
    }
  };
  new MutationObserver(mutations => { if (mutations.some(m => !host.contains(m.target))) { clearTimeout(timer); timer = setTimeout(refresh, 120); } }).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['href'] });
  document.addEventListener('xsb:net', e => {
    try {
      if (typeof e.detail !== 'string' || e.detail.length > 2100000) return;
      const event = JSON.parse(e.detail);
      if (event.account !== currentOwner()) return;
      request('network', { event }).then(r => { if (r.recognized) status('已读取 X 本次加载的定时记录'); }).catch(error => status(error.message, true));
    } catch { /* ignore foreign/malformed page events */ }
  });
  api.storage.onChanged.addListener((changes, area) => { if (area === 'local' && (changes.entries || changes.scans)) request('list').catch(() => {}); });
  api.runtime.onMessage.addListener(message => { if (message?.type === 'toggle') show($('.panel').hidden); });
  refresh(); render(); document.dispatchEvent(new CustomEvent('xsb:ready'));
})();
