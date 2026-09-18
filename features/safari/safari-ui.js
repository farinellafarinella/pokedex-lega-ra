const ready=window.ChampionSafari?Promise.resolve():new Promise((resolve,reject)=>{const script=document.createElement('script');script.src=new URL('./safari-runtime.js?v=2',import.meta.url).href;script.onload=resolve;script.onerror=()=>reject(Error('Impossibile caricare features/safari/safari-runtime.js'));document.head.append(script);});
await ready;
export const {createSafariAPI,mountSafari}=window.ChampionSafari;
