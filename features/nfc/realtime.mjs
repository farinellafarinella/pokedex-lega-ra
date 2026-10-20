// Reread authoritative state after every event, reconnect, focus and online.
export function subscribeNFC(client,{userId,profileId,onSync,onStatus=()=>{},demo=false,staticTest=false,quickDemo=false}){
 let stopped=false,timer,again=false,running=false;
 const sync=async()=>{if(stopped)return;if(running){again=true;return;}running=true;try{await onSync();}catch{onStatus('Sincronizzazione da riprovare');}finally{running=false;if(again){again=false;queueMicrotask(sync);}}};
 const schedule=()=>{clearTimeout(timer);timer=setTimeout(sync,120);};
 let channel=client.channel('route-nfc:'+userId+':'+crypto.randomUUID())
 .on('postgres_changes',{event:'*',schema:'public',table:'profiles'},schedule)
 .on('postgres_changes',{event:'*',schema:'public',table:'transactions'},schedule);
 if(quickDemo)channel=channel.on('postgres_changes',{event:'*',schema:'public',table:'route_nfc_quick_demo',filter:'user_id=eq.'+userId},schedule);
 else if(staticTest)channel=channel.on('postgres_changes',{event:'*',schema:'public',table:'route_nfc_test_wallets',filter:'user_id=eq.'+userId},schedule).on('postgres_changes',{event:'*',schema:'public',table:'route_nfc_test_requests',filter:'receiver_user_id=eq.'+userId},schedule).on('postgres_changes',{event:'*',schema:'public',table:'route_nfc_test_transfers'},schedule);
 else channel=channel.on('postgres_changes',{event:'*',schema:'public',table:'route_pos_requests',filter:'receiver_id=eq.'+profileId},schedule);
 if(demo)channel=channel.on('postgres_changes',{event:'*',schema:'public',table:'route_nfc_demo',filter:'user_id=eq.'+userId},schedule);
 channel.subscribe(status=>{if(stopped)return;onStatus(status==='SUBSCRIBED'?'Sincronizzato':status==='CHANNEL_ERROR'||status==='TIMED_OUT'?'Riconnessione in corso…':'Connessione…');if(status==='SUBSCRIBED')schedule();});
 const visible=()=>{if(document.visibilityState==='visible')schedule();};
 globalThis.addEventListener('online',schedule);globalThis.addEventListener('focus',schedule);document.addEventListener('visibilitychange',visible);
 // Polling also recovers when publication is not yet configured or RLS hides
 // unrelated ranking updates. It never changes a balance optimistically.
 const poll=setInterval(schedule,20000);
 return ()=>{stopped=true;clearTimeout(timer);clearInterval(poll);client.removeChannel(channel);globalThis.removeEventListener('online',schedule);globalThis.removeEventListener('focus',schedule);document.removeEventListener('visibilitychange',visible);};
}
export function createBalanceSync(client,{userId,profileId,onSync}){return subscribeNFC(client,{userId,profileId,onSync});}

export function subscribeStaticNFC(client,options){return subscribeNFC(client,{...options,staticTest:true});}

export function subscribeQuickDemo(client,options){return subscribeNFC(client,{...options,quickDemo:true});}
