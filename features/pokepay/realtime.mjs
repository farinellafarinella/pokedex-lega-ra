// Reread authoritative state after every event, reconnect, focus and online.
export function subscribeTestWallet(client,{userId,profileId,onSync,onStatus=()=>{}}){
 let stopped=false,timer,again=false,running=false;
 const sync=async()=>{if(stopped)return;if(running){again=true;return;}running=true;try{await onSync();}catch{onStatus('Sincronizzazione da riprovare');}finally{running=false;if(again){again=false;queueMicrotask(sync);}}};
 const schedule=()=>{clearTimeout(timer);timer=setTimeout(sync,120);};
 const channel=client.channel('route-pokepay:'+userId+':'+crypto.randomUUID())
 .on('postgres_changes',{event:'*',schema:'public',table:'route_nfc_test_wallets',filter:'user_id=eq.'+userId},schedule)
 .on('postgres_changes',{event:'*',schema:'public',table:'route_nfc_test_requests',filter:'receiver_user_id=eq.'+userId},schedule)
 .on('postgres_changes',{event:'*',schema:'public',table:'route_nfc_test_transfers'},schedule);
 channel.subscribe(status=>{if(stopped)return;onStatus(status==='SUBSCRIBED'?'Sincronizzato':status==='CHANNEL_ERROR'||status==='TIMED_OUT'?'Riconnessione in corso…':'Connessione…');if(status==='SUBSCRIBED')schedule();});
 const visible=()=>{if(document.visibilityState==='visible')schedule();};
 globalThis.addEventListener('online',schedule);globalThis.addEventListener('focus',schedule);document.addEventListener('visibilitychange',visible);
 // Polling also recovers when publication is not yet configured or RLS hides
 // unrelated ranking updates. It never changes a balance optimistically.
 const poll=setInterval(schedule,20000);
 return ()=>{stopped=true;clearTimeout(timer);clearInterval(poll);client.removeChannel(channel);globalThis.removeEventListener('online',schedule);globalThis.removeEventListener('focus',schedule);document.removeEventListener('visibilitychange',visible);};
}