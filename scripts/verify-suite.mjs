// Optional local integration check. Requires the two sibling extension checkouts.
import { chromium } from 'playwright-core';
import assert from 'node:assert/strict';
import { mkdtemp, rm, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('..', import.meta.url));
const paths = [root, join(dirname(root), 'x-mention-saver'), join(dirname(root), 'x-daily-rings')];
for (const path of paths) assert(existsSync(join(path, 'manifest.json')), `Missing sibling extension: ${path}`);
const profile = await mkdtemp(join(tmpdir(), 'x-suite-'));
const output = join(root, 'artifacts'); await mkdir(output, { recursive: true });
const edge = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
let context;
try {
  context = await chromium.launchPersistentContext(profile, { executablePath: process.env.BROWSER_PATH || (existsSync(edge) ? edge : chromium.executablePath()), headless: true, ignoreDefaultArgs: ['--disable-extensions'], args: [`--disable-extensions-except=${paths.join(',')}`, `--load-extension=${paths.join(',')}`], viewport: { width: 1200, height: 850 } });
  const html = '<!doctype html><html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><body style="background:white;color:#111;font:16px system-ui;margin:24px"><a data-testid="AppTabBar_Profile_Link" href="/me">个人资料</a><h1>X 插件协作验收 · 模拟页面</h1><div contenteditable="true" data-testid="tweetTextarea_0">保留原有草稿</div></body></html>';
  await context.route('https://x.com/**', route => route.fulfill({ contentType: 'text/html; charset=utf-8', body: html }));
  await context.route('https://x.com/i/api/graphql/test/FetchScheduledTweets', route => route.fulfill({ contentType: 'application/json', body: JSON.stringify({ data: { viewer: { scheduled_tweet_list: [{ rest_id: '123', scheduling_info: {execute_at: (Date.now() + 86400000) / 1000,state:'Scheduled'}, tweet_create_request: {type:'PostTweetRequest',status: '明天的文章'} }] } } }) }));
  await context.route('https://x.com/i/api/graphql/test/CreateTweet', route => route.fulfill({ contentType: 'application/json', body: JSON.stringify({ data: { create_tweet: { tweet_results: { result: { rest_id: '999' } } } } }) }));
  const page = await context.newPage(), errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto('https://x.com/home');
  await page.locator('#x-daily-rings .card').waitFor();
  await page.locator('#x-schedule-board .launcher').waitFor();
  await page.locator('[data-xms-launcher]').waitFor();
  await page.evaluate(async () => {
    await fetch('/i/api/graphql/test/FetchScheduledTweets');
    await fetch('/i/api/graphql/test/CreateTweet', { method: 'POST', body: JSON.stringify({ variables: { tweet_text: 'test' } }) });
  });
  await page.waitForFunction(() => document.querySelector('#x-daily-rings').shadowRoot.querySelector('.num').textContent === '1');
  await page.locator('#x-schedule-board .launcher').click();
  await page.waitForFunction(() => document.querySelector('#x-schedule-board').shadowRoot.querySelectorAll('.item').length === 1);
  await page.screenshot({ path: join(output, 'suite-desktop.png') });
  const hit = await page.locator('#x-schedule-board .panel').evaluate(el => {
    const r = el.getBoundingClientRect();
    return document.elementFromPoint(r.right - 10, r.bottom - 10)?.id === 'x-schedule-board';
  });
  assert(hit, 'schedule panel must not be obscured by the rings');
  await page.locator('#x-schedule-board .close').click();
  await page.bringToFront();
  await page.locator('[data-xms-launcher]').click();
  await page.frameLocator('iframe[title="记得 @ 收藏"]').locator('#search').fill('查找收藏');
  await page.frameLocator('iframe[title="记得 @ 收藏"]').locator('#search').focus();
  await page.keyboard.press('Escape');
  await page.locator('[data-xms-panel]').waitFor({ state: 'detached' });
  assert.equal(await page.locator('[data-testid=tweetTextarea_0]').textContent(), '保留原有草稿');
  await page.setViewportSize({ width: 360, height: 740 });
  await page.locator('#x-schedule-board .launcher').click();
  await page.screenshot({ path: join(output, 'suite-mobile.png') });
  assert.deepEqual(errors, []);
  console.log('PASS: three real extensions coexist; both fetch observers receive data; independent storage; editor preserved; schedule panel stays above rings; mention iframe closes.');
} finally {
  await context?.close();
  await rm(profile, { recursive: true, force: true });
}
