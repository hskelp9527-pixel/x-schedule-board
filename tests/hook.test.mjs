import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

test('captures the standalone X scheduled-list page without a sidebar profile link',async()=>{
  const target=new EventTarget(),events=[],state={session:{user_id:'1'},entities:{users:{entities:{'0':{screen_name:'Other'},'1':{screen_name:'Me'}}}}};
  const script={textContent:'window.__INITIAL_STATE__='+JSON.stringify(state)+';window.__META_DATA__={};'};
  const document={querySelector:()=>null,querySelectorAll:()=>[script],addEventListener:target.addEventListener.bind(target),dispatchEvent:target.dispatchEvent.bind(target)};
  class XHR extends EventTarget{open(){}send(){}setRequestHeader(){}}
  const window={fetch:async()=>new Response(JSON.stringify({data:{viewer:{scheduled_tweet_list:[]}}}),{status:200})};
  const context=vm.createContext({window,document,location:new URL('https://x.com/compose/post/unsent/scheduled'),Request,Response,URL,Date,CustomEvent,XMLHttpRequest:XHR});
  const manifest=JSON.parse(readFileSync(new URL('../manifest.json',import.meta.url),'utf8'));
  for(const file of manifest.content_scripts.find(entry=>entry.world==='MAIN').js)vm.runInContext(readFileSync(new URL('../'+file,import.meta.url),'utf8'),context);
  target.addEventListener('xsb:net',event=>events.push(JSON.parse(event.detail)));
  target.dispatchEvent(new CustomEvent('xsb:ready'));
  await window.fetch('https://x.com/i/api/graphql/test/FetchScheduledTweets');
  await new Promise(resolve=>setTimeout(resolve,30));
  assert.equal(events.length,1,'a real list response must not be discarded just because its page has no sidebar');
  assert.equal(events[0].account,'me');
  assert.equal(events[0].status,200);
});

test('standalone identity follows the session user and never reuses initial state after a sidebar account switch',()=>{
  let profile=null;
  const state={session:{user_id:'8'},entities:{users:{entities:{'1':{screen_name:'Wrong'},'8':{core:{screen_name:'Own'}}}}},extra:'braces { inside } strings;window.__META_DATA__="quoted"'};
  const script={textContent:'window.__INITIAL_STATE__='+JSON.stringify(state)+';window.__META_DATA__={};'};
  const location=new URL('https://x.com/home'),document={querySelector:()=>profile,querySelectorAll:()=>[script]};
  const context=vm.createContext({document,location});
  vm.runInContext(readFileSync(new URL('../identity.js',import.meta.url),'utf8'),context);
  assert.equal(context.XSBIdentity.current(),'','normal pages never guess identity from server state');
  location.pathname='/compose/post/unsent/scheduled';
  assert.equal(context.XSBIdentity.current(),'own');
  profile={getAttribute:()=>'/NewAccount'};
  assert.equal(context.XSBIdentity.current(),'newaccount');
  profile=null;
  assert.equal(context.XSBIdentity.current(),'','a disappearing sidebar must not restore the old account');
});
