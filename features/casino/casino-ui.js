// Shared runtime also loads from index.html when opened directly from disk.
const ready=window.ChampionCasino?Promise.resolve():new Promise((resolve,reject)=>{const script=document.createElement('script');script.src=new URL('./casino-runtime.js?v=7',import.meta.url).href;script.onload=resolve;script.onerror=()=>reject(Error('Impossibile caricare casino-runtime.js'));document.head.append(script);});
await ready;
export const {createCasinoAPI,mountCasino}=window.ChampionCasino;
