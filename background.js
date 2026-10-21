if (!globalThis.XSB && typeof importScripts === 'function') importScripts('model.js');
const api = globalThis.browser ?? globalThis.chrome;
let queue = Promise.resolve();
function trusted(sender) {
  if (sender.id !== api.runtime.id || !sender.tab || !sender.url) return false;
  try { return ['https://x.com', 'https://twitter.com'].includes(new URL(sender.url).origin); } catch { return false; }
}
api.runtime.onMessage.addListener((message, sender, respond) => {
  if (!trusted(sender) || !['list', 'manual', 'network', 'remove', 'import'].includes(message?.type)) return;
  const work = queue.then(async () => {
    const owner = XSB.account(message.account);
    const saved = await api.storage.local.get({ entries: [], scans: [], clocks: [] });
    if (!Array.isArray(saved.entries) || !Array.isArray(saved.scans)) throw new Error('存储数据无法读取，请先备份');
    let entries = saved.entries, scans = saved.scans, clocks = saved.clocks ?? [], recognized = false;
    if (message.type === 'manual') entries = XSB.manual(entries, owner, message.at, message.text, message.id);
    if (message.type === 'remove') entries = entries.filter(e => e.account !== owner || e.id !== message.id);
    if (message.type === 'import') entries = XSB.importBackup(entries, message.payload);
    if (message.type === 'network') {
      const event = message.event;
      if (!event || event.account !== owner || typeof event.text !== 'string' || event.text.length > 2e6) throw new Error('扫描数据不完整');
      const parsed = XSB.networkEvent(event);
      if (parsed) {
        const requestedAt = event.requestedAt;
        if (!Number.isFinite(requestedAt) || requestedAt < Date.now() - 86400000 || requestedAt > Date.now() + 60000) throw new Error('扫描请求缺少有效顺序，请刷新 X 页面');
        const clock = clocks.find(c => c.account === owner) ?? { account: owner, snapshotAt: 0, mutationAt: 0, items: [] };
        const id = parsed.id ?? parsed.records?.[0]?.id;
        const itemAt = clock.items.find(c => c.id === id)?.at ?? 0;
        const stale = parsed.type === 'snapshot' ? requestedAt <= clock.mutationAt || requestedAt < clock.snapshotAt : requestedAt < Math.max(itemAt, clock.snapshotAt);
        if (!stale) {
          entries = XSB.applyEvent(entries, parsed); recognized = true;
          if (parsed.type === 'snapshot') {
            clock.snapshotAt = requestedAt;
            scans = [...scans.filter(s => s.account !== owner), { account: owner, at: Date.now(), count: parsed.records.length }];
          } else {
            clock.mutationAt = Math.max(clock.mutationAt, requestedAt);
            clock.items = [...clock.items.filter(c => c.id !== id), { id, at: requestedAt }].slice(-5000);
          }
          clocks = [...clocks.filter(c => c.account !== owner), clock];
        }
      }
    }
    if (message.type !== 'list') await api.storage.local.set({ entries, scans, clocks });
    return { ok: true, recognized, entries: entries.filter(e => e.account === owner), scan: scans.find(s => s.account === owner) ?? null };
  });
  queue = work.catch(() => {});
  work.then(respond, error => respond({ ok: false, error: error.message }));
  return true;
});
api.action.onClicked.addListener(tab => {
  if (tab.id && /^https:\/\/(x|twitter)\.com\//.test(tab.url ?? '')) api.tabs.sendMessage(tab.id, { type: 'toggle' }).catch(() => {});
  else api.tabs.create({ url: 'https://x.com/compose/post/unsent/scheduled' });
});
