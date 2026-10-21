import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { webcrypto } from 'node:crypto';
const scope = { Date, URL, crypto: webcrypto };
vm.runInNewContext(readFileSync(new URL('../model.js', import.meta.url), 'utf8'), scope);
const M = scope.XSB;
const future = Date.now() + 86400000;
const record = (id, owner = 'me', at = future) => ({ id, account: owner, at, text: '正文', source: 'x', present: true, updatedAt: Date.now() });
const event = (op, data, variables = {}) => ({ account: 'me', url: `https://x.com/i/api/graphql/test/${op}`, status: 200, body: JSON.stringify({ variables }), text: JSON.stringify({ data }) });
test('validates dates, seconds and impossible local dates', () => {
  assert.equal(M.timestamp(1800000000), 1800000000000);
  assert.throws(() => M.timestamp(null));
  assert.throws(() => M.timestamp(Infinity));
  assert.throws(() => M.localTime('2026-02-30T18:00'));
  assert.throws(() => M.account('me/home'));
  assert.equal(M.account('@Alice'), 'alice');
});
test('manual duplicate prevention, editing and upgrade to observed X record', () => {
  let entries = M.manual([], 'Me', future, '正文');
  entries = M.manual(entries, 'me', future, '正文');
  assert.equal(entries.length, 1);
  entries = M.upsert(entries, record('x:1'));
  assert.equal(entries.length, 1);
  assert.equal(entries[0].source, 'x');
  assert.throws(() => M.manual(entries, 'me', future, '新摘要', 'x:1'));
  entries = M.manual(entries, 'other', future, '正文');
  assert.equal(entries.length, 2);
});
test('scans actual known envelope and preserves state on unrecognized schema', () => {
  const parsed = M.networkEvent(event('FetchScheduledTweets', { viewer: { scheduled_tweet_list: [{ rest_id: '11', execute_at: future / 1000, tweet_request: { status: '正文' } }] } }));
  assert.equal(parsed.records[0].at, Math.round(future));
  assert.equal(parsed.records[0].text, '正文');
  assert.equal(M.networkEvent(event('FetchScheduledTweets', { viewer: { scheduled_tweet_list: [{ unknown: true }] } })), null);
  const empty = M.networkEvent(event('FetchScheduledTweets', { viewer: { scheduled_tweet_list: [] } }));
  const next = M.applyEvent([record('x:11'), record('x:22', 'other')], empty);
  assert.equal(next[0].present, false);
  assert.equal(next[1].present, true);
  assert.equal(next.length, 2, 'absence never deletes local history');
});
test('only recognized success responses confirm creation or deletion', () => {
  const variables = { execute_at: future / 1000, post_tweet_request: { status: '正文' } };
  assert.equal(M.networkEvent(event('CreateScheduledTweet', {}, variables)), null);
  const created = M.networkEvent(event('CreateScheduledTweet', { scheduled_tweet_create: { rest_id: '3' } }, variables));
  assert.equal(created.records[0].id, 'x:3');
  const failed = { ...event('FetchScheduledTweets', { viewer: { scheduled_tweet_list: [] } }), status: 403 };
  assert.equal(M.networkEvent(failed), null);
  assert.equal(M.networkEvent(event('DeleteScheduledTweet', { scheduled_tweet_delete: { success: false } }, { scheduled_tweet_id: '3' })), null);
});
test('backup validates the complete document before merging', () => {
  const entries = [record('x:1')];
  const payload = { format: 'x-schedule-board', version: 1, entries: [record('x:2'), { id: 'broken' }] };
  assert.throws(() => M.importBackup(entries, payload));
  assert.equal(entries.length, 1);
  assert.equal(M.importBackup(entries, { ...payload, entries: [record('x:2', 'other')] }).length, 2);
});
