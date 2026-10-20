export function subscribeCasino(client,{userId,onSync,onStatus=()=>{}}){
 let alive=true,timer,running=false,again=false;
 const sync=async()=>{if(!alive)return;if(running){again=true;return;}running=true;try{await onSync();}catch{onStatus('Riconnessione da verificare');}finally{running=false;if(alive&&again){again=false;queueMicrotask(sync);}}};
 const schedule=()=>{clearTimeout(timer);timer=setTimeout(sync,150);};
 const channel=client.channel('casino-lobby:'+userId+':'+crypto.randomUUID())
 .on('postgres_changes',{event:'*',schema:'public',table:'route_casino_settings'},schedule)
 .on('postgres_changes',{event:'*',schema:'public',table:'route_casino_games'},schedule)
 .on('postgres_changes',{event:'*',schema:'public',table:'route_casino_sessions',filter:'user_id=eq.'+userId},schedule)
 .on('postgres_changes',{event:'*',schema:'public',table:'profiles',filter:'user_id=eq.'+userId},schedule)
 .on('postgres_changes',{event:'*',schema:'public',table:'route_casino_draws'},schedule)
 .on('postgres_changes',{event:'*',schema:'public',table:'route_casino_entries',filter:'user_id=eq.'+userId},schedule)
 .subscribe(status=>{if(!alive)return;onStatus(status==='SUBSCRIBED'?'Sincronizzato':status==='CHANNEL_ERROR'||status==='TIMED_OUT'?'Riconnessione…':'Connessione…');if(status==='SUBSCRIBED')schedule();});
 const visible=()=>{if(document.visibilityState==='visible')schedule();};
 addEventListener('online',schedule);addEventListener('focus',schedule);document.addEventListener('visibilitychange',visible);const poll=setInterval(schedule,20000);
 return ()=>{alive=false;clearTimeout(timer);clearInterval(poll);client.removeChannel(channel);removeEventListener('online',schedule);removeEventListener('focus',schedule);document.removeEventListener('visibilitychange',visible);};
}
