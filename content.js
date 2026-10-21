// Compact clock outside X's normal document flow. Successful X operations auto-record.
(() => {
  const api = globalThis.browser ?? globalThis.chrome;
  const host = document.createElement('div'); host.id = 'x-schedule-board';
  host.style.cssText = 'position:fixed;right:12px;top:76px;z-index:2147483500';
  const root = host.attachShadow({ mode: 'open' });
  root.innerHTML = `<style>
    :host{all:initial;color-scheme:light dark}*{box-sizing:border-box}[hidden]{display:none!important}
    button{font:inherit;cursor:pointer;touch-action:manipulation}button:focus-visible,a:focus-visible{outline:2px solid #1d9bf0;outline-offset:2px}
    .launcher{font:12px/1.2 system-ui,'Microsoft YaHei',sans-serif;border:1px solid #cfd9de;background:#fff;color:#536471;border-radius:999px;padding:6px 10px;box-shadow:0 1px 5px #0001;max-width:210px;white-space:nowrap}
    .panel{width:min(252px,calc(100vw - 24px));font:12px/1.45 system-ui,'Microsoft YaHei',sans-serif;background:#fff;color:#0f1419;border:1px solid #cfd9de;border-radius:12px;box-shadow:0 5px 20px #0002;padding:10px;max-height:min(320px,calc(100dvh - 100px));overflow:auto}
    header{display:flex;align-items:center;gap:5px}header strong{font-size:13px;flex:1}header button{border:0;background:none;color:#536471;min-width:25px;height:25px;border-radius:6px;padding:2px}header button:hover{background:#eff3f4}
    .launcher,header{touch-action:none;user-select:none;cursor:grab}:host([data-dragging]) .launcher,:host([data-dragging]) header{cursor:grabbing}
    .list{margin-top:5px}.day{font-size:11px;color:#536471;padding-top:8px}.item{display:grid;grid-template-columns:40px 1fr;gap:7px;padding:6px 0;border-bottom:1px solid #eff3f4}.time{font-weight:650;font-variant-numeric:tabular-nums}.summary{white-space:nowrap;text-overflow:ellipsis;overflow:hidden;min-width:0;color:#536471}.empty{color:#536471;padding:14px 0 8px}.status{font-size:11px;color:#536471;margin-top:6px;white-space:pre-wrap}.status:empty{display:none}.status.error{color:#b42318}.more{border-top:1px solid #eff3f4;margin-top:7px;padding-top:6px;display:flex;gap:5px;flex-wrap:wrap}.more button,.more a{font:11px system-ui;text-decoration:none;border:0;background:#eff3f4;color:#536471;border-radius:5px;padding:5px 7px}.import{display:none}.owner{font-size:10px;color:#536471;margin-top:6px}
    @media(prefers-color-scheme:dark){.launcher,.panel{background:#15202b;color:#e7e9ea;border-color:#3b4854}.summary,.day,.status,.empty,.owner,header button{color:#a2b2c0}.item,.more{border-color:#35434f}.more button,.more a,header button:hover{background:#273340;color:#e7e9ea}.status.error{color:#ff9e9e}}
  </style>
  <button class="launcher" aria-expanded="false" title="查看 X 定时发稿时间">◷ 暂无定时</button>
  <section class="panel" aria-label="X 定时发稿时间" hidden>
    <header><strong title="拖动移动安排表">定时安排</strong><button class="refresh" title="扫描 / 刷新 X 已安排列表" aria-label="刷新 X 定时安排">↻</button><button class="menu" title="备份选项" aria-label="备份选项">⋯</button><button class="close" title="关闭" aria-label="关闭安排表">×</button></header>
    <div class="list"></div><div class="status" role="status" aria-live="polite"></div>
    <div class="more" hidden><button class="export">导出</button><button class="import-btn">导入</button><a href="/compose/post/unsent/scheduled" target="_blank" rel="noopener noreferrer">打开 X 列表 ↗</a></div>
    <div class="owner" hidden></div><input class="import" type="file" accept="application/json,.json">
  </section>`;
  document.body.append(host);
  const $ = s => root.querySelector(s);
  let owner = '', entries = [], scan = null, scanPending = false;
  let position=null,drag=null,positionRevision=0,pendingPositionSaves=0,suppressClickUntil=0;
  const validPosition=p=>p&&['x','y'].every(key=>Number.isFinite(p[key])&&p[key]>=0&&p[key]<=1);
  const viewport=()=>({left:window.visualViewport?.offsetLeft||0,top:window.visualViewport?.offsetTop||0,width:window.visualViewport?.width||innerWidth,height:window.visualViewport?.height||innerHeight});
  function fitPoint(left,top){
    const view=viewport(),rect=host.getBoundingClientRect();
    return {left:Math.max(view.left+8,Math.min(left,view.left+view.width-rect.width-8)),top:Math.max(view.top+8,Math.min(top,view.top+view.height-rect.height-8))};
  }
  function place(){
    const view=viewport();
    $('.panel').style.width=Math.max(0,Math.min(252,view.width-16))+'px';
    $('.panel').style.maxHeight=Math.max(0,Math.min(320,view.height-16))+'px';
    const rect=host.getBoundingClientRect(),point=fitPoint(position?view.left+position.x*view.width:view.left+view.width-rect.width-12,position?view.top+position.y*view.height:view.top+76);
    host.style.right='auto';host.style.left=point.left+'px';host.style.top=point.top+'px';
  }
  function startDrag(event){
    if(drag||event.button!==0||event.isPrimary===false||(event.currentTarget.tagName==='HEADER'&&event.target.closest('button,a,input,select')))return;
    const rect=host.getBoundingClientRect();
    drag={id:event.pointerId,x:event.clientX,y:event.clientY,left:rect.left,top:rect.top,target:event.currentTarget,moved:false};
    try{drag.target.setPointerCapture(event.pointerId);}catch{/* Ignore unsupported capture; normal clicking still works. */}
  }
  function endDrag(event){
    if(!drag||event.pointerId!==drag.id)return;
    const ended=drag;drag=null;host.removeAttribute('data-dragging');
    try{if(ended.target.hasPointerCapture(ended.id))ended.target.releasePointerCapture(ended.id);}catch{}
    if(!ended.moved)return;
    if(event.type==='pointerup')suppressClickUntil=Date.now()+350;
    pendingPositionSaves++;
    api.runtime.sendMessage({type:'set-position',position:{...position}}).then(result=>{if(!result?.ok)throw new Error(result?.error||'位置保存失败');}).catch(error=>status(error.message,true)).finally(()=>{pendingPositionSaves--;});
  }
  $('.launcher').addEventListener('pointerdown',startDrag);$('header').addEventListener('pointerdown',startDrag);
  root.addEventListener('pointermove',event=>{
    if(!drag||event.pointerId!==drag.id)return;
    const dx=event.clientX-drag.x,dy=event.clientY-drag.y;
    if(!drag.moved&&Math.hypot(dx,dy)<5)return;
    if(!drag.moved){drag.moved=true;positionRevision++;host.setAttribute('data-dragging','');}
    event.preventDefault();const view=viewport(),point=fitPoint(drag.left+dx,drag.top+dy);
    position={x:(point.left-view.left)/view.width,y:(point.top-view.top)/view.height};place();
  });
  for(const type of ['pointerup','pointercancel','lostpointercapture'])root.addEventListener(type,endDrag);
  root.addEventListener('click',event=>{if(event.detail&&Date.now()<suppressClickUntil){suppressClickUntil=0;event.preventDefault();event.stopImmediatePropagation();}},true);
  window.addEventListener('resize',place);window.visualViewport?.addEventListener('resize',place);window.visualViewport?.addEventListener('scroll',place);
  new ResizeObserver(()=>requestAnimationFrame(place)).observe(host);
  api.runtime.sendMessage({type:'get-position'}).then(result=>{if(result?.ok&&positionRevision===0){position=validPosition(result.position)?result.position:null;place();}}).catch(()=>{});
  const currentOwner = () => globalThis.XSBIdentity.current();
  const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  function status(message, error = false) { $('.status').textContent = message; $('.status').classList.toggle('error', error); }
  async function request(type, extra = {}) {
    const account = currentOwner(); if (!account) throw new Error('等待 X 账号加载');
    const { expectedAccount, ...data } = extra;
    if (expectedAccount && account !== expectedAccount) throw new Error('账号已切换，请重新操作');
    const response = await api.runtime.sendMessage({ type, ...data, account });
    if (!response?.ok) throw new Error(response?.error ?? '请重新加载扩展并刷新 X');
    if (account !== currentOwner()) throw new Error('账号已切换，请重新操作');
    owner = account; entries = response.entries; scan = response.scan; render(); return response;
  }
  function render() {
    const visible = entries.filter(e => e.present && e.at >= Date.now()).sort((a,b) => a.at-b.at), next = visible[0];
    $('.launcher').textContent = next ? `◷ ${new Date(next.at).toLocaleDateString([], {month:'numeric',day:'numeric'})} ${new Date(next.at).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit',hour12:false})}${visible.length>1?` · ${visible.length}条`:''}` : '◷ 暂无定时';
    $('.launcher').title = next ? `拖动调整位置 · 下一篇定时 · @${owner} · 点击查看全部` : '拖动调整位置 · 点击查看安排';
    const list=$('.list'); list.replaceChildren(); let day='';
    for(const e of visible){
      const date=new Date(e.at), key=date.toLocaleDateString([], {month:'numeric',day:'numeric',weekday:'short'});
      if(key!==day){const el=document.createElement('div');el.className='day';el.textContent=key;list.append(el);day=key;}
      const row=document.createElement('div');row.className='item';row.dataset.id=e.id;
      const time=document.createElement('span');time.className='time';time.textContent=date.toLocaleTimeString([], {hour:'2-digit',minute:'2-digit',hour12:false});
      const summary=document.createElement('span');summary.className='summary';summary.textContent=e.text||'定时稿';summary.title=(e.source==='manual'?'旧版手动记录，尚未核实：':'')+(e.text||'定时稿');
      row.append(time,summary);list.append(row);
    }
    if(!visible.length){const el=document.createElement('div');el.className='empty';el.textContent=scan?'暂无待发布的定时稿':'提交定时稿后自动记录。点 ↻ 扫描已有安排。';list.append(el);}
    $('.owner').textContent=`@${owner||'…'} · ${zone}${scan?' · 最近扫描 '+new Date(scan.at).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}):''}`;
    place();
  }
  function show(open=true){
    $('.panel').hidden=!open;$('.launcher').hidden=open;$('.launcher').setAttribute('aria-expanded',String(open));
    place();
    if(open){request('list').catch(e=>status(e.message,true));$('.close').focus();document.dispatchEvent(new CustomEvent('xsb:scan',{detail:'quiet'}));}
  }
  $('.launcher').onclick=()=>show();$('.close').onclick=()=>{show(false);$('.launcher').focus();};
  root.addEventListener('keydown',e=>{if(e.key==='Escape'){show(false);$('.launcher').focus();}});
  $('.menu').onclick=()=>{$('.more').hidden=!$('.more').hidden;$('.owner').hidden=$('.more').hidden;};
  $('.refresh').onclick=()=>{status('正在扫描 X 已安排列表…');scanPending=true;document.dispatchEvent(new CustomEvent('xsb:scan',{detail:'interactive'}));};
  document.addEventListener('xsb:scan-result',e=>{
    if(e.detail==='need-list'&&scanPending){scanPending=false;request('open-list').then(()=>status('已另开 X 列表扫描，当前草稿保留')).catch(error=>status(error.message,true));}
    else if(e.detail==='error'){scanPending=false;status('扫描未完成，点 ↻ 重试',true);}
  });
  $('.export').onclick=async()=>{
    try{await request('list');const url=URL.createObjectURL(new Blob([JSON.stringify({format:'x-schedule-board',version:1,exportedAt:new Date().toISOString(),entries},null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download=`x-schedule-board-${owner}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);status('已导出');}catch(e){status(e.message,true);}
  };
  $('.import-btn').onclick=()=>$('.import').click();
  $('.import').onchange=async e=>{
    try{const file=e.target.files[0];if(!file)return;if(file.size>5e6)throw new Error('备份超过 5 MB');const expectedAccount=currentOwner();await request('import',{payload:JSON.parse(await file.text()),expectedAccount});status('已合并备份');}catch(error){status(error.message,true);}finally{e.target.value='';}
  };
  let timer;
  function refreshOwner(){const account=currentOwner();if(account!==owner){owner=account;entries=[];scan=null;status('');render();if(account)request('list').catch(e=>status(e.message,true));}}
  new MutationObserver(()=>{clearTimeout(timer);timer=setTimeout(refreshOwner,120);}).observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['href']});
  document.addEventListener('xsb:net',e=>{
    try{if(typeof e.detail!=='string'||e.detail.length>2100000)return;const event=JSON.parse(e.detail);if(event.account!==currentOwner())return;
      request('network',{event}).then(r=>{if(r.ignored)return;scanPending=false;if(r.recognized){const op=new URL(event.url).pathname.split('/').pop();status(op==='FetchScheduledTweets'?'已刷新':op==='DeleteScheduledTweet'?'已更新安排':'已自动记录定时稿');}else status('未识别本次 X 返回，原记录保留；点 ↻ 核对列表',true);}).catch(error=>status(error.message,true));
    }catch{/* untrusted page event */}
  });
  api.storage.onChanged.addListener((changes,area)=>{if(area!=='local')return;if(changes.entries||changes.scans)request('list').catch(()=>{});if(changes.position&&!drag&&!pendingPositionSaves){positionRevision++;position=validPosition(changes.position.newValue)?changes.position.newValue:null;place();}});
  api.runtime.onMessage.addListener(m=>{if(m?.type==='toggle')show($('.panel').hidden);});
  refreshOwner();render();document.dispatchEvent(new CustomEvent('xsb:ready'));setInterval(render,60000);
})();
