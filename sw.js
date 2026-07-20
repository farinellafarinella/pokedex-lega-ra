self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));
self.addEventListener('push',event=>{
  let data={title:'Il mio Pokédex',body:'Hai una nuova notifica.',target_hash:'#dashboard'};
  try{data={...data,...event.data.json()}}catch{}
  event.waitUntil(self.registration.showNotification(data.title,{body:data.body,icon:'./apple-touch-icon.png',badge:'./apple-touch-icon.png',data:{target_hash:data.target_hash||'#notifications'}}));
});
self.addEventListener('notificationclick',event=>{
  event.notification.close();
  event.waitUntil(clients.matchAll({type:'window',includeUncontrolled:true}).then(list=>{
    let target=event.notification.data?.target_hash||'#dashboard';
    for(const client of list){if('focus'in client){client.navigate(target);return client.focus()}}
    return clients.openWindow('./'+target);
  }));
});
