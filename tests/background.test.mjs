import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { webcrypto } from 'node:crypto';
function setup() {
  let listener, state = { entries: [], scans: [], clocks: [] }; const opened = [];
  const api = { tabs: { async create(options) { opened.push(options); return { id: 2 }; } }, runtime: { id: 'trusted', onMessage: { addListener(fn) { listener = fn; } } }, action: { onClicked: { addListener() {} } }, storage: { local: {
    async get() { await new Promise(r => setTimeout(r, 1)); return structuredClone(state); },
    async set(value) { state = { ...state, ...structuredClone(value) }; }
  } } };
  const context = vm.createContext({ chrome: api, Date, URL, crypto: webcrypto });
  for (const file of ['model.js', 'background.js']) vm.runInContext(readFileSync(new URL('../' + file, import.meta.url), 'utf8'), context);
  return { opened, call: (message, sender = { id: 'trusted', tab: { id: 1 }, url: 'https://x.com/home' }) => new Promise(resolve => { if (listener(message, sender, resolve) !== true) resolve(undefined); }), state: () => state };
}
test('rejects foreign senders and serializes concurrent writes across tabs', async () => {
  const app = setup();
  assert.equal(await app.call({ type: 'list', account: 'me' }, { id: 'foreign', tab: { id: 1 }, url: 'https://x.com/home' }), undefined);
  await Promise.all([app.call({ type: 'manual', account: 'me', at: Date.now() + 100000, text: 'A' }), app.call({ type: 'manual', account: 'me', at: Date.now() + 200000, text: 'B' }), app.call({ type: 'manual', account: 'other', at: Date.now() + 300000, text: 'C' })]);
  assert.equal(app.state().entries.length, 3);
  assert.equal((await app.call({ type: 'list', account: 'me' })).entries.length, 2);
  const before = JSON.stringify(app.state());
  const invalid = await app.call({ type: 'import', account: 'me', payload: { format: 'x-schedule-board', version: 1, entries: [{ id: 'broken' }] } });
  assert.equal(invalid.ok, false); assert.equal(JSON.stringify(app.state()), before);
});
test('first scan opens the known X list in a new tab without touching existing tab', async () => {
  const app=setup(), before=JSON.stringify(app.state());
  const result=await app.call({type:'open-list',account:'me'});
  assert.equal(result.ok,true);assert.equal(app.opened.length,1);
  assert.equal(app.opened[0].url,'https://x.com/compose/post/unsent/scheduled');
  assert.equal(JSON.stringify(app.state()),before);
});

test('widget position persists independently from account records and rejects invalid coordinates',async()=>{
  const app=setup(),initial=await app.call({type:'get-position'});
  assert.ok(initial,'widget position requests must be supported before account loading');
  assert.equal(initial.position,null);
  await app.call({type:'manual',account:'me',at:Date.now()+100000,text:'保留稿件'});
  const entries=JSON.stringify(app.state().entries);
  const saved=await app.call({type:'set-position',position:{x:0.4,y:0.6}});
  assert.equal(saved.ok,true);assert.equal(JSON.stringify(app.state().entries),entries);
  assert.equal((await app.call({type:'get-position',account:'other'})).position.x,0.4);
  assert.equal((await app.call({type:'set-position',position:{x:2,y:0}})).ok,false);
  assert.equal((await app.call({type:'set-position',position:{x:0,y:NaN}})).ok,false);
  assert.equal(app.state().position.x,0.4);
});
test('late snapshots and mutations cannot roll back newer X changes', async () => {
  const app = setup(), t = Date.now(), at = Date.now() + 100000;
  const send = (op, requestedAt, data, variables = {}) => app.call({ type: 'network', account: 'me', event: {
    account: 'me', requestedAt, status: 200, url: `https://x.com/i/api/graphql/test/${op}`, body: JSON.stringify({ variables }), text: JSON.stringify({ data })
  } });
  const variables = { execute_at: at / 1000, post_tweet_request: { status: '安排' } };
  await send('CreateScheduledTweet', t + 1, { scheduled_tweet_create: { rest_id: '1' } }, variables);
  const staleSnapshot=await send('FetchScheduledTweets', t, { viewer: { scheduled_tweet_list: [] } });
  assert.equal(staleSnapshot.recognized,true,'a safely ignored older response is still a recognized format');
  assert.equal(staleSnapshot.ignored,true);
  assert.equal(app.state().entries[0].present, true);
  await send('DeleteScheduledTweet', t + 3, { scheduled_tweet_delete: true }, { scheduled_tweet_id: '1' });
  await send('FetchScheduledTweets', t + 2, { viewer: { scheduled_tweet_list: [{ rest_id: '1', execute_at: at / 1000, tweet_request: { status: '安排' } }] } });
  assert.equal(app.state().entries[0].present, false);
  await send('CreateScheduledTweet', t + 1, { scheduled_tweet_create: { rest_id: '1' } }, variables);
  assert.equal(app.state().entries[0].present, false);
  await send('FetchScheduledTweets', t + 5, { viewer: { scheduled_tweet_list: [{ rest_id: '1', execute_at: (at + 100000) / 1000, tweet_request: { status: '改期后' } }] } });
  await send('EditScheduledTweet', t + 4, { scheduled_tweet_update: { rest_id: '1' } }, variables);
  assert.equal(app.state().entries[0].text, '改期后');
});
