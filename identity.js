// Read only the signed-in account's public handle. Standalone unsent-list pages
// can omit the sidebar; their server-rendered state remains in an inline script.
globalThis.XSBIdentity=(()=>{
  let sawProfile=false,cachedText='',cachedAccount='';
  const valid=value=>typeof value==='string'&&/^[A-Za-z0-9_]{1,15}$/.test(value)?value.toLowerCase():'';
  function current(){
    const profile=document.querySelector('a[data-testid="AppTabBar_Profile_Link"]');
    if(profile){sawProfile=true;return valid(profile.getAttribute('href')?.split('/')[1]);}
    // Never fall back to old server state while a normal page changes accounts.
    if(sawProfile||!/^\/compose\/(post|tweet)\/unsent(?:\/scheduled)?\/?$/.test(location.pathname))return '';
    const prefix='window.__INITIAL_STATE__=';
    const source=[...document.querySelectorAll('script:not([src])')].map(script=>script.textContent.trimStart()).find(text=>text.startsWith(prefix));
    if(!source||source.length>2e6)return '';
    if(source===cachedText)return cachedAccount;
    cachedText=source;cachedAccount='';
    try{
      const start=source.indexOf('{',prefix.length);if(start<0)return '';
      let depth=0,inString=false,escaped=false,end;
      for(let i=start;i<source.length;i++){
        const char=source[i];
        if(inString){if(escaped)escaped=false;else if(char==='\\')escaped=true;else if(char==='"')inString=false;}
        else if(char==='"')inString=true;
        else if(char==='{')depth++;
        else if(char==='}'&&!--depth){end=i+1;break;}
      }
      if(!end)return '';
      const state=JSON.parse(source.slice(start,end)),id=state.session?.user_id,user=id&&state.entities?.users?.entities?.[id];
      cachedAccount=valid(user?.screen_name??user?.core?.screen_name);
    }catch{/* Missing or unknown state never selects an arbitrary user. */}
    return cachedAccount;
  }
  return {current};
})();
